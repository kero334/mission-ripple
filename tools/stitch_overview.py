"""Stitches the two overview shots from tools/world-overview.mjs into one full-map image.
Usage: python tools/stitch_overview.py <prefix> <worldHeight> [out.png] [scale]"""
import sys
from PIL import Image
prefix, H = sys.argv[1], int(sys.argv[2])
out = sys.argv[3] if len(sys.argv) > 3 else prefix + '.png'
scale = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
a = Image.open(prefix + '-0.png').convert('RGB')
b = Image.open(prefix + '-1.png').convert('RGB')
k = a.width / 1280  # canvas pixels per world pixel
full = Image.new('RGB', (a.width, round(H * k)))
full.paste(b, (0, round((H - 720) * k)))
full.paste(a, (0, 0))
if scale != 1:
    full = full.resize((round(full.width * scale), round(full.height * scale)), Image.Resampling.LANCZOS)
full.save(out)
print(out, full.size)
