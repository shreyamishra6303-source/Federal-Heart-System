import os

TARGET = r"c:\Users\rkssa\OneDrive\Desktop\Federal-Heart-System\frontend\dashboard.html"

with open(TARGET, "r", encoding="utf-8") as f:
    html = f.read()

# 1. Map panel modifications
# Find the start of the map panel
map_panel_str = """<!-- SVG World Map -->
                <svg id="worldSVG" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">"""
map_replacement = """<!-- Real World Map Image Background -->
                <img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1000&auto=format&fit=crop"
                    alt="Earth Map"
                    style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.6; pointer-events: none; z-index: 1; filter: sepia(0.5) hue-rotate(160deg) saturate(1.5) brightness(0.6);" />

                <!-- SVG World Map -->
                <svg id="worldSVG" style="position: absolute; z-index: 2;" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">"""
html = html.replace(map_panel_str, map_replacement)

# Transparent rect
html = html.replace('<rect width="1000" height="500" fill="#070a0f"/>', '<rect width="1000" height="500" fill="transparent"/>')

# 2. Topbar modifications
topbar_str = """<div class="topbar__title">Project Athena <span style="color:var(--text-muted);font-weight:300">· Federated Dashboard</span></div>
                <div class="topbar__sub">Round 47 / 100 · Heart Failure Prediction · 3 Global Nodes</div>"""
topbar_replacement = """<div class="topbar__center">
                    <div class="topbar__title" style="display:flex;flex-direction:column;gap:4px">
                        <div><span style="color:#fff">Project Athena</span> <span
                                style="color:var(--text-muted)">· Federated Dashboard</span></div>
                        <div style="font-family:var(--font-mono); font-size:0.65rem; color:var(--text-muted)">Round 47 / 100 ·
                            Heart Failure Prediction · 3 Global Nodes</div>
                        <div style="margin-top: 6px; width: 220px; height: 35px; position:relative;">
                            <canvas id="athenaMiniChart" width="220" height="35"></canvas>
                        </div>
                    </div>
                </div>"""
html = html.replace(topbar_str, topbar_replacement)

# 3. Heart Title
html = html.replace('<div class="heart-card__title">Global Model Health</div>', '<div class="heart-card__title">Global Model Heart</div>')

