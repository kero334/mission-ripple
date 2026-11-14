// Generates Nuri's English voice with ElevenLabs from voice-package/nuri_audio_map.json (built by
// build-voice-package.mjs). Local tool only; the API key never enters the game or the repo.
//   node tools/voice/generate.mjs [--pilot id1,id2,...] [--limit N] [--dry]
// Cache: voice-cache/<sha>.mp3 holds the raw ElevenLabs file for each (model, voice, settings, text). A line is
// only requested when its cache file is missing, so re-runs and text-identical lines never cost credits.
// Each cached file is loudness-normalised with ffmpeg into public/assets/voice/en/<mp3_filename>.
import {readFileSync,writeFileSync,existsSync,mkdirSync,statSync,readdirSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {api,creds} from './eleven.mjs';
const args=process.argv.slice(2),opt=k=>{const i=args.indexOf(k);return i>=0?args[i+1]:null};
const MODEL='eleven_multilingual_v2',FORMAT='mp3_44100_96';
// Friendly, warm, steady for children: a little more stable than default, light style, slightly slower.
const SETTINGS={stability:0.55,similarity_boost:0.8,style:0.25,use_speaker_boost:true,speed:0.94};
const CACHE='voice-cache',OUT='public/assets/voice/en';mkdirSync(CACHE,{recursive:true});mkdirSync(OUT,{recursive:true});
const map=JSON.parse(readFileSync('voice-package/nuri_audio_map.json','utf8'));
// Only Nuri's spoken lines: required + Nuri speaker (captions are the Narrator; option buttons are not speech).
let lines=Object.entries(map.files).filter(([,f])=>f.speaker==='Nuri'&&f.voice==='required').map(([file,f])=>({file,...f}));
if(opt('--pilot'))lines=lines.filter(l=>opt('--pilot').split(',').includes(l.id));
if(opt('--limit'))lines=lines.slice(0,+opt('--limit'));
// What the voice reads. The displayed text is unchanged; only symbols a voice would read badly are spoken as pauses,
// plus per-line pronunciation hints (pauses) where a take ran words together.
const SPOKEN={'m6.rover.go-command.say':'Now let’s write the base plan, at Command!','m1.hint.research.goal':'Learn... what it means. Research Lab.'};
const speakOf=l=>SPOKEN[l.id]||speak(l.text);
const speak=t=>t.replaceAll(' · ','. ');
// Per-line seed overrides (voice-cache/seeds.json) re-take a bad recording; --regen id1,id2 bumps their seed once.
const seedsF=`${CACHE}/seeds.json`,SEEDS=existsSync(seedsF)?JSON.parse(readFileSync(seedsF,'utf8')):{};
if(opt('--regen')){for(const id of opt('--regen').split(','))SEEDS[id]=(SEEDS[id]||1234)+1111;writeFileSync(seedsF,JSON.stringify(SEEDS,null,1));lines=lines.filter(l=>opt('--regen').split(',').includes(l.id))}
const seedOf=l=>SEEDS[l.id]||1234;
const key=l=>createHash('sha256').update(JSON.stringify(seedOf(l)===1234?[MODEL,creds().voice,SETTINGS,FORMAT,speakOf(l)]:[MODEL,creds().voice,SETTINGS,FORMAT,speakOf(l),seedOf(l)])).digest('hex').slice(0,24);
const ledgerF=`${CACHE}/ledger.json`,ledger=existsSync(ledgerF)?JSON.parse(readFileSync(ledgerF,'utf8')):{requests:0,characters:0,costHeaders:{},items:{}};
const saveLedger=()=>writeFileSync(ledgerF,JSON.stringify(ledger,null,2));
async function tts(l){
  const h=key(l),raw=`${CACHE}/${h}.mp3`;
  if(existsSync(raw)&&statSync(raw).size>1000)return {h,raw,cached:true};
  if(args.includes('--dry'))return {h,raw,dry:true};
  const {voice}=creds();let err;
  for(let attempt=0;attempt<5;attempt++){
    try{const r=await api(`/v1/text-to-speech/${voice}?output_format=${FORMAT}`,{method:'POST',accept:'audio/mpeg',body:{text:speakOf(l),model_id:MODEL,voice_settings:SETTINGS,seed:seedOf(l),apply_text_normalization:'auto'}});
      writeFileSync(raw,r.buf);ledger.requests++;ledger.characters+=speakOf(l).length;
      for(const k of ['character-cost','x-character-count','request-id','current-concurrent-requests','maximum-concurrent-requests'])if(r.headers.get(k))ledger.costHeaders[k]=k==='character-cost'?(+(ledger.costHeaders[k]||0)+ +r.headers.get(k)):r.headers.get(k);
      ledger.items[h]={id:l.id,chars:speakOf(l).length,cost:r.headers.get('character-cost')};saveLedger();return {h,raw,cached:false}}
    catch(e){err=e;if(e.status===429||e.status===409||e.status>=500){await new Promise(r=>setTimeout(r,1500*(attempt+1)));continue}throw e}}
  throw err;
}
function normalise(raw,out){ // two-pass-free single loudnorm to -18 LUFS, peaks ≤ -1.5 dBTP, mono 44.1 kHz, 96 kbps
  execFileSync('ffmpeg',['-y','-v','error','-i',raw,'-af','silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,adelay=60|60,apad=pad_dur=0.12,loudnorm=I=-18:TP=-1.5:LRA=9','-ar','44100','-ac','1','-b:a','96k',out])}
const dur=f=>+execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',f]).toString().trim();
// ---------------------------------------------------------------- run (3 at a time)
let done=0,fresh=0,cached=0;const results=[];const q=[...lines];
async function worker(){while(q.length){const l=q.shift();const r=await tts(l);if(r.dry){results.push({...l,hash:r.h,dry:true});continue}
  const out=`${OUT}/${l.file}`;if(!existsSync(out)||!existsSync(out+'.src')||readFileSync(out+'.src','utf8')!==r.h){normalise(r.raw,out);writeFileSync(out+'.src',r.h)}
  r.cached?cached++:fresh++;done++;results.push({...l,hash:r.h,seconds:+dur(out).toFixed(2)});if(done%25===0)console.log(`  ${done}/${lines.length} (${fresh} new, ${cached} cached)`)}}
const N=+(opt('--jobs')||3);if(lines.length&&!args.includes('--dry')){const first=lines.slice(0,1);void first}await Promise.all(Array.from({length:N},worker));
if(args.includes('--dry')){const chars=results.filter(r=>!existsSync(`${CACHE}/${r.hash}.mp3`)).reduce((s,r)=>s+speak(r.text).length,0);console.log(JSON.stringify({lines:results.length,toGenerate:results.filter(r=>!existsSync(`${CACHE}/${r.hash}.mp3`)).length,characters:chars}));process.exit(0)}
// remove outputs that no longer belong to any line (keeps the folder exact)
const keep=new Set(Object.values(JSON.parse(readFileSync('voice-package/nuri_audio_map.json','utf8')).files).filter(f=>f.speaker==='Nuri'&&f.voice==='required').map(f=>f.id));
// manifest for the game: displayed text → file + seconds (exact-text lookup keeps voice and bubble in sync)
const all=Object.entries(map.files).filter(([,f])=>f.speaker==='Nuri'&&f.voice==='required').map(([file,f])=>({file,...f}));
if(!opt('--pilot')&&!opt('--limit')&&!opt('--regen')||opt('--regen')){
  const manifest={language:'en',model:MODEL,settings:SETTINGS,generated:new Date().toISOString(),lines:{}};
  for(const l of all){const out=`${OUT}/${l.file}`;if(existsSync(out))manifest.lines[l.text]={id:l.id,file:l.file,s:+dur(out).toFixed(2)}}
  writeFileSync(`${OUT}/manifest.json`,JSON.stringify(manifest)+'\n');
  for(const f of readdirSync(OUT))if(f.endsWith('.mp3')&&!all.some(l=>l.file===f)){rmSync(`${OUT}/${f}`);rmSync(`${OUT}/${f}.src`,{force:true})}
  console.log('manifest lines',Object.keys(manifest.lines).length,'of',all.length);void keep;
}
console.log(JSON.stringify({lines:lines.length,new:fresh,cached,requestsTotal:ledger.requests,charactersSent:ledger.characters,costHeaders:ledger.costHeaders}));
writeFileSync(`${CACHE}/last-run.json`,JSON.stringify(results.map(r=>({id:r.id,file:r.file,seconds:r.seconds,chars:r.text.length})),null,1));
