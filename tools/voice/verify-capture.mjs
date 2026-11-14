// Checks a Chrome dialogue capture (tools/qa-lib.mjs captureDialogue, VOICE_CAPTURE=file) against the voice package.
// Every line Nuri or a caption showed must be one package line, or several package lines joined by a space.
//   node tools/voice/verify-capture.mjs <capture.jsonl...>
import {readFileSync,writeFileSync} from 'node:fs';
const map=JSON.parse(readFileSync('voice-package/nuri_audio_map.json','utf8'));
const ref=readFileSync('voice-package/on_screen_text_not_voiced.csv','utf8');
const texts=new Set(Object.values(map.files).map(f=>f.text));
const norm=s=>s.replace(/\s+/g,' ').trim();
const known=new Set([...texts].map(norm));
const sorted=[...known].sort((a,b)=>b.length-a.length);
function covers(t){ // greedy split into known lines joined by single spaces
  if(known.has(t))return [t];
  for(const k of sorted)if(t.startsWith(k+' ')){const rest=covers(t.slice(k.length+1));if(rest)return [k,...rest]}
  return null}
const caps=[];for(const f of process.argv.slice(2))for(const l of readFileSync(f,'utf8').split('\n'))if(l.trim())caps.push(JSON.parse(l));
const uniq=new Map();for(const c of caps){const t=norm(c.text);uniq.set(c.kind+'|'+t,{kind:c.kind,text:t})}
const VOICED=['nuri','card','more','help','caption','why','disc'];
const miss=[],composite=[],okOpt=[];let ok=0;
for(const {kind,text} of uniq.values()){
  if(!VOICED.includes(kind)){if(known.has(text)||ref.includes(text.replace(/^[A-Zأب] /,'')))okOpt.push(text);else if(!known.has(text.replace(/^[AB] /,'')))miss.push({kind,text});continue}
  const c=covers(text);if(!c)miss.push({kind,text});else if(c.length>1)composite.push({kind,text,parts:c.length});else ok++}
const seenLines=new Set();for(const {text} of uniq.values()){const c=covers(text);if(c)for(const p of c)seenLines.add(p)}
const report={captured_unique:uniq.size,voiced_exact:ok,voiced_composite:composite.length,options_ok:okOpt.length,missing:miss,
  package_lines_seen_in_chrome:seenLines.size,package_lines_total:known.size};
writeFileSync('voice-package/chrome_capture_check.json',JSON.stringify({...report,composites:composite},null,2));
console.log(JSON.stringify({...report,missing:miss.length}));for(const m of miss.slice(0,40))console.log('MISSING',m.kind,'|',m.text);
process.exit(miss.length?1:0);
