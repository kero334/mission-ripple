// Analyses a Chrome capture (VOICE_CAPTURE) of real playthroughs:
//  • every Nuri line shown on screen (dialogue box, card, "tell me more", help, ending recap) had a recording
//  • every played recording belonged to the text on screen at that moment (no wrong-line playback)
//  • how many of the 390 recordings were heard in the playthroughs
//   node tools/voice/coverage.mjs <capture.jsonl>
import {readFileSync,writeFileSync} from 'node:fs';
const man=JSON.parse(readFileSync('public/assets/voice/en/manifest.json','utf8')).lines;
const norm=s=>s.replace(/\s+/g,' ').trim();
const byText=new Map(Object.entries(man).map(([t,v])=>[norm(t),v]));const sorted=[...byText.keys()].sort((a,b)=>b.length-a.length);
const covers=t=>{if(byText.has(t))return [t];for(const k of sorted)if(t.startsWith(k+' ')){const r=covers(t.slice(k.length+1));if(r)return [k,...r]}return null};
const rows=readFileSync(process.argv[2],'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
const shown=new Map(),plays=[],missingEv=[];
for(const r of rows){
  if(r.kind==='voice-play'){plays.push(JSON.parse(r.text));continue}
  if(r.kind==='voice-missing'){missingEv.push(JSON.parse(r.text));continue}
  if(['nuri','card','more','help','why'].includes(r.kind))shown.set(r.kind+'|'+norm(r.text),{kind:r.kind,text:norm(r.text)});
}
const notRecorded=[...shown.values()].filter(s=>!covers(s.text));
const wrong=plays.filter(p=>{const parts=covers(norm(p.text));return !parts||!parts.some(t=>byText.get(t).id===p.id)});
const heard=new Set(plays.map(p=>p.id));
const res={capturedRows:rows.length,nuriLinesShown:shown.size,shownWithoutRecording:notRecorded,missingEvents:[...new Set(missingEv.map(m=>m.text))],
  playbacks:plays.length,wrongLinePlaybacks:wrong.length,recordingsHeard:heard.size,recordingsTotal:byText.size};
writeFileSync('voice-cache/coverage.json',JSON.stringify({...res,heardIds:[...heard].sort()},null,1));
console.log(JSON.stringify({...res,shownWithoutRecording:notRecorded.length,missingEvents:res.missingEvents.length}));
for(const n of notRecorded.slice(0,30))console.log('NOT RECORDED',n.kind,'|',n.text);for(const m of res.missingEvents.slice(0,30))console.log('MISSING EVENT |',m);
