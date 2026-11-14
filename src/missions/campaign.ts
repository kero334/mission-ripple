// Campaign engine for the missions after The Rover Reading (P2-M02).
// Every choice is stored as an event; the pretend base (src/game/base-sim.ts) is rebuilt from the event history,
// so consequences persist across reloads, are never applied twice, and the same choices always give the same base.
// Owns its own save (mission-ripple-campaign-v1, state version 2); never edits the P2-M02 save or the NASA snapshots.
import ev from '../science/campaign-evidence-v1.json';
import {CAMPAIGN,C_UI,CAUSE,SLOT_HINTS,SLOT_NAMES,STAGE_NAME,STAGE_SAY,dyn,type CampaignMission,type SceneDef,type Opt} from './campaign-data';
import {SLOTS,lamps,lenders,outcome,problems,replay,spare,isSlot,type Base,type Change,type Ev,type EndingKind,type M1,type Slot} from '../game/base-sim';
import {BUILDINGS} from '../world-data';
import {CARDS,NURI,type Locale,type Tx,pick} from '../content/strings';
import type {ProgressStore} from '../game/progress';
import type {GuideTarget,HintStep} from '../game/guidance';
import {EQUIPMENT_POS,EXIT_POS} from '../game/guidance';
import {$,asset,bdi,esc,modals,renderScene,type Scene} from '../ui/shell';

export const CAMPAIGN_KEY='mission-ripple-campaign-v1';
/** Where the base robot parks, and where it gets stuck on the unknown road (exterior world pixels). */
export const ROVER_HOME={x:760,y:168},ROVER_STUCK={x:1188,y:1046};
type E=Ev&{i?:number};
export type CampaignState={version:2;started:boolean;index:number;step:number;m1:M1;events:E[];ending:EndingKind|null};
export const freshCampaign=(m1:M1='study'):CampaignState=>({version:2,started:false,index:0,step:0,m1,events:[],ending:null});
const MIDS=CAMPAIGN.map(m=>m.id);
function validEvent(e:any):e is E{
  if(!e||typeof e!=='object')return false;
  if(e.t==='choose')return MIDS.includes(e.m)&&(e.o==='A'||e.o==='B')&&(e.sub===undefined||isSlot(e.sub));
  if(e.t==='fix')return ['watch','monitor','keep'].includes(e.o);
  if(e.t==='toggle')return isSlot(e.slot);
  if(e.t==='rescue')return (e.o==='help'||e.o==='leave')&&(e.sub===undefined||isSlot(e.sub));
  return e.t==='day';
}
/** Repairs any saved campaign. Version 1 saves (A/B choices + pretend meters) are migrated by replaying the
 *  same choices through the new base rules; the old meters are dropped. */
export function sanitizeCampaign(x:any,m1:M1='study'):CampaignState{
  const c=freshCampaign(m1);if(!x||typeof x!=='object')return c;
  c.started=!!x.started;c.index=Number.isInteger(x.index)?Math.max(0,Math.min(CAMPAIGN.length,x.index)):0;
  const m=CAMPAIGN[c.index];c.step=m&&Number.isInteger(x.step)?Math.max(0,Math.min(m.steps.length-1,x.step)):0;
  if(x.version===2){
    c.m1=x.m1==='trip'?'trip':x.m1==='study'?'study':m1;
    const seen=new Set<string>();
    c.events=(Array.isArray(x.events)?x.events:[]).filter(validEvent).filter((e:E)=>{if(e.t!=='choose')return true;if(seen.has(e.m))return false;seen.add(e.m);return true}).slice(0,200);
    // every finished mission needs its choice; drop anything for missions not reached yet
    for(const mm of CAMPAIGN.slice(0,c.index))if(!seen.has(mm.id)){c.index=CAMPAIGN.indexOf(mm);c.step=0;break}
    c.ending=['thrive','continue','setback'].includes(x.ending)?x.ending:null;
    return c;
  }
  if(x.version===1){
    for(const [i,mm] of CAMPAIGN.entries()){
      const o=x.choices?.[mm.id];
      if(i<c.index){c.events.push({t:'choose',m:mm.id,o:o==='B'?'B':'A',i});if(i>=1)c.events.push({t:'day',i})}
      else if(i===c.index&&(o==='A'||o==='B'))c.events.push({t:'choose',m:mm.id,o,i});
    }
  }
  return c;
}
type Deps={locale:()=>Locale;progress:ProgressStore;roverDone:()=>boolean;m1:()=>M1;guided:()=>boolean;openHelp:()=>void;openPassport:()=>void;onChange:()=>void;
  playEnding:(kind:EndingKind,info:EndingInfo,done:()=>void)=>void};
export type EndingInfo={plants:number;power:Record<Slot,boolean>;open:string[];rover:Base['rover'];alert:Base['alert']};
const say=(text:string,mood='speak')=>window.dispatchEvent(new CustomEvent('ripple-dialogue',{detail:{text,mood}}));
const control=(type:string,value?:unknown)=>window.dispatchEvent(new CustomEvent('ripple-control',{detail:{type,value}}));
const bName=(id:string,l:Locale)=>{const b=BUILDINGS.find(v=>v.id===id)!;return l==='en'?b.name:b.ar};
const img=(src:string,cls='')=>`<img class="scene-img ${cls}" src="${asset(src)}" alt=""/>`;
const r1=(v:string|number)=>Number(v).toFixed(1);
const hm=(ts:string)=>ts.slice(11,16);
const P_=(t:Tx,l:Locale,v?:Record<string,string|number>)=>pick(t,l,v);
const slotIcon=(s:Slot,on:boolean)=>s.startsWith('lamp')?`ripple/lamp-${on?'on':'off'}`:`ripple/${s}-${on?'on':'off'}`;
const B_POS:Record<string,{x:number;y:number}>=Object.fromEntries(BUILDINGS.map(b=>[b.id,{x:b.x,y:b.y-40}]));
const slotPos=(s:Slot)=>s.startsWith('lamp')?B_POS.greenhouse:s==='monitor'?B_POS.research:B_POS.comms;
const WHY_CAUSE:Record<string,Tx>={watch:{en:'Earlier, the watch screen took a lamp’s power.',ar:'قبل كده، شاشة المراقبة خدت طاقة لمبة.'},rover:{en:'The robot trip borrowed a lamp’s power.',ar:'رحلة الروبوت استلفت طاقة لمبة.'},
  helper:{en:'The helper robot borrowed a lamp’s power.',ar:'الروبوت المساعد استلف طاقة لمبة.'},you:{en:'A lamp was turned off at the power check.',ar:'لمبة اتطفت في مراجعة الطاقة.'}};
