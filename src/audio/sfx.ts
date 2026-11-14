// Procedural sound effects (Web Audio, no audio files), sharing the AudioContext with the intro score.
// Every sound is built by a small "recipe" (a function of AudioContext, destination, start time), so the same
// recipe can be rendered offline to measure its loudness (tools/sfx-qa.mjs). Levels are balanced per category and
// pass through one compressor + limiter, so nothing is ever much louder than anything else.
// The context is only created inside a user gesture; the Sound setting turns everything off.
import {introSound} from '../intro/sound';

export type Recipe=(c:BaseAudioContext,out:AudioNode,t:number,o?:any)=>void;
type Cat='ui'|'foot'|'world'|'reward'|'cine'|'amb';
const CAT_GAIN:Record<Cat,number>={ui:.5,foot:.32,world:.6,reward:.6,cine:.75,amb:.22};
const NOTE=(n:number)=>440*Math.pow(2,(n-69)/12);
// ---------------------------------------------------------------- building blocks
function env(c:BaseAudioContext,t:number,a:number,peak:number,d:number,out:AudioNode){const g=c.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+a+d);g.connect(out);return g}
function tone(c:BaseAudioContext,out:AudioNode,t:number,f:number,{type='sine' as OscillatorType,a=.005,d=.2,vol=.3,to=0,det=0}={}){
  const o=c.createOscillator();o.type=type;o.frequency.setValueAtTime(f,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+a+d);o.detune.value=det;
  o.connect(env(c,t,a,vol,d,out));o.start(t);o.stop(t+a+d+.05)}
let noiseBuf:AudioBuffer|null=null,noiseCtx:BaseAudioContext|null=null;
function noiseBuffer(c:BaseAudioContext){if(noiseBuf&&noiseCtx===c)return noiseBuf;const len=c.sampleRate*2,b=c.createBuffer(1,len,c.sampleRate),d=b.getChannelData(0);let s=12345;for(let i=0;i<len;i++){s=(s*16807)%2147483647;d[i]=s/1073741823.5-1}noiseBuf=b;noiseCtx=c;return b}
function noise(c:BaseAudioContext,out:AudioNode,t:number,{type='bandpass' as BiquadFilterType,f=1000,to=0,q=1,a=.005,d=.15,vol=.3,off=0}={}){
  const s=c.createBufferSource();s.buffer=noiseBuffer(c);const fl=c.createBiquadFilter();fl.type=type;fl.frequency.setValueAtTime(f,t);if(to)fl.frequency.exponentialRampToValueAtTime(to,t+a+d);fl.Q.value=q;
  s.connect(fl).connect(env(c,t,a,vol,d,out));s.start(t,off%1.5);s.stop(t+a+d+.05)}
