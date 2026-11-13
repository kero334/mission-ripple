"""Normalize original pixel-art source images and author reusable tile/prop/sprite assets.

Source buildings are isolated transparent originals generated for this project. The
reference screenshot is never sampled or placed in the game. Run from project root.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, random, math, shutil

ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'public'/'assets'
SOURCE=ROOT/'art-source'/'buildings'
SOURCE.mkdir(parents=True,exist_ok=True)
for folder in ['terrain','buildings','interiors','characters','equipment','props','effects','ui','animations','atlases']:
    (ASSETS/folder).mkdir(parents=True,exist_ok=True)

generated=Path(r'C:\Users\ASUS\.codex\generated_images\01a1d564-410a-71d3-9645-9e46d982defb')
files={
 'habitat':('exec-7977847a-c17c-4c3c-b2d1-02870f3d16be.png',(236,184)),
 'power':('exec-f1c17c68-6a13-4c8a-8340-5a5a52ba9724.png',(188,136)),
 'greenhouse':('exec-dcf03951-54d7-4ae1-960f-bd7798345e9b.png',(206,150)),
 'water':('exec-a7045f15-ce8f-4937-98c5-6eb8241b8577.png',(188,136)),
 'research':('exec-a75fdd98-abbf-4b55-b896-b6704fcb1cc4.png',(184,140)),
 'command':('exec-a85cc413-f5e7-47d9-92f8-947dea895297.png',(184,139)),
 'shelter':('exec-61306a62-6268-44ba-8ec9-e5510bf0a8f7.png',(185,139)),
 'oxygen':('exec-9429030d-837e-4342-be00-ed78f7b8d028.png',(184,139)),
 'comms':('exec-69ab9711-9beb-4df6-914f-f1cf732d3466.png',(175,140)),
}
manifest=[]
def item(name,folder,purpose,frames=1,scope='world',status='production sprite'):
    p=ASSETS/folder/(name+'.png');im=Image.open(p)
    manifest.append(dict(name=name,purpose=purpose,dimensions=f'{im.width}×{im.height}',animationFrames=frames,file=f'assets/{folder}/{name}.png',reuseScope=scope,productionStatus=status))
def save(im,folder,name,purpose,frames=1,scope='world',status='production sprite'):
    im.save(ASSETS/folder/(name+'.png'),optimize=True)
    item(name,folder,purpose,frames,scope,status)

for key,(filename,size) in files.items():
    source=SOURCE/(key+'.png')
    if not source.exists():source=generated/filename
    if not source.exists():raise SystemExit(f'Missing generated source: {source}')
    if source!=SOURCE/(key+'.png'):shutil.copy2(source,SOURCE/(key+'.png'))
    im=Image.open(source).convert('RGBA')
    alpha=im.getchannel('A');bbox=alpha.point(lambda a:255 if a>35 else 0).getbbox()
    im=im.crop(bbox)
    # Hard alpha cuts low-opacity glow/matte pixels to keep a crisp transparent silhouette.
    a=im.getchannel('A').point(lambda v:0 if v<70 else 255 if v>190 else (v-70)*255//120)
    im.putalpha(a)
    im.thumbnail(size,Image.Resampling.NEAREST)
    canvas=Image.new('RGBA',size,(0,0,0,0));canvas.alpha_composite(im,((size[0]-im.width)//2,size[1]-im.height))
    save(canvas,'buildings',key+'-pixel',f'Original {key} exterior',scope='exterior')

# Small deliberately limited palette for generated supporting artwork.
INK=(34,27,42,255);DARK=(67,42,54,255);RUST=(142,65,61,255);SOIL=(183,84,65,255)
SAND=(216,121,74,255);LIGHT=(240,158,91,255);CREAM=(242,216,169,255)
METAL=(214,202,187,255);SHADE=(129,128,147,255);NAVY=(37,52,76,255)
BLUE=(45,111,143,255);CYAN=(78,209,220,255);GOLD=(255,188,65,255);GREEN=(91,161,81,255)
def rect(d,xy,fill,outline=None):d.rectangle(xy,fill=fill,outline=outline)
def panel(d,x,y,w,h,c=METAL):
    rect(d,(x,y,x+w,y+h),INK);rect(d,(x+2,y+2,x+w-2,y+h-2),c);d.line((x+2,y+2,x+w-2,y+2),fill=CREAM,width=1);d.line((x+2,y+h-2,x+w-2,y+h-2),fill=DARK,width=1)
def rng(seed):return random.Random(seed)

# A 32x32 terrain tileset. Each tile is drawn individually, then packed into a padded atlas.
terrain=[]
for variant in range(12):
    rr=rng(73+variant);im=Image.new('RGBA',(32,32),SOIL);d=ImageDraw.Draw(im)
    if variant%3==1:rect(d,(0,0,31,31),(175,78,62,255))
    if variant%3==2:rect(d,(0,0,31,31),(192,91,65,255))
    for i in range(20):
        x=rr.randrange(32);y=rr.randrange(32);c=rr.choice([RUST,SAND,LIGHT,(131,61,61,255),(213,113,74,255)])
        rect(d,(x,y,x+rr.choice([0,1,2]),y+rr.choice([0,0,1])),c)
    for i in range(4):
        x=rr.randrange(29);y=rr.randrange(29);d.line((x,y,x+rr.randrange(2,5),y-1),fill=rr.choice([RUST,DARK,LIGHT]),width=1)
    if variant in (3,7,10):
        d.arc((4,11,28,25),180,345,fill=RUST,width=1);d.arc((7,13,25,23),190,345,fill=LIGHT,width=1)
    if variant in (5,9):
        for j in range(3):
            x=8+j*7;d.line((x,24,x+2,17,x+4,22),fill=DARK,width=1);d.line((x+1,19,x-2,16),fill=CREAM,width=1)
    terrain.append(im)
for variant in range(4):
    rr=rng(201+variant);im=Image.new('RGBA',(32,32),(0,0,0,0));d=ImageDraw.Draw(im)
    o=variant%3
    d.polygon([(1+o,5),(8,2+o),(25,3),(31,8),(30,26),(24,30),(4,29),(1,24)],fill=(96,56,60,255))
    d.polygon([(3+o,4),(8,2+o),(25,3),(29,7),(29,23),(24,27),(5,27),(3,23)],fill=(177+variant*5,144+variant*3,119+variant*2,255))
    d.line((5,5,26,5),fill=(239,201,160,255),width=2);d.line((5,27,25,27),fill=(93,65,68,255),width=2)
    for i in range(11):
        x=rr.randrange(5,28);y=rr.randrange(8,25);rect(d,(x,y,x+rr.randrange(1,3),y),rr.choice([CREAM,RUST,SAND]))
    if variant%2:d.line((11,15,14,17,12,20),fill=(112,87,87,255),width=1)
    terrain.append(im)
atlas=Image.new('RGBA',(32*4,32*4),(0,0,0,0))
for n,im in enumerate(terrain):atlas.alpha_composite(im,((n%4)*32,(n//4)*32))
save(atlas,'atlases','mars-tiles','12 soil variants and 4 stone path variants',16,'exterior tilemap')
segments=[((640,595),(640,450)),((640,595),(445,595)),((445,595),(445,560)),
          ((640,595),(780,595)),((780,595),(840,475)),((640,595),(640,740)),
          ((640,740),(455,740)),((455,740),(455,790)),((780,595),(845,680)),
          ((845,680),(1110,680)),((1110,680),(1110,900)),((640,450),(640,105)),
          ((455,740),(140,740)),((140,740),(140,980)),((640,740),(640,985))]
def dist_seg(px,py,a,b):
    ax,ay=a;bx,by=b;vx=bx-ax;vy=by-ay;t=max(0,min(1,((px-ax)*vx+(py-ay)*vy)/(vx*vx+vy*vy or 1)))
    return math.hypot(px-(ax+t*vx),py-(ay+t*vy))
rr=rng(811);ground=[];path=[]
for row in range(35):
    gr=[];pr=[]
    for col in range(40):
        x=col*32+16;y=row*32+16
        zone=int((math.sin(col/4)+math.cos(row/5)+2)*2.2)%3
        gr.append(zone+3*rr.randrange(4))
        pr.append(12+rr.randrange(4) if min(dist_seg(x,y,a,b) for a,b in segments)<18 else -1)
    ground.append(gr);path.append(pr)
(ASSETS/'terrain'/'world-map.json').write_text(json.dumps({'tileSize':32,'width':40,'height':35,'ground':ground,'path':path,'segments':segments},indent=2),encoding='utf8')

# Props that use the same 1 logical pixel grid as the tilemap.
def prop(name,w,h,draw,purpose,folder='props'):
    im=Image.new('RGBA',(w,h),(0,0,0,0));draw(ImageDraw.Draw(im));save(im,folder,name,purpose)
def rock(d):
    d.ellipse((2,24,42,32),fill=(66,38,49,130));d.polygon([(2,23),(9,10),(22,5),(35,11),(43,23),(37,29),(9,29)],fill=INK);d.polygon([(4,22),(10,11),(22,7),(18,20),(9,26)],fill=SAND);d.polygon([(22,7),(35,12),(40,23),(28,20),(18,20)],fill=RUST);d.polygon([(9,26),(18,20),(28,20),(40,23),(36,27)],fill=DARK);d.line((10,13,17,10),fill=LIGHT,width=2)
prop('rock-pixel',46,34,rock,'Rock occluder')
def bush(d):
    for x,y in [(5,21),(11,16),(17,19),(22,13),(29,19),(34,16)]:
        d.polygon([(x,y+9),(x-3,y+1),(x,y-4),(x+5,y+3),(x+4,y+9)],fill=INK);d.polygon([(x,y+7),(x-1,y+1),(x+2,y-2),(x+4,y+5)],fill=(161,130,57,255))
    d.line((3,29,37,29),fill=DARK,width=2)
prop('bush-pixel',40,32,bush,'Martian scrub')
def crater(d):
    d.ellipse((1,6,62,32),fill=(108,55,57,255),outline=DARK,width=2);d.ellipse((9,10,55,27),fill=(145,68,61,255));d.arc((8,7,57,28),185,320,fill=LIGHT,width=2)
prop('crater-pixel',64,36,crater,'Small impact crater')
def lamp(d):
    rect(d,(11,24,21,38),INK);rect(d,(13,25,19,37),SHADE);rect(d,(6,37,26,41),DARK);rect(d,(9,9,23,25),INK);rect(d,(11,11,21,22),GOLD);rect(d,(13,12,19,20),(255,231,137,255));d.line((12,25,22,25),fill=CREAM,width=2)
prop('lamp-pixel',32,42,lamp,'Warm route lamp','equipment')
def crate(d):
    d.polygon([(2,10),(17,3),(32,10),(17,17)],fill=CREAM,outline=INK);d.polygon([(2,10),(17,17),(17,31),(2,24)],fill=(122,77,62,255),outline=INK);d.polygon([(17,17),(32,10),(32,24),(17,31)],fill=(158,100,71,255),outline=INK);d.line((7,15,13,18,13,27),fill=GOLD,width=2);d.line((22,16,27,14),fill=LIGHT,width=2)
prop('crate-pixel',35,34,crate,'Equipment crate','equipment')
def solar(d):
    d.polygon([(3,14),(62,4),(85,16),(25,28)],fill=INK);d.polygon([(8,15),(61,7),(78,17),(25,25)],fill=NAVY)
    for i in range(1,5):d.line((8+i*11,14-i,26+i*10,25-i),fill=CYAN,width=1)
    for i in range(1,4):d.line((11+i*14,12-i*2,73+i*2,18+i),fill=BLUE,width=1)
    d.line((22,28,23,39),fill=METAL,width=3);d.line((71,18,72,39),fill=METAL,width=3);d.line((14,39,81,39),fill=INK,width=2)
prop('solar-pixel',90,42,solar,'Solar panel','equipment')
def dish(d):
    d.ellipse((6,4,66,33),fill=INK);d.ellipse((10,5,62,29),fill=METAL);d.arc((12,6,61,29),195,350,fill=CREAM,width=2);d.line((35,19,53,8),fill=INK,width=3);d.ellipse((49,4,57,12),fill=CYAN,outline=INK);d.line((36,28,36,67),fill=SHADE,width=6);d.line((15,67,57,67),fill=INK,width=4)
prop('dish-pixel',72,70,dish,'Satellite dish','equipment')
def tank(d):
    d.ellipse((4,5,39,16),fill=METAL,outline=INK,width=2);rect(d,(4,11,39,48),INK);rect(d,(7,12,36,45),BLUE);rect(d,(10,18,33,39),CYAN);d.ellipse((5,40,38,51),fill=NAVY,outline=INK,width=2);d.line((13,12,13,44),fill=CREAM,width=2)
prop('tank-pixel',44,52,tank,'Science storage tank','equipment')
def console(d):
    d.polygon([(4,17),(42,13),(49,38),(10,43)],fill=INK);d.polygon([(8,19),(40,16),(44,34),(12,38)],fill=METAL);d.polygon([(12,20),(37,18),(40,30),(15,33)],fill=NAVY);d.line((16,25,33,23),fill=CYAN,width=2);rect(d,(20,39,32,51),SHADE);rect(d,(11,51,44,54),INK)
prop('console-pixel',54,56,console,'Science console','equipment')
def planter(d):
    rect(d,(2,26,42,43),INK);rect(d,(5,27,39,39),(123,78,60,255));d.line((22,27,22,10),fill=GREEN,width=2)
    for x,y in [(8,13),(18,8),(27,15),(34,9)]:d.ellipse((x,y,x+10,y+8),fill=GREEN,outline=INK,width=1);d.line((x+2,y+2,x+7,y+2),fill=(167,207,96,255),width=1)
prop('planter-pixel',45,45,planter,'Grow tray','equipment')
def pipe(d):
    d.line((3,20,16,20,16,8,62,8,62,29,77,29),fill=INK,width=7);d.line((3,20,16,20,16,8,62,8,62,29,77,29),fill=SHADE,width=4);d.line((4,19,16,19,16,7,61,7),fill=CREAM,width=1)
    for x,y in [(12,18),(60,7),(73,27)]:rect(d,(x-2,y-5,x+2,y+5),GOLD)
prop('pipe-pixel',82,37,pipe,'Utility pipe','equipment')
def dust(d):
    for i in range(5):
        x=4+i*17;y=14+(i%2)*6;d.line((x,y,x+13,y-3),fill=(235,164,107,140),width=1)
prop('dust-pixel',90,28,dust,'Ambient dust','effects')
def flag(d):
    rect(d,(6,6,9,67),INK);rect(d,(7,7,8,64),METAL);d.ellipse((5,2,11,8),fill=GOLD,outline=INK)
    d.polygon([(10,9),(39,13),(41,37),(10,33)],fill=INK)
    d.polygon([(11,11),(37,14),(38,34),(11,31)],fill=NAVY)
    d.arc((18,17,31,29),190,345,fill=CYAN,width=2);d.arc((20,18,33,30),18,170,fill=CREAM,width=2)
    d.ellipse((24,20,28,24),fill=GOLD)
    rect(d,(2,66,14,70),INK);rect(d,(4,65,12,67),SHADE)
prop('flag-pixel',44,72,flag,'Mission Ripple outpost flag')
glow=Image.new('RGBA',(48,48),(0,0,0,0));gd=ImageDraw.Draw(glow)
gd.ellipse((3,3,44,44),fill=(255,160,60,23));gd.ellipse((9,9,38,38),fill=(255,184,70,36));gd.ellipse((16,16,31,31),fill=(255,205,100,55))
save(glow,'effects','lamp-glow-pixel','Stepped amber light halo',scope='ambient')

# Small shaded astronaut frames. 30x42 fixed registration, four frames per direction.
def astronaut(direction,frame,interact=False):
    im=Image.new('RGBA',(30,42),(0,0,0,0));d=ImageDraw.Draw(im)
    swing=[0,2,0,-2][frame];step=[0,2,0,-2][frame]
    d.ellipse((5,37,25,41),fill=(47,32,46,120))
    rect(d,(8,27,13,37+step),INK);rect(d,(17,27,22,37-step),INK);rect(d,(9,28,12,35+step),METAL);rect(d,(18,28,21,35-step),METAL)
    rect(d,(7,35+step,14,39+step),NAVY);rect(d,(16,35-step,23,39-step),NAVY)
    rect(d,(4,19+swing,9,30+swing),INK);rect(d,(21,19-swing,26,30-swing),INK)
    rect(d,(5,20+swing,8,28+swing),METAL);rect(d,(22,20-swing,25,28-swing),METAL)
    rect(d,(6,28+swing,9,31+swing),NAVY);rect(d,(21,28-swing,24,31-swing),NAVY)
    rect(d,(8,18,22,32),INK);rect(d,(9,19,21,30),METAL);rect(d,(10,20,20,23),CREAM);rect(d,(11,24,19,29),NAVY);rect(d,(12,25,18,27),CYAN)
    rect(d,(21,23,25,25),(204,55,52,255));rect(d,(21,25,25,27),(242,234,218,255));rect(d,(21,27,25,29),INK)
    d.ellipse((5,1,25,21),fill=INK);d.ellipse((7,2,23,19),fill=METAL);d.arc((7,2,23,19),185,340,fill=CREAM,width=2)
    if direction=='up':rect(d,(9,7,21,16),SHADE);d.line((10,8,20,8),fill=CREAM,width=2)
    else:
        rect(d,(8,7,22,17),NAVY);rect(d,(10,9,20,16),(93,60,52,255));rect(d,(11,9,19,13),(168,101,69,255));d.point((13,13),fill=INK);d.point((18,13),fill=INK)
        if direction in ('left','right'):rect(d,(direction=='left' and 7 or 19,9,direction=='left' and 12 or 23,16),BLUE)
    rect(d,(9,3,19,4),CREAM);rect(d,(12,2,17,3),GOLD)
    if interact:rect(d,(23,14,27,19),GOLD);d.line((25,18,25,27),fill=METAL,width=2)
    if direction=='left':im=im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    return im
for direction in ['down','up','left','right']:
    frames=[]
    for frame in range(4):
        im=astronaut(direction,frame);frames.append(im)
        save(im,'characters',f'astronaut-{direction}-{frame}-pixel',f'Astronaut {direction} frame {frame+1}',scope='player')
    sheet=Image.new('RGBA',(4*34,42),(0,0,0,0))
    for i,im in enumerate(frames):sheet.alpha_composite(im,(i*34,0))
    save(sheet,'animations',f'astronaut-{direction}-pixel-strip',f'Astronaut {direction} four-frame walk sheet',4,'player source')
save(astronaut('down',0,True),'characters','astronaut-interact-pixel','Astronaut equipment interaction',scope='player')

def nuri(mood='idle',frame=0):
    im=Image.new('RGBA',(28,29),(0,0,0,0));d=ImageDraw.Draw(im)
    d.ellipse((6,25,22,28),fill=(46,30,45,100))
    d.ellipse((2,2,26,24),fill=INK);d.ellipse((4,3,24,22),fill=METAL)
    rect(d,(1,10,5,17),GOLD);rect(d,(23,10,27,17),GOLD)
    d.ellipse((6,6,22,20),fill=NAVY);d.arc((5,4,23,22),195,330,fill=CREAM,width=1)
    if mood=='happy':d.arc((8,11,13,17),180,340,fill=CYAN,width=2);d.arc((15,11,20,17),180,340,fill=CYAN,width=2)
    elif mood=='warning':rect(d,(10,10,12,15),GOLD);rect(d,(17,10,19,15),GOLD);d.point((14,17),fill=GOLD)
    elif mood=='thinking':rect(d,(9,12,11,13),CYAN);rect(d,(17,11,19,12),CYAN);d.line((13,17,17,17),fill=CYAN,width=1)
    elif mood=='blink':d.line((9,14,12,14),fill=CYAN,width=2);d.line((17,14,20,14),fill=CYAN,width=2)
    else:
        rect(d,(9,11,11,14),CYAN);rect(d,(17,11,19,14),CYAN)
        d.line((12,17,16,17),fill=CYAN,width=1)
        if mood=='speak':rect(d,(13,17,16,19),CYAN)
    d.line((11,3,15,1,18,3),fill=GOLD,width=2)
    return im
for mood in ['idle','blink','speak','happy','thinking','warning']:
    save(nuri(mood),'characters','nuri-'+mood+'-pixel',f'Nuri {mood} expression',scope='companion')
save(nuri('happy').resize((56,58),Image.Resampling.NEAREST),'ui','nuri-portrait-pixel','Nuri dialogue portrait',scope='HUD')

# Normalize AI-authored full strips using shared slot scale and bottom registration.
character_source=ROOT/'art-source'/'characters';character_source.mkdir(parents=True,exist_ok=True)
sheet_files={'astronaut':'exec-c50d5acd-afa0-4946-907c-21aacda8b425.png','nuri':'exec-31bc2a86-9180-46c5-af79-722437e6fd82.png'}
for key,filename in sheet_files.items():
    target=character_source/(key+'-source-sheet.png')
    if not target.exists():shutil.copy2(generated/filename,target)
def isolate(cell):
    import cv2,numpy as np
    arr=np.array(cell.convert('RGBA'))
    mask=np.uint8(arr[:,:,3]>145)
    count,labels,stats,_=cv2.connectedComponentsWithStats(mask,8)
    if count>1:
        winner=1+int(np.argmax(stats[1:,cv2.CC_STAT_AREA]))
        arr[:,:,3]=np.where(labels==winner,arr[:,:,3],0)
    out=Image.fromarray(arr,'RGBA');bbox=out.getchannel('A').getbbox()
    return out.crop(bbox) if bbox else out
astronaut_sheet=Image.open(character_source/'astronaut-source-sheet.png').convert('RGBA')
for row,direction in enumerate(['down','up','left','right']):
    frames=[]
    for col in range(4):
        w=astronaut_sheet.width/4;h=astronaut_sheet.height/4
        cell=astronaut_sheet.crop((round(col*w),round(row*h+25),round((col+1)*w),round((row+1)*h-9)))
        cut=isolate(cell);cut.thumbnail((34,45),Image.Resampling.NEAREST)
        frame=Image.new('RGBA',(38,48),(0,0,0,0));frame.alpha_composite(cut,((38-cut.width)//2,47-cut.height))
        save(frame,'characters',f'astronaut-{direction}-{col}-pixel',f'Illustrated astronaut {direction} frame {col+1}',scope='player')
        frames.append(frame)
    strip=Image.new('RGBA',(42*4,48),(0,0,0,0))
    for col,frame in enumerate(frames):strip.alpha_composite(frame,(col*42,0))
    save(strip,'animations',f'astronaut-{direction}-pixel-strip',f'Astronaut {direction} four-frame animation',4,'player source')
interact=Image.open(ASSETS/'characters'/'astronaut-down-0-pixel.png').copy();idraw=ImageDraw.Draw(interact)
idraw.line((27,27,31,20,34,17),fill=INK,width=5);idraw.line((27,26,31,20,34,17),fill=METAL,width=3);rect(idraw,(31,14,36,20),GOLD);rect(idraw,(34,12,37,16),CYAN)
save(interact,'characters','astronaut-interact-pixel','Astronaut raised scanner interaction frame',scope='player')
nuri_sheet=Image.open(character_source/'nuri-source-sheet.png').convert('RGBA')
for col,mood in enumerate(['idle','blink','speak','happy','thinking','warning']):
    w=nuri_sheet.width/6
    cell=nuri_sheet.crop((round(col*w),170,round((col+1)*w),560))
    cut=isolate(cell);cut.thumbnail((32,32),Image.Resampling.NEAREST)
    frame=Image.new('RGBA',(34,34),(0,0,0,0));frame.alpha_composite(cut,((34-cut.width)//2,33-cut.height))
    save(frame,'characters','nuri-'+mood+'-pixel',f'Illustrated Nuri {mood}',scope='companion')
save(Image.open(ASSETS/'characters'/'nuri-happy-pixel.png').resize((68,68),Image.Resampling.NEAREST),'ui','nuri-portrait-pixel','Nuri portrait',scope='HUD')

solar_source=ROOT/'art-source'/'solar-array-source.png'
if not solar_source.exists():shutil.copy2(generated/'exec-7039442b-1a94-4705-bcf8-9b92e2ab7382.png',solar_source)
solar_image=Image.open(solar_source).convert('RGBA');bbox=solar_image.getchannel('A').point(lambda a:255 if a>60 else 0).getbbox();solar_image=isolate(solar_image.crop(bbox));solar_image.thumbnail((136,94),Image.Resampling.NEAREST)
solar_canvas=Image.new('RGBA',(140,96),(0,0,0,0));solar_canvas.alpha_composite(solar_image,((140-solar_image.width)//2,95-solar_image.height))
save(solar_canvas,'equipment','solar-pixel','Detailed solar array',scope='exterior')

interior_sources=ROOT/'art-source'/'equipment';interior_sources.mkdir(parents=True,exist_ok=True)
machine_files={
 'life-support':('exec-f9ac90bd-deba-444d-ac02-a1bb9009c2d4.png',(180,123)),
 'power-core':('exec-ffd15bd3-461d-4c77-aeb6-c3d9ddc7ef27.png',(176,120)),
 'grow-rack':('exec-dad1bec4-ee19-4754-a38c-bf6aca170188.png',(180,124)),
 'water-core':('exec-ad4e1870-aa43-4b11-88ae-62f71e10ccd5.png',(180,121)),
 'research-core':('exec-2004ab2d-90d4-40f8-9cde-df64d8101dd5.png',(180,121)),
}
for key,(filename,size) in machine_files.items():
    source=interior_sources/(key+'-source.png')
    if not source.exists():shutil.copy2(generated/filename,source)
    im=Image.open(source).convert('RGBA');bbox=im.getchannel('A').point(lambda a:255 if a>60 else 0).getbbox();im=isolate(im.crop(bbox))
    im.thumbnail(size,Image.Resampling.NEAREST);canvas=Image.new('RGBA',size,(0,0,0,0));canvas.alpha_composite(im,((size[0]-im.width)//2,size[1]-im.height))
    save(canvas,'equipment',key+'-pixel',f'{key} interior machinery',scope='priority interiors')

# Pixel UI item and menu icons.
def icon(name,draw,purpose):
    im=Image.new('RGBA',(24,24),(0,0,0,0));d=ImageDraw.Draw(im);draw(d);save(im,'ui','ui-'+name+'-pixel',purpose,scope='HUD')
icon('tablet',lambda d:(panel(d,3,2,17,20,NAVY),rect(d,(7,6,17,13),CYAN),d.line((7,16,16,16),fill=CREAM,width=1)),'Research tablet')
icon('wrench',lambda d:(d.line((5,19,18,5),fill=INK,width=6),d.line((5,19,18,5),fill=METAL,width=3),d.arc((14,1,23,10),40,250,fill=CREAM,width=3)),'Repair tool')
icon('scanner',lambda d:(rect(d,(4,2,18,20),INK),rect(d,(6,4,16,13),BLUE),rect(d,(8,6,14,8),CYAN),rect(d,(7,16,15,18),GOLD)),'Scanner')
icon('plant',lambda d:(rect(d,(7,16,18,22),DARK),d.line((12,17,12,5),fill=GREEN,width=2),d.ellipse((6,6,13,12),fill=GREEN),d.ellipse((12,4,20,11),fill=(142,204,90,255))),'Plant sample')
icon('tool',lambda d:(d.line((5,19,18,5),fill=INK,width=6),d.line((5,19,18,5),fill=METAL,width=3),d.arc((14,1,23,10),40,250,fill=CREAM,width=3)),'Repair tool')
icon('sample',lambda d:(rect(d,(7,16,18,22),DARK),d.line((12,17,12,5),fill=GREEN,width=2),d.ellipse((6,6,13,12),fill=GREEN),d.ellipse((12,4,20,11),fill=(142,204,90,255))),'Plant sample')
icon('map',lambda d:(d.polygon([(2,5),(9,3),(16,6),(22,3),(22,20),(16,21),(9,18),(2,21)],fill=CREAM,outline=INK),d.line((9,3,9,18,16,21,16,6),fill=RUST,width=1)),'Map')
icon('journal',lambda d:(rect(d,(3,2,20,21),INK),rect(d,(5,4,19,20),CREAM),d.line((12,4,12,20),fill=RUST,width=2),d.line((7,8,10,8),fill=DARK,width=1)),'Journal')
icon('bag',lambda d:(rect(d,(3,8,21,22),DARK),rect(d,(5,10,19,20),SAND),d.arc((7,2,17,13),180,360,fill=CREAM,width=2),rect(d,(10,12,14,15),GOLD)),'Inventory')
icon('settings',lambda d:(d.ellipse((4,4,20,20),fill=METAL,outline=INK,width=2),d.ellipse((9,9,15,15),fill=NAVY),d.line((12,1,12,4),fill=METAL,width=3),d.line((12,20,12,23),fill=METAL,width=3)),'Settings')
icon('power',lambda d:d.polygon([(13,1),(5,14),(12,14),(9,23),(21,9),(14,9)],fill=GOLD,outline=INK),'Power readout')
icon('water',lambda d:d.polygon([(12,1),(4,13),(5,18),(9,22),(16,22),(20,17),(18,12)],fill=CYAN,outline=INK),'Water readout')
icon('oxygen',lambda d:(d.ellipse((3,4,21,21),outline=CYAN,width=2),d.text((4,8),'O2',fill=CREAM)),'Oxygen readout')
icon('food',lambda d:(rect(d,(4,16,20,21),DARK),d.line((12,17,12,5),fill=GREEN,width=2),d.ellipse((5,8,13,13),fill=GREEN),d.ellipse((12,5,21,11),fill=(142,204,90,255))),'Crop readout')

# Interior floor/wall tiles, separate from individually placed furniture.
for key,color in [('habitat',(78,91,104,255)),('power',(74,80,95,255)),('greenhouse',(71,94,80,255)),('water',(65,89,103,255)),('research',(67,85,104,255)),('command',(72,87,109,255)),('shelter',(79,77,88,255)),('oxygen',(68,91,101,255)),('comms',(74,85,99,255))]:
    rr=rng(sum(map(ord,key)));im=Image.new('RGBA',(32,32),color);d=ImageDraw.Draw(im)
    rect(d,(0,0,31,31),color);d.line((0,0,31,0),fill=CREAM,width=1);d.line((0,31,31,31),fill=NAVY,width=2)
    for i in range(13):
        x=rr.randrange(3,30);y=rr.randrange(3,29);rect(d,(x,y,x+1,y+1),rr.choice([SHADE,BLUE,INK]))
    rect(d,(2,2,30,30),None,outline=(110,121,132,255));rect(d,(13,13,18,18),NAVY);rect(d,(14,14,17,17),CYAN)
    save(im,'interiors',key+'-floor-pixel',f'{key} modular floor tile',scope='interiors')

for name in ['rover','radiation','clock','research','question','choice','calendar','check','robot']:
    if (ASSETS/'ui'/('science-'+name+'.png')).exists():
        item('science-'+name,'ui',f'Original pixel science-card {name} icon',scope='science UI')
manifest=list({m['name']:m for m in manifest}.values())
(ASSETS/'pixel-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
print(f'Built {len(manifest)} pixel assets')
