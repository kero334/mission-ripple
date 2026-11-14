// Nuri's voice (English). Plays the ElevenLabs recording whose text exactly matches what Nuri is showing, so the
// voice always matches the bubble. One line at a time: a new line, a page change, closing a card, switching to
// Arabic, or muting stops the old one. Music and effects are lowered while Nuri speaks.
// Recordings and their manifest live in public/assets/voice/en (built by tools/voice/generate.mjs; no API key here).
type Line={id:string;file:string;s:number};
type Opts={enabled:()=>boolean;volume:()=>number;locale:()=>string;duck:(on:boolean)=>void};
const norm=(s:string)=>s.replace(/\s+/g,' ').trim();
let lines:Record<string,Line>={},sorted:string[]=[],ready=false,opts:Opts|null=null;
let audio:HTMLAudioElement|null=null,queue:Line[]=[],current:{text:string;channel:string;parts:Line[];extra:string[]}|null=null,ducked=false;
const missing=new Set<string>(),log:{channel:string;id:string;text:string}[]=[];
let playToken=0;
/** Splits a shown text into recorded lines (cards can show two recorded lines joined by a space). */
function resolve(text:string):Line[]|null{
  const t=norm(text);if(!t)return null;if(lines[t])return [lines[t]];
  for(const k of sorted)if(t.startsWith(k+' ')){const rest=resolve(t.slice(k.length+1));if(rest)return [lines[k],...rest]}
  return null;
}
function setDuck(on:boolean){if(on!==ducked){ducked=on;try{opts?.duck(on)}catch{/* audio not ready */}}}
function playNext(){
  const l=queue.shift();if(!l||!opts){current=null;setDuck(false);return}
  if(!audio){audio=new Audio();audio.preload='auto';audio.addEventListener('ended',()=>playNext());audio.addEventListener('error',()=>playNext())}
  audio.src=`/assets/voice/en/${l.file}`;audio.volume=Math.max(0,Math.min(1,opts.volume()));setDuck(true);
  log.push({channel:current?.channel||'',id:l.id,text:current?.text||''});
  window.dispatchEvent(new CustomEvent('ripple-voice',{detail:{type:'play',id:l.id,channel:current?.channel||'',text:current?.text||''}}));
  const token=++playToken;
  audio.play().catch(e=>{if(token!==playToken||(e&&e.name==='AbortError'))return;current=null;queue=[];setDuck(false)});
}
export const voice={
  async init(o:Opts){opts=o;try{const m=await (await fetch('/assets/voice/en/manifest.json')).json();lines={};for(const [t,v] of Object.entries(m.lines as Record<string,Line>))lines[norm(t)]=v;
    sorted=Object.keys(lines).sort((a,b)=>b.length-a.length);ready=true}catch{ready=false}},
  get ready(){return ready},
  /** Says a shown line. Same line already playing → keeps going (no restart). */
  say(text:string,channel='hud',{force=false}={}){
    if(!ready||!opts||opts.locale()!=='en'||!opts.enabled())return false;
    const t=norm(text);if(!t)return false;if(!force&&current&&current.text===t)return true;
    const parts=resolve(t);if(!parts){missing.add(t);window.dispatchEvent(new CustomEvent('ripple-voice',{detail:{type:'missing',channel,text:t}}));return false}
    this.stop();current={text:t,channel,parts,extra:[]};queue=[...parts];playNext();return true},
  /** Adds a line after the current one (e.g. "Tell me more" when it is already open). */
  then(text:string,channel='card'){if(!current)return this.say(text,channel);const t=norm(text);if(!t||current.text===t||current.extra.includes(t))return true;const p=resolve(t);if(!p){missing.add(t);return false}current.extra.push(t);queue.push(...p);return true},
  stop(channel?:string){if(channel&&current?.channel!==channel)return;queue=[];current=null;if(audio){audio.pause();audio.removeAttribute('src');audio.load()}setDuck(false)},
  replay(){const c=current||last;if(c)this.say(c.text,c.channel,{force:true})},
  setVolume(v:number){if(audio)audio.volume=Math.max(0,Math.min(1,v))},
  get speaking(){return !!current},
  get state(){return {ready,speaking:!!current,text:current?.text||null,channel:current?.channel||null,lines:Object.keys(lines).length}},
  missing:()=>[...missing],log:()=>log.slice(),
};
let last:{text:string;channel:string}|null=null;
const origSay=voice.say.bind(voice);voice.say=(t:string,c='hud',o={})=>{const r=origSay(t,c,o);if(r)last={text:norm(t),channel:c};return r};
if(typeof window!=='undefined')(window as any).__voice=voice;