# 4. Replace entire scripts section
scripts_split = html.split('<!-- ============================= SCRIPTS ============================= -->')
new_scripts = """<!-- ============================= SCRIPTS ============================= -->
<script>
    /* ===================================================
       1. ARC ANIMATION CANVAS
    =================================================== */
    (function () {
        const canvas = document.getElementById('arcsCanvas');
        const ctx = canvas.getContext('2d');
        let W, H;
        const NODES = { nyc: { xp: 0.294, yp: 0.274 }, lon: { xp: 0.4996, yp: 0.214 }, tky: { xp: 0.888, yp: 0.302 } };
        const AGG = { xp: 0.375, yp: 0.389 };
        const arcs = [ { from: 'nyc', progress: 0, speed: 0.006, delay: 0 }, { from: 'lon', progress: 0, speed: 0.005, delay: 60 }, { from: 'tky', progress: 0, speed: 0.007, delay: 30 } ];
        let frame = 0;

        function resize() {
            const rect = canvas.parentElement.getBoundingClientRect();
            W = canvas.width = rect.width || window.innerWidth;
            H = canvas.height = rect.height || 500;
        }

        function bezierPoint(p0, p1, cp, t) {
            const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * cp.x + t * t * p1.x;
            const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * cp.y + t * t * p1.y;
            return { x, y };
        }

        function drawArc(key, progress) {
            const n = NODES[key];
            const p0 = { x: n.xp * W, y: n.yp * H };
            const p1 = { x: AGG.xp * W, y: AGG.yp * H };
            const cp = { x: (p0.x + p1.x) / 2, y: Math.min(p0.y, p1.y) - H * 0.14 };

            ctx.beginPath();
            for (let t = 0; t <= 1; t += 0.02) {
                const pt = bezierPoint(p0, p1, cp, t);
                t === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y);
            }
            ctx.strokeStyle = 'rgba(0,242,255,0.07)';
            ctx.lineWidth = 1; ctx.stroke();

            const tail = Math.max(0, progress - 0.18);
            ctx.beginPath();
            for (let t = tail; t <= Math.min(progress, 1); t += 0.008) {
                const pt = bezierPoint(p0, p1, cp, t);
                t === tail ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y);
            }
            const grad = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
            grad.addColorStop(Math.max(0, tail), 'rgba(0,80,255,0)');
            grad.addColorStop(Math.min(1, progress), 'rgba(0,180,255,1)');
            ctx.strokeStyle = grad; ctx.lineWidth = 3.5;
            ctx.shadowBlur = 15; ctx.shadowColor = 'rgba(0,120,255,1)'; ctx.stroke();
            ctx.shadowBlur = 0;

            const dot = bezierPoint(p0, p1, cp, Math.min(progress, 1));
            ctx.beginPath(); ctx.arc(dot.x, dot.y, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = '#ccedff'; ctx.shadowBlur = 20; ctx.shadowColor = 'rgba(0,120,255,1)'; ctx.fill();
            ctx.shadowBlur = 0;

            [0.06, 0.12].forEach(offset => {
                const tp = Math.max(0, progress - offset);
                if (tp <= 0) return;
                const pp = bezierPoint(p0, p1, cp, Math.min(tp, 1));
                ctx.beginPath(); ctx.arc(pp.x, pp.y, 1.8, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0,120,255,${0.9 - offset * 3})`; ctx.fill();
            });
        }

        function draw() {
            ctx.clearRect(0, 0, W, H);
            frame++;
            arcs.forEach(arc => {
                if (frame < arc.delay) return;
                arc.progress += arc.speed;
                if (arc.progress > 1.2) arc.progress = 0;
                if (arc.progress <= 1.0) drawArc(arc.from, arc.progress);
            });
            const pulse = 0.5 + 0.5 * Math.sin(frame * 0.05);
            const ag = ctx.createRadialGradient(AGG.x * W, AGG.y * H, 0, AGG.x * W, AGG.y * H, 30 + pulse * 20);
            ag.addColorStop(0, `rgba(0,242,255,${0.4 + pulse * 0.2})`);
            ag.addColorStop(0.4, `rgba(0,242,255,${0.1})`);
            ag.addColorStop(1, 'transparent');
            ctx.beginPath(); ctx.arc(AGG.x * W, AGG.y * H, 35 + pulse * 22, 0, Math.PI * 2);
            ctx.fillStyle = ag; ctx.fill();
            requestAnimationFrame(draw);
        }

        resize(); 
        draw(); 
        window.addEventListener('resize', resize);
    })();

    /* ===================================================
       2. 3D WIREFRAME HEART
    =================================================== */
    (function () {
        const canvas = document.getElementById('heartCanvas3D');
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        let W, H, rot = 0;

        function resize() {
            const rect = canvas.parentElement.getBoundingClientRect();
            W = canvas.width = rect.width || 300;
            H = canvas.height = 180;
        }

        function heartSurface(t, s) {
            const sc = 1.0;
            const x = 16 * Math.pow(Math.sin(t), 3) * Math.sin(s) * sc;
            const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * Math.sin(s) * sc;
            const z = 8 * Math.cos(s) * sc;
            return [x, y, z];
        }

        function project(x, y, z, rx, ry) {
            const cosY = Math.cos(ry), sinY = Math.sin(ry);
            const x2 = x * cosY + z * sinY;
            const z2 = -x * sinY + z * cosY;
            const cosX = Math.cos(rx), sinX = Math.sin(rx);
            const y3 = y * cosX - z2 * sinX;
            const z3 = y * sinX + z2 * cosX;
            const fov = 70;
            const sc = fov / (fov + z3);
            const px = W / 2 + x2 * sc * 5.5;
            const py = H / 2 + y3 * sc * 5.5;
            return [px, py, sc, z3];
        }

        const NU = 24, NV = 16, tilt = -0.25;

        function draw() {
            ctx.clearRect(0, 0, W, H);
            rot += 0.012;

            for (let i = 0; i <= NU; i++) {
                const t = (i / NU) * Math.PI * 2;
                ctx.beginPath(); let first = true;
                for (let j = 0; j <= NV; j++) {
                    const s = (j / NV) * Math.PI;
                    const [hx, hy, hz] = heartSurface(t, s);
                    const [px, py, sc, z] = project(hx, hy, hz, tilt, rot);
                    if (first) { ctx.moveTo(px, py); first = false; } else ctx.lineTo(px, py);
                }
                ctx.strokeStyle = `rgba(255,50,80,0.4)`; ctx.lineWidth = 0.5; ctx.stroke();
            }

            for (let j = 1; j < NV; j++) {
                const s = (j / NV) * Math.PI;
                const pts = [];
                for (let i = 0; i <= NU; i++) {
                    const t = (i / NU) * Math.PI * 2;
                    const [hx, hy, hz] = heartSurface(t, s);
                    const [px, py, sc, z] = project(hx, hy, hz, tilt, rot);
                    pts.push([px, py, sc, z]);
                }
                ctx.beginPath();
                for (let i = 0; i < pts.length; i++) {
                    i === 0 ? ctx.moveTo(pts[i][0], pts[i][1]) : ctx.lineTo(pts[i][0], pts[i][1]);
                }
                ctx.closePath();
                const avgZ = pts.reduce((a, b) => a + b[3], 0) / pts.length;
                const alpha = (avgZ + 20) / 40;
                ctx.fillStyle = `rgba(240,40,70,${Math.max(0, alpha * 0.9)})`; ctx.fill();
                ctx.strokeStyle = `rgba(255,90,120,${Math.max(0, alpha * 1.0)})`; ctx.lineWidth = 0.4; ctx.stroke();
            }

            const gc = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 40);
            gc.addColorStop(0, 'rgba(255,0,50,0.3)'); gc.addColorStop(1, 'transparent');
            ctx.fillStyle = gc; ctx.beginPath(); ctx.arc(W / 2, H / 2, 40, 0, Math.PI * 2); ctx.fill();

            requestAnimationFrame(draw);
        }

        resize(); draw(); window.addEventListener('resize', resize);
    })();

    /* ===================================================
       3. ACCURACY CHART
    =================================================== */
    (function () {
        const canvas = document.getElementById('accuracyChart');
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        let W, H;

        function resize() {
            const rect = canvas.parentElement.getBoundingClientRect();
            W = canvas.width = rect.width || 300;
            H = canvas.height = 120;
        }

        const TOTAL_ROUNDS = 70; const data = [];
        for (let i = 0; i <= TOTAL_ROUNDS; i++) {
            const acc = 100 * (1 - Math.exp(-i / 18)) + Math.sin(i * 0.8) * 1.5;
            data.push(Math.min(100, acc));
        }
        let drawn = 0; const SPEED = 0.3;

        function draw() {
            ctx.clearRect(0, 0, W, H);
            drawn = Math.min(drawn + SPEED, TOTAL_ROUNDS);
            const pad = { t: 10, r: 8, b: 24, l: 28 };
            const cw = W - pad.l - pad.r; const ch = H - pad.t - pad.b;

            ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 0.5;
            for (let i = 0; i <= 4; i++) {
                const y = pad.t + (i / 4) * ch;
                ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
            }

            ctx.fillStyle = 'rgba(100,120,150,0.7)'; ctx.font = `9px monospace`; ctx.textAlign = 'right';
            for (let i = 0; i <= 4; i++) {
                const y = pad.t + (i / 4) * ch;
                ctx.fillText(`${100 - i * 25}`, pad.l - 4, y + 3);
            }

            ctx.textAlign = 'center';
            [0, 20, 40, 60, 70].forEach(r => {
                const x = pad.l + (r / TOTAL_ROUNDS) * cw;
                ctx.fillText(r, x, H - 6);
            });
            ctx.fillStyle = 'rgba(100,120,150,0.4)'; ctx.fillText('Rounds', W / 2, H - 1);

            ctx.beginPath();
            for (let i = 0; i <= TOTAL_ROUNDS; i++) {
                const loss = 100 * Math.exp(-i / 14);
                const x = pad.l + (i / TOTAL_ROUNDS) * cw;
                const y = pad.t + (1 - loss / 100) * ch;
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.strokeStyle = 'rgba(255,68,102,0.25)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);

            const steps = Math.floor(drawn);
            ctx.beginPath(); ctx.moveTo(pad.l, pad.t + ch);
            for (let i = 0; i <= steps; i++) {
                const x = pad.l + (i / TOTAL_ROUNDS) * cw;
                const y = pad.t + (1 - data[i] / 100) * ch;
                ctx.lineTo(x, y);
            }
            const lastX = pad.l + (drawn / TOTAL_ROUNDS) * cw;
            ctx.lineTo(lastX, pad.t + ch); ctx.closePath();
            const gradA = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
            gradA.addColorStop(0, 'rgba(0,242,255,0.18)'); gradA.addColorStop(1, 'rgba(0,242,255,0)');
            ctx.fillStyle = gradA; ctx.fill();

            ctx.beginPath();
            for (let i = 0; i <= steps; i++) {
                const x = pad.l + (i / TOTAL_ROUNDS) * cw;
                const y = pad.t + (1 - data[i] / 100) * ch;
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.strokeStyle = 'rgba(0,242,255,0.9)'; ctx.lineWidth = 1.5; ctx.stroke();

            const dotX = pad.l + (drawn / TOTAL_ROUNDS) * cw;
            const dotY = pad.t + (1 - data[steps] / 100) * ch;
            ctx.beginPath(); ctx.arc(dotX, dotY, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = '#ccedff'; ctx.shadowBlur = 10; ctx.shadowColor = '#00f2ff'; ctx.fill(); ctx.shadowBlur = 0;

            requestAnimationFrame(draw);
        }

        resize(); draw(); window.addEventListener('resize', resize);
    })();

    /* ===================================================
       4. MINI CHART & UPDATES
    =================================================== */
    setInterval(() => {
        const el = document.getElementById('dataVol');
        if (el) el.textContent = (Math.random() * 15 + 28).toFixed(1);
    }, 1800);

    setInterval(() => {
        const el = document.getElementById('metricAcc');
        if (el) {
            const base = 89.2 + (Math.random() - 0.5) * 0.4;
            el.textContent = base.toFixed(1) + '%';
        }
    }, 2500);

    (function () {
        const canvas = document.getElementById('athenaMiniChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let frame = 0;
        const data = Array.from({ length: 40 }, () => Math.random() * 20 + 40);

        function draw() {
            ctx.clearRect(0, 0, 220, 35);
            frame++;
            if (frame % 5 === 0) {
                data.push(Math.random() * 20 + 40 + Math.sin(frame * 0.1) * 10);
                data.shift();
            }

            ctx.beginPath();
            for (let i = 0; i < data.length; i++) {
                const x = (i / (data.length - 1)) * 220;
                const y = 35 - ((data[i] - 20) / 60) * 35;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = '#00f2ff'; ctx.lineWidth = 1.5; ctx.stroke();

            ctx.lineTo(220, 35); ctx.lineTo(0, 35);
            const grad = ctx.createLinearGradient(0, 0, 0, 35);
            grad.addColorStop(0, 'rgba(0,242,255,0.3)'); grad.addColorStop(1, 'rgba(0,242,255,0)');
            ctx.fillStyle = grad; ctx.fill();

            requestAnimationFrame(draw);
        }
        
        // Start right away
        draw();
    })();

    const btn = document.getElementById('fedRoundBtn');
    if(btn) {
        btn.addEventListener('click', function () {
            const orig = this.innerHTML;
            this.style.color = '#00ff88'; this.style.borderColor = 'rgba(0,255,136,0.4)';
            this.innerHTML = '<span class="btn-federated-dot" style="background:#00ff88;box-shadow:0 0 10px #00ff88"></span><span>Initializing Round 48…</span>';
            setTimeout(() => { this.innerHTML = orig; this.style.color = ''; this.style.borderColor = ''; }, 3000);
        });
    }
</script>
</body>
</html>"""

html = scripts_split[0] + new_scripts

with open(TARGET, "w", encoding="utf-8") as f:
    f.write(html)

print("Applied strict string replacement successfully without breaking layout!")
