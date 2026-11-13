// npm test — fast unit tests for the pure game systems (no browser needed).
// Uses Vite's SSR module loader so TypeScript and JSON imports work without extra dependencies.
import {createServer} from 'vite';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';

class MemoryStorage{constructor(){this.m=new Map()}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}clear(){this.m.clear()}}
globalThis.localStorage=new MemoryStorage();
const server=await createServer({server:{middlewareMode:true,hmr:false,watch:null},appType:'custom',logLevel:'error',optimizeDeps:{noDiscovery:true,include:[]}});
const load=p=>server.ssrLoadModule(p);
const results=[];
async function test(name,fn){try{await fn();results.push([name,true]);console.log('PASS',name)}catch(e){results.push([name,false,e.message]);console.log('FAIL',name,'\n   ',e.message)}}

const M=await load('/src/science/mission.ts');
const S=await load('/src/science/series.ts');
const R=await load('/src/game/rewards.ts');
const PG=await load('/src/game/progress.ts');
const G=await load('/src/game/guidance.ts');
const C=await load('/src/content/strings.ts');
const D=await load('/src/content/discoveries.ts');

// ---------------------------------------------------------------- mission reducer (unchanged semantics)
await test('reducer: full branch A path and flags',()=>{let s=M.initialMission();for(const a of ['start','monitor-reviewed','research-reviewed','review-defer'])s=M.transition(s,a);
  assert.equal(s.stage,'nextShift');assert.equal(s.choice,'review-defer');assert.equal(s.nextShiftFlag,'trend_reviewed');assert.equal(s.simulatedWorkSlotsUsed,1);
  s=M.transition(M.transition(s,'next-shift-reviewed'),'finish');assert.equal(s.stage,'complete')});
await test('reducer: branch B flag',()=>{let s=M.initialMission();for(const a of ['start','monitor-reviewed','research-reviewed','survey-followup'])s=M.transition(s,a);assert.equal(s.nextShiftFlag,'followup_reading_due')});
await test('reducer: illegal actions are ignored',()=>{const s=M.initialMission();assert.equal(M.transition(s,'review-defer'),s);assert.equal(M.transition(s,'finish'),s);const m=M.transition(s,'start');assert.equal(M.transition(m,'research-reviewed'),m)});
// ---------------------------------------------------------------- save repair
await test('save: valid save loads unchanged',()=>{const v={version:1,stage:'command',choice:null,monitorReviewed:true,researchReviewed:true,nextShiftFlag:null,simulatedWorkSlotsUsed:0};const {state,repaired}=M.sanitizeMission(v);assert.deepEqual(state,v);assert.equal(repaired,false)});
await test('save: debrief without choice is repaired to command (no soft-lock)',()=>{const {state,repaired}=M.sanitizeMission({version:1,stage:'debrief',choice:null});assert.equal(state.stage,'command');assert.equal(state.researchReviewed,true);assert.equal(repaired,true)});
await test('save: command without researchReviewed is repaired so the decision works',()=>{const {state}=M.sanitizeMission({version:1,stage:'command',choice:null,monitorReviewed:false,researchReviewed:false});assert.equal(M.transition(state,'survey-followup').stage,'nextShift')});
await test('save: corrupt JSON kept as backup, game starts fresh',()=>{localStorage.clear();localStorage.setItem(M.SAVE_KEY,'{oops');const s=M.loadMission();assert.equal(s.stage,'ready');assert.equal(localStorage.getItem(M.SAVE_KEY+'.backup'),'{oops')});
// ---------------------------------------------------------------- science
await test('science: snapshot and full series validate',()=>{assert.equal(M.validateEvidenceRecord(M.evidence),true);assert.equal(S.validateSeries(),true)});
await test('science: series is every retrieved row (82 + 139), peak 303.98798 at 06:15:19',()=>{assert.equal(S.MAY19.length,82);assert.equal(S.MAY20.length,139);assert.equal(S.PEAK.v,303.98798);assert.equal(S.PEAK.ts,'2024-05-20T06:15:19')});
await test('science: the "change" window is data-derived and contains the steepest real rise',()=>{assert.equal(S.CHANGE_WINDOW.start,4);assert.equal(S.RISE.from.ts,'2024-05-20T05:38:56');assert.equal(S.RISE.to.ts,'2024-05-20T05:48:02');assert.equal(S.WINDOWS.filter(w=>w.kind==='change').length,1)});
await test('science: 92 readings above the descriptive cutoff, matching the package',()=>assert.equal(S.ABOVE_CUTOFF.length,92));
await test('science: validator rejects a tampered series row',()=>{const bad=structuredClone(S.series);bad.days['2024-05-20'][50][1]=999;assert.throws(()=>S.validateSeries(bad))});
await test('science: validator rejects an invented habitat dose',()=>{const bad=structuredClone(M.evidence);bad.habitatDose=12;assert.throws(()=>M.validateEvidenceRecord(bad))});
const pkg=resolve('../NASA-Science-to-Mission-Engine/MISSION_RIPPLE_COMPLETE_SCIENTIFIC_DATA');
await test('science: series rows equal the original NASA CSV (needs research package)',()=>{
  const csv=resolve(pkg,'01_ORIGINAL_DATA/RADLAB/phase2/MSL_RAD_surface_2024.csv');if(!existsSync(csv)){console.log('    (skipped: research package not found)');return}
  const rows=new Map(readFileSync(csv,'utf8').trim().split(/\r?\n/).slice(1).map(l=>l.replaceAll('"','').split(',')).map(p=>[p[0],p]));
  for(const day of Object.values(S.series.days))for(const [ts,v] of day){const r=rows.get(ts);assert.ok(r,ts);assert.equal(Number(r[2]),v);assert.equal(r[3],'')}});
