// Nuri as a companion: a first-time spotlight tour of the real interface, just-in-time tips the first time a
// system appears, varied encouragement, and badge celebrations. Saves its own progress
// (mission-ripple-companion-v1). The tour never blocks the game: highlighted controls stay clickable, the
// world keeps running, and opening a panel pauses the tour until it is closed.
import {TOUR,TIP,CHEER,CELEBRATE,TOUR_UI} from '../content/companion';
import {ACHIEVEMENTS,type AchievementId} from '../game/rewards';
import {type Locale,type Tx,pick} from '../content/strings';
import type {ProgressStore} from '../game/progress';
import {voice} from '../audio/voice';
import {sfx} from '../audio/sfx';
import {$,asset,esc} from '../ui/shell';

export const COMPANION_KEY='mission-ripple-companion-v1';
// quiet: set only by the automated tests of OTHER features, so tips cannot cover the buttons those tests click.
type Save={v:1;tour:'new'|'active'|'done'|'skipped';step:number;tips:string[];cheer:Record<string,number>;lastCheer:number;quiet?:boolean};
const fresh=():Save=>({v:1,tour:'new',step:0,tips:[],cheer:{},lastCheer:0});
type R={left:number;top:number;right:number;bottom:number;width:number;height:number};
type Step={id:string;say:Tx;target?:()=>R|null;wait?:'move'|'click';click?:string;after?:Tx;when?:()=>boolean;center?:boolean;ripple?:boolean};
type Deps={locale:()=>Locale;progress:ProgressStore;blocked:()=>boolean;stage:()=>string;voiceOn:()=>boolean};
const rectOf=(el:Element|null):R|null=>{if(!el)return null;const b=el.getBoundingClientRect();if(b.width<2||b.height<2)return null;const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none')return null;return {left:b.left,top:b.top,right:b.right,bottom:b.bottom,width:b.width,height:b.height}};
const visible=(sel:string)=>rectOf(document.querySelector(sel));
/** A Phaser game object's screen rectangle (camera-aware: follows zoom and scrolling). */
function worldRect(get:(s:any)=>any):R|null{
  const s=(window as any).__ripple?.scene;if(!s)return null;const o=get(s);if(!o||!o.active||!o.visible)return null;
  const b=o.getBounds(),cam=s.cameras.main,cv=document.querySelector('#game canvas')?.getBoundingClientRect();if(!cv)return null;
  const k=cv.width/s.scale.width,X=(wx:number)=>cv.left+(cam.x+(wx-cam.worldView.x)*cam.zoom)*k,Y=(wy:number)=>cv.top+(cam.y+(wy-cam.worldView.y)*cam.zoom)*k;
  const r={left:X(b.x),top:Y(b.y),right:X(b.right),bottom:Y(b.bottom),width:0,height:0};r.width=r.right-r.left;r.height=r.bottom-r.top;
  if(r.right<0||r.bottom<0||r.left>innerWidth||r.top>innerHeight)return null;return r;
}
const inflate=(r:R,p:number):R=>({left:r.left-p,top:r.top-p,right:r.right+p,bottom:r.bottom+p,width:r.width+2*p,height:r.height+2*p});
const overlap=(a:R,b:R)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
const touchOnly=()=>window.matchMedia?.('(pointer: coarse)').matches&&!window.matchMedia?.('(any-pointer: fine)').matches;

export function setupCompanion(d:Deps){
  const P=d.progress;
  let S:Save;try{const x=JSON.parse(localStorage.getItem(COMPANION_KEY)||'null');S=x&&x.v===1?{...fresh(),...x,tips:Array.isArray(x.tips)?x.tips.filter((t:unknown)=>typeof t==='string'):[]}:fresh()}catch{S=fresh()}
  const save=()=>{try{localStorage.setItem(COMPANION_KEY,JSON.stringify(S))}catch{/* keep going */}};
  const L=()=>d.locale(),T=(t:Tx,v?:Record<string,string|number>)=>pick(t,L(),v);
  const speak=(text:string,interrupt=false)=>{if(!d.voiceOn())return;if(interrupt||!voice.speaking)voice.say(text,'coach',{force:true});else voice.then(text,'coach')};
  // ---------------------------------------------------------------- DOM
  const layer=document.createElement('div');layer.id='tour-layer';layer.className='hidden';
  layer.innerHTML=`<div class="tour-hole"></div><div class="tour-ripple"><i></i><i></i><i></i></div><img class="tour-cursor" src="${asset('ui/ui-cursor-pixel')}" alt=""/><div class="tour-arrow"></div>
    <section class="tour-bubble pixel-panel" role="dialog" aria-live="polite" aria-labelledby="tour-text"><img class="tour-nuri" src="${asset('ui/nuri-portrait-pixel')}" alt=""/><div class="tour-copy"><p id="tour-text"></p><div class="tour-foot"><span class="tour-dots"></span><button type="button" class="tour-skip"></button><button type="button" class="tour-next learning-next"></button></div></div></section>`;
  const coach=document.createElement('div');coach.id='nuri-coach';coach.className='hidden';coach.setAttribute('aria-live','polite');
  coach.innerHTML=`<div class="coach-arrow"></div><section class="coach-bubble pixel-panel"><img src="${asset('ui/nuri-portrait-pixel')}" alt=""/><p></p><button type="button" class="coach-ok">OK</button></section>`;
  const party=document.createElement('div');party.id='celebrate';party.className='hidden';
  $('hud').append(layer,coach,party);
  const q=(s:string,root:ParentNode=layer)=>root.querySelector(s) as HTMLElement;
  // ---------------------------------------------------------------- tour steps (only systems that exist in the game)
  const STEPS:Step[]=[
    {id:'hello',say:TOUR.hello,target:()=>worldRect(s=>s.nuri)},
    {id:'move',say:TOUR.move,target:()=>worldRect(s=>s.player),wait:'move',after:TOUR.moved},
    {id:'buildings',say:TOUR.buildings,target:()=>worldRect(s=>s.bSprites?.habitat),when:()=>!!worldRect(s=>s.bSprites?.habitat)},
    {id:'mission',say:TOUR.mission,target:()=>visible('#mission-panel')},
    {id:'help',say:TOUR.help,target:()=>visible('#help-button'),wait:'click',click:'#help-button'},
    {id:'xp',say:TOUR.xp,target:()=>visible('#passport-chip')},
    {id:'passport',say:TOUR.passport,target:()=>visible('#journal-button'),wait:'click',click:'#journal-button',after:TOUR.passportBack},
    {id:'map',say:TOUR.map,target:()=>visible('#map-button')},
    {id:'settings',say:TOUR.settings,target:()=>visible('#pause-button')},
    {id:'ripple1',say:TOUR.ripple1,center:true,ripple:true},
    {id:'ripple2',say:TOUR.ripple2,center:true,ripple:true},
    {id:'ripple3',say:TOUR.ripple3,center:true,ripple:true},
    {id:'start',say:TOUR.start,target:()=>visible('#science-mission-button'),when:()=>d.stage()==='ready'&&!!visible('#science-mission-button'),wait:'click',click:'#science-mission-button'},
  ];
  let active=false,idx=0,startPos:{x:number;y:number}|null=null,waiting:'move'|'click'|null=null,clicked=false,afterTimer=0,lastSpoken='';
  const steps=()=>STEPS.filter(s=>!s.when||s.when());
  function start(at=0){if(d.blocked())return;active=true;idx=at;S.tour='active';S.step=idx;save();document.body.classList.add('tour-open');layer.classList.remove('hidden');hideCoach();show();loop()}
  function end(skipped=false){if(!active)return;active=false;clearTimeout(afterTimer);S.tour=skipped?'skipped':'done';save();layer.classList.add('hidden');document.body.classList.remove('tour-open');
    if(skipped){voice.stop('coach');setTimeout(()=>coachSay(TIP_SKIPPED(),null,{key:'',ms:4200}),150)}else voice.stop('coach');
    window.dispatchEvent(new CustomEvent('ripple-tour-end'))}
  const TIP_SKIPPED=()=>T(TOUR.skipped);
  function current(){const list=steps();return list[Math.min(idx,list.length-1)]}
  function show(){
    const list=steps();if(idx>=list.length){end();return}
    const st=list[idx];S.step=idx;save();waiting=st.wait||null;clicked=false;
    if(st.id==='move'&&touchOnly()){waiting=null}
    const text=T(st.id==='move'&&touchOnly()?TOUR.moveTouch:st.say);
    q('#tour-text').textContent=text;q('.tour-dots').textContent=T(TOUR_UI.step,{n:idx+1,total:list.length});
    q('.tour-skip').textContent=T(TOUR_UI.skip);
    const last=idx===list.length-1;const nx=q('.tour-next');nx.innerHTML=`${esc(T(last?TOUR_UI.done:waiting?TOUR_UI.next:TOUR_UI.next))}<span aria-hidden="true">→</span>`;
    layer.classList.toggle('waiting',!!waiting&&waiting==='click');layer.classList.toggle('center',!!st.center);layer.classList.toggle('rippling',!!st.ripple);
    q('.tour-bubble').classList.remove('pop');void q('.tour-bubble').offsetWidth;q('.tour-bubble').classList.add('pop');
    if(st.wait==='move'){const p=(window as any).__ripple?.state?.()?.position;startPos=p?{...p}:null}
    if(text!==lastSpoken){lastSpoken=text;speak(text,true)}
    place();requestAnimationFrame(()=>nx.focus({preventScroll:true}));
  }
  function next(){clearTimeout(afterTimer);idx++;lastSpoken='';sfx.play('page');show()}
  function afterThen(t:Tx){q('#tour-text').textContent=T(t);speak(T(t),true);waiting=null;afterTimer=window.setTimeout(next,1700)}
  // where things are; the bubble avoids every important control except the one it points at
  const CONTROLS=['#mission-panel','#resource-rows','#nuri-panel','#menu-buttons','#prompt'];
  function place(){
    if(!active)return;const st=current();const hole=q('.tour-hole'),bub=q('.tour-bubble'),arrow=q('.tour-arrow'),cur=q('.tour-cursor');
    const tr=st.target?.()||null;const W=innerWidth,H=innerHeight;
    if(!tr||st.center){hole.style.cssText=`left:${W/2}px;top:${H/2}px;width:0;height:0`;hole.classList.add('none');arrow.style.display='none';cur.style.display='none';
      const bw=bub.offsetWidth,bh=bub.offsetHeight;bub.style.left=`${Math.round((W-bw)/2)}px`;bub.style.top=`${Math.round(Math.max(12,H*.42-bh/2))}px`;return}
    hole.classList.remove('none');const h=inflate(tr,8);hole.style.cssText=`left:${h.left}px;top:${h.top}px;width:${h.width}px;height:${h.height}px`;
    const bw=bub.offsetWidth,bh=bub.offsetHeight,gap=22,m=10;
    // stay clear of every HUD control, including the panel the target sits in (try sides of the target and of that panel)
    const obstacles=CONTROLS.map(visible).filter(Boolean) as R[];
    const box=obstacles.filter(o=>overlap(o,h)>0).reduce((u,o)=>({left:Math.min(u.left,o.left),top:Math.min(u.top,o.top),right:Math.max(u.right,o.right),bottom:Math.max(u.bottom,o.bottom),width:0,height:0}),h);
    const sides=(b:R)=>[{side:'below',x:(h.left+h.right)/2-bw/2,y:b.bottom+gap},{side:'above',x:(h.left+h.right)/2-bw/2,y:b.top-gap-bh},{side:'right',x:b.right+gap,y:(h.top+h.bottom)/2-bh/2},{side:'left',x:b.left-gap-bw,y:(h.top+h.bottom)/2-bh/2}];
    const cands=[...sides(h),...sides(box)]
      .map(c=>{const x=Math.max(m,Math.min(W-bw-m,c.x)),y=Math.max(m,Math.min(H-bh-m,c.y));const r={left:x,top:y,right:x+bw,bottom:y+bh,width:bw,height:bh};
        const cover=overlap(r,h)*10+obstacles.reduce((s,o)=>s+overlap(r,o),0)*3+(Math.abs(x-c.x)+Math.abs(y-c.y))*2+Math.hypot((x+bw/2)-(h.left+h.right)/2,(y+bh/2)-(h.top+h.bottom)/2)*.05;return {...c,x,y,cover}}).sort((a,b)=>a.cover-b.cover);
    const c=cands[0];bub.style.left=`${Math.round(c.x)}px`;bub.style.top=`${Math.round(c.y)}px`;
    // arrow from the bubble edge toward the target centre
    const tx=(h.left+h.right)/2,ty=(h.top+h.bottom)/2,ax=c.side==='left'?c.x+bw+4:c.side==='right'?c.x-30:Math.max(c.x+20,Math.min(c.x+bw-46,tx-13)),ay=c.side==='above'?c.y+bh+2:c.side==='below'?c.y-30:Math.max(c.y+10,Math.min(c.y+bh-36,ty-13));
    const ang=Math.atan2(ty-(ay+13),tx-(ax+13))*180/Math.PI;arrow.style.display='block';arrow.style.left=`${Math.round(ax)}px`;arrow.style.top=`${Math.round(ay)}px`;arrow.style.setProperty('--a',`${ang}deg`);
    cur.style.display=waiting==='click'?'block':'none';cur.style.left=`${Math.round(tx-4)}px`;cur.style.top=`${Math.round(ty-2)}px`;
  }
  function loop(){if(!active)return;
    const paused=document.body.classList.contains('modal-open')||d.blocked();layer.classList.toggle('paused',paused);
    if(!paused){
      const st=current();
      if(waiting==='move'&&startPos){const p=(window as any).__ripple?.state?.()?.position;if(p&&Math.hypot(p.x-startPos.x,p.y-startPos.y)>24){waiting=null;afterThen(st.after||TOUR.moved);sfx.play('right')}}
      if(waiting==='click'&&clicked){clicked=false;waiting=null;if(st.id==='start'){end();return}if(st.after)afterThen(st.after);else next()}
      place();
    }
    requestAnimationFrame(loop)}
  q('.tour-next').addEventListener('click',()=>{const list=steps();if(current()?.id==='start'||idx>=list.length-1){end();return}next()});
  q('.tour-skip').addEventListener('click',()=>end(true));
  // a click on the highlighted control counts as trying it (the click itself still goes to the game)
  document.addEventListener('click',e=>{if(!active||waiting!=='click')return;const st=current();if(!st.click||!(e.target as HTMLElement).closest(st.click))return;
    if(st.id==='start'){setTimeout(()=>end(),0);return}clicked=true},true);
  window.addEventListener('resize',()=>{place();placeCoach()});
  // ---------------------------------------------------------------- coach bubble (tips and cheers, no dimming)
  let coachTimer=0,coachShownAt=0,coachAnchor:(()=>R|null)|null=null;const tipQueue:{text:string;anchor:(()=>R|null)|null;key:string;ms:number;inModal:boolean;until?:number;kind?:string}[]=[];let coachKind='';
  function hideCoach(){coach.classList.add('hidden');coachAnchor=null;coachKind='';clearTimeout(coachTimer)}
  function coachSay(text:string,anchor:(()=>R|null)|null,{key='',ms=5200,inModal=false}={}){
    if(active)return false;coachShownAt=Date.now();coachAnchor=anchor;q('p',coach).textContent=text;coach.classList.remove('hidden');coach.classList.toggle('in-modal',inModal);
    const b=q('.coach-bubble',coach);b.classList.remove('pop');void b.offsetWidth;b.classList.add('pop');placeCoach();speak(text,false);
    clearTimeout(coachTimer);coachTimer=window.setTimeout(()=>{hideCoach();pump()},ms);if(key)(coach as any).dataset.tip=key;return true}
  function placeCoach(){if(coach.classList.contains('hidden'))return;const b=q('.coach-bubble',coach),a=q('.coach-arrow',coach),r=coachAnchor?.()||null,W=innerWidth,H=innerHeight,bw=b.offsetWidth,bh=b.offsetHeight;
    if(!r){b.style.left=`${Math.round((W-bw)/2)}px`;b.style.top='86px';a.style.display='none';return}
    const below=r.bottom+14+bh<H-8,y=below?r.bottom+14:Math.max(8,r.top-14-bh),x=Math.max(8,Math.min(W-bw-8,(r.left+r.right)/2-bw/2));
    b.style.left=`${Math.round(x)}px`;b.style.top=`${Math.round(y)}px`;a.style.display='block';a.classList.toggle('up',below);a.style.left=`${Math.round((r.left+r.right)/2-8)}px`;a.style.top=`${Math.round(below?y-12:y+bh)}px`}
  q('.coach-ok',coach).addEventListener('click',()=>{hideCoach();pump()});
  function tip(key:string,text:Tx,anchor:(()=>R|null)|null,{inModal=false,ms=5200}={}){
    if(S.quiet||S.tips.includes(key))return;S.tips.push(key);save();tipQueue.push({text:T(text),anchor,key,ms,inModal});pump()}
  function pump(){const now=Date.now();for(let i=tipQueue.length-1;i>=0;i--)if(tipQueue[i].until&&tipQueue[i].until!<now)tipQueue.splice(i,1);
    if(active||!tipQueue.length||d.blocked())return;
    // a cheer replaces a tip that has already been on screen for a while, so encouragement is never late
    if(!coach.classList.contains('hidden')){if(tipQueue[0].until&&Date.now()-coachShownAt>1800){hideCoach()}else return}
    const nx=tipQueue[0];if(!nx.inModal&&document.body.classList.contains('modal-open'))return;tipQueue.shift();coachKind=nx.kind||'';coachSay(nx.text,nx.anchor,{key:nx.key,ms:nx.ms,inModal:nx.inModal})}
  setInterval(()=>{pump();placeCoach()},400);
  /** Varied encouragement: rotates through the pool, never more than one every `gap` ms. */
  function cheer(kind:'right'|'wrong'|'complete',{gap=45000,anchor=null as (()=>R|null)|null,inModal=true}={}){
    const now=Date.now();if(S.quiet||now-(S.lastCheer||0)<gap)return;S.lastCheer=now;const pool=CHEER[kind],i=(S.cheer[kind]||0)%pool.length;S.cheer[kind]=i+1;save();
    tipQueue.unshift({text:T(pool[i]),anchor,key:'',ms:3800,inModal,until:now+6000,kind});pump()}
  // ---------------------------------------------------------------- just-in-time tips (first time a system appears)
  const modalOpen=()=>document.body.classList.contains('modal-open');
  const cardRoot='#science-overlay:not(.hidden),#campaign-overlay:not(.hidden)';
  let scanT=0;const scanSoon=()=>{clearTimeout(scanT);scanT=window.setTimeout(scan,260)};
  function scan(){if(active||d.blocked())return;
    const card=document.querySelector(cardRoot);
    if(card){
      if(card.querySelector('.stamp.nasa'))tip('nasa',TIP.nasa,()=>rectOf(document.querySelector(`${cardRoot} .stamp.nasa`)),{inModal:true});
      else if(card.querySelector('.stamp.game')&&S.tips.includes('nasa'))tip('pretend',TIP.pretend,()=>rectOf(document.querySelector(`${cardRoot} .stamp.game`)),{inModal:true});
      if(card.querySelector('.big-choice')&&!card.querySelector('.page-fix,.page-rescue'))tip('choice',TIP.choice,()=>rectOf(document.querySelector(`${cardRoot} .choice-row`)),{inModal:true});
      if(card.querySelector('.science-card.page-fix [data-c-action^="fix-"]'))tip('fix',TIP.fix,()=>rectOf(document.querySelector(`${cardRoot} .choice-row`)),{inModal:true});
      if(d.voiceOn()&&L()==='en'&&card.querySelector('.scene .voice-replay')&&S.tips.includes('nasa'))tip('hear',TIP.hear,()=>rectOf(document.querySelector(`${cardRoot} .scene .voice-replay`)),{inModal:true,ms:4200});
    }
    const pp=document.querySelector('#panel-overlay:not(.hidden) .panel-passport .badge-grid');if(pp)tip('badges',TIP.badges,()=>rectOf(document.querySelector('#panel-overlay:not(.hidden) .badge-grid')),{inModal:true});
    if(!modalOpen()&&visible('.hud-meters'))tip('meters',TIP.meters,()=>visible('.hud-meters'));
  }
  new MutationObserver(scanSoon).observe($('hud'),{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  window.addEventListener('ripple-state',e=>{const s=(e as CustomEvent<{nearestKind:string|null;room:string|null}>).detail;if(active||s.room)return;
    if(s.nearestKind==='door'&&!modalOpen())tip('door',TIP.door,()=>visible('#prompt'),{ms:3600})});
  // consequences the player did not expect (a lamp went dark, the robot got stuck)
  let prevBase:any=null,lastSurprise=0;
  window.addEventListener('ripple-control',e=>{const a=(e as CustomEvent<{type:string;value?:any}>).detail;if(a.type!=='base')return;const v=a.value;
    if(prevBase?.active&&v.active){const lampsBefore=(prevBase.power.lamp1?1:0)+(prevBase.power.lamp2?1:0),lampsNow=(v.power.lamp1?1:0)+(v.power.lamp2?1:0);
      if(!S.quiet&&(lampsNow<lampsBefore||(v.rover==='stuck'&&prevBase.rover!=='stuck'))&&Date.now()-lastSurprise>90000){lastSurprise=Date.now();tipQueue.push({text:T(TIP.consequence),anchor:null,key:'',ms:3800,inModal:false});pump()}}
    prevBase=v});
  // learning feedback from the game (sounds are separate: these fire even with the sound off)
  let wrongRun=0;
  window.addEventListener('ripple-feedback',e=>{const n=(e as CustomEvent<{name:string}>).detail.name;if(active)return;
    // the card already answers a first mistake; Nuri adds encouragement only after a second try in a row
    if(n==='tryAgain'){wrongRun++;if(wrongRun>=2)cheer('wrong',{gap:40000})}
    else if(n==='right'){wrongRun=0;for(let i=tipQueue.length-1;i>=0;i--)if(tipQueue[i].kind==='wrong')tipQueue.splice(i,1);
      if(coachKind==='wrong'){hideCoach();voice.stop('coach')}cheer('right',{gap:60000})}
    else if(n==='recovered'&&!S.quiet){S.lastCheer=0;tipQueue.unshift({text:T(TIP.recovered),anchor:null,key:'',ms:3800,inModal:true});pump()}});
  // ---------------------------------------------------------------- badge celebrations (wait for a calm moment)
  const parties:AchievementId[]=[];
  P.onReward(n=>{if(n.eventId.startsWith('ev:mission-complete:')){S.lastCheer=0;cheer('complete',{gap:0})}if(n.achievement)parties.push(n.achievement)});
  let partyTimer=0;
  function celebrate(){if(S.quiet)parties.length=0;if(!party.classList.contains('hidden')||!parties.length||active||d.blocked()||modalOpen()||voice.state.channel==='card')return;
    const id=parties.shift()!,a=ACHIEVEMENTS[id];const name=pick(a.name,L());
    party.innerHTML=`<div class="party-confetti">${Array.from({length:18},(_,i)=>`<i style="--i:${i}"></i>`).join('')}</div><section class="party-card pixel-panel" role="status"><div class="party-rays"></div><img class="party-badge" src="${asset('badges/badge-'+id)}" alt=""/><small>${esc(T(CELEBRATE.title))}</small><strong>${esc(name)}</strong><p>${esc(pick(a.how,L()))}</p><button type="button" class="learning-next">${esc(T(CELEBRATE.close))}</button></section>`;
    party.classList.remove('hidden');sfx.play('cheer');speak(T(CELEBRATE.say,{name}),true);
    const close=()=>{party.classList.add('hidden');party.innerHTML='';clearTimeout(partyTimer)};(party.querySelector('button') as HTMLElement).onclick=close;partyTimer=window.setTimeout(close,5200)}
  setInterval(celebrate,600);
  // ---------------------------------------------------------------- start: fresh players after the cinematic; resume an unfinished tour
  const whenPlaying=(f:()=>void)=>{const t=setInterval(()=>{if((window as any).__title?.state?.()==='play'&&!d.blocked()){clearInterval(t);f()}},250)};
  window.addEventListener('ripple-intro-done',()=>{if(!S.quiet&&S.tour==='new'&&P.get().awarded.length===0)whenPlaying(()=>setTimeout(()=>{if(!active&&S.tour==='new')start(0)},1700))});
  if(S.tour==='active'&&!S.quiet)whenPlaying(()=>setTimeout(()=>start(Math.max(0,S.step)),900));
  const api={start:(at=0)=>start(at),end,skip:()=>end(true),get active(){return active},state:()=>({...S,active,step:active?current()?.id:null,steps:steps().map(s=>s.id)}),
    tip,cheer,reset(){S=fresh();save()},coachText:()=>coach.classList.contains('hidden')?null:q('p',coach).textContent};
  (window as any).__companion=api;return api;
}
