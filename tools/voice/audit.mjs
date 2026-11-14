// Checks every generated Nuri recording: loudness/peak (ffmpeg ebur128) and words (local Parakeet ASR via
// `hyperframes transcribe`, run once on all files joined with silence). Writes voice-cache/audit.json and prints the
// lines whose transcript differs too much from the text (candidates for regeneration).
//   node tools/voice/audit.mjs
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {join} from 'node:path';
const DIR='public/assets/voice/en',W=join(process.env.TEMP,'opencode','asr-all');mkdirSync(W,{recursive:true});
const man=JSON.parse(readFileSync(`${DIR}/manifest.json`,'utf8'));
const items=Object.entries(man.lines).map(([text,v])=>({text,...v}));
// 1) loudness (ffmpeg writes the EBU R128 summary to stderr)
for(const it of items){const s=spawnSync('ffmpeg',['-hide_banner','-nostats','-i',`${DIR}/${it.file}`,'-af','ebur128=peak=true','-f','null','-'],{encoding:'utf8'}).stderr||'';
  const sum=s.slice(s.lastIndexOf('Summary:'));it.lufs=+(sum.match(/I:\s+(-?[\d.]+)/)?.[1]??NaN);it.peak=+(sum.match(/Peak:\s+(-?[\d.]+)/)?.[1]??NaN)}
// 2) one long file: line, 1.2 s silence, line, ...
const GAP=1.2;let t=0;const list=[];
execFileSync('ffmpeg',['-y','-v','error','-f','lavfi','-i','anullsrc=r=16000:cl=mono','-t',String(GAP),join(W,'gap.wav')]);
for(const it of items){const wav=join(W,it.id+'.wav');if(!existsSync(wav))execFileSync('ffmpeg',['-y','-v','error','-i',`${DIR}/${it.file}`,'-ar','16000','-ac','1',wav]);
  const d=+execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',wav]).toString();it.at=t;it.dur=d;t+=d+GAP;list.push(`file '${wav.replaceAll('\\','/')}'`,`file '${join(W,'gap.wav').replaceAll('\\','/')}'`)}
writeFileSync(join(W,'list.txt'),list.join('\n'));
execFileSync('ffmpeg',['-y','-v','error','-f','concat','-safe','0','-i',join(W,'list.txt'),'-c','copy',join(W,'all.wav')]);
if(!process.argv.includes('--no-asr'))execFileSync('npx',['-y','hyperframes@0.9.44','transcribe','all.wav','--json'],{cwd:W,stdio:['ignore','ignore','inherit'],shell:true});
const words=JSON.parse(readFileSync(join(W,'transcript.json'),'utf8'));
// 3) compare words (numbers spelled as words count as equal)
const NUM={0:'zero',1:'one',2:'two',3:'three',4:'four',5:'five',6:'six',7:'seven',8:'eight',9:'nine',10:'ten',12:'twelve',14:'fourteen',20:'twenty',24:'twenty four',30:'thirty',92:'ninety two',300:'three hundred'};
const toks=s=>s.toLowerCase().replace(/[’']/g,'').replace(/(\d+)/g,(m)=>' '+(NUM[m]||m)+' ').replace(/[^a-z0-9 ]+/g,' ').split(/\s+/).filter(Boolean).map(w=>w.replace(/s$/,''));
const lev=(a,b)=>{const d=Array.from({length:a.length+1},(_,i)=>[i]);for(let j=1;j<=b.length;j++)d[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[a.length][b.length]};
for(const it of items){const got=words.filter(w=>w.start>=it.at-0.05&&w.start<it.at+it.dur+GAP*0.6).map(w=>w.text).join(' ');it.heard=got;
  const a=toks(it.text),b=toks(got);it.wer=+(lev(a,b)/Math.max(1,a.length)).toFixed(2)}
const bad=items.filter(i=>i.wer>0.2);const loud=items.map(i=>i.lufs).filter(Number.isFinite);
const report={files:items.length,lufs:{min:Math.min(...loud),max:Math.max(...loud)},peakMax:Math.max(...items.map(i=>i.peak).filter(Number.isFinite)),
  seconds:+items.reduce((s,i)=>s+i.dur,0).toFixed(1),werAvg:+(items.reduce((s,i)=>s+i.wer,0)/items.length).toFixed(3),flagged:bad.map(i=>({id:i.id,wer:i.wer,text:i.text,heard:i.heard}))};
writeFileSync('voice-cache/audit.json',JSON.stringify({report,items},null,1));
console.log(JSON.stringify({...report,flagged:bad.length}));for(const b of bad)console.log(`FLAG ${b.id} wer=${b.wer}\n   text : ${b.text}\n   heard: ${b.heard}`);
