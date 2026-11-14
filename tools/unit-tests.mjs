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
  assert.deepEqual(ex['solar-catalog'].counts,by['SCI-0003'].value.counts);
  assert.equal(ex['crop-education'].sourceOrganization,'Canadian Space Agency');assert.equal(ex['crop-education'].uncertainty,by['P2-CSA-01'].uncertainty);
  assert.equal(ex['mars-map'].value,by['P2-TREK-01'].value);assert.equal(ex['mars-map'].uncertainty,by['P2-TREK-01'].uncertainty)});
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

// ---------------------------------------------------------------- campaign missions
const SIM=await load('/src/game/base-sim.ts');
const CD=await load('/src/missions/campaign-data.ts');
const CE=await load('/src/missions/campaign.ts');
await test('campaign: 5 missions; every A/B option uses the research package decision design and its delayed flag',()=>{
  assert.equal(CD.CAMPAIGN.length,5);
  const f=resolve(pkg,'05_MISSION_EVIDENCE/decision_evidence.json');if(!existsSync(f)){console.log('    (skipped)');return}
  const de=Object.fromEntries(JSON.parse(readFileSync(f,'utf8')).map(d=>[d.decision_id,d]));
  for(const m of CD.CAMPAIGN){assert.deepEqual(m.options.map(o=>o.id),['A','B']);for(const o of m.options){assert.ok(de[o.decisionId],o.decisionId);assert.equal(o.flag,de[o.decisionId].delayed_effect.at_next_mission,o.decisionId)}}});
await test('campaign: every quiz has exactly one right answer, and every mission has a decision step',()=>{for(const m of CD.CAMPAIGN){assert.ok(m.steps.some(s=>s.decide),m.id);for(const s of m.steps)for(const sc of s.scenes)if(sc.quiz)assert.equal(sc.quiz.options.filter(o=>o.ok).length,1,sc.id)}});
await test('campaign: reward events exist for every quiz, mission and the finale',()=>{for(const m of CD.CAMPAIGN){assert.ok(R.REWARD_EVENTS['ev:mission-complete:'+m.id],m.id);for(const s of m.steps)for(const sc of s.scenes){if(sc.quiz)assert.ok(R.REWARD_EVENTS[sc.quiz.award],sc.quiz.award);if(sc.award)assert.ok(R.REWARD_EVENTS[sc.award],sc.award)}}assert.ok(R.REWARD_EVENTS['ev:campaign-complete'])});
// The engine's event order (src/missions/campaign.ts): M2, M3, day, [lamp fix], M4, day, [power check], M5, day, [rescue], M6, day.
const PATHS=[];for(const m1 of ['study','trip'])for(let k=0;k<32;k++)PATHS.push([m1,[...Array(5)].map((_,i)=>k>>i&1?'B':'A').join('')]);
function play(m1,c,pol={}){const E=[];let r;const cur=()=>SIM.replay(m1,E).base;
  E.push({t:'choose',m:'M2-LOG',o:c[0]});E.push({t:'choose',m:'M3-SUN',o:c[1]});E.push({t:'day'});
  if(SIM.lamps(cur())<2)E.push({t:'fix',o:pol.fix&&cur().power[pol.fix]?pol.fix:'keep'});
  E.push({t:'choose',m:'M4-PLANTS',o:c[2]});E.push({t:'day'});
  if(pol.power){for(const s of SIM.SLOTS)if(cur().power[s]&&!pol.power.includes(s))E.push({t:'toggle',slot:s});for(const s of pol.power)if(!cur().power[s])E.push({t:'toggle',slot:s})}
  E.push({t:'choose',m:'M5-POWER',o:c[3],...(pol.lend&&cur().power[pol.lend]?{sub:pol.lend}:{})});E.push({t:'day'});
  if(cur().rover==='stuck')E.push({t:'rescue',o:pol.rescue?'help':'leave',...(pol.lend&&cur().power[pol.lend]?{sub:pol.lend}:{})});
  E.push({t:'choose',m:'M6-PLAN',o:c[4]});E.push({t:'day'});
  r=SIM.replay(m1,E);return {E,base:r.base,out:SIM.outcome(r.base),reports:r.reports}}
