// Procedural soundtrack for the opening cinematic (Web Audio API, no audio files).
// The AudioContext is created only inside a user gesture (the Start button), and sound can be turned off.
type Ctx=AudioContext;
let ctx:Ctx|null=null,master:GainNode|null=null,nodes:AudioScheduledSourceNode[]=[];
const NOTE=(n:number)=>440*Math.pow(2,(n-69)/12);

export const introSound={
  get ctx(){return ctx},
  /** Must be called from a click/keypress handler. */
  start(){
    if(!ctx){const AC=(window as any).AudioContext||(window as any).webkitAudioContext;if(!AC)return false;ctx=new AC() as Ctx;}
    if(ctx.state==='suspended')void ctx.resume();
    master=ctx.createGain();master.gain.value=0.0001;master.connect(ctx.destination);
    master.gain.exponentialRampToValueAtTime(0.5,ctx.currentTime+1.2);
    return true;
  },
  stop(fade=0.4){
    if(!ctx||!master)return;const g=master,t=ctx.currentTime;
    g.gain.cancelScheduledValues(t);g.gain.setValueAtTime(Math.max(g.gain.value,0.0001),t);g.gain.exponentialRampToValueAtTime(0.0001,t+fade);
    const list=nodes;nodes=[];setTimeout(()=>{for(const n of list){try{n.stop()}catch{/* already stopped */}}try{g.disconnect()}catch{/* gone */}},fade*1000+80);
    master=null;
  },
  /** Soft pad chord: midi notes, start offset (s), duration (s). */
  pad(notes:number[],at:number,dur:number,vol=0.07){
    if(!ctx||!master)return;const t0=ctx.currentTime+at;
    for(const n of notes){const o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();
      o.type='triangle';o.frequency.value=NOTE(n);f.type='lowpass';f.frequency.value=1400;
      g.gain.setValueAtTime(0.0001,t0);g.gain.exponentialRampToValueAtTime(vol,t0+Math.min(1.2,dur/3));g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
      o.connect(f).connect(g).connect(master);o.start(t0);o.stop(t0+dur+0.05);nodes.push(o);}
  },
  /** Bell / twinkle. */
  chime(n:number,at:number,vol=0.06){
    if(!ctx||!master)return;const t0=ctx.currentTime+at,o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sine';o.frequency.value=NOTE(n);g.gain.setValueAtTime(0.0001,t0);g.gain.exponentialRampToValueAtTime(vol,t0+0.01);g.gain.exponentialRampToValueAtTime(0.0001,t0+1.4);
    o.connect(g).connect(master);o.start(t0);o.stop(t0+1.5);nodes.push(o);
  },
  /** Filtered noise: rocket rumble or wind. */
  noise(at:number,dur:number,{from=120,to=600,vol=0.12}={}){
    if(!ctx||!master)return;const t0=ctx.currentTime+at,len=Math.ceil(ctx.sampleRate*dur),buf=ctx.createBuffer(1,len,ctx.sampleRate),data=buf.getChannelData(0);
    let seed=7;for(let i=0;i<len;i++){seed=(seed*16807)%2147483647;data[i]=(seed/2147483647)*2-1}
    const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=buf;f.type='lowpass';
    f.frequency.setValueAtTime(from,t0);f.frequency.exponentialRampToValueAtTime(to,t0+dur*0.7);
    g.gain.setValueAtTime(0.0001,t0);g.gain.exponentialRampToValueAtTime(vol,t0+dur*0.25);g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    s.connect(f).connect(g).connect(master);s.start(t0);s.stop(t0+dur+0.05);nodes.push(s);
  },
  thud(at:number,vol=0.2){
    if(!ctx||!master)return;const t0=ctx.currentTime+at,o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sine';o.frequency.setValueAtTime(120,t0);o.frequency.exponentialRampToValueAtTime(40,t0+0.25);
    g.gain.setValueAtTime(vol,t0);g.gain.exponentialRampToValueAtTime(0.0001,t0+0.3);o.connect(g).connect(master);o.start(t0);o.stop(t0+0.35);nodes.push(o);
  },
  /** The whole score, timed to the cinematic (seconds from start). */
  score(scale=1){
    const s=(t:number)=>t*scale;
    // 1 dream: gentle pad + twinkles
    this.pad([60,64,67,71],s(0),s(4.6),0.05);[0.6,1.5,2.4,3.3].forEach((t,i)=>this.chime([84,88,91,86][i],s(t),0.035));
    // 2 growing up: rising arpeggio, warmer chord
    this.pad([62,65,69,72],s(4.4),s(4.3),0.055);[4.6,5.0,5.4,5.8,6.2,6.6].forEach((t,i)=>this.chime([74,77,81,84,86,89][i],s(t),0.04));
    // 3 launch: rumble, low brass-like pad
    this.noise(s(9.0),s(5.6),{from:90,to:900,vol:0.16});this.pad([45,52,57,64],s(8.6),s(6),0.07);this.thud(s(9.4),0.25);
    // 4 journey: wide open chord
    this.pad([57,64,69,71,76],s(14.4),s(5.3),0.05);[15,16.2,17.4,18.6].forEach((t,i)=>this.chime([81,83,88,86][i],s(t),0.03));
    // 5 first steps: wind, hush, then swell
    this.noise(s(19.6),s(6.5),{from:300,to:500,vol:0.05});this.thud(s(22.6),0.18);this.pad([53,60,65,69,72],s(23.4),s(4.2),0.07);
    // 6 arrival chime
    [26.8,27.2,27.6].forEach((t,i)=>this.chime([79,84,88][i],s(t),0.05));
  },
};
(window as any).__introSound=introSound;
