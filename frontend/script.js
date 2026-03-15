/**
 * ================================================================
 *  FEDERATED CARDIAC AI — script.js
 *  Biological Heart Genesis · Pure Canvas 2D · Zero Dependencies
 *  3D perspective projection + 3200 cell particles + vascular paths
 * ================================================================
 */

/* ─── FAQ DATA ───────────────────────────────────────────────── */
const FAQ_DATA = [
  { q: "What is Federated Learning and why does it matter for cardiac data?",
    a: "Federated Learning trains AI models across multiple institutions without centralizing sensitive patient data. Each hospital node trains on its own data and only shares encrypted gradient updates — never raw ECGs or patient records. Critical for HIPAA/GDPR compliance while enabling collaborative AI at scale." },
  { q: "How does the Local Translation Engine normalize heterogeneous data?",
    a: "Our interceptor layer sits between your data source (HL7 FHIR, CSV, JSON) and the federated model. It automatically maps fields to a universal CardiacSample protobuf schema, normalizes float ranges, handles missing leads, and applies temporal alignment — all locally, before any data leaves your network perimeter." },
  { q: "What differential privacy budget (epsilon) does the platform enforce?",
    a: "We enforce ε=0.1 by default, which provides strong privacy guarantees. The local interceptor adds calibrated Gaussian noise to gradients before transmission. You can configure epsilon per training run depending on your regulatory requirements." },
  { q: "Can our hospital join without exposing our IT infrastructure?",
    a: "Absolutely. Each node requires only outbound HTTPS access on port 443. The local interceptor agent runs as a Docker container inside your firewall. Raw data stays on your servers — only compressed, encrypted gradient tensors (8–15 KB per round) are transmitted to the aggregation server." },
  { q: "How is model performance validated globally without sharing data?",
    a: "After each federated round, each node evaluates the updated global model on its own local validation set and reports only scalar metrics (accuracy, AUC, F1). The aggregation server computes a weighted global score. No raw predictions or patient data leave the node." },
  { q: "What does the platform output — can we deploy the model in clinical systems?",
    a: "Yes. After training converges, the global model is exported as an ONNX or TorchScript file. Our dashboard generates a model card with per-node performance breakdowns, fairness audits, and an IRB-compatible data lineage report." }
];

/* ================================================================
   BIOLOGICAL HEART GENESIS — Canvas 2D + 3D Perspective Projection
   ================================================================ */
class BiologicalHeartGenesis {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.phase  = 0;
    this.time   = 0;
    this.pumpT  = 0;
    this.rotY   = 0;        // Y-axis rotation (radians)

    // Interpolation targets
    this._lerpCur  = 0;     // current particle assembly [0..1]
    this._lerpTgt  = 0;     // target particle assembly
    this._vasCur   = 0;     // vascular alpha [0..1]
    this._vasTgt   = 0;
    this._meshCur  = 0;     // solid heart alpha [0..1]
    this._meshTgt  = 0;

    this._resize();
    window.addEventListener('resize', () => this._resize());