const POWERS=[null,['lamp1','lamp2'],['lamp1','lamp2','monitor'],['lamp1','lamp2','watch'],['lamp1','monitor','watch'],['monitor','watch'],['lamp1','lamp2','monitor'].slice(0,2)];
const RANK={setback:0,continue:1,thrive:2};
function best(m1,c){let top=null;for(const fix of [null,'watch','monitor'])for(const power of POWERS)for(const rescue of [false,true])for(const lend of [null,'watch','monitor','lamp2']){const r=play(m1,c,{fix,power,rescue,lend});if(!top||RANK[r.out.kind]>RANK[top.out.kind])top={...r,pol:{fix,power,rescue,lend}}}return top}
const TALLY={none:{thrive:0,continue:0,setback:0},best:{thrive:0,continue:0,setback:0}};const ROWS=[];
for(const [m1,c] of PATHS){const n=play(m1,c),bst=best(m1,c);TALLY.none[n.out.kind]++;TALLY.best[bst.out.kind]++;ROWS.push({m1,c,none:n,best:bst})}
await test('ripple: the base starts with 3 blocks (2 lamps on, 1 spare), plants "growing"',()=>{const b=SIM.startBase('study');assert.equal(SIM.spare(b),1);assert.equal(SIM.lamps(b),2);assert.equal(b.plants,2)});
await test('ripple: the cost of a choice depends on earlier choices (M2 spare monitor → M3 watch screen turns a lamp off)',()=>{
  const a=SIM.replay('study',[{t:'choose',m:'M2-LOG',o:'A'},{t:'choose',m:'M3-SUN',o:'A'}]),b=SIM.replay('study',[{t:'choose',m:'M2-LOG',o:'B'},{t:'choose',m:'M3-SUN',o:'A'}]);
  assert.equal(a.base.power.lamp2,false);assert.equal(a.base.lampCause,'watch');assert.equal(b.base.power.lamp2,true);assert.equal(b.base.power.watch,true)});
await test('ripple: a dim greenhouse shrinks the plants next day; 2 lamps grow them; the watch screen checks the alert overnight',()=>{
  const r=SIM.replay('study',[{t:'choose',m:'M2-LOG',o:'A'},{t:'choose',m:'M3-SUN',o:'A'},{t:'day'}]);assert.equal(r.base.plants,1);assert.equal(r.base.alert,'checked');
  const g=SIM.replay('study',[{t:'choose',m:'M2-LOG',o:'B'},{t:'choose',m:'M3-SUN',o:'B'},{t:'day'}]);assert.equal(g.base.plants,3);assert.equal(g.base.alert,'mystery')});
await test('ripple: Mission 1 changes Mission 5 (rested robot scouts for free; a robot that learned the road is never stuck)',()=>{
  const sA=play('study','BBBAB'),tA=play('trip','BBBAB');assert.equal(sA.base.rover,'home');assert.equal(tA.base.rover,'home');
  assert.equal(play('study','BBBBB').base.rover,'stuck');assert.equal(play('trip','BBBBB').base.rover,'home');
  const lend=SIM.replay('trip',[{t:'choose',m:'M2-LOG',o:'A'},{t:'choose',m:'M3-SUN',o:'B'},{t:'day'},{t:'choose',m:'M4-PLANTS',o:'A'},{t:'day'},{t:'choose',m:'M5-POWER',o:'A',sub:'lamp1'}]);
  assert.equal(lend.base.power.lamp1,false);assert.equal(lend.base.lampCause,'rover');const back=SIM.step(lend.base,{t:'day'});assert.equal(back.base.power.lamp1,true)});
await test('ripple: a stuck robot can be rescued (borrows a block for one day); leaving it keeps a problem open',()=>{
  const h=play('study','BBBBA',{rescue:true}),l=play('study','BBBBA');assert.ok(!h.out.open.includes('rover'));assert.ok(l.out.open.includes('rover'))});
await test('ripple: fix events only work when a lamp is dark and the chosen machine is on',()=>{const b=SIM.startBase('study');assert.deepEqual(SIM.step(b,{t:'fix',o:'watch'}).base,b);
  const r=SIM.replay('study',[{t:'choose',m:'M2-LOG',o:'A'},{t:'choose',m:'M3-SUN',o:'A'},{t:'day'},{t:'fix',o:'watch'}]);assert.equal(r.base.power.watch,false);assert.equal(r.base.power.lamp2,true)});
