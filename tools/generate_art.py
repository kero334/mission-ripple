"""Original layered SVG artwork for Mission Ripple 2D. Run from project root."""
from pathlib import Path
import json, math, random, html

ROOT = Path(__file__).resolve().parents[1] / 'public' / 'assets'
random.seed(24)
for folder in ['terrain','buildings','interiors','characters','equipment','props','effects','ui','animations']:
    (ROOT/folder).mkdir(parents=True, exist_ok=True)
manifest=[]
def save(folder,name,body,w,h,purpose,frames=1,reuse='world'):
    svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}"><defs>
    <linearGradient id="sand" x2="0" y2="1"><stop stop-color="#d98157"/><stop offset=".55" stop-color="#b95d46"/><stop offset="1" stop-color="#833d3e"/></linearGradient>
    <linearGradient id="metal" x2=".15" y2="1"><stop stop-color="#fff2d7"/><stop offset=".42" stop-color="#d6d6ca"/><stop offset="1" stop-color="#7f9cac"/></linearGradient>
    <linearGradient id="navy" x2=".15" y2="1"><stop stop-color="#52738b"/><stop offset=".42" stop-color="#243e60"/><stop offset="1" stop-color="#101b31"/></linearGradient>
    <linearGradient id="glass" x2="0" y2="1"><stop stop-color="#d9f6db" stop-opacity=".85"/><stop offset=".45" stop-color="#70b3a8" stop-opacity=".7"/><stop offset="1" stop-color="#173f56" stop-opacity=".95"/></linearGradient>
    <radialGradient id="glow"><stop stop-color="#ffdfaa" stop-opacity=".85"/><stop offset="1" stop-color="#f59e42" stop-opacity="0"/></radialGradient>
    <pattern id="grit" width="27" height="23" patternUnits="userSpaceOnUse"><circle cx="3" cy="5" r=".9" fill="#f3b17c" opacity=".28"/><circle cx="18" cy="14" r="1" fill="#4d2938" opacity=".25"/><path d="M10 19l3-1" stroke="#f0aa77" opacity=".22"/></pattern>
    <filter id="shadow"><feGaussianBlur stdDeviation="7"/></filter></defs>{body}</svg>'''
    path=ROOT/folder/(name+'.svg');path.write_text(svg,encoding='utf8')
    manifest.append(dict(name=name,purpose=purpose,dimensions=f'{w}×{h}',animationFrames=frames,file=f'assets/{folder}/{name}.svg',reuseScope=reuse,productionStatus='illustrated SVG prototype'))

# Exterior ground: broad color fields, contour lines, strata and scattered mineral flecks.
ground=['<rect width="2600" height="1800" fill="url(#sand)"/><rect width="2600" height="1800" fill="url(#grit)"/>']
for i in range(28):
    x=random.randrange(-200,2500);y=random.randrange(-100,1750);rx=random.randrange(85,330);ry=random.randrange(32,112)
    ground.append(f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{random.choice(["#f4a66d","#6b3c46","#e19360","#a25246"])}" opacity=".12" transform="rotate(-18 {x} {y})"/>')
for i in range(85):
    x=random.randrange(0,2600);y=random.randrange(0,1800);r=random.randrange(2,9)
    ground.append(f'<path d="M{x-r} {y+2}q{r} {-r*2} {r*2} 0" fill="none" stroke="#6e3940" stroke-width="1.4" opacity=".35"/>')
for i in range(11):
    y=70+i*157
    ground.append(f'<path d="M-20 {y} C490 {y-110}, 680 {y+100}, 1160 {y+2} S1950 {y+85}, 2620 {y-35}" fill="none" stroke="{["#f7b47b","#713f45"][i%2]}" stroke-width="{2+i%3}" opacity=".15"/>')
save('terrain','mars-ground',''.join(ground),2600,1800,'Layered outpost terrain',reuse='exterior')

rock='<ellipse cx="70" cy="84" rx="59" ry="18" fill="#3b2736" opacity=".38" filter="url(#shadow)"/><path d="M14 70 L20 44 45 19 83 13 116 32 130 67 96 81 48 84Z" fill="#713e43" stroke="#4e3340" stroke-width="3"/><path d="M20 48 45 19 83 13 61 44 33 66Z" fill="#d08360"/><path d="M61 44 83 13 116 32 97 60 70 69Z" fill="#ab5a4e"/><path d="M14 70 33 66 70 69 97 60 130 67 96 81 48 84Z" fill="#513844"/><path d="M39 31q17-11 30-12M82 27l19 8" fill="none" stroke="#f5b07b" stroke-width="3" opacity=".55"/>'
save('terrain','rock',rock,145,100,'Layered erosion rock',reuse='exterior')

# Roads are rendered by the engine with this repeating panel artwork.
path='<path d="M0 20 180 0 180 66 0 86Z" fill="#7f4a46" opacity=".5"/><path d="M0 11 180 0 180 57 0 78Z" fill="#d79769" stroke="#f3bc86" stroke-width="2"/><path d="M4 17 176 5M4 71 176 51" stroke="#f9d09a" stroke-width="3" opacity=".52"/><path d="M15 43l34-4m26-3 34-4m27-3 34-4" stroke="#ffdfaa" stroke-width="3" stroke-dasharray="15 16" opacity=".43"/><rect width="180" height="80" fill="url(#grit)" opacity=".3"/>'
save('terrain','path-segment',path,180,86,'Inset route segment',reuse='exterior')

types=[
('command','COMMAND HUB','01','#f59e42','<path d="M85 69 Q161 6 247 67" fill="none" stroke="#f6dab0" stroke-width="11"/><path d="M139 36V8l26-8 24 8v28" fill="url(#navy)" stroke="#b8d9cf" stroke-width="4"/><circle cx="165" cy="9" r="8" fill="#f59e42"/>'),
('habitat','HABITAT','02','#eab58c','<path d="M52 87 Q113 8 214 39 Q261 50 293 87" fill="url(#metal)" stroke="#f6dab0" stroke-width="5"/><path d="M79 72q48-45 104-29" fill="none" stroke="#fff2d7" stroke-width="5" opacity=".7"/>'),
('power','POWER STATION','03','#f59e42','<path d="M64 69 91 20 220 20 254 69" fill="url(#navy)" stroke="#f7c28e" stroke-width="5"/><path d="M97 23v41m50-41v41m50-41v41" stroke="#7195aa" stroke-width="3"/><path d="M155 39l-12 20h13l-8 20 24-30h-14l9-10" fill="#f9ba56"/>'),
('greenhouse','GREENHOUSE','04','#7bd3b7','<path d="M45 97 Q59 12 164 13 Q270 12 286 97" fill="url(#glass)" stroke="#d6f4da" stroke-width="6"/><path d="M65 82Q157-23 265 83M105 28l17 69m43-84v84m45-72-17 72" fill="none" stroke="#d4eee3" stroke-width="4"/><path d="M69 91q21-44 39 0m8 2q20-57 40 0m22 0q22-55 42 0m9 0q19-40 38 0" fill="none" stroke="#5bba92" stroke-width="7"/>'),
('water','WATER RECOVERY','05','#6fc9d0','<path d="M87 70V21q0-18 19-18h115q19 0 19 18v49" fill="url(#metal)" stroke="#d6ecdf" stroke-width="5"/><path d="M95 24h138m-138 26h138" stroke="#82aabb" stroke-width="4"/><path d="M154 11q-14 22 0 36 14-14 0-36Z" fill="#5bb6c6"/>'),
('comms','COMMUNICATIONS','06','#f2c18b','<path d="M163 61V-17M118 24q43 27 89 0M133 13q31 17 61 0" fill="none" stroke="#d5d5c8" stroke-width="5"/><circle cx="163" cy="-17" r="7" fill="#f59e42"/><path d="M84 71 108 30h105l30 41" fill="url(#navy)" stroke="#e1cbab" stroke-width="4"/>'),
('shelter','SHELTER & RESEARCH','07','#e2b18b','<path d="M43 89 80 32 250 32 287 89" fill="#8e756e" stroke="#e9c79c" stroke-width="6"/><path d="M80 32h170M106 32l-20 55m73-55-4 55m68-55 20 55" stroke="#decdb6" stroke-width="6"/><circle cx="163" cy="59" r="17" fill="#243e60" stroke="#f59e42" stroke-width="4"/>'),
('oxygen','OXYGEN LAB','08','#86d4c6','<path d="M67 70 86 25h155l26 45" fill="url(#metal)" stroke="#daf7e9" stroke-width="5"/><circle cx="121" cy="47" r="17" fill="#54a6aa" stroke="#e1f3dd" stroke-width="5"/><circle cx="203" cy="47" r="17" fill="#54a6aa" stroke="#e1f3dd" stroke-width="5"/><path d="M160 28v40" stroke="#395e70" stroke-width="7"/>')]
for key,label,num,accent,roof in types:
    safe_label=html.escape(label)
    body=f'''<ellipse cx="165" cy="168" rx="152" ry="32" fill="#35283a" opacity=".44" filter="url(#shadow)"/>
    <path d="M26 83 70 56 267 56 306 84 306 139 268 161 67 161 26 137Z" fill="url(#metal)" stroke="#fbe3c2" stroke-width="5"/>
    <path d="M26 85 67 105v56l-41-24Z" fill="#7792a0"/><path d="M306 84 268 105v56l38-22Z" fill="#668394"/>
    <path d="M67 105 268 105v56H67Z" fill="#a9b8b5"/><path d="M68 112h198" stroke="#f9ebd0" stroke-width="3"/>{roof}
    <path d="M112 111h105v44H112Z" fill="url(#navy)" stroke="#e8cba7" stroke-width="4"/><path d="M124 119h81v29h-81Z" fill="#18394e" stroke="{accent}" stroke-width="2"/>
    <path d="M158 120v28" stroke="#bcd1cc" stroke-width="3"/><circle cx="201" cy="135" r="2" fill="#ffcb7d"/>
    <rect x="63" y="91" width="204" height="15" rx="3" fill="#203c55" stroke="#f3cca0" stroke-width="2"/>
    <text x="165" y="102" text-anchor="middle" fill="#fff0d6" font-family="Arial,sans-serif" font-size="11" font-weight="bold" letter-spacing="1.4">{safe_label}</text>
    <rect x="35" y="95" width="13" height="33" rx="4" fill="#243e60"/><rect x="35" y="95" width="13" height="9" fill="{accent}"/><rect x="282" y="95" width="13" height="33" rx="4" fill="#243e60"/><rect x="282" y="95" width="13" height="9" fill="{accent}"/>
    <path d="M28 136 67 159h201l38-20" fill="none" stroke="#4c6273" stroke-width="6"/><path d="M71 163h192" stroke="#f5b36c" stroke-width="3" opacity=".7"/>
    <circle cx="74" cy="134" r="4" fill="{accent}"/><circle cx="256" cy="134" r="4" fill="{accent}"/>
    <path d="M70 58 34 81m233-23 35 25" fill="none" stroke="#fff0d2" stroke-width="3" opacity=".8"/>
    <rect x="20" y="145" width="42" height="12" rx="3" fill="#bd8a66"/><text x="41" y="154" text-anchor="middle" font-size="8" fill="#fff0d6" font-family="Arial">MR-{num}</text>'''
    save('buildings',key,body,330,185,f'{label.title()} exterior',reuse='outpost')

# Character frames maintain a fixed bottom-center registration.
for direction in ['down','up','left','right']:
    for frame in range(4):
        stride=[0,-3,0,3][frame];arm=[-4,2,4,-2][frame]
        visor= '<path d="M23 26q9-9 25 0v13q-12 9-25 0Z" fill="#244a60" stroke="#9bcac8" stroke-width="2"/><path d="M27 28q8-5 17 0" stroke="#e6f5dd" stroke-width="2" opacity=".7"/>' if direction!='up' else '<path d="M22 26q13-8 27 0v14q-13 4-27 0Z" fill="#d7d7ca" stroke="#7d97a2" stroke-width="2"/>'
        flag='<rect x="46" y="52" width="12" height="7" fill="#d94343"/><rect x="46" y="54" width="12" height="3" fill="#fff"/><rect x="46" y="57" width="12" height="2" fill="#1e202c"/>'
        body=f'''<ellipse cx="35" cy="91" rx="18" ry="6" fill="#23303a" opacity=".33"/>
        <path d="M24 65l-2 19 10 3 4-20m7-2 2 19-10 3-3-20" fill="#e9e5d7" stroke="#657a89" stroke-width="3"/>
        <path d="M24 83l-6 4 2 5h14l1-5m10-4 6 4-2 5H35l-1-5" fill="#243e60" stroke="#b9b7ad" stroke-width="2" transform="translate(0 {stride/2})"/>
        <path d="M19 {48+arm} 12 69l7 4 11-18M52 {48-arm}l8 21-7 4-11-18" fill="#e6e2d6" stroke="#697f8d" stroke-width="3" stroke-linejoin="round"/>
        <path d="M23 43q13-8 25 0l6 25q-18 9-37 0Z" fill="url(#metal)" stroke="#f7eed9" stroke-width="3"/>
        <path d="M28 51h17v13H28Z" fill="#243e60" stroke="#f59e42" stroke-width="2"/><circle cx="36" cy="57" r="3" fill="#39b9af"/>
        <path d="M17 19q2-15 18-16 18 1 20 16l-2 25q-18 10-36 0Z" fill="#e9e6d9" stroke="#f8f2e0" stroke-width="4"/>{visor}
        <path d="M23 19q12-8 25 0" fill="none" stroke="#f5b57d" stroke-width="3"/>{flag}
        <path d="M17 44q18 11 36 0" fill="none" stroke="#728c9a" stroke-width="3"/>'''
        if direction in ['left','right']:
            body=f'<g transform="translate({70 if direction=="left" else 0},0) scale({-1 if direction=="left" else 1},1)">'+body+'</g>'
        save('characters',f'astronaut-{direction}-{frame}',body,70,96,f'Astronaut {direction} walk frame {frame+1}',1,'player animation')
for mood,eye in [('idle','<circle cx="33" cy="40" r="3"/><circle cx="52" cy="40" r="3"/>'),('speak','<circle cx="33" cy="40" r="3"/><circle cx="52" cy="40" r="3"/><ellipse cx="43" cy="51" rx="5" ry="4"/>'),('happy','<path d="M29 41q4-6 8 0m11 0q4-6 8 0M36 52q7 7 14 0" fill="none" stroke="#e4fbec" stroke-width="3"/>'),('warning','<path d="M30 39h6m13 0h6M38 53h10" fill="none" stroke="#ffd6b4" stroke-width="3"/>'),('thinking','<circle cx="33" cy="40" r="3"/><circle cx="52" cy="40" r="3"/><path d="M40 52q5-2 9 0" fill="none" stroke="#e4fbec" stroke-width="2"/>')]:
    body=f'''<ellipse cx="43" cy="74" rx="23" ry="6" fill="#23303a" opacity=".3"/><path d="M17 30 6 40l13 6m49-16 12 10-13 6" fill="#244860" stroke="#7bcac0" stroke-width="3"/><path d="M18 31q3-22 25-23 23 1 25 23l-2 25Q45 70 20 56Z" fill="url(#metal)" stroke="#e8ecdc" stroke-width="4"/><path d="M23 31q20-16 40 0v25q-19 11-40 0Z" fill="url(#navy)" stroke="#39b9af" stroke-width="3"/><g fill="#e4fbec">{eye}</g><path d="M37 9 43 2l6 7" fill="#f59e42"/><circle cx="43" cy="4" r="3" fill="#f5c47f"/><path d="M27 63 24 70m38-7 3 7" stroke="#6fcfc4" stroke-width="3"/>'''
    save('characters',f'nuri-{mood}',body,86,80,f'Nuri {mood} expression',reuse='companion')

# Equipment and field props.
equipment={
'console':('<ellipse cx="62" cy="78" rx="58" ry="9" fill="#162940" opacity=".3"/><path d="M19 58 26 18 99 18 106 58 88 72H37Z" fill="url(#metal)" stroke="#f1d5ac" stroke-width="3"/><path d="M31 22h63l-6 32H37Z" fill="url(#navy)" stroke="#39b9af" stroke-width="2"/><path d="M39 42h39m-39-10h22" stroke="#7ee1cb" stroke-width="3"/><circle cx="81" cy="34" r="5" fill="#f59e42"/><path d="M19 58h87" stroke="#243e60" stroke-width="6"/>','Multiuse status console'),
'solar':('<path d="M15 62 102 55 141 74 52 82Z" fill="#263a57" stroke="#d8ba91" stroke-width="4"/><path d="M29 63 60 60l34 16-32 3zm40-4 28-2 35 16-29 2z" fill="#315b78" stroke="#7bb6b1" stroke-width="2"/><path d="M58 80v14m59-19v15" stroke="#e9d5b6" stroke-width="5"/><path d="M45 66l26 12m11-17 26 13" stroke="#8fdad2" stroke-width="1"/>','Solar array'),
'antenna':('<path d="M58 89 65 29M29 38q33 28 70-2M39 28q26 21 51-2" fill="none" stroke="#d6d7ca" stroke-width="5"/><circle cx="65" cy="25" r="7" fill="#f59e42"/><path d="M48 91h38" stroke="#27415a" stroke-width="9"/>','Communications antenna'),
'crate':('<path d="M12 31 48 15 95 31 59 48Z" fill="#e2ae77" stroke="#f9d6a4" stroke-width="3"/><path d="M12 31 59 48v39L12 67Z" fill="#926451" stroke="#e1aa79" stroke-width="3"/><path d="M59 48 95 31v37L59 87Z" fill="#634b4b" stroke="#d6a36e" stroke-width="3"/><path d="M17 43 54 57m8-2 29-14" stroke="#f0bb83" stroke-width="5"/><text x="37" y="72" font-size="10" fill="#ffe5b8" font-family="Arial">MR</text>','Supply crate'),
'beacon':('<ellipse cx="29" cy="82" rx="20" ry="6" fill="#483445" opacity=".4"/><path d="M18 75V36h22v39Z" fill="url(#navy)" stroke="#cbd7ce" stroke-width="3"/><path d="M17 38 23 20h12l6 18Z" fill="#f59e42" stroke="#ffe1a2" stroke-width="3"/><circle cx="29" cy="27" r="19" fill="url(#glow)"/><path d="M12 77h34" stroke="#f6d8a9" stroke-width="5"/>','Path beacon'),
'plant':('<path d="M12 63h61l-8 27H20Z" fill="#936c59" stroke="#eac18b" stroke-width="3"/><path d="M42 63V20m0 29q-22-11-19-26 19-1 19 26m0-10q19-20 27-23 4 19-27 23" fill="#5baf85" stroke="#a4d4a3" stroke-width="3"/><path d="M42 48q-15-15-25-8 5 15 25 8m0-17q7-19 17-21 6 16-17 21" fill="#409779" stroke="#99d5a5" stroke-width="2"/>','Grow tray plant'),
'tank':('<ellipse cx="46" cy="82" rx="33" ry="7" fill="#21354c" opacity=".25"/><rect x="13" y="13" width="66" height="68" rx="16" fill="url(#metal)" stroke="#e8e0cd" stroke-width="4"/><rect x="21" y="31" width="50" height="39" rx="5" fill="#376077"/><path d="M22 48q13-5 25 0t24 0v21H22Z" fill="#63c4cb" opacity=".8"/><path d="M25 20h42" stroke="#fff0d3" stroke-width="4"/>','Water or oxygen tank')}
for key,(body,purpose) in equipment.items():save('equipment',key,body,145 if key=='solar' else 115,95,purpose,reuse='exterior and interior')
save('props','sign','<path d="M15 21 112 9 126 30 29 43Z" fill="url(#navy)" stroke="#f5c994" stroke-width="3"/><path d="M62 38v56" stroke="#e6d5b5" stroke-width="7"/><path d="M34 51h59" stroke="#f59e42" stroke-width="3"/>',135,98,'Directional post')
save('effects','dust','<path d="M5 30q45-25 110-11m-80 21q56-24 110-2m-90 12q40-10 68-4" fill="none" stroke="#f4bf8a" stroke-width="4" stroke-linecap="round" opacity=".55"/>',155,60,'Windblown dust',reuse='exterior ambient')
save('ui','marker','<circle cx="32" cy="32" r="30" fill="url(#glow)"/><path d="M32 5 44 27 32 52 20 27Z" fill="#f59e42" stroke="#fff0c6" stroke-width="3"/><circle cx="32" cy="27" r="5" fill="#fff0c6"/>',64,64,'Location marker')

# Eight room plates. Detailed furniture and instruments are integrated as room furnishings;
# interactive gear is separately placed at runtime using the equipment sprites.
for key,label,num,accent,roof in types:
    safe_label=html.escape(label)
    floor=f'''<rect width="960" height="650" fill="#1a2a3d"/><path d="M42 80 480 20 918 80 918 532 480 631 42 532Z" fill="#385068" stroke="#9ab7b4" stroke-width="8"/>
    <path d="M58 101 480 45 902 101 902 518 480 607 58 518Z" fill="#506574"/><path d="M58 101 480 45 902 101" fill="none" stroke="#f0d0a7" stroke-width="9"/>
    <path d="M58 518 480 607 902 518" fill="none" stroke="#192c42" stroke-width="11"/>
    <path d="M115 145 480 94 845 145 845 485 480 561 115 485Z" fill="#344a5d" stroke="#7f9a9c" stroke-width="4"/>
    <path d="M115 145 480 94 845 145M115 255 480 204 845 255M115 365 480 314 845 365M115 475 480 424 845 475" fill="none" stroke="#71888a" stroke-width="2" opacity=".55"/>
    <path d="M245 128v380m235-414v467m235-432v380" stroke="#71888a" stroke-width="2" opacity=".55"/>
    <path d="M290 126 480 103 670 126v57l-190-21-190 21Z" fill="#213a53" stroke="{accent}" stroke-width="3"/>
    <text x="480" y="150" text-anchor="middle" fill="#fff0d7" font-size="23" font-family="Arial,sans-serif" font-weight="bold" letter-spacing="3">{safe_label}</text>
    <path d="M371 580 480 606 589 580" fill="none" stroke="#f1b96d" stroke-width="10"/>
    <path d="M75 166 104 160v316l-29-7Zm810 0-29-6v316l29-7Z" fill="#9cb7b5"/>
    <circle cx="94" cy="212" r="10" fill="{accent}"/><circle cx="866" cy="212" r="10" fill="{accent}"/>
    <path d="M132 484 478 557 828 484" fill="none" stroke="#e3b784" stroke-width="7" opacity=".5"/>'''
    if key=='habitat':
        floor+='<path d="M148 242 255 219l98 23v73l-98 22-107-23Z" fill="#bd9e8c" stroke="#e8c8a7" stroke-width="5"/><path d="M160 240 254 225l92 18" stroke="#fff0df" stroke-width="12"/><path d="M610 244 733 218l95 28v75l-95 27-123-30Z" fill="#81949b" stroke="#e4d8ba" stroke-width="5"/><path d="M625 255 737 230" stroke="#d9e9d9" stroke-width="14"/>'
    elif key=='greenhouse':
        for x in [160,370,580]:floor+=f'<path d="M{x} 235l135-20 45 42-133 24Z" fill="#775b50" stroke="#bca47b" stroke-width="5"/><path d="M{x+20} 238q18-60 30 0m5-2q20-55 34 0m9-2q16-50 28 0" fill="none" stroke="#7dd0a0" stroke-width="9"/>'
    elif key=='power':
        for x in [150,405,660]:floor+=f'<path d="M{x} 215h145l24 30v81l-169-25Z" fill="#203e59" stroke="#f5bd6e" stroke-width="5"/><path d="M{x+14} 234h90" stroke="#f7d37e" stroke-width="8"/><circle cx="{x+40}" cy="275" r="11" fill="#39b9af"/>'
    elif key in ['water','oxygen']:
        for x in [205,460,705]:floor+=f'<rect x="{x}" y="208" width="65" height="112" rx="19" fill="#779aab" stroke="#d7e9dd" stroke-width="6"/><path d="M{x+10} 272h45v32h-45Z" fill="{accent}" opacity=".65"/>'
        floor+='<path d="M160 374q260-55 520 9" fill="none" stroke="#76b9c5" stroke-width="12" opacity=".6"/>'
    elif key=='comms':
        floor+='<ellipse cx="480" cy="311" rx="197" ry="77" fill="#18354f" stroke="#b1b9ad" stroke-width="10"/><circle cx="480" cy="311" r="50" fill="#4c8598"/><path d="M290 310h382m-190-76v154" stroke="#79caca" stroke-width="3"/>'
    elif key=='shelter':
        floor+='<path d="M166 232 300 202l85 41v77l-185 32-34-50Z" fill="#8b8d8b" stroke="#ead8bb" stroke-width="7"/><path d="M600 222 740 205l65 30v102l-180 18-25-40Z" fill="#344c61" stroke="#f5b676" stroke-width="7"/>'
    else:
        floor+='<ellipse cx="480" cy="300" rx="155" ry="67" fill="#55718a" stroke="#d9d5c5" stroke-width="8"/><path d="M380 298h200m-100-58v115" stroke="#f5ba6f" stroke-width="5"/>'
    save('interiors',key+'-room',floor,960,650,f'{label.title()} reusable interior plate',reuse='interior scene')

for direction in ['down','up','left','right']:
    slots=[]
    for frame in range(4):
        svg=(ROOT/'characters'/f'astronaut-{direction}-{frame}.svg').read_text(encoding='utf8')
        art=svg.split('</defs>',1)[1].rsplit('</svg>',1)[0]
        slots.append(f'<g transform="translate({frame*70} 0)">{art}</g>')
    save('animations',f'astronaut-{direction}-strip',''.join(slots),280,96,f'Astronaut {direction} animation strip',4,'player animation source')

(ROOT/'asset-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
print(f'Generated {len(manifest)} original SVG assets')