await test('science: exhibit values equal canonical findings (needs research package)',()=>{
  const f=resolve(pkg,'04_VERIFIED_DISCOVERIES/scientific_findings.json');if(!existsSync(f)){console.log('    (skipped)');return}
  const by=Object.fromEntries(JSON.parse(readFileSync(f,'utf8')).map(x=>[x.id,x]));const ex=S.exhibitRecords;
  assert.equal(ex['data-check'].value,by['P2-RAD-08'].value);assert.equal(ex['surface-typical'].value,by['P2-RAD-02'].value);assert.equal(ex['data-check'].coverageReadings,by['P2-RAD-01'].value);
  assert.deepEqual(ex['solar-catalog'].counts,by['SCI-0003'].value.counts)});
await test('science: no child-facing text calls a reading safe/unsafe or gives a cause',()=>{
  const all=JSON.stringify(C).toLowerCase().replaceAll('not “safe” or “unsafe”','').replaceAll('does not mean “safe” or “unsafe”','').replaceAll('does not decide what is safe for people','');for(const bad of ['unsafe','is safe','dangerous level','caused by the sun','solar storm caused'])assert.ok(!all.includes(bad),bad);
  for(const d of D.DISCOVERIES){const t=(d.short('en')+d.detail('en')).toLowerCase();assert.ok(!/\bunsafe\b|\bdangerous\b/.test(t),d.id)}});
