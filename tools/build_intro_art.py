"""Original pixel art for the opening cinematic (public/assets/intro/). Native 320x180 frames are shown at x4.
Deterministic; no external inputs. Run: python tools/build_intro_art.py
"""
from pathlib import Path
import json, math, random
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / 'public' / 'assets' / 'intro'
OUT.mkdir(parents=True, exist_ok=True)
INK = (37, 43, 59); NIGHT = (22, 26, 48); NIGHT2 = (34, 40, 74); NIGHT3 = (48, 56, 98)
CREAM = (244, 223, 185); PALE = (255, 241, 208); ORANGE = (244, 163, 79); GOLD = (255, 204, 104); CYAN = (89, 213, 219)
BLUE = (58, 119, 154); RUST = (185, 91, 76); TERRA = (200, 104, 74); TERRA_D = (155, 74, 58); TERRA_L = (226, 146, 107)
GREY = (154, 163, 173); GREY_D = (93, 102, 114); STEEL = (201, 211, 216); WHITE = (255, 250, 240); WOOD = (122, 78, 56); WOOD_D = (86, 54, 44)
SKIN = (186, 128, 92); HAIR = (46, 32, 30); GREEN = (133, 203, 147)
records = []


def save(im, name, purpose, frames=1):
    im.save(OUT / f'{name}.png', optimize=True)
    records.append(dict(name=f'intro-{name}', purpose=purpose, dimensions=f'{im.width}x{im.height}', animationFrames=frames,
                        file=f'assets/intro/{name}.png', reuseScope='opening cinematic', productionStatus='production sprite'))


def canvas(w, h, bg=(0, 0, 0, 0)):
    im = Image.new('RGBA', (w, h), bg)
    return im, ImageDraw.Draw(im)


def vgrad(d, w, y0, y1, c0, c1, step=3):
    for y in range(y0, y1):
        t = (y - y0) / max(1, y1 - y0 - 1)
        t = math.floor(t * step * 4) / (step * 4)  # banded like pixel art
        c = tuple(int(c0[i] + (c1[i] - c0[i]) * t) for i in range(3))
        d.line((0, y, w - 1, y), fill=c)


def stars(d, w, h, n, seed, colors=(PALE, WHITE, (190, 200, 255))):
    rnd = random.Random(seed)
    for _ in range(n):
        x, y = rnd.randrange(w), rnd.randrange(h)
        d.point((x, y), fill=rnd.choice(colors))


# ------------------------------------------------------------------ scene 1: bedroom
def bedroom():
    im, d = canvas(320, 180, NIGHT)
    d.rectangle((0, 0, 319, 179), fill=(40, 44, 78))
    for x in range(0, 320, 16):
        d.line((x, 0, x, 128), fill=(44, 49, 86))
    d.rectangle((0, 128, 319, 179), fill=WOOD_D)
    for y in (134, 146, 160, 174):
        d.line((0, y, 319, y), fill=WOOD)
    # window with night sky
    d.rectangle((188, 20, 292, 96), fill=INK)
    win, wd = canvas(96, 68)
    vgrad(wd, 96, 0, 68, (16, 20, 44), (40, 48, 96))
    stars(wd, 96, 68, 40, 3)
    im.alpha_composite(win, (192, 24))
    d.ellipse((262, 32, 276, 46), fill=(255, 236, 190))
    d.ellipse((266, 31, 279, 44), fill=NIGHT)  # crescent moon
    d.line((240, 24, 240, 92), fill=INK, width=2); d.line((192, 58, 288, 58), fill=INK, width=2)
    d.rectangle((186, 96, 294, 100), fill=WOOD)
    # Mars drawing pinned to wall
    d.rectangle((46, 36, 92, 76), fill=PALE, outline=INK)
    d.ellipse((56, 44, 82, 70), fill=TERRA, outline=RUST)
    d.ellipse((62, 52, 68, 57), fill=TERRA_D); d.ellipse((72, 60, 77, 64), fill=TERRA_D)
    d.line((88, 40, 74, 50), fill=GOLD); d.point((89, 39), fill=GOLD)
    d.rectangle((67, 34, 70, 37), fill=RUST)
    # shelf with toy rocket
    d.rectangle((120, 70, 168, 73), fill=WOOD)
    d.polygon(((140, 46), (146, 56), (146, 68), (134, 68), (134, 56)), fill=WHITE, outline=INK)
    d.rectangle((137, 58, 143, 62), fill=CYAN)
    d.polygon(((134, 62), (129, 69), (134, 69)), fill=RUST); d.polygon(((146, 62), (151, 69), (146, 69)), fill=RUST)
    d.rectangle((158, 62, 164, 69), fill=BLUE, outline=INK)
    # bed
    d.rectangle((20, 112, 176, 150), fill=(70, 52, 74), outline=INK)
    d.rectangle((20, 100, 30, 150), fill=WOOD, outline=INK)
    d.rectangle((166, 108, 176, 150), fill=WOOD, outline=INK)
    d.rectangle((32, 104, 70, 118), fill=PALE, outline=INK)  # pillow
    d.rectangle((60, 114, 164, 136), fill=(58, 92, 140), outline=INK)  # blanket
    for x in range(66, 160, 12):
        d.point((x, 122), fill=GOLD); d.point((x + 6, 129), fill=PALE)
    # night lamp glow
    d.rectangle((182, 120, 196, 150), fill=WOOD, outline=INK)
    d.ellipse((180, 106, 198, 122), fill=(255, 214, 140), outline=INK)
    save(im, 'bedroom', 'Scene 1 bedroom background')


