// The Rover Reading (P2-M02): card sequences, world interactions, guidance and learning rewards.
// Mission stages and decisions still flow only through mission.ts transition(); this layer adds
// presentation, the learning sequence SEE → UNDERSTAND → THINK → DECIDE → OBSERVE → EXPLAIN, and rewards.
import {evidence,initialMission,loadMission,saveMission,stageIndex,transition,validateEvidenceRecord,type MissionState,type Decision} from './mission';
import {MAY19,MAY20,PEAK,RISE,WINDOWS,ABOVE_CUTOFF,median,hhmm,validateSeries} from './series';
import {CARDS,HELP,MISSION,NURI,OBJECTIVES,STAGE_STEPS,UI,type Locale,type StageKey,pick} from '../content/strings';
import {DISCOVERIES,discovery} from '../content/discoveries';
import {BUILDINGS} from '../world-data';
import {guideTarget,IDLE_OFFER_MS,MISSION_BUILDING} from '../game/guidance';
import type {ProgressStore} from '../game/progress';
import {chartSvg} from '../ui/chart';
import {$,asset,bdi,esc,modals,renderCard,type CardSpec} from '../ui/shell';

type Deps={locale:()=>Locale;progress:ProgressStore;openHelp:(from:'card'|'hud')=>void;openPassport:()=>void};
type Seq='brief'|'field'|'research'|'decide'|'later'|'debrief'|'status'|`exhibit:${string}`;
const MID:StageKey[]=['monitor','research','command','nextShift'];
const say=(text:string,mood='speak')=>window.dispatchEvent(new CustomEvent('ripple-dialogue',{detail:{text,mood}}));
const control=(type:string,value?:unknown)=>window.dispatchEvent(new CustomEvent('ripple-control',{detail:{type,value}}));
const bName=(id:string,l:Locale)=>{const b=BUILDINGS.find(v=>v.id===id)!;return l==='en'?b.name:b.ar};
const r0=(n:number)=>String(Math.round(n));