// ---------------------------------------------------------------- rewards
const store=()=>PG.createProgressStore(new MemoryStorage());
await test('rewards: XP comes from config and events are idempotent',()=>{const p=store();assert.ok(p.award('ev:may20-series'));assert.equal(p.award('ev:may20-series'),null);assert.equal(p.xp(),R.XP.discoverEvidence)});
await test('rewards: reload cannot duplicate (XP is derived from unique event IDs)',()=>{const mem=new MemoryStorage();const a=PG.createProgressStore(mem);a.award('ev:found-change');a.award('ev:found-change');const b=PG.createProgressStore(mem);assert.equal(b.xp(),R.XP.interpretObservation);b.award('ev:found-change');assert.equal(b.xp(),R.XP.interpretObservation)});
await test('rewards: tampered save cannot inject XP or fake badges',()=>{const mem=new MemoryStorage();mem.setItem(PG.PROGRESS_KEY,JSON.stringify({version:1,awarded:['ev:found-change','ev:found-change','hack'],achievements:['mission-complete'],xp:99999}));const p=PG.createProgressStore(mem);assert.equal(p.xp(),R.XP.interpretObservation);assert.deepEqual(p.get().achievements,['evidence-detective'])});
await test('rewards: replay never re-pays mission completion',()=>{const p=store();p.completeRun();p.startRun();p.completeRun();assert.equal(p.xp(),R.XP.completeMission);assert.equal(p.get().completions,2)});
await test('rewards: both branches are equally rewarding; seeing both unlocks Branch Explorer',()=>{const p=store();p.seeBranch('survey-followup');assert.equal(p.xp(),0);p.seeBranch('review-defer');assert.ok(p.get().achievements.includes('branch-explorer'))});
await test('rewards: hint requests never change XP',()=>{const p=store();p.award('ev:may20-series');const x=p.xp();for(let i=0;i<5;i++){p.count('hintRequests');p.setHintLevel('monitor',i)}assert.equal(p.xp(),x);assert.equal(p.hintLevel('monitor'),3)});
await test('rewards: exhibits pay once; three exhibits → Curious Mind',()=>{const p=store();p.readExhibit('data-check');p.readExhibit('data-check');p.readExhibit('solar-catalog');assert.ok(!p.get().achievements.includes('curious-mind'));p.readExhibit('iss-environment');assert.ok(p.get().achievements.includes('curious-mind'));assert.equal(p.xp(),3*R.XP.optionalDiscovery)});
await test('rewards: every event points at real achievements/cards; every card has content',()=>{const ids=new Set(D.DISCOVERIES.map(d=>d.id));for(const [id,e] of Object.entries(R.REWARD_EVENTS)){if(e.achievement)assert.ok(R.ACHIEVEMENTS[e.achievement],id);for(const c of e.cards||[])assert.ok(ids.has(c),c)}});
await test('rewards: titles are cosmetic and reachable with the available XP',()=>{const max=Object.keys(R.REWARD_EVENTS).reduce((s,id)=>s+R.xpFor(id),0);assert.ok(R.TITLES.at(-1).xp<=max,`max ${max}`)});
await test('progress: legacy completed mission is migrated once (not deleted)',()=>{const p=store();p.migrateFromMission({stage:'complete',choice:'review-defer'});p.migrateFromMission({stage:'complete',choice:'review-defer'});assert.ok(p.get().achievements.includes('mission-complete'));assert.equal(p.xp(),R.XP.completeMission)});
// ---------------------------------------------------------------- guidance + hints
await test('guidance: every active stage has a reachable target; none after the mission',()=>{for(const [s,k] of [['monitor','field'],['research','door'],['command','door'],['nextShift','door']])assert.equal(G.guideTarget(s,null,'en').kind,k);for(const s of ['ready','debrief','complete'])assert.equal(G.guideTarget(s,null,'en').kind,'none')});
await test('guidance: wrong room → exit; goal room → equipment (no stale targets)',()=>{assert.equal(G.guideTarget('command','power','en').kind,'exit');assert.equal(G.guideTarget('command','command','en').kind,'equipment');assert.equal(G.guideTarget('monitor','research','en').kind,'exit')});
await test('hints: four ordered levels in both languages, categories goal→nav→control→science',()=>{for(const s of ['ready','monitor','research','command','nextShift','debrief','complete'])for(const l of ['en','ar']){const h=G.hintLadder(s,null,l);assert.deepEqual(h.map(x=>x.level),[0,1,2,3]);assert.deepEqual(h.map(x=>x.category),['goal','nav','control','science']);assert.ok(h.every(x=>x.text.length>3))}});
await test('hints: science hints never name a plan as the right answer',()=>{for(const l of ['en','ar'])for(const s of Object.keys(C.HINTS)){const t=C.HINTS[s].science[l];assert.ok(!/choose a|pick a|اختار أ|اختار ب/i.test(t),t)}});
await test('hints: navigation hints only name buildings that exist',()=>{const names=['Research Lab','Command Hub','Communications','Habitat','field terminal'];for(const s of Object.keys(C.HINTS))for(const n of (C.HINTS[s].nav.en.match(/Research Lab|Command Hub|Communications|Habitat|Oxygen Lab|Greenhouse|field terminal/g)||[]))assert.ok(names.includes(n),n)});
// ---------------------------------------------------------------- localization completeness
await test('localization: every Tx has non-empty English and Arabic',()=>{const walk=(o,path='')=>{if(o&&typeof o==='object'){if('en' in o&&'ar' in o&&Object.keys(o).length===2){assert.ok(o.en.trim()&&o.ar.trim(),path);assert.ok(/[\u0600-\u06FF]/.test(o.ar)||/^[A-Z0-9 ·.:()\-]+$/.test(o.ar)||o.ar===o.en,`${path} has no Arabic`);return}for(const [k,v] of Object.entries(o))walk(v,path+'.'+k)}};walk(C);walk(R.ACHIEVEMENTS);walk(R.TITLES);walk(R.CHALLENGES);for(const d of D.DISCOVERIES)for(const l of ['en','ar']){assert.ok(d.short(l).length>10);assert.ok(d.detail(l).length>10)}});
await test('localization: placeholders match between languages',()=>{const walk=o=>{if(o&&typeof o==='object'){if('en' in o&&'ar' in o){const a=(o.en.match(/\{\w+\}/g)||[]).sort().join(),b=(o.ar.match(/\{\w+\}/g)||[]).sort().join();assert.equal(a,b,o.en);return}Object.values(o).forEach(walk)}};walk(C)});
// ---------------------------------------------------------------- reading level (ages 7–12)
const JARGON=/µgy|utc|median|dataset|absorbed|dose.equivalent|exploratory|catalog|cme|provenance|anomal|interpretation|parameter|simulation|allocation/i;
const childLines=()=>{const out=[];const add=(t,where)=>{if(t&&t.en)out.push([t.en,where])};
  for(const [s,o] of Object.entries(C.OBJECTIVES))for(const k of ['task','why','intro'])add(o[k],`OBJECTIVES.${s}.${k}`);
  for(const [s,h] of Object.entries(C.HINTS))for(const k of ['nav','control','science'])add(h[k],`HINTS.${s}.${k}`);
  for(const [c,o] of Object.entries(C.CARDS))for(const [k,v] of Object.entries(o))if(!['axisX','axisY','count'].includes(k))add(v,`CARDS.${c}.${k}`);
  for(const [k,v] of Object.entries(C.NURI))add(v,`NURI.${k}`);
  for(const [k,v] of Object.entries(C.PROMPTS))add(v,`PROMPTS.${k}`);
  for(const a of Object.values(R.ACHIEVEMENTS))add(a.how,'ACHIEVEMENTS.how');
  for(const d of D.DISCOVERIES)out.push([d.short('en'),`DISCOVERY.${d.id}.short`]);
  return out};
await test('reading level: no jargon in anything a child reads first',()=>{for(const [t,w] of childLines())assert.ok(!JARGON.test(t),`${w}: "${t}"`)});
await test('reading level: short sentences (≤ 14 words each)',()=>{for(const [t,w] of childLines())for(const s of t.split(/(?<=[.!?])\s+/)){const n=s.split(/\s+/).filter(x=>/[A-Za-z0-9]/.test(x)).length;assert.ok(n<=14,`${w} (${n} words): "${s}"`)}});
await test('reading level: no decimals or big numbers in child text',()=>{for(const [t,w] of childLines())assert.ok(!/\d+\.\d+|\d{4,}|\d{1,3},\d{3}/.test(t.replace(/2024/g,'')),`${w}: "${t}"`)});

await server.close();
const failed=results.filter(r=>!r[1]);
console.log(`\n${results.length-failed.length}/${results.length} unit tests passed`);
process.exit(failed.length?1:0);