def child(frame):
    im, d = canvas(48, 24)
    # head on pillow + arm over blanket; frame 1 = breathing (blanket raised 1px)
    b = 1 if frame else 0
    d.ellipse((4, 4, 20, 20), fill=SKIN, outline=INK)
    d.pieslice((3, 2, 21, 18), 180, 360, fill=HAIR)
    d.line((9, 13, 11, 13), fill=INK); d.line((14, 13, 16, 13), fill=INK)
    d.point((12, 17), fill=RUST)
    d.rectangle((18, 12 - b, 46, 22), fill=(58, 92, 140), outline=INK)
    d.line((22, 14 - b, 34, 14 - b), fill=SKIN, width=2)
    save(im, f'child-{frame}', 'Sleeping child (breathing frames)', 2)


# ------------------------------------------------------------------ scene 2: helmet with Mars reflection
def helmet():
    im, d = canvas(120, 120)
    d.ellipse((6, 6, 114, 114), fill=WHITE, outline=INK, width=3)
    d.ellipse((16, 20, 104, 98), fill=(26, 34, 60), outline=GREY_D, width=3)
    # reflection: Mars + stars inside visor
    vis, vd = canvas(88, 78)
    stars(vd, 88, 78, 24, 7)
    vd.ellipse((40, 22, 76, 58), fill=TERRA, outline=RUST)
    vd.arc((40, 22, 76, 58), 200, 300, fill=TERRA_L, width=2)
    vd.ellipse((50, 34, 56, 39), fill=TERRA_D); vd.ellipse((62, 46, 68, 50), fill=TERRA_D)
    mask = Image.new('L', (88, 78), 0); ImageDraw.Draw(mask).ellipse((0, 0, 87, 77), fill=255)
    im.paste(vis, (16, 20), mask)
    d.arc((22, 26, 60, 60), 200, 260, fill=(220, 236, 255), width=3)  # glare
    d.rectangle((50, 104, 70, 112), fill=ORANGE, outline=INK)
    d.rectangle((2, 50, 10, 70), fill=GREY, outline=INK); d.rectangle((110, 50, 118, 70), fill=GREY, outline=INK)
    save(im, 'helmet', 'Scene 2 astronaut helmet with Mars reflection')


# ------------------------------------------------------------------ scene 3: launch
def launch_bg():
    im, d = canvas(320, 180)
    vgrad(d, 320, 0, 140, (28, 34, 70), (232, 140, 96), 4)
    stars(d, 320, 50, 30, 11)
    d.ellipse((24, 96, 64, 136), fill=(255, 196, 120))  # setting sun
    d.rectangle((0, 132, 319, 179), fill=(50, 46, 60))
    d.rectangle((0, 130, 319, 133), fill=(80, 70, 84))
    for x in range(0, 320, 9):
        d.point((x, 140 + (x * 7) % 30), fill=(70, 64, 80))
    # distant hills
    d.polygon(((0, 132), (40, 118), (90, 126), (150, 112), (220, 124), (270, 114), (320, 122), (320, 133), (0, 133)), fill=(64, 52, 76))
    save(im, 'launch-sky', 'Scene 3 dusk sky and ground')


def tower():
    im, d = canvas(40, 120)
    d.rectangle((8, 0, 14, 119), fill=GREY_D, outline=INK)
    for y in range(4, 116, 10):
        d.line((8, y, 14, y + 8), fill=GREY); d.line((14, y, 8, y + 8), fill=GREY)
    for y in (30, 60, 90):
        d.rectangle((14, y, 34, y + 3), fill=GREY, outline=INK)
    d.rectangle((0, 112, 39, 119), fill=(70, 70, 84), outline=INK)
    d.point((11, 2), fill=(255, 80, 80))
    save(im, 'tower', 'Launch tower')


