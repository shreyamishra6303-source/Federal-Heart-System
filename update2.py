import re

with open('frontend/dashboard.html', 'r', encoding='utf-8') as f:
    content = f.read()

# remove old SVG image tag
content = re.sub(r'<!-- ===== REAL WORLD MAP IMAGE ===== -->.*?/>', '', content, flags=re.DOTALL)

# Inject standard img tag behind the SVG
new_map = '''
                <!-- Real World Map Image Background -->
                <img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1000&auto=format&fit=crop" 
                     alt="Earth Map"
                     style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.6; pointer-events: none; z-index: 1; filter: sepia(0.5) hue-rotate(160deg) saturate(1.5) brightness(0.6);" />
'''

content = content.replace('<!-- SVG World Map -->', new_map + '\n                <!-- SVG World Map -->')
content = content.replace('<svg id="worldSVG"', '<svg id="worldSVG" style="position: absolute; z-index: 2;"')

with open('frontend/dashboard.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("HTML image tag injected.")
