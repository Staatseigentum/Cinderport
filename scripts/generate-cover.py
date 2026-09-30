"""Generate Cinderport's native pixel-art itch.io cover (630 x 500)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'media' / 'cinderport-cover.png'
OUT.parent.mkdir(exist_ok=True)

image = Image.new('RGB', (315, 250), '#11182c')
d = ImageDraw.Draw(image)
for y in range(150):
    d.line((0, y, 314, y), fill=(17 + y // 18, 24 + y // 22, 44 + y // 13))

# A sparse sky and layered, blocky ridges tie the artwork to the launcher UI.
for x, y, size in [(31,26,2),(58,52,1),(99,28,2),(224,28,2),(262,56,1),(285,34,2),(47,99,1),(275,103,2),(244,78,1)]:
    d.rectangle((x,y,x+size,y+size),fill='#f6b774')
for color, points in [
    ('#282540', [(0,139),(22,139),(22,131),(50,131),(50,143),(76,143),(76,124),(100,124),(100,142),(208,142),(208,128),(229,128),(229,137),(263,137),(263,126),(287,126),(287,139),(315,139),(315,195),(0,195)]),
    ('#43304f', [(0,168),(29,168),(29,154),(56,154),(56,174),(88,174),(88,157),(118,157),(118,173),(206,173),(206,157),(236,157),(236,169),(269,169),(269,149),(298,149),(298,166),(315,166),(315,210),(0,210)]),
    ('#69445f', [(0,187),(23,187),(23,178),(52,178),(52,192),(97,192),(97,183),(134,183),(134,195),(196,195),(196,179),(232,179),(232,191),(276,191),(276,176),(315,176),(315,213),(0,213)])
]: d.polygon(points,fill=color)

# Pixel portal: nested diamonds and a warm central light.
cx, cy = 157, 91
for radius, color in [(66,'#4d3555'),(57,'#b46b67'),(49,'#f0a56f'),(41,'#f7c48a'),(32,'#6e3d61'),(25,'#2e294d'),(16,'#f8c98f'),(9,'#fff0b2')]:
    d.polygon([(cx,cy-radius),(cx+radius,cy),(cx,cy+radius),(cx-radius,cy)],fill=color)
d.rectangle((cx-5,cy-4,cx+5,cy+4),fill='#fff5cf')
for x,y in [(91,83),(223,81),(105,116),(208,116),(72,55),(239,51)]:
    d.rectangle((x,y,x+2,y+2),fill='#e9a66f')

d.rectangle((0,205,314,249),fill='#0e1728')
d.line((0,204,314,204),fill='#e39a71',width=2)
font = ImageFont.truetype('C:/Windows/Fonts/consolab.ttf', 24)
small = ImageFont.truetype('C:/Windows/Fonts/consolab.ttf', 8)
title='CINDERPORT'
box=d.textbbox((0,0),title,font=font)
d.text(((315-(box[2]-box[0]))//2,209),title,font=font,fill='#f8dfb9')
sub='GAMES + TOOLS  /  ONE PORTAL'
box=d.textbbox((0,0),sub,font=small)
d.text(((315-(box[2]-box[0]))//2,238),sub,font=small,fill='#e9a779')

image.resize((630,500),Image.Resampling.NEAREST).save(OUT,optimize=True)
print(OUT)

header = Image.new('RGB', (480, 180), '#11182c')
h = ImageDraw.Draw(header)
for y in range(180):
    h.line((0,y,479,y), fill=(15+y//22, 20+y//20, 37+y//13))
for x,y in [(18,20),(62,38),(103,18),(145,42),(216,18),(271,33),(340,19),(436,31),(462,56),(27,87),(240,70),(465,107)]:
    h.rectangle((x,y,x+2,y+2),fill='#f5ad73')
for color, points in [
    ('#29243e',[(0,115),(39,115),(39,102),(79,102),(79,117),(110,117),(110,106),(163,106),(163,119),(248,119),(248,100),(279,100),(279,114),(331,114),(331,103),(391,103),(391,118),(480,118),(480,180),(0,180)]),
    ('#45304f',[(0,139),(42,139),(42,129),(88,129),(88,141),(148,141),(148,124),(183,124),(183,144),(266,144),(266,126),(308,126),(308,143),(377,143),(377,125),(415,125),(415,138),(480,138),(480,180),(0,180)]),
    ('#704561',[(0,157),(66,157),(66,145),(117,145),(117,160),(194,160),(194,148),(256,148),(256,160),(332,160),(332,143),(386,143),(386,159),(480,159),(480,180),(0,180)])
]: h.polygon(points,fill=color)
px, py = 371, 82
for radius,color in [(73,'#493454'),(64,'#b06c69'),(55,'#eda473'),(46,'#f6c48a'),(37,'#6c3e63'),(28,'#282849'),(18,'#f4bb83'),(11,'#fff1b8')]:
    h.polygon([(px,py-radius),(px+radius,py),(px,py+radius),(px-radius,py)],fill=color)
h.rectangle((px-5,py-4,px+5,py+4),fill='#fff5d1')
h.rectangle((0,170,479,179),fill='#0e1728')
h.line((0,169,479,169),fill='#e29a71',width=2)
brand_font = ImageFont.truetype('C:/Windows/Fonts/consolab.ttf', 35)
tag_font = ImageFont.truetype('C:/Windows/Fonts/consolab.ttf', 11)
h.text((28,60),'CINDERPORT',font=brand_font,fill='#f7e2c5')
h.text((32,110),'YOUR WORLDS. ONE STARTING POINT.',font=tag_font,fill='#f3ae79')
header_path = OUT.parent / 'cinderport-header.png'
header.resize((960,360),Image.Resampling.NEAREST).save(header_path,optimize=True)
print(header_path)

background = Image.new('RGB',(400,225),'#090e1c')
b = ImageDraw.Draw(background)
for y in range(225):
    for x in range(400):
        glow=max(0,110-abs(x-200)*0.5-y*1.25)
        background.putpixel((x,y),(9+int(glow*.08),14+int(glow*.04),28+int(glow*.11)))
for x,y in [(12,18),(36,67),(71,31),(96,112),(117,24),(144,72),(182,18),(215,53),(244,22),(278,84),(310,14),(342,58),(376,27),(18,146),(58,177),(110,194),(286,174),(333,207),(389,153)]:
    b.rectangle((x,y,x+1,y+1),fill='#74536a')
    if x%3==0: b.point((x,y),fill='#bc806e')
background_path=OUT.parent/'cinderport-background.png'
background.resize((1600,900),Image.Resampling.NEAREST).save(background_path,optimize=True)
print(background_path)
