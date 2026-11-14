"""Pixel art for the Ripple Effect (public/assets/ripple/): visible consequences in the world and the 3 endings.
Deterministic; no external inputs. Run: python tools/build_ripple_art.py
"""
from pathlib import Path
import json, math, random
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / 'public' / 'assets' / 'ripple'
OUT.mkdir(parents=True, exist_ok=True)
INK = (37, 31, 44); CREAM = (244, 223, 185); PALE = (255, 241, 208); GOLD = (255, 204, 104); ORANGE = (244, 163, 79)
CYAN = (89, 213, 219); CYAN_D = (40, 120, 140); NAVY = (37, 52, 76); STEEL = (201, 211, 216); GREY = (140, 148, 160); GREY_D = (86, 92, 104)
GREEN = (110, 196, 120); GREEN_D = (52, 128, 78); GREEN_L = (170, 230, 140); BROWN = (122, 78, 56); BROWN_D = (86, 54, 44)
OLIVE = (150, 140, 70); RUST = (185, 91, 76); TERRA = (200, 104, 74); TERRA_D = (150, 70, 56); TERRA_L = (226, 146, 107)
records = []


def save(im, name, purpose):
    im.save(OUT / f'{name}.png', optimize=True)
    records.append(dict(name=f'ripple-{name}', purpose=purpose, dimensions=f'{im.width}x{im.height}', animationFrames=1,
                        file=f'assets/ripple/{name}.png', reuseScope='ripple consequences + endings', productionStatus='production sprite'))


def canvas(w, h):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


