"""Original pixel art for the child-experience layer: badges, science illustrations,
navigation beacons and passport/help icons. Deterministic, no external inputs.

Writes PNGs into public/assets/{ui,badges,science,guide}/ and records them in
public/assets/experience-manifest.json. The scene loads that manifest next to
pixel-manifest.json, so tools/build_pixel_assets.py can still regenerate its own manifest.
Run: python tools/build_experience_art.py
"""
from pathlib import Path
import json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'public' / 'assets'
INK = '#252b3b'; NAVY = '#1f3040'; NAVY2 = '#2b4258'; CREAM = '#f4dfb9'; PALE = '#fff1d0'
ORANGE = '#f4a34f'; GOLD = '#ffcc68'; GOLD_D = '#c98a2e'; CYAN = '#59d5db'; CYAN_D = '#2f9ea6'
BLUE = '#3a779a'; RUST = '#b95b4c'; TERRA = '#c8684a'; TERRA_D = '#9b4a3a'; GREEN = '#85cb93'
GREY = '#9aa3ad'; GREY_D = '#5d6672'; STEEL = '#c9d3d8'; WHITE = '#fffaf0'
records = []


def save(img, folder, name, purpose, scope, frames=1):
    out = ASSETS / folder
    out.mkdir(parents=True, exist_ok=True)
    img.save(out / f'{name}.png', optimize=True)
    records.append(dict(name=name, purpose=purpose, dimensions=f'{img.width}x{img.height}', animationFrames=frames,
                        file=f'assets/{folder}/{name}.png', reuseScope=scope, productionStatus='production sprite'))


def canvas(w, h):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def box(d, xy, fill, edge=INK, width=1):
    d.rectangle(xy, fill=fill, outline=edge, width=width)


# ---------------------------------------------------------------- illustrations
def ground(d, w, y0, h):
    d.rectangle((0, y0, w - 1, h - 1), fill=TERRA)
    d.line((0, y0, w - 1, y0), fill='#e08a62')
    for i in range(0, w, 7):
        x = (i * 13) % w
        y = y0 + 3 + (i * 5) % max(1, h - y0 - 4)
        d.point((x, y), fill=TERRA_D)
        d.point(((x + 3) % w, min(h - 1, y + 2)), fill='#e3926b')


def rock(d, x, y, s=1):
    d.polygon(((x, y), (x + 4 * s, y - 3 * s), (x + 8 * s, y - 2 * s), (x + 10 * s, y)), fill='#8e4436', outline=INK)
    d.line((x + 3 * s, y - 2 * s, x + 6 * s, y - 2 * s), fill='#d27a5a')


def wheel(d, cx, cy, r):
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=GREY_D, outline=INK, width=2)
    d.ellipse((cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3), fill=GREY)
    d.ellipse((cx - 2, cy - 2, cx + 2, cy + 2), fill=STEEL, outline=INK)
    for k in range(8):
        import math
        a = k * math.pi / 4
        d.point((round(cx + (r - 1) * math.cos(a)), round(cy + (r - 1) * math.sin(a))), fill=STEEL)


