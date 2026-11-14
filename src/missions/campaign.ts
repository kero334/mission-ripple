// Campaign engine for the missions after The Rover Reading (P2-M02).
// Owns its own save (mission-ripple-campaign-v1); never edits the P2-M02 save or the NASA snapshots.
import ev from '../science/campaign-evidence-v1.json';
import {CAMPAIGN,C_UI,type CampaignMission,type SceneDef,type Opt} from './campaign-data';
import {applyEffect,describeEffect,lowest,METER_IDS,sanitizeMeters,startMeters,type Meters} from '../game/base-sim';
import {BUILDINGS} from '../world-data';
import {CARDS,NURI,type Locale,pick} from '../content/strings';
import type {ProgressStore} from '../game/progress';
import type {GuideTarget,HintStep} from '../game/guidance';
import {EQUIPMENT_POS,EXIT_POS} from '../game/guidance';
import {$,asset,bdi,esc,modals,renderScene,type Scene} from '../ui/shell';

export const CAMPAIGN_KEY='mission-ripple-campaign-v1';
export type CampaignState={version:1;started:boolean;index:number;step:number;choices:Record<string,'A'|'B'>;flags:string[];meters:Meters;revealed:string[];alloc:Record<string,string>};
export const freshCampaign=():CampaignState=>({version:1,started:false,index:0,step:0,choices:{},flags:[],meters:startMeters(),revealed:[],alloc:{}});
export function sanitizeCampaign(x:any):CampaignState{
  const c=freshCampaign();if(!x||typeof x!=='object'||x.version!==1)return c;
  c.started=!!x.started;c.index=Number.isInteger(x.index)?Math.max(0,Math.min(CAMPAIGN.length,x.index)):0;
  const m=CAMPAIGN[c.index];c.step=m&&Number.isInteger(x.step)?Math.max(0,Math.min(m.steps.length-1,x.step)):0;
  for(const mm of CAMPAIGN.slice(0,c.index)){const v=x.choices?.[mm.id];c.choices[mm.id]=v==='B'?'B':'A'}
  if(m&&(x.choices?.[m.id]==='A'||x.choices?.[m.id]==='B'))c.choices[m.id]=x.choices[m.id];
  const allowed=new Set(CAMPAIGN.flatMap(mm=>mm.options.map(o=>o.flag)));c.flags=Array.isArray(x.flags)?[...new Set(x.flags.filter((f:unknown)=>typeof f==='string'&&allowed.has(f)))] as string[]:[];
  c.meters=sanitizeMeters(x.meters);c.revealed=Array.isArray(x.revealed)?x.revealed.filter((r:unknown)=>typeof r==='string'):[];
  c.alloc=x.alloc&&typeof x.alloc==='object'?Object.fromEntries(Object.entries(x.alloc).filter(([,v])=>['O','W','E'].includes(v as string))) as Record<string,string>:{};
  return c;
}
type Deps={locale:()=>Locale;progress:ProgressStore;roverDone:()=>boolean;guided:()=>boolean;openHelp:()=>void;openPassport:()=>void;onChange:()=>void};
const say=(text:string,mood='speak')=>window.dispatchEvent(new CustomEvent('ripple-dialogue',{detail:{text,mood}}));
const bName=(id:string,l:Locale)=>{const b=BUILDINGS.find(v=>v.id===id)!;return l==='en'?b.name:b.ar};
const img=(src:string,cls='')=>`<img class="scene-img ${cls}" src="${asset(src)}" alt=""/>`;
const r1=(v:string|number)=>Number(v).toFixed(1);
const hm=(ts:string)=>ts.slice(11,16);

