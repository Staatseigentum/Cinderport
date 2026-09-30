from PIL import Image, ImageDraw
from pathlib import Path

root = Path(__file__).resolve().parents[1]
image = Image.new('RGBA', (256, 256), '#111a2d')
draw = ImageDraw.Draw(image)

# Draw on a 16x16 grid so every scale keeps the same pixel shape.
pixels = [
    '................',
    '......OOOO......',
    '.....OYYYYO.....',
    '....OYYPPYYO....',
    '...OYYPPPPYYO...',
    '..OYYPPBBPPYYO..',
    '.OYYPPBBBBPPYYO.',
    '.OYYPBBWWBBPYYO.',
    '.OYYPBBWWBBPYYO.',
    '.OYYPPBBBBPPYYO.',
    '..OYYPPBBPPYYO..',
    '...OYYPPPPYYO...',
    '....OYYPPYYO....',
    '.....OYYYYO.....',
    '......OOOO......',
    '................',
]
palette = {'O': '#dc8c69', 'Y': '#f6c386', 'P': '#6e4d6c', 'B': '#344e68', 'W': '#fff0ba'}
for y, row in enumerate(pixels):
    for x, char in enumerate(row):
        if char in palette:
            draw.rectangle((x * 16, y * 16, x * 16 + 15, y * 16 + 15), fill=palette[char])

image.save(root / 'src' / 'assets' / 'icon.ico', sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
