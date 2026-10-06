"""Build a labeled QA overview without altering individual character art."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).parent
groups = ['court', 'zodiac', 'circus', 'masquerade', 'myth']
files = [p for group in groups for p in sorted((root / 'assets' / 'characters' / group).glob('*.png'))]
cols, cell_w, cell_h = 6, 180, 288
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * cell_w, rows * cell_h), '#142039')
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype('C:/Windows/Fonts/consola.ttf', 16)
for i, path in enumerate(files):
    x, y = (i % cols) * cell_w, (i // cols) * cell_h
    draw.rectangle((x + 5, y + 5, x + cell_w - 6, y + 255), fill='#283857')
    image = Image.open(path).convert('RGBA')
    image.thumbnail((168, 246), Image.Resampling.NEAREST)
    sheet.paste(image, (x + (cell_w - image.width) // 2, y + 5), image)
    draw.text((x + 7, y + 262), path.stem, fill='#f4d078', font=font)
out = root / 'artifacts' / 'characters-contact-sheet.png'
out.parent.mkdir(exist_ok=True)
sheet.save(out)
print(out)