export function setupCampaign(deps:Deps){
  const P=deps.progress;
  let s:CampaignState;try{s=sanitizeCampaign(JSON.parse(localStorage.getItem(CAMPAIGN_KEY)||'null'))}catch{s=freshCampaign()}
  const save=()=>{try{localStorage.setItem(CAMPAIGN_KEY,JSON.stringify(s))}catch{/* keep playing */}deps.onChange()};
  let seq:{scenes:SceneDef[];kind:'step'|'final'}|null=null,page=0,fresh=true,quizPick:Record<string,number>={},room:string|null=null;
  const overlay=document.createElement('div');overlay.id='campaign-overlay';overlay.className='hidden';
  overlay.innerHTML='<article class="science-card pixel-panel scene-card" role="dialog" aria-modal="true" aria-describedby="science-say"><button id="campaign-close" type="button" aria-label="Close">×</button><div id="campaign-content"></div></article>';
  $('hud').append(overlay);$('campaign-close').addEventListener('click',()=>close());
  const mission=():CampaignMission|null=>CAMPAIGN[s.index]||null;
  const active=()=>s.started&&s.index<CAMPAIGN.length&&deps.roverDone();
  const done=()=>s.started&&s.index>=CAMPAIGN.length;
  const step=()=>mission()?.steps[s.step]||null;
  const optOf=(m:CampaignMission)=>m.options.find(o=>o.id===s.choices[m.id])||null;

  // ---------------------------------------------------------------- grown-ups text (exact source values)
  function grown(key:string|undefined,l:Locale){
    const en=l==='en';
    if(key==='log'){const d=ev.log.duplicate,g=ev.log.gap;return `<p>${en?'Same-time rows (real)':'صفوف بنفس الوقت (حقيقية)'}: ${bdi(`${d.a[0]} · ${d.a[2]} | ${d.b[0]} · ${d.b[2]} ${ev.log.unit}`)} — ${bdi(d.sourceRecord)}</p><p>${en?'Gap (real)':'فراغ (حقيقي)'}: ${bdi(`${g.before.at(-1)![0]} → ${g.after[0][0]} UTC (${g.minutes} min)`)} — ${bdi(g.sourceRecord)}</p><p>${en?`${ev.log.conflictingRows} conflicting same-time rows in 2015–2024 (P2-RAD-08); reason unknown. Only intervals ≤ 30 min are integrated (P2-RAD-06).`:`${bdi(ev.log.conflictingRows)} صف متعارض في ٢٠١٥–٢٠٢٤ (P2-RAD-08)؛ السبب مش معروف. الفترات اللي ≤ ٣٠ دقيقة بس هي اللي بتتحسب (P2-RAD-06).`}</p><a href="${ev.log.sourceUrl}" target="_blank" rel="noopener noreferrer">NASA RadLab ↗</a>`}
    if(key==='sun'){const f=ev.sun.strongest;return `<p>DONKI ${bdi(ev.sun.period)}: ${bdi(`FLR ${ev.sun.counts.FLR} · CME ${ev.sun.counts.CME} · SEP ${ev.sun.counts.SEP}`)} (SCI-0003)</p><p>${en?'Strongest listed flare':'أقوى توهج متسجل'}: ${bdi(`${f.class} · ${f.begin_utc}`)}</p><p>${esc(ev.sun.caveat)}</p><a href="${ev.sun.sourceUrl}" target="_blank" rel="noopener noreferrer">NASA DONKI ↗</a>`}
    if(key==='plants')return `<p>${bdi(ev.plants.datasetId)} (P2-OSD-615): ${bdi(`${ev.plants.samples}`)} ${en?'samples':'عينة'} · ${bdi(Object.entries(ev.plants.groups.spaceflight).map(([k,v])=>`${k} ${v}`).join(' · '))} · ${en?'growth-time groups':'مجموعات زمن النمو'} ${bdi(Object.keys(ev.plants.groups['growth time']).join(' / '))}</p><p>${esc(ev.plants.limitation)}</p><a href="${ev.plants.sourceUrl}" target="_blank" rel="noopener noreferrer">NASA OSDR ↗</a>`;
    if(key==='map')return `<p>${bdi(ev.map.datasetId)} (P2-TREK-01), ${bdi(ev.map.format)}. ${esc(ev.map.limitation)}</p><a href="${ev.map.sourceUrl}" target="_blank" rel="noopener noreferrer">NASA Mars Trek ↗</a>`;
    if(key==='dose')return `<p>P2-RAD-07: ${esc(ev.dose.limitation)}</p><a href="${ev.dose.sourceUrl}" target="_blank" rel="noopener noreferrer">NASA RadLab ↗</a>`;
    return `<p>${en?'Pretend game rule (src/game/base-sim.ts). Not NASA data.':'قاعدة لعبة خيالية. مش بيانات ناسا.'}</p>`;
  }
  // ---------------------------------------------------------------- pictures
  function meterArt(l:Locale,m=s.meters,delta?:Partial<Meters>){
    return `<div class="meters-art">${METER_IDS.map(k=>`<div class="m-row"><img src="${asset(`ui/ui-${k==='food'?'food':k}-pixel`)}" alt=""/><b>${pick(C_UI.meterNames[k],l)}</b><span class="pips">${Array.from({length:5},(_,i)=>`<i class="${i<m[k]?'on':''}"></i>`).join('')}</span>${delta?.[k]?`<em class="${delta[k]!>0?'up':'down'}">${delta[k]!>0?'+':''}${delta[k]}</em>`:''}</div>`).join('')}</div>`}
  function art(key:string,l:Locale){
    if(key.startsWith('building:'))return img(`buildings/${key.slice(9)}-pixel`,'building');
    if(key.startsWith('icon:'))return `<div class="vs-art one">${img(key.slice(5),'icon-big bob')}</div>`;
    if(key==='notebook')return `<div class="vs-art one">${img('science/science-curiosity','mid')}${img('science/science-rows','icon-big')}</div>`;
    if(key==='dupes'){const d=ev.log.duplicate;const row=(r:string[],hl=false)=>`<div class="log-row ${hl?'hl':''}"><span>${bdi(hm(r[0]))}</span><b>${bdi(r1(r[2]))}</b></div>`;
      return `<div class="log-art" dir="ltr"><small>${bdi(d.a[0].slice(0,10))}</small>${row(d.before)}${row(d.a,true)}${row(d.b,true)}</div>`}
    if(key==='gap'){const g=ev.log.gap;return `<div class="gap-art" dir="ltr">${g.before.map(r=>`<i class="dot" title="${hm(r[0])}"></i>`).join('')}<span class="hole">?</span>${g.after.map(r=>`<i class="dot" title="${hm(r[0])}"></i>`).join('')}<div class="gap-times"><span>${bdi(hm(g.before.at(-1)![0]))}</span><span>${bdi(hm(g.after[0][0]))}</span></div></div>`}
    if(key==='sun')return `<div class="vs-art one">${img('science/science-sun','icon-big bob')}<span class="date-chip">${bdi(l==='en'?'May 2024':'مايو ٢٠٢٤')}</span></div>`;
    if(key==='sunToMars')return `<div class="ripple-art">${img('science/science-sun','icon-big')}<span class="rf-arrow">⇢ ?</span>${img('intro/mars','icon-big')}</div>`;
    if(key==='plants')return `<div class="plants-art"><figure>${img('intro/rocket','tiny-rocket')}<div>${Array.from({length:6},()=>img('ui/ui-plant-pixel','plant')).join('')}</div><figcaption>${l==='en'?'In space':'في الفضاء'}</figcaption></figure><figure>${img('intro/earth','tiny-earth')}<div>${Array.from({length:6},()=>img('ui/ui-plant-pixel','plant')).join('')}</div><figcaption>${l==='en'?'On the ground':'على الأرض'}</figcaption></figure></div>`;
    if(key==='meters')return meterArt(l);
    if(key==='map')return `<div class="map-art">${img('ui/ui-map-pixel','icon-big')}<div class="color-strip"><span>${l==='en'?'low':'واطي'}</span><i></i><span>${l==='en'?'high':'عالي'}</span></div></div>`;
    if(key==='history')return `<div class="history-art">${CAMPAIGN.slice(0,s.index).map(mm=>{const o=optOf(mm);return `<figure>${img(mm.icon,'icon-mid')}<figcaption>${o?(l==='en'?o.id:o.id==='A'?'أ':'ب'):''}</figcaption></figure>`}).join('')}</div>${meterArt(l)}`;
    return '';
  }
  // ---------------------------------------------------------------- scene list for the current step
  function rippleScene(l:Locale):SceneDef|null{
    if(s.index===0||s.step!==0)return null;
    const prev=CAMPAIGN[s.index-1],o=optOf(prev);if(!o)return null;
    return {id:'ripple',art:'ripple',stamp:'game',say:o.later};
  }
  function buildScenes(l:Locale):SceneDef[]{
    const m=mission()!,st=step()!;const list:SceneDef[]=[];
    const rp=rippleScene(l);if(rp)list.push(rp);
    list.push(...st.scenes);
    if(st.decide)list.push({id:'choose',art:'choose',stamp:'game',say:C_UI.choose,more:C_UI.pretendMore},{id:'now',art:'now',stamp:'game',say:{en:'',ar:''}},{id:'lesson',art:'lesson',say:m.lesson});
    return list;
  }
  function open(){if(!active())return;seq={scenes:buildScenes(deps.locale()),kind:'step'};page=0;fresh=true;show()}
  function show(){overlay.classList.remove('hidden');modals.open('science',close);render();requestAnimationFrame(()=>overlay.querySelector<HTMLElement>('.big-choice,.chip,.learning-next')?.focus())}
  function close(){if(!seq)return;seq=null;overlay.classList.add('hidden');modals.closed('science')}

  function scene(l:Locale):Scene{
    const sc=seq!.scenes[page],m=mission(),n=seq!.scenes.length,pg:[number,number]=[page,n],B=CARDS.btn;
    const next=()=>({label:pick(B.next,l),action:'next'});
    if(seq!.kind==='final'){
      const lo=lowest(s.meters),steady=METER_IDS.every(k=>s.meters[k]>=2);
      return {id:'campaign-end',art:`<div class="done-art">${img('badges/badge-base-commander','icon-big bob')}</div>${art('history',l)}`,stamp:'game',good:true,
        say:pick(C_UI.allDone,l),more:steady?pick(C_UI.ending.steady,l):pick(C_UI.ending.low,l,{meter:pick(C_UI.meterNames[lo],l)}),
        primary:{label:pick(C_UI.playStory,l),action:'restart'},secondary:[{label:pick(B.badges,l),action:'passport'},{label:pick(B.explore,l),action:'close'}]};
    }
    if(sc.id==='ripple'){const prev=CAMPAIGN[s.index-1],o=optOf(prev)!;
      if(!s.revealed.includes(prev.id)){s.revealed=[...s.revealed,prev.id];if(o.laterEffect)s.meters=applyEffect(s.meters,o.laterEffect);save()}
      return {id:'ripple',art:`<div class="ripple-art">${img(prev.icon,'icon-big')}<span class="rf-arrow">→</span>${img(o.icon,'icon-big bob')}</div>${o.laterEffect?meterArt(l,s.meters,o.laterEffect):''}`,stamp:'game',say:pick(o.later,l),more:pick(C_UI.remember,l),primary:next(),page:pg}}
    if(sc.id==='choose')return {id:'choose',say:pick(sc.say,l),more:pick(C_UI.pretendMore,l),stamp:'game',
      art:`<div class="choice-row">${m!.options.map(o=>`<button type="button" class="big-choice" data-c-action="choose-${o.id}">${img(o.icon,'choice-icon')}<b><i>${l==='en'?o.id:o.id==='A'?'أ':'ب'}</i> ${esc(pick(o.title,l))}</b><span class="gain"><i aria-hidden="true">✓</i>${esc(pick(o.gain,l))}</span><span class="cost"><i aria-hidden="true">⏸</i>${esc(pick(o.cost,l))}</span></button>`).join('')}</div>`,
      grownups:`<p>${m!.options.map(o=>`${o.decisionId} = ${o.id}`).join(' · ')} (${l==='en'?'research package decision design':'تصميم القرار من ملف البحث'}). ${l==='en'?'Meter changes are pretend game rules (src/game/base-sim.ts), not NASA data.':'تغييرات العدادات قواعد لعبة خيالية، مش بيانات ناسا.'}</p>`,secondary:[{label:'?',action:'help'}]};
    if(sc.id==='now'){const o=optOf(m!)!;return {id:'now',stamp:'game',art:`<div class="ripple-art">${img(o.icon,'icon-big')}<span class="rf-arrow">→</span>${img('ui/science-clock','icon-big')}</div>${o.effect?meterArt(l,s.meters,o.effect):''}`,say:pick(o.now,l),primary:next(),page:pg}}
    if(sc.id==='lesson'){const run=['ev:mission-complete:'+m!.id],xp=P.xpOf(run[0]);
      return {id:'lesson',art:`<div class="done-art">${img('badges/badge-'+m!.badge,'icon-big bob')}<strong class="xp-big"><img src="${asset('ui/ui-xp-pixel')}" alt=""/>+${bdi(xp)}</strong></div>`,good:true,say:pick(m!.lesson,l),more:pick(C_UI.done,l,{xp}),
        primary:{label:pick(s.index+1<CAMPAIGN.length?C_UI.nextMission:B.done,l),action:'finish'},page:pg}}
    if(sc.id.startsWith('go-'))return {id:sc.id,art:art(sc.art,l),say:pick(sc.say,l),primary:{label:pick(B.go,l),action:'step-done'},page:pg};
    if(sc.award)P.award(sc.award);
    if(sc.quiz){const q=sc.quiz,pk=quizPick[sc.id],o=pk!=null?q.options[pk]:null;
      return {id:sc.id,art:art(sc.art,l),stamp:sc.stamp,say:o?pick(o.fb,l):pick(sc.say,l),good:!!o?.ok,grownups:sc.grown?grown(sc.grown,l):undefined,
        choices:`<div class="chip-row">${q.options.map((op,i)=>`<button type="button" class="chip ${pk===i?'sel':''}" data-c-action="quiz-${i}" aria-pressed="${pk===i}">${esc(pick(op.label,l))}</button>`).join('')}</div>`,
        primary:o?.ok?next():{label:pick(B.skip,l),action:'next'},secondary:[{label:'?',action:'help'}],back:page>0,page:pg}}
    if(sc.alloc){const a=s.alloc[m!.id];const fb=a==='O'?C_UI.allocOF:a==='W'?C_UI.allocWF:a==='E'?C_UI.allocEF:null;
      return {id:sc.id,art:meterArt(l,s.meters,a==='O'?{oxygen:2}:a==='W'?{water:2}:a==='E'?{oxygen:1,water:1}:undefined),stamp:'game',say:fb?pick(fb,l):pick(sc.say,l),good:!!fb,
        choices:a?'':`<div class="chip-row">${(['O','W','E'] as const).map(k=>`<button type="button" class="chip" data-c-action="alloc-${k}">${esc(pick(k==='O'?C_UI.allocO:k==='W'?C_UI.allocW:C_UI.allocE,l))}</button>`).join('')}</div>`,
        grownups:grown(undefined,l),primary:a?next():undefined,back:page>0,page:pg}}
    return {id:sc.id,art:art(sc.art,l),stamp:sc.stamp,say:pick(sc.say,l),more:sc.more?pick(sc.more,l):undefined,grownups:sc.grown?grown(sc.grown,l):sc.stamp==='game'?grown(undefined,l):undefined,primary:next(),back:page>0,page:pg};
  }
  function render(){
    if(!seq)return;const l=deps.locale(),sc=scene(l);
    overlay.querySelector('.science-card')!.className=`science-card pixel-panel scene-card page-${sc.id}${fresh?' fresh':''}`;fresh=false;
    const html=renderScene(l,sc).replaceAll('data-science-action=','data-c-action=');
    $('campaign-content').innerHTML=html;
    if(!deps.guided())$('campaign-content').querySelector('.say-more')?.setAttribute('open','');
    $('campaign-content').querySelectorAll<HTMLElement>('[data-c-action]').forEach(b=>b.addEventListener('click',()=>act(b.dataset.cAction!)));
  }
  function act(a:string){
    const l=deps.locale(),m=mission();
    if(a==='close'){close();return}
    if(a==='next'){page=Math.min(seq!.scenes.length-1,page+1);fresh=true;render();return}
    if(a==='back'){page=Math.max(0,page-1);fresh=true;render();return}
    if(a==='help'){deps.openHelp();return}
    if(a==='passport'){close();deps.openPassport();return}
    if(a==='restart'){close();restart();return}
    if(a.startsWith('quiz-')){const sc=seq!.scenes[page],i=Number(a.slice(5));quizPick[sc.id]=i;if(sc.quiz!.options[i].ok)P.award(sc.quiz!.award);render();return}
    if(a.startsWith('alloc-')&&m){const k=a.slice(6);if(!s.alloc[m.id]){s.alloc={...s.alloc,[m.id]:k};s.meters=applyEffect(s.meters,k==='O'?{oxygen:2}:k==='W'?{water:2}:{oxygen:1,water:1});P.award(seq!.scenes[page].award||'');save()}render();return}
    if(a.startsWith('choose-')&&m){const o=m.options.find(x=>x.id===a.slice(7))!;if(!s.choices[m.id]){s.choices={...s.choices,[m.id]:o.id};s.flags=[...new Set([...s.flags,o.flag])];s.meters=applyEffect(s.meters,o.effect);save();P.award('ev:choice:'+m.id)}
      page=seq!.scenes.findIndex(x=>x.id==='now');fresh=true;render();say(pick(o.now,l),'happy');return}
    if(a==='step-done'&&m){close();s.step=Math.min(m.steps.length-1,s.step+1);save();const st=step()!;say(pick(NURI.detour,l,{task:pick(st.task,l)}));return}
    if(a==='finish'&&m){P.award('ev:mission-complete:'+m.id);s.index++;s.step=0;quizPick={};save();close();
      if(s.index>=CAMPAIGN.length){P.award('ev:campaign-complete');seq={scenes:[],kind:'final'};page=0;fresh=true;show();return}
      say(pick(mission()!.brief,l),'happy');return}
  }
  function start(){if(!deps.roverDone())return;if(!s.started){s=freshCampaign();s.started=true;save()}say(pick(mission()!.brief,deps.locale()),'happy')}
  function restart(){s={...freshCampaign(),started:true};quizPick={};save();say(pick(mission()!.brief,deps.locale()),'happy')}

  // ---------------------------------------------------------------- world, guidance, HUD
  window.addEventListener('ripple-world-interaction',e=>{
    const d=(e as CustomEvent<{kind:string;buildingId:string|null;handled?:boolean}>).detail;
    if(!active()||d.kind!=='equipment'||!d.buildingId)return;
    if(d.buildingId===step()!.building){d.handled=true;open()}
  });
  window.addEventListener('ripple-room',e=>{const d=(e as CustomEvent<{room:string|null}>).detail;room=d.room;if(!active())return;const l=deps.locale(),st=step()!;
    if(d.room===st.building)say(pick(NURI.arrivedInside,l),'happy');
    else if(d.room)say(pick(NURI.wrongPlace,l,{name:bName(d.room,l),target:bName(st.building,l)}),'thinking');
    else if(deps.guided())say(pick(NURI.detour,l,{task:pick(st.task,l)}));
    deps.onChange()});
  function guide(l:Locale):GuideTarget|null{
    if(!active())return null;const b=BUILDINGS.find(v=>v.id===step()!.building)!;
    if(room===b.id)return {kind:'equipment',buildingId:b.id,...EQUIPMENT_POS,label:''};
    if(room)return {kind:'exit',buildingId:room,...EXIT_POS,label:''};
    return {kind:'door',buildingId:b.id,x:b.x,y:b.y+18,label:l==='en'?b.name:b.ar};
  }
  function hints(l:Locale):HintStep[]{const m=mission()!,st=step()!,inGoal=room===st.building;
    return [{level:0,category:'goal',text:`${pick(st.task,l)} · ${pick(st.where,l)}`,visual:'none'},
      {level:1,category:'nav',text:inGoal?(l==='en'?'You are in the right place!':'إنت في المكان الصح!'):room?(l==='en'?'Walk to the exit at the bottom of this room, then follow the yellow arrow.':'امشي لباب الخروج اللي تحت، وبعدين امشي ورا السهم الأصفر.'):(l==='en'?`Follow the yellow arrow to the ${bName(st.building,l)}. Press M for the map.`:`امشي ورا السهم الأصفر لحد ${bName(st.building,l)}. دوس M للخريطة.`),visual:'beacon'},
      {level:2,category:'control',text:l==='en'?'Go inside, walk to the big machine in the middle, and tap E.':'ادخل، امشي للجهاز الكبير اللي في النص، ودوس E.',visual:'device'},
      {level:3,category:'science',text:pick(m.think,l),visual:'none'}]}
  function hud(l:Locale){
    const m=mission();
    if(!m)return {title:l==='en'?'MARS BASE STORY':'حكاية قاعدة المريخ',task:pick(C_UI.allDone,l),where:'',button:pick(C_UI.playStory,l),action:'restart'};
    const st=step()!;return {title:`${pick(C_UI.missionN,l,{n:s.index+2,total:CAMPAIGN.length+1})} · ${pick(m.title,l)}`,task:pick(st.task,l),where:pick(st.where,l),button:'',action:''};
  }
  function metersHtml(l:Locale){if(!s.started)return '';return `<div class="hud-meters pixel-panel" aria-label="${esc(pick(C_UI.meters,l))}"><small>${pick(C_UI.meters,l)}</small>${METER_IDS.map(k=>`<span title="${esc(pick(C_UI.meterNames[k],l))}"><img src="${asset(`ui/ui-${k}-pixel`)}" alt="${esc(pick(C_UI.meterNames[k],l))}"/><b>${bdi(s.meters[k])}</b></span>`).join('')}</div>`}
  const api={state:()=>s,active,done,started:()=>s.started,start,restart,open,close,guide,hints,hud,metersHtml,mission,step,isOpen:()=>!!seq,
    card:()=>seq?{id:seq.kind==='final'?'campaign-end':seq.scenes[page]?.id}:null,act,describe:describeEffect,options:(id:string):Opt[]=>CAMPAIGN.find(x=>x.id===id)?.options||[]};
  (window as any).__campaign=api;return api;
}
export type Campaign=ReturnType<typeof setupCampaign>;