export function setupScienceUI(deps:Deps){
  const P=deps.progress;
  let mission:MissionState=loadMission();
  P.migrateFromMission(mission);
  let seq:Seq|null=null,page=0,review=false;
  let selected:number|null=null,riseHint=false,explainPick:number|null=null,q1:null|'yes'|'no'=null,q2:null|'a'|'b'|'c'=null;
  let room:string|null=null,guideDistance='none';
  let lastProgress=Date.now(),offers:Record<string,number>={},wrong:Record<string,number>={},arrived:Record<string,boolean>={},missTimes:number[]=[];
  const overlay=document.createElement('div');overlay.id='science-overlay';overlay.className='hidden';
  overlay.innerHTML='<article class="science-card pixel-panel" role="dialog" aria-modal="true" aria-labelledby="science-title"><button id="science-close" type="button" aria-label="Close">×</button><div id="science-content"></div></article>';
  $('hud').append(overlay);
  const content=()=>$('science-content');
  $('science-close').addEventListener('click',()=>close());

  const stage=()=>mission.stage as StageKey;
  const guided=()=>P.get().settings.guidance==='guided';
  const touch=()=>{lastProgress=Date.now()};
  function save(next:MissionState){const changed=next.stage!==mission.stage;mission=next;saveMission(next);if(changed){touch();arrived={}}renderHud();updateGuide()}
  function updateGuide(){const l=deps.locale(),g=guideTarget(stage(),room,l);control('guide',{kind:g.kind,buildingId:g.buildingId,x:g.x,y:g.y,mode:P.get().settings.guidance})}
  function award(id:string){return P.award(id)}

  // ------------------------------------------------------------------ HUD tracker
  let hudKey='';
  function renderHud(force=false){
    const l=deps.locale(),s=stage(),o=OBJECTIVES[s],key=l+'|'+s;if(!force&&key===hudKey)return;hudKey=key;
    $('mission-title').textContent=pick(MISSION.name,l);
    const idx=STAGE_STEPS.findIndex(v=>v.stage===s),done=s==='complete'?STAGE_STEPS.length:Math.max(0,idx);
    const pips=STAGE_STEPS.map((v,i)=>`<i class="${i<done?'done':i===idx?'now':''}" title="${esc(pick(v.label,l))}"></i>`).join('');
    const stepText=s==='ready'?'':s==='complete'?pick(o.task,l):pick(MISSION.step,l,{n:idx+1,total:STAGE_STEPS.length});
    $('objective-list').innerHTML=`<div class="tracker-now"><small>${pick(MISSION.now,l)}</small><strong id="objective-task">${esc(pick(o.task,l))}</strong></div>
      ${s==='ready'?'':`<div class="tracker-where"><img src="${asset('guide/guide-beacon')}" alt=""/><span id="objective-where">${esc(pick(o.where,l))}</span></div>`}
      <div class="tracker-progress"><span class="pips">${pips}</span><small>${esc(stepText)}</small></div>`;
    $('explored-text').textContent=pick(o.why,l);
    const actions=$('tracker-actions');
    actions.innerHTML=s==='ready'?`<button type="button" id="science-mission-button" class="tracker-primary">${pick(MISSION.start,l)}</button>`
      :s==='complete'?`<button type="button" id="science-mission-button" class="tracker-primary">${pick(MISSION.replay,l)}</button><button type="button" id="mission-review-button">${pick(MISSION.brief,l)}</button>`
      :`<button type="button" id="science-mission-button">${pick(MISSION.brief,l)}</button>`;
    actions.insertAdjacentHTML('beforeend',`<button type="button" id="help-button" class="help-button"><img src="${asset('ui/ui-help-pixel')}" alt=""/>${pick(MISSION.help,l)} <kbd>H</kbd></button>`);
    $('science-mission-button').onclick=missionButton;
    document.getElementById('mission-review-button')?.addEventListener('click',()=>show('debrief',0,true));
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

  // ------------------------------------------------------------------ cards
  function show(s:Seq,p=0,isReview=false){seq=s;page=p;review=isReview;overlay.classList.remove('hidden');modals.open('science',close);renderCard_();
    requestAnimationFrame(()=>(content().querySelector<HTMLElement>('.learning-next:not([disabled]),.learning-option,[data-science-action]'))?.focus())}
  function close(){if(!seq)return;seq=null;overlay.classList.add('hidden');modals.closed('science')}

  const sourceBlock=(l:Locale,extra='')=>`<p>${l==='en'?'Instrument':'الجهاز'}: ${bdi(evidence.instrument)} · ${l==='en'?'Place':'المكان'}: ${l==='en'?'Curiosity rover, Mars surface':'الروبوت كيوريوسيتي، سطح المريخ'}</p>
    <p>${l==='en'?'Measurement':'القياس'}: ${l==='en'?'absorbed dose rate in':'معدل الجرعة الممتصة بوحدة'} ${bdi(evidence.derived.unit)} · ${l==='en'?'not an astronaut dose, not inside our pretend base.':'مش جرعة رائد فضاء، ومش جوه قاعدتنا الخيالية.'}</p>${extra}
    <p>${bdi(evidence.datasetId)} · ${bdi(evidence.findingIds.join(', '))} · ${bdi(evidence.eventId)}<br>${bdi(evidence.sourceRecord)}<br>SHA-256: ${bdi(evidence.sourceSha256)}</p>
    <a href="${evidence.sourceUrl}" target="_blank" rel="noopener noreferrer">${pick(UI.openSource,l)}</a>`;
  const exactRows=(l:Locale)=>`<p>${l==='en'?'Highest retrieved reading':'أعلى قراية مسترجعة'}: ${bdi(`${PEAK.v} ${evidence.derived.unit} · ${hhmm(PEAK.ts)} UTC`)}</p><p>${l==='en'?`All ${MAY20.length} rows from 20 May are drawn. Selected rows`:`كل الـ${MAY20.length} صف بتوع ٢٠ مايو مرسومين. صفوف مختارة`}: ${bdi(evidence.measurements.map(p=>`${p.timestampUtc.slice(11,16)} · ${p.absorbedDoseRate}`).join(' | '))}</p>`;
  const medianBars=(l:Locale)=>{const m19=median(MAY19.map(r=>r.v)),m20=median(MAY20.map(r=>r.v)),max=m20;
    return `<div class="median-bars" dir="ltr" role="img" aria-label="${l==='en'?`Middle reading: 19 May about ${m19.toFixed(1)}, 20 May about ${m20.toFixed(1)} µGy/hour`:`القراية اللي في النص: ١٩ مايو حوالي ${m19.toFixed(1)}، ٢٠ مايو حوالي ${m20.toFixed(1)}`}">
      <small dir="${l==='ar'?'rtl':'ltr'}">${pick(CARDS.meaning.middle,l)}</small>
      ${[[l==='en'?'19 MAY':'١٩ مايو',m19,'d19'],[l==='en'?'20 MAY':'٢٠ مايو',m20,'d20']].map(([lab,v,c])=>`<div class="mb-row"><span>${lab}</span><div class="mb-track"><i class="${c}" style="width:${Math.max(1,Number(v)/max*100).toFixed(1)}%"></i></div><b>${(v as number).toFixed(1)}</b></div>`).join('')}</div>`};
  const choiceTitle=(c:Decision|null,l:Locale)=>pick(c==='review-defer'?CARDS.decide.aTitle:CARDS.decide.bTitle,l);

  function spec(l:Locale):CardSpec{
    const s=seq!,C=CARDS,rv=review;
    if(s==='brief')return {kind:'observation',step:0,title:l==='en'?'A mystery from Mars':'لغز من المريخ',
      art:`<img class="card-illus" src="${asset('science/science-curiosity')}" alt="${esc(pick(UI.illustration,l))}"/>`,
      obs:pick(OBJECTIVES.ready.intro,l),
      body:`<div class="learning-route">${[['science-radiation','field'],['science-research','research'],['science-choice','command'],['science-calendar','comms']].map(([icon,id],i)=>`<span><img class="learning-icon" src="${asset('ui/'+icon)}" alt=""/><b>${i+1}. ${id==='field'?(l==='en'?'Field':'الميدان'):esc(bName(id,l))}</b></span>`).join('')}</div>`,
      nuri:pick(OBJECTIVES.monitor.intro,l),tags:['nasa','sim'],primary:{label:l==='en'?'LET’S GO':'يلا بينا',action:'close'}};
    if(s==='field'){
      if(page===0){award('ev:curiosity-card');return {kind:'observation',step:0,title:pick(C.rover.title,l),art:`<img class="card-illus" src="${asset('science/science-curiosity')}" alt=""/><small class="illus-note">${pick(UI.illustration,l)}</small>`,
        obs:pick(C.rover.obs,l),expl:pick(C.rover.expl,l),more:pick(C.rover.more,l),nuri:pick(C.rover.nuri,l),tags:['nasa'],details:sourceBlock(l),primary:{label:pick(UI.next,l),action:'next'},page:[0,3],review:rv}}
      if(page===1){award('ev:rad-card');return {kind:'meaning',step:1,title:pick(C.rad.title,l),art:`<img class="card-illus" src="${asset('science/science-rad')}" alt=""/><small class="illus-note">${pick(UI.illustrationRad,l)}</small>`,
        obs:pick(C.rad.obs,l),expl:pick(C.rad.expl,l),more:pick(C.rad.more,l),nuri:pick(C.rad.nuri,l),tags:['nasa'],details:sourceBlock(l),primary:{label:pick(UI.next,l),action:'next'},back:true,page:[1,3],review:rv}}
      award('ev:may20-series');
      const w=selected!=null?WINDOWS[selected]:null;
      const fb=!w?`<p class="feedback hint">${pick(C.changed.task,l)}</p>`:w.kind==='change'?`<p class="feedback good">${pick(C.changed.found,l,{range:bdi(hhmm(RISE.from.ts)+'–'+hhmm(RISE.to.ts)+' UTC'),peak:bdi(r0(PEAK.v)),at:bdi(hhmm(PEAK.ts)+' UTC')})}</p>`
        :`<p class="feedback">${pick(w.kind==='low'?C.changed.low:C.changed.falling,l,{v:bdi(r0(median(w.readings.map(r=>r.v))))})} <small>${pick(C.changed.count,l,{n:bdi(w.readings.length)})}</small></p>`;
      return {kind:'think',step:2,title:pick(C.changed.title,l),art:chartSvg(l,{windows:true,selected,highlightRise:riseHint,showPeak:w?.kind==='change'}),artWide:true,
        obs:pick(C.changed.obs,l),body:`<div class="feedback-box" aria-live="polite">${fb}</div><p class="card-note">${pick(C.changed.honest,l)} ${pick(C.changed.notBase,l)}</p>`,
        nuri:pick(C.changed.nuri,l),tags:['nasa'],details:sourceBlock(l,exactRows(l)),
        primary:{label:rv?pick(UI.close,l):pick(C.changed.nextLabel,l),action:'field-done'},secondary:[{label:pick(UI.askNuri,l),action:'ask-nuri'}],back:true,page:[2,3],review:rv};
    }
    if(s==='research'){
      if(page===0){award('ev:may19-compare');return {kind:'meaning',step:1,title:pick(C.meaning.title,l),art:chartSvg(l,{compare:true,highlightRise:riseHint})+medianBars(l),artWide:true,
        obs:pick(C.meaning.obs,l),more:pick(C.meaning.more,l),nuri:pick(C.meaning.nuri,l),tags:['nasa','learn'],
        details:sourceBlock(l,`<p>${l==='en'?'Medians of all retrieved rows':'وسيط كل الصفوف المسترجعة'}: ${bdi(`19 May ${evidence.derived.previousDayMedian} · 20 May ${evidence.derived.eventDayMedian} ${evidence.derived.unit}`)}</p>`),
        primary:{label:pick(UI.next,l),action:'next'},secondary:[{label:pick(UI.askNuri,l),action:'ask-nuri'}],page:[0,3],review:rv}}
      if(page===1){award('ev:unknowns');const U=C.unknown;
        return {kind:'uncertainty',step:2,title:pick(U.title,l),
          body:`<div class="unknown-grid">${[[U.base,U.baseA,'science-robot'],[U.cause,U.causeA,'science-question'],[U.person,U.personA,'science-question'],[U.one,U.oneA,'science-clock']].map(([q,a,ic])=>`<div class="unknown-tile"><img class="learning-icon" src="${asset('ui/'+ic)}" alt=""/><div><strong>${pick(q as any,l)}</strong><span>${pick(a as any,l)}</span></div></div>`).join('')}</div>`,
          nuri:pick(U.nuri,l),tags:['nasa','learn'],details:sourceBlock(l,`<p>${evidence.uncertainty[l]}</p>`),primary:{label:pick(U.secondLook,l),action:'next'},back:true,page:[1,3],review:rv}}
      award('ev:second-look');
      return {kind:'think',step:2,title:pick(C.second.title,l),art:chartSvg(l,{cutoff:true,showPeak:true}),artWide:true,
        obs:pick(C.second.obs,l,{n:bdi(ABOVE_CUTOFF.length),h:bdi(r0(evidence.derived.spanHours))}),nuri:pick(C.second.nuri,l),tags:['nasa','learn'],
        details:sourceBlock(l,`<p>${l==='en'?'Readings above the descriptive':'قراءات فوق خط الوصف'} ${bdi(evidence.derived.exploratoryCutoff+' '+evidence.derived.unit)} ${l==='en'?'line':''}: ${bdi(evidence.derived.readingsAboveExploratoryCutoff)} · ${bdi(hhmm(ABOVE_CUTOFF[0].ts)+'–'+hhmm(ABOVE_CUTOFF.at(-1)!.ts)+' UTC')} · ${bdi(evidence.derived.spanHours.toFixed(2)+' h')}. ${l==='en'?'This line is not a human safety limit.':'الخط ده مش حد أمان للإنسان.'}</p>`),
        primary:{label:rv?pick(UI.close,l):pick(C.second.nextLabel,l),action:'research-done'},back:true,page:[2,3],review:rv};
    }
    if(s==='decide'){const D=C.decide;
      if(page===0)return {kind:'decision',step:3,title:pick(D.title,l),obs:pick(D.sub,l),
        body:`<div class="know-strip"><small>${pick(D.know,l)}</small><span>${pick(D.know1,l)}</span><span>${pick(D.know2,l)}</span></div>
        <div class="learning-options">${([['review-defer','science-research',D.aTitle,D.aDo,D.aNow,D.aLater],['survey-followup','science-rover',D.bTitle,D.bDo,D.bNow,D.bLater]] as const).map(([a,ic,t,d,n,lt])=>`<button type="button" data-science-action="${a}" class="learning-option"><img class="learning-icon" src="${asset('ui/'+ic)}" alt=""/><b>${pick(t,l)}</b><span class="opt-do">${pick(d,l)}</span><span class="opt-now"><i>⏱</i>${pick(n,l)}</span><span class="opt-later"><i>↪</i>${pick(lt,l)}</span><small class="opt-slot">${pick(D.slot,l)}</small></button>`).join('')}</div>`,
        nuri:pick(D.nuri,l),tags:['sim','choice'],details:`<p>${pick(D.honest,l)}</p><p>P2-M02A = ${l==='en'?'A':'أ'} · P2-M02B = ${l==='en'?'B':'ب'} · ${l==='en'?'training work slot: a game balance value, not NASA time.':'فترة الشغل التدريبية: قيمة في اللعبة، مش وقت حقيقي من ناسا.'}</p>`,
        secondary:[{label:pick(UI.askNuri,l),action:'ask-nuri'}],review:rv};
      if(page===1){const E=C.explain,fb=explainPick?[E.f1,E.f2,E.f3,E.f4][explainPick-1]:null;
        return {kind:'decision',step:3,title:pick(E.title,l),obs:pick(E.q,l),
          body:`<div class="chip-choices">${[E.c1,E.c2,E.c3,E.c4].map((c,i)=>`<button type="button" class="chip ${explainPick===i+1?'sel':''}" data-science-action="explain-${i+1}" aria-pressed="${explainPick===i+1}">${pick(c,l)}</button>`).join('')}</div><div class="feedback-box" aria-live="polite">${fb?`<p class="feedback ${explainPick!<=2?'good':''}">${pick(fb,l)}</p>`:''}</div>`,
          tags:['choice','learn'],primary:{label:explainPick?pick(UI.next,l):pick(UI.skip,l),action:'next'},page:[1,3]}}
      const N=C.now,c=mission.choice;
      return {kind:'consequence',step:4,title:pick(N.title,l),
        body:`<div class="ripple-flow"><div class="rf-card choice"><small>${pick(N.chose,l)}</small><strong>${choiceTitle(c,l)}</strong></div><div class="rf-arrow" aria-hidden="true">→</div><div class="rf-card now"><small>${pick(MISSION.now,l)}</small><strong>${pick(c==='review-defer'?N.aNow:N.bNow,l)}</strong></div></div>
          <div class="fact-row"><span class="learning-tag sim">${pick(N.slot,l)}</span><span class="learning-tag nasa">${pick(N.nasa,l)}</span></div><p class="card-note">${pick(N.later,l)}</p>`,
        nuri:pick(N.nuri,l),tags:['sim','choice'],primary:{label:rv?pick(UI.close,l):pick(N.nextLabel,l),action:'close'},page:rv?undefined:[2,3],review:rv};
    }
    if(s==='later'){const Lt=C.later,c=mission.choice;
      return {kind:'consequence',step:4,title:pick(Lt.title,l),
        body:`<div class="ripple-flow"><div class="rf-card choice"><small>${pick(Lt.earlier,l)}</small><strong>${choiceTitle(c,l)}</strong><span>${pick(c==='review-defer'?C.now.aNow:C.now.bNow,l)}</span></div><div class="rf-arrow" aria-hidden="true">→</div><div class="rf-card later"><small>${pick(Lt.laterL,l)}</small><strong>${pick(c==='review-defer'?Lt.aLater:Lt.bLater,l)}</strong></div></div>
          <div class="learning-mini-poster"><img class="learning-icon" src="${asset('ui/science-choice')}" alt=""/><span>${pick(Lt.unchanged,l)}</span></div>`,
        nuri:pick(Lt.nuri,l),tags:['sim','nasa'],primary:{label:rv?pick(UI.close,l):pick(Lt.nextLabel,l),action:'later-done'},review:rv};
    }
    if(s==='debrief'){const Dz=C.debrief,c=mission.choice,P0=P.get();
      if(page===0){const other=P0.branchesSeen.length===2?`<p class="card-note">${pick(Dz.other,l,{plan:choiceTitle(c==='review-defer'?'survey-followup':'review-defer',l)})}</p>`:'';
        return {kind:'discovery',step:5,title:pick(Dz.title,l),
          body:`<div class="debrief-grid">
            <div class="db-tile nasa"><small>${pick(Dz.discovery,l)}</small><span>${pick(Dz.discoveryA,l)}</span></div>
            <div class="db-tile"><small>${pick(Dz.investigated,l)}</small><span>${pick(Dz.investigatedA,l)}</span></div>
            <div class="db-tile choice"><small>${pick(Dz.decision,l)}</small><span>${choiceTitle(c,l)}</span></div>
            <div class="db-tile sim"><small>${pick(Dz.nowL,l)}</small><span>${pick(c==='review-defer'?C.now.aNow:C.now.bNow,l)}</span></div>
            <div class="db-tile sim"><small>${pick(Dz.laterL,l)}</small><span>${pick(c==='review-defer'?C.later.aLater:C.later.bLater,l)}</span></div>
            <div class="db-tile learn"><small>${pick(Dz.learned,l)}</small><span>${pick(Dz.learnedA,l)}</span></div></div>${other}`,
          tags:['nasa','sim','choice','learn'],details:sourceBlock(l),primary:{label:pick(Dz.nextLabel,l),action:'next'},page:[0,3],review:rv}}
      if(page===1){const Rf=C.reflect;
        const f1=q1?`<p class="feedback ${q1==='no'?'good':''}">${pick(q1==='no'?Rf.q1No:Rf.q1Yes,l)}</p>`:'';
        const f2=q2?`<p class="feedback ${q2==='a'?'good':''}">${pick(q2==='a'?Rf.q2aF:q2==='b'?Rf.q2bF:Rf.q2cF,l)}</p>`:'';
        return {kind:'think',step:5,title:pick(Rf.title,l),obs:pick(Rf.optional,l),
          body:`<div class="reflect-q"><p class="q">${pick(Rf.q1,l)}</p><div class="chip-choices two"><button type="button" class="chip ${q1==='yes'?'sel':''}" data-science-action="reflect-yes">${pick(Rf.yes,l)}</button><button type="button" class="chip ${q1==='no'?'sel':''}" data-science-action="reflect-no">${pick(Rf.no,l)}</button></div><div class="feedback-box" aria-live="polite">${f1}</div></div>
            <div class="reflect-q"><p class="q">${pick(Rf.q2,l)}</p><div class="chip-choices">${(['a','b','c'] as const).map(k=>`<button type="button" class="chip ${q2===k?'sel':''}" data-science-action="transfer-${k}">${pick(k==='a'?Rf.q2a:k==='b'?Rf.q2b:Rf.q2c,l)}</button>`).join('')}</div><div class="feedback-box" aria-live="polite">${f2}</div></div>`,
          primary:{label:mission.stage==='debrief'?pick(Rf.finish,l):pick(UI.next,l),action:mission.stage==='debrief'?'finish':'next'},back:true,page:[1,3],review:rv}}
      const Dn=C.done,run=P0.run.events,runXp=run.reduce((s,id)=>s+(P.xpOf(id)),0);
      const badges=run.map(id=>P.eventAchievement(id)).filter(Boolean) as string[];
      const cards=run.flatMap(id=>P.eventCards(id));
      return {kind:'discovery',step:5,title:pick(Dn.title,l),
        body:`<div class="done-banner"><img src="${asset('badges/badge-mission-complete')}" alt=""/><div><small>${pick(Dn.xp,l)}</small><strong class="xp-big"><img src="${asset('ui/ui-xp-pixel')}" alt=""/> +${bdi(runXp)}</strong><span>${pick(Dn.total,l)}: ${bdi(P.xp())} · ${esc(P.titleName(l))}</span></div></div>
          ${badges.length||cards.length?`<div class="done-rewards">${badges.map(b=>`<span class="reward-chip"><img src="${asset('badges/badge-'+b)}" alt=""/>${esc(P.achievementLabel(b,l))}</span>`).join('')}${cards.map(cid=>`<span class="reward-chip card"><img src="${asset(discovery(cid)!.icon)}" alt=""/>${esc(discovery(cid)!.title[l])}</span>`).join('')}</div>`:`<p class="card-note">${pick(Dn.none,l)}</p>`}
          <p class="card-note">${pick(Dn.replayNote,l)}</p>`,
        primary:{label:pick(Dn.replay,l),action:'replay'},secondary:[{label:pick(Dn.passport,l),action:'passport'},{label:pick(Dn.explore,l),action:'close'}],page:[2,3]};
    }
    if(s==='status'){const S=C.status,st=stage(),o=OBJECTIVES[st];
      const steps=STAGE_STEPS.map(v=>{const i=stageIndex(v.stage as any),cur=stageIndex(mission.stage);return `<li class="${cur>i?'done':cur===i?'now':''}"><b>${cur>i?'✓':''}</b>${esc(pick(v.label,l))}</li>`}).join('');
      const sec=[{label:pick(S.go,l),action:'show-way'}];
      if(mission.monitorReviewed)sec.push({label:`${pick(S.review,l)} · ${l==='en'?'graph':'الرسم'}`,action:'review-field'});
      if(mission.researchReviewed)sec.push({label:`${pick(S.review,l)} · ${l==='en'?'two days':'اليومين'}`,action:'review-research'});
      return {kind:'status',title:pick(MISSION.name,l),
        body:`<div class="status-goal"><div><small>${pick(MISSION.now,l)}</small><strong>${esc(pick(o.task,l))}</strong></div><div><small>${pick(MISSION.where,l)}</small><span>${esc(pick(o.where,l))}</span></div><div><small>${pick(MISSION.why,l)}</small><span>${esc(pick(o.why,l))}</span></div></div><ol class="status-steps">${steps}</ol>`,
        nuri:pick(o.intro,l),secondary:sec,primary:{label:pick(UI.close,l),action:'close'}};
    }
    const exId=s.slice(8),d=discovery(exId)!;
    return {kind:'exhibit',title:d.title[l],art:`<img class="card-illus icon" src="${asset(d.icon)}" alt=""/>`,obs:d.short(l),nuri:pick(NURI.exhibitIntro,l),tags:['nasa','learn'],
      details:`<p>${d.detail(l)}</p><p>${l==='en'?'Source':'المصدر'}: ${bdi(d.org)} · ${bdi(d.refs.join(', '))}</p><a href="${d.url}" target="_blank" rel="noopener noreferrer">${pick(UI.openSource,l)}</a>`,primary:{label:pick(UI.close,l),action:'close'}};
  }
  function renderCard_(){
    if(!seq)return;const l=deps.locale();
    const sp=spec(l);
    overlay.querySelector('.science-card')!.className=`science-card pixel-panel card-${sp.kind} seq-${seq.split(':')[0]}`;
    content().innerHTML=renderCard(l,sp,!guided());
    content().querySelectorAll<HTMLElement>('[data-science-action]').forEach(b=>b.addEventListener('click',()=>act(b.dataset.scienceAction!)));
    content().querySelectorAll<SVGRectElement>('rect[data-window]').forEach(r=>r.addEventListener('click',()=>act('window-'+r.dataset.window)));
  }

  function act(action:string){
    const l=deps.locale();touch();
    if(action==='close'){const wasNow=seq==='decide'&&page===2;close();if(wasNow&&!review)say(pick(OBJECTIVES.nextShift.intro,l));return}
    if(action==='next'){page++;renderCard_();focusPrimary();return}
    if(action==='back'){page=Math.max(0,page-1);renderCard_();focusPrimary();return}
    if(action==='ask-nuri'){deps.openHelp('card');return}
    if(action==='passport'){close();deps.openPassport();return}
    if(action==='replay'){close();replay();return}
    if(action==='show-way'){close();control('reveal','device');control('show-me');return}
    if(action==='review-field'){show('field',2,true);return}
    if(action==='review-research'){show('research',0,true);return}
    if(action.startsWith('window-')){selected=Number(action.slice(7));if(WINDOWS[selected].kind==='change')award('ev:found-change');renderCard_();return}
    if(action.startsWith('explain-')){explainPick=Number(action.slice(8));if(explainPick<=2)award('ev:explain-choice');renderCard_();return}
    if(action==='reflect-yes'||action==='reflect-no'){q1=action==='reflect-no'?'no':'yes';if(q1==='no')award('ev:reflect-dose');renderCard_();return}
    if(action.startsWith('transfer-')){q2=action.slice(9) as 'a'|'b'|'c';if(q2==='a')award('ev:transfer');renderCard_();return}
    if(action==='field-done'){if(review||mission.stage!=='monitor'){close();return}save(transition(mission,'monitor-reviewed'));close();say(pick(OBJECTIVES.research.intro,l));return}
    if(action==='research-done'){if(review||mission.stage!=='research'){close();return}save(transition(mission,'research-reviewed'));close();say(pick(OBJECTIVES.command.intro,l));return}
    if(action==='review-defer'||action==='survey-followup'){const next=transition(mission,action);if(next===mission)return;save(next);P.seeBranch(action);explainPick=null;page=1;renderCard_();focusPrimary();say(pick(CARDS.now.nuri,l),'happy');return}
    if(action==='later-done'){if(review||mission.stage!=='nextShift'){close();return}save(transition(mission,'next-shift-reviewed'));q1=null;q2=null;show('debrief');say(pick(OBJECTIVES.debrief.intro,l),'happy');return}
    if(action==='finish'){const next=transition(mission,'finish');if(next===mission)return;save(next);P.completeRun();page=2;renderCard_();focusPrimary();say(pick(OBJECTIVES.complete.intro,l),'happy');return}
  }
  const focusPrimary=()=>requestAnimationFrame(()=>content().querySelector<HTMLElement>('.learning-next:not([disabled]),.learning-option,.chip')?.focus());

  // ------------------------------------------------------------------ world events
  window.addEventListener('ripple-world-interaction',event=>{
    const d=(event as CustomEvent<{kind:string;buildingId:string|null;exhibitId?:string}>).detail,l=deps.locale(),s=mission.stage;touch();
    if(d.kind==='door'||d.kind==='exit')return;
    if(d.kind==='exhibit'&&d.exhibitId){P.readExhibit(d.exhibitId);show(`exhibit:${d.exhibitId}`);return}
    if(d.kind==='field'){
      if(s==='ready'){say(pick(NURI.lockStart,l),'thinking');return}
      if(s==='monitor'){selected=null;riseHint=false;show('field');return}
      show('field',0,true);return}
    if(d.kind!=='equipment'||!d.buildingId)return;
    const id=d.buildingId,i=stageIndex(s);
    const missionRoom:Record<string,MissionState['stage']>={research:'research',command:'command',comms:'nextShift'};
    if(!missionRoom[id]){const b=BUILDINGS.find(v=>v.id===id)!;say(l==='en'?b.note:b.noteAr);return}
    const need=stageIndex(missionRoom[id]);
    if(s==='ready'){say(pick(NURI.lockStart,l),'thinking');return}
    if(i<need){say(pick(id==='research'?NURI.lockResearch:id==='command'?NURI.lockCommand:NURI.lockComms,l),'thinking');return}
    if(i===need){if(id==='research')show('research');else if(id==='command')show('decide');else show('later');return}
    if(id==='research')show('research',0,true);else if(id==='command')show('decide',2,true);else show('later',0,true);
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
    card:()=>seq?{seq,page,review}:null,
    highlightRise(){riseHint=true;if(seq==='field'&&page<2)page=2;renderCard_()},
    graphVisible:()=>seq==='field'&&page===2||seq==='research'&&(page===0||page===2),
    room:()=>room,
    discoveries:DISCOVERIES};
  (window as any).__mission=api;return api;
}