def rover(d, ox, oy, s=1.0, detector_glow=False):
    """Side view of a six-wheel rover in the Curiosity style; origin is top-left of a 120x64 frame."""
    P = lambda x, y: (round(ox + x * s), round(oy + y * s))
    R = lambda v: max(1, round(v * s))
    # suspension
    d.line((*P(24, 47), *P(40, 36), *P(52, 47)), fill=INK, width=R(3))
    d.line((*P(40, 36), *P(66, 34), *P(84, 47)), fill=INK, width=R(3))
    d.line((*P(24, 47), *P(40, 36), *P(52, 47)), fill=GREY_D, width=R(1))
    d.line((*P(40, 36), *P(66, 34), *P(84, 47)), fill=GREY_D, width=R(1))
    for x in (24, 52, 84):
        wheel(d, *P(x, 48), R(7))
    # power unit at the back with fins
    d.polygon((P(8, 26), P(26, 22), P(28, 32), P(10, 36)), fill=GREY_D, outline=INK)
    for k in range(4):
        d.line((*P(11 + k * 4, 25 - k), *P(13 + k * 4, 35 - k)), fill=STEEL)
    # body
    box(d, (*P(26, 22), *P(88, 35)), CREAM, width=R(2))
    d.rectangle((*P(30, 27), *P(84, 29)), fill=BLUE)
    d.rectangle((*P(30, 31), *P(60, 32)), fill='#d9c39c')
    # deck: antenna dish and detector
    d.ellipse((*P(46, 15), *P(58, 21)), fill=STEEL, outline=INK)
    d.line((*P(52, 21), *P(52, 23)), fill=INK, width=R(2))
    det = (*P(34, 17), *P(42, 22))
    if detector_glow:
        d.rectangle((det[0] - R(2), det[1] - R(2), det[2] + R(2), det[3] + R(2)), fill='#9ff3f5')
    box(d, det, CYAN if detector_glow else CYAN_D)
    # mast and camera head
    d.line((*P(76, 22), *P(76, 7)), fill=INK, width=R(3))
    d.line((*P(76, 22), *P(76, 7)), fill=STEEL, width=R(1))
    box(d, (*P(68, 1), *P(86, 8)), CREAM, width=R(2))
    d.rectangle((*P(79, 3), *P(81, 5)), fill=CYAN)
    d.rectangle((*P(83, 3), *P(84, 5)), fill=CYAN)
    # arm and tool turret
    d.line((*P(88, 30), *P(102, 36), *P(104, 45)), fill=INK, width=R(3))
    d.line((*P(88, 30), *P(102, 36), *P(104, 45)), fill=STEEL, width=R(1))
    box(d, (*P(99, 44), *P(109, 52)), GREY, width=R(2))
    d.point(P(104, 48), fill=ORANGE)


def curiosity():
    im, d = canvas(120, 64)
    ground(d, 120, 55, 64)
    rock(d, 4, 60); rock(d, 98, 61, 1); rock(d, 60, 62)
    rover(d, 0, 0)
    save(im, 'science', 'science-curiosity', 'Original rover illustration in the style of NASA Curiosity (not a photograph)', 'science cards, journal')


def rad_diagram():
    im, d = canvas(120, 64)
    d.rectangle((0, 0, 119, 63), fill=NAVY)
    for x, y in ((8, 6), (30, 12), (52, 4), (93, 9), (112, 20), (70, 15), (16, 26), (104, 3)):
        d.point((x, y), fill=PALE)
    ground(d, 120, 54, 64)
    rover(d, 22, 18, 0.62, detector_glow=True)
    target = (22 + round(38 * .62), 18 + round(19 * .62))
    for sx, col in ((4, CYAN), (24, GOLD), (60, CYAN), (100, GOLD), (116, CYAN)):
        pts = [(sx, 0)]
        steps = 5
        for k in range(1, steps + 1):
            t = k / steps
            x = round(sx + (target[0] - sx) * t + (3 if k % 2 else -3) * (1 - t))
            y = round(target[1] * t)
            pts.append((x, y))
        d.line(pts, fill=col, width=1)
    d.rectangle((target[0] - 1, target[1] - 1, target[0] + 1, target[1] + 1), fill=WHITE)
    save(im, 'science', 'science-rad', 'Original diagram: radiation reaching the rover detector', 'science cards, journal')


def nuri_help():
    im, d = canvas(32, 32)
    d.rounded_rectangle((2, 2, 29, 22), radius=5, fill=CREAM, outline=INK, width=2)
    d.polygon(((8, 21), (8, 29), (15, 21)), fill=CREAM, outline=INK)
    d.line((9, 21, 14, 21), fill=CREAM, width=2)
    d.arc((10, 5, 21, 15), 180, 365, fill=BLUE, width=3)
    d.line((19, 12, 16, 15), fill=BLUE, width=3)
    d.rectangle((15, 17, 17, 19), fill=BLUE)
    save(im, 'ui', 'ui-help-pixel', 'Nuri help speech bubble icon', 'HUD help button')


def passport():
    im, d = canvas(32, 32)
    box(d, (5, 2, 27, 29), NAVY2, width=2)
    d.rectangle((6, 3, 8, 28), fill=NAVY)
    d.ellipse((11, 7, 24, 20), fill=TERRA, outline=GOLD, width=2)
    d.arc((9, 11, 26, 17), 0, 360, fill=GOLD)
    d.rectangle((12, 23, 23, 24), fill=GOLD)
    d.rectangle((14, 26, 21, 26), fill=GOLD_D)
    save(im, 'ui', 'ui-passport-pixel', 'Science Passport booklet icon', 'HUD and passport')