await test('ripple: the power check never exceeds 3 blocks',()=>{let b=SIM.startBase('study');for(const s of ['monitor','watch','lamp1','monitor'])b=SIM.step(b,{t:'toggle',slot:s}).base;assert.ok(SIM.used(b)<=3)});
await test('ripple: all 64 main paths finish, deterministically, with a valid base',()=>{assert.equal(ROWS.length,64);for(const r of ROWS){const again=play(r.m1,r.c);assert.deepEqual(again.base,r.none.base);assert.ok(r.none.base.plants>=0&&r.none.base.plants<=4);assert.ok(SIM.used(r.none.base)<=3);assert.equal(r.none.reports.length,4)}});
await test('ripple: all three endings are reached by main paths with no recovery',()=>{for(const k of ['thrive','continue','setback'])assert.ok(TALLY.none[k]>0,k+' '+JSON.stringify(TALLY))});
await test('ripple: no unwinnable path — with recovery every path reaches at least "continues", most reach "thrives"',()=>{assert.equal(TALLY.best.setback,0,JSON.stringify(TALLY));assert.ok(TALLY.best.thrive>=48,JSON.stringify(TALLY));
  assert.ok(ROWS.filter(r=>r.none.out.kind==='setback'&&r.best.out.kind==='thrive').length>=10,'recovery turns setbacks into thriving bases')});
await test('ripple: recovery example — careful science (AAAAA) dims the greenhouse; moving the watch screen power back to the lamp saves it',()=>{
  const k=play('study','AAAAA'),f=play('study','AAAAA',{fix:'watch'});assert.equal(k.out.kind,'setback');assert.equal(f.out.kind,'thrive');assert.ok(f.base.plants>k.base.plants)});
await test('ripple: different decisions give different bases (choices are not just text)',()=>{const keys=new Set(ROWS.map(r=>JSON.stringify(r.none.base)));assert.ok(keys.size>=40,keys.size)});
await test('campaign save: v1 saves migrate to the event history; bad events dropped; duplicate choices ignored',()=>{
  const v1=CE.sanitizeCampaign({version:1,started:true,index:2,step:0,choices:{'M2-LOG':'A','M3-SUN':'Z'},meters:{power:1}});
  assert.equal(v1.version,2);assert.deepEqual(v1.events.filter(e=>e.t==='choose').map(e=>e.o),['A','A']);assert.equal(v1.events.filter(e=>e.t==='day').length,1);
  const v2=CE.sanitizeCampaign({version:2,started:true,index:1,step:0,m1:'trip',events:[{t:'choose',m:'M2-LOG',o:'B'},{t:'choose',m:'M2-LOG',o:'A'},{t:'hack'},{t:'toggle',slot:'x'},{t:'day'}]});
  assert.equal(v2.m1,'trip');assert.equal(v2.events.length,2);assert.equal(v2.events[0].o,'B');
  const gap=CE.sanitizeCampaign({version:2,started:true,index:3,events:[{t:'choose',m:'M2-LOG',o:'B'}]});assert.equal(gap.index,1);
  assert.deepEqual(CE.sanitizeCampaign(null),CE.freshCampaign())});
console.log('    endings, no recovery:',JSON.stringify(TALLY.none),' best recovery:',JSON.stringify(TALLY.best));
await test('campaign evidence: notebook rows and the gap are real rows from the original NASA CSVs',()=>{
  const ev=JSON.parse(readFileSync('src/science/campaign-evidence-v1.json','utf8'));
  const d=ev.log.duplicate,csvp=resolve(pkg,d.sourceRecord);if(!existsSync(csvp)){console.log('    (skipped)');return}
  const lines=readFileSync(csvp,'utf8').trim().split(/\r?\n/).map(l=>l.replaceAll('"',''));
  for(const r of [d.before,d.a,d.b])assert.ok(lines.some(l=>l.startsWith(r.join(','))),r.join(','));assert.equal(d.a[0],d.b[0]);assert.notEqual(d.a[2],d.b[2]);
  const g=ev.log.gap,l24=readFileSync(resolve(pkg,g.sourceRecord),'utf8').trim().split(/\r?\n/).map(l=>l.replaceAll('"','').split(',')[0]);
  const i=l24.indexOf(g.before.at(-1)[0]);assert.equal(l24[i+1],g.after[0][0]);assert.equal(Math.round((Date.parse(g.after[0][0]+'Z')-Date.parse(g.before.at(-1)[0]+'Z'))/60000),g.minutes);
  const fd=Object.fromEntries(JSON.parse(readFileSync(resolve(pkg,'04_VERIFIED_DISCOVERIES/scientific_findings.json'),'utf8')).map(x=>[x.id,x]));
  assert.equal(ev.log.conflictingRows,fd['P2-RAD-08'].value);assert.deepEqual(ev.sun.counts,fd['SCI-0003'].value.counts);assert.equal(ev.sun.strongest.class,'X8.7');assert.deepEqual(ev.plants.groups,fd['P2-OSD-615'].value.groups)});