// ---------------------------------------------------------------- recipes
export const RECIPES:Record<string,{cat:Cat;r:Recipe}>={
  // movement
  stepDust:{cat:'foot',r:(c,o,t,v=0)=>{noise(c,o,t,{type:'lowpass',f:700+v*120,d:.07,vol:.55,off:v*.37});noise(c,o,t+.01,{type:'bandpass',f:2400,q:2,d:.04,vol:.12,off:v*.5})}},
  stepMetal:{cat:'foot',r:(c,o,t,v=0)=>{noise(c,o,t,{type:'bandpass',f:1500+v*150,q:3,d:.05,vol:.4,off:v*.3});tone(c,o,t,520+v*30,{type:'triangle',d:.06,vol:.08})}},
  // doors and machines
  doorOpen:{cat:'world',r:(c,o,t)=>{tone(c,o,t,90,{type:'sine',d:.12,vol:.45,to:55});noise(c,o,t+.04,{type:'highpass',f:3000,to:900,d:.45,vol:.22});tone(c,o,t+.42,180,{type:'triangle',d:.08,vol:.18})}},
  doorClose:{cat:'world',r:(c,o,t)=>{noise(c,o,t,{type:'highpass',f:900,to:3200,d:.32,vol:.18});tone(c,o,t+.3,70,{type:'sine',d:.16,vol:.5,to:45})}},
  equipment:{cat:'world',r:(c,o,t)=>{tone(c,o,t,880,{type:'square',d:.06,vol:.07});tone(c,o,t+.08,1320,{type:'square',d:.08,vol:.07});noise(c,o,t,{type:'bandpass',f:4000,q:4,d:.12,vol:.06})}},
  exhibit:{cat:'world',r:(c,o,t)=>{[76,83,88].forEach((n,i)=>tone(c,o,t+i*.07,NOTE(n),{d:.35,vol:.16}))}},
  miss:{cat:'ui',r:(c,o,t)=>tone(c,o,t,220,{type:'triangle',d:.12,vol:.18,to:180})},
  // interface
  click:{cat:'ui',r:(c,o,t)=>{tone(c,o,t,1400,{type:'triangle',d:.03,vol:.18});noise(c,o,t,{type:'highpass',f:5000,d:.015,vol:.08})}},
  open:{cat:'ui',r:(c,o,t)=>{noise(c,o,t,{type:'bandpass',f:600,to:2600,q:1.2,a:.02,d:.16,vol:.25});tone(c,o,t+.1,NOTE(84),{d:.18,vol:.06})}},
  close:{cat:'ui',r:(c,o,t)=>noise(c,o,t,{type:'bandpass',f:2400,to:700,q:1.2,a:.01,d:.14,vol:.22})},
  page:{cat:'ui',r:(c,o,t)=>noise(c,o,t,{type:'bandpass',f:1800,to:3600,q:.8,a:.01,d:.09,vol:.2})},
  pop:{cat:'ui',r:(c,o,t)=>tone(c,o,t,660,{type:'sine',d:.07,vol:.14,to:990})},
  // learning
  right:{cat:'reward',r:(c,o,t)=>{[72,76,79,84].forEach((n,i)=>tone(c,o,t+i*.075,NOTE(n),{type:'triangle',d:.28,vol:.16}))}},
  tryAgain:{cat:'reward',r:(c,o,t)=>{tone(c,o,t,NOTE(67),{type:'triangle',d:.16,vol:.13});tone(c,o,t+.14,NOTE(64),{type:'triangle',d:.22,vol:.12})}},
  xp:{cat:'reward',r:(c,o,t)=>{[88,91,96].forEach((n,i)=>tone(c,o,t+i*.05,NOTE(n),{d:.22,vol:.09}));noise(c,o,t,{type:'highpass',f:7000,d:.2,vol:.05})}},
  badge:{cat:'reward',r:(c,o,t)=>{[60,64,67,72].forEach((n,i)=>tone(c,o,t+i*.09,NOTE(n),{type:'triangle',d:.3,vol:.14}));[72,76,79].forEach(n=>tone(c,o,t+.38,NOTE(n),{type:'triangle',a:.02,d:.7,vol:.09}))}},
  // decisions and consequences
  decision:{cat:'world',r:(c,o,t)=>{tone(c,o,t,65,{d:.3,vol:.45,to:48});[60,67,72].forEach(n=>tone(c,o,t+.05,NOTE(n),{type:'triangle',a:.03,d:.9,vol:.08}));noise(c,o,t,{type:'lowpass',f:500,d:.25,vol:.12})}},
  powerUp:{cat:'world',r:(c,o,t)=>{tone(c,o,t,110,{type:'sawtooth',a:.02,d:.4,vol:.05,to:440});tone(c,o,t+.35,NOTE(84),{d:.3,vol:.1})}},
  powerDown:{cat:'world',r:(c,o,t)=>{tone(c,o,t,440,{type:'sawtooth',a:.01,d:.55,vol:.05,to:70});tone(c,o,t,220,{type:'triangle',d:.5,vol:.08,to:60})}},
  ripple:{cat:'world',r:(c,o,t)=>{[84,88,91,95].forEach((n,i)=>tone(c,o,t+i*.06,NOTE(n),{d:.5,vol:.07,det:i*4}));noise(c,o,t,{type:'highpass',f:6000,a:.05,d:.5,vol:.04})}},
  newDay:{cat:'world',r:(c,o,t)=>{[67,72,76,79].forEach((n,i)=>tone(c,o,t+i*.12,NOTE(n),{type:'triangle',a:.02,d:.6,vol:.1}))}},
  rover:{cat:'world',r:(c,o,t)=>{const s=c.createOscillator(),f=c.createBiquadFilter(),l=c.createOscillator(),lg=c.createGain();s.type='sawtooth';s.frequency.value=70;f.type='lowpass';f.frequency.value=380;
    l.frequency.value=9;lg.gain.value=14;l.connect(lg).connect(s.frequency);s.connect(f).connect(env(c,t,.15,.18,.9,o));s.start(t);l.start(t);s.stop(t+1.1);l.stop(t+1.1)}},
  stuck:{cat:'world',r:(c,o,t)=>{for(let i=0;i<3;i++){tone(c,o,t+i*.22,150,{type:'sawtooth',d:.14,vol:.06,to:230});noise(c,o,t+i*.22,{type:'lowpass',f:500,d:.14,vol:.15,off:i*.2})}}},
  helper:{cat:'world',r:(c,o,t)=>{[79,83,86].forEach((n,i)=>tone(c,o,t+i*.09,NOTE(n),{type:'square',d:.07,vol:.05}));tone(c,o,t+.3,NOTE(91),{d:.25,vol:.09})}},
  // cinematic
  ignition:{cat:'cine',r:(c,o,t)=>{tone(c,o,t,60,{d:.5,vol:.5,to:38});noise(c,o,t,{type:'lowpass',f:180,to:1400,a:.05,d:1.4,vol:.35});for(let i=0;i<8;i++)noise(c,o,t+.1+i*.11,{type:'bandpass',f:2500,q:3,d:.03,vol:.12,off:i*.13})}},
  rumble:{cat:'cine',r:(c,o,t,dur=4)=>{noise(c,o,t,{type:'lowpass',f:90,to:420,a:.4,d:dur,vol:.4});tone(c,o,t,42,{a:.3,d:dur,vol:.2,to:55})}},
  whoosh:{cat:'cine',r:(c,o,t)=>noise(c,o,t,{type:'bandpass',f:300,to:2400,q:.7,a:.2,d:.9,vol:.25})},
  thrusters:{cat:'cine',r:(c,o,t)=>{noise(c,o,t,{type:'lowpass',f:900,to:250,a:.2,d:1.6,vol:.26});tone(c,o,t,95,{a:.2,d:1.5,vol:.12,to:60})}},
  touchdown:{cat:'cine',r:(c,o,t)=>{tone(c,o,t,80,{d:.35,vol:.6,to:40});noise(c,o,t,{type:'lowpass',f:600,d:.6,vol:.3})}},
  hatch:{cat:'cine',r:(c,o,t)=>{noise(c,o,t,{type:'highpass',f:2500,to:700,a:.03,d:.9,vol:.22});tone(c,o,t+.85,110,{type:'triangle',d:.15,vol:.25})}},
  bootStep:{cat:'cine',r:(c,o,t)=>{noise(c,o,t,{type:'lowpass',f:500,d:.22,vol:.6});noise(c,o,t+.03,{type:'bandpass',f:1800,q:1.5,d:.18,vol:.18});tone(c,o,t,70,{d:.18,vol:.3,to:45})}},
  sparkle:{cat:'cine',r:(c,o,t)=>{[91,95,98,103,98].forEach((n,i)=>tone(c,o,t+i*.06,NOTE(n),{d:.3,vol:.06}))}},
  cheer:{cat:'cine',r:(c,o,t)=>{[72,76,79,84,88].forEach((n,i)=>tone(c,o,t+i*.08,NOTE(n),{type:'triangle',d:.35,vol:.1}));[60,64,67].forEach(n=>tone(c,o,t+.45,NOTE(n),{type:'triangle',a:.05,d:1.2,vol:.08}))}},
  repair:{cat:'cine',r:(c,o,t)=>{for(let i=0;i<3;i++){noise(c,o,t+i*.18,{type:'bandpass',f:3200,q:6,d:.05,vol:.25,off:i*.1});tone(c,o,t+i*.18,1900,{type:'triangle',d:.06,vol:.06})}}},
  shutdown:{cat:'cine',r:(c,o,t)=>{tone(c,o,t,330,{type:'triangle',a:.01,d:.7,vol:.14,to:80});noise(c,o,t,{type:'lowpass',f:1200,to:200,d:.6,vol:.1});tone(c,o,t+.6,NOTE(76),{d:.4,vol:.06})}},
  // ambience (looped while playing)
  wind:{cat:'amb',r:(c,o,t,dur=8)=>{noise(c,o,t,{type:'bandpass',f:320,to:520,q:.6,a:1.5,d:dur,vol:.3})}},
  hum:{cat:'amb',r:(c,o,t,dur=8)=>{tone(c,o,t,60,{a:1,d:dur,vol:.08});tone(c,o,t,120,{a:1,d:dur,vol:.04})}},
};
export type SfxName=keyof typeof RECIPES;
/** Per-sound trim (dB) so every sound sits near its category's target loudness (measured by tools/sfx-qa.mjs). */
export const TRIM:Record<string,number>={stepDust:4.5,stepMetal:7,doorOpen:-2,doorClose:-5,equipment:8,exhibit:-1,decision:-2,powerUp:6,powerDown:9,ripple:3,newDay:3,rover:1,stuck:10,helper:6,
  miss:1.5,click:1,open:6,close:8,page:8,pop:3,tryAgain:2.5,xp:3,badge:1,ignition:-3,whoosh:11,thrusters:3,touchdown:-4,hatch:1,sparkle:8,cheer:4,repair:10,shutdown:7,wind:2,hum:1};
