"""Pixel speaker icon for Nuri's hear-again button (public/assets/ui/ui-voice-pixel.png)."""
from pathlib import Path
from PIL import Image, ImageDraw
INK = (69, 42, 48, 255); GOLD = (255, 204, 104, 255); CREAM = (255, 241, 208, 255); RUST = (157, 87, 55, 255)
im = Image.new('RGBA', (16, 16), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
d.rectangle((1, 5, 4, 10), fill=RUST, outline=INK)
d.polygon(((5, 5), (9, 1), (9, 14), (5, 10)), fill=GOLD, outline=INK)
for x, y0, y1 in ((11, 6, 9), (13, 4, 11)):
    d.line((x, y0, x, y1), fill=INK)
d.point((6, 7), fill=CREAM)
out = Path(__file__).resolve().parents[1] / 'public' / 'assets' / 'ui' / 'ui-voice-pixel.png'
im.save(out, optimize=True); print('wrote', out.name)