def rocket():
    im, d = canvas(28, 96)
    d.polygon(((14, 0), (22, 18), (6, 18)), fill=RUST, outline=INK)
    d.rectangle((6, 18, 22, 78), fill=WHITE, outline=INK)
    d.rectangle((9, 26, 19, 30), fill=BLUE); d.rectangle((9, 46, 19, 47), fill=GREY)
    d.ellipse((10, 34, 18, 42), fill=CYAN, outline=INK)
    d.polygon(((6, 62), (0, 82), (6, 78)), fill=RUST, outline=INK); d.polygon(((22, 62), (27, 82), (22, 78)), fill=RUST, outline=INK)
    d.rectangle((9, 78, 19, 86), fill=GREY_D, outline=INK)
    d.line((7, 52, 7, 70), fill=STEEL)
    save(im, 'rocket', 'Rocket')


def flame(frame):
    im, d = canvas(20, 34)
    L = (24, 30, 27)[frame]
    w = (6, 8, 7)[frame]
    d.polygon(((10 - w, 0), (10 + w, 0), (10, L)), fill=ORANGE)
    d.polygon(((10 - w + 3, 0), (10 + w - 3, 0), (10, L - 8)), fill=GOLD)
    d.polygon(((10 - 2, 0), (10 + 2, 0), (10, L - 16)), fill=WHITE)
    save(im, f'flame-{frame}', 'Engine flame frames', 3)


def smoke(frame):
    im, d = canvas(24, 24)
    r = (6, 9, 11)[frame]
    c = ((236, 226, 220), (210, 200, 196), (180, 172, 172))[frame]
    d.ellipse((12 - r, 12 - r, 12 + r, 12 + r), fill=c)
    d.ellipse((12 - r + 2, 12 - r + 1, 12 + r - 4, 12 + r - 5), fill=tuple(min(255, v + 18) for v in c))
    save(im, f'smoke-{frame}', 'Smoke puff frames', 3)


# ------------------------------------------------------------------ scene 4: space
def starfield(name, n, seed, size=(320, 180)):
    im, d = canvas(*size)
    stars(d, size[0], size[1], n, seed)
    if name.endswith('near'):
        rnd = random.Random(seed + 1)
        for _ in range(18):
            x, y = rnd.randrange(size[0]), rnd.randrange(size[1])
            d.point((x, y), fill=WHITE); d.point((x + 1, y), fill=(200, 210, 255))
    save(im, name, 'Parallax star layer')


def planet(name, size, base, dark, light, features):
    im, d = canvas(size, size)
    d.ellipse((1, 1, size - 2, size - 2), fill=base, outline=INK)
    for (x, y, r, c) in features:
        d.ellipse((x - r, y - r, x + r, y + r), fill=c)
    # terminator shading
    for i in range(size):
        for j in range(size):
            if im.getpixel((i, j))[3] and i + j > size * 1.35:
                if (i + j) % 2 == 0 or i + j > size * 1.55:
                    im.putpixel((i, j), dark + (255,))
    d.arc((4, 4, size - 5, size - 5), 200, 260, fill=light, width=2)
    save(im, name, f'{name} planet')


def ship():
    im, d = canvas(56, 24)
    d.polygon(((52, 12), (40, 4), (12, 4), (12, 20), (40, 20)), fill=WHITE, outline=INK)
    d.rectangle((14, 8, 34, 16), fill=STEEL); d.ellipse((36, 8, 44, 16), fill=CYAN, outline=INK)
    d.rectangle((2, 6, 12, 18), fill=GREY_D, outline=INK)
    d.rectangle((16, 0, 30, 3), fill=BLUE, outline=INK); d.rectangle((16, 21, 30, 23), fill=BLUE, outline=INK)
    save(im, 'ship', 'Spacecraft cruising to Mars')


def glow():
    im, d = canvas(16, 12)
    d.polygon(((15, 2), (15, 10), (0, 6)), fill=CYAN); d.polygon(((15, 4), (15, 8), (6, 6)), fill=WHITE)
    save(im, 'ship-glow', 'Ship engine glow')


# ------------------------------------------------------------------ scene 5: first steps (low angle)
def mars_low():
    im, d = canvas(320, 180)
    vgrad(d, 320, 0, 120, (120, 70, 84), (236, 164, 126), 4)
    d.ellipse((248, 20, 268, 40), fill=(255, 236, 214))  # small distant sun
    d.polygon(((0, 112), (60, 98), (120, 106), (190, 92), (250, 104), (320, 96), (320, 120), (0, 120)), fill=(176, 92, 80))
    d.rectangle((0, 118, 319, 179), fill=TERRA)
    vgrad(d, 320, 118, 180, TERRA_L, TERRA_D, 3)
    rnd = random.Random(21)
    for _ in range(160):
        x, y = rnd.randrange(320), rnd.randrange(122, 180)
        d.point((x, y), fill=rnd.choice((TERRA_D, TERRA_L, (140, 66, 52))))
    for (x, y, s) in ((30, 150, 3), (280, 160, 4), (210, 140, 2), (90, 168, 3)):
        d.polygon(((x, y), (x + 4 * s, y - 3 * s), (x + 8 * s, y - 2 * s), (x + 10 * s, y)), fill=(142, 68, 54), outline=INK)
    save(im, 'mars-low', 'Scene 5 low-angle Mars surface')


