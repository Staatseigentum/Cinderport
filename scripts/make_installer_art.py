from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
out = root / 'build'
out.mkdir(exist_ok=True)

tiny = Image.new('RGB', (82, 157), '#12192b')
d = ImageDraw.Draw(tiny)
for y in range(0, 157, 8):
    d.line((0, y, 81, y), fill='#1c2740')
for x in range(0, 82, 8):
    d.line((x, 0, x, 156), fill='#1c2740')

for x, y in [(7, 11), (23, 20), (68, 15), (75, 44), (11, 54), (62, 62), (35, 10), (49, 33)]:
    d.rectangle((x, y, x + 1, y + 1), fill='#f6bb7c')

d.rectangle((0, 104, 81, 156), fill='#29263c')
for x, height in [(0, 10), (8, 15), (17, 9), (28, 18), (39, 11), (49, 20), (60, 12), (72, 16)]:
    d.rectangle((x, 104 - height, x + 11, 120), fill='#493651')
d.rectangle((0, 123, 81, 156), fill='#201f35')
d.rectangle((16, 48, 65, 101), fill='#ecaa70')
d.rectangle((20, 52, 61, 97), fill='#f9d092')
d.rectangle((23, 55, 58, 94), fill='#80465f')
d.rectangle((26, 58, 55, 91), fill='#423b66')
d.rectangle((29, 61, 52, 88), fill='#243957')
d.rectangle((32, 64, 49, 85), fill='#416075')
d.rectangle((39, 66, 43, 83), fill='#ffcd88')
d.rectangle((34, 72, 48, 77), fill='#ffcd88')
d.rectangle((40, 94, 41, 122), fill='#d2775d')

sidebar = tiny.resize((164, 314), Image.Resampling.NEAREST)
draw = ImageDraw.Draw(sidebar)
font_path = Path('C:/Windows/Fonts/consolab.ttf')
font = ImageFont.truetype(str(font_path), 16) if font_path.exists() else ImageFont.load_default()
small = ImageFont.truetype(str(font_path), 9) if font_path.exists() else ImageFont.load_default()
draw.text((14, 19), 'CINDERPORT', font=font, fill='#f7dbb2')
draw.text((15, 44), 'YOUR WORLDS.', font=small, fill='#e6a878')
draw.text((15, 57), 'ONE PORTAL.', font=small, fill='#e6a878')
draw.text((15, 285), 'CINDERPORT // 2026', font=small, fill='#dfab83')
sidebar.save(out / 'installerSidebar.bmp')

header = Image.new('RGB', (150, 57), '#1c273c')
d = ImageDraw.Draw(header)
for y in range(0, 57, 8):
    d.line((0, y, 149, y), fill='#25334a')
d.rectangle((13, 13, 43, 43), fill='#e3976d')
d.rectangle((17, 17, 39, 39), fill='#f5c184')
d.rectangle((22, 22, 34, 34), fill='#6b435c')
d.rectangle((26, 26, 30, 30), fill='#ffdf9d')
d.text((54, 16), 'CINDER', font=font, fill='#f2dbc2')
d.text((54, 33), 'PORT', font=font, fill='#f0a36f')
header.save(out / 'installerHeader.bmp')