    this._initParticles();
    this._initVascular();
    this._animate();
  }

  /* ══ ANATOMICAL HEART GEOMETRY (built once, reused per particle) ══ */
  _buildHeartGeom() {
    // 17-vertex 2D silhouette of the anatomical heart.
    // Coordinates: x=right, y=up, normalized units (heart ~0.9 tall, 0.88 wide).
    // Heart is naturally tilted: apex lower-left, aorta/SVC upper-right.
    const OL = [
      [ 0.00, -0.68],   // 0 Apex (bottom tip, slightly left of center)
      [-0.20, -0.56],   // 1 LV lower-lateral wall
      [-0.36, -0.24],   // 2 LV mid-lateral wall
      [-0.44,  0.06],   // 3 LV upper / LA base junction
      [-0.38,  0.22],   // 4 Left Atrium outer
      [-0.24,  0.34],   // 5 LA upper-left
      [-0.14,  0.42],   // 6 PA base left (indentation begins)
      [-0.05,  0.50],   // 7 PA inner notch / aorta transition
      [ 0.04,  0.52],   // 8 Ascending aorta left edge
      [ 0.15,  0.52],   // 9 Ascending aorta right edge
      [ 0.36,  0.42],   // 10 RA upper-right
      [ 0.44,  0.18],   // 11 RA mid-lateral
      [ 0.44, -0.02],   // 12 RA lower
      [ 0.40, -0.22],   // 13 RV upper-lateral
      [ 0.32, -0.46],   // 14 RV lower
      [ 0.16, -0.60],   // 15 RV near-apex
      [ 0.06, -0.68],   // 16 Just right of apex (closes loop)
    ];
    OL.push(OL[0]); // close the polygon

    // Pre-compute cumulative perimeter lengths for uniform arc-length sampling
    let totalLen = 0;
    const cumDist = [0];
    for (let i = 1; i < OL.length; i++) {
      const dx = OL[i][0] - OL[i-1][0];
      const dy = OL[i][1] - OL[i-1][1];
      totalLen += Math.sqrt(dx*dx + dy*dy);
      cumDist.push(totalLen);
    }

    // ── Tube vessel definitions (centerline waypoints + pre-computed data) ──
    const makeTube = (wps) => {
      const segs = [];
      let tot = 0;
      for (let i = 0; i < wps.length - 1; i++) {
        const a = wps[i], b = wps[i+1];
        const len = Math.sqrt((b[0]-a[0])**2 + (b[1]-a[1])**2 + ((b[2]||0)-(a[2]||0))**2);
        segs.push({ a, b, len });
        tot += len;
      }
      return { segs, tot };
    };

    // Aortic arch: rises from center, arches to the right (the large superior vessel)
    const aortaWP = [
      [0.10, 0.52, 0.00], [0.08, 0.64, 0.00], [0.16, 0.72, 0.00],
      [0.26, 0.72, 0.00], [0.34, 0.65, 0.00], [0.38, 0.52, 0.02],
    ];
    // Superior Vena Cava: narrow tall column entering RA from above-right
    const svcWP = [
      [0.38, 0.42, 0.00], [0.38, 0.52, 0.00], [0.38, 0.62, 0.00],
      [0.38, 0.73, 0.00],
    ];
    // Pulmonary artery root: short stump going upper-left from the PA notch
    const paWP = [
      [-0.05, 0.50, 0.00], [-0.12, 0.58, 0.02], [-0.20, 0.62, 0.00],
    ];

    this._heartGeom = {
      OL, cumDist, totalLen,
      aorta: makeTube(aortaWP), svc: makeTube(svcWP), pa: makeTube(paWP),
    };
  }

  /* ── Point-in-polygon (ray-casting, winding-order independent) ── */
  _inHeart(px, py) {
    const p = this._heartGeom.OL;
    let inside = false;
    for (let i = 0, j = p.length - 2; i < p.length - 1; j = i++) {
      if (((p[i][1] > py) !== (p[j][1] > py)) &&
          px < (p[j][0]-p[i][0]) * (py-p[i][1]) / (p[j][1]-p[i][1]) + p[i][0])
        inside = !inside;
    }
    return inside;
  }

  /* ── Sample a random 3D point on a tube (pre-computed) ──────── */
  _sampleTube({ segs, tot }, radius) {
    let t = Math.random() * tot;
    let seg = segs[segs.length - 1];
    for (const s of segs) { if (t <= s.len) { seg = s; t /= s.len; break; } t -= s.len; }
    // Interpolate along centerline
    const cx = seg.a[0] + (seg.b[0]-seg.a[0]) * t;
    const cy = seg.a[1] + (seg.b[1]-seg.a[1]) * t;
    const cz = (seg.a[2]||0) + ((seg.b[2]||0)-(seg.a[2]||0)) * t;
    // Radial offset (xz cross-section), biased toward surface for visible tube walls
    const ang = Math.random() * Math.PI * 2;
    const r   = Math.pow(Math.random(), 0.38) * radius; // 0.38 → strong surface bias
    return { x: cx + r * Math.cos(ang), y: cy, z: cz + r * Math.sin(ang) };
  }

  /* ══ PRIMARY SAMPLING — defines where each particle converges ══
     Distribution:  45% silhouette edge  (hard defined outline)
                    27% interior fill    (visible body mass)
                    16% aortic arch      (major superior vessel)
                     9% SVC              (right-side column)
                     3% PA root          (upper-left stump)       */
  _sampleAnatomy() {
    if (!this._heartGeom) this._buildHeartGeom();
    const G = this._heartGeom;
    const w = Math.random();

    /* 45% ── Silhouette perimeter (defines the hard edges) ─────── */
    if (w < 0.45) {
      let t = Math.random() * G.totalLen;
      for (let i = 1; i < G.OL.length; i++) {
        const segLen = G.cumDist[i] - G.cumDist[i-1];
        if (t <= segLen || i === G.OL.length - 1) {
          const f  = Math.min(t / Math.max(segLen, 1e-9), 1);
          const x  = G.OL[i-1][0] + (G.OL[i][0] - G.OL[i-1][0]) * f;
          const y  = G.OL[i-1][1] + (G.OL[i][1] - G.OL[i-1][1]) * f;
          // Tiny z-spread so edge particles form a thin shell, not a flat line
          return { x, y, z: (Math.random() - 0.5) * 0.07 };
        }
        t -= segLen;
      }
    }

    /* 27% ── Interior body fill (rejection-sampled inside polygon) ─ */
    if (w < 0.72) {
      let x, y, tries = 0;
      do {
        x = (Math.random() * 0.92) - 0.46;   // x ∈ [-0.46, +0.46]
        y = (Math.random() * 1.24) - 0.70;   // y ∈ [-0.70, +0.54]
        tries++;
      } while (!this._inHeart(x, y) && tries < 60);
      const z = (Math.random() - 0.5) * 0.30;
      return { x, y, z };
    }

    /* 16% ── Aortic Arch tube ──────────────────────────────────── */
    if (w < 0.88) return this._sampleTube(G.aorta, 0.060);

    /* 9% ─── SVC column ────────────────────────────────────────── */
    if (w < 0.97) return this._sampleTube(G.svc, 0.048);

    /* 3% ─── PA root stump ─────────────────────────────────────── */
    return this._sampleTube(G.pa, 0.050);
  }

  /* ── LEGACY PARAMETRIC (used by _drawHeartMesh only) ──────── */
  _hp(u, v) {
    const sinU = Math.sin(u), cosU = Math.cos(u);
    const hx = Math.pow(sinU, 3);
    const hy = (13*cosU - 5*Math.cos(2*u) - 2*Math.cos(3*u) - Math.cos(4*u)) / 17;
    return { x: hx * Math.sin(v), y: hy, z: hx * Math.cos(v) * 0.44 };
  }


  /* ── 3D → 2D PERSPECTIVE PROJECTION with Y-rotation ──────── */
  _project(p) {
    const S = Math.min(this.W, this.H) * 0.34;  // world scale
    const cosR = Math.cos(this.rotY), sinR = Math.sin(this.rotY);

    // Scale to world space
    const wx = p.x * S, wy = p.y * S, wz = p.z * S;

    // Rotate around Y
    const rx =  wx * cosR + wz * sinR;
    const ry =  wy;
    const rz = -wx * sinR + wz * cosR;

    // Perspective divide
    const fov = Math.min(this.W, this.H) * 1.1;
    const sc  = fov / (fov + rz + 20);

    return {
      sx: this.cx + rx * sc,
      sy: this.cy - ry * sc,
      sc,            // perspective scale (0.4 .. 1.2)
      rz             // rotated z (for depth sorting)
    };
  }

  /* ── RESIZE ──────────────────────────────────────────────── */
  _resize() {
    const vw   = window.innerWidth;
    const size = Math.min(vw * (vw > 900 ? 0.46 : 0.90), 560);
    const dpr  = Math.min(window.devicePixelRatio || 1, 2);

    this.W = size; this.H = size;
    this.cx = size / 2; this.cy = size / 2;

    this.canvas.width        = Math.round(size * dpr);
    this.canvas.height       = Math.round(size * dpr);
    this.canvas.style.width  = size + 'px';
    this.canvas.style.height = size + 'px';

    // Reset transform then apply DPR scale once
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ── PARTICLE SYSTEM INIT ────────────────────────────────── */
  _initParticles() {
    const N = 3200;
    this.N   = N;
    this.px  = new Float32Array(N);   // current x
    this.py  = new Float32Array(N);   // current y
    this.pz  = new Float32Array(N);   // current z
    this.psx = new Float32Array(N);   // scatter start x
    this.psy = new Float32Array(N);   // scatter start y
    this.psz = new Float32Array(N);   // scatter start z
    this.ptx = new Float32Array(N);   // target x (on heart surface)
    this.pty = new Float32Array(N);   // target y
    this.ptz = new Float32Array(N);   // target z
    this.psz2= new Float32Array(N);   // particle size base
    this.plag= new Float32Array(N);   // lerp lag offset per particle
    this.pR  = new Float32Array(N);   // particle red channel
    this.pG  = new Float32Array(N);   // green
    this.pB  = new Float32Array(N);   // blue

    for (let i = 0; i < N; i++) {
      // Target: mathematical (cardioid) heart surface — symmetrical, sharp apex, two lobes
      const u = Math.random() * Math.PI * 2;
      const v = Math.acos(1 - 2 * Math.random());
      const t = this._hp(u, v);
      this.ptx[i] = t.x;
      this.pty[i] = t.y;
      this.ptz[i] = t.z;

      // Scatter: random sphere of radius 1.6..3.2 (normalized units)
      const sR  = 1.6 + Math.random() * 1.6;
      const su  = Math.random() * Math.PI * 2;
      const sv  = Math.acos(1 - 2 * Math.random());
      this.psx[i] = sR * Math.sin(sv) * Math.cos(su);
      this.psy[i] = sR * Math.sin(sv) * Math.sin(su);
      this.psz[i] = sR * Math.cos(sv);

      // Start at scatter
      this.px[i] = this.psx[i];
      this.py[i] = this.psy[i];
      this.pz[i] = this.psz[i];

      // Size: 1.0 – 3.2 px base
      this.psz2[i] = 0.9 + Math.random() * 2.3;

      // Lag: stagger each particle's arrival slightly
      this.plag[i] = (Math.random() - 0.5) * 0.12;

      // Color assignment
      const variant = Math.random();
      if (variant < 0.62) {
        // Deep crimson → warm red (myocardial)
        const br = 0.3 + Math.random() * 0.7;
        this.pR[i] = 0.55 + br * 0.40;
        this.pG[i] = 0.02 + br * 0.08;
        this.pB[i] = 0.02 + br * 0.06;
      } else if (variant < 0.82) {
        // Vein blue → indigo
        const bb = 0.4 + Math.random() * 0.6;
        this.pR[i] = 0.03 + bb * 0.08;
        this.pG[i] = 0.04 + bb * 0.14;
        this.pB[i] = 0.50 + bb * 0.50;
      } else {
        // Cyan data cells (brand accent)
        this.pR[i] = 0.0;
        this.pG[i] = 0.75 + Math.random() * 0.25;
        this.pB[i] = 0.85 + Math.random() * 0.15;
      }
    }

    // Pre-allocate depth-sort index array
    this._sortIdx = new Uint16Array(N);
    for (let i = 0; i < N; i++) this._sortIdx[i] = i;
  }

  /* ── VASCULAR PATHS (parametric cardioid surface) ───────────── */
  _initVascular() {
    this.vasPaths = [];

    // 10 arterial paths (oxygenated — crimson/red glow)
    for (let i = 0; i < 10; i++) {
      const t0    = (i / 10) * Math.PI * 2;
      const t1    = t0 + Math.PI / 4.2;
      const pts   = [];
      const steps = 24;
      for (let j = 0; j <= steps; j++) {
        const u = t0 + (t1 - t0) * (j / steps);
        const v = Math.PI * (0.22 + 0.18 * Math.sin(u * 1.7 + i));
        pts.push(this._hp(u, v));
      }
      this.vasPaths.push({ pts, arterial: true, offset: i / 10 });
    }

    // 7 venous paths (deoxygenated — deep blue glow)
    for (let i = 0; i < 7; i++) {
      const t0    = (i / 7) * Math.PI * 2 + 0.35;
      const t1    = t0 + Math.PI / 3.5;
      const pts   = [];
      const steps = 20;
      for (let j = 0; j <= steps; j++) {
        const u = t0 + (t1 - t0) * (j / steps);
        const v = Math.PI * (0.55 + 0.18 * Math.sin(u * 2 + i));
        pts.push(this._hp(u, v));
      }
      this.vasPaths.push({ pts, arterial: false, offset: (i / 7) + 0.5 });
    }
  }

  /* ── SET PHASE (called by ScrollController) ──────────────── */
  setPhase(ph) {
    if (ph === this.phase) return;
    this.phase = ph;

    // [particleLerpTarget, vascularAlphaTarget, meshAlphaTarget]
    const T = {
      0: [0.00, 0.0, 0.0],
      1: [0.22, 0.0, 0.0],
      2: [0.68, 0.0, 0.0],
      3: [0.93, 0.9, 0.0],
      4: [1.00, 1.0, 1.0],
    };
    const t = T[ph] || T[0];
    this._lerpTgt  = t[0];
    this._vasTgt   = t[1];
    this._meshTgt  = t[2];
    // Pump starts at phase 4
    if (ph >= 4) this.pumpT = 0;
  }

  /* ── PER-FRAME UPDATE ────────────────────────────────────── */
  _update() {
    const dt = 0.038;
    const lerp = (a, b) => a + (b - a) * dt;

    this._lerpCur = lerp(this._lerpCur, this._lerpTgt);
    this._vasCur  = lerp(this._vasCur,  this._vasTgt);
    this._meshCur = lerp(this._meshCur, this._meshTgt);

    const L = this._lerpCur;

    // Pump: 72 BPM = 1.2 Hz → pumpT increments at 1.2 * 2π per second ≈ 0.125 per frame @60fps
    if (this.phase >= 4) this.pumpT += 0.120;

    // Slow organic Y-rotation
    this.rotY += 0.0025;

    // Update particle positions (lerp from scatter to target)
    for (let i = 0; i < this.N; i++) {
      const effective = Math.max(0, Math.min(1, L + this.plag[i]));
      // ease-in-out quad
      const e = effective < 0.5 ? 2*effective*effective : -1 + (4 - 2*effective)*effective;
      this.px[i] = this.psx[i] + (this.ptx[i] - this.psx[i]) * e;
      this.py[i] = this.psy[i] + (this.pty[i] - this.psy[i]) * e;
      this.pz[i] = this.psz[i] + (this.ptz[i] - this.psz[i]) * e;
    }

    this.time += 0.016;
  }

  /* ── DRAW ────────────────────────────────────────────────── */
  _draw() {
    const { ctx, W, H, cx, cy } = this;
    ctx.clearRect(0, 0, W, H);

    // Ambient radial glow (deep red-cyan blend)
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.7);
    bg.addColorStop(0, `rgba(60,2,8,${0.04 + Math.sin(this.time * 0.7) * 0.01})`);
    bg.addColorStop(0.5, 'rgba(0,8,18,0.04)');
    bg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Pump scale factor (phase 4)
    const pumpS = this.phase >= 4 ? (1 + Math.sin(this.pumpT) * 0.024) : 1;
    const pumpY = this.phase >= 4 ? Math.sin(this.pumpT) * 0.020 : 0;

    // Project all particles
    const projs = new Array(this.N);
    for (let i = 0; i < this.N; i++) {
      projs[i] = this._project({
        x: this.px[i] * pumpS,
        y: this.py[i] * pumpS + pumpY,
        z: this.pz[i] * pumpS
      });
    }

    // Symbolic mesh disabled — anatomical particle cloud defines the shape

    // --- VASCULAR PATHS ---
    if (this._vasCur > 0.01) {
      this._drawVascular(pumpS, pumpY);
    }

    // --- PARTICLES (back to front → already sorted by ptz via rotY) ---
    // Simple approximation: sort by projected rz
    for (let i = 0; i < this.N; i++) this._sortIdx[i] = i;
    // Partial sort: use insertion sort on rz (fast for nearly-sorted data)
    const s = this._sortIdx, rz = projs;
    for (let i = 1; i < this.N; i++) {
      let j = i, key = s[i];
      while (j > 0 && rz[s[j-1]].rz > rz[key].rz) {
        s[j] = s[j-1]; j--;
      }
      s[j] = key;
    }

    const L = this._lerpCur;

    for (let ii = 0; ii < this.N; ii++) {
      const i = s[ii];
      const pr = projs[i];
      const effective = Math.max(0, Math.min(1, L + this.plag[i]));
      if (effective < 0.02) continue;

      // Ease-in alpha
      const easeAlpha = effective < 0.5 ? 2*effective*effective : -1+(4-2*effective)*effective;
      // Depth-modulated alpha (far particles dimmer)
      const depthFactor = 0.4 + pr.sc * 0.7;
      const alpha = Math.min(easeAlpha * depthFactor, 0.92);
      if (alpha < 0.04) continue;

      const r = this.pR[i], g = this.pG[i], b = this.pB[i];
      const sz = this.psz2[i] * pr.sc * pumpS;
      const x  = pr.sx, y = pr.sy;

      // Draw glow halo (only for high-alpha, near particles)
      if (alpha > 0.45 && sz > 0.8) {
        const haloR = sz * 3.5;
        const grd = ctx.createRadialGradient(x, y, 0, x, y, haloR);
        grd.addColorStop(0, `rgba(${(r*255)|0},${(g*255)|0},${(b*255)|0},${(alpha*0.22).toFixed(3)})`);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(x, y, haloR, 0, Math.PI * 2);
        ctx.fill();
      }

      // Cell core (inner bright ring)
      ctx.beginPath();
      ctx.arc(x, y, Math.max(sz * 0.72, 0.4), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${(r*255)|0},${(g*255)|0},${(b*255)|0},${alpha.toFixed(3)})`;
      ctx.fill();

      // Cell cytoplasm (outer translucent ring — biological look)
      if (sz > 1.1 && alpha > 0.35) {
        ctx.beginPath();
        ctx.arc(x, y, sz * 1.2, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${(r*255)|0},${(g*255)|0},${(b*255)|0},${(alpha*0.3).toFixed(3)})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }

  /* ── HEART MESH OUTLINE (Phase 4) ────────────────────────── */
  _drawHeartMesh(pumpS, pumpY) {
    const { ctx, rotY } = this;
    const a = this._meshCur;
    const steps = 160;

    // Multiple latitudinal slices for a 3D solid look
    const slices = [0.25, 0.42, 0.58, 0.75];
    for (const vFrac of slices) {
      const v = vFrac * Math.PI;
      ctx.beginPath();
      let first = true;
      for (let i = 0; i <= steps; i++) {
        const u = (i / steps) * Math.PI * 2;
        const p = this._hp(u, v);
        const pr = this._project({ x: p.x * pumpS, y: p.y * pumpS + pumpY, z: p.z * pumpS });
        first ? ctx.moveTo(pr.sx, pr.sy) : ctx.lineTo(pr.sx, pr.sy);
        first = false;
      }
      ctx.closePath();

      // Gradient fill: deep crimson base
      const cx = this.cx, cy = this.cy;
      const S  = Math.min(this.W, this.H) * 0.34;
      const grd = ctx.createRadialGradient(cx, cy - S*0.1, 0, cx, cy, S * 1.1);
      grd.addColorStop(0, `rgba(110,8,12,${(a * 0.35).toFixed(3)})`);
      grd.addColorStop(0.6, `rgba(65,4,8,${(a * 0.20).toFixed(3)})`);
      grd.addColorStop(1.0, `rgba(30,2,5,${(a * 0.10).toFixed(3)})`);
      ctx.fillStyle = grd;
      ctx.fill();

      // Glowing edge
      ctx.strokeStyle = `rgba(160,10,20,${(a * 0.45).toFixed(3)})`;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#cc1122';
      ctx.shadowBlur  = 12 * a;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  /* ── VASCULAR PATHS ──────────────────────────────────────── */
  _drawVascular(pumpS, pumpY) {
    const { ctx } = this;
    const va = this._vasCur;

    for (const path of this.vasPaths) {
      const { pts, arterial, offset } = path;
      const projected = pts.map(p => this._project({
        x: p.x * pumpS, y: p.y * pumpS + pumpY, z: p.z * pumpS
      }));

      const tubeColor = arterial ? [210, 18, 30]  : [24, 52, 210];
      const glowColor = arterial ? '#cc1122' : '#1144ee';
      const baseAlpha = arterial ? 0.88 : 0.72;

      ctx.save();
      ctx.globalAlpha = va * baseAlpha;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur  = 10;
      ctx.strokeStyle = `rgb(${tubeColor[0]},${tubeColor[1]},${tubeColor[2]})`;
      ctx.lineWidth   = arterial ? 1.9 : 1.35;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';

      ctx.beginPath();
      ctx.moveTo(projected[0].sx, projected[0].sy);
      for (let i = 1; i < projected.length; i++) {
        ctx.lineTo(projected[i].sx, projected[i].sy);
      }
      ctx.stroke();
      ctx.restore();

      // Animated blood cell dot
      const tAnim = ((this.time * 0.45 + offset) % 1) * projected.length;
      const dotI  = Math.min(Math.floor(tAnim), projected.length - 1);
      const dot   = projected[dotI];
      if (dot) {
        ctx.save();
        ctx.globalAlpha = va * 0.95;
        ctx.fillStyle   = arterial ? '#ff3344' : '#3355ff';
        ctx.shadowColor = glowColor;
        ctx.shadowBlur  = 10;
        ctx.beginPath();
        ctx.arc(dot.sx, dot.sy, arterial ? 2.8 : 2.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  /* ── ANIMATION LOOP ──────────────────────────────────────── */
  _animate() {
    requestAnimationFrame(() => this._animate());
    this._update();
    this._draw();
  }
}

/* ─── SCROLL PHASE CONTROLLER ────────────────────────────────── */
class ScrollController {
  constructor(hg) {
    this.hg    = hg;
    this.labels = [0,1,2,3,4].map(i => document.getElementById(`labelPhase${i}`));
    this.curPhase = -1;
    this.track = document.querySelector('.hero-scroll-track');
    this._init();
  }

  _progress() {
    const rect = this.track.getBoundingClientRect();
    const trackH = this.track.offsetHeight - window.innerHeight;
    return Math.max(0, Math.min(1, -rect.top / trackH));
  }

  _update() {
    const p = this._progress();
    let ph;
    if      (p < 0.07)  ph = 0;
    else if (p < 0.17)  ph = 1;
    else if (p < 0.28)  ph = 2;
    else if (p < 0.36)  ph = 3;
    else                ph = 4;

    if (ph !== this.curPhase) {
      this.curPhase = ph;
      this.hg.setPhase(ph);
      this._showLabel(ph);
    }
  }

  _showLabel(ph) {
    this.labels.forEach((el, i) => {
      if (!el) return;
      el.classList.remove('hidden-label');
      el.style.transition = 'opacity 0.65s ease, transform 0.65s ease';
      if (i === ph) {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
        el.style.pointerEvents = 'none';
      } else {
        el.style.opacity = '0';
        el.style.transform = i < ph ? 'translateY(-22px)' : 'translateY(22px)';
        setTimeout(() => { if (el) el.classList.add('hidden-label'); }, 700);
      }
    });
  }

  _init() {
    this._showLabel(0);
    this.hg.setPhase(0);
    window.addEventListener('scroll', () => this._update(), { passive: true });
  }
}

/* ─── BINARY RAIN ─────────────────────────────────────────────── */
function initBinaryRain() {
  const rain = document.getElementById('binaryRain');
  if (!rain) return;
  rain.classList.add('active');
  const chars = ['0','1','∇','Σ','∂','λ','η','∫'];
  for (let i = 0; i < 36; i++) {
    const el = document.createElement('span');
    el.className = 'bin-char';
    el.textContent = chars[Math.floor(Math.random() * chars.length)];
    el.style.left = `${Math.random() * 100}%`;
    el.style.top  = `${Math.random() * 100}%`;
    el.style.animationDelay    = `${Math.random() * 5}s`;
    el.style.animationDuration = `${3.5 + Math.random() * 3}s`;
    el.style.opacity = `${0.04 + Math.random() * 0.11}`;
    rain.appendChild(el);
  }
}

/* ─── REVEAL ON SCROLL ────────────────────────────────────────── */
function initRevealItems() {
  const items = document.querySelectorAll(
    '.reveal-item, .source-card, .tensor-card, .faq-item, .status--clean-badge'
  );
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const delay = parseFloat(e.target.dataset.delay || 0);
      setTimeout(() => e.target.classList.add('revealed'), delay);
      obs.unobserve(e.target);
    });
  }, { threshold: 0.13, rootMargin: '0px 0px -40px 0px' });
  items.forEach(el => obs.observe(el));
}

/* ─── STAT BARS ───────────────────────────────────────────────── */
function initStatBars() {
  const bars = document.querySelectorAll('.stat-row__bar');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('animated'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.5 });
  bars.forEach(b => obs.observe(b));
}

/* ─── TRAINING GRAPH ─────────────────────────────────────────── */
function initTrainingGraph() {
  const curve = document.getElementById('accCurve');
  const area  = document.getElementById('accArea');
  const dot   = document.getElementById('graphDot');
  const label = document.getElementById('accLabel');
  if (!curve) return;

  const graph = document.getElementById('trainingGraph');
  const obs = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) { animateGraph(); obs.disconnect(); }
  }, { threshold: 0.5 });
  obs.observe(graph);

  function animateGraph() {
    const xs   = [40, 65, 90, 115, 140, 165, 190, 215, 240, 265, 290];
    const ys   = [135,118,105, 92,  82,  73,  66,  57,  48,  38,  28];
    const accs = [12.4,28.1,41.7,55.3,64.2,71.8,77.4,83.1,87.6,91.2,94.7];
    let i = 0;
    (function step() {
      if (i >= xs.length) return;
      i++;
      let pts = '', aPts = '40,140 ';
      for (let j = 0; j < i; j++) pts += `${xs[j]},${ys[j]} `;
      aPts += pts + `${xs[i-1]},140`;
      curve.setAttribute('points', pts.trim());
      area.setAttribute('points', aPts.trim());
      dot.setAttribute('cx', xs[i-1]);
      dot.setAttribute('cy', ys[i-1]);
      if (label) label.textContent = `Accuracy: ${accs[i-1]}%`;
      setTimeout(step, 300);
    })();
  }
}

/* ─── NAV ─────────────────────────────────────────────────────── */
function initNav() {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 80);
  }, { passive: true });
}

/* ─── FAQ ACCORDION ───────────────────────────────────────────── */
function initFAQ() {
  const list = document.getElementById('faqList');
  if (!list) return;

  FAQ_DATA.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'faq-item';
    div.innerHTML = `
      <button class="faq-item__question" aria-expanded="false"
              id="faq-btn-${i}" aria-controls="faq-body-${i}">
        <span>${item.q}</span>
        <svg class="faq-chevron" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      <div class="faq-item__answer" id="faq-body-${i}"
           role="region" aria-labelledby="faq-btn-${i}">${item.a}</div>
    `;
    list.appendChild(div);

    div.querySelector('.faq-item__question').addEventListener('click', () => {
      const isOpen = div.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(el => {
        el.classList.remove('open');
        el.querySelector('.faq-item__question').setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        div.classList.add('open');
        div.querySelector('.faq-item__question').setAttribute('aria-expanded', 'true');
      }
    });
  });

  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e, idx) => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add('revealed'), idx * 70);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.faq-item').forEach(el => obs.observe(el));
}

/* ─── PILLAR PARTICLES ────────────────────────────────────────── */
function initPillarParticles() {
  const pillar = document.getElementById('interceptorPillar');
  if (!pillar) return;
  const obs = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) { spawn(); obs.disconnect(); }
  }, { threshold: 0.5 });
  obs.observe(pillar);

  function spawn() {
    setInterval(() => {
      const el = Object.assign(document.createElement('div'), { });
      el.style.cssText = `position:absolute;width:3px;height:3px;border-radius:50%;
        background:#00f2ff;box-shadow:0 0 6px #00f2ff;left:50%;
        top:${Math.random() > 0.5 ? '10%' : '90%'};
        transform:translateX(-50%);opacity:0;pointer-events:none;z-index:5;`;
      pillar.appendChild(el);
      el.animate([
        { opacity: 1, top: el.style.top },
        { opacity: 0, top: '50%' }
      ], { duration: 800, easing: 'ease-in', fill: 'forwards' });
      setTimeout(() => el.remove(), 900);
    }, 200);
  }
}

/* ─── SMOOTH ANCHORS ─────────────────────────────────────────── */
function initSmoothAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.getElementById(a.getAttribute('href').slice(1));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

/* ─── MAIN ────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('heartCanvas');
  const hg     = new BiologicalHeartGenesis(canvas);
  new ScrollController(hg);

  initBinaryRain();
  initRevealItems();
  initStatBars();
  initTrainingGraph();
  initNav();
  initFAQ();
  initPillarParticles();
  initSmoothAnchors();
});
