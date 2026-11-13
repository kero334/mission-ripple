// The Rover Reading (P2-M02): one-idea "Nuri scenes", world interactions, guidance and learning rewards.
// Mission stages and decisions still flow only through mission.ts transition().
import {evidence,initialMission,loadMission,saveMission,stageIndex,transition,validateEvidenceRecord,type MissionState,type Decision} from './mission';
import {PEAK,WINDOWS,ABOVE_CUTOFF,MAY19,MAY20,hhmm,validateSeries} from './series';
import {CARDS,HELP,MISSION,NURI,OBJECTIVES,STAGE_STEPS,type Locale,type StageKey,pick} from '../content/strings';
import {DISCOVERIES,discovery} from '../content/discoveries';
import {BUILDINGS} from '../world-data';
import {guideTarget,IDLE_OFFER_MS,MISSION_BUILDING} from '../game/guidance';
import type {ProgressStore} from '../game/progress';
import {chartSvg} from '../ui/chart';
import {$,asset,bdi,esc,modals,renderScene,type Scene} from '../ui/shell';

type Deps={locale:()=>Locale;progress:ProgressStore;openHelp:(from:'card'|'hud')=>void;openPassport:()=>void};
type Seq='brief'|'field'|'research'|'decide'|'later'|'debrief'|'status'|`exhibit:${string}`;
const MID:StageKey[]=['monitor','research','command','nextShift'];
const say=(text:string,mood='speak')=>window.dispatchEvent(new CustomEvent('ripple-dialogue',{detail:{text,mood}}));
const control=(type:string,value?:unknown)=>window.dispatchEvent(new CustomEvent('ripple-control',{detail:{type,value}}));
const bName=(id:string,l:Locale)=>{const b=BUILDINGS.find(v=>v.id===id)!;return l==='en'?b.name:b.ar};
const r0=(n:number)=>String(Math.round(n));
const PAGES:Record<string,string[]>={
  brief:['brief'],field:['rover','rad','chart','goResearch'],research:['compare','outside','why','many','goCommand'],
  decide:['choose','explain','now','goComms'],later:['later','unchanged'],debrief:['bigIdea','q1','q2','done'],status:['status'],exhibit:['exhibit']};

