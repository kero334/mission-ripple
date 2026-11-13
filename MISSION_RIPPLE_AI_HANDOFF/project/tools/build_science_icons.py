"""Original 32 px pixel icons for the child-friendly science-card UI."""
from pathlib import Path
from PIL import Image, ImageDraw

out=Path(__file__).resolve().parents[1]/'public/assets/ui'
out.mkdir(parents=True,exist_ok=True)
ink='#252b3b'; cream='#f4dfb9'; pale='#fff1d0'; orange='#f4a34f'; gold='#ffcc68'; cyan='#59d5db'; blue='#3a779a'; rust='#b95b4c'; green='#85cb93'
def icon(name,paint):
    im=Image.new('RGBA',(32,32),(0,0,0,0));d=ImageDraw.Draw(im)
    paint(d)
    im.save(out/f'science-{name}.png',optimize=True)
def box(d,xy,fill,edge=ink):d.rectangle(xy,fill=fill,outline=edge,width=2)
def rover(d):
    d.line((5,22,27,22),fill=ink,width=3)
    for x in (7,15,24):
        d.ellipse((x-3,22,x+3,28),fill=ink);d.ellipse((x-1,24,x+1,26),fill=orange)
    box(d,(8,12,23,21),cream);box(d,(11,14,20,17),blue)
    d.line((17,11,20,5),fill=ink,width=2);d.ellipse((18,3,23,8),fill=gold,outline=ink)
    box(d,(3,10,9,14),cyan);box(d,(23,10,29,14),cyan)
def radiation(d):
    d.ellipse((3,3,29,29),fill=gold,outline=ink,width=3)
    d.polygon((15,8,18,8,20,15,16,17,12,15),fill=ink)
    d.polygon((8,22,10,16,15,17,16,21,12,25),fill=ink)
    d.polygon((23,22,19,16,16,18,17,22,21,26),fill=ink)
    d.ellipse((14,14,18,18),fill=orange,outline=ink)
def clock(d):
    d.ellipse((3,3,29,29),fill=cream,outline=ink,width=3)
    d.line((16,7,16,16,23,20),fill=ink,width=3)
    d.ellipse((14,14,18,18),fill=orange)
    for x,y in ((15,4),(27,15),(15,27),(4,15)):d.rectangle((x,y,x+2,y+2),fill=rust)
def research(d):
    d.line((6,27,27,27),fill=ink,width=3);d.line((10,23,23,23),fill=blue,width=4)
    box(d,(11,4,16,17),cream);d.line((16,14,23,19),fill=ink,width=4)
    d.line((12,19,10,24),fill=ink,width=3);d.ellipse((17,18,27,25),fill=cyan,outline=ink,width=2)
    d.rectangle((12,6,15,8),fill=orange)
def question(d):
    d.ellipse((3,3,29,29),fill=cyan,outline=ink,width=3)
    d.arc((10,7,22,20),180,365,fill=ink,width=3);d.line((17,17,16,21),fill=ink,width=3);d.rectangle((15,24,18,27),fill=ink)
def choice(d):
    d.line((16,27,16,14,8,8),fill=ink,width=4);d.line((16,15,25,8),fill=ink,width=4)
    d.polygon((4,9,8,3,13,9),fill=cyan,outline=ink);d.polygon((20,9,25,3,29,9),fill=orange,outline=ink)
    d.rectangle((13,25,19,29),fill=cream,outline=ink)
def calendar(d):
    box(d,(4,6,28,28),cream);box(d,(4,9,28,13),orange)
    d.line((10,4,10,10),fill=ink,width=3);d.line((22,4,22,10),fill=ink,width=3)
    for x in (9,16,23):
        for y in (17,22):d.rectangle((x,y,x+2,y+2),fill=blue)
def check(d):
    box(d,(6,4,26,29),cream);box(d,(11,2,21,7),orange)
    d.line((10,18,14,22,23,12),fill=green,width=4)
    d.line((10,18,14,22,23,12),fill=ink,width=1)
def robot(d):
    d.ellipse((4,6,28,27),fill=cream,outline=ink,width=3)
    box(d,(7,11,25,22),ink)
    d.rectangle((10,15,13,17),fill=cyan);d.rectangle((19,15,22,17),fill=cyan)
    d.rectangle((3,14,6,21),fill=orange);d.rectangle((26,14,29,21),fill=orange)
    d.line((16,6,16,3),fill=ink,width=2);d.rectangle((14,1,18,4),fill=gold)
for name,paint in [('rover',rover),('radiation',radiation),('clock',clock),('research',research),('question',question),('choice',choice),('calendar',calendar),('check',check),('robot',robot)]:
    icon(name,paint)
print('Built nine original science icons')