/** Plays one recipe into a mix chain (used live and by the offline loudness test). */
export function fire(c:BaseAudioContext,ch:ReturnType<typeof buildChain>,name:string,t:number,opt?:any){const R=RECIPES[name],g=c.createGain();g.gain.value=Math.pow(10,(TRIM[name]||0)/20);g.connect(ch.cats[R.cat]);R.r(c,g,t,opt)}
/** Shared output chain: category gains → compressor → limiter → master. */
export function buildChain(c:BaseAudioContext,dest:AudioNode,masterVol=.7){
  const master=c.createGain();master.gain.value=masterVol;
  const comp=c.createDynamicsCompressor();comp.threshold.value=-20;comp.knee.value=12;comp.ratio.value=4;comp.attack.value=.003;comp.release.value=.2;
  const lim=c.createDynamicsCompressor();lim.threshold.value=-3;lim.knee.value=0;lim.ratio.value=20;lim.attack.value=.001;lim.release.value=.1;
  comp.connect(lim).connect(master).connect(dest);
  const cats=Object.fromEntries((Object.keys(CAT_GAIN) as Cat[]).map(k=>{const g=c.createGain();g.gain.value=CAT_GAIN[k];g.connect(comp);return [k,g]})) as Record<Cat,GainNode>;
  return {master,cats};
}
// ---------------------------------------------------------------- live player
let ctx:AudioContext|null=null,chain:ReturnType<typeof buildChain>|null=null,amb:{name:string;timer:number}|null=null,source:()=>boolean=()=>true;
const on=()=>{try{return source()}catch{return true}};
const last:Record<string,number>={};
function ensure(){if(!on())return null;
  if(!ctx){const ic=introSound.ctx as AudioContext|null;if(ic)ctx=ic;else{const AC=(window as any).AudioContext||(window as any).webkitAudioContext;if(!AC)return null;ctx=new AC()}}
  if(ctx!.state==='suspended')void ctx!.resume();
  if(!chain)chain=buildChain(ctx!,ctx!.destination);return ctx}
