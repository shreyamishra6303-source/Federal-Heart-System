import re
import os

TARGET = r"c:\Users\rkssa\OneDrive\Desktop\Federal-Heart-System\frontend\dashboard.html"

with open(TARGET, "r", encoding="utf-8") as f:
    html = f.read()

# 1. Remove Topbar
topbar_pattern = re.compile(r'<!-- Top bar -->.*?<!-- Content grid -->', re.DOTALL)
html = topbar_pattern.sub('<!-- Content grid -->', html)

# 2. Modify CSS to use grid-template-areas
css = """/* Content grid */
.content {
    flex: 1;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    grid-template-rows: 1fr;
    grid-template-areas: "map right";
    gap: 0;
    overflow: hidden;
    height: 100vh;
}
.map-panel {
    grid-area: map;
    position: relative;
    overflow: hidden;
    border-right: 1px solid var(--border);
    background: var(--bg);
}
.right-panel {
    grid-area: right;
    display: grid;
    grid-template-rows: auto 1fr auto;
    flex-direction: column;
    gap: 0;
    overflow-y: auto;
    background: var(--bg-2);
}"""
content_grid_pattern = re.compile(r'/\* Content grid \*/.*?(?=/\* Card base \*/)', re.DOTALL)
html = content_grid_pattern.sub(css + "\n\n", html)

# 3. Ensure Unsplash image is gone (if it was somehow left)
unsplash_pattern = re.compile(r'<!-- Real World Map Image Background -->.*?<img src="https://images.unsplash.com[^>]+>', re.DOTALL)
html = unsplash_pattern.sub('', html)

# 4. Inject High Fidelity Biological Heart script (replacing the wireframe heart)
new_heart_script = """/* ===================================================
   2. 3D BIOLOGICAL HEART RENDERING
=================================================== */
(function() {
    const canvas = document.getElementById('heartCanvas3D');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, rot = 0;

    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        W = canvas.width  = rect.width;
        H = canvas.height = 180;
    }

    // Parametric solid biological heart
    function heartSurface(t, s) {
        const sc = 1.0;
        const x = 16 * Math.pow(Math.sin(t), 3) * Math.sin(s) * sc;
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)) * Math.sin(s) * sc;
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

    const NU = 32, NV = 24;
    const tilt = -0.25;

    function draw() {
        ctx.clearRect(0, 0, W, H);
        rot += 0.015;

        // Draw solid biological heart simulation
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
            const avgZ = pts.reduce((a,b) => a + b[3], 0) / pts.length;
            const alpha = Math.max(0, Math.min(1, (avgZ + 20) / 40));
            // Biological fleshy red-pink coloring with depth
            const r = Math.floor(180 + alpha * 75);
            const g = Math.floor(20 + alpha * 30);
            const b = Math.floor(50 + alpha * 50);
            ctx.fillStyle = `rgba(${r},${g},${b},${0.95})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(${r+30},${g+20},${b+20}, 0.5)`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }

        // Inner core glow to mimic biological pulse
        const gc = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, 45);
        gc.addColorStop(0, 'rgba(255,40,70,0.25)');
        gc.addColorStop(1, 'transparent');
        ctx.fillStyle = gc;
        ctx.beginPath();
        ctx.arc(W/2, H/2, 45, 0, Math.PI * 2);
        ctx.fill();

        requestAnimationFrame(draw);
    }

    // Force initial geometry calculations
    resize();
    draw();
    window.addEventListener('resize', resize);
})();"""

old_heart_script = re.compile(r'/\* ===================================================\s*2\. 3D WIREFRAME HEART — WebGL-free procedural canvas\s*===================================================\ \*/.*?(?=/\* ===================================================\s*3\. ACCURACY VS ROUNDS CHART)', re.DOTALL)
html = old_heart_script.sub(new_heart_script + "\n\n", html)

# 5. Fix Arcs to the new glowing shiny cyan
new_draw_arc = """        function drawArc(key, progress) {
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
            grad.addColorStop(Math.min(1, progress), 'rgba(0,242,255,1)');
            ctx.strokeStyle = grad; ctx.lineWidth = 3.5;
            ctx.shadowBlur = 15; ctx.shadowColor = 'rgba(0,242,255,1)'; ctx.stroke();
            ctx.shadowBlur = 0;

            const dot = bezierPoint(p0, p1, cp, Math.min(progress, 1));
            ctx.beginPath(); ctx.arc(dot.x, dot.y, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = '#00f2ff'; ctx.shadowBlur = 15; ctx.shadowColor = 'rgba(0,242,255,1)'; ctx.fill();
            ctx.shadowBlur = 0;
"""
old_draw_arc = re.compile(r'function drawArc\(key, progress\) \{.*?(?=function draw\(\))', re.DOTALL)
html = old_draw_arc.sub(new_draw_arc + "        }\n\n        ", html)

with open(TARGET, "w", encoding="utf-8") as f:
    f.write(html)

print("Lockdown architecture established successfully.")
