"""
Converts graftlogo.png into the 3 icon sizes required by the Chrome extension manifest.
Requires Pillow: pip install Pillow
"""
from PIL import Image
import os

src = 'public/graftlogo.png'
dest_dir = 'companion/icons'
sizes = [16, 48, 128]

os.makedirs(dest_dir, exist_ok=True)

img = Image.open(src).convert('RGBA')  # preserve transparency if any

for size in sizes:
    resized = img.resize((size, size), Image.LANCZOS)
    out_path = os.path.join(dest_dir, f'icon{size}.png')
    resized.save(out_path, 'PNG')
    print(f'Saved {out_path} ({size}x{size})')

print('Done! Extension icons now match the dashboard logo.')