export const sfx={
  /** Call from a click or key press (browsers only allow sound after a user gesture). */
  unlock(){if(on())ensure()},
  /** Where the Sound setting lives (checked on every play, so toggling it takes effect at once). */
  setSource(f:()=>boolean){source=f},
  get enabled(){return on()},
  play(name:SfxName,opt?:any,{gap=40,delay=0}={}){
    if(!on()||!ctx)return false;const now=performance.now();if(now-(last[name]||0)<gap)return false;last[name]=now;
    const c=ensure();if(!c||c.state!=='running'||!chain)return false;fire(c,chain,name,c.currentTime+.01+delay,opt);
    (window as any).__sfxLog?.push(name);return true},
  /** Looping background bed with a smooth cross-fade ('wind' outdoors, 'hum' indoors, null = silence). */
  ambience(name:'wind'|'hum'|null){
    if(!on())name=null;if(amb?.name===name)return;if(amb){clearInterval(amb.timer);amb=null}if(!name)return;
    const go=()=>{if(!on()){this.ambience(null);return}const c=ensure();if(!c||c.state!=='running'||!chain)return;fire(c,chain,name,c.currentTime+.05,9)};
    go();amb={name,timer:window.setInterval(go,7000)}},
  get state(){return {ctx:ctx?.state||'none',enabled:on(),ambience:amb?.name||null}},
};
(window as any).__sfx=sfx;
