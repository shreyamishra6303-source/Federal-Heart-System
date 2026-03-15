import urllib.request
import os

os.makedirs('frontend/assets', exist_ok=True)
url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Solarsystemscope_texture_8k_earth_daymap.jpg/1024px-Solarsystemscope_texture_8k_earth_daymap.jpg'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response, open('frontend/assets/world_map.jpg', 'wb') as out_file:
        data = response.read()
        out_file.write(data)
    print("Downloaded world_map.jpg successfully.")
except Exception as e:
    print(f"Failed to download map: {e}")

# Now update the dashboard.html
with open('frontend/dashboard.html', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'href="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Solarsystemscope_texture_8k_earth_daymap.jpg/1024px-Solarsystemscope_texture_8k_earth_daymap.jpg"',
    'href="assets/world_map.jpg"'
)

with open('frontend/dashboard.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated dashboard.html to use local asset.")