# ---------------------------------------------------------------- plants: tray with 3 plants at 5 growth stages
def plant(d, x, y, stage):
    if stage == 0:  # drooping
        d.line((x, y, x, y - 5), fill=OLIVE); d.line((x, y - 5, x + 4, y - 3), fill=OLIVE); d.line((x, y - 4, x - 4, y - 2), fill=OLIVE)
        d.point((x + 4, y - 2), fill=BROWN); d.point((x - 4, y - 1), fill=BROWN)
        return
    h = [0, 5, 9, 13, 16][stage]
    c, cl = (GREEN_D, GREEN) if stage < 3 else (GREEN, GREEN_L)
    if stage == 1:
        c, cl = (OLIVE, (176, 170, 90))
    d.line((x, y, x, y - h), fill=c)
    for k in range(1, stage + 1):
        yy = y - h * k // (stage + 1) - 1
        s = 1 if k % 2 else -1
        d.polygon(((x, yy), (x + s * (3 + stage // 2), yy - 2), (x + s * (2 + stage // 2), yy + 1)), fill=cl, outline=c)
    if stage >= 3:
        d.ellipse((x - 2, y - h - 3, x + 2, y - h + 1), fill=cl, outline=c)
    if stage == 4:
        d.point((x, y - h - 1), fill=GOLD); d.point((x + 4, y - h // 2 - 2), fill=(255, 140, 150))


for st in range(5):
    im, d = canvas(44, 34)
    d.rectangle((2, 24, 41, 33), fill=INK); d.rectangle((4, 25, 39, 31), fill=BROWN); d.line((4, 25, 39, 25), fill=(160, 104, 74))
    for x in (11, 22, 33):
        plant(d, x, 25, st)
    save(im, f'plants-{st}', f'Grow tray, plant stage {st} (pretend)')
    im, d = canvas(16, 18)
    d.rectangle((3, 14, 12, 17), fill=BROWN, outline=INK)
    plant(d, 8, 14, st)
    save(im, f'sprout-{st}', f'Plant stage icon {st}')

# ---------------------------------------------------------------- spare monitor + Sun-watch screen (exterior props)
for on in (True, False):
    im, d = canvas(26, 36)
    d.rectangle((11, 18, 14, 34), fill=GREY_D); d.rectangle((6, 33, 19, 35), fill=INK)
    d.rectangle((1, 1, 24, 19), fill=INK); d.rectangle((3, 3, 22, 17), fill=CYAN_D if on else (40, 44, 56))
    if on:
        for i, v in enumerate((12, 8, 10, 5, 9, 4, 7)):
            d.rectangle((4 + i * 3, 3 + v, 5 + i * 3, 16), fill=CYAN)
        d.point((21, 4), fill=(140, 255, 160))
    else:
        d.line((6, 10, 19, 10), fill=GREY_D)
    save(im, f'monitor-{"on" if on else "off"}', 'Research Lab spare monitor')
    im, d = canvas(30, 38)
    d.rectangle((13, 20, 16, 36), fill=GREY_D); d.rectangle((7, 35, 22, 37), fill=INK)
    d.rectangle((1, 1, 28, 21), fill=INK); d.rectangle((3, 3, 26, 19), fill=(64, 44, 30) if on else (40, 44, 56))
    if on:
        d.ellipse((9, 5, 20, 16), fill=GOLD, outline=ORANGE)
        for a in range(8):
            r = math.radians(a * 45); d.point((int(14.5 + math.cos(r) * 8), int(10.5 + math.sin(r) * 8)), fill=GOLD)
    else:
        d.ellipse((10, 6, 19, 15), outline=GREY_D)
    save(im, f'watch-{"on" if on else "off"}', 'Communications Sun-watch screen')

# small UI icons
for on in (True, False):
    im, d = canvas(16, 16)
    d.ellipse((3, 1, 12, 10), fill=GOLD if on else GREY_D, outline=INK); d.rectangle((5, 10, 10, 14), fill=STEEL if on else GREY, outline=INK)
    if on:
        d.point((6, 4), fill=PALE); d.point((7, 3), fill=PALE)
    save(im, f'lamp-{"on" if on else "off"}', 'Greenhouse lamp icon')
im, d = canvas(14, 14); d.rectangle((1, 2, 12, 12), fill=GOLD, outline=INK); d.polygon(((7, 3), (4, 8), (7, 8), (6, 11), (10, 6), (7, 6)), fill=PALE); save(im, 'block', 'Power block icon')
im, d = canvas(14, 14); d.rectangle((1, 2, 12, 12), fill=(60, 54, 66), outline=(120, 110, 120)); save(im, 'block-empty', 'Empty power block')

# ---------------------------------------------------------------- robots
def rover(d, ox, oy, tilt=0):
    body = [(ox + 4, oy + 8 - tilt), (ox + 34, oy + 8 + tilt), (ox + 34, oy + 16 + tilt), (ox + 4, oy + 16 - tilt)]
    d.polygon(body, fill=STEEL, outline=INK)
    d.rectangle((ox + 8, oy + 2 - tilt, ox + 16, oy + 8 - tilt), fill=GREY, outline=INK)  # camera mast
    d.rectangle((ox + 10, oy + 3 - tilt, ox + 14, oy + 5 - tilt), fill=CYAN)
    d.rectangle((ox + 20, oy + 5, ox + 31, oy + 8), fill=NAVY, outline=INK)  # solar deck
    for i, x in enumerate((7, 19, 31)):
        y = oy + 19 + (tilt if i == 2 else -tilt if i == 0 else 0)
        d.ellipse((ox + x - 4, y - 4, ox + x + 4, y + 4), fill=GREY_D, outline=INK); d.point((ox + x, y), fill=STEEL)


im, d = canvas(40, 26); rover(d, 1, 1); save(im, 'rover', 'Base robot (pretend)')
im, d = canvas(48, 34)
d.polygon(((0, 33), (10, 20), (22, 24), (34, 18), (47, 33)), fill=TERRA_D, outline=INK)
rover(d, 4, 4, 3)
for x, y in ((40, 6), (43, 3)):
    d.rectangle((x, y, x + 2, y + 2), fill=(230, 190, 150))
save(im, 'rover-stuck', 'Robot stuck on a bump')
im, d = canvas(22, 20)
d.rectangle((3, 5, 18, 14), fill=(255, 214, 140), outline=INK); d.rectangle((6, 7, 15, 10), fill=NAVY); d.point((8, 8), fill=CYAN); d.point((13, 8), fill=CYAN)
d.line((10, 5, 10, 1), fill=INK); d.point((10, 0), fill=ORANGE)
for x in (6, 15):
    d.ellipse((x - 3, 13, x + 3, 19), fill=GREY_D, outline=INK)
save(im, 'helper', 'Helper robot (rescue)')

# ---------------------------------------------------------------- small effect icons
im, d = canvas(16, 16); d.ellipse((0, 0, 15, 15), fill=CREAM, outline=INK); d.line((4, 11, 10, 5), fill=GREY_D, width=2); d.ellipse((9, 2, 13, 6), outline=GREY_D); save(im, 'wrench', 'Repair needed bubble')
im, d = canvas(16, 16); d.polygon(((8, 0), (15, 3), (14, 10), (8, 15), (2, 10), (1, 3)), fill=GREEN, outline=INK); d.line((4, 8, 7, 11, 12, 4), fill=PALE, width=2); save(im, 'safe', 'Safe shutdown check')
im, d = canvas(16, 16); d.ellipse((0, 0, 15, 15), fill=CREAM, outline=INK); d.text((5, 1), '?', fill=RUST); save(im, 'question', 'Open question bubble')
im, d = canvas(7, 7); d.line((3, 0, 3, 6), fill=PALE); d.line((0, 3, 6, 3), fill=PALE); d.point((3, 3), fill=GOLD); save(im, 'spark', 'Sparkle')
im, d = canvas(48, 48)
for r, a in ((23, 30), (17, 55), (11, 90)):
    d.ellipse((24 - r, 24 - r, 24 + r, 24 + r), fill=(255, 230, 150, a))
save(im, 'glow', 'Soft warm glow')
im, d = canvas(48, 48)
for r, a in ((23, 26), (17, 50), (11, 80)):
    d.ellipse((24 - r, 24 - r, 24 + r, 24 + r), fill=(140, 240, 160, a))
save(im, 'glow-green', 'Greenhouse grow-light glow')


# ---------------------------------------------------------------- ending skies + ground (320x180 film frame)
def vgrad(d, w, y0, y1, c0, c1, bands=10):
    for y in range(y0, y1):
        t = (y - y0) / max(1, y1 - y0 - 1); t = math.floor(t * bands) / bands
        d.line((0, y, w - 1, y), fill=tuple(int(c0[i] + (c1[i] - c0[i]) * t) for i in range(3)))


def stars(d, n, seed, h=110):
    rnd = random.Random(seed)
    for _ in range(n):
        d.point((rnd.randrange(320), rnd.randrange(h)), fill=rnd.choice((PALE, (200, 210, 255), (255, 255, 255))))


for name, top, bot, n in (('day', (232, 170, 130), (250, 214, 170), 0), ('dusk', (70, 64, 118), (238, 146, 104), 18), ('night', (14, 16, 34), (40, 38, 72), 90)):
    im, d = canvas(320, 180); vgrad(d, 320, 0, 180, top, bot)
    stars(d, n, 31)
    if name == 'day':
        d.ellipse((248, 22, 262, 36), fill=(255, 246, 220))  # small, pale Sun as seen from Mars
    if name == 'dusk':
        d.ellipse((70, 98, 82, 110), fill=(205, 222, 255)); d.point((60, 40), fill=(160, 200, 255))  # Sun low, Earth dot
    save(im, f'sky-{name}', f'Ending sky ({name})')
    im, d = canvas(320, 80)
    shade = {'day': (TERRA_L, TERRA, TERRA_D), 'dusk': ((190, 110, 92), (150, 82, 74), (110, 60, 60)), 'night': ((92, 62, 76), (70, 48, 62), (50, 36, 50))}[name]
    rnd = random.Random(5)
    pts = [(0, 30)] + [(x, 18 + int(10 * math.sin(x / 37) + 6 * math.sin(x / 13 + 1))) for x in range(0, 321, 8)] + [(320, 80), (0, 80)]
    d.polygon(pts, fill=shade[2])
    pts2 = [(0, 44)] + [(x, 38 + int(5 * math.sin(x / 23 + 2))) for x in range(0, 321, 6)] + [(320, 80), (0, 80)]
    d.polygon(pts2, fill=shade[1])
    d.rectangle((0, 56, 320, 80), fill=shade[0])
    for _ in range(70):
        x, y = rnd.randrange(320), rnd.randrange(46, 80); d.point((x, y), fill=shade[2])
    for _ in range(9):
        x, y = rnd.randrange(320), rnd.randrange(58, 78); d.ellipse((x, y, x + rnd.randrange(4, 9), y + 3), fill=shade[2])
    save(im, f'ground-{name}', f'Ending ground ({name})')

(OUT.parent / 'ripple-manifest.json').write_text(json.dumps(records, indent=2), encoding='utf8')
print(f'Built {len(records)} ripple assets')