def xp_star():
    im, d = canvas(16, 16)
    pts = [(8, 0), (10, 5), (15, 6), (11, 9), (12, 15), (8, 12), (4, 15), (5, 9), (1, 6), (6, 5)]
    d.polygon(pts, fill=GOLD, outline=INK)
    d.point((7, 5), fill=WHITE); d.point((8, 4), fill=WHITE)
    save(im, 'ui', 'ui-xp-pixel', 'Science XP star', 'HUD, toasts, passport')


def beacon():
    im, d = canvas(19, 24)
    d.ellipse((2, 0, 16, 14), fill=GOLD, outline=INK, width=2)
    d.ellipse((6, 4, 12, 10), fill=WHITE)
    d.polygon(((4, 11), (14, 11), (9, 22)), fill=GOLD, outline=INK)
    d.line((6, 12, 12, 12), fill=GOLD, width=2)
    d.point((9, 20), fill=ORANGE)
    save(im, 'guide', 'guide-beacon', 'Bobbing destination beacon shown above the current objective', 'world guidance')


def edge_arrow():
    im, d = canvas(18, 18)
    d.polygon(((2, 2), (16, 9), (2, 16), (6, 9)), fill=GOLD, outline=INK)
    d.line((5, 6, 10, 9), fill=WHITE)
    save(im, 'guide', 'guide-arrow', 'Screen-edge arrow pointing toward an off-screen objective', 'world guidance')


def ring():
    im, d = canvas(48, 20)
    d.ellipse((1, 1, 46, 18), outline=GOLD, width=2)
    d.ellipse((7, 5, 40, 14), outline='#ffe7a8', width=1)
    save(im, 'guide', 'guide-ring', 'Pulsing ground ring under the objective target', 'world guidance')


# ---------------------------------------------------------------- exhibit / discovery icons
def icon_canvas():
    return canvas(32, 32)


def ic_sun():
    im, d = icon_canvas()
    for a, b, c, e in ((16, 1, 16, 6), (16, 26, 16, 31), (1, 16, 6, 16), (26, 16, 31, 16), (5, 5, 8, 8), (24, 24, 27, 27), (5, 27, 8, 24), (24, 8, 27, 5)):
        d.line((a, b, c, e), fill=ORANGE, width=2)
    d.ellipse((8, 8, 24, 24), fill=GOLD, outline=INK, width=2)
    d.rectangle((12, 13, 14, 15), fill=ORANGE); d.rectangle((17, 17, 19, 19), fill=ORANGE)
    save(im, 'science', 'science-sun', 'Solar event catalog icon', 'exhibits, journal')


def ic_station():
    im, d = icon_canvas()
    for x in (2, 22):
        box(d, (x, 9, x + 8, 22), BLUE)
        d.line((x + 4, 9, x + 4, 22), fill=CYAN)
    d.line((10, 15, 22, 15), fill=INK, width=3)
    box(d, (12, 11, 20, 19), CREAM, width=2)
    d.rectangle((15, 14, 17, 16), fill=CYAN)
    d.point((26, 4), fill=PALE); d.point((6, 27), fill=PALE)
    save(im, 'science', 'science-station', 'Space station in low Earth orbit icon', 'exhibits, journal')


def ic_rows():
    im, d = icon_canvas()
    box(d, (3, 4, 29, 28), CREAM, width=2)
    for y in (9, 15, 21):
        d.line((5, y + 3, 27, y + 3), fill='#d9c39c')
    d.rectangle((5, 13, 27, 18), fill='#ffe0a8')
    d.rectangle((5, 19, 27, 24), fill='#ffe0a8')
    for y in (7, 13, 19):
        d.rectangle((6, y + 1, 12, y + 3), fill=BLUE)
        d.rectangle((16, y + 1, 26, y + 3), fill=GREY_D)
    d.line((14, 13, 14, 24), fill=RUST, width=2)
    save(im, 'science', 'science-rows', 'Two data rows with the same time icon', 'exhibits, journal')


