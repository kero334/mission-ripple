"""Pixel hand cursor for the companion tour (public/assets/ui/ui-cursor-pixel.png)."""
from pathlib import Path
from PIL import Image, ImageDraw
INK = (37, 31, 44, 255); WHITE = (255, 250, 240, 255); SHADE = (220, 206, 190, 255)
im = Image.new('RGBA', (15, 17), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
pts = [(4, 0), (6, 0), (6, 6), (8, 5), (10, 6), (12, 7), (13, 8), (13, 13), (11, 16), (5, 16), (2, 12), (0, 9), (1, 8), (3, 9), (4, 9)]
d.polygon(pts, fill=WHITE, outline=INK)
for x in (8, 10, 12):
    d.line((x, 7, x, 10), fill=SHADE)
d.line((5, 14, 11, 14), fill=SHADE)
im = im.resize((30, 34), Image.NEAREST)
out = Path(__file__).resolve().parents[1] / 'public' / 'assets' / 'ui' / 'ui-cursor-pixel.png'
im.save(out, optimize=True); print('wrote', out.name)
