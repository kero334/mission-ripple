// Opening cinematic: A child's dream → becoming an astronaut → launch → journey → first step on Mars.
// Runs as a Phaser scene on top of the (paused) MarsScene and hands over to MarsScene.arrival() at the end.
// Everything is timed from a fixed script, so playback is deterministic and replayable. All art lives in
// public/assets/intro/ (tools/build_intro_art.py) except the playable astronaut and outpost buildings, which
// are reused on purpose so the cinematic matches the game.
import Phaser from 'phaser';
import {introSound} from './sound';
import {sfx} from '../audio/sfx';

export type IntroOptions={reducedMotion:boolean;sound:boolean};
const emit=(name:string,detail:unknown)=>window.dispatchEvent(new CustomEvent(name,{detail}));
export const INTRO_LENGTH=26.4;   // seconds of cinematic before the in-world arrival (≈3.5 s more)

export class IntroScene extends Phaser.Scene{
  private opts:IntroOptions={reducedMotion:false,sound:true};
  private layer!:Phaser.GameObjects.Container;
  private finished=false;
  private started=0;
  constructor(){super('IntroScene')}
  init(data:IntroOptions){this.opts={reducedMotion:!!data?.reducedMotion,sound:data?.sound!==false};this.finished=false}
  create(){
    const cam=this.cameras.main;cam.setZoom(4).centerOn(160,90).setBackgroundColor('#101326');cam.setRoundPixels(true);
    this.layer=this.add.container(0,0);this.started=this.time.now;
    const rm=this.opts.reducedMotion,S=rm?0.62:1; // reduced motion: shorter, no camera moves, no shake
    if(this.opts.sound){introSound.score(S)}
    const at=(t:number,f:()=>void)=>this.time.delayedCall(t*1000*S,()=>{if(!this.finished)f()});
    const cap=(key:string|null)=>emit('ripple-intro-caption',{key});
    if(this.opts.sound)for(const [t,n,o] of [[9.4,'ignition'],[9.6,'rumble',4.6],[11.2,'whoosh'],[14.6,'whoosh'],[19.0,'thrusters'],[19.7,'touchdown'],[20.4,'hatch'],[21.2,'bootStep'],[22.6,'bootStep'],[25.4,'sparkle']] as [number,any,number?][])at(t,()=>sfx.play(n,o,{gap:0}));
    (window as any).__intro={scene:this,playing:true,reducedMotion:rm,startedAt:Date.now(),scale:S,skip:()=>this.skip()};

    // ---------------- Scene 1 · The dream
    at(0,()=>{this.clear();
      this.img('intro-bedroom',0,0);const kid=this.img('intro-child-0',30,99);
      this.loop({delay:900,loop:true,callback:()=>kid.setTexture(kid.texture.key==='intro-child-0'?'intro-child-1':'intro-child-0')});
      for(const [x,y,d] of [[206,34,0],[226,70,300],[252,52,600],[278,80,150],[214,48,450]] as const){const s=this.layer.add(this.add.rectangle(x,y,1,1,0xfff1d0)).last as Phaser.GameObjects.Rectangle;this.tweens.add({targets:s,alpha:.2,duration:700,delay:d,yoyo:true,repeat:-1})}
      const lamp=this.layer.add(this.add.ellipse(189,114,40,30,0xffd68c,.12)).last as Phaser.GameObjects.Ellipse;this.tweens.add({targets:lamp,alpha:.25,duration:1400,yoyo:true,repeat:-1});
      cam.setZoom(4).centerOn(160,90);if(!rm){cam.zoomTo(5.2,4400,'Sine.easeInOut');cam.pan(120,100,4400,'Sine.easeInOut')}
      cap('dream');
    });
    // ---------------- Scene 2 · Growing up (stars swirl, child → astronaut, Mars in the visor)
    at(4.6,()=>{
      const ring=this.add.container(54,111);this.layer.add(ring);
      for(let i=0;i<28;i++){const a=i/28*Math.PI*2,r=10+(i%4)*7;const s=this.add.rectangle(Math.cos(a)*r,Math.sin(a)*r,i%5?1:2,i%5?1:2,i%3?0xffcc68:0xfff1d0);ring.add(s)}
      ring.setScale(.4).setAlpha(0);this.tweens.add({targets:ring,alpha:1,scale:2.2,angle:rm?0:300,duration:1500*S,ease:'Sine.easeInOut'});
      cap('years');
    });
    at(5.8,()=>{cam.flash(rm?200:450,255,241,208);this.clear();cam.stopFollow();cam.setZoom(4).centerOn(160,90);
      this.stars(48,3,0xfff1d0);
      const ring=this.add.container(160,92);this.layer.add(ring);
      for(let i=0;i<36;i++){const a=i/36*Math.PI*2,r=28+(i%5)*6;ring.add(this.add.rectangle(Math.cos(a)*r,Math.sin(a)*r,1,1,i%2?0xffcc68:0x9ff3f5))}
      if(!rm)this.tweens.add({targets:ring,angle:120,duration:1400,ease:'Sine.easeOut'});
      const astro=this.img('astronaut-down-0-pixel',160,112,.5,1).setScale(1.6);astro.setAlpha(0);this.tweens.add({targets:astro,alpha:1,duration:400});
    });
    at(7.0,()=>{this.clear();this.stars(60,7,0xfff1d0);
      const h=this.img('intro-helmet',160,90,.5,.5).setScale(1.12);if(!rm)this.tweens.add({targets:h,scale:1.3,duration:1600,ease:'Sine.easeOut'});
      const glint=this.layer.add(this.add.rectangle(118,64,3,3,0xffffff)).last as Phaser.GameObjects.Rectangle;this.tweens.add({targets:glint,alpha:0,duration:500,yoyo:true,repeat:2});
    });
    // ---------------- Scene 3 · Rocket launch
    let rocket:Phaser.GameObjects.Image,flame:Phaser.GameObjects.Image,sky:Phaser.GameObjects.Rectangle;
    at(8.6,()=>{cam.fadeIn(300,16,19,38);this.clear();cam.setZoom(4).centerOn(160,90);
      this.img('intro-launch-sky',0,0);this.img('intro-tower',148,16);
      cam.setBounds(0,-420,320,600);this.layer.add(this.add.rectangle(160,-210,400,420,0x1c2246));this.layer.add(this.add.rectangle(-20,90,40,200,0x32303e));this.layer.add(this.add.rectangle(340,90,40,200,0x32303e));this.stars(60,17,0xfff1d0,-420,410);rocket=this.img('intro-rocket',166,40);flame=this.img('intro-flame-0',170,124).setVisible(false);
      sky=this.layer.add(this.add.rectangle(160,-60,400,480,0x0d1024,0)).last as Phaser.GameObjects.Rectangle;
      cap('future');
    });
    at(9.4,()=>{cap(null);flame.setVisible(true);let f=0;
      this.loop({delay:80,loop:true,callback:()=>{f=(f+1)%3;flame.setTexture('intro-flame-'+f)}});
      let k=0;this.loop({delay:110,repeat:40,callback:()=>{k++;const dir=k%2?-1:1,s=this.img('intro-smoke-0',178,132,.5,.5);
        this.tweens.add({targets:s,x:178+dir*(30+(k*13)%60),y:126-(k%3)*3,scale:1.8+(k%4)*.3,alpha:0,duration:1800,onUpdate:(tw)=>s.setTexture('intro-smoke-'+Math.min(2,Math.floor(tw.progress*3))),onComplete:()=>s.destroy()})}});
      if(!rm)cam.shake(2600,.004);
    });
    at(11.2,()=>{
      this.tweens.add({targets:[rocket,flame],y:'-=240',duration:3200*S,ease:rm?'Linear':'Cubic.easeIn'});
      if(!rm)cam.startFollow(rocket,false,.07,.07,-14,-10);
      this.tweens.add({targets:sky,fillAlpha:.85,duration:3200*S});
      const high=this.stars(40,13,0xfff1d0,-220,200);for(const s of high)s.setAlpha(0);this.tweens.add({targets:high,alpha:.8,duration:2400*S,delay:600*S});
    });
    // ---------------- Scene 4 · Journey to Mars (parallax; days → weeks → months)
    let far:Phaser.GameObjects.TileSprite,near:Phaser.GameObjects.TileSprite;
    at(14.6,()=>{cam.flash(250,10,12,30);this.clear();cam.removeBounds();cam.setZoom(4).centerOn(160,90);cam.setBackgroundColor('#06070f');
      far=this.add.tileSprite(0,0,320,180,'intro-stars-far').setOrigin(0);near=this.add.tileSprite(0,0,320,180,'intro-stars-near').setOrigin(0);this.layer.add([far,near]);
      const earth=this.img('intro-earth',46,90,.5,.5);const mars=this.img('intro-mars',300,92,.5,.5).setScale(.28);
      const ship=this.img('intro-ship',70,96,.5,.5),glow=this.img('intro-ship-glow',38,96,.5,.5);
      this.tweens.add({targets:glow,alpha:.4,duration:120,yoyo:true,repeat:-1});
      this.tweens.add({targets:earth,scale:.35,alpha:.35,x:30,duration:5000*S,ease:'Sine.easeIn'});
      this.tweens.add({targets:mars,scale:1.05,x:258,duration:5000*S,ease:'Sine.easeOut'});
      this.tweens.add({targets:[ship,glow],x:'+=110',y:'-=4',duration:5000*S,ease:'Sine.easeInOut'});
      cap('days');
    });
    at(16.2,()=>cap('weeks'));at(17.8,()=>cap('months'));
    // ---------------- Scene 5 · First steps on Mars (low angle → reveal the settlement)
    let boots:Phaser.GameObjects.Image,lander:Phaser.GameObjects.Image,astro:Phaser.GameObjects.Image;
    at(19.6,()=>{cap(null);cam.fadeIn(500,166,78,67);this.clear();cam.setBackgroundColor('#a64e43');
      this.img('intro-mars-low',0,0);
      // the real outpost buildings, small on the horizon (revealed when the camera rises)
      for(const [k,x,y,s] of [['research-pixel',64,114,.1],['habitat-pixel',92,113,.13],['greenhouse-pixel',120,114,.11],['command-pixel',146,114,.1]] as const)this.img(k,x,y,.5,1).setScale(s).setTint(0xe6b8a6);
      lander=this.img('intro-lander-0',214,36);
      boots=this.img('intro-boots-0',112,104).setScale(1.4).setAlpha(0);
      cam.setZoom(rm?4:6.4).centerOn(170,140);
    });
    at(20.4,()=>{lander.setTexture('intro-lander-1');const light=this.layer.add(this.add.rectangle(262,94,22,24,0xffe2aa,.0)).last as Phaser.GameObjects.Rectangle;this.tweens.add({targets:light,fillAlpha:.35,duration:500,yoyo:true})});
    at(21.2,()=>{boots.setTexture('intro-boots-1');this.tweens.add({targets:boots,alpha:1,duration:500});if(!rm)cam.pan(150,140,1400,'Sine.easeInOut')});
    at(22.6,()=>{boots.setTexture('intro-boots-0');this.img('intro-footprint',222,166).setScale(1.4);if(!rm)cam.shake(220,.003);
      for(const [x,dx] of [[154,-26],[186,26],[170,0]] as const){const d=this.img('intro-dust-0',x+10,159,.5,.5);this.tweens.add({targets:d,x:x+10+dx,y:153,alpha:0,scale:1.6,duration:1500,onUpdate:(tw)=>d.setTexture('intro-dust-'+Math.min(2,Math.floor(tw.progress*3))),onComplete:()=>d.destroy()})}});
    at(23.4,()=>{
      astro=this.img('astronaut-up-0-pixel',150,150,.5,1).setScale(1.25).setAlpha(0);
      this.tweens.add({targets:boots,alpha:0,duration:700});this.tweens.add({targets:astro,alpha:1,duration:700});
      if(!rm){cam.pan(150,92,2600,'Sine.easeInOut');cam.zoomTo(4,2600,'Sine.easeInOut')}else cam.centerOn(160,90).setZoom(4);
      cap('mars');
    });
    at(24.6,()=>{if(!rm)this.tweens.add({targets:astro,y:'-=8',duration:1400,ease:'Sine.easeInOut'})});
    // ---------------- Scene 6 · into the real world
    at(INTRO_LENGTH,()=>{cap(null);cam.fadeOut(rm?300:650,166,78,67);cam.once('camerafadeoutcomplete',()=>this.finish(false))});
  }
  private img(key:string,x:number,y:number,ox=0,oy=0){const i=this.add.image(x,y,key).setOrigin(ox,oy);this.layer.add(i);return i}
  private stars(n:number,seed:number,color:number,y0=0,h=180){let s=seed;const out:Phaser.GameObjects.Rectangle[]=[];for(let i=0;i<n;i++){s=(s*16807)%2147483647;const x=s%320;s=(s*16807)%2147483647;const y=y0+s%h;const r=this.add.rectangle(x,y,1,1,color,.5+(i%3)*.2);this.layer.add(r);out.push(r)}return out}
  // Scene-local repeating timers; the main script timers are never removed by clear().
  private loops:Phaser.Time.TimerEvent[]=[];
  private loop(cfg:Phaser.Types.Time.TimerEventConfig){const e=this.time.addEvent(cfg);this.loops.push(e);return e}
  private clear(){this.cameras.main.stopFollow();for(const e of this.loops)e.remove(false);this.loops=[];this.tweens.killAll();this.layer.removeAll(true);this.layer.destroy();this.layer=this.add.container(0,0)}
  skip(){if(this.finished)return;introSound.stop(.25);this.cameras.main.fadeOut(220,166,78,67);this.time.delayedCall(240,()=>this.finish(true))}
  private finish(skipped:boolean){
    if(this.finished)return;this.finished=true;
    this.tweens.killAll();this.time.removeAllEvents();
    if(!skipped)setTimeout(()=>introSound.stop(1.6),1800);
    (window as any).__intro={...(window as any).__intro,playing:false,skipped};
    emit('ripple-intro-done',{skipped,reducedMotion:this.opts.reducedMotion});
    this.scene.stop();
  }
}