def ic_dials():
    im, d = icon_canvas()
    for x, filled in ((2, True), (17, False)):
        d.ellipse((x, 8, x + 13, 21), fill=CREAM, outline=INK, width=2)
        if filled:
            d.line((x + 6, 15, x + 10, 11), fill=RUST, width=2)
        else:
            d.line((x + 4, 15, x + 9, 15), fill=GREY, width=1)
            d.point((x + 6, 13), fill=GREY_D)
        d.rectangle((x + 3, 23, x + 10, 26), fill=BLUE if filled else GREY)
    save(im, 'science', 'science-dials', 'One filled and one empty measurement column', 'exhibits, journal')


def ic_planet_day():
    im, d = icon_canvas()
    d.ellipse((4, 4, 28, 28), fill=TERRA, outline=INK, width=2)
    d.arc((4, 4, 28, 28), 200, 290, fill='#e6936c', width=2)
    d.ellipse((10, 17, 15, 21), fill=TERRA_D); d.ellipse((18, 9, 22, 12), fill=TERRA_D)
    d.line((3, 25, 29, 7), fill=GOLD, width=2)
    save(im, 'science', 'science-mars-day', 'Mars surface readings on a usual day icon', 'exhibits, journal')


def ic_compare():
    im, d = icon_canvas()
    d.line((3, 28, 29, 28), fill=INK, width=2); d.line((3, 4, 3, 28), fill=INK, width=2)
    box(d, (7, 23, 13, 27), CYAN)
    box(d, (18, 8, 24, 27), ORANGE)
    d.point((10, 21), fill=INK); d.point((21, 6), fill=INK)
    save(im, 'science', 'science-compare', 'Compare two days icon', 'science cards, journal')


# ---------------------------------------------------------------- badges
def medal(emblem, rim, fill):
    im, d = canvas(32, 32)
    d.polygon(((9, 20), (5, 31), (10, 28), (13, 31), (15, 22)), fill=RUST, outline=INK)
    d.polygon(((23, 20), (27, 31), (22, 28), (19, 31), (17, 22)), fill=BLUE, outline=INK)
    d.ellipse((3, 1, 28, 26), fill=rim, outline=INK, width=2)
    d.ellipse((6, 4, 25, 23), fill=fill)
    d.arc((6, 4, 25, 23), 200, 260, fill=WHITE, width=1)
    emblem(d)
    return im


def em_magnifier(d):
    d.ellipse((9, 7, 19, 17), outline=INK, width=2); d.ellipse((11, 9, 17, 15), fill=PALE)
    d.line((18, 16, 22, 20), fill=INK, width=3)


def em_chart(d):
    d.line((9, 19, 12, 17, 14, 18, 16, 9, 18, 13, 22, 15), fill=INK, width=2)
    d.rectangle((15, 7, 17, 9), fill=RUST)


def em_check(d):
    box(d, (10, 7, 21, 20), PALE)
    d.line((12, 14, 15, 17, 20, 10), fill='#2f8a52', width=2)


def em_second(d):
    d.arc((9, 7, 22, 20), 30, 300, fill=INK, width=2)
    d.polygon(((20, 6), (23, 11), (18, 11)), fill=INK)
    d.ellipse((13, 11, 18, 16), fill=CYAN, outline=INK)


def em_bulb(d):
    d.ellipse((11, 6, 20, 15), fill=PALE, outline=INK, width=2)
    d.rectangle((13, 15, 18, 19), fill=GREY, outline=INK)
    d.line((15, 9, 15, 13), fill=ORANGE)


def em_flag(d):
    d.line((11, 6, 11, 21), fill=INK, width=2)
    d.polygon(((12, 7), (21, 9), (12, 13)), fill=ORANGE, outline=INK)
    d.line((8, 21, 17, 21), fill=TERRA_D, width=2)


def em_key(d):
    d.ellipse((9, 8, 16, 15), outline=INK, width=2)
    d.line((15, 13, 22, 20), fill=INK, width=2)
    d.line((19, 17, 21, 15), fill=INK, width=2); d.line((21, 19, 23, 17), fill=INK, width=2)


