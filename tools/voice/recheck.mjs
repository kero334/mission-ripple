// Re-transcribes the lines flagged by audit.mjs one file at a time (no joining), to separate ASR timing
// artefacts from real pronunciation problems.  node tools/voice/recheck.mjs
import {readFileSync,writeFileSync,copyFileSync,mkdirSync} from 'node:fs';
import {execSync} from 'node:child_process';
import {join} from 'node:path';
const A=JSON.parse(readFileSync('voice-cache/audit.json','utf8'));const W=join(process.env.TEMP,'opencode','asr-one');mkdirSync(W,{recursive:true});
const NUM={1:'one',30:'thirty'};
const toks=s=>s.toLowerCase().replace(/[’']/g,'').replace(/(\d+)/g,m=>' '+(NUM[m]||m)+' ').replace(/[^a-z0-9 ]+/g,' ').split(/\s+/).filter(Boolean).map(w=>w.replace(/s$/,''));
const lev=(a,b)=>{const d=Array.from({length:a.length+1},(_,i)=>[i]);for(let j=1;j<=b.length;j++)d[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[a.length][b.length]};
const ids=process.argv[2]?process.argv[2].split(','):A.report.flagged.map(f=>f.id);const out=[];
for(const id of ids){const it=A.items.find(i=>i.id===id);copyFileSync(`public/assets/voice/en/${it.file}`,join(W,'a.mp3'));
  execSync('npx -y hyperframes@0.9.44 transcribe a.mp3 --json',{cwd:W,stdio:'ignore'});
  const heard=JSON.parse(readFileSync(join(W,'transcript.json'),'utf8')).map(w=>w.text).join(' ');
  const wer=+(lev(toks(it.text),toks(heard))/toks(it.text).length).toFixed(2);out.push({id,wer,text:it.text,heard});console.log(wer>0.15?'BAD ':'ok  ',id,'|',heard)}
writeFileSync('voice-cache/recheck.json',JSON.stringify(out,null,1));
