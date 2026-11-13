import Phaser from 'phaser';
import manifest from '../public/assets/pixel-manifest.json';
import mapData from '../public/assets/terrain/world-map.json';
import {BUILDINGS,SPAWN,STRINGS,WORLD_H,WORLD_W,type Building,type Locale} from './world-data';

type Target={x:number;y:number;radius:number;kind:'door'|'equipment'|'exit'|'field'|'nuri';building?:Building;label:string;ar:string;note?:string;noteAr?:string};
export type GameState={room:string|null;visited:string[];inspected:string[];talkedNuri:boolean;exploredCourtyard:boolean;nearest:string|null;paused:boolean;locale:Locale;position:{x:number;y:number}};
const emit=(name:string,detail:unknown)=>window.dispatchEvent(new CustomEvent(name,{detail}));
const widths:Record<string,number>={habitat:236,power:188,greenhouse:206,water:188,research:184,comms:175,command:184,shelter:185,oxygen:184};
const signY:Record<string,number>={habitat:-80,power:-57,greenhouse:-61,water:-56,research:-58,comms:-56,command:-60,shelter:-55,oxygen:-54};
const EXTERIOR_CAMERA_ZOOM=0.8;
export class MarsScene extends Phaser.Scene{
  private objects:Phaser.GameObjects.GameObject[]=[];
  private player!:Phaser.GameObjects.Image;
  private nuri!:Phaser.GameObjects.Image;
  private marker?:Phaser.GameObjects.Image;
  private missionTarget='habitat';
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
  constructor(){super('MarsScene')}
  preload(){for(const item of manifest)this.load.image(item.name,`/${item.file}`)}
  create(){
    this.cameras.main.setBackgroundColor('#a64e43');this.buildExterior();
    this.player=this.add.image(SPAWN.x,SPAWN.y,'astronaut-down-0-pixel').setOrigin(.5,1).setDepth(SPAWN.y+2);
    this.nuri=this.add.image(SPAWN.x+38,SPAWN.y-17,'nuri-idle-pixel').setOrigin(.5,1).setDepth(SPAWN.y-16);
    this.cameras.main.setZoom(EXTERIOR_CAMERA_ZOOM).setBounds(0,0,WORLD_W,WORLD_H);
    this.cameras.main.startFollow(this.player,false,.09,.09,0,25);
    this.keys=this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,E,ESC,M,L,J,B') as Record<string,Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.on('keydown-E',()=>this.interact());this.input.keyboard!.on('keydown-ESC',()=>emit('ripple-pause',{}));
    this.input.keyboard!.on('keydown-M',()=>emit('ripple-map',{}));this.input.keyboard!.on('keydown-L',()=>emit('ripple-language',{}));
    this.input.keyboard!.on('keydown-J',()=>emit('ripple-journal',{}));this.input.keyboard!.on('keydown-B',()=>emit('ripple-inventory',{}));
    window.addEventListener('ripple-control',(event)=>{const a=(event as CustomEvent).detail as {type:string;value?:Locale|boolean|string};if(a.type==='locale')this.locale=a.value as Locale;if(a.type==='pause')this.paused=Boolean(a.value);if(a.type==='mission-target'){this.missionTarget=String(a.value);this.placeMarker()}this.publish()});
    this.publish();(window as any).__ripple={scene:this,state:()=>this.snapshot(),travel:(id:string)=>{const b=BUILDINGS.find(v=>v.id===id);if(b)this.changeScene(b)}};
  }
  private track<T extends Phaser.GameObjects.GameObject>(o:T):T{this.objects.push(o);return o}
  private sprite(key:string,x:number,y:number,depth=y){return this.track(this.add.image(Math.round(x),Math.round(y),key).setOrigin(.5,1).setDepth(depth))}
  private graphics(depth=0){return this.track(this.add.graphics().setDepth(depth))}
  private buildExterior(){
    this.targets=[];this.blocks=[];
    const ground=this.make.tilemap({data:mapData.ground,tileWidth:32,tileHeight:32});const set=ground.addTilesetImage('mars-tiles','mars-tiles',32,32,0,0);
    this.track(ground.createLayer(0,set!,0,0)!.setDepth(-500));
    const roads=this.make.tilemap({data:mapData.path,tileWidth:32,tileHeight:32});const roadSet=roads.addTilesetImage('mars-tiles','mars-tiles',32,32,0,0);
    this.track(roads.createLayer(0,roadSet!,0,0)!.setDepth(-400));
    for(let i=0;i<185;i++){
      const x=35+((i*173+Math.floor(i*i/7))%1210),y=40+((i*239+Math.floor(i*i/11))%1030);
      const nearBuilding=BUILDINGS.some(b=>Math.abs(x-b.x)<widths[b.id]/2+32&&Math.abs(y-b.y)<115);
      if(nearBuilding||(Math.abs(x-640)<185&&Math.abs(y-530)<150)||mapData.path[Math.floor(y/32)]?.[Math.floor(x/32)]>=12)continue;
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
      this.sprite(b.id+'-pixel',b.x,b.y,b.y);
      const label=b.id==='shelter'?'SHELTER':b.name.toUpperCase();
      const sign=this.track(this.add.text(b.x,b.y+signY[b.id],label,{fontFamily:'monospace',fontSize:b.id==='habitat'?'10px':'8px',fontStyle:'bold',color:'#fff0d3',backgroundColor:'#322936',padding:{x:3,y:1}}).setOrigin(.5).setDepth(b.y+1));sign.setResolution(1);
      this.targets.push({x:b.x,y:b.y+18,radius:42,kind:'door',building:b,label:`Enter ${b.name}`,ar:`ادخل ${b.ar}`});
      const bodyY=b.y-Math.min(70,Math.floor(w*.38)),h=Math.max(30,b.y-bodyY-12);
      this.blocks.push(new Phaser.Geom.Rectangle(b.x-w*.43,bodyY,w*.35,h));this.blocks.push(new Phaser.Geom.Rectangle(b.x+w*.08,bodyY,w*.35,h));this.blocks.push(new Phaser.Geom.Rectangle(b.x-18,b.y-70,36,32));
    }
    const terminal=this.sprite('console-pixel',664,692,692);this.targets.push({x:664,y:690,radius:40,kind:'field',label:'Inspect field terminal',ar:'افحص وحدة الميدان',note:'This map connects every outpost facility. The science missions will use these places.',noteAr:'تربط هذه الخريطة منشآت القاعدة. ستستخدم المهمات العلمية هذه الأماكن.'});
    this.tweens.add({targets:terminal,alpha:.82,duration:1100,yoyo:true,repeat:-1});
    for(const [x,y] of [[409,449],[792,476],[180,831],[1010,735]] as [number,number][]){const dust=this.sprite('dust-pixel',x,y,y+5).setAlpha(.35);this.tweens.add({targets:dust,x:x+38,alpha:.08,duration:5200,yoyo:true,repeat:-1})}
    this.marker=this.sprite('lamp-pixel',640,483,1000).setScale(.65);this.tweens.add({targets:this.marker,alpha:.55,duration:900,yoyo:true,repeat:-1});
    this.placeMarker();
  }
  private placeMarker(){if(!this.marker)return;const b=BUILDINGS.find(v=>v.id===this.missionTarget);this.marker.setPosition(b?.x||664,b?b.y+29:668)}
  private buildInterior(b:Building){
    this.targets=[];this.blocks=[];
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
    const sign=this.track(this.add.text(320,61,b.name.toUpperCase(),{fontFamily:'monospace',fontSize:'12px',fontStyle:'bold',color:'#ffe0a4',backgroundColor:'#26394f',padding:{x:5,y:2}}).setOrigin(.5).setDepth(200));sign.setResolution(1);
    this.targets.push({x:320,y:243,radius:45,kind:'equipment',building:b,label:`Inspect ${b.equipmentName}`,ar:`افحص ${b.equipmentAr}`,note:b.note,noteAr:b.noteAr});
    this.targets.push({x:320,y:318,radius:36,kind:'exit',building:b,label:'Exit to outpost',ar:'اخرج إلى القاعدة'});
    const exit=this.graphics(307);exit.fillStyle(0xe9b66b);exit.fillRect(287,309,66,3);exit.fillStyle(0x253c52);exit.fillRect(300,313,40,9);
    this.blocks.push(new Phaser.Geom.Rectangle(40,85,560,37));this.blocks.push(new Phaser.Geom.Rectangle(260,197,120,23));
  }
  private changeScene(b:Building|null){
    this.cameras.main.fadeOut(155,25,22,36);this.time.delayedCall(170,()=>{
      for(const o of this.objects){this.tweens.killTweensOf(o);o.destroy()}this.objects=[];this.marker=undefined;this.room=b;this.nearest=null;
      if(b){this.exteriorPos={x:this.player.x,y:this.player.y};this.buildInterior(b);this.player.setPosition(320,278);this.nuri.setPosition(353,256);this.visited.add(b.id);this.cameras.main.setZoom(1).setBounds(0,0,640,360);this.cameras.main.setScroll(0,0);this.nuriMood='happy';this.nuri.setTexture('nuri-happy-pixel');this.say(this.visited.size===BUILDINGS.length?STRINGS[this.locale].all:this.locale==='en'?`Inside the ${b.name}. ${b.note}`:`داخل ${b.ar}. ${b.noteAr}`)}
      else{this.buildExterior();this.player.setPosition(this.exteriorPos.x,this.exteriorPos.y+26);this.nuri.setPosition(this.player.x+33,this.player.y-18);this.cameras.main.setZoom(EXTERIOR_CAMERA_ZOOM).setBounds(0,0,WORLD_W,WORLD_H);this.nuriMood='idle';this.nuri.setTexture('nuri-idle-pixel');this.say(this.locale==='en'?'Back outside. Where to next?':'عدنا إلى الخارج. إلى أين الآن؟')}
      this.cameras.main.fadeIn(180,25,22,36);this.publish();
    });
  }
  private interact(){
    if(this.paused||!this.nearest)return;const t=this.nearest;
    this.interactionUntil=this.time.now+350;this.player.setTexture('astronaut-interact-pixel');
    if(t.kind==='door'&&t.building)this.changeScene(t.building);else if(t.kind==='exit')this.changeScene(null);
    else if(t.kind==='nuri'){this.talkedNuri=true;this.nuriMood='happy';this.nuri.setTexture('nuri-happy-pixel');this.say(STRINGS[this.locale].command);this.publish()}
    else{if(t.building)this.inspected.add(t.building.id);this.nuriMood=t.kind==='field'?'thinking':t.building?.id==='shelter'?'warning':'speak';this.nuri.setTexture('nuri-'+this.nuriMood+'-pixel');this.say(this.locale==='en'?t.note||'Take a closer look.':t.noteAr||'انظر عن قرب.');this.publish();emit('ripple-world-interaction',{kind:t.kind,buildingId:t.building?.id||null})}
  }
  private say(text:string){this.announcement=Date.now();emit('ripple-dialogue',{text,mood:this.nuriMood})}
  private snapshot():GameState{return {room:this.room?.id||null,visited:[...this.visited],inspected:[...this.inspected],talkedNuri:this.talkedNuri,exploredCourtyard:this.exploredCourtyard,nearest:this.nearest?.label||null,paused:this.paused,locale:this.locale,position:{x:Math.round(this.player.x),y:Math.round(this.player.y)}}}
  private publish(){if(!this.player)return;const s=this.snapshot(),serial=JSON.stringify({...s,position:undefined});if(serial!==this.lastState){this.lastState=serial;emit('ripple-state',s)}}
  update(_time:number,delta:number){
    if(!this.player||this.paused)return;const step=Math.min(delta,40)/1000,speed=this.keys.SHIFT.isDown?132:92;
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
    let closest:Target|null=null,best=Infinity;for(const t of this.targets){const dist=Phaser.Math.Distance.Between(this.player.x,this.player.y,t.x,t.y);if(dist<t.radius&&dist<best){best=dist;closest=t}}
    if(!closest&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.nuri.x,this.nuri.y)<52)closest={x:this.nuri.x,y:this.nuri.y,radius:52,kind:'nuri',label:'Talk to Nuri',ar:'تحدث إلى نوري'};
    if(closest?.label!==this.nearest?.label){this.nearest=closest;this.publish()}if(this.marker)this.marker.setVisible(true);
  }
  private move(dx:number,dy:number){const bounds=this.room?{minX:47,maxX:593,minY:132,maxY:318}:{minX:20,maxX:WORLD_W-20,minY:30,maxY:WORLD_H-20};const blocked=(x:number,y:number)=>this.blocks.some(r=>r.contains(x,y-7));const nx=Phaser.Math.Clamp(this.player.x+dx,bounds.minX,bounds.maxX);if(!blocked(nx,this.player.y))this.player.x=nx;const ny=Phaser.Math.Clamp(this.player.y+dy,bounds.minY,bounds.maxY);if(!blocked(this.player.x,ny))this.player.y=ny}
}
