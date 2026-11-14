import Phaser from 'phaser';
import {BUILDINGS,SPAWN,WORLD_H,WORLD_W,type Building,type Locale} from './world-data';
import {EXHIBITS,type Exhibit} from './game/exhibits';
import {ROVER_HOME,ROVER_STUCK} from './world-data';
// What the pretend base looks like (sent by the campaign as 'base'); drives the visible consequences.
type BaseView={active:boolean;power:{lamp1:boolean;lamp2:boolean;monitor:boolean;watch:boolean};borrow:string|null;plants:number;alert:string;notes:string;rover:string;monitorQ:boolean;alertQ:boolean;roverTarget:boolean};

type TargetKind='door'|'equipment'|'exit'|'field'|'nuri'|'exhibit'|'rover';
type Target={x:number;y:number;radius:number;kind:TargetKind;building?:Building;exhibit?:Exhibit;label:string;ar:string;note?:string;noteAr?:string};
type MapData={ground:number[][];path:number[][]};
type Guide={kind:'door'|'equipment'|'field'|'exit'|'none';buildingId:string|null;x:number;y:number;mode:'guided'|'independent'};
export type GameState={room:string|null;visited:string[];inspected:string[];talkedNuri:boolean;exploredCourtyard:boolean;nearest:string|null;nearestKind:TargetKind|null;nearestId:string|null;
  guideDistance:'none'|'far'|'near'|'inRange';paused:boolean;locale:Locale;position:{x:number;y:number}};
