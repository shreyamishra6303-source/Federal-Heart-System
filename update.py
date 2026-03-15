import re

with open('frontend/dashboard.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Chart below Project Athena
content = content.replace(
    '<div class="topbar__sub">Round 47 / 100 · Heart Failure Prediction · 3 Global Nodes</div>',
    '<div class="topbar__sub">Round 47 / 100 · Heart Failure Prediction · 3 Global Nodes</div>\n                <div style="margin-top: 6px; width: 220px; height: 35px; position:relative;">\n                    <canvas id="athenaMiniChart" width="220" height="35"></canvas>\n                </div>'
)

# 2. Real world map instead of SVG continent paths
map_image = '''<!-- ===== REAL WORLD MAP IMAGE ===== -->
                    <image href=\"https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Solarsystemscope_texture_8k_earth_daymap.jpg/1024px-Solarsystemscope_texture_8k_earth_daymap.jpg\" 
                           x=\"0\" y=\"0\" width=\"1000\" height=\"500\" preserveAspectRatio=\"none\" 
                           style=\"filter: grayscale(100%) sepia(30%) hue-rotate(180deg) brightness(50%) contrast(150%); opacity: 0.8;\" />'''

# Remove continent paths
content = re.sub(
    r'<!-- ===== CONTINENTS — Natural Earth bezier.*?fill="#141921" stroke="rgba\(0,242,255,0\.2\)"/>\s*</g>',
    map_image,
    content,
    flags=re.DOTALL
)

# 3. Global Model Heart text (instead of Health)
content = content.replace(
    '<div class="heart-card__title">Global Model Health</div>',
    '<div class="heart-card__title">Global Model Heart</div>'
)

# Improve 3D heart look (shiny red instead of cyan wireframe)
content = content.replace('ctx.strokeStyle = `rgba(0,242,255,0.18)`;', 'ctx.strokeStyle = `rgba(255,50,80,0.4)`;')
content = content.replace('ctx.fillStyle = `rgba(0,242,255,${Math.max(0, alpha * 0.04)})`;', 'ctx.fillStyle = `rgba(240,40,70,${Math.max(0, alpha * 0.9)})`;')
content = content.replace('ctx.strokeStyle = `rgba(0,242,255,${Math.max(0, alpha * 0.25)})`;', 'ctx.strokeStyle = `rgba(255,90,120,${Math.max(0, alpha * 1.0)})`;')
# Make the glowing core of the heart red
content = content.replace("gc.addColorStop(0, 'rgba(0,242,255,0.06)');", "gc.addColorStop(0, 'rgba(255,0,50,0.3)');")

# 4. Shiny blue arcs
content = content.replace(
    "grad.addColorStop(Math.max(0, tail),     'rgba(0,242,255,0)');",
    "grad.addColorStop(Math.max(0, tail),     'rgba(0,80,255,0)');"
)
content = content.replace(
    "grad.addColorStop(Math.min(1, progress), 'rgba(0,242,255,0.95)');",
    "grad.addColorStop(Math.min(1, progress), 'rgba(0,180,255,1)');"
)
content = content.replace('ctx.lineWidth = 1.8;', 'ctx.lineWidth = 3.5;')
content = content.replace("ctx.shadowColor = 'rgba(0,242,255,0.7)';", "ctx.shadowColor = 'rgba(0,120,255,1)';\n        ctx.shadowBlur = 15;")
content = content.replace("ctx.fillStyle = '#00f2ff';", "ctx.fillStyle = '#ccedff';")
content = content.replace("ctx.shadowColor = 'rgba(0,242,255,1)';", "ctx.shadowColor = 'rgba(0,120,255,1)';\n        ctx.shadowBlur = 20;")
content = content.replace("ctx.fillStyle = `rgba(0,242,255,${0.5 - offset * 3})`;", "ctx.fillStyle = `rgba(0,120,255,${0.9 - offset * 3})`;")

# 5. Project Athena mini chart logic
mini_script = '''
/* ===================================================
   6. PROJECT ATHENA MINI CHART
=================================================== */
(function() {
    const canvas = document.getElementById('athenaMiniChart');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    let frame = 0;
    const data = Array.from({length: 40}, () => Math.random() * 20 + 40);
    
    function draw() {
        ctx.clearRect(0, 0, 220, 35);
        frame++;
        if (frame % 5 === 0) {
            data.push(Math.random() * 20 + 40 + Math.sin(frame*0.1)*10);
            data.shift();
        }
        
        ctx.beginPath();
        for(let i=0; i<data.length; i++) {
            const x = (i / (data.length - 1)) * 220;
            const y = 35 - ((data[i] - 20) / 60) * 35;
            if(i===0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#00f2ff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Fill area
        ctx.lineTo(220, 35);
        ctx.lineTo(0, 35);
        const grad = ctx.createLinearGradient(0,0,0,35);
        grad.addColorStop(0, 'rgba(0,242,255,0.3)');
        grad.addColorStop(1, 'rgba(0,242,255,0)');
        ctx.fillStyle = grad;
        ctx.fill();
        
        requestAnimationFrame(draw);
    }
    draw();
})();
</script>
'''
content = content.replace('</script>', mini_script, 1)

with open('frontend/dashboard.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Dashboard updated successfully.")
