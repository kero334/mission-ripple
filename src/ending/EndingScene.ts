// The three campaign endings, as a Phaser scene on top of the (paused) MarsScene. Each ending is a different
// animated scene (sky, light, motion, music), and every one is built from the player's actual base: plant stage,
// which lights are on, the robot, and the problems still open. Pretend training base, not NASA data.
import Phaser from 'phaser';
import {introSound} from '../intro/sound';
import type {EndingKind} from '../game/base-sim';

export type EndingData={kind:EndingKind;plants:number;power:{lamp1:boolean;lamp2:boolean;monitor:boolean;watch:boolean};open:string[];rover:string;reducedMotion:boolean;sound:boolean};
const emit=(name:string,detail:unknown)=>window.dispatchEvent(new CustomEvent(name,{detail}));
export const ENDING_LENGTH={thrive:15,continue:15,setback:15};
// horizon layout of the base in the 320x180 film frame
const SKYLINE:[string,number,number][]=[['power-pixel',40,.3],['research-pixel',92,.3],['habitat-pixel',150,.36],['greenhouse-pixel',210,.32],['comms-pixel',268,.3]];

export class EndingScene extends Phaser.Scene{
  private d!:EndingData;
  private layer!:Phaser.GameObjects.Container;
  private finished=false;
  constructor(){super('EndingScene')}
  init(d:EndingData){this.d=d;this.finished=false}
  create(){
    const d=this.d,rm=d.reducedMotion,S=rm?.7:1,cam=this.cameras.main;
    cam.setZoom(4).centerOn(160,90).setRoundPixels(true).setBackgroundColor('#140f1e');
    this.layer=this.add.container(0,0);
    const at=(t:number,f:()=>void)=>this.time.delayedCall(t*1000*S,()=>{if(!this.finished)f()});
    const cap=(i:number|null)=>emit('ripple-ending-caption',{kind:d.kind,i});
    (window as any).__ending={scene:this,playing:true,kind:d.kind,skip:()=>this.skip()};
    if(d.sound)this.music(d.kind,S);
    cam.fadeIn(rm?200:700,20,15,30);
    if(d.kind==='thrive')this.thrive(at,cap,rm);else if(d.kind==='continue')this.continueScene(at,cap,rm);else this.setback(at,cap,rm);
    at(ENDING_LENGTH[d.kind]-.9,()=>{cap(null);cam.fadeOut(rm?300:800,20,15,30);cam.once('camerafadeoutcomplete',()=>this.finish(false))});
  }
  // ---------------------------------------------------------------- shared pieces
  private img(key:string,x:number,y:number,ox=.5,oy=1){const i=this.add.image(x,y,key).setOrigin(ox,oy);this.layer.add(i);return i}
  private backdrop(sky:'day'|'dusk'|'night'){this.img('ripple-sky-'+sky,0,0,0,0);return this.img('ripple-ground-'+sky,0,100,0,0)}
  private skyline(tint:(id:string)=>number){const out:Record<string,Phaser.GameObjects.Image>={};
    for(const [k,x,s] of SKYLINE){const b=this.img(k,x,128).setScale(s);const t=tint(k.replace('-pixel',''));if(t!==0xffffff)b.setTint(t);out[k.replace('-pixel','')]=b}return out}
  private glow(x:number,y:number,key='ripple-glow',scale=.6,alpha=.8){const g=this.img(key,x,y,.5,.5).setScale(scale).setAlpha(alpha).setBlendMode(Phaser.BlendModes.ADD);return g}
  private pulse(o:Phaser.GameObjects.GameObject,a:number,ms:number){this.tweens.add({targets:o,alpha:a,duration:ms,yoyo:true,repeat:-1,ease:'Sine.easeInOut'})}
  private stars(n:number,seed:number,h=90){let s=seed;const out:Phaser.GameObjects.Rectangle[]=[];for(let i=0;i<n;i++){s=(s*16807)%2147483647;const x=s%320;s=(s*16807)%2147483647;const y=s%h;const r=this.add.rectangle(x,y,1,1,0xfff1d0,.4+(i%3)*.2);this.layer.add(r);out.push(r)}return out}
  private heroes(x:number,y:number,mood:string){const a=this.img('astronaut-right-0-pixel',x,y);const n=this.img('nuri-'+mood+'-pixel',x+22,y-12);return {a,n}}
  // ---------------------------------------------------------------- HAPPY: the base thrives
  private thrive(at:(t:number,f:()=>void)=>void,cap:(i:number|null)=>void,rm:boolean){
    const cam=this.cameras.main,d=this.d;
    at(0,()=>{
      this.backdrop('dusk');const st=this.stars(26,9,70);for(const s of st)this.pulse(s,.15,700+(s.x%5)*120);
      this.skyline(()=>0xffffff);
      for(const [x,y] of [[40,112],[92,112],[150,104],[268,112]] as [number,number][]){const g=this.glow(x,y,'ripple-glow',.45,.7);this.pulse(g,.35,1100+x)}
      const gg=this.glow(210,110,'ripple-glow-green',.9,.9);this.pulse(gg,.5,1300);
      const tray=this.img('ripple-plants-'+Math.max(2,d.plants-2),84,168).setScale(1.4);
      at(1.6,()=>tray.setTexture('ripple-plants-'+Math.max(3,d.plants-1)));at(3.2,()=>{tray.setTexture('ripple-plants-4');for(let k=0;k<8;k++){const sp=this.img('ripple-spark',62+k*6,140,.5,.5);this.tweens.add({targets:sp,y:'-=18',alpha:0,duration:900,delay:k*70})}});
      cam.setZoom(rm?4:5.2).centerOn(100,140);if(!rm){cam.zoomTo(4.6,3600,'Sine.easeInOut')}
      cap(0);
    });
    at(4.2,()=>{
      const r=this.img('ripple-rover',-30,150);this.tweens.add({targets:r,x:350,duration:6000*(rm?.7:1)});
      const {a,n}=this.heroes(176,166,'happy');a.setScale(1.2);n.setScale(1.2);
      if(!rm){cam.pan(160,120,1600,'Sine.easeInOut');cam.zoomTo(4,1600,'Sine.easeInOut')}
      at(1.4+4.2,()=>{a.setTexture('astronaut-interact-pixel');if(!rm){this.tweens.add({targets:a,y:'-=10',duration:260,yoyo:true,repeat:3,ease:'Quad.easeOut'});this.tweens.add({targets:n,y:'-=16',angle:360,duration:900,repeat:1})}});
      cap(1);
    });
    at(8.4,()=>{
      // confetti-like sparkles over the whole base (celebration), then a wide view of the settlement
      for(let k=0;k<26;k++){const sp=this.img('ripple-spark',20+(k*37)%290,30+(k*23)%50,.5,.5).setAlpha(0);this.tweens.add({targets:sp,alpha:1,y:'+=10',duration:700,delay:k*90,yoyo:true})}
      if(!rm){cam.pan(160,96,3600,'Sine.easeInOut');cam.zoomTo(3.6,3600,'Sine.easeInOut')}
      cap(2);
    });
  }
  // ---------------------------------------------------------------- NEUTRAL: the mission continues
  private continueScene(at:(t:number,f:()=>void)=>void,cap:(i:number|null)=>void,rm:boolean){
    const cam=this.cameras.main,d=this.d,open=new Set(d.open),lampsOn=(d.power.lamp1?1:0)+(d.power.lamp2?1:0);
    at(0,()=>{
      this.backdrop('day');
      const bl=this.skyline(id=>id==='greenhouse'&&lampsOn<2?0xb8a8b8:id==='research'&&open.has('notes')?0xc0b0b0:id==='comms'&&open.has('alert')?0xc0b0b0:0xffffff);
      if(lampsOn)this.pulse(this.glow(210,110,'ripple-glow-green',.5*lampsOn,.7),.4,1500);
      // what still needs fixing, from the real history
      const bubbles:[string,number][]=[];if(open.has('notes'))bubbles.push(['ripple-question',92]);if(open.has('alert'))bubbles.push(['ripple-question',268]);if(d.plants<3)bubbles.push(['ripple-wrench',210]);
      for(const [k,x] of bubbles){const b=this.img(k,x,78,.5,.5);this.tweens.add({targets:b,y:74,duration:600,yoyo:true,repeat:-1})}
      void bl;
      if(open.has('rover')){const r=this.img('ripple-rover-stuck',292,150);this.tweens.add({targets:r,angle:2,duration:260,yoyo:true,repeat:-1})}
      cam.setZoom(4).centerOn(160,90);cap(0);
    });
    at(3.6,()=>{
      // the astronaut walks to a machine and repairs it; Nuri watches, then cheers
      const a=this.img('astronaut-right-0-pixel',40,168).setScale(1.2),n=this.img('nuri-thinking-pixel',18,154).setScale(1.2);
      let f=0;const walk=this.time.addEvent({delay:140,loop:true,callback:()=>{f=(f+1)%4;a.setTexture('astronaut-right-'+f+'-pixel')}});
      this.tweens.add({targets:[a],x:150,duration:2600*(rm?.7:1),ease:'Linear',onComplete:()=>{walk.remove();a.setTexture('astronaut-interact-pixel');
        for(let k=0;k<10;k++){const sp=this.img('ripple-spark',176+(k%3)*3,142-(k%4)*3,.5,.5).setAlpha(0);this.tweens.add({targets:sp,alpha:1,x:'+='+((k%2)?8:-8),duration:220,delay:k*160,yoyo:true})}}});
      this.tweens.add({targets:n,x:128,duration:2600*(rm?.7:1)});
      this.img('console-pixel',186,170).setScale(.9);
      if(!rm)cam.pan(130,130,2600,'Sine.easeInOut');
      at(3.6+4.4,()=>{n.setTexture('nuri-happy-pixel');const fixed=this.glow(186,146,'ripple-glow',.5,0);this.tweens.add({targets:fixed,alpha:.9,duration:600})});
      cap(1);
    });
    at(9.4,()=>{
      // evening falls; a hopeful last look at Mars
      const dusk=this.img('ripple-sky-dusk',0,0,0,0).setAlpha(0);this.layer.sendToBack(dusk);this.layer.moveUp(dusk);
      const shade=this.add.rectangle(160,90,320,180,0x2b2050,0);this.layer.add(shade);this.tweens.add({targets:shade,fillAlpha:.25,duration:3000});
      const earth=this.add.rectangle(60,40,2,2,0xa0c8ff,0);this.layer.add(earth);this.tweens.add({targets:earth,fillAlpha:1,duration:2000,delay:800});
      if(!rm){cam.pan(160,90,3200,'Sine.easeInOut');cam.zoomTo(3.6,3200,'Sine.easeInOut')}
      cap(2);
    });
  }
  // ---------------------------------------------------------------- SAD: the base faces a setback (gentle, no danger)
  private setback(at:(t:number,f:()=>void)=>void,cap:(i:number|null)=>void,rm:boolean){
    const cam=this.cameras.main,d=this.d;
    const lights:Phaser.GameObjects.Image[]=[];let bl:Record<string,Phaser.GameObjects.Image>={};
    at(0,()=>{
      this.backdrop('night');this.stars(70,21,95);
      bl=this.skyline(()=>0xd8c8d0);
      for(const [x,y] of [[40,112],[92,112],[210,110],[268,112]] as [number,number][]){const g=this.glow(x,y,'ripple-glow',.5,.8);lights.push(g)}
      lights.push(this.glow(150,104,'ripple-glow',.55,.8));
      cam.setZoom(4).centerOn(160,90);cap(0);
    });
    at(2.2,()=>{
      // machines shut down safely, one by one (a green "safe" check appears for each)
      lights.slice(0,4).forEach((g,i)=>this.time.delayedCall((i*900)*(rm?.6:1),()=>{this.tweens.add({targets:g,alpha:0,duration:500});
        const k=['power','research','greenhouse','comms'][i];bl[k]?.setTint(0x6a5a78);
        const ok=this.img('ripple-safe',g.x,g.y-18,.5,.5).setAlpha(0);this.tweens.add({targets:ok,alpha:1,y:'-=4',duration:400});}));
    });
    at(6.4,()=>{
      // close look: the greenhouse tray is struggling; the astronaut and Nuri watch quietly
      const dim=this.add.rectangle(160,90,320,180,0x0c0a18,0);this.layer.add(dim);this.tweens.add({targets:dim,fillAlpha:.35,duration:900});
      const tray=this.img('ripple-plants-'+Math.min(1,d.plants),196,170).setScale(1.5);
      const {a,n}=this.heroes(130,170,'thinking');a.setScale(1.3);n.setScale(1.3);n.setY(150);
      if(!rm){cam.pan(170,140,1800,'Sine.easeInOut');cam.zoomTo(5,1800,'Sine.easeInOut');this.tweens.add({targets:n,y:146,duration:1400,yoyo:true,repeat:-1,ease:'Sine.easeInOut'})}
      if(d.rover==='stuck'){const r=this.img('ripple-rover-stuck',282,162);r.setTint(0x9a8aa8)}
      void tray;cap(1);
      at(6.4+3,()=>{n.setTexture('nuri-happy-pixel');a.setTexture('astronaut-interact-pixel')});
    });
    at(10.6,()=>{
      // quiet final shot: the habitat light stays on — the crew is fine, and can try again
      if(!rm){cam.pan(160,92,3200,'Sine.easeInOut');cam.zoomTo(3.8,3200,'Sine.easeInOut')}
      const home=lights[4];this.tweens.add({targets:home,alpha:1,scale:.75,duration:1600,yoyo:true,repeat:-1});
      cap(2);
    });
  }
  // ---------------------------------------------------------------- music (procedural Web Audio, same engine as the intro)
  private music(kind:EndingKind,S:number){const s=(t:number)=>t*S,a=introSound;
    if(kind==='thrive'){a.pad([60,64,67,72],s(0),s(4.4),.06);[0.4,1.2,2.0,2.8,3.6].forEach((t,i)=>a.chime([72,76,79,84,88][i],s(t),.04));a.pad([65,69,72,77],s(4.2),s(4.4),.065);
      [4.6,5.0,5.4,5.8].forEach((t,i)=>a.chime([77,81,84,89][i],s(t),.045));a.pad([67,71,74,79,83],s(8.4),s(6),.07);[8.6,9.2,9.8,10.4,11,11.6].forEach((t,i)=>a.chime([84,88,91,96,91,88][i],s(t),.04))}
    else if(kind==='continue'){a.pad([57,60,64,67],s(0),s(3.8),.05);a.noise(s(0),s(3.6),{from:300,to:420,vol:.03});a.pad([53,57,60,65],s(3.6),s(5.8),.05);
      [4.6,5.6,6.6,7.6].forEach((t,i)=>a.thud(s(t),.06+0*i));[8.0,8.3,8.6].forEach((t,i)=>a.chime([79,84,88][i],s(t),.045));a.pad([60,64,67,71,74],s(9.4),s(5.4),.06)}
    else{a.pad([57,60,64],s(0),s(6),.045);a.noise(s(0),s(6),{from:250,to:330,vol:.025});[2.2,3.1,4.0,4.9].forEach((t,i)=>a.chime([76,72,69,64][i],s(t),.03));
      a.pad([53,57,60,64],s(6.2),s(4.6),.045);a.pad([60,64,67,72],s(10.6),s(4.6),.05);[11.4,12.4].forEach((t,i)=>a.chime([79,84][i],s(t),.035))}
  }
  skip(){if(this.finished)return;introSound.stop(.25);this.cameras.main.fadeOut(220,20,15,30);this.time.delayedCall(240,()=>this.finish(true))}
  private finish(skipped:boolean){if(this.finished)return;this.finished=true;this.tweens.killAll();this.time.removeAllEvents();if(!skipped)setTimeout(()=>introSound.stop(1.2),400);
    (window as any).__ending={...(window as any).__ending,playing:false,skipped};emit('ripple-ending-done',{skipped});this.scene.stop()}
}