const emit=(name:string,detail:unknown)=>window.dispatchEvent(new CustomEvent(name,{detail}));
const widths:Record<string,number>={habitat:236,power:188,greenhouse:206,water:188,research:184,comms:175,command:184,shelter:185,oxygen:184};
const signY:Record<string,number>={habitat:-80,power:-57,greenhouse:-61,water:-56,research:-58,comms:-56,command:-60,shelter:-55,oxygen:-54};
// Canvas is 1280x720; zoom 1.6 shows the same 800x450 world view as the old 640x360 canvas at 0.8,
// but text and UI inside the canvas get twice the pixels. Rooms use zoom 2 (same 640x360 view).
const EXTERIOR_CAMERA_ZOOM=1.6,ROOM_ZOOM=2;
const smoothText=(t:Phaser.GameObjects.Text)=>{t.setResolution(2);t.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);return t};
const SIGN_FONT={en:'VT323, monospace',ar:'Cairo, sans-serif'};
export class MarsScene extends Phaser.Scene{
  private objects:Phaser.GameObjects.GameObject[]=[];
  private player!:Phaser.GameObjects.Image;
  private nuri!:Phaser.GameObjects.Image;
  private nuriGlow!:Phaser.GameObjects.Ellipse;
  private beacon!:Phaser.GameObjects.Image;
  private ring!:Phaser.GameObjects.Image;
  private edgeArrow!:Phaser.GameObjects.Image;
  private guide:Guide={kind:'none',buildingId:null,x:0,y:0,mode:'guided'};
  private revealUntil=0;
  private highlightUntil=0;
  private showingMe=false;
  private signs:{text:Phaser.GameObjects.Text;b:Building}[]=[];
  private keys!:Record<string,Phaser.Input.Keyboard.Key>;
  private targets:Target[]=[];
  private blocks:Phaser.Geom.Rectangle[]=[];
  private room:Building|null=null;
  private nearest:Target|null=null;
  private visited=new Set<string>();
  private inspected=new Set<string>();
  private talkedNuri=false;
  private exploredCourtyard=false;
  private locale:Locale='en';
  private paused=false;
  private facing='down';
  private walkFrame=0;
  private walkClock=0;
  private interactionUntil=0;
  private nuriMood='idle';
  private exteriorPos={...SPAWN};
  private announcement=0;
  private lastState='';
  private guideDistance:GameState['guideDistance']='none';
  private baseView:BaseView|null=null;
  private rippleObjs:Phaser.GameObjects.GameObject[]=[];
  private rippleTargets:Target[]=[];
  private bSprites:Record<string,Phaser.GameObjects.Image>={};
  private tour:{x:number;y:number}[]=[];
  constructor(){super('MarsScene')}
  preload(){
    // JSON is loaded at runtime from /public (no JS import of public files).
    for(const key of ['pixel-manifest','experience-manifest','intro-manifest','ripple-manifest'])this.load.on(`filecomplete-json-${key}`,(_k:string,_t:string,list:{name:string;file:string}[])=>{for(const item of list)this.load.image(item.name,`/${item.file}`)});
    this.load.json('pixel-manifest','/assets/pixel-manifest.json');
    this.load.json('experience-manifest','/assets/experience-manifest.json');
    this.load.json('intro-manifest','/assets/intro-manifest.json');
    this.load.json('ripple-manifest','/assets/ripple-manifest.json');
    this.load.json('world-map','/assets/terrain/world-map.json');
  }
  private get mapData(){return this.cache.json.get('world-map') as MapData}
  create(){
    this.cameras.main.setBackgroundColor('#a64e43');this.buildExterior();
    this.nuriGlow=this.add.ellipse(SPAWN.x+38,SPAWN.y-2,16,5,0x59d5db,.32).setDepth(SPAWN.y-17);
    this.player=this.add.image(SPAWN.x,SPAWN.y,'astronaut-down-0-pixel').setOrigin(.5,1).setDepth(SPAWN.y+2);
    this.nuri=this.add.image(SPAWN.x+38,SPAWN.y-17,'nuri-idle-pixel').setOrigin(.5,1).setDepth(SPAWN.y-16);
    this.ring=this.add.image(0,0,'guide-ring').setDepth(-300).setVisible(false);
    this.tweens.add({targets:this.ring,scale:{from:.85,to:1.15},alpha:{from:.95,to:.45},duration:900,yoyo:true,repeat:-1});
    this.beacon=this.add.image(0,0,'guide-beacon').setOrigin(.5,1).setDepth(5000).setVisible(false);
    this.edgeArrow=this.add.image(0,0,'guide-arrow').setDepth(5001).setVisible(false);
    this.cameras.main.setZoom(EXTERIOR_CAMERA_ZOOM).setBounds(0,0,WORLD_W,WORLD_H);
    this.cameras.main.startFollow(this.player,false,.09,.09,0,25);
    this.keys=this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,E,ESC,M,L,J,B,H') as Record<string,Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.on('keydown-E',()=>this.interact());this.input.keyboard!.on('keydown-ESC',()=>emit('ripple-pause',{}));
    this.input.keyboard!.on('keydown-M',()=>emit('ripple-map',{}));this.input.keyboard!.on('keydown-L',()=>emit('ripple-language',{}));
    this.input.keyboard!.on('keydown-J',()=>emit('ripple-journal',{}));this.input.keyboard!.on('keydown-B',()=>emit('ripple-inventory',{}));
    this.input.keyboard!.on('keydown-H',()=>emit('ripple-help',{source:'key'}));
    window.addEventListener('ripple-control',(event)=>{const a=(event as CustomEvent).detail as {type:string;value?:any};
      if(a.type==='locale'){this.locale=a.value as Locale;this.refreshSigns()}
      if(a.type==='pause')this.paused=Boolean(a.value);
      if(a.type==='guide')this.guide={...this.guide,...(a.value as Partial<Guide>)};
      if(a.type==='reveal'){this.revealUntil=this.time.now+12000;this.highlightUntil=this.time.now+(a.value==='device'?6000:0)}
      if(a.type==='show-me')this.showMe();
      if(a.type==='nuri-light')this.nuriGlow.setFillStyle(Number(a.value),.32);
      if(a.type==='base'){this.baseView=a.value as BaseView;this.drawRipple()}
      if(a.type==='ripple-show')for(const p of a.value as {x:number;y:number}[])if(!this.tour.some(q=>q.x===p.x&&q.y===p.y))this.tour.push(p);
      this.publish()});
    window.addEventListener('ripple-dialogue',(event)=>{const mood=(event as CustomEvent<{mood?:string}>).detail?.mood;if(mood&&this.nuri){this.nuriMood=mood;this.announcement=Date.now();this.nuri.setTexture('nuri-'+(mood==='happy'||mood==='warning'||mood==='thinking'||mood==='speak'?mood:'idle')+'-pixel')}});
    this.publish();(window as any).__ripple={scene:this,state:()=>this.snapshot(),travel:(id:string)=>{const b=BUILDINGS.find(v=>v.id===id);if(b)this.changeScene(b)}};
    (window as any).__rippleMapPath=this.mapData.path;document.fonts?.ready.then(()=>this.refreshSigns());emit('ripple-scene-ready',{});
  }
  private track<T extends Phaser.GameObjects.GameObject>(o:T):T{this.objects.push(o);return o}
  private sprite(key:string,x:number,y:number,depth=y){return this.track(this.add.image(Math.round(x),Math.round(y),key).setOrigin(.5,1).setDepth(depth))}
  private graphics(depth=0){return this.track(this.add.graphics().setDepth(depth))}
  private signText(b:Building){return this.locale==='en'?(b.id==='shelter'?'SHELTER':b.name.toUpperCase()):b.ar}
  private refreshSigns(){for(const {text,b} of this.signs){text.setFontFamily(SIGN_FONT[this.locale]);text.setFontStyle(this.locale==='en'?'normal':'bold');text.setFontSize(this.room?(this.locale==='en'?17:12):this.locale==='en'?(b.id==='habitat'?15:13):(b.id==='habitat'?11:9));text.setText(this.room?(this.locale==='en'?b.name.toUpperCase():b.ar):this.signText(b));text.texture.setFilter(Phaser.Textures.FilterMode.LINEAR)}}
  private buildExterior(){
    this.targets=[];this.blocks=[];this.signs=[];
    const map=this.mapData;
    const ground=this.make.tilemap({data:map.ground,tileWidth:32,tileHeight:32});const set=ground.addTilesetImage('mars-tiles','mars-tiles',32,32,0,0);
    this.track(ground.createLayer(0,set!,0,0)!.setDepth(-500));
    const roads=this.make.tilemap({data:map.path,tileWidth:32,tileHeight:32});const roadSet=roads.addTilesetImage('mars-tiles','mars-tiles',32,32,0,0);
    this.track(roads.createLayer(0,roadSet!,0,0)!.setDepth(-400));
    for(let i=0;i<185;i++){
      const x=35+((i*173+Math.floor(i*i/7))%1210),y=40+((i*239+Math.floor(i*i/11))%1030);
      const nearBuilding=BUILDINGS.some(b=>Math.abs(x-b.x)<widths[b.id]/2+32&&Math.abs(y-b.y)<115);
      if(nearBuilding||(Math.abs(x-640)<185&&Math.abs(y-530)<150)||map.path[Math.floor(y/32)]?.[Math.floor(x/32)]>=12)continue;
      const key=i%13===0?'crater-pixel':i%3===0?'bush-pixel':'rock-pixel';this.sprite(key,x,y,y-2);
      if(key==='rock-pixel'&&i%5===0)this.blocks.push(new Phaser.Geom.Rectangle(x-12,y-18,24,14));
    }
    for(const [x,y] of [[523,425],[759,424],[465,567],[779,557],[453,685],[803,680],[189,719],[1064,715],[620,802],[670,802]] as [number,number][]){const halo=this.sprite('lamp-glow-pixel',x,y-9,y-1).setAlpha(.7);this.tweens.add({targets:halo,alpha:.4,duration:1200,yoyo:true,repeat:-1});const lamp=this.sprite('lamp-pixel',x,y,y);this.tweens.add({targets:lamp,alpha:.77,duration:900+(x%4)*130,yoyo:true,repeat:-1})}
    for(const [x,y] of [[875,785],[973,798],[1069,808],[1162,826]] as [number,number][]){this.sprite('solar-pixel',x,y,y);this.blocks.push(new Phaser.Geom.Rectangle(x-35,y-30,70,20))}
    this.sprite('dish-pixel',1167,575,575);this.blocks.push(new Phaser.Geom.Rectangle(1148,542,38,26));
    this.sprite('flag-pixel',552,635,635);
    for(const [x,y] of [[432,542],[1010,711],[761,695],[230,705],[676,782],[932,492]] as [number,number][])this.sprite('crate-pixel',x,y,y);
    for(const [x,y] of [[253,712],[429,762],[894,642],[835,390],[352,304]] as [number,number][])this.sprite('pipe-pixel',x,y,y);
    for(const b of BUILDINGS){
      const w=widths[b.id],shadow=this.graphics(b.y-2);shadow.fillStyle(0x3a2332,.34);shadow.fillEllipse(b.x,b.y-3,w*.88,22);
      this.bSprites[b.id]=this.sprite(b.id+'-pixel',b.x,b.y,b.y);
      const sign=this.track(smoothText(this.add.text(b.x,b.y+signY[b.id],this.signText(b),{fontFamily:SIGN_FONT[this.locale],fontSize:this.locale==='en'?(b.id==='habitat'?'15px':'13px'):(b.id==='habitat'?'11px':'9px'),fontStyle:this.locale==='en'?'normal':'bold',color:'#fff0d3',backgroundColor:'#322936',padding:{x:4,y:1}}).setOrigin(.5).setDepth(b.y+1)));
      this.signs.push({text:sign,b});
      this.targets.push({x:b.x,y:b.y+18,radius:42,kind:'door',building:b,label:`Enter ${b.name}`,ar:`ادخل ${b.ar}`});
      const bodyY=b.y-Math.min(70,Math.floor(w*.38)),h=Math.max(30,b.y-bodyY-12);
      this.blocks.push(new Phaser.Geom.Rectangle(b.x-w*.43,bodyY,w*.35,h));this.blocks.push(new Phaser.Geom.Rectangle(b.x+w*.08,bodyY,w*.35,h));this.blocks.push(new Phaser.Geom.Rectangle(b.x-18,b.y-70,36,32));
    }
    const terminal=this.sprite('console-pixel',664,692,692);this.targets.push({x:664,y:690,radius:40,kind:'field',label:'Inspect field terminal',ar:'افحص شاشة الميدان',note:'This map connects every outpost facility. The science missions will use these places.',noteAr:'الشاشة دي بتوصّل كل منشآت القاعدة. المهمات العلمية هتستخدم الأماكن دي.'});
    this.tweens.add({targets:terminal,alpha:.82,duration:1100,yoyo:true,repeat:-1});
    for(const [x,y] of [[409,449],[792,476],[180,831],[1010,735]] as [number,number][]){const dust=this.sprite('dust-pixel',x,y,y+5).setAlpha(.35);this.tweens.add({targets:dust,x:x+38,alpha:.08,duration:5200,yoyo:true,repeat:-1})}
    this.drawRipple();
  }
  // ---------------------------------------------------------------- the Ripple Effect, visible in the world
  private rTrack<T extends Phaser.GameObjects.GameObject>(o:T):T{this.rippleObjs.push(o);return o}
  private rSprite(key:string,x:number,y:number,depth=y){return this.rTrack(this.add.image(Math.round(x),Math.round(y),key).setOrigin(.5,1).setDepth(depth))}
  private pulse(o:Phaser.GameObjects.Image,a=.45,d=900){this.tweens.add({targets:o,alpha:a,duration:d,yoyo:true,repeat:-1,ease:'Sine.easeInOut'})}
  private bubble(key:string,x:number,y:number){const o=this.rSprite(key,x,y,6000);this.tweens.add({targets:o,y:y-4,duration:600,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});return o}
  private drawRipple(){
    for(const o of this.rippleObjs){this.tweens.killTweensOf(o);o.destroy()}this.rippleObjs=[];this.rippleTargets=[];
    const v=this.baseView;if(!this.player)return;
    if(this.room){this.drawRoomRipple(v);return}
    const gh=this.bSprites.greenhouse;if(!gh||!gh.active)return;
    for(const id of Object.keys(this.bSprites))this.bSprites[id].clearTint();
    if(!v?.active)return;
    const p=v.power,l=(p.lamp1?1:0)+(p.lamp2?1:0);
    // greenhouse: brightness follows its lamps; a tray of plants shows their growth stage
    gh.setTint(l===2?0xffffff:l===1?0x9a8cae:0x6a5c80);
    if(l<2){const dim=this.rTrack(this.add.ellipse(840,430,170,70,0x140c28,l===1?.28:.45).setDepth(476));this.tweens.add({targets:dim,fillAlpha:(l===1?.18:.35),duration:1600,yoyo:true,repeat:-1})}
    for(const [k,x] of [['lamp1',800],['lamp2',882]] as const)if(p[k]){const g=this.rSprite('ripple-glow-green',x,452,474).setScale(1.6).setBlendMode(Phaser.BlendModes.ADD).setAlpha(.8);this.pulse(g,.5,1400)}
    this.rSprite('ripple-plants-'+Math.max(0,Math.min(4,v.plants)),770,516);
    for(const [k,x] of [['lamp1',756],['lamp2',784]] as const){this.rSprite('ripple-lamp-'+(p[k]?'on':'off'),x,488,520);if(p[k]){const g=this.rSprite('ripple-glow',x,494,519).setScale(.5).setBlendMode(Phaser.BlendModes.ADD);this.pulse(g,.4,1100)}}
    // Research Lab spare monitor
    const mon=this.rSprite('ripple-monitor-'+(p.monitor?'on':'off'),956,652);if(p.monitor){const g=this.rSprite('ripple-glow',956,640,651).setScale(.7).setTint(0x80e8ff).setBlendMode(Phaser.BlendModes.ADD);this.pulse(g,.35,800)}
    if(v.monitorQ)this.bubble('ripple-question',956,610);void mon;
    // Sun-watch screen at Communications
    this.rSprite('ripple-watch-'+(p.watch?'on':'off'),1226,904);if(p.watch){const g=this.rSprite('ripple-glow',1226,890,903).setScale(.8).setBlendMode(Phaser.BlendModes.ADD);this.pulse(g,.4,700)}
    if(v.alertQ)this.bubble('ripple-question',1226,860);
    // base robot
    if(v.rover==='home')this.rSprite('ripple-rover',ROVER_HOME.x,ROVER_HOME.y);
    else if(v.rover==='scouting'||v.rover==='driving'){const r=this.rSprite('ripple-rover',1020,330);this.tweens.add({targets:r,x:1120,duration:3200,yoyo:true,repeat:-1,ease:'Sine.easeInOut'})}
    else{const r=this.rSprite('ripple-rover-stuck',ROVER_STUCK.x,ROVER_STUCK.y);this.tweens.add({targets:r,angle:2,duration:240,yoyo:true,repeat:-1});
      const d=this.rSprite('dust-pixel',ROVER_STUCK.x-20,ROVER_STUCK.y-4,ROVER_STUCK.y+1).setAlpha(.5);this.tweens.add({targets:d,x:ROVER_STUCK.x-50,alpha:0,duration:1600,repeat:-1});
      if(v.rover==='rescue'){const h=this.rSprite('ripple-helper',ROVER_STUCK.x-40,ROVER_STUCK.y);this.tweens.add({targets:h,x:ROVER_STUCK.x-30,duration:500,yoyo:true,repeat:-1})}
      else{this.bubble('ripple-wrench',ROVER_STUCK.x,ROVER_STUCK.y-40);this.rippleTargets.push({x:ROVER_STUCK.x,y:ROVER_STUCK.y+6,radius:44,kind:'rover',label:'Help the robot',ar:'ساعد الروبوت'})}}
  }
  private drawRoomRipple(v:BaseView|null){
    if(!v?.active||!this.room)return;const id=this.room.id,p=v.power;
    if(id==='greenhouse'){const l=(p.lamp1?1:0)+(p.lamp2?1:0);
      for(const [x,y] of [[150,173],[500,173],[142,275],[510,275]] as [number,number][])this.rSprite('ripple-plants-'+Math.max(0,Math.min(4,v.plants)),x,y-2,y+1);
      for(const [k,x] of [['lamp1',214],['lamp2',426]] as const){this.rSprite('ripple-lamp-'+(p[k]?'on':'off'),x,104,120).setScale(1.5);if(p[k]){const g=this.rSprite('ripple-glow-green',x,150,121).setScale(2.2).setBlendMode(Phaser.BlendModes.ADD);this.pulse(g,.5,1500)}}
      if(l<2)this.rTrack(this.add.rectangle(320,190,576,250,0x1c1430,l===1?.28:.5).setDepth(4000))}
    if(id==='research'){this.rSprite('ripple-monitor-'+(p.monitor?'on':'off'),560,140,141)}
    if(id==='comms'){this.rSprite('ripple-watch-'+(p.watch?'on':'off'),560,142,143)}
    if(id==='power'){const used=(['lamp1','lamp2','monitor','watch'] as const).filter(k=>p[k]).length+(v.borrow?1:0);for(let i=0;i<3;i++)this.rSprite(i<used?'ripple-block':'ripple-block-empty',290+i*20,104,120).setScale(1.2)}
  }
  /** After a choice, the camera visits each place that changed (once the player is back outside). */
  private runTour(){
    if(!this.tour.length||this.room||this.paused||this.showingMe)return;
    const stops=this.tour.splice(0,4),cam=this.cameras.main;this.showingMe=true;cam.stopFollow();
    const visit=(i:number)=>{if(i>=stops.length){cam.pan(this.player.x,this.player.y-25,600,'Sine.easeInOut',true,(_c:Phaser.Cameras.Scene2D.Camera,q:number)=>{if(q<1)return;cam.startFollow(this.player,false,.09,.09,0,25);this.showingMe=false});return}
      const s=stops[i];cam.pan(s.x,s.y-20,650,'Sine.easeInOut',true,(_c:Phaser.Cameras.Scene2D.Camera,q:number)=>{if(q<1)return;
        for(let k=0;k<6;k++){const sp=this.rSprite('ripple-spark',s.x+Math.cos(k)*26,s.y-30+Math.sin(k*2)*16,6001);this.tweens.add({targets:sp,y:'-=14',alpha:0,duration:900,delay:k*60})}
        const ring=this.rTrack(this.add.image(s.x,s.y-10,'guide-ring').setDepth(5999).setTint(0x9ff3f5));this.tweens.add({targets:ring,scale:2.2,alpha:0,duration:900});
        this.time.delayedCall(1100,()=>visit(i+1))})};
    visit(0);
  }
  private buildInterior(b:Building){
    this.targets=[];this.blocks=[];this.signs=[];
    const palette:Record<string,number>={habitat:0x655b65,power:0x565665,greenhouse:0x547b65,water:0x55708a,research:0x516b84,comms:0x596b7d,command:0x5b6c86,shelter:0x5d5d68,oxygen:0x557b83};
    const wall=this.graphics(-30);wall.fillStyle(0x1d2c3e);wall.fillRect(0,0,640,360);wall.fillStyle(palette[b.id]);wall.fillRect(32,68,576,244);wall.lineStyle(3,0xe9d3ad);wall.strokeRect(31,67,578,246);wall.fillStyle(0x283b51);wall.fillRect(32,38,576,35);
    for(let x=32;x<608;x+=32){wall.fillStyle(0x8497a2);wall.fillRect(x,72,1,240);wall.fillStyle(0xe0c49f);wall.fillRect(x,43,1,28)}
    this.track(this.add.tileSprite(32,121,576,191,b.id+'-floor-pixel').setOrigin(0,0).setDepth(-20));
    const beams=this.graphics(-10);beams.fillStyle(0x26394f);beams.fillRect(31,117,578,5);beams.fillStyle(0xd09c66);beams.fillRect(31,120,578,2);
    for(const [x,y] of [[76,151],[564,151]] as [number,number][]){const l=this.sprite('lamp-pixel',x,y,y);this.tweens.add({targets:l,alpha:.75,duration:1100,yoyo:true,repeat:-1})}
    const furniture:Record<string,[string,number,number][]>= {
      habitat:[['console',164,178],['tank',500,180],['crate',126,262],['planter',526,263]],power:[['tank',137,183],['console',500,188],['pipe',164,276],['crate',501,270]],
      greenhouse:[['planter',150,173],['planter',500,173],['planter',142,275],['planter',510,275]],water:[['tank',150,183],['tank',495,183],['pipe',170,270],['console',496,275]],
      research:[['console',145,180],['console',492,180],['tank',130,265],['crate',500,270]],comms:[['dish',148,182],['console',496,184],['crate',151,270],['console',497,270]],
      command:[['console',148,180],['console',496,180],['tank',140,273],['crate',501,269]],shelter:[['tank',142,182],['console',499,184],['crate',160,273],['tank',488,272]],
      oxygen:[['tank',152,183],['tank',493,183],['pipe',152,271],['console',492,269]]};
    for(const [key,x,y] of furniture[b.id]){this.sprite(key+'-pixel',x,y,y);this.blocks.push(new Phaser.Geom.Rectangle(x-17,y-26,34,20))}
    const priorityGear:Record<string,string>={habitat:'life-support',power:'power-core',greenhouse:'grow-rack',water:'water-core',research:'research-core'};
    const gear=this.sprite((priorityGear[b.id]||b.equipment)+'-pixel',320,219,219);this.tweens.add({targets:gear,alpha:.92,duration:1300,yoyo:true,repeat:-1});
    const sign=this.track(smoothText(this.add.text(320,61,this.locale==='en'?b.name.toUpperCase():b.ar,{fontFamily:SIGN_FONT[this.locale],fontSize:this.locale==='en'?'17px':'12px',fontStyle:this.locale==='en'?'normal':'bold',color:'#ffe0a4',backgroundColor:'#26394f',padding:{x:6,y:2}}).setOrigin(.5).setDepth(200)));
    this.signs.push({text:sign,b:{...b,name:b.name}});
    this.targets.push({x:320,y:243,radius:45,kind:'equipment',building:b,label:`Inspect ${b.equipmentName}`,ar:`افحص ${b.equipmentAr}`,note:b.note,noteAr:b.noteAr});
    for(const ex of EXHIBITS.filter(e=>e.room===b.id)){
      const plate=this.sprite(ex.icon,ex.x,ex.y-44,400).setScale(.75);
      this.tweens.add({targets:plate,y:ex.y-47,duration:1100,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
      this.targets.push({x:ex.x,y:ex.y,radius:34,kind:'exhibit',exhibit:ex,building:b,label:`Read exhibit ${ex.id}`,ar:''});
    }
    this.targets.push({x:320,y:318,radius:36,kind:'exit',building:b,label:'Exit to outpost',ar:'اخرج للقاعدة'});
    const exit=this.graphics(307);exit.fillStyle(0xe9b66b);exit.fillRect(287,309,66,3);exit.fillStyle(0x253c52);exit.fillRect(300,313,40,9);
    this.blocks.push(new Phaser.Geom.Rectangle(40,85,560,37));this.blocks.push(new Phaser.Geom.Rectangle(260,197,120,23));
  }
  private changeScene(b:Building|null){
    this.cameras.main.fadeOut(155,25,22,36);this.time.delayedCall(170,()=>{
      for(const o of this.objects){this.tweens.killTweensOf(o);o.destroy()}this.objects=[];this.room=b;this.nearest=null;
      for(const o of this.rippleObjs){this.tweens.killTweensOf(o);o.destroy()}this.rippleObjs=[];this.rippleTargets=[];this.bSprites={};
      if(b){this.exteriorPos={x:this.player.x,y:this.player.y};this.buildInterior(b);this.drawRipple();this.player.setPosition(320,278);this.nuri.setPosition(353,256);this.visited.add(b.id);this.cameras.main.setZoom(ROOM_ZOOM).setBounds(0,0,640,360);this.cameras.main.centerOn(320,180);this.nuriMood='happy';this.nuri.setTexture('nuri-happy-pixel')}
      else{this.buildExterior();this.player.setPosition(this.exteriorPos.x,this.exteriorPos.y+26);this.nuri.setPosition(this.player.x+33,this.player.y-18);this.cameras.main.setZoom(EXTERIOR_CAMERA_ZOOM).setBounds(0,0,WORLD_W,WORLD_H);this.nuriMood='idle';this.nuri.setTexture('nuri-idle-pixel')}
      this.announcement=Date.now();
      this.cameras.main.fadeIn(180,25,22,36);this.publish();
      emit('ripple-room',{room:b?.id||null,allVisited:this.visited.size===BUILDINGS.length});
    });
  }
  private interact(){
    if(this.paused)return;
    if(!this.nearest){emit('ripple-interact-miss',{room:this.room?.id||null});return}
    const t=this.nearest;
    this.interactionUntil=this.time.now+350;this.player.setTexture('astronaut-interact-pixel');
    if(t.kind==='door'&&t.building){emit('ripple-world-interaction',{kind:'door',buildingId:t.building.id});this.changeScene(t.building)}
    else if(t.kind==='exit'){emit('ripple-world-interaction',{kind:'exit',buildingId:t.building?.id||null});this.changeScene(null)}
    else if(t.kind==='nuri'){this.talkedNuri=true;this.nuriMood='happy';this.nuri.setTexture('nuri-happy-pixel');this.publish();emit('ripple-help',{source:'nuri'})}
    else if(t.kind==='exhibit'&&t.exhibit){this.nuriMood='speak';emit('ripple-world-interaction',{kind:'exhibit',buildingId:t.building?.id||null,exhibitId:t.exhibit.id})}
    else{if(t.building)this.inspected.add(t.building.id);this.nuriMood=t.kind==='field'?'thinking':t.building?.id==='shelter'?'warning':'speak';this.nuri.setTexture('nuri-'+this.nuriMood+'-pixel');this.publish();emit('ripple-world-interaction',{kind:t.kind,buildingId:t.building?.id||null})}
  }
  /** End of the opening cinematic: the camera starts close on the astronaut (matching the last low shot)
   *  and rises into the normal top-down view while Nuri flies in. */
  arrival(reducedMotion=false,onDone?:()=>void){
    const cam=this.cameras.main,p=this.player;cam.stopFollow();this.showingMe=true;
    this.nuri.setPosition(p.x+140,p.y-140).setAlpha(0);this.nuriGlow.setAlpha(0);
    const done=()=>{cam.startFollow(p,false,.09,.09,0,25);this.showingMe=false;onDone?.()};
    if(reducedMotion){cam.setZoom(EXTERIOR_CAMERA_ZOOM).centerOn(p.x,p.y-25);this.nuri.setPosition(p.x+34,p.y-16).setAlpha(1);this.nuriGlow.setAlpha(1);cam.fadeIn(400,166,78,67);this.time.delayedCall(450,done);return}
    cam.setZoom(5.5).centerOn(p.x,p.y-18);cam.fadeIn(700,166,78,67);
    this.tweens.addCounter({from:5.5,to:EXTERIOR_CAMERA_ZOOM,duration:2800,ease:'Sine.easeInOut',onUpdate:tw=>{cam.setZoom(tw.getValue()!);cam.centerOn(p.x,p.y-18-7*tw.progress)},onComplete:done});
    this.tweens.add({targets:this.nuri,x:p.x+34,y:p.y-16,alpha:1,duration:1300,delay:1300,ease:'Back.easeOut'});
    this.tweens.add({targets:this.nuriGlow,alpha:1,duration:600,delay:2000});
  }
  /** Briefly pans the camera to the current objective and back (the "Show me" hint). */
  private showMe(){
    if(this.guide.kind==='none'||this.showingMe)return;
    this.revealUntil=this.time.now+12000;this.highlightUntil=this.time.now+5000;
    if(this.room)return;
    const cam=this.cameras.main;this.showingMe=true;cam.stopFollow();
    cam.pan(this.guide.x,this.guide.y-20,700,'Sine.easeInOut',true,(_c:Phaser.Cameras.Scene2D.Camera,p:number)=>{if(p<1)return;
      this.time.delayedCall(900,()=>cam.pan(this.player.x,this.player.y-25,600,'Sine.easeInOut',true,(_c2:Phaser.Cameras.Scene2D.Camera,p2:number)=>{if(p2<1)return;cam.startFollow(this.player,false,.09,.09,0,25);this.showingMe=false}))});
  }
  private snapshot():GameState{return {room:this.room?.id||null,visited:[...this.visited],inspected:[...this.inspected],talkedNuri:this.talkedNuri,exploredCourtyard:this.exploredCourtyard,nearest:this.nearest?.label||null,
    nearestKind:this.nearest?.kind||null,nearestId:this.nearest?.exhibit?.id||this.nearest?.building?.id||null,guideDistance:this.guideDistance,paused:this.paused,locale:this.locale,position:{x:Math.round(this.player.x),y:Math.round(this.player.y)}}}
  private publish(){if(!this.player)return;const s=this.snapshot(),serial=JSON.stringify({...s,position:undefined});if(serial!==this.lastState){this.lastState=serial;emit('ripple-state',s)}}
  private updateGuide(){
    const g=this.guide,active=g.kind!=='none',reveal=this.time.now<this.revealUntil,guided=g.mode==='guided'||reveal;
    const dist=active?Phaser.Math.Distance.Between(this.player.x,this.player.y,g.x,g.y):Infinity;
    const radius=g.kind==='door'?42:g.kind==='field'?40:g.kind==='equipment'?45:36;
    this.guideDistance=!active?'none':dist<radius?'inRange':dist<radius*2.4?'near':'far';
    const bob=Math.sin(this.time.now/220)*3;
    const beaconY=g.kind==='door'?g.y-(this.room?40:96):g.kind==='field'?g.y-42:g.y-46;
    this.beacon.setVisible(active&&(guided||this.guideDistance!=='far')).setPosition(g.x,Math.round(beaconY+bob));
    const high=this.time.now<this.highlightUntil;
    this.beacon.setScale(high?1.35:1);
    this.ring.setVisible(active&&(guided||this.guideDistance!=='far')).setPosition(g.x,g.kind==='door'?g.y-6:g.y+2).setDepth(g.kind==='door'?g.y-5:g.y-30);
    this.ring.setTint(high&&Math.floor(this.time.now/250)%2?0xffffff:0xffcc68);
    const view=this.cameras.main.worldView,onScreen=view.contains(g.x,beaconY);
    if(active&&!onScreen&&guided&&!this.room&&!this.showingMe){
      const m=26/this.cameras.main.zoom,cx=Phaser.Math.Clamp(g.x,view.x+m,view.right-m),cy=Phaser.Math.Clamp(beaconY,view.y+m,view.bottom-m);
      this.edgeArrow.setVisible(true).setPosition(cx,cy).setRotation(Phaser.Math.Angle.Between(this.player.x,this.player.y-20,g.x,beaconY)).setScale(1/this.cameras.main.zoom);
    }else this.edgeArrow.setVisible(false);
  }
  update(_time:number,delta:number){
    if(!this.player)return;
    this.updateGuide();this.runTour();
    this.nuriGlow.setPosition(this.nuri.x,this.nuri.y+9).setDepth(this.nuri.y-1);
    if(this.paused){this.publish();return}
    const step=Math.min(delta,40)/1000,speed=this.keys.SHIFT.isDown?132:92;
    let dx=Number(this.keys.D.isDown||this.keys.RIGHT.isDown)-Number(this.keys.A.isDown||this.keys.LEFT.isDown),dy=Number(this.keys.S.isDown||this.keys.DOWN.isDown)-Number(this.keys.W.isDown||this.keys.UP.isDown);
    if(dx||dy){const length=Math.hypot(dx,dy);dx/=length;dy/=length;this.facing=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';this.move(dx*speed*step,dy*speed*step);this.walkClock+=delta;if(this.walkClock>130){this.walkFrame=(this.walkFrame+1)%4;this.walkClock=0}if(this.time.now>this.interactionUntil)this.player.setTexture(`astronaut-${this.facing}-${this.walkFrame}-pixel`)}
    else{this.walkFrame=0;if(this.time.now>this.interactionUntil)this.player.setTexture(`astronaut-${this.facing}-0-pixel`)}
    this.player.setPosition(Math.round(this.player.x),Math.round(this.player.y));this.player.setDepth(this.player.y+2);
    if(!this.room&&!this.exploredCourtyard&&Phaser.Math.Distance.Between(this.player.x,this.player.y,SPAWN.x,SPAWN.y)>38){this.exploredCourtyard=true;this.publish()}
    const followX=this.player.x+34,followY=this.player.y-16+Math.sin(this.time.now/260)*2,distance=Math.hypot(followX-this.nuri.x,followY-this.nuri.y);
    if(distance>5){const rate=Math.min(1,step*(distance>100?5:3));this.nuri.x+=(followX-this.nuri.x)*rate;this.nuri.y+=(followY-this.nuri.y)*rate}
    this.nuri.setPosition(Math.round(this.nuri.x),Math.round(this.nuri.y));this.nuri.setDepth(this.nuri.y+2);
    if(this.nuriMood==='speak')this.nuri.setTexture(Math.floor(this.time.now/220)%2?'nuri-speak-pixel':'nuri-idle-pixel');
    if(this.nuriMood==='idle')this.nuri.setTexture(Math.floor(this.time.now/2400)%7===0?'nuri-blink-pixel':'nuri-idle-pixel');
    if(Date.now()-this.announcement>6500&&this.nuriMood!=='idle'){this.nuriMood='idle';this.nuri.setTexture('nuri-idle-pixel')}
    let closest:Target|null=null,best=Infinity;for(const t of [...this.targets,...this.rippleTargets]){const dist=Phaser.Math.Distance.Between(this.player.x,this.player.y,t.x,t.y);if(dist<t.radius&&dist<best){best=dist;closest=t}}
    if(!closest&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.nuri.x,this.nuri.y)<52)closest={x:this.nuri.x,y:this.nuri.y,radius:52,kind:'nuri',label:'Talk to Nuri',ar:'اتكلم مع نوري'};
    if(closest?.label!==this.nearest?.label)this.nearest=closest;
    this.publish();
  }
  private move(dx:number,dy:number){const bounds=this.room?{minX:47,maxX:593,minY:132,maxY:318}:{minX:20,maxX:WORLD_W-20,minY:30,maxY:WORLD_H-20};const blocked=(x:number,y:number)=>this.blocks.some(r=>r.contains(x,y-7));const nx=Phaser.Math.Clamp(this.player.x+dx,bounds.minX,bounds.maxX);if(!blocked(nx,this.player.y))this.player.x=nx;const ny=Phaser.Math.Clamp(this.player.y+dy,bounds.minY,bounds.maxY);if(!blocked(this.player.x,ny))this.player.y=ny}
}
