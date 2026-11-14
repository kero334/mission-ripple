// HUD overlays: Nuri help panel, Science Passport, spatial outpost map, settings.
import {ACHIEVEMENTS,ACHIEVEMENT_ORDER,CHALLENGES,NURI_LIGHTS,nextTitle,titleFor} from '../game/rewards';
import {hintLadder,FIELD_POS} from '../game/guidance';
import type {ProgressStore} from '../game/progress';
import {DISCOVERIES,discovery} from '../content/discoveries';
import {CARDS,HELP,INTRO,MAP,MISSION,OBJECTIVES,PASSPORT,SETTINGS,STAGE_STEPS,type Locale,type StageKey,pick} from '../content/strings';
import {BUILDINGS,WORLD_H,WORLD_W} from '../world-data';
import {$,asset,bdi,esc,modals,nuriLine} from './shell';

type Mission={getState:()=>{stage:string;choice:string|null};room:()=>string|null;card:()=>{seq:string;page:number}|null;highlightRise:()=>void;graphVisible:()=>boolean;updateGuide:()=>void};
type Deps={locale:()=>Locale;progress:ProgressStore;mission:()=>Mission;position:()=>{x:number;y:number};setLocale:(l:Locale)=>void;replayIntro:()=>void};
const control=(type:string,value?:unknown)=>window.dispatchEvent(new CustomEvent('ripple-control',{detail:{type,value}}));

