// Builds the Nuri voice package (ElevenLabs-ready) from the game's own text. Reads source only; changes nothing.
//   node tools/voice/build-voice-package.mjs   → voice-package/ (CSV, JSON, reference CSV, README, report) + ZIP
// Every English text object in the game is classified as "voiced" (Nuri or narration) or "on-screen only".
// The build fails if any text object is unclassified, if a voiced line is not found verbatim in the cited
// source, or if a placeholder is left unfilled.
import {createServer} from 'vite';
import {readFileSync,writeFileSync,mkdirSync,rmSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
const OUT=resolve('voice-package');
const server=await createServer({server:{middlewareMode:true,hmr:false,watch:null},appType:'custom',logLevel:'error',optimizeDeps:{noDiscovery:true,include:[]}});
const L=p=>server.ssrLoadModule(p);
const S=await L('/src/content/strings.ts'),D=await L('/src/content/discoveries.ts'),R=await L('/src/game/rewards.ts'),CD=await L('/src/missions/campaign-data.ts');
const CO=await L('/src/content/companion.ts');
const W=await L('/src/world-data.ts'),SIM=await L('/src/game/base-sim.ts'),SER=await L('/src/science/series.ts'),MS=await L('/src/science/mission.ts');
await server.close();
const SRC={companion:'src/content/companion.ts',strings:'src/content/strings.ts',disc:'src/content/discoveries.ts',rewards:'src/game/rewards.ts',cdata:'src/missions/campaign-data.ts',world:'src/world-data.ts',campaign:'src/missions/campaign.ts',guidance:'src/game/guidance.ts'};
const srcText=Object.fromEntries(Object.entries(SRC).map(([k,f])=>[k,readFileSync(f,'utf8')]));
const fill=(t,v={})=>t.replace(/\{(\w+)\}/g,(m,k)=>k in v?String(v[k]):m);
const en=t=>t.en;
const BN=Object.fromEntries(W.BUILDINGS.map(b=>[b.id,b.name]));
const MTITLE=['The Rover Reading',...CD.CAMPAIGN.map(m=>m.title.en)];
const mName=i=>`Mission ${i+1} · ${MTITLE[i]}`;

// ---------------------------------------------------------------- entries
const lines=new Map();   // text → entry (one audio file per unique text)
const usedPaths=new Set(),refRows=[];
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
function add(text,{id,speaker='Nuri',category,voice='required',mission,where,trigger,source,key,condition}){
  if(!text||!text.trim())return;
  if(/\{\w+\}/.test(text))throw Error(`unfilled placeholder in ${id}: ${text}`);
  let e=lines.get(text);
  if(!e){e={id,file:`nuri_${slug(id.replace(/^nuri\./,''))}.mp3`,text,speaker,category,voice,usages:[]};if(speaker==='Narrator')e.file=`narration_${slug(id)}.mp3`;lines.set(text,e)}
  else if(voice==='required')e.voice='required';
  e.usages.push({mission:mission||'Any',where,trigger,source,key,...(condition?{condition}:{})});
  return e;
}
const mark=p=>usedPaths.add(p);
// source check: every voiced template must appear verbatim in its source file
const checks=[];const needSrc=(file,template)=>checks.push([file,template]);

// ---------------------------------------------------------------- Mission 1 (The Rover Reading) cards
const M1=mName(0),C=S.CARDS;
const M1_CARD={brief:['After START MISSION','Player presses START MISSION (or PLAY AGAIN)'],
  rover:['Field terminal (glowing screen outside, near the start)','E at the field terminal, page 1'],rad:['Field terminal','page 2'],chart:['Field terminal','page 3 (the real-data chart)'],goResearch:['Field terminal','page 4 ("what next")'],
  compare:['Research Lab machine','page 1'],outside:['Research Lab machine','page 2'],why:['Research Lab machine','page 3'],many:['Research Lab machine','page 4'],goCommand:['Research Lab machine','page 5'],
  choose:['Command Hub machine','page 1 (the A/B plan choice)'],explain:['Command Hub machine','page 2, right after choosing'],now:['Command Hub machine','page 3'],goComms:['Command Hub machine','page 4'],
  later:['Communications machine','page 1'],unchanged:['Communications machine','page 2'],bigIdea:['Debrief (MISSION button after Communications)','page 1'],q1:['Debrief','page 2 (question)'],q2:['Debrief','page 3 (question)'],done:['Debrief','page 4 (rewards)'],
  status:['Mission tracker button (top-left) during the mission','Player clicks the task line']};
const M1_KEY={say:'Nuri\'s main line when the page opens',more:'"Tell me more" line (opens automatically in Independent mode)',found:'After tapping the 4-hour window where the dots jump up (correct)',
  low:'After tapping a low, flat window (try again)',falling:'After tapping a window where the dots fall (try again)',aNow:'If the player chose A (Study first)',bNow:'If the player chose B (Go and check again)',
  aLater:'If the player chose A (Study first)',bLater:'If the player chose B (Go and check again)',other:'"Tell me more" — only after the player has tried both plans',none:'Rewards page when this play-through earned no new XP',
  f1:'After picking clue 1 (counts as right)',f2:'After picking clue 2 (counts as right)',f3:'After picking clue 3 (gentle correction)',right:'After answering No (right)',try:'After answering Yes (try again)',
  aF:'After answer a (right)',bF:'After answer b (try again)',cF:'After answer c (try again)'};
const M1_OPT={'decide.aTitle':'Plan A title','decide.aGain':'Plan A ✓ gain','decide.aCost':'Plan A ⏸ cost','decide.bTitle':'Plan B title','decide.bGain':'Plan B ✓ gain','decide.bCost':'Plan B ⏸ cost',
  'explain.c1':'Clue option 1','explain.c2':'Clue option 2','explain.c3':'Clue option 3','q1.yes':'Answer button','q1.no':'Answer button','q2.a':'Answer a','q2.b':'Answer b','q2.c':'Answer c'};
// numbers that the game fills in on Mission 1 cards (computed exactly like src/science/ui.ts does)
const PEAK=String(Math.round(SER.PEAK.v/10)*10),HOURS=String(Math.round(MS.evidence.derived.spanHours)),NCUT=String(SER.ABOVE_CUTOFF.length);
// possible run-XP totals on the rewards page: any subset of the Mission-1-run reward events (each paid once ever)
const runEvents=Object.entries(R.REWARD_EVENTS).filter(([k,v])=>v.xp&&!k.startsWith('ev:c-')&&!/mission-complete:M|campaign-complete/.test(k)).map(([k,v])=>R.XP[v.xp]);
let sums=new Set([0]);for(const x of runEvents){const n=new Set(sums);for(const s of sums)n.add(s+x);sums=n}sums.delete(0);const RUN_XP=[...sums].sort((a,b)=>a-b);
for(const [card,obj] of Object.entries(C)){
  if(card==='btn'||card==='stamp')continue;
  if(typeof obj.en==='string'){mark(`strings.CARDS.${card}`);refRows.push([`strings.CARDS.${card}`,obj.en,'Card button label']);continue}
  for(const [k,t] of Object.entries(obj)){const path=`strings.CARDS.${card}.${k}`;mark(path);
    const [where,trig]=M1_CARD[card]||['?','?'];const optKey=`${card}.${k}`;
    if(['unchanged.real','unchanged.game','chart.axisX','chart.axisY','chart.gap','many.line'].includes(optKey)){refRows.push([path,t.en,'Mission 1 chart / picture label']);continue}
    needSrc('strings',t.en);
    if(M1_OPT[optKey]){add(t.en,{id:`m1.${card}.${k}`,category:'choice_option',voice:'optional',mission:M1,where,trigger:`${M1_OPT[optKey]} on the ${trig} card (read aloud only if you add option narration)`,source:SRC.strings,key:`CARDS.${optKey}`});continue}
    const base={category:card==='done'||card==='status'?'card':'card',mission:M1,where,source:SRC.strings,key:`CARDS.${optKey}`};
    const trigger=`${trig} — ${M1_KEY[k]||k}`;
    if(card==='chart'&&k==='more'){add(fill(t.en,{peak:PEAK}),{...base,id:'m1.chart.more',trigger,condition:`peak = ${PEAK} (rounded highest reading)`});continue}
    if(card==='many'&&k==='say'){add(fill(t.en,{h:HOURS}),{...base,id:'m1.many.say',trigger,condition:`h = ${HOURS}`});continue}
    if(card==='many'&&k==='more'){add(fill(t.en,{n:NCUT}),{...base,id:'m1.many.more',trigger,condition:`n = ${NCUT}`});continue}
    if(card==='done'&&k==='say'){for(const x of RUN_XP)add(fill(t.en,{xp:x}),{...base,id:`m1.done.say.xp${x}`,trigger,condition:`XP earned in this play-through = ${x}`});continue}
    if(card==='status'){for(const st of ['monitor','research','command','nextShift']){const o=S.OBJECTIVES[st];add(fill(t.en,{task:o.task.en,where:o.where.en}),{...base,id:`m1.status.${st}`,trigger,condition:`stage = ${st}`})}continue}
    add(t.en,{...base,id:`m1.${card}.${k}`,trigger});
  }
}
// ---------------------------------------------------------------- stage objectives (spoken intro) + tracker text
const STAGE_TRIG={ready:'HUD at first load / after the intro (3.6 s after "Welcome to Mars")',monitor:'Nuri says it when the mission starts (START MISSION)',research:'After finishing the field terminal pages',command:'After finishing the Research Lab pages',
  nextShift:'When the Command Hub card is closed after the plan choice',debrief:'After finishing the Communications pages',complete:'After FINISH on the debrief'};
for(const [st,o] of Object.entries(S.OBJECTIVES)){
  mark(`strings.OBJECTIVES.${st}.intro`);needSrc('strings',o.intro.en);
  add(o.intro.en,{id:`m1.stage.${st}.intro`,category:'dialogue',mission:M1,where:'Nuri dialogue box (bottom-left HUD)',trigger:STAGE_TRIG[st]+'; also shown when switching language',source:SRC.strings,key:`OBJECTIVES.${st}.intro`});
  for(const k of ['task','where','why']){mark(`strings.OBJECTIVES.${st}.${k}`);refRows.push([`strings.OBJECTIVES.${st}.${k}`,o[k].en,'Mission tracker text (top-left)'])}
  add(`${o.task.en} · ${o.where.en}`,{id:`m1.hint.${st}.goal`,category:'hint',mission:M1,where:'Help panel (H) — level GOAL',trigger:`Player opens help in stage "${st}" with no card open`,source:SRC.guidance,key:'hintLadder goalText = task · where'});
}
for(const [st,h] of Object.entries(S.HINTS))for(const k of ['nav','control','science']){mark(`strings.HINTS.${st}.${k}`);needSrc('strings',h[k].en);
  add(h[k].en,{id:`m1.hint.${st}.${k}`,category:'hint',mission:M1,where:`Help panel (H) — level ${k==='nav'?'WHERE?':k==='control'?'HOW?':'THINK'}`,trigger:`Stage "${st}", help opened in the world${k==='science'?' (also shown as THINK inside cards)':''}`,source:SRC.strings,key:`HINTS.${st}.${k}`})}
for(const [card,h] of Object.entries(S.CARD_HINTS))for(const k of ['goal','nav','control']){mark(`strings.CARD_HINTS.${card}.${k}`);needSrc('strings',h[k].en);
  add(h[k].en,{id:`m1.cardhint.${card}.${k}`,category:'hint',mission:M1,where:`Help panel opened from inside a Mission 1 card ("${card}" pages) — level ${k.toUpperCase()}`,trigger:'Player presses H or "?" while a Mission 1 card is open',source:SRC.strings,key:`CARD_HINTS.${card}.${k}`})}
for(const [t,trig] of [['Walk to the exit at the bottom of this room, then follow the yellow beacon.','Help WHERE? while inside the wrong building'],['The field terminal is outside. Walk to the exit at the bottom of this room.','Help WHERE? while inside a building during the field-terminal stage'],['You are in the right place!','Help WHERE? when already in the goal building']]){
  needSrc('guidance',t);add(t,{id:'hint.'+slug(t).slice(0,40),category:'hint',mission:M1,where:'Help panel — level WHERE?',trigger:trig,source:SRC.guidance,key:'hintLadder inline text'})}
// ---------------------------------------------------------------- help panel + Nuri world lines
for(const [k,t] of Object.entries(S.HELP)){const path=`strings.HELP.${k}`;
  if(k==='levels'){t.forEach((x,i)=>{mark(`${path}.${i}`);refRows.push([`${path}.${i}`,x.en,'Help panel level label'])});continue}mark(path);
  if(k==='offer'){needSrc('strings',t.en);add(t.en,{id:'help.offer',category:'dialogue',where:'Nuri dialogue box',trigger:'After a long time with no progress, or 2 visits to the wrong building',source:SRC.strings,key:'HELP.offer'});continue}
  if(k==='noMore'||k==='noPenalty'){needSrc('strings',t.en);add(t.en,{id:'help.'+k,category:'dialogue',voice:'unused',where:'(not shown in the current build)',trigger:'Defined in the text file but no code shows it yet — record only if you want it ready',source:SRC.strings,key:'HELP.'+k});continue}
  refRows.push([path,t.en,'Help panel button / title'])}
const NURI_TRIG={miss:'Player presses E twice with nothing nearby (within 20 s)',arrivedInside:'Player walks into the building the mission needs (Mission 1 and the base missions)',arrivedNear:'Guided mode: the player first gets near the goal outdoors',
  lockStart:'E on a mission machine or the field terminal before START MISSION',lockResearch:'E on the Research Lab machine too early',lockCommand:'E on the Command Hub machine too early',lockComms:'E on the Communications machine too early',
  xpIntro:'2.8 s after the very first XP reward (once)',allPlaces:'1.8 s after visiting the last of the 9 buildings (once)',back:'Walking back outside when no mission step is waiting',exhibitIntro:'(not shown in the current build)',celebrate:'(not shown in the current build)'};
const PLACE_IDS=W.BUILDINGS.map(b=>b.id);
const M1_GOALS=['research','command','comms'],C_GOALS=[...new Set(CD.CAMPAIGN.flatMap(m=>m.steps.map(s=>s.building)).filter(b=>b!=='rover'))];
const TASKS=[...['monitor','research','command','nextShift'].map(s=>[S.OBJECTIVES[s].task.en,M1]),...CD.CAMPAIGN.flatMap((m,i)=>m.steps.map(s=>[s.task.en,mName(i+1)]))];
for(const [k,t] of Object.entries(S.NURI)){const path=`strings.NURI.${k}`;mark(path);needSrc('strings',t.en);const base={category:'dialogue',where:'Nuri dialogue box (bottom-left HUD)',source:SRC.strings,key:`NURI.${k}`};
  if(k==='wrongPlace'){for(const tg of [...new Set([...M1_GOALS,...C_GOALS])])for(const nm of PLACE_IDS)if(nm!==tg)add(fill(t.en,{name:BN[nm],target:BN[tg]}),{...base,id:`nuri.wrongplace.${nm}.to.${tg}`,mission:M1_GOALS.includes(tg)&&C_GOALS.includes(tg)?'Mission 1 + base missions':M1_GOALS.includes(tg)?M1:'Base missions (2–6)',trigger:`Player enters the ${BN[nm]} while the mission needs the ${BN[tg]}`});continue}
  if(k==='wrongPlaceField'){for(const nm of PLACE_IDS)add(fill(t.en,{name:BN[nm]}),{...base,id:`nuri.wrongplacefield.${nm}`,mission:M1,trigger:`Player enters the ${BN[nm]} while the mission needs the field terminal outside`});continue}
  if(k==='detour'){for(const [task,mm] of TASKS)add(fill(t.en,{task}),{...base,id:`nuri.detour.${slug(task)}`,mission:mm,trigger:'Back outside with a step waiting (Guided mode), or right after a "what next" card'});continue}
  if(k==='reviewDone'){for(const st of ['command','nextShift','debrief','complete'])add(fill(t.en,{where:S.OBJECTIVES[st].where.en}),{...base,id:`nuri.reviewdone.${st}`,mission:M1,trigger:`E on a Mission 1 machine already finished, stage "${st}" (review mode)`});continue}
  if(k==='inside'){for(const b of W.BUILDINGS)add(fill(t.en,{name:b.name,note:b.note}),{...base,id:`nuri.inside.${b.id}`,trigger:`Player enters the ${b.name} when no mission step is waiting (before START, during debrief, after the mission)`});continue}
  add(t.en,{...base,id:`nuri.${k}`,voice:k==='exhibitIntro'||k==='celebrate'?'unused':'required',mission:/lock/.test(k)?M1:undefined,trigger:NURI_TRIG[k]||k});
}
for(const b of W.BUILDINGS){needSrc('world',b.note);if(!['research','command','comms'].includes(b.id))add(b.note,{id:`nuri.note.${b.id}`,category:'dialogue',where:`Nuri dialogue box, inside the ${b.name}`,trigger:`E on the big machine in the ${b.name} when it is not a mission step`,source:SRC.world,key:`BUILDINGS.${b.id}.note`})}
// intro
for(const [k,t] of Object.entries(S.INTRO)){const path=`strings.INTRO.${k}`;
  if(k==='captions'){for(const [c,x] of Object.entries(t)){mark(`${path}.${c}`);needSrc('strings',x.en);add(x.en,{id:`intro.caption.${c}`,speaker:'Narrator',category:'cinematic_caption',voice:'optional',mission:'Opening cinematic',where:'Caption at the bottom of the opening cinematic',trigger:`Cinematic caption "${c}" (order: dream, years, future, days, weeks, months, mars)`,source:SRC.strings,key:`INTRO.captions.${c}`})}continue}
  mark(path);if(k==='welcome'){needSrc('strings',t.en);add(t.en,{id:'intro.welcome',category:'dialogue',mission:'Opening cinematic',where:'Nuri dialogue box, as Nuri flies in at the end of the cinematic',trigger:'End of the opening cinematic (also after Skip)',source:SRC.strings,key:'INTRO.welcome'});continue}
  refRows.push([path,t.en,'Title screen / cinematic button'])}
// bonus facts
for(const d of D.DISCOVERIES){const t=d.short('en');mark(`disc.DISCOVERIES.${D.DISCOVERIES.indexOf(d)}.title`);mark(`disc.DISCOVERIES.${D.DISCOVERIES.indexOf(d)}.where`);
  refRows.push([`disc.${d.id}.title`,d.title.en,'Discovery card title']);refRows.push([`disc.${d.id}.where`,d.where.en,'Discovery card: where it is found']);needSrc('disc',t);
  if(d.kind==='exhibit')add(t,{id:`exhibit.${d.id}`,category:'bonus_fact',where:`Bonus-fact screen: ${d.where.en}`,trigger:'E at the floating bonus-fact icon inside the building (also the Passport → Discoveries card)',source:SRC.disc,key:`DISCOVERIES ${d.id}.short`});
  else add(t,{id:`discovery.${d.id}`,category:'passport',voice:'optional',mission:M1,where:'Science Passport (J) → Discoveries → card',trigger:'Player opens this discovery card in the Passport (collected during Mission 1)',source:SRC.disc,key:`DISCOVERIES ${d.id}.short`})}
// ---------------------------------------------------------------- base missions (2–6)
const KIND_TRIG={say:'Nuri\'s main line when the page opens',more:'"Tell me more" line'};
for(const [i,m] of CD.CAMPAIGN.entries()){const mm=mName(i+1),P=`cdata.CAMPAIGN.${i}`;
  for(const k of ['title']){mark(`${P}.${k}`);refRows.push([`${P}.${k}`,m[k].en,'Mission title (tracker, Passport)'])}
  mark(`${P}.brief`);needSrc('cdata',m.brief.en);add(m.brief.en,{id:`m${i+2}.brief`,category:'dialogue',mission:mm,where:'Nuri dialogue box',trigger:i===0?'4.2 s after NEXT MISSION (after the "Remember Mission 1?" line)':'Right after the previous mission\'s lesson card (NEXT MISSION)',source:SRC.cdata,key:`CAMPAIGN[${i}].brief`});
  mark(`${P}.think`);needSrc('cdata',m.think.en);add(m.think.en,{id:`m${i+2}.hint.think`,category:'hint',mission:mm,where:'Help panel (H) — level THINK',trigger:'Help opened during this mission',source:SRC.cdata,key:`CAMPAIGN[${i}].think`});
  mark(`${P}.lesson`);needSrc('cdata',m.lesson.en);add(m.lesson.en,{id:`m${i+2}.lesson`,category:'card',mission:mm,where:'Lesson card (last page after the plan choice)',trigger:'After the "You chose…" page; Nuri\'s main line',source:SRC.cdata,key:`CAMPAIGN[${i}].lesson`});
  m.steps.forEach((st,j)=>{const SP=`${P}.steps.${j}`,place=st.building==='rover'?'the stuck robot by the rocks (outside, bottom-right)':BN[st.building];
    mark(`${SP}.task`);mark(`${SP}.where`);refRows.push([`${SP}.task`,st.task.en,'Mission tracker task']);refRows.push([`${SP}.where`,st.where.en,'Mission tracker place']);
    add(`${st.task.en} · ${st.where.en}`,{id:`m${i+2}.hint.${st.id}.goal`,category:'hint',mission:mm,where:'Help panel (H) — level GOAL',trigger:`Help opened during step "${st.id}"${st.when?' (only if the robot is stuck)':''}`,source:SRC.campaign,key:'hints() goal = task · where'});
    st.scenes.forEach((sc,k)=>{const XP=`${SP}.scenes.${k}`,where=`${place} — card "${sc.id}"`,cond=sc.when?(sc.id==='fix'?'Only when a greenhouse lamp is dark':'Conditional'):undefined;
      for(const f of ['say','more'])if(sc[f]){mark(`${XP}.${f}`);if(!sc[f].en)continue;needSrc('cdata',sc[f].en);
        add(sc[f].en,{id:`m${i+2}.${st.id}.${sc.id}.${f}`,category:'card',mission:mm,where,trigger:`E at ${place}; ${KIND_TRIG[f]}`,source:SRC.cdata,key:`CAMPAIGN[${i}].steps[${j}].scenes[${k}].${f}`,condition:cond})}
      if(sc.quiz)sc.quiz.options.forEach((o,q)=>{mark(`${XP}.quiz.options.${q}.label`);mark(`${XP}.quiz.options.${q}.fb`);needSrc('cdata',o.label.en);needSrc('cdata',o.fb.en);
        add(o.label.en,{id:`m${i+2}.${sc.id}.answer${q+1}`,category:'choice_option',voice:'optional',mission:mm,where,trigger:`Answer button ${q+1}`,source:SRC.cdata,key:`…scenes[${k}].quiz.options[${q}].label`});
        add(o.fb.en,{id:`m${i+2}.${sc.id}.answer${q+1}.feedback`,category:'quiz_feedback',mission:mm,where,trigger:`After tapping answer ${q+1} (${o.ok?'right':'try again'})`,source:SRC.cdata,key:`…scenes[${k}].quiz.options[${q}].fb`})})});
  });
  // plan options (title/gain/cost/now/later; some depend on the base)
  const bases={spare:SIM.startBase('study'),noSpare:SIM.replay('study',[{t:'choose',m:'M2-LOG',o:'A'}]).base,trip:SIM.startBase('trip'),tripNoSpare:SIM.replay('trip',[{t:'choose',m:'M2-LOG',o:'A'}]).base,
    stuck:{...SIM.startBase('study'),rover:'stuck'},known:{...SIM.startBase('trip'),rover:'home'}};
  const COND={spare:'a spare power block is free',noSpare:'no spare block (the spare monitor from Mission 2 is using it)',trip:'Mission 1 was "Go and check again" and a spare block is free',tripNoSpare:'Mission 1 was "Go and check again" and no block is spare',
    stuck:'the robot got stuck (Mission 1 was "Study first")',known:'the robot knew the road (Mission 1 was "Go and check again")'};
  m.options.forEach((o,q)=>{const OP=`${P}.options.${q}`,lab=`Plan ${o.id} (${o.decisionId})`;
    mark(`${OP}.title`);needSrc('cdata',o.title.en);add(o.title.en,{id:`m${i+2}.plan${o.id}.title`,category:'choice_option',voice:'optional',mission:mm,where:'Plan choice card',trigger:`${lab} title`,source:SRC.cdata,key:`CAMPAIGN[${i}].options[${q}].title`});
    for(const f of ['gain','cost','later']){const v=o[f];if(!v)continue;
      const variants=new Map();if(typeof v==='function'){for(const [bk,b] of Object.entries(bases)){const t=v(b).en;if(!variants.has(t))variants.set(t,[]);variants.get(t).push(COND[bk])}}else{mark(`${OP}.${f}`);variants.set(v.en,null)}
      [...variants].forEach(([t,conds],vi)=>{needSrc('cdata',t);const id=`m${i+2}.plan${o.id}.${f}${variants.size>1?'.v'+(vi+1):''}`;
        if(f==='later')add(t,{id,category:'consequence',mission:mName(i+2),where:'First card of the next mission ("Because you chose…")',trigger:`The next mission starts after ${lab} was chosen in ${mm}`,source:SRC.cdata,key:`CAMPAIGN[${i}].options[${q}].later`,condition:conds?.join(' / ')});
        else add(t,{id,category:'choice_option',voice:'optional',mission:mm,where:'Plan choice card',trigger:`${lab} ${f==='gain'?'✓ gain':'⏸ cost'} line`,source:SRC.cdata,key:`CAMPAIGN[${i}].options[${q}].${f}`,condition:conds?.join(' / ')})})}
    mark(`${OP}.now`);needSrc('cdata',o.now.en);add(o.now.en,{id:`m${i+2}.plan${o.id}.now`,category:'consequence',mission:mm,where:'"You chose…" card + Nuri dialogue box',trigger:`Immediately after choosing ${lab}`,source:SRC.cdata,key:`CAMPAIGN[${i}].options[${q}].now`});
  });
}
// ---------------------------------------------------------------- base-mission shared lines (C_UI etc.)
const CU=CD.C_UI,BASE='Base missions (2–6)';
const CUI_VOICE={
  remember:['card','First card of each mission 3–6','"Tell me more" under "Because you chose…"'],rememberM1:['card','First card of Mission 2','"Tell me more" under the Mission 1 line'],
  choose:['card','Plan choice card (missions 2–6)','Nuri\'s main line'],pretendMore:['card','Plan choice card','"Tell me more" line'],
  day:['card','"New day" card at the start of missions 4, 5, 6','First part of Nuri\'s line (followed by grew / shrank / shrank0)'],
  grew:['card','"New day" card','Second part of the line, if the plants grew (2 lamps on)'],shrank:['card','"New day" card','Second part, if the plants shrank with 1 lamp on'],shrank0:['card','"New day" card','Second part, if the plants shrank with both lamps off'],
  boost:['card','"New day" card','"Tell me more": the control tray gave extra growth'],returned:['card','"New day" card','"Tell me more": a borrowed block came back'],checked:['card','"New day" card','"Tell me more": the watch screen identified the flare'],
  fixed:['consequence','Greenhouse "fix" card + Nuri dialogue box','After choosing to turn off the watch screen or spare monitor (lamp back on)'],kept:['consequence','Greenhouse "fix" card + Nuri dialogue box','After choosing Keep the plan'],
  powerFull:['card','Power check card (Mission 5)','Tapping a light that is off when no block is spare'],borrow:['card','"Which light turns off?" card','Scout first or rescue needs a block and none is spare'],
  helped:['consequence','Rescue card + Nuri dialogue box','After sending the helper robot'],left:['consequence','Rescue card + Nuri dialogue box','After choosing Leave it for now'],
  nearDim:['world_reaction','Outside, at the Greenhouse door','Walking up to the Greenhouse with 1 lamp on (once per day)'],nearDark:['world_reaction','Outside, at the Greenhouse door','Walking up to the Greenhouse with both lamps off (once per day)'],
  nearBright:['world_reaction','Outside, at the Greenhouse door','Walking up to the Greenhouse with 2 lamps on (once per day)'],nearMonitor:['world_reaction','Outside, at the Research Lab door','Walking up while the spare monitor is on (once)'],
  nearWatch:['world_reaction','Outside, at the Communications door','Walking up while the watch screen is on (once)'],nearMystery:['world_reaction','Outside, at the Communications door','Walking up while the Sun alert is a mystery (once)'],
  nearStuck:['world_reaction','Outside, next to the stuck robot','Walking up to the stuck robot (once)'],
  shared:['ending_recap','Ending recap card — "How your choices led here" list','Plan A was chosen in Mission 6 and problems are still open'],
};
const CUI_OPT={fixWatch:'Fix option title',fixWatchOk:'Fix option ✓ (alert already checked)',fixWatchNo:'Fix option ⏸ (alert check stops)',fixMonitor:'Fix option title',fixMonitorNo:'Fix option ⏸',fixKeep:'Fix option title',fixKeepNo:'Fix option ⏸',fixGain:'Fix option ✓ gain',
  help:'Rescue option A title',helpGain:'Rescue option A ✓',leave:'Rescue option B title',leaveGain:'Rescue option B ✓',leaveCost:'Rescue option B ⏸'};
for(const [k,v] of Object.entries(CU)){const path=`cdata.C_UI.${k}`;
  if(k==='m1'){for(const [c,t] of Object.entries(v)){mark(`${path}.${c}`);needSrc('cdata',t.en);add(t.en,{id:`m2.mission1.${c}`,category:'consequence',mission:mName(1),where:'Nuri dialogue box at NEXT MISSION, then the first card of Mission 2',trigger:`Mission 1 was ${c==='study'?'A — Study first':'B — Go and check again'}`,source:SRC.cdata,key:`C_UI.m1.${c}`})}continue}
  if(k==='done'){mark(path);needSrc('cdata',v.en);add(fill(v.en,{xp:R.XP.completeMission}),{id:'base.lesson.xp',category:'card',mission:BASE,where:'Lesson card','trigger':'"Tell me more" on every base-mission lesson card',source:SRC.cdata,key:'C_UI.done',condition:`xp = ${R.XP.completeMission}`});continue}
  if(k==='endSay'||k==='endMore'){for(const [e,t] of Object.entries(v)){mark(`${path}.${e}`);needSrc('cdata',t.en);add(t.en,{id:`ending.${e}.${k==='endSay'?'say':'more'}`,category:'ending_recap',mission:'Ending',where:'Ending recap card (after the ending cinematic)'+(k==='endSay'?' + Nuri dialogue box':''),trigger:`Ending "${e}" — ${k==='endSay'?'Nuri\'s main line':'"Tell me more" line'}`,source:SRC.cdata,key:`C_UI.${k}.${e}`})}continue}
  if(k==='caps'){for(const [e,arr] of Object.entries(v))arr.forEach((t,n)=>{mark(`${path}.${e}.${n}`);needSrc('cdata',t.en);add(t.en,{id:`ending.${e}.caption${n+1}`,speaker:'Narrator',category:'cinematic_caption',voice:'optional',mission:'Ending',where:`Caption in the "${e}" ending cinematic`,trigger:`Ending "${e}", caption ${n+1} of 3 (about ${[0,4,8.5][n]} s in; times vary by ending)`,source:SRC.cdata,key:`C_UI.caps.${e}[${n}]`})});continue}
  if(k==='plantsWhy'){v.forEach((t,n)=>{mark(`${path}.${n}`);needSrc('cdata',t.en);add(t.en,{id:`ending.why.plants${n}`,category:'ending_recap',mission:'Ending',where:'Ending recap — "How your choices led here", first item',trigger:`Final plant stage = ${n} (${['Drooping','Weak','Growing','Healthy','Thriving'][n]})`,source:SRC.cdata,key:`C_UI.plantsWhy[${n}]`})});continue}
  if(k==='open'){for(const [p,t] of Object.entries(v)){mark(`${path}.${p}`);needSrc('cdata',t.en);add(t.en,{id:`ending.why.open.${p}`,category:'ending_recap',mission:'Ending',where:'Ending recap — "How your choices led here"',trigger:`This problem is still open at the end (${p})`,source:SRC.cdata,key:`C_UI.open.${p}`})}continue}
  if(CUI_VOICE[k]){mark(path);needSrc('cdata',v.en);const [cat,where,trig]=CUI_VOICE[k];add(v.en,{id:`base.${k}`,category:cat,mission:cat==='ending_recap'?'Ending':BASE,where,trigger:trig,source:SRC.cdata,key:`C_UI.${k}`});continue}
  if(CUI_OPT[k]){mark(path);needSrc('cdata',v.en);add(v.en,{id:`base.option.${k}`,category:'choice_option',voice:'optional',mission:/fix/.test(k)?mName(3):mName(5),where:/fix/.test(k)?'Greenhouse "fix" card':'Rescue card',trigger:CUI_OPT[k],source:SRC.cdata,key:`C_UI.${k}`});continue}
  const walk=(x,p)=>{if(x&&typeof x==='object'&&'en' in x){mark(p);refRows.push([p,x.en,'Base-mission on-screen label'])}else if(x&&typeof x==='object')for(const [kk,vv] of Object.entries(x))walk(vv,p+'.'+kk)};walk(v,path);
}
CD.STAGE_SAY.forEach((t,n)=>{mark(`cdata.STAGE_SAY.${n}`);needSrc('cdata',t.en);add(t.en,{id:`base.plants.stage${n}`,category:'world_reaction',mission:BASE,where:'Greenhouse "garden" card (Mission 4) + Nuri dialogue box when entering the Greenhouse',trigger:`Plant stage ${n} (${['Drooping','Weak','Growing','Healthy','Thriving'][n]})`,source:SRC.cdata,key:`STAGE_SAY[${n}]`})});
for(const [c,t] of Object.entries(CD.CAUSE)){mark(`cdata.CAUSE.${c}`);needSrc('cdata',t.en);add(t.en,{id:`base.cause.${c}`,category:'consequence',mission:BASE,where:'"Tell me more" on the garden card and the "New day" card',trigger:`A greenhouse lamp is off because of: ${c==='watch'?'the watch screen (Mission 3)':c==='rover'?'the robot trip (Mission 5)':c==='helper'?'the helper robot (rescue)':'the player at the power check'}`,source:SRC.cdata,key:`CAUSE.${c}`})}
for(const grp of ['SLOT_NAMES','SLOT_HINTS'])for(const [s,t] of Object.entries(CD[grp])){mark(`cdata.${grp}.${s}`);needSrc('cdata',t.en);add(t.en,{id:`base.${grp==='SLOT_NAMES'?'slot':'slothint'}.${s}`,category:'choice_option',voice:'optional',mission:mName(4),where:'Power check card and "Which light turns off?" card',trigger:`${grp==='SLOT_NAMES'?'Button label':'Button hint'} for ${s}`,source:SRC.cdata,key:`${grp}.${s}`})}
CD.STAGE_NAME.forEach((t,n)=>{mark(`cdata.STAGE_NAME.${n}`);refRows.push([`cdata.STAGE_NAME.${n}`,t.en,'Plant stage label'])});
// inline lines written directly in src/missions/campaign.ts
const INLINE=[
  ['ending.why.cause.watch','Earlier, the watch screen took a lamp\u2019s power.','ending_recap','Ending recap — why list','A lamp was first turned off by the Mission 3 watch screen and the final plants are Growing or worse'],
  ['ending.why.cause.rover','The robot trip borrowed a lamp\u2019s power.','ending_recap','Ending recap — why list','A lamp was first turned off by the Mission 5 robot trip (plants Growing or worse)'],
  ['ending.why.cause.helper','The helper robot borrowed a lamp\u2019s power.','ending_recap','Ending recap — why list','A lamp was first turned off by the rescue (plants Growing or worse)'],
  ['ending.why.cause.you','A lamp was turned off at the power check.','ending_recap','Ending recap — why list','A lamp was first turned off at the power check or by the spare monitor (plants Growing or worse)'],
  ['ending.why.fix.fixed','Then you moved power back to the lamps!','ending_recap','Ending recap — why list','After the cause line, if the player relit the lamp in Mission 4'],
  ['ending.why.fix.kept','Then you kept the plan, so the lamp stayed off.','ending_recap','Ending recap — why list','After the cause line, if the player kept the plan in Mission 4'],
  ['base.now.lampoff','To power it, one greenhouse lamp turned off.','consequence','"You chose…" card — "Tell me more"','The choice had to turn a greenhouse lamp off (no spare block)'],
  ['base.option.rescue.cost.spare','Uses the spare block for one day','choice_option','Rescue card','Rescue option A ⏸ cost when a block is spare'],
  ['base.option.rescue.cost.borrow','Borrows one light\u2019s power for one day','choice_option','Rescue card','Rescue option A ⏸ cost when no block is spare'],
  ['base.hint.right','You are in the right place!','hint','Help panel — level WHERE?','Help opened inside the building the step needs'],
  ['base.hint.exit','Walk to the exit at the bottom of this room, then follow the yellow arrow.','hint','Help panel — level WHERE?','Help opened inside a building that is not the goal'],
  ['base.hint.rover','Follow the yellow arrow to the robot by the rocks. Press M for the map.','hint','Help panel — level WHERE?','Help opened outdoors during the robot-rescue step'],
  ['base.hint.rover.control','Walk up to the robot and tap E.','hint','Help panel — level HOW?','Robot-rescue step'],
  ['base.hint.control','Go inside, walk to the big machine in the middle, and tap E.','hint','Help panel — level HOW?','Any other base-mission step'],
];
const campSrc=srcText.campaign.replaceAll("\\'","'");
for(const [id,t,cat,where,trig] of INLINE){const plain=t.replaceAll('\u2019',"'");if(!campSrc.includes(t)&&!campSrc.includes(plain))throw Error('inline text not in campaign.ts: '+t);
  add(t,{id,category:cat,voice:cat==='choice_option'?'optional':'required',mission:cat==='ending_recap'?'Ending':BASE,where,trigger:trig,source:SRC.campaign,key:'inline text'})}
for(const b of C_GOALS){const t=`Follow the yellow arrow to the ${BN[b]}. Press M for the map.`;add(t,{id:`base.hint.goto.${b}`,category:'hint',mission:BASE,where:'Help panel — level WHERE?',trigger:`Help opened outdoors when the step needs the ${BN[b]}`,source:SRC.campaign,key:'inline template `Follow the yellow arrow to the ${bName}. Press M for the map.`'})}
if(!srcText.campaign.includes('Follow the yellow arrow to the ${bName(st.building,l)}. Press M for the map.'))throw Error('goto template changed');
// ---------------------------------------------------------------- companion: tour, tips, encouragement, badge celebrations
const TOUR_TRIG={hello:'Tour step 1: spotlight on Nuri (starts right after the opening cinematic, first play only)',move:'Tour: spotlight on the astronaut; waits until the player walks',moveTouch:'Tour move step on a touch-only device (no keyboard)',moved:'Tour: right after the player first walks',
  buildings:'Tour: spotlight on the Habitat',mission:'Tour: spotlight on the mission tracker',help:'Tour: spotlight on the HELP button (waits for a tap or NEXT)',xp:'Tour: spotlight on the XP chip',passport:'Tour: spotlight on the Science Passport button (waits for a tap or NEXT)',
  passportBack:'Tour: after the player closes the Passport',map:'Tour: spotlight on the map button',settings:'Tour: spotlight on the settings button',ripple1:'Tour: the Ripple Effect (1/3)',ripple2:'Tour: the Ripple Effect (2/3)',ripple3:'Tour: the Ripple Effect (3/3)',
  start:'Tour last step: spotlight on START MISSION',skipped:'After "Skip tour"'};
const TIP_TRIG={door:'First time the player stands at a door',nasa:'First card with a REAL NASA DATA stamp',pretend:'First card with a PRETEND PLAN stamp (after the NASA tip)',hear:'First card with the hear-again speaker (voice on)',choice:'First plan-choice card',
  meters:'First time the base power blocks appear in the HUD',fix:'First greenhouse lamp-fix card (recovery)',consequence:'A lamp goes dark or the robot gets stuck (at most every 90 s)',recovered:'After a recovery choice that fixes something (lamp relit, robot rescued)',badges:'First time the Passport badge grid is open'};
for(const [k,t] of Object.entries(CO.TOUR)){mark(`companion.TOUR.${k}`);needSrc('companion',t.en);add(t.en,{id:`tour.${k}`,category:'tutorial',mission:'First-time tour',where:'Tour bubble (spotlight)',trigger:TOUR_TRIG[k]||k,source:SRC.companion,key:`TOUR.${k}`})}
for(const [k,t] of Object.entries(CO.TIP)){mark(`companion.TIP.${k}`);needSrc('companion',t.en);add(t.en,{id:`tip.${k}`,category:'tutorial',where:'Nuri coach bubble (points at the thing)',trigger:TIP_TRIG[k]||k,source:SRC.companion,key:`TIP.${k}`})}
for(const [k,arr] of Object.entries(CO.CHEER))arr.forEach((t,n)=>{mark(`companion.CHEER.${k}.${n}`);needSrc('companion',t.en);add(t.en,{id:`cheer.${k}${n+1}`,category:'encouragement',where:'Nuri coach bubble',trigger:k==='right'?'A right answer (rotating, at most once a minute)':k==='wrong'?'A second wrong try in a row (rotating, at most every 40 s); never gives the answer':'A mission is completed (rotating)',source:SRC.companion,key:`CHEER.${k}[${n}]`})});
mark('companion.CELEBRATE.say');needSrc('companion',CO.CELEBRATE.say.en);
for(const [id,a] of Object.entries(R.ACHIEVEMENTS))add(fill(CO.CELEBRATE.say.en,{name:a.name.en}),{id:`celebrate.${id}`,category:'encouragement',where:'Badge celebration (confetti card)',trigger:`The player earns the "${a.name.en}" badge (shown at the next calm moment)`,source:SRC.companion,key:'CELEBRATE.say'});
// ---------------------------------------------------------------- everything else is on-screen text (not voiced)
const refWalk=(x,p,why)=>{if(!x||typeof x!=='object')return;if(typeof x.en==='string'){if(!usedPaths.has(p)){usedPaths.add(p);refRows.push([p,x.en,why])}return}for(const [k,v] of Object.entries(x))refWalk(v,p+'.'+k,why)};
const REFWHY={MISSION:'Mission tracker / buttons',PROMPTS:'"Press E" prompts above the player',TAGS:'Card tags (unused)',KIND:'Card kind labels (unused)',STEPS:'Step labels',UI:'Card buttons and labels',STAGE_STEPS:'Mission progress labels',PASSPORT:'Science Passport screen',SETTINGS:'Settings screen',MAP:'Map screen',TOAST:'Pop-up notices (XP, badges, places)',MISC:'Misc. labels',CARDS:'Card buttons / stamps'};
for(const [k,v] of Object.entries(S))if(v&&typeof v==='object')refWalk(v,`strings.${k}`,REFWHY[k]||'On-screen text');
for(const [k,v] of Object.entries(R))if(v&&typeof v==='object')refWalk(v,`rewards.${k}`,'Badges, titles, challenges, Nuri light names (Passport)');
for(const [k,v] of Object.entries(CD))if(v&&typeof v==='object'&&k!=='CAMPAIGN')refWalk(v,`cdata.${k}`,'Base-mission on-screen label');
for(const [k,v] of Object.entries(CO))if(v&&typeof v==='object')refWalk(v,`companion.${k}`,'Tour buttons and badge card labels');
// completeness: every text object the game exports must now be classified
const all=[];const walkAll=(x,p,seen=new Set())=>{if(!x||typeof x!=='object'||seen.has(x))return;seen.add(x);if(typeof x.en==='string'&&typeof x.ar==='string'){all.push(p);return}for(const [k,v] of Object.entries(x))walkAll(v,p+'.'+k,seen)};
for(const [n,m] of [['strings',S],['rewards',R],['cdata',CD],['companion',CO]])for(const [k,v] of Object.entries(m))walkAll(v,`${n}.${k}`);
for(const [i] of D.DISCOVERIES.entries()){usedPaths.add(`disc.DISCOVERIES.${i}.title`);usedPaths.add(`disc.DISCOVERIES.${i}.where`)}
const unclassified=all.filter(p=>!usedPaths.has(p));
if(unclassified.length)throw Error('Unclassified text objects:\n'+unclassified.join('\n'));
// source check
const unknownSrc=checks.filter(([f,t])=>!srcText[f]||typeof t!=="string");if(unknownSrc.length)throw Error("unknown source keys: "+JSON.stringify(unknownSrc.slice(0,3)));const bad=checks.filter(([f,t])=>{const s=srcText[f].replaceAll("\\'","'");return !s.includes(t)&&!s.includes(t.replaceAll('\u2019',"'"))});
const placeholderTemplates=checks.filter(([,t])=>/\{\w+\}/.test(t)).length;
if(bad.some(([,t])=>!/\{\w+\}/.test(t)))throw Error('Not found verbatim in source:\n'+bad.map(b=>b.join(': ')).join('\n'));

// ---------------------------------------------------------------- write files
const entries=[...lines.values()];
const ids=new Set(),files=new Set();for(const e of entries){if(ids.has(e.id)||files.has(e.file))throw Error('duplicate id/file '+e.id);ids.add(e.id);files.add(e.file)}
rmSync(OUT,{recursive:true,force:true});mkdirSync(OUT,{recursive:true});
const q=v=>{const s=String(v??'');return /[",\n]/.test(s)?'"'+s.replaceAll('"','""')+'"':s};
const ORDER=['tutorial','encouragement','dialogue','card','quiz_feedback','consequence','world_reaction','hint','bonus_fact','ending_recap','cinematic_caption','choice_option','passport'];
entries.sort((a,b)=>ORDER.indexOf(a.category)-ORDER.indexOf(b.category)||a.id.localeCompare(b.id));
const header='dialogue_id,mp3_filename,english_text,speaker,category,voice_needed,mission,first_location,first_trigger,uses,characters';
const csv=[header,...entries.map(e=>[e.id,e.file,e.text,e.speaker,e.category,e.voice,e.usages[0].mission,e.usages[0].where,e.usages[0].trigger+(e.usages[0].condition?` [${e.usages[0].condition}]`:''),e.usages.length,e.text.length].map(q).join(','))].join('\r\n')+'\r\n';
writeFileSync(`${OUT}/nuri_dialogue.csv`,'\uFEFF'+csv,'utf8');
// simple 3-column file for direct pasting into a bulk text-to-speech tool
writeFileSync(`${OUT}/nuri_dialogue_simple.csv`,'\uFEFF'+['dialogue_id,english_text,mp3_filename',...entries.filter(e=>e.voice!=='unused').map(e=>[e.id,e.text,e.file].map(q).join(','))].join('\r\n')+'\r\n','utf8');
const COMPOSITES=[
  {id:'base.day_card',where:'"New day" card (missions 4–6)',play:['base.day',' then one of: base.grew | base.shrank | base.shrank0'],more:'then any of, in this order: base.boost, base.checked, base.returned, base.cause.*',note:'On screen the first two are joined with one space.'},
  {id:'ending.recap.why',where:'Ending recap "How your choices led here" list (one bullet per line, in order)',play:['ending.why.plants{0-4}','(optional) ending.why.cause.*','(optional) ending.why.fix.*','ending.why.open.* for each open problem','(optional) base.shared']},
  {id:'help.panel',where:'Help panel (H)',play:['One line per level: GOAL → WHERE? → HOW? → THINK (the player taps MORE TIPS to advance)']},
];
const map={package:'Mission Ripple 2D — Nuri voice package',generated:new Date().toISOString(),language:'en',speakers:{Nuri:'The friendly robot companion (all dialogue, hints, cards, consequences, endings)',Narrator:'Cinematic captions (opening + endings). Optional; can be Nuri or a separate narrator voice.'},
  voiceNeeded:{required:'Spoken or shown as Nuri\'s line in the current game',optional:'Answer/option button text or caption — voice only if you want options read aloud','unused':'Exists in the text files but is not shown in the current build'},
  audioFolder:'public/assets/voice/nuri/ (suggested — not integrated yet)',
  files:Object.fromEntries(entries.map(e=>[e.file,{id:e.id,text:e.text,speaker:e.speaker,category:e.category,voice:e.voice,usages:e.usages}])),composites:COMPOSITES};
writeFileSync(`${OUT}/nuri_audio_map.json`,JSON.stringify(map,null,2)+'\n','utf8');
writeFileSync(`${OUT}/on_screen_text_not_voiced.csv`,'\uFEFF'+['text_key,english_text,where_it_appears',...refRows.map(r=>r.map(q).join(','))].join('\r\n')+'\r\n','utf8');
const by=(k)=>entries.reduce((o,e)=>(o[e[k]]=(o[e[k]]||0)+1,o),{});
const stats={unique_lines:entries.length,required:entries.filter(e=>e.voice==='required').length,optional:entries.filter(e=>e.voice==='optional').length,unused:entries.filter(e=>e.voice==='unused').length,
  usages:entries.reduce((s,e)=>s+e.usages.length,0),characters_required:entries.filter(e=>e.voice==='required').reduce((s,e)=>s+e.text.length,0),characters_all:entries.reduce((s,e)=>s+e.text.length,0),
  by_category:by('category'),by_speaker:by('speaker'),text_objects_in_game:all.length,on_screen_only:refRows.length,placeholder_templates_expanded:placeholderTemplates,run_xp_values:RUN_XP};
writeFileSync(`${OUT}/stats.json`,JSON.stringify(stats,null,2)+'\n');
const catDesc={dialogue:'Nuri\'s dialogue box (bottom-left of the screen) while exploring',card:'Nuri\'s line on a mission card (main line and "Tell me more")',quiz_feedback:'Nuri\'s reply after a quiz answer',
  consequence:'"You chose…" / "Because you chose…" lines and other cause-and-effect lines',world_reaction:'Nuri noticing a change in the world (greenhouse light, robot, plants)',hint:'Help panel (H): GOAL, WHERE?, HOW?, THINK',
  bonus_fact:'Bonus-fact screens inside buildings',ending_recap:'Ending recap card after the ending cinematic',cinematic_caption:'Captions in the opening and ending cinematics (Narrator)',choice_option:'Text on answer and plan buttons (optional narration)',passport:'Discovery cards in the Science Passport (optional)'};
writeFileSync(`${OUT}/README.md`,`# Mission Ripple 2D: Nuri voice package (English)

Generated by \`tools/voice/build-voice-package.mjs\` from the game's own text files, on ${stats.generated||new Date().toISOString().slice(0,10)}.
The game's dialogue is copied exactly. Nothing in the game was changed, and no voice was generated.

## Files

| File | What it is |
|---|---|
| \`nuri_dialogue.csv\` | One row per unique line: \`dialogue_id\`, \`mp3_filename\`, \`english_text\` (exact), speaker, category, \`voice_needed\`, mission, first location and trigger, number of uses, characters. |
| \`nuri_dialogue_simple.csv\` | Just \`dialogue_id, english_text, mp3_filename\`, for bulk text-to-speech. Unused lines are left out. |
| \`nuri_audio_map.json\` | For every MP3: its text and **every** place and trigger in the game where it is used (screen, event, conditions, source file and key). Also lists the composite lines that are played as a sequence. |
| \`on_screen_text_not_voiced.csv\` | Every other English text in the game (buttons, titles, labels, notices), so you can see nothing was skipped. Not for voicing. |
| \`verification_report.md\` | How completeness was checked, with the results. |
| \`chrome_capture_check.json\` | Result of the real-Chrome check: every line Nuri showed during the test playthroughs was found in this package. |
| \`stats.json\` | Counts by category and speaker, plus character totals. |

## Numbers

- **${stats.unique_lines} unique lines** (${stats.usages} uses in the game):
  - **${stats.required} required**: Nuri says them in the current game;
  - **${stats.optional} optional**: answer and plan button text, and cinematic captions, if you want those read aloud;
  - **${stats.unused} unused**: present in the text files but not shown yet.
- **${stats.characters_required.toLocaleString('en-US')} characters** for the required lines (${stats.characters_all.toLocaleString('en-US')} for everything). Useful for ElevenLabs credits.
- Speakers:
  - **Nuri**: ${stats.by_speaker.Nuri} lines.
  - **Narrator**: ${stats.by_speaker.Narrator||0} cinematic captions (optional; you can use Nuri's voice or a separate narrator).

| Category | Lines | Where |
|---|---|---|
${Object.entries(stats.by_category).map(([k,v])=>`| ${k} | ${v} | ${catDesc[k]||''} |`).join('\n')}

## Generating with ElevenLabs

1. Use \`nuri_dialogue_simple.csv\`, or filter \`nuri_dialogue.csv\` on \`voice_needed = required\` first.
2. Name each output exactly as in \`mp3_filename\` (all lowercase, \`nuri_…\` or \`narration_…\`). The game will look up files by these names.
3. Suggested output format: MP3, 44.1 kHz, 128 kbps, mono. Keep about 0.1 s of silence at the start and the end, and no music.
4. Keep the text **exactly** as written, including the curly apostrophes (’), the "·" separator in GOAL hints, and the
   exclamation marks. If ElevenLabs reads "·" aloud, replace it with a short pause *in the generation prompt only*,
   not in the CSV.
5. The whole set should keep one consistent voice, speed and loudness (about −16 LUFS, peaks below −1 dBFS), so lines can follow each other.

### Voice direction for Nuri

Nuri is a small, friendly helper robot talking to children aged 7–12:
- warm, curious and encouraging, never scary or bossy;
- clear and a little slower than normal;
- smiles on "Great!", "Yes!" and "Wow!";
- calm and kind on "try again" lines (no disappointment);
- gentle and hopeful on the setback ending ("We can learn, change our plan, and try again.").

## Lines that change with the game

The game fills in some lines with a name or a number. Every possible version is already written out as its own row,
so no audio has to be stitched together:
- **building names**: "This is the Habitat. Our clue is in the Research Lab!" (every wrong place × every goal);
- **tasks**: "Our mission is waiting: Check the robot’s notebook!";
- **fixed science numbers** from the NASA data: peak about ${PEAK}, about ${HOURS} hours, ${NCUT} dots;
- **Mission 1 rewards total**: one line for each possible XP total (${stats.run_xp_values.length} versions, ${stats.run_xp_values[0]}–${stats.run_xp_values.at(-1)} XP).
  Only one plays in a game.

A few cards show **two or more lines one after the other**. Each part is its own MP3, and \`composites\` in the JSON
gives the play order:
- the "New day" card: "A new day on our base!" + "Both lamps were on, so the plants grew!";
- the ending "How your choices led here" list;
- the help panel levels.

## Not included (on purpose)

- **"For grown-ups" drawers**: exact NASA values, units, IDs and links for adults. They are not dialogue.
- **Buttons, titles, labels and pop-up notices**: these are in \`on_screen_text_not_voiced.csv\`.
- **Arabic**: this package is English only. The Arabic text is in the same source files if you want a second voice package later.
`,'utf8');

console.log(JSON.stringify(stats));