export function setupScienceUI(deps:Deps){
  const P=deps.progress;
  let mission:MissionState=loadMission();
  P.migrateFromMission(mission);
  let seq:Seq|null=null,page=0,review=false,fresh=true;
  let selected:number|null=null,riseHint=false,explainPick:number|null=null,q1:null|'yes'|'no'=null,q2:null|'a'|'b'|'c'=null;
  let room:string|null=null,guideDistance='none';
  let lastProgress=Date.now(),offers:Record<string,number>={},wrong:Record<string,number>={},arrived:Record<string,boolean>={},missTimes:number[]=[];
  const overlay=document.createElement('div');overlay.id='science-overlay';overlay.className='hidden';
  overlay.innerHTML='<article class="science-card pixel-panel" role="dialog" aria-modal="true" aria-describedby="science-say"><button id="science-close" type="button" aria-label="Close">×</button><div id="science-content"></div></article>';
  $('hud').append(overlay);
  const content=()=>$('science-content');
  $('science-close').addEventListener('click',()=>close());

  const stage=()=>mission.stage as StageKey;
  const guided=()=>P.get().settings.guidance==='guided';
  const touch=()=>{lastProgress=Date.now()};
  function save(next:MissionState){const changed=next.stage!==mission.stage;mission=next;saveMission(next);if(changed){touch();arrived={}}renderHud();updateGuide()}
  function updateGuide(){const l=deps.locale(),g=guideTarget(stage(),room,l);control('guide',{kind:g.kind,buildingId:g.buildingId,x:g.x,y:g.y,mode:P.get().settings.guidance})}
  const award=(id:string)=>P.award(id);

  // ------------------------------------------------------------------ HUD: one task line + one button
  let hudKey='';
  function renderHud(force=false){
    const l=deps.locale(),s=stage(),o=OBJECTIVES[s],key=l+'|'+s;if(!force&&key===hudKey)return;hudKey=key;
    $('mission-title').textContent=pick(MISSION.name,l);
    $('objective-list').innerHTML=`<button type="button" id="objective-button" class="quest" aria-label="${esc(pick(o.task,l))}"><img src="${asset('guide/guide-beacon')}" alt=""/><span><strong id="objective-task">${esc(pick(s==='ready'?o.why:o.task,l))}</strong>${s==='ready'?'':`<small id="objective-where">${esc(pick(o.where,l))}</small>`}</span></button>`;
    $('explored-text').textContent='';
    const actions=$('tracker-actions');
    actions.innerHTML=(s==='ready'?`<button type="button" id="science-mission-button" class="tracker-primary">${pick(MISSION.start,l)}</button>`
      :s==='complete'?`<button type="button" id="science-mission-button" class="tracker-primary">${pick(MISSION.replay,l)}</button>`:'')
      +`<button type="button" id="help-button" class="help-button" aria-label="${pick(MISSION.help,l)} (H)"><img src="${asset('ui/ui-help-pixel')}" alt=""/>${pick(MISSION.help,l)}</button>`;
    document.getElementById('science-mission-button')?.addEventListener('click',missionButton);
    $('objective-button').onclick=()=>{if(mission.stage==='ready'||mission.stage==='complete')missionButton();else if(mission.stage==='debrief')show('debrief');else show('status')};
    $('help-button').onclick=()=>deps.openHelp('hud');
  }
  function missionButton(){
    const l=deps.locale();
    if(mission.stage==='ready'){P.startRun();save(transition(mission,'start'));show('brief');say(pick(OBJECTIVES.ready.intro,l),'warning')}
    else if(mission.stage==='complete')replay();
    else if(mission.stage==='debrief')show('debrief');
    else show('status');
  }
  function replay(){const l=deps.locale();P.startRun();save(initialMission());save(transition(mission,'start'));selected=null;riseHint=false;explainPick=null;q1=null;q2=null;show('brief');say(pick(OBJECTIVES.ready.intro,l),'warning')}

  // ------------------------------------------------------------------ scenes
  const pages=()=>{const key=seq!.startsWith('exhibit:')?'exhibit':seq!;let p=PAGES[key];if(review)p=p.filter(x=>!x.startsWith('go')&&x!=='explain'&&x!=='q1'&&x!=='q2');return p};
  const pageId=()=>pages()[page];
  function show(s:Seq,p:number|string=0,isReview=false){seq=s;review=isReview;page=typeof p==='string'?Math.max(0,pages().indexOf(p)):p;fresh=true;overlay.classList.remove('hidden');modals.open('science',close);renderCard_();
    requestAnimationFrame(()=>(content().querySelector<HTMLElement>('.learning-next,.big-choice,.chip'))?.focus())}
  function close(){if(!seq)return;seq=null;overlay.classList.add('hidden');modals.closed('science')}

  const grown=(l:Locale,extra='')=>`<p>${l==='en'?'Instrument':'الجهاز'}: ${bdi(evidence.instrument)} · ${l==='en'?'Curiosity rover, Mars surface':'الروبوت كيوريوسيتي، سطح المريخ'}</p>
    <p>${l==='en'?'Absorbed dose rate in':'معدل الجرعة الممتصة بوحدة'} ${bdi(evidence.derived.unit)}. ${l==='en'?'Not an astronaut dose and not a reading inside the pretend base.':'مش جرعة رائد فضاء ومش قراية جوه القاعدة الخيالية.'}</p>${extra}
    <p>${bdi(evidence.datasetId)} · ${bdi(evidence.findingIds.join(', '))} · ${bdi(evidence.eventId)}<br>${bdi(evidence.sourceRecord)}<br>SHA-256: ${bdi(evidence.sourceSha256)}</p>
    <a href="${evidence.sourceUrl}" target="_blank" rel="noopener noreferrer">${l==='en'?'Open the NASA source ↗':'افتح مصدر ناسا ↗'}</a>`;
  const exact=(l:Locale)=>`<p>${l==='en'?'Highest retrieved reading':'أعلى قراية مسترجعة'}: ${bdi(`${PEAK.v} ${evidence.derived.unit} · ${hhmm(PEAK.ts)} UTC`)}. ${l==='en'?`All ${MAY20.length} rows from 20 May 2024 UTC are drawn; nothing is smoothed or filled in.`:`كل الـ${MAY20.length} صف بتوع ٢٠ مايو ٢٠٢٤ مرسومين، من غير تنعيم أو تخمين.`}</p><p>${bdi(evidence.measurements.map(p=>`${p.timestampUtc.slice(11,16)} · ${p.absorbedDoseRate}`).join(' | '))}</p>`;
  const img=(src:string,cls='')=>`<img class="scene-img ${cls}" src="${asset(src)}" alt=""/>`;
  const B=CARDS.btn;
  const choiceTitle=(c:Decision|null,l:Locale)=>pick(c==='review-defer'?CARDS.decide.aTitle:CARDS.decide.bTitle,l);
  const resultIcon=(c:Decision|null)=>c==='review-defer'?'ui/science-research':'ui/science-rover';

  function scene(l:Locale):Scene{
    const id=pageId(),n=pages().length,pg:[number,number]=[page,n],back=page>0&&!['done','goResearch','goCommand','goComms'].includes(id);
    const next=(label=pick(B.next,l))=>({label,action:'next'});
    const C=CARDS,c=mission.choice;
    switch(id){
      case 'brief':return {id,art:img('science/science-curiosity','big'),stamp:'nasa',say:pick(C.brief.say,l),primary:{label:pick(B.go,l),action:'close'}};
      case 'rover':award('ev:curiosity-card');return {id,art:img('science/science-curiosity','big roll'),stamp:'nasa',say:pick(C.rover.say,l),more:pick(C.rover.more,l),grownups:grown(l),primary:next(),page:pg};
      case 'rad':award('ev:rad-card');return {id,art:img('science/science-rad','big'),say:pick(C.rad.say,l),more:pick(C.rad.more,l),grownups:grown(l),primary:next(),back,page:pg};
      case 'chart':{award('ev:may20-series');const w=selected!=null?WINDOWS[selected]:null;
        const text=!w?pick(C.chart.say,l):w.kind==='change'?pick(C.chart.found,l):pick(w.kind==='low'?C.chart.low:C.chart.falling,l);
        return {id,art:chartSvg(l,{windows:true,selected,highlightRise:riseHint,showPeak:w?.kind==='change',animate:fresh}),stamp:'nasa',say:text,good:w?.kind==='change',
          more:w?.kind==='change'?pick(C.chart.more,l,{peak:bdi(String(Math.round(PEAK.v/10)*10))}):undefined,grownups:grown(l,exact(l)),
          primary:review?{label:pick(B.done,l),action:'close'}:next(),secondary:[{label:'?',action:'ask-nuri'}],back,page:pg}}
      case 'goResearch':return {id,art:img('buildings/research-pixel','building'),say:pick(C.goResearch.say,l),primary:{label:pick(B.go,l),action:'field-done'},page:pg};
      case 'compare':award('ev:may19-compare');return {id,art:chartSvg(l,{compare:true,animate:fresh}),stamp:'nasa',say:pick(C.compare.say,l),
        grownups:grown(l,`<p>${l==='en'?'Medians of all retrieved rows':'وسيط كل الصفوف'}: ${bdi(`19 May ${evidence.derived.previousDayMedian} · 20 May ${evidence.derived.eventDayMedian} ${evidence.derived.unit}`)} (${l==='en'?`${MAY19.length} and ${MAY20.length} rows`:`${MAY19.length} و${MAY20.length} صف`})</p>`),
        primary:review?{label:pick(B.done,l),action:'close'}:next(),secondary:[{label:'?',action:'ask-nuri'}],page:pg};
      case 'outside':award('ev:unknowns');return {id,art:`<div class="vs-art"><figure>${img('science/science-curiosity','mid')}<b class="ok">✓</b></figure><figure>${img('buildings/habitat-pixel','mid')}<b class="q">?</b></figure></div>`,
        say:pick(C.outside.say,l),more:pick(C.outside.more,l),grownups:grown(l,`<p>${evidence.uncertainty[l]}</p>`),primary:next(),back,page:pg};
      case 'why':return {id,art:`<div class="vs-art one">${img('ui/science-question','icon-big bob')}</div>`,say:pick(C.why.say,l),grownups:grown(l,`<p>${l==='en'?'No cause is established in this record. A solar-event catalog listing is not proof of cause.':'مفيش سبب متأكد منه في السجل ده. وإن حدث شمسي يتسجل مش دليل إنه السبب.'}</p>`),primary:next(),back,page:pg};
      case 'many':award('ev:second-look');return {id,art:chartSvg(l,{cutoff:true,animate:fresh}),stamp:'nasa',say:pick(C.many.say,l,{h:bdi(r0(evidence.derived.spanHours))}),more:pick(C.many.more,l,{n:bdi(ABOVE_CUTOFF.length)}),
        grownups:grown(l,`<p>${bdi(evidence.derived.readingsAboveExploratoryCutoff)} ${l==='en'?'readings above the descriptive':'قراية فوق خط الوصف'} ${bdi(evidence.derived.exploratoryCutoff+' '+evidence.derived.unit)} ${l==='en'?'line':''}, ${bdi(hhmm(ABOVE_CUTOFF[0].ts)+'–'+hhmm(ABOVE_CUTOFF.at(-1)!.ts)+' UTC')}, ${bdi(evidence.derived.spanHours.toFixed(2)+' h')}. ${l==='en'?'This line is not a human safety limit.':'الخط ده مش حد أمان للإنسان.'}</p>`),
        primary:review?{label:pick(B.done,l),action:'close'}:next(),back,page:pg};
      case 'goCommand':return {id,art:img('buildings/command-pixel','building'),say:pick(C.goCommand.say,l),primary:{label:pick(B.go,l),action:'research-done'},page:pg};
      case 'choose':return {id,say:pick(C.choose.say,l),more:pick(C.choose.more,l),stamp:'game',
        art:`<div class="choice-row">${([['review-defer','ui/science-research',C.decide.aTitle,C.decide.aGain,C.decide.aCost,'A'],['survey-followup','ui/science-rover',C.decide.bTitle,C.decide.bGain,C.decide.bCost,'B']] as const).map(([a,ic,t,g,w,k])=>`<button type="button" class="big-choice" data-science-action="${a}">${img(ic,'choice-icon')}<b><i>${l==='en'?k:k==='A'?'أ':'ب'}</i> ${pick(t,l)}</b><span class="gain"><i aria-hidden="true">✓</i>${pick(g,l)}</span><span class="cost"><i aria-hidden="true">⏸</i>${pick(w,l)}</span></button>`).join('')}</div>`,
        grownups:`<p>P2-M02A / P2-M02B. ${l==='en'?'The “one job time” is a game rule (simulatedWorkSlotsUsed), not NASA data. The game calculates no dose, health or safety result.':'«وقت الشغلانة الواحدة» قاعدة في اللعبة، مش بيانات ناسا. اللعبة مش بتحسب جرعة ولا صحة ولا أمان.'}</p>`,secondary:[{label:'?',action:'ask-nuri'}]};
      case 'explain':{const E=C.explain,fb=explainPick?[E.f1,E.f2,E.f3][explainPick-1]:null;
        return {id,art:`<div class="vs-art one">${img(resultIcon(c),'icon-big')}</div>`,say:fb?pick(fb,l):pick(E.say,l),good:!!explainPick&&explainPick<=2,
          choices:`<div class="chip-row">${[E.c1,E.c2,E.c3].map((t,i)=>`<button type="button" class="chip ${explainPick===i+1?'sel':''}" data-science-action="explain-${i+1}" aria-pressed="${explainPick===i+1}">${pick(t,l)}</button>`).join('')}</div>`,
          primary:explainPick?next():{label:pick(B.skip,l),action:'next'},page:pg}}
      case 'now':return {id,stamp:'game',art:`<div class="ripple-art">${img(resultIcon(c),'icon-big')}<span class="rf-arrow">→</span>${img('ui/science-clock','icon-big')}</div>`,
        say:pick(c==='review-defer'?C.now.aNow:C.now.bNow,l),primary:review?{label:pick(B.done,l),action:'close'}:next(),page:review?undefined:pg};
      case 'goComms':return {id,art:img('buildings/comms-pixel','building'),say:pick(C.goComms.say,l),primary:{label:pick(B.go,l),action:'close'},page:pg};
      case 'later':return {id,stamp:'game',art:`<div class="ripple-art">${img(resultIcon(c),'icon-big')}<span class="rf-arrow">→</span>${img(c==='review-defer'?'ui/science-check':'ui/science-calendar','icon-big bob')}</div>`,
        say:pick(c==='review-defer'?C.later.aLater:C.later.bLater,l),primary:next(),page:pg};
      case 'unchanged':return {id,art:`<div class="real-vs-game"><figure class="real"><figcaption>${pick(C.unchanged.real,l)}</figcaption>${chartSvg(l,{mini:true})}</figure><figure class="game"><figcaption>${pick(C.unchanged.game,l)}</figcaption><div class="game-pics">${img('buildings/habitat-pixel','mid')}${img(resultIcon(c),'icon-mid')}</div></figure></div>`,say:pick(C.unchanged.say,l),primary:review?{label:pick(B.done,l),action:'close'}:{label:pick(B.next,l),action:'later-done'},back,page:pg};
      case 'bigIdea':{const both=P.get().branchesSeen.length===2;
        return {id,art:`<div class="ripple-art">${img('science/science-curiosity','mid')}<span class="rf-arrow">→</span>${img('ui/science-check','icon-big bob')}</div>`,say:pick(C.bigIdea.say,l),more:both?pick(C.bigIdea.other,l):undefined,
          grownups:grown(l),primary:next(),page:pg}}
      case 'q1':{const Q=C.q1;return {id,art:`<div class="vs-art">${img('science/science-curiosity','mid')}<figure>${img('buildings/habitat-pixel','mid')}<b class="q">?</b></figure></div>`,
        say:q1==='no'?pick(Q.right,l):q1==='yes'?pick(Q.try,l):pick(Q.say,l),good:q1==='no',
        choices:`<div class="chip-row two">${(['yes','no'] as const).map(k=>`<button type="button" class="chip ${q1===k?'sel':''}" data-science-action="reflect-${k}">${pick(Q[k],l)}</button>`).join('')}</div>`,
        primary:q1?next():{label:pick(B.skip,l),action:'next'},back,page:pg}}
      case 'q2':{const Q=C.q2,fin=mission.stage==='debrief'?{label:pick(B.finish,l),action:'finish'}:next();
        return {id,art:`<div class="vs-art one">${img('ui/science-robot','icon-big bob')}</div>`,say:q2?pick(q2==='a'?Q.aF:q2==='b'?Q.bF:Q.cF,l):pick(Q.say,l),good:q2==='a',
          choices:`<div class="chip-row">${(['a','b','c'] as const).map(k=>`<button type="button" class="chip ${q2===k?'sel':''}" data-science-action="transfer-${k}">${pick(Q[k],l)}</button>`).join('')}</div>`,
          primary:fin,back,page:pg}}
      case 'done':{const run=P.get().run.events,runXp=run.reduce((s,e)=>s+P.xpOf(e),0),badges=run.map(e=>P.eventAchievement(e)).filter(Boolean) as string[];
        return {id,art:`<div class="done-art">${img('badges/badge-mission-complete','icon-big bob')}<strong class="xp-big"><img src="${asset('ui/ui-xp-pixel')}" alt=""/>+${bdi(runXp)}</strong><div class="badge-strip">${badges.map(b=>`<img src="${asset('badges/badge-'+b)}" alt="${esc(P.achievementLabel(b,l))}" title="${esc(P.achievementLabel(b,l))}"/>`).join('')}</div></div>`,
          say:runXp?pick(C.done.say,l,{xp:bdi(runXp)}):pick(C.done.none,l),good:true,
          primary:{label:pick(B.replay,l),action:'replay'},secondary:[{label:pick(B.badges,l),action:'passport'},{label:pick(B.explore,l),action:'close'}]}}
      case 'status':{const st=stage(),o=OBJECTIVES[st],sec=[];if(mission.monitorReviewed)sec.push({label:pick(B.look,l),action:'review-field'});
        return {id,art:`<div class="status-art">${STAGE_STEPS.map(v=>{const i=stageIndex(v.stage as any),cur=stageIndex(mission.stage);return `<span class="${cur>i?'done':cur===i?'now':''}">${cur>i?'✓':i-stageIndex('monitor')+1}</span>`}).join('<i></i>')}</div>`,
          say:pick(C.status.say,l,{task:pick(o.task,l),where:pick(o.where,l)}),primary:{label:pick(B.showWay,l),action:'show-way'},secondary:sec}}
      default:{const d=discovery(seq!.slice(8))!;
        return {id:'exhibit',art:img(d.icon,'icon-big bob'),stamp:'nasa',say:d.short(l),
          grownups:`<p>${d.detail(l)}</p><p>${l==='en'?'Source':'المصدر'}: ${bdi(d.org)} · ${bdi(d.refs.join(', '))}</p><a href="${d.url}" target="_blank" rel="noopener noreferrer">${l==='en'?'Open the NASA source ↗':'افتح مصدر ناسا ↗'}</a>`,primary:{label:pick(B.done,l),action:'close'}}}
    }
  }
  function renderCard_(){
    if(!seq)return;const l=deps.locale(),sc=scene(l);
    overlay.querySelector('.science-card')!.className=`science-card pixel-panel scene-card page-${sc.id}${fresh?' fresh':''}`;fresh=false;
    content().innerHTML=renderScene(l,sc);
    if(!guided())content().querySelector('.say-more')?.setAttribute('open','');
    content().querySelectorAll<HTMLElement>('[data-science-action]').forEach(b=>b.addEventListener('click',()=>act(b.dataset.scienceAction!)));
    content().querySelectorAll<SVGRectElement>('rect[data-window]').forEach(r=>r.addEventListener('click',()=>act('window-'+r.dataset.window)));
  }

  function act(action:string){
    const l=deps.locale();touch();
    if(action==='close'){const id=seq?pageId():'';close();if(id==='goComms')say(pick(OBJECTIVES.nextShift.intro,l));return}
    if(action==='next'){page=Math.min(pages().length-1,page+1);fresh=true;renderCard_();focusPrimary();return}
    if(action==='back'){page=Math.max(0,page-1);fresh=true;renderCard_();focusPrimary();return}
    if(action==='ask-nuri'){deps.openHelp('card');return}
    if(action==='passport'){close();deps.openPassport();return}
    if(action==='replay'){close();replay();return}
    if(action==='show-way'){close();control('reveal','device');control('show-me');return}
    if(action==='review-field'){show('field','chart',true);return}
    if(action.startsWith('window-')){selected=Number(action.slice(7));if(WINDOWS[selected].kind==='change')award('ev:found-change');renderCard_();return}
    if(action.startsWith('explain-')){explainPick=Number(action.slice(8));if(explainPick<=2)award('ev:explain-choice');renderCard_();return}
    if(action==='reflect-yes'||action==='reflect-no'){q1=action==='reflect-no'?'no':'yes';if(q1==='no')award('ev:reflect-dose');renderCard_();return}
    if(action.startsWith('transfer-')){q2=action.slice(9) as 'a'|'b'|'c';if(q2==='a')award('ev:transfer');renderCard_();return}
    if(action==='field-done'){if(mission.stage!=='monitor'){close();return}save(transition(mission,'monitor-reviewed'));close();say(pick(OBJECTIVES.research.intro,l));return}
    if(action==='research-done'){if(mission.stage!=='research'){close();return}save(transition(mission,'research-reviewed'));close();say(pick(OBJECTIVES.command.intro,l));return}
    if(action==='review-defer'||action==='survey-followup'){const nx=transition(mission,action);if(nx===mission)return;save(nx);P.seeBranch(action);explainPick=null;page=pages().indexOf('explain');fresh=true;renderCard_();focusPrimary();say(pick(CARDS.explain.say,l),'happy');return}
    if(action==='later-done'){if(mission.stage!=='nextShift'){close();return}save(transition(mission,'next-shift-reviewed'));q1=null;q2=null;show('debrief');say(pick(OBJECTIVES.debrief.intro,l),'happy');return}
    if(action==='finish'){const nx=transition(mission,'finish');if(nx===mission)return;save(nx);P.completeRun();page=pages().indexOf('done');fresh=true;renderCard_();focusPrimary();say(pick(OBJECTIVES.complete.intro,l),'happy');return}
  }
  const focusPrimary=()=>requestAnimationFrame(()=>content().querySelector<HTMLElement>('.big-choice,.chip,.learning-next')?.focus());

  // ------------------------------------------------------------------ world events
  window.addEventListener('ripple-world-interaction',event=>{
    const d=(event as CustomEvent<{kind:string;buildingId:string|null;exhibitId?:string}>).detail,l=deps.locale(),s=mission.stage;touch();
    if(d.kind==='door'||d.kind==='exit')return;
    if(d.kind==='exhibit'&&d.exhibitId){P.readExhibit(d.exhibitId);show(`exhibit:${d.exhibitId}`);return}
    if(d.kind==='field'){
      if(s==='ready'){say(pick(NURI.lockStart,l),'thinking');return}
      if(s==='monitor'){selected=null;riseHint=false;show('field');return}
      show('field','chart',true);return}
    if(d.kind!=='equipment'||!d.buildingId)return;
    const id=d.buildingId,i=stageIndex(s);
    const missionRoom:Record<string,MissionState['stage']>={research:'research',command:'command',comms:'nextShift'};
    if(!missionRoom[id]){const b=BUILDINGS.find(v=>v.id===id)!;say(l==='en'?b.note:b.noteAr);return}
    const need=stageIndex(missionRoom[id]);
    if(s==='ready'){say(pick(NURI.lockStart,l),'thinking');return}
    if(i<need){say(pick(id==='research'?NURI.lockResearch:id==='command'?NURI.lockCommand:NURI.lockComms,l),'thinking');return}
    if(i===need){if(id==='research')show('research');else if(id==='command')show('decide');else show('later');return}
    if(id==='research')show('research',0,true);else if(id==='command')show('decide','now',true);else show('later',0,true);
    say(pick(NURI.reviewDone,l,{where:pick(OBJECTIVES[stage()].where,l)}));
  });
  window.addEventListener('ripple-room',event=>{
    const d=(event as CustomEvent<{room:string|null;allVisited:boolean}>).detail,l=deps.locale(),s=stage();room=d.room;updateGuide();
    if(d.room){
      P.visitPlace(d.room);
      const b=BUILDINGS.find(v=>v.id===d.room)!,goal=MISSION_BUILDING[s];
      if(MID.includes(s)&&goal===d.room){touch();say(pick(NURI.arrivedInside,l),'happy');return}
      if(MID.includes(s)){wrong[s]=(wrong[s]||0)+1;P.count('wrongPlaces');
        say(s==='monitor'?pick(NURI.wrongPlaceField,l,{name:bName(b.id,l)}):pick(NURI.wrongPlace,l,{name:bName(b.id,l),target:bName(goal!,l)}),'thinking');
        if(wrong[s]>=2)offerHelp();return}
      say(pick(NURI.inside,l,{name:bName(b.id,l),note:l==='en'?b.note:b.noteAr}),'happy');
    }else if(MID.includes(s)&&guided())say(pick(NURI.detour,l,{task:pick(OBJECTIVES[s].task,l)}));
    else say(pick(NURI.back,l),'idle');
  });
  window.addEventListener('ripple-interact-miss',()=>{const now=Date.now();missTimes=[...missTimes.filter(t=>now-t<20000),now];P.count('misses');if(missTimes.length>=2){missTimes=[];say(pick(NURI.miss,deps.locale()),'thinking')}});
  window.addEventListener('ripple-state',event=>{
    const st=(event as CustomEvent<{guideDistance:string;room:string|null}>).detail,s=stage();
    if(st.guideDistance!==guideDistance){guideDistance=st.guideDistance;
      if(MID.includes(s)&&!st.room&&(guideDistance==='near'||guideDistance==='inRange')&&!arrived[s]&&guided()){arrived[s]=true;touch();say(pick(NURI.arrivedNear,deps.locale()),'happy')}}
  });
  P.onReward(n=>{if(n.xp&&P.flagOnce('xp-intro'))setTimeout(()=>say(pick(NURI.xpIntro,deps.locale()),'happy'),2800)});

  function offerHelp(){const s=stage();offers[s]=(offers[s]||0)+1;if(offers[s]>2)return;P.count('helpOffers');
    document.getElementById('help-button')?.classList.add('offer');setTimeout(()=>document.getElementById('help-button')?.classList.remove('offer'),9000);
    say(pick(HELP.offer,deps.locale()),'thinking')}
  setInterval(()=>{const s=stage();if(!MID.includes(s)||modals.any())return;if(Date.now()-lastProgress>IDLE_OFFER_MS[P.get().settings.guidance]){touch();offerHelp()}},4000);

  renderHud();updateGuide();
  const api={getState:()=>mission,getEvidence:()=>evidence,validateEvidenceRecord,validateSeries,renderHud,updateGuide,rerenderCard:()=>{if(seq)renderCard_()},
    openMission:()=>missionButton(),replay:()=>{save(initialMission());close()},
    card:()=>seq?{seq,page,review,id:pageId()}:null,
    highlightRise(){riseHint=true;if(seq==='field'&&pageId()!=='chart')page=pages().indexOf('chart');renderCard_()},
    graphVisible:()=>!!seq&&['chart','compare','many'].includes(pageId()),
    room:()=>room,
    discoveries:DISCOVERIES};
  (window as any).__mission=api;return api;
}