const WHY_FIX:{fixed:Tx;kept:Tx}={fixed:{en:'Then you moved power back to the lamps!',ar:'وبعدين إنت رجّعت الطاقة للمبات!'},kept:{en:'Then you kept the plan, so the lamp stayed off.',ar:'وبعدين كمّلت بالخطة، فاللمبة فضلت طافية.'}};

export function setupCampaign(deps:Deps){
  const P=deps.progress;
  let s:CampaignState;try{s=sanitizeCampaign(JSON.parse(localStorage.getItem(CAMPAIGN_KEY)||'null'),deps.m1())}catch{s=freshCampaign(deps.m1())}
  let memo:{n:number;r:ReturnType<typeof replay>}|null=null;
  const sim=()=>{if(!memo||memo.n!==s.events.length)memo={n:s.events.length,r:replay(s.m1,s.events)};return memo.r};
  const base=()=>sim().base;
  const save=()=>{try{localStorage.setItem(CAMPAIGN_KEY,JSON.stringify(s))}catch{/* keep playing */}sync();deps.onChange()};
  let seq:{scenes:SceneDef[];kind:'step'|'final'}|null=null,page=0,fresh=true,quizPick:Record<string,number>={},room:string|null=null;
  let borrow:{for:'route'|'rescue';opt:'A'|'help'}|null=null,pick1:string|null=null,showQueue:{x:number;y:number}[]=[];
  const overlay=document.createElement('div');overlay.id='campaign-overlay';overlay.className='hidden';
  overlay.innerHTML='<article class="science-card pixel-panel scene-card" role="dialog" aria-modal="true" aria-describedby="science-say"><button id="campaign-close" type="button" aria-label="Close">×</button><div id="campaign-content"></div></article>';
  $('hud').append(overlay);$('campaign-close').addEventListener('click',()=>close());
  const mission=():CampaignMission|null=>CAMPAIGN[s.index]||null;
  const active=()=>s.started&&s.index<CAMPAIGN.length&&deps.roverDone();
  const done=()=>s.started&&s.index>=CAMPAIGN.length;
  const step=()=>mission()?.steps[s.step]||null;
  const choiceOf=(id:string)=>(s.events.find(e=>e.t==='choose'&&e.m===id) as {o:'A'|'B'}|undefined)?.o||null;
  const optOf=(m:CampaignMission)=>m.options.find(o=>o.id===choiceOf(m.id))||null;
  const evHere=(t:Ev['t'])=>s.events.filter(e=>e.t===t&&e.i===s.index);
  const lastChanges=()=>sim().changes.at(-1)||[];
  /** Applies a player event, saves, and queues the world spots that changed (shown when the player is outside). */
  function push(e:Ev):Change[]{
    const before=s.events.length;s.events=[...s.events,{...e,i:s.index}];memo=null;save();
    const ch=sim().changes[before]||[];
    for(const c of ch){const p=c.slot?slotPos(c.slot):c.plants!=null?B_POS.greenhouse:c.rover?(c.rover==='stuck'||c.rover==='rescue'?ROVER_STUCK:ROVER_HOME):c.alert?B_POS.comms:null;if(p&&!showQueue.some(q=>q.x===p.x&&q.y===p.y))showQueue.push(p)}
    if(!room)flushShow();
    return ch;
  }
  function flushShow(){if(!showQueue.length||!active()&&!done())return;control('ripple-show',showQueue);showQueue=[]}
  // ---------------------------------------------------------------- world view (what the Mars base looks like)
  function view(){const b=base(),started=s.started&&deps.roverDone();
    return {active:started,power:b.power,borrow:b.borrow,plants:b.plants,alert:b.alert,notes:b.notes,rover:started?b.rover:'home',
      monitorQ:started&&b.notes!=='none'&&!b.power.monitor,alertQ:started&&b.alert==='mystery',roverTarget:started&&b.rover==='stuck'&&step()?.building==='rover'}}
  const sync=()=>control('base',view());

  // ---------------------------------------------------------------- grown-ups text (exact source values / pretend rules)
  function grown(key:string|undefined,l:Locale){
    const en=l==='en';
    if(key==='log'){const d=ev.log.duplicate,g=ev.log.gap;return `<p>${en?'Same-time rows (real)':'صفوف بنفس الوقت (حقيقية)'}: ${bdi(`${d.a[0]} · ${d.a[2]} | ${d.b[0]} · ${d.b[2]} ${ev.log.unit}`)} — ${bdi(d.sourceRecord)}</p><p>${en?'Gap (real)':'فراغ (حقيقي)'}: ${bdi(`${g.before.at(-1)![0]} → ${g.after[0][0]} UTC (${g.minutes} min)`)} — ${bdi(g.sourceRecord)}</p><p>${en?`${ev.log.conflictingRows} conflicting same-time rows in 2015–2024 (P2-RAD-08); reason unknown. Only intervals ≤ 30 min are integrated (P2-RAD-06).`:`${bdi(ev.log.conflictingRows)} صف متعارض في ٢٠١٥–٢٠٢٤ (P2-RAD-08)؛ السبب مش معروف. الفترات اللي ≤ ٣٠ دقيقة بس هي اللي بتتحسب (P2-RAD-06).`}</p><a href="${ev.log.sourceUrl}" target="_blank" rel="noopener noreferrer">NASA RadLab ↗</a>`}
    if(key==='sun'){const f=ev.sun.strongest;return `<p>DONKI ${bdi(ev.sun.period)}: ${bdi(`FLR ${ev.sun.counts.FLR} · CME ${ev.sun.counts.CME} · SEP ${ev.sun.counts.SEP}`)} (SCI-0003)</p><p>${en?'Strongest listed flare':'أقوى توهج متسجل'}: ${bdi(`${f.class} · ${f.begin_utc}`)}</p><p>${esc(ev.sun.caveat)}</p><a href="${ev.sun.sourceUrl}" target="_blank" rel="noopener noreferrer">NASA DONKI ↗</a>`}
    if(key==='plants')return `<p>${bdi(ev.plants.datasetId)} (P2-OSD-615): ${bdi(`${ev.plants.samples}`)} ${en?'samples':'عينة'} · ${bdi(Object.entries(ev.plants.groups.spaceflight).map(([k,v])=>`${k} ${v}`).join(' · '))} · ${en?'growth-time groups':'مجموعات زمن النمو'} ${bdi(Object.keys(ev.plants.groups['growth time']).join(' / '))}</p><p>${esc(ev.plants.limitation)}</p><a href="${ev.plants.sourceUrl}" target="_blank" rel="noopener noreferrer">NASA OSDR ↗</a>`;
    if(key==='map')return `<p>${bdi(ev.map.datasetId)} (P2-TREK-01), ${bdi(ev.map.format)}. ${esc(ev.map.limitation)}</p><a href="${ev.map.sourceUrl}" target="_blank" rel="noopener noreferrer">NASA Mars Trek ↗</a>`;
    if(key==='dose')return `<p>P2-RAD-07: ${esc(ev.dose.limitation)}</p><a href="${ev.dose.sourceUrl}" target="_blank" rel="noopener noreferrer">NASA RadLab ↗</a>`;
    return en?`<p><b>Pretend training-base rules</b> (src/game/base-sim.ts), not NASA data and not an engineering estimate: 3 power blocks; each lights one lamp or screen. Each new day, 2 greenhouse lamps → plants grow one stage, fewer → plants shrink one stage (0–4). A robot trip or rescue borrows one block for one day. The ending uses plant growth + open problems. NASA data never changes.</p>`
      :`<p><b>قواعد قاعدة تدريب خيالية</b>، مش بيانات ناسا: ٣ مكعبات طاقة، كل مكعب بينوّر لمبة أو شاشة. كل يوم جديد: لمبتين في البيت الزراعي ← النباتات تكبر درجة، أقل ← تصغر درجة (٠–٤). رحلة الروبوت أو الإنقاذ بتستلف مكعب يوم واحد. النهاية بتعتمد على نمو النباتات والمشاكل المفتوحة. بيانات ناسا عمرها ما بتتغير.</p>`;
  }
  // ---------------------------------------------------------------- pictures
  function powerStrip(l:Locale,b=base()){
    const uses:string[]=[];for(const k of SLOTS)if(b.power[k])uses.push(slotIcon(k,true));if(b.borrow&&b.borrow!=='spare'||b.borrow==='spare')uses.push('ripple/rover');
    const cells=[...uses.slice(0,3),...Array(Math.max(0,3-uses.length)).fill('')];
    return `<div class="power-strip" aria-label="${l==='en'?'Power blocks':'مكعبات الطاقة'}">${cells.map(u=>`<span class="blk ${u?'on':''}">${u?`<img src="${asset(u)}" alt=""/>`:''}</span>`).join('')}</div>`}
  function gardenArt(l:Locale,b=base()){return `<div class="garden-art"><div class="lamps">${(['lamp1','lamp2'] as Slot[]).map(k=>`<img src="${asset(slotIcon(k,b.power[k]))}" alt="${esc(P_(SLOT_NAMES[k],l))}" class="${b.power[k]?'lit':''}"/>`).join('')}</div>${img(`ripple/plants-${b.plants}`,'tray')}<b class="stage s${b.plants}">${esc(P_(STAGE_NAME[b.plants],l))}</b></div>`}
  function chips(ch:Change[],l:Locale){
    const C=C_UI.chip,out:string[]=[];
    for(const c of ch){
      if(c.slot)out.push(`<span class="chip-ch ${c.on?'up':'down'}"><img src="${asset(slotIcon(c.slot,!!c.on))}" alt=""/>${esc(P_(SLOT_NAMES[c.slot],l))} ${esc(P_(c.on?C.on:C.off,l))}</span>`);
      else if(c.plants!=null&&c.from!=null&&c.plants!==c.from)out.push(`<span class="chip-ch ${c.plants>c.from?'up':'down'}"><img src="${asset('ripple/sprout-'+c.plants)}" alt=""/>${esc(P_(C.plants,l))} ${bdi(c.from+'→'+c.plants)}</span>`);
      else if(c.rover)out.push(`<span class="chip-ch ${c.rover==='stuck'?'down':''}"><img src="${asset(c.rover==='stuck'?'ripple/rover-stuck':c.rover==='rescue'?'ripple/helper':'ripple/rover')}" alt=""/>${esc(P_(c.rover==='stuck'?C.robotStuck:c.rover==='home'?C.robotHome:c.rover==='rescue'?C.helper:C.robotOut,l))}</span>`);
      else if(c.alert)out.push(`<span class="chip-ch up"><img src="${asset('ripple/watch-on')}" alt=""/>${esc(P_(C.checked,l))}</span>`);
    }
    return out.length?`<div class="chips-ch">${out.join('')}</div>`:'';
  }
  /** The decision history as a row of cards: what you chose → what it changed. */
  function timeline(l:Locale,animate=false){
    const r=sim(),C=CARDS.decide,T=C_UI.tl,items:string[]=[];let k=0;
    const card=(icon:string,label:string,title:string,ch:string,cls='')=>`<li class="tl ${cls}" style="${animate?`animation-delay:${(k++)*0.28}s`:''}"><img src="${asset(icon)}" alt=""/><small>${esc(label)}</small><b>${esc(title)}</b>${ch}</li>`;
    items.push(card(s.m1==='study'?'ui/science-research':'ui/science-rover',P_(T.m1,l),P_(s.m1==='study'?C.aTitle:C.bTitle,l),`<div class="chips-ch"><span class="chip-ch"><img src="${asset('ripple/rover')}" alt=""/>${esc(P_(s.m1==='study'?C_UI.chip.rested:C_UI.chip.road,l))}</span></div>`));
    let check:Change[]=[];
    const flushCheck=()=>{if(check.length){items.push(card('ui/ui-power-pixel',P_(T.check,l),P_(C_UI.tl.check,l),chips(check,l)));check=[]}};
    s.events.forEach((e,i)=>{const ch=r.changes[i]||[];
      if(e.t==='toggle'){check.push(...ch);return}flushCheck();
      if(e.t==='choose'){const m=CAMPAIGN.find(x=>x.id===e.m)!,o=m.options.find(x=>x.id===e.o)!;items.push(card(o.icon,P_(m.title,l),P_(o.title,l),chips(ch,l)))}
      else if(e.t==='fix')items.push(card('ripple/lamp-on',P_(T.fix,l),P_(e.o==='keep'?C_UI.fixKeep:e.o==='watch'?C_UI.fixWatch:C_UI.fixMonitor,l),chips(ch,l),'rec'));
      else if(e.t==='rescue')items.push(card('ripple/helper',P_(T.rescue,l),P_(e.o==='help'?C_UI.help:C_UI.leave,l),chips(ch,l),'rec'));
      else if(e.t==='day'){const p=ch.find(c=>c.plants!=null);items.push(`<li class="tl day" style="${animate?`animation-delay:${(k++)*0.28}s`:''}"><img src="${asset('ripple/sprout-'+(p?.plants??0))}" alt=""/><small>${esc(P_(T.day,l))}</small>${chips(ch.filter(c=>c.plants!=null||c.rover||c.alert),l)}</li>`)}
    });flushCheck();
    return `<ol class="timeline ${animate?'anim':''}" dir="${l==='ar'?'rtl':'ltr'}">${items.join('')}</ol>`;
  }
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
    if(key==='map')return `<div class="map-art">${img('ui/ui-map-pixel','icon-big')}<div class="color-strip"><span>${l==='en'?'low':'واطي'}</span><i></i><span>${l==='en'?'high':'عالي'}</span></div></div>`;
    if(key==='history')return timeline(l);
    if(key==='garden')return gardenArt(l);
    if(key==='stuck')return `<div class="vs-art one">${img('ripple/rover-stuck','icon-big rover-big')}</div>`;
    return '';
  }
  // ---------------------------------------------------------------- scene list for the current step
  function visibleScenes(list:SceneDef[]){const b=base();return list.filter(sc=>!sc.when||sc.when(b)||(sc.kind==='fix'&&evHere('fix').length>0))}
  function buildScenes():SceneDef[]{
    const m=mission()!,st=step()!;const list:SceneDef[]=[];
    if(s.step===0&&s.index===0)list.push({id:'m1',art:'m1',stamp:'game',say:C_UI.m1[s.m1]});
    if(s.step===0&&s.index>0){list.push({id:'ripple',art:'ripple',stamp:'game',say:{en:'',ar:''}});if(s.index>=2)list.push({id:'day',art:'day',stamp:'game',say:C_UI.day})}
    list.push(...visibleScenes(st.scenes));
    if(st.decide)list.push({id:'choose',art:'choose',stamp:'game',say:C_UI.choose,more:C_UI.pretendMore},{id:'now',art:'now',stamp:'game',say:{en:'',ar:''}},{id:'lesson',art:'lesson',say:m.lesson});
    return list;
  }
  function open(){if(!active())return;seq={scenes:buildScenes(),kind:'step'};page=0;fresh=true;borrow=null;show()}
  function show(){overlay.classList.remove('hidden');modals.open('science',close);render();requestAnimationFrame(()=>overlay.querySelector<HTMLElement>('.big-choice,.chip,.slot-btn,.learning-next')?.focus())}
  function close(){if(!seq)return;seq=null;borrow=null;overlay.classList.add('hidden');modals.closed('science')}
  const dayReport=()=>{const r=sim().reports;return r[r.length-1]||null};

  function scene(l:Locale):Scene{
    const sc=seq!.scenes[page],m=mission(),n=seq!.scenes.length,pg:[number,number]=[page,n],B=CARDS.btn,b=base();
    const next=()=>({label:pick(B.next,l),action:'next'});
    if(seq!.kind==='final'){const o=outcome(b),kind=o.kind;
      const why=[P_(C_UI.plantsWhy[o.plants],l)];const cause=firstLampCause();if(cause&&o.plants<=2){why.push(P_(WHY_CAUSE[cause],l));const fx=s.events.find(e=>e.t==='fix');if(fx)why.push(P_(fx.o==='keep'?WHY_FIX.kept:WHY_FIX.fixed,l))}
      for(const p of o.open)why.push(P_(C_UI.open[p],l));if(o.shared&&o.open.length)why.push(P_(C_UI.shared,l));
      const solved=(['notes','alert','fair','rover'] as const).filter(p=>!o.open.includes(p)).map(p=>`<span class="chip-ch up">✓ ${esc(P_(C_UI.solved[p],l))}</span>`).join('');
      return {id:'campaign-end',stamp:'game',good:kind!=='setback',
        art:`<div class="end-head ${kind}"><img src="${asset(kind==='thrive'?'badges/badge-base-commander':kind==='continue'?'ripple/wrench':'ripple/safe')}" alt=""/><strong>${esc(P_(C_UI.endTitle[kind],l))}</strong></div><h3 class="why-h">${esc(P_(C_UI.why,l))}</h3>${timeline(l,true)}<ul class="why-list">${why.map(w=>`<li>${esc(w)}</li>`).join('')}</ul><div class="chips-ch solved">${solved}</div>`,
        say:pick(C_UI.endSay[kind],l),more:pick(C_UI.endMore[kind],l),grownups:grown(undefined,l)+`<p>${esc(P_(C_UI.pretendEnd,l))} plants=${o.plants}, open=[${o.open.join(', ')}], shared=${o.shared}, ending=${kind}</p>`,
        primary:{label:pick(C_UI.playStory,l),action:'restart'},secondary:[{label:pick(C_UI.watchEnding,l),action:'replay-ending'},{label:pick(B.badges,l),action:'passport'},{label:pick(B.explore,l),action:'close'}]};
    }
    if(borrow){const ls=lenders(b);
      return {id:'borrow',stamp:'game',art:powerStrip(l),say:pick(C_UI.borrow,l),
        choices:`<div class="slot-row">${ls.map(k=>`<button type="button" class="slot-btn on" data-c-action="lend-${k}"><img src="${asset(slotIcon(k,true))}" alt=""/><b>${esc(P_(SLOT_NAMES[k],l))}</b><small>${esc(P_(SLOT_HINTS[k],l))}</small></button>`).join('')}</div>`,grownups:grown(undefined,l)}}
    if(sc.id==='m1')return {id:'m1',stamp:'game',art:`<div class="ripple-art">${img(s.m1==='study'?'ui/science-research':'ui/science-rover','icon-big')}<span class="rf-arrow">→</span>${img('ripple/rover','icon-big bob')}</div>`,say:pick(C_UI.m1[s.m1],l),more:pick(C_UI.rememberM1,l),primary:next(),page:pg};
    if(sc.id==='ripple'){const prev=CAMPAIGN[s.index-1],o=optOf(prev)!;
      return {id:'ripple',stamp:'game',art:`<div class="ripple-art">${img(prev.icon,'icon-big')}<span class="rf-arrow">→</span>${img(o.icon,'icon-big bob')}</div>${prev.id==='M5-POWER'?`<div class="vs-art one">${img(b.rover==='stuck'?'ripple/rover-stuck':'ripple/rover','icon-big')}</div>`:''}`,
        say:pick(dyn(o.later!,b),l),more:pick(C_UI.remember,l),good:!(prev.id==='M5-POWER'&&b.rover==='stuck'),primary:next(),page:pg}}
    if(sc.id==='day'){const r=dayReport();const lines=[r&&r.after>r.before?C_UI.grew:r&&r.lamps===0?C_UI.shrank0:r&&r.after<r.before?C_UI.shrank:C_UI.grew];
      const extra=[r?.boost?C_UI.boost:null,r?.alertChecked?C_UI.checked:null,r?.returned?C_UI.returned:null].filter(Boolean) as Tx[];
      const cause=lamps(b)<2&&b.lampCause?CAUSE[b.lampCause]:null;
      return {id:'day',stamp:'game',art:`<div class="day-art">${r?img('ripple/plants-'+r.before,'tray'):''}<span class="rf-arrow">→</span>${gardenArt(l)}</div>${chips(sim().changes[s.events.length-1]||[],l)}`,
        say:`${esc(pick(C_UI.day,l))} ${esc(pick(lines[0],l))}`,more:[...extra.map(t=>pick(t,l)),cause?pick(cause,l):''].filter(Boolean).join(' ')||undefined,good:!!r&&r.after>r.before,grownups:grown(undefined,l),primary:next(),page:pg}}
    if(sc.kind==='garden'){const cause=lamps(b)<2&&b.lampCause?CAUSE[b.lampCause]:null;
      return {id:sc.id,stamp:'game',art:gardenArt(l)+powerStrip(l),say:pick(STAGE_SAY[b.plants],l),more:cause?pick(cause,l):undefined,good:b.plants>=3,grownups:grown(undefined,l),primary:next(),back:page>0,page:pg}}
    if(sc.kind==='fix'){const did=evHere('fix')[0];
      if(did)return {id:'fix',stamp:'game',art:gardenArt(l),say:pick(did.o==='keep'?C_UI.kept:C_UI.fixed,l),good:did.o!=='keep',grownups:grown(undefined,l),primary:next(),page:pg};
      const opts=(['watch','monitor'] as const).filter(k=>b.power[k]).map(k=>({k,t:k==='watch'?C_UI.fixWatch:C_UI.fixMonitor,c:k==='watch'?(b.alert==='checked'?C_UI.fixWatchOk:C_UI.fixWatchNo):C_UI.fixMonitorNo,ok:k==='watch'&&b.alert==='checked'}));
      return {id:'fix',stamp:'game',art:gardenArt(l)+powerStrip(l),say:pick(sc.say,l),grownups:grown(undefined,l),
        choices:`<div class="choice-row ${opts.length>1?'three':''}">${opts.map(o=>`<button type="button" class="big-choice" data-c-action="fix-${o.k}"><img class="scene-img choice-icon" src="${asset(slotIcon(o.k,false))}" alt=""/><b>${esc(pick(o.t,l))}</b><span class="gain"><i aria-hidden="true">✓</i>${esc(pick(C_UI.fixGain,l))}</span><span class="${o.ok?'gain':'cost'}"><i aria-hidden="true">${o.ok?'✓':'⏸'}</i>${esc(pick(o.c,l))}</span></button>`).join('')}<button type="button" class="big-choice" data-c-action="fix-keep"><img class="scene-img choice-icon" src="${asset('ripple/sprout-'+Math.max(0,b.plants-1))}" alt=""/><b>${esc(pick(C_UI.fixKeep,l))}</b><span class="gain"><i aria-hidden="true">✓</i>${esc(pick(C_UI.leaveGain,l))}</span><span class="cost"><i aria-hidden="true">⏸</i>${esc(pick(C_UI.fixKeepNo,l))}</span></button></div>`,page:pg}}
    if(sc.kind==='power'){const full=spare(b)===0;
      return {id:sc.id,stamp:'game',art:powerStrip(l)+`<p class="spare-n">${esc(pick(C_UI.spareN,l,{n:spare(b)}))}${b.borrow?` · ${esc(pick(C_UI.robotBlock,l))}`:''}</p>`,say:pick1?pick1:pick(sc.say,l),more:pick(sc.more!,l),grownups:grown(undefined,l),
        choices:`<div class="slot-row four">${SLOTS.map(k=>`<button type="button" class="slot-btn ${b.power[k]?'on':''} ${!b.power[k]&&full?'locked':''}" data-c-action="toggle-${k}" aria-pressed="${b.power[k]}"><img src="${asset(slotIcon(k,b.power[k]))}" alt=""/><b>${esc(P_(SLOT_NAMES[k],l))}</b><small>${esc(P_(SLOT_HINTS[k],l))}</small></button>`).join('')}</div>`,
        primary:{label:pick(C_UI.powerDone,l),action:'next'},page:pg}}
    if(sc.kind==='stuck')return {id:sc.id,stamp:'game',art:art('stuck',l),say:pick(sc.say,l),more:pick(sc.more!,l),primary:next(),page:pg};
    if(sc.kind==='rescue'){const did=evHere('rescue')[0];
      if(did)return {id:'rescue',stamp:'game',art:`<div class="vs-art one">${img(did.o==='help'?'ripple/helper':'ripple/rover-stuck','icon-big bob')}</div>${chips(sim().changes[s.events.indexOf(did)]||[],l)}`,say:pick(did.o==='help'?C_UI.helped:C_UI.left,l),good:did.o==='help',primary:next(),page:pg};
      const helpCost=spare(b)>0?{en:'Uses the spare block for one day',ar:'بتاخد المكعب الزيادة يوم واحد'}:{en:'Borrows one light’s power for one day',ar:'بتستلف طاقة نور واحد يوم واحد'};
      return {id:'rescue',stamp:'game',art:powerStrip(l),say:pick(sc.say,l),grownups:grown(undefined,l),
        choices:`<div class="choice-row"><button type="button" class="big-choice" data-c-action="rescue-help"><img class="scene-img choice-icon" src="${asset('ripple/helper')}" alt=""/><b><i>${l==='en'?'A':'أ'}</i> ${esc(pick(C_UI.help,l))}</b><span class="gain"><i aria-hidden="true">✓</i>${esc(pick(C_UI.helpGain,l))}</span><span class="cost"><i aria-hidden="true">⏸</i>${esc(pick(helpCost,l))}</span></button><button type="button" class="big-choice" data-c-action="rescue-leave"><img class="scene-img choice-icon" src="${asset('ripple/rover-stuck')}" alt=""/><b><i>${l==='en'?'B':'ب'}</i> ${esc(pick(C_UI.leave,l))}</b><span class="gain"><i aria-hidden="true">✓</i>${esc(pick(C_UI.leaveGain,l))}</span><span class="cost"><i aria-hidden="true">⏸</i>${esc(pick(C_UI.leaveCost,l))}</span></button></div>`,page:pg}}
    if(sc.id==='choose'){const chosen=choiceOf(m!.id);
      return {id:'choose',say:pick(sc.say,l),more:pick(C_UI.pretendMore,l),stamp:'game',
        art:`<div class="choice-row">${m!.options.map(o=>`<button type="button" class="big-choice ${chosen&&chosen!==o.id?'dim':''}" data-c-action="choose-${o.id}">${img(o.icon,'choice-icon')}<b><i>${l==='en'?o.id:o.id==='A'?'أ':'ب'}</i> ${esc(pick(o.title,l))}</b><span class="gain"><i aria-hidden="true">✓</i>${esc(pick(dyn(o.gain,b),l))}</span><span class="cost"><i aria-hidden="true">⏸</i>${esc(pick(dyn(o.cost,b),l))}</span></button>`).join('')}</div>${powerStrip(l)}`,
        grownups:`<p>${m!.options.map(o=>`${o.decisionId} = ${o.id}`).join(' · ')} (${l==='en'?'research package decision design':'تصميم القرار من ملف البحث'}).</p>`+grown(undefined,l),secondary:[{label:'?',action:'help'}]}}
    if(sc.id==='now'){const o=optOf(m!)!,idx=s.events.findIndex(e=>e.t==='choose'&&e.m===m!.id),ch=sim().changes[idx]||[];
      const lampOff=ch.some(c=>c.slot?.startsWith('lamp')&&!c.on);
      return {id:'now',stamp:'game',art:`<div class="ripple-art">${img(o.icon,'icon-big bob')}</div>${chips(ch,l)}${powerStrip(l)}`,say:pick(o.now,l),
        more:lampOff?(l==='en'?'To power it, one greenhouse lamp turned off.':'عشان يشتغل، لمبة في البيت الزراعي طفت.'):undefined,primary:next(),page:pg}}
    if(sc.id==='lesson'){const run=['ev:mission-complete:'+m!.id],xp=P.xpOf(run[0]);
      return {id:'lesson',art:`<div class="done-art">${img('badges/badge-'+m!.badge,'icon-big bob')}<strong class="xp-big"><img src="${asset('ui/ui-xp-pixel')}" alt=""/>+${bdi(xp)}</strong></div>`,good:true,say:pick(m!.lesson,l),more:pick(C_UI.done,l,{xp}),
        primary:{label:pick(s.index+1<CAMPAIGN.length?C_UI.nextMission:C_UI.seeEnding,l),action:'finish'},page:pg}}
    if(sc.id.startsWith('go-'))return {id:sc.id,art:art(sc.art,l),say:pick(sc.say,l),primary:{label:pick(B.go,l),action:'step-done'},page:pg};
    if(sc.award)P.award(sc.award);
    if(sc.quiz){const q=sc.quiz,pk=quizPick[sc.id],o=pk!=null?q.options[pk]:null;
      return {id:sc.id,art:art(sc.art,l),stamp:sc.stamp,say:o?pick(o.fb,l):pick(sc.say,l),good:!!o?.ok,grownups:sc.grown?grown(sc.grown,l):undefined,
        choices:`<div class="chip-row">${q.options.map((op,i)=>`<button type="button" class="chip ${pk===i?'sel':''}" data-c-action="quiz-${i}" aria-pressed="${pk===i}">${esc(pick(op.label,l))}</button>`).join('')}</div>`,
        primary:o?.ok?next():{label:pick(B.skip,l),action:'next'},secondary:[{label:'?',action:'help'}],back:page>0,page:pg}}
    return {id:sc.id,art:art(sc.art,l),stamp:sc.stamp,say:pick(sc.say,l),more:sc.more?pick(sc.more,l):undefined,grownups:sc.grown&&sc.grown!=='pretend'?grown(sc.grown,l):sc.stamp==='game'?grown(undefined,l):undefined,primary:next(),back:page>0,page:pg};
  }
  function firstLampCause():string|null{const r=sim();for(let i=0;i<s.events.length;i++){const ch=r.changes[i]||[];if(ch.some(c=>c.slot?.startsWith('lamp')&&!c.on)){const e=s.events[i];return e.t==='choose'&&e.m==='M3-SUN'?'watch':e.t==='choose'&&e.m==='M5-POWER'?'rover':e.t==='rescue'?'helper':e.t==='toggle'?'you':e.t==='choose'&&e.m==='M2-LOG'?'you':null}}return null}
  function render(){
    if(!seq)return;const l=deps.locale(),sc=scene(l);
    overlay.querySelector('.science-card')!.className=`science-card pixel-panel scene-card page-${sc.id}${fresh?' fresh':''}`;fresh=false;
    const html=renderScene(l,sc).replaceAll('data-science-action=','data-c-action=');
    $('campaign-content').innerHTML=html;
    if(!deps.guided())$('campaign-content').querySelector('.say-more')?.setAttribute('open','');
    $('campaign-content').querySelectorAll<HTMLElement>('[data-c-action]').forEach(b=>b.addEventListener('click',()=>act(b.dataset.cAction!)));
  }
  function nextStep(from:number){const m=mission();if(!m)return from;const b=base();let i=from;while(i<m.steps.length-1&&m.steps[i].when&&!m.steps[i].when!(b))i++;return i}
  function act(a:string){
    const l=deps.locale(),m=mission();
    if(a==='close'){close();return}
    if(a==='next'){pick1=null;page=Math.min(seq!.scenes.length-1,page+1);fresh=true;render();return}
    if(a==='back'){page=Math.max(0,page-1);fresh=true;render();return}
    if(a==='help'){deps.openHelp();return}
    if(a==='passport'){close();deps.openPassport();return}
    if(a==='restart'){close();restart();return}
    if(a==='replay-ending'){close();playEnding(true);return}
    if(a.startsWith('quiz-')){const sc=seq!.scenes[page],i=Number(a.slice(5));quizPick[sc.id]=i;if(sc.quiz!.options[i].ok)P.award(sc.quiz!.award);render();return}
    if(a.startsWith('toggle-')&&m){const k=a.slice(7) as Slot,b=base();if(!b.power[k]&&spare(b)===0){pick1=pick(C_UI.powerFull,l);render();return}
      pick1=null;push({t:'toggle',slot:k});const sc=seq!.scenes[page];if(sc.award)P.award(sc.award);render();return}
    if(a.startsWith('fix-')&&m){if(!evHere('fix').length){push({t:'fix',o:a.slice(4) as 'watch'|'monitor'|'keep'});say(pick(a==='fix-keep'?C_UI.kept:C_UI.fixed,l),a==='fix-keep'?'thinking':'happy')}render();return}
    if(a.startsWith('rescue-')&&m){if(evHere('rescue').length){render();return}const o=a.slice(7) as 'help'|'leave',b=base();
      if(o==='help'&&spare(b)===0&&lenders(b).length>1){borrow={for:'rescue',opt:'help'};render();return}
      push({t:'rescue',o});say(pick(o==='help'?C_UI.helped:C_UI.left,l),o==='help'?'happy':'thinking');render();return}
    if(a.startsWith('lend-')&&borrow&&m){const sub=a.slice(5) as Slot,bw=borrow;borrow=null;
      if(bw.for==='rescue'){push({t:'rescue',o:'help',sub});say(pick(C_UI.helped,l),'happy');render();return}
      commitChoice(m,'A',sub);return}
    if(a.startsWith('choose-')&&m){const id=a.slice(7) as 'A'|'B';if(choiceOf(m.id)){page=seq!.scenes.findIndex(x=>x.id==='now');fresh=true;render();return}
      const b=base();if(m.id==='M5-POWER'&&id==='A'&&b.m1!=='study'&&spare(b)===0&&lenders(b).length>1){borrow={for:'route',opt:'A'};fresh=true;render();return}
      commitChoice(m,id);return}
    if(a==='step-done'&&m){close();s.step=nextStep(Math.min(m.steps.length-1,s.step+1));save();const st=step()!;say(pick(NURI.detour,l,{task:pick(st.task,l)}));return}
    if(a==='finish'&&m){P.award('ev:mission-complete:'+m.id);
      if(s.index>=1)push({t:'day'});
      s.index++;s.step=0;quizPick={};s.step=nextStep(0);save();close();
      if(s.index>=CAMPAIGN.length){P.award('ev:campaign-complete');s.ending=outcome(base()).kind;save();playEnding(false);return}
      say(pick(mission()!.brief,l),'happy');return}
  }
  function commitChoice(m:CampaignMission,id:'A'|'B',sub?:Slot){const l=deps.locale(),o=m.options.find(x=>x.id===id)!;
    push({t:'choose',m:m.id,o:id,...(sub?{sub}:{})});P.award('ev:choice:'+m.id);
    page=seq!.scenes.findIndex(x=>x.id==='now');fresh=true;render();say(pick(o.now,l),'happy')}
  function playEnding(again:boolean){const o=outcome(base()),b=base();
    deps.playEnding(o.kind,{plants:b.plants,power:b.power,open:o.open,rover:b.rover,alert:b.alert},()=>{seq={scenes:[],kind:'final'};page=0;fresh=true;show();if(!again)say(pick(C_UI.endSay[o.kind],deps.locale()),o.kind==='setback'?'thinking':'happy')})}
  function start(){if(!deps.roverDone())return;if(!s.started){s=freshCampaign(deps.m1());s.started=true;save()}sync();say(pick(C_UI.m1[s.m1],deps.locale()),'happy');setTimeout(()=>{if(active()&&s.index===0)say(pick(mission()!.brief,deps.locale()),'happy')},4200)}
  function restart(){s={...freshCampaign(deps.m1()),started:true};memo=null;quizPick={};save();say(pick(mission()!.brief,deps.locale()),'happy')}

  // ---------------------------------------------------------------- world, guidance, HUD, Nuri reactions
  window.addEventListener('ripple-world-interaction',e=>{
    const d=(e as CustomEvent<{kind:string;buildingId:string|null;handled?:boolean}>).detail;
    if(!active())return;
    if(d.kind==='rover'&&step()?.building==='rover'){d.handled=true;open();return}
    if(d.kind!=='equipment'||!d.buildingId)return;
    if(d.buildingId===step()!.building){d.handled=true;open()}
  });
  window.addEventListener('ripple-room',e=>{const d=(e as CustomEvent<{room:string|null}>).detail;room=d.room;
    if(!d.room)setTimeout(()=>{flushShow();reactOutside()},450);
    if(d.room==='greenhouse'&&s.started)setTimeout(()=>{if(room==='greenhouse'&&!seq)say(pick(STAGE_SAY[base().plants],deps.locale()),base().plants>=3?'happy':'thinking')},700);
    if(!active())return;const l=deps.locale(),st=step()!;
    if(st.building==='rover'){if(d.room)say(pick(NURI.detour,l,{task:pick(st.task,l)}));deps.onChange();return}
    if(d.room===st.building)say(pick(NURI.arrivedInside,l),'happy');
    else if(d.room)say(pick(NURI.wrongPlace,l,{name:bName(d.room,l),target:bName(st.building,l)}),'thinking');
    else if(deps.guided())say(pick(NURI.detour,l,{task:pick(st.task,l)}));
    deps.onChange()});
  // Short in-world reactions: Nuri notices what your choices changed when you walk past it.
  const said=new Set<string>();
  function react(key:string,t:Tx,mood='thinking'){if(said.has(key)||seq||modals.any())return;said.add(key);say(pick(t,deps.locale()),mood)}
  function reactOutside(){/* nothing extra: the camera tour already shows the change */}
  window.addEventListener('ripple-state',e=>{if(!s.started||!deps.roverDone())return;const d=(e as CustomEvent<{nearestKind:string|null;nearestId:string|null;room:string|null}>).detail;if(d.room)return;const b=base(),day=b.day;
    if(d.nearestKind==='rover')react('stuck',C_UI.nearStuck);
    if(d.nearestKind!=='door')return;
    if(d.nearestId==='greenhouse'){const l2=lamps(b);react(`gh:${day}:${l2}`,l2===2?C_UI.nearBright:l2===1?C_UI.nearDim:C_UI.nearDark,l2===2?'happy':'thinking')}
    if(d.nearestId==='research'&&b.power.monitor)react('mon:on',C_UI.nearMonitor,'happy');
    if(d.nearestId==='comms'){if(b.power.watch)react('watch:on',C_UI.nearWatch,'happy');else if(b.alert==='mystery')react('watch:q',C_UI.nearMystery)}
  });
  function guide(l:Locale):GuideTarget|null{
    if(!active())return null;const st=step()!;
    if(st.building==='rover'){if(room)return {kind:'exit',buildingId:room,...EXIT_POS,label:''};return {kind:'field',buildingId:null,x:ROVER_STUCK.x,y:ROVER_STUCK.y,label:''}}
    const b=BUILDINGS.find(v=>v.id===st.building)!;
    if(room===b.id)return {kind:'equipment',buildingId:b.id,...EQUIPMENT_POS,label:''};
    if(room)return {kind:'exit',buildingId:room,...EXIT_POS,label:''};
    return {kind:'door',buildingId:b.id,x:b.x,y:b.y+18,label:l==='en'?b.name:b.ar};
  }
  function hints(l:Locale):HintStep[]{const m=mission()!,st=step()!,rover=st.building==='rover',inGoal=!rover&&room===st.building;
    const nav=inGoal?(l==='en'?'You are in the right place!':'إنت في المكان الصح!'):room?(l==='en'?'Walk to the exit at the bottom of this room, then follow the yellow arrow.':'امشي لباب الخروج اللي تحت، وبعدين امشي ورا السهم الأصفر.')
      :rover?(l==='en'?'Follow the yellow arrow to the robot by the rocks. Press M for the map.':'امشي ورا السهم الأصفر لحد الروبوت عند الصخور. دوس M للخريطة.'):(l==='en'?`Follow the yellow arrow to the ${bName(st.building,l)}. Press M for the map.`:`امشي ورا السهم الأصفر لحد ${bName(st.building,l)}. دوس M للخريطة.`);
    return [{level:0,category:'goal',text:`${pick(st.task,l)} · ${pick(st.where,l)}`,visual:'none'},
      {level:1,category:'nav',text:nav,visual:'beacon'},
      {level:2,category:'control',text:rover?(l==='en'?'Walk up to the robot and tap E.':'امشي لحد الروبوت ودوس E.'):(l==='en'?'Go inside, walk to the big machine in the middle, and tap E.':'ادخل، امشي للجهاز الكبير اللي في النص، ودوس E.'),visual:'device'},
      {level:3,category:'science',text:pick(m.think,l),visual:'none'}]}
  function hud(l:Locale){
    const m=mission();
    if(!m){const k=s.ending||outcome(base()).kind;return {title:l==='en'?'MARS BASE STORY':'حكاية قاعدة المريخ',task:pick(C_UI.endTitle[k],l),where:'',button:pick(C_UI.playStory,l),action:'restart',button2:pick(C_UI.watchEnding,l),action2:'ending'}}
    const st=step()!;return {title:`${pick(C_UI.missionN,l,{n:s.index+2,total:CAMPAIGN.length+1})} · ${pick(m.title,l)}`,task:pick(st.task,l),where:pick(st.where,l),button:'',action:'',button2:'',action2:''};
  }
  function hudAction(a:string){if(a==='restart')restart();else if(a==='ending'){seq={scenes:[],kind:'final'};page=0;fresh=true;show()}}
  function metersHtml(l:Locale){if(!s.started||!deps.roverDone())return '';const b=base(),o=problems(b).filter(p=>p!=='notes'||b.notes!=='none').filter(p=>p!=='fair'||b.fair!==null).filter(p=>p!=='alert'||b.alert==='mystery'||b.alert==='watching');
    return `<div class="hud-meters pixel-panel" aria-label="${esc(pick(C_UI.meters,l))}"><small>${pick(C_UI.meters,l)}</small>${powerStrip(l,b)}<span class="hud-plant" title="${esc(P_(STAGE_NAME[b.plants],l))}"><img src="${asset('ripple/sprout-'+b.plants)}" alt="${esc(P_(STAGE_NAME[b.plants],l))}"/></span>${b.rover==='stuck'?`<span title="${esc(P_(C_UI.chip.robotStuck,l))}"><img src="${asset('ripple/rover-stuck')}" alt="${esc(P_(C_UI.chip.robotStuck,l))}" class="hud-rover"/></span>`:''}</div>`}
  window.addEventListener('ripple-scene-ready',()=>sync());
  const api={state:()=>({...s,choices:Object.fromEntries(s.events.filter(e=>e.t==='choose').map(e=>[(e as any).m,(e as any).o]))}),base,outcome:()=>outcome(base()),problems:()=>problems(base()),view,
    active,done,started:()=>s.started,start,restart,open,close,guide,hints,hud,hudAction,metersHtml,mission,step,isOpen:()=>!!seq,timeline:(l:Locale)=>timeline(l),
    card:()=>seq?{id:seq.kind==='final'?'campaign-end':borrow?'borrow':seq.scenes[page]?.id}:null,act,options:(id:string):Opt[]=>CAMPAIGN.find(x=>x.id===id)?.options||[],lastChanges};
  (window as any).__campaign=api;sync();return api;
}
export type Campaign=ReturnType<typeof setupCampaign>;