def lander(frame):
    im, d = canvas(96, 100)
    d.line((14, 98, 26, 70), fill=GREY_D, width=3); d.line((82, 98, 70, 70), fill=GREY_D, width=3)
    d.rectangle((8, 96, 22, 99), fill=GREY, outline=INK); d.rectangle((74, 96, 88, 99), fill=GREY, outline=INK)
    d.polygon(((22, 74), (74, 74), (66, 20), (30, 20)), fill=WHITE, outline=INK)
    d.polygon(((30, 20), (66, 20), (56, 4), (40, 4)), fill=STEEL, outline=INK)
    d.rectangle((26, 60, 70, 64), fill=ORANGE)
    d.ellipse((42, 26, 54, 38), fill=CYAN, outline=INK)
    if frame == 0:
        d.rectangle((38, 44, 58, 72), fill=GREY, outline=INK); d.line((48, 44, 48, 72), fill=GREY_D)
    else:
        d.rectangle((38, 44, 58, 72), fill=(255, 226, 170), outline=INK)  # open hatch, warm light
        d.polygon(((38, 72), (58, 72), (66, 96), (30, 96)), fill=GREY, outline=INK)  # ramp
        for y in (78, 84, 90):
            d.line((34 + (y - 72) // 4, y, 62 - (y - 72) // 4, y), fill=GREY_D)
    save(im, f'lander-{frame}', 'Lander with hatch closed/open', 2)


def boots(frame):
    im, d = canvas(80, 46)
    # two boots close to the camera; frame 1 lifts the front boot. Suit legs match the playable astronaut (white + orange).
    lift = 10 if frame == 1 else 0
    for (x, y) in ((6, 24), (40, 24 - lift)):
        d.rectangle((x + 8, y - 22, x + 26, y + 4), fill=WHITE, outline=INK)  # lower leg
        d.rectangle((x + 22, y - 21, x + 25, y + 3), fill=(222, 216, 206))  # side shading
        d.line((x + 11, y - 20, x + 11, y + 2), fill=(255, 255, 255))  # highlight
        d.rectangle((x + 8, y - 8, x + 26, y - 4), fill=ORANGE, outline=INK)  # suit band
        d.line((x + 9, y - 15, x + 25, y - 15), fill=(206, 200, 192))  # knee seam
        d.polygon(((x + 4, y + 4), (x + 30, y + 4), (x + 35, y + 13), (x - 1, y + 13)), fill=(118, 126, 138), outline=INK)  # boot
        d.rectangle((x + 6, y + 6, x + 28, y + 8), fill=GREY_D)  # strap
        d.point((x + 17, y + 7), fill=GOLD)
        d.rectangle((x - 1, y + 13, x + 35, y + 17), fill=INK)  # sole
        for k in range(x + 1, x + 34, 4):
            d.point((k, y + 16), fill=GREY_D)  # tread
    save(im, f'boots-{frame}', 'Low-angle boots stepping', 2)


def dust(frame):
    im, d = canvas(32, 16)
    r = (4, 7, 9)[frame]
    for k, (x, y) in enumerate(((10, 10), (20, 9), (15, 6))):
        d.ellipse((x - r + k, y - r // 2, x + r - k, y + r // 2), fill=(226, 160, 120, 210 - frame * 60))
    save(im, f'dust-{frame}', 'Boot dust puff frames', 3)


def footprint():
    im, d = canvas(14, 6)
    d.rectangle((1, 1, 12, 4), fill=TERRA_D)
    for x in range(2, 12, 3):
        d.point((x, 2), fill=(120, 56, 44))
    save(im, 'footprint', 'First footprint')


bedroom(); child(0); child(1); helmet(); launch_bg(); tower(); rocket()
for f in range(3): flame(f); smoke(f); dust(f)
starfield('stars-far', 140, 31); starfield('stars-near', 50, 32)
planet('earth', 64, BLUE, (34, 70, 110), (160, 210, 240), [(20, 22, 7, GREEN), (40, 36, 9, GREEN), (28, 46, 5, GREEN), (44, 16, 4, WHITE)])
planet('mars', 96, TERRA, TERRA_D, TERRA_L, [(30, 34, 6, TERRA_D), (60, 50, 9, TERRA_D), (44, 70, 5, TERRA_D), (48, 10, 5, WHITE)])
ship(); glow(); mars_low(); lander(0); lander(1); boots(0); boots(1); footprint()
(OUT.parent / 'intro-manifest.json').write_text(json.dumps(records, indent=2), encoding='utf8')
print(f'Built {len(records)} intro assets')
