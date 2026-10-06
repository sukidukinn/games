"""Remove near-invisible alpha noise from generated portrait backgrounds."""
from pathlib import Path
from PIL import Image

root = Path(__file__).parent / 'assets' / 'characters'
for path in root.rglob('*.png'):
    image = Image.open(path).convert('RGBA')
    alpha = image.getchannel('A').point(lambda value: 0 if value < 8 else value)
    image.putalpha(alpha)
    image.save(path)
print(f'Cleaned {len(list(root.rglob("*.png")))} portraits')