export function setupPanels(deps:Deps){
  const P=deps.progress;
  const layer=document.createElement('div');layer.id='panel-overlay';layer.className='hidden';
  layer.innerHTML='<section class="panel-card pixel-panel" role="dialog" aria-modal="true" aria-labelledby="panel-title"><button id="panel-close" type="button" aria-label="Close">×</button><div id="panel-content"></div></section>';
  $('hud').append(layer);
  let current:''|'help'|'passport'|'map'|'settings'|'inventory'='';
  let tab:'achievements'|'missions'|'discoveries'='achievements',openCard:string|null=null,helpFrom:'card'|'hud'='hud';
  $('panel-close').addEventListener('click',()=>close());
  function open(name:typeof current){current=name;layer.classList.remove('hidden');layer.querySelector('.panel-card')!.className=`panel-card pixel-panel panel-${name}`;modals.open('panel',close);render();
    requestAnimationFrame(()=>layer.querySelector<HTMLElement>('[data-panel-action],button:not(#panel-close)')?.focus())}
  function close(){if(!current)return;current='';layer.classList.add('hidden');modals.closed('panel')}
  const toggle=(name:typeof current)=>{if(current===name)close();else{if(current)close();open(name)}};
  function bind(){layer.querySelectorAll<HTMLElement>('[data-panel-action]').forEach(b=>b.addEventListener('click',()=>action(b.dataset.panelAction!)))}
  function render(){const l=deps.locale(),c=$('panel-content');
    c.innerHTML=current==='help'?help(l):current==='passport'?passport(l):current==='map'?map(l):current==='settings'?settings(l):current==='inventory'?inventory(l):'';bind()}

  // ------------------------------------------------------------------ help
  function help(l:Locale){
    const m=deps.mission(),stage=m.getState().stage as StageKey,room=m.room(),seq=cardSeq(),ladder=hintLadder(stage,room,l,seq),level=P.hintLevel(hintKey());
    const h=ladder[level],icon={goal:'guide/guide-beacon',nav:'ui/ui-map-pixel',control:'ui/ui-help-pixel',science:'ui/science-question'}[h.category];
    const showMe=level>=1&&!['ready','debrief','complete'].includes(stage)&&!m.card();
    const graph=level>=3&&m.graphVisible();
    return `<h2 id="panel-title" class="sr-only">${pick(HELP.title,l)}</h2>
      <div class="help-scene hint-${h.category}"><img class="help-icon" src="${asset(icon)}" alt=""/><b class="help-level">${pick(HELP.levels[level],l)}</b>${nuriLine(esc(h.text),l)}</div>
      <div class="help-dots" aria-label="${level+1}/4">${ladder.map((_,i)=>`<i class="${i<=level?'on':''}"></i>`).join('')}</div>
      <div class="panel-actions">${showMe?`<button type="button" data-panel-action="show-me">${pick(HELP.showMe,l)}</button>`:''}${graph?`<button type="button" data-panel-action="show-graph">${pick(HELP.showGraph,l)}</button>`:''}
      ${level<3?`<button type="button" data-panel-action="more">${pick(HELP.more,l)}</button>`:''}
      <button type="button" class="learning-next" data-panel-action="close">${pick(HELP.back,l)}</button></div>`;
  }
  // Hints opened over a science card describe that card; otherwise they describe the world objective.
  function cardSeq(){const c=deps.mission().card();return c&&['field','research','decide','later','debrief'].includes(c.seq)?c.seq:null}
  function hintKey(){const s=cardSeq();return deps.mission().getState().stage+(s?':'+s:'')}
  function openHelp(from:'card'|'hud'){helpFrom=from;P.count('hintRequests');if(current==='help')render();else{if(current)close();open('help')}}

  // ------------------------------------------------------------------ passport
  function passport(l:Locale){
    const s=P.get(),xp=P.xp(),t=titleFor(xp),nt=nextTitle(xp);
    const tabs=(['achievements','missions','discoveries'] as const).map(k=>`<button type="button" role="tab" aria-selected="${tab===k}" class="tab ${tab===k?'on':''}" data-panel-action="tab-${k}">${pick(PASSPORT.tabs[k],l)}</button>`).join('');
    let body='';
    if(openCard){const d=discovery(openCard)!;
      body=`<div class="disc-detail"><img src="${asset(d.icon)}" alt=""/><div><h3>${esc(d.title[l])}</h3><p>${d.short(l)}</p><details open><summary>${l==='en'?'More details':'تفاصيل أكتر'}</summary><p>${d.detail(l)}</p></details><p class="src">${pick(PASSPORT.source,l)}: ${bdi(d.org)} · ${bdi(d.refs.join(', '))} · <a href="${d.url}" target="_blank" rel="noopener noreferrer">${l==='en'?'NASA source ↗':'مصدر ناسا ↗'}</a></p></div></div><button type="button" data-panel-action="card-back">${pick(PASSPORT.backToList,l)}</button>`;
    }else if(tab==='achievements'){
      const pct=nt?Math.round((xp-t.xp)/(nt.xp-t.xp)*100):100;
      body=`<div class="pp-xp"><img src="${asset('ui/ui-xp-pixel')}" alt=""/><div><small>${pick(PASSPORT.xp,l)}</small><strong id="passport-xp">${bdi(xp)}</strong></div><div class="pp-title"><small>${pick(PASSPORT.titleL,l)}</small><strong>${esc(t.name[l])}</strong><div class="xp-bar"><i style="width:${pct}%"></i></div><span>${nt?pick(PASSPORT.nextTitle,l,{xp:bdi(nt.xp-xp),title:nt.name[l]}):pick(PASSPORT.maxTitle,l)}</span></div></div>
        <h3>${pick(PASSPORT.badges,l)} · ${bdi(`${s.achievements.length}/${ACHIEVEMENT_ORDER.length}`)}</h3>
        <div class="badge-grid">${ACHIEVEMENT_ORDER.map(id=>{const got=s.achievements.includes(id),a=ACHIEVEMENTS[id];return `<div class="badge ${got?'got':''}" data-badge="${id}" title="${esc(a.how[l])}"><img src="${asset('badges/badge-'+id+(got?'':'-locked'))}" alt=""/><b>${esc(a.name[l])}</b><small>${got?esc(a.how[l]):`${pick(PASSPORT.locked,l)} · ${esc(a.how[l])}`}</small></div>`}).join('')}</div>
        <h3>${pick(PASSPORT.nuriLight,l)}</h3><div class="light-row">${NURI_LIGHTS.map(n=>{const ok=!n.unlock||s.achievements.includes(n.unlock);return `<button type="button" class="light ${s.settings.nuriLight===n.id?'on':''}" ${ok?`data-panel-action="light-${n.id}"`:'disabled'} title="${ok?'':esc(pick(PASSPORT.unlockWith,l,{badge:ACHIEVEMENTS[n.unlock!].name[l]}))}"><i style="background:${n.css}"></i>${esc(n.name[l])}${ok?'':' 🔒'.replace('🔒','·')}</button>`}).join('')}</div>`;
    }else if(tab==='missions'){
      const m=deps.mission().getState(),stage=m.stage as StageKey,o=OBJECTIVES[stage];
      const order=['ready','monitor','research','command','nextShift','debrief','complete'],cur=order.indexOf(stage);
      body=`<h3>${pick(PASSPORT.current,l)}: ${pick(MISSION.name,l)}</h3><div class="status-goal"><div><small>${pick(MISSION.now,l)}</small><strong>${esc(pick(o.task,l))}</strong></div><div><small>${pick(MISSION.where,l)}</small><span>${esc(pick(o.where,l))}</span></div></div>
        <ol class="status-steps">${STAGE_STEPS.map(v=>{const i=order.indexOf(v.stage);return `<li class="${cur>i?'done':cur===i?'now':''}"><b>${cur>i?'✓':''}</b>${esc(pick(v.label,l))}</li>`}).join('')}</ol>
        <h3>${pick(PASSPORT.challenges,l)}</h3><ul class="challenge-list">${CHALLENGES.map(c=>`<li class="${s.challenges.includes(c.id)?'done':''}"><b>${s.challenges.includes(c.id)?'✓':'○'}</b><div><strong>${esc(c.name[l])}</strong><span>${esc(c.how[l])}</span></div></li>`).join('')}</ul>
        <h3>${pick(PASSPORT.outcomes,l)}</h3><div class="outcome-grid">${(['review-defer','survey-followup'] as const).map(c=>{const seen=s.branchesSeen.includes(c),D=CARDS.decide;return `<div class="outcome ${seen?'seen':''}"><strong>${pick(c==='review-defer'?D.aTitle:D.bTitle,l)}</strong>${seen?`<span>${pick(c==='review-defer'?CARDS.now.aNow:CARDS.now.bNow,l)}</span><span>${pick(c==='review-defer'?CARDS.later.aLater:CARDS.later.bLater,l)}</span>`:`<span>${pick(PASSPORT.notSeen,l)}</span>`}</div>`}).join('')}</div>`;
    }else{
      body=`<h3>${pick(PASSPORT.science,l)} · ${bdi(`${s.cards.length}/${DISCOVERIES.length}`)}</h3><div class="disc-grid">${DISCOVERIES.map(d=>{const got=s.cards.includes(d.id);return got?`<button type="button" class="disc got" data-panel-action="card-${d.id}"><img src="${asset(d.icon)}" alt=""/><b>${esc(d.title[l])}</b><small>${d.kind==='exhibit'?(l==='en'?'Exhibit':'معروض'):(l==='en'?'Mission':'مهمة')}</small></button>`:`<div class="disc"><img src="${asset(d.icon)}" alt="" class="dim"/><b>?</b><small>${pick(PASSPORT.foundIn,l,{where:d.where[l]})}</small></div>`}).join('')}</div>
        <h3>${pick(PASSPORT.places,l)} · ${bdi(`${s.places.length}/${BUILDINGS.length}`)}</h3><div class="place-grid">${BUILDINGS.map(b=>`<span class="${s.places.includes(b.id)?'got':''}">${s.places.includes(b.id)?'✓':'·'} ${esc(l==='en'?b.name:b.ar)}</span>`).join('')}</div>`;
    }
    return `<h2 id="panel-title"><img src="${asset('ui/ui-passport-pixel')}" alt=""/>${pick(PASSPORT.title,l)}</h2><div class="tabs" role="tablist">${tabs}</div><div class="pp-body">${body}</div><p class="card-note">${pick(PASSPORT.noPublic,l)}</p>`;
  }
  function suggest(l:Locale){
    const s=P.get(),pref=s.settings.preference,m=deps.mission().getState(),o=OBJECTIVES[m.stage as StageKey];
    let text=pick(o.task,l);
    const ex=DISCOVERIES.find(d=>d.kind==='exhibit'&&!s.cards.includes(d.id));
    const badge=ACHIEVEMENT_ORDER.find(id=>!s.achievements.includes(id));
    if(pref==='explore'&&ex)text=`${ex.title[l]} · ${ex.where[l]}`;
    else if((pref==='collect'||m.stage==='complete')&&badge)text=`${ACHIEVEMENTS[badge].name[l]} · ${ACHIEVEMENTS[badge].how[l]}`;
    else if(m.stage==='complete'&&ex)text=`${ex.title[l]} · ${ex.where[l]}`;
    return `<p class="suggest"><small>${pick(PASSPORT.suggested,l)}</small> ${esc(text)}</p>`;
  }

  // ------------------------------------------------------------------ map
  function map(l:Locale){
    const S=0.36,w=WORLD_W*S,h=WORLD_H*S,pos=deps.position(),s=P.get(),m=deps.mission(),stage=m.getState().stage;
    const goal=stage==='monitor'?'field':stage==='research'?'research':stage==='command'?'command':stage==='nextShift'?'comms':null;
    const tiles=(window as any).__rippleMapPath as number[][]|undefined;
    const roads=tiles?tiles.flatMap((row,y)=>row.map((v,x)=>v>=12?`<rect x="${x*32*S}" y="${y*32*S}" width="${32*S+.5}" height="${32*S+.5}" class="mp-road"/>`:'')).join(''):'';
    const blds=BUILDINGS.map(b=>{const bw=70,bh=30,isGoal=goal===b.id;return `<g class="mp-b ${isGoal?'goal':''} ${s.places.includes(b.id)?'visited':''}"><rect x="${b.x*S-bw/2}" y="${b.y*S-bh}" width="${bw}" height="${bh}" rx="2"/><text x="${b.x*S}" y="${b.y*S-bh/2+4}" text-anchor="middle">${esc(l==='en'?b.name:b.ar)}</text>${s.places.includes(b.id)?`<text x="${b.x*S+bw/2-6}" y="${b.y*S-bh+9}" class="mp-check">✓</text>`:''}</g>`}).join('');
    const field=`<g class="mp-field ${goal==='field'?'goal':''}"><rect x="${FIELD_POS.x*S-5}" y="${FIELD_POS.y*S-9}" width="10" height="8"/><text x="${FIELD_POS.x*S+8}" y="${FIELD_POS.y*S-1}">${pick(MAP.field,l)}</text></g>`;
    const gp=goal==='field'?FIELD_POS:goal?BUILDINGS.find(b=>b.id===goal)!:null;
    const room=m.room(),you=room?BUILDINGS.find(b=>b.id===room)!:pos;
    return `<h2 id="panel-title">${pick(MAP.title,l)}</h2><div class="map-wrap" dir="ltr"><svg viewBox="0 0 ${w} ${h}" class="outpost-map" role="img" aria-label="${esc(pick(MAP.title,l))}">
      <rect width="${w}" height="${h}" class="mp-ground"/>${roads}${blds}${field}
      ${gp?`<circle cx="${gp.x*S}" cy="${(gp.y-(goal==='field'?4:20))*S}" r="14" class="mp-goal-ring"/>`:''}
      <g class="mp-you"><circle cx="${you.x*S}" cy="${(you.y-(room?20:0))*S}" r="5"/><text x="${you.x*S}" y="${(you.y-(room?20:0))*S-9}" text-anchor="middle">${pick(MAP.you,l)}</text></g></svg></div>
      <div class="map-legend"><span><i class="lg-you"></i>${pick(MAP.you,l)}</span>${gp?`<span><i class="lg-goal"></i>${pick(MAP.goal,l)}: ${esc(pick(OBJECTIVES[stage as StageKey].where,l))}</span>`:''}<span>${pick(MAP.visited,l,{n:bdi(s.places.length),total:bdi(BUILDINGS.length)})}</span></div><p class="card-note">${pick(MAP.help,l)}</p>`;
  }

  // ------------------------------------------------------------------ settings & inventory
  function settings(l:Locale){const s=P.get().settings,S=SETTINGS;
    const opt=(key:string,val:string,label:string,desc='',on=false)=>`<button type="button" class="opt ${on?'on':''}" data-panel-action="${key}-${val}" aria-pressed="${on}"><b>${label}</b>${desc?`<small>${desc}</small>`:''}</button>`;
    return `<h2 id="panel-title">${pick(S.title,l)}</h2>
      <h3>${pick(S.guidance,l)}</h3><div class="opt-row">${opt('guidance','guided',pick(S.guided,l),pick(S.guidedD,l),s.guidance==='guided')}${opt('guidance','independent',pick(S.independent,l),pick(S.independentD,l),s.guidance==='independent')}</div><p class="card-note">${pick(S.same,l)}</p>
      <h3>${pick(S.enjoy,l)}</h3><div class="opt-row four">${(['explore','solve','collect','mix'] as const).map(p=>opt('pref',p,pick(p==='explore'?S.pExplore:p==='solve'?S.pSolve:p==='collect'?S.pCollect:S.pMix,l),'',s.preference===p)).join('')}</div>
      <h3>${pick(S.language,l)}</h3><div class="opt-row">${opt('lang','en','English','',l==='en')}${opt('lang','ar','العربية','',l==='ar')}</div>
      <div class="opt-row">${opt('sound','toggle',pick(s.sound?INTRO.soundOn:INTRO.soundOff,l),'',s.sound)}<button type="button" class="opt" data-panel-action="replay-intro"><b>${pick(INTRO.replay,l)}</b></button></div>
      <details class="controls"><summary>${pick(S.controlsTitle,l)}</summary><p>${pick(S.controls,l)}</p></details>
      <div class="panel-actions"><button type="button" class="learning-next" data-panel-action="close">${pick(S.resume,l)}</button></div>`}
  function inventory(l:Locale){const items=['tablet','tool','scanner','sample'],names=[['Research tablet','لوح البحث'],['Repair tool','أداة تصليح'],['Scanner','ماسح'],['Plant sample','عينة نبات']];
    return `<h2 id="panel-title">${l==='en'?'EQUIPMENT':'المعدات'}</h2><p>${l==='en'?'Field equipment preview. Using items comes in future missions.':'معاينة معدات الميدان. استخدامها هييجي في مهمات جاية.'}</p><div class="inventory-grid">${items.map((n,i)=>`<div><img src="${asset('ui/ui-'+n+'-pixel')}" alt=""/><span>${names[i][l==='en'?0:1]}</span></div>`).join('')}</div>`}

  function action(a:string){
    const l=deps.locale(),m=deps.mission();
    if(a==='close'){close();return}
    if(a==='more'){const st=m.getState().stage,key=hintKey();const lv=Math.min(3,P.hintLevel(key)+1);P.setHintLevel(key,lv);P.count('hintRequests');
      const step=hintLadder(st as StageKey,m.room(),l,cardSeq())[lv];if(step?.visual==='beacon')control('reveal','beacon');if(step?.visual==='device')control('reveal','device');render();return}
    if(a==='show-me'){close();control('reveal','device');control('show-me');return}
    if(a==='show-graph'){close();m.highlightRise();return}
    if(a.startsWith('tab-')){tab=a.slice(4) as typeof tab;openCard=null;render();return}
    if(a.startsWith('card-')){openCard=a==='card-back'?null:a.slice(5);render();return}
    if(a.startsWith('light-')){const id=a.slice(6);P.setting('nuriLight',id);control('nuri-light',NURI_LIGHTS.find(n=>n.id===id)!.color);render();return}
    if(a.startsWith('guidance-')){P.setting('guidance',a.slice(9) as 'guided'|'independent');m.updateGuide();document.body.classList.toggle('guided',a.endsWith('guided'));render();return}
    if(a.startsWith('pref-')){P.setting('preference',a.slice(5) as any);render();return}
    if(a.startsWith('lang-')){deps.setLocale(a.slice(5) as Locale);render();return}
    if(a==='sound-toggle'){P.setting('sound',!P.get().settings.sound);render();return}
    if(a==='replay-intro'){deps.replayIntro();return}
  }
  return {open,close,toggle,openHelp,render,isOpen:()=>!!current,current:()=>current,helpFrom:()=>helpFrom};
}