await test('campaign text: both languages, short sentences, no jargon, never safe/unsafe',()=>{
  const lines=[];const add=(t,w)=>{if(!t||!t.en&&!t.ar)return;assert.ok(t.en.trim()&&/[\u0600-\u06FF]/.test(t.ar),w);lines.push([t.en,w])};
  for(const m of CD.CAMPAIGN){add(m.title,m.id);add(m.brief,m.id);add(m.lesson,m.id);add(m.think,m.id);for(const s of m.steps){add(s.task,s.id);add(s.where,s.id);for(const sc of s.scenes){add(sc.say,sc.id);if(sc.quiz)for(const o of sc.quiz.options){add(o.label,sc.id);add(o.fb,sc.id)}}}const bases=ROWS.slice(0,64).map(r=>r.none.base);for(const o of m.options){add(o.title,o.decisionId);add(o.now,o.decisionId);for(const k of ['gain','cost','later'])if(o[k])for(const bb of bases)add(CD.dyn(o[k],bb),o.decisionId)}}
  const walk=(x,w)=>{if(x&&typeof x==='object'){if('en' in x&&'ar' in x)add(x,w);else for(const [k,v] of Object.entries(x))walk(v,w+'.'+k)}};walk(CD.C_UI,'C_UI');walk(CD.STAGE_SAY,'stage');walk(CD.STAGE_NAME,'stageName');walk(CD.CAUSE,'cause');walk(CD.SLOT_NAMES,'slot');walk(CD.SLOT_HINTS,'slotHint');
  for(const [t,w] of lines){assert.ok(!JARGON.test(t),`${w}: ${t}`);assert.ok(!/\bunsafe\b|\bsafe\b|\bsafety\b|\bdanger/i.test(t),`${w}: ${t}`);for(const s of t.split(/(?<=[.!?])\s+/))assert.ok(s.split(/\s+/).length<=16,`${w}: "${s}"`)}});

const CO=await load('/src/content/companion.ts');
await test('companion: every line in English and Arabic, short sentences, no jargon, no "safe"',()=>{const lines=[];const walk=(x,w)=>{if(x&&typeof x==='object'){if('en' in x&&'ar' in x){assert.ok(x.en.trim()&&/[\u0600-\u06FF]/.test(x.ar),w);lines.push([x.en,w])}else for(const [k,v] of Object.entries(x))walk(v,w+'.'+k)}};
  for(const [k,v] of Object.entries(CO))walk(v,k);assert.ok(lines.length>=40,lines.length);
  for(const [t,w] of lines){assert.ok(!JARGON.test(t),w+': '+t);assert.ok(!/\bunsafe\b|\bsafe\b|\bdanger/i.test(t),w);for(const s of t.split(/(?<=[.!?])\s+/))assert.ok(s.split(/\s+/).length<=14,w+': '+s)}});
await test('companion: the Ripple Effect line says exactly what was asked, and no line tells which plan wins',()=>{
  assert.equal(CO.TOUR.ripple1.en,'Be careful, Commander! Every choice creates a ripple. Your decisions shape how our mission ends!');
  for(const t of [...Object.values(CO.TOUR),...Object.values(CO.TIP)])assert.ok(!/plan (a|b)\b|best (plan|choice)|right (plan|choice)|choose (a|b)\b/i.test(t.en),t.en)});

await server.close();
const failed=results.filter(r=>!r[1]);
console.log(`\n${results.length-failed.length}/${results.length} unit tests passed`);
process.exit(failed.length?1:0);