def em_compass(d):
    d.ellipse((9, 6, 22, 19), fill=PALE, outline=INK, width=2)
    d.polygon(((15, 8), (17, 13), (15, 17), (13, 13)), fill=RUST)
    d.polygon(((15, 13), (17, 13), (15, 17), (13, 13)), fill=BLUE)


def em_book(d):
    box(d, (8, 9, 15, 19), PALE); box(d, (15, 9, 22, 19), PALE)
    d.polygon(((15, 4), (16, 6), (18, 6), (16, 7), (17, 9), (15, 8), (13, 9), (14, 7), (12, 6), (14, 6)), fill=GOLD, outline=INK)


def em_fork(d):
    d.line((15, 21, 15, 14, 10, 8), fill=INK, width=2); d.line((15, 14, 20, 8), fill=INK, width=2)
    d.polygon(((8, 6), (12, 6), (10, 10)), fill=CYAN, outline=INK)
    d.polygon(((18, 6), (22, 6), (20, 10)), fill=ORANGE, outline=INK)


def em_sun(d):
    d.ellipse((11, 8, 20, 17), fill=GOLD, outline=INK)
    for a, b, c, e in ((15, 4, 15, 6), (15, 19, 15, 21), (7, 12, 9, 12), (22, 12, 24, 12)):
        d.line((a, b, c, e), fill=ORANGE, width=2)


def em_plant(d):
    d.line((15, 20, 15, 11), fill=(47, 138, 82), width=2)
    d.ellipse((9, 9, 15, 14), fill=GREEN, outline=INK); d.ellipse((15, 6, 21, 11), fill=GREEN, outline=INK)
    d.rectangle((11, 19, 20, 22), fill=RUST, outline=INK)


def em_bolt(d):
    d.polygon(((17, 5), (10, 14), (15, 14), (12, 22), (21, 11), (16, 11)), fill=GOLD, outline=INK)


def em_star(d):
    pts = [(15, 5), (17, 11), (23, 11), (18, 15), (20, 21), (15, 17), (10, 21), (12, 15), (7, 11), (13, 11)]
    d.polygon(pts, fill=GOLD, outline=INK)


BADGES = [
    ('log-keeper', em_book, CYAN, '#c9f4f2'),
    ('sun-watcher', em_sun, ORANGE, '#ffd29a'),
    ('plant-scientist', em_plant, CYAN, '#c9f4f2'),
    ('power-planner', em_bolt, ORANGE, '#ffd29a'),
    ('base-commander', em_star, GOLD, '#ffe7a8'),
    ('first-discovery', em_magnifier, GOLD, '#ffe7a8'),
    ('evidence-detective', em_chart, GOLD, '#ffe7a8'),
    ('careful-scientist', em_check, ORANGE, '#ffd29a'),
    ('second-look', em_second, CYAN, '#c9f4f2'),
    ('scientific-thinker', em_bulb, GOLD, '#ffe7a8'),
    ('mission-complete', em_flag, ORANGE, '#ffd29a'),
    ('method-master', em_key, ORANGE, '#ffd29a'),
    ('outpost-explorer', em_compass, CYAN, '#c9f4f2'),
    ('curious-mind', em_book, CYAN, '#c9f4f2'),
    ('branch-explorer', em_fork, ORANGE, '#ffd29a'),
]


def badges():
    for name, emblem, rim, fill in BADGES:
        im = medal(emblem, rim, fill)
        save(im, 'badges', f'badge-{name}', f'Science badge: {name}', 'passport, toasts')
        px = im.load()
        locked = Image.new('RGBA', im.size)
        lp = locked.load()
        for y in range(im.height):
            for x in range(im.width):
                r, g, b, a = px[x, y]
                v = int((r * .3 + g * .59 + b * .11) * .45 + 30)
                lp[x, y] = (v, v + 2, v + 8, a)
        save(locked, 'badges', f'badge-{name}-locked', f'Locked silhouette for {name}', 'passport')


for fn in (curiosity, rad_diagram, nuri_help, passport, xp_star, beacon, edge_arrow, ring,
           ic_sun, ic_station, ic_rows, ic_dials, ic_planet_day, ic_compare, badges):
    fn()

(ASSETS / 'experience-manifest.json').write_text(json.dumps(records, indent=2), encoding='utf8')
print(f'Built {len(records)} experience assets (experience-manifest.json)')
