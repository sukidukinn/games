"""Cut the AI source sheet and build 52 editable face PNGs plus four back PNGs."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).parent
SOURCE = ROOT / 'assets' / 'source-sheet.png'
OUT = ROOT / 'assets' / 'cards'
OUT.mkdir(parents=True, exist_ok=True)

# Measured card bounds in the 1536 x 1024 generated source sheet.
X_RANGES = [(63, 380), (428, 746), (790, 1110), (1156, 1473)]
TOP = (28, 447)
BOTTOM = (485, 955)
SUITS = [('spades', '♠', (20, 34, 55)), ('hearts', '♥', (180, 25, 46)),
         ('diamonds', '♦', (180, 25, 46)), ('clubs', '♣', (20, 48, 43))]
RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
SIZE = (250, 350)  # Poker size: 63.5 x 88.9 mm, exactly 5:7.
MASK = Image.new('L', SIZE, 0)
ImageDraw.Draw(MASK).rounded_rectangle((0, 0, SIZE[0] - 1, SIZE[1] - 1), radius=10, fill=255)
rank_font = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 54)
suit_font = ImageFont.truetype('C:/Windows/Fonts/seguisym.ttf', 38)

source = Image.open(SOURCE).convert('RGBA')
assert source.size == (1536, 1024), f'Unexpected sheet size: {source.size}'

for i, (suit, symbol, color) in enumerate(SUITS):
    x0, x1 = X_RANGES[i]
    # Crop to 5:7 without stretching the generated artwork.
    template = ImageOps.fit(source.crop((x0, TOP[0], x1, TOP[1])), SIZE,
                            method=Image.Resampling.NEAREST, centering=(0.5, 0.5))
    for rank in RANKS:
        image = template.copy()
        # Add sharp, uniform indexes to the AI artwork. Rendering the indexes at
        # half size and scaling with nearest-neighbor keeps their pixel edges.
        overlay = Image.new('RGBA', (125, 175), (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        box = draw.textbbox((0, 0), rank, font=rank_font)
        draw.text(((125 - (box[2] - box[0])) / 2 - box[0], 52 - box[1]), rank,
                  font=rank_font, fill=color + (255,), stroke_width=1,
                  stroke_fill=(255, 247, 220, 255))
        box = draw.textbbox((0, 0), symbol, font=suit_font)
        draw.text(((125 - (box[2] - box[0])) / 2 - box[0], 106 - box[1]), symbol,
                  font=suit_font, fill=color + (255,))
        image.alpha_composite(overlay.resize(SIZE, Image.Resampling.NEAREST))
        image.putalpha(MASK)
        image.save(OUT / f'{suit}-{rank.lower()}.png')

for i in range(4):
    x0, x1 = X_RANGES[i]
    image = ImageOps.fit(source.crop((x0, BOTTOM[0], x1, BOTTOM[1])), SIZE,
                         method=Image.Resampling.NEAREST, centering=(0.5, 0.5))
    image.putalpha(MASK)
    image.save(OUT / f'player-{i + 1}.png')

for name, suit_index, ink in [('red', 1, (165, 29, 45)), ('black', 0, (24, 29, 55))]:
    x0, x1 = X_RANGES[suit_index]
    image = ImageOps.fit(source.crop((x0, TOP[0], x1, TOP[1])), SIZE,
                         method=Image.Resampling.NEAREST, centering=(0.5, 0.5))
    # Remove the ordinary suit pip at the top of this face template.
    ImageDraw.Draw(image).rectangle((77, 16, 173, 83), fill=(255, 248, 229, 255))
    art = Image.open(ROOT / 'assets' / 'joker-source' / f'{name}.png').convert('RGBA')
    bbox = art.getchannel('A').point(lambda a: 255 if a > 20 else 0).getbbox()
    art = art.crop(bbox)
    art = ImageOps.contain(art, (192, 252), method=Image.Resampling.NEAREST)
    image.alpha_composite(art, ((SIZE[0] - art.width) // 2, 56))
    draw = ImageDraw.Draw(image)
    index_font = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 18)
    draw.text((125, 17), 'JOKER', anchor='mt', font=index_font, fill=ink, stroke_width=1,
              stroke_fill=(255, 248, 229))
    image.putalpha(MASK)
    image.save(OUT / f'joker-{name}.png')

files = list(OUT.glob('*.png'))
assert len(files) == 58, f'Expected 58 files, got {len(files)}'
print(f'Created {len(files)} card images in {OUT}')
