import Phaser from 'phaser';
import {MarsScene,type GameState} from './scene';
import {BUILDINGS} from './world-data';
import {setupScienceUI} from './science/ui';
import {setupPanels} from './ui/panels';
import {createProgressStore} from './game/progress';
import {ACHIEVEMENTS,NURI_LIGHTS,titleFor} from './game/rewards';
import {discovery} from './content/discoveries';
import {MISC,NURI,OBJECTIVES,PASSPORT,PROMPTS,TOAST,type Locale,type StageKey,pick} from './content/strings';
import {$,asset,bdi,esc,modals,toast} from './ui/shell';
import './style.css';

const progress=createProgressStore();
let locale:Locale=progress.get().settings.locale;
let state:GameState={room:null,visited:[],inspected:[],talkedNuri:false,exploredCourtyard:false,nearest:null,nearestKind:null,nearestId:null,guideDistance:'none',paused:false,locale,position:{x:640,y:595}};
const send=(type:string,value?:unknown)=>window.dispatchEvent(new CustomEvent('ripple-control',{detail:{type,value}}));
let science:ReturnType<typeof setupScienceUI>;

const panels=setupPanels({locale:()=>locale,progress,mission:()=>science,position:()=>state.position,setLocale:l=>{if(l!==locale)switchLocale()}});
science=setupScienceUI({locale:()=>locale,progress,openHelp:from=>panels.openHelp(from),openPassport:()=>panels.open('passport')});

let lastMoveAt=Date.now(),lastPos='';
function promptText():{text:string;key:boolean}|null{
  const s=science.getState().stage as StageKey,k=state.nearestKind,id=state.nearestId,l=locale;
  const b=id?BUILDINGS.find(v=>v.id===id):undefined,bn=b?(l==='en'?b.name:b.ar):'';
  if(k==='field')return {key:true,text:pick(s==='monitor'?PROMPTS.examineRover:s==='ready'?PROMPTS.look:PROMPTS.reviewEvidence,l,{name:pick(PROMPTS.terminal,l)})};
  if(k==='equipment'&&b){
    if(b.id==='research'&&s==='research')return {key:true,text:pick(PROMPTS.studyRecord,l)};
    if(b.id==='command'&&s==='command')return {key:true,text:pick(PROMPTS.openSchedule,l)};
    if(b.id==='comms'&&s==='nextShift')return {key:true,text:pick(PROMPTS.readMessage,l)};
    return {key:true,text:pick(PROMPTS.look,l,{name:l==='en'?b.equipmentName:b.equipmentAr})}}
  if(k==='exhibit'&&id){const d=discovery(id);return {key:true,text:pick(PROMPTS.exhibit,l,{name:d?d.title[l]:''})}}
  if(k==='door'&&b)return {key:true,text:pick(PROMPTS.enter,l,{name:bn})};
  if(k==='exit')return {key:true,text:pick(PROMPTS.exit,l)};
  if(state.guideDistance==='near'){const gname=s==='monitor'&&!state.room?pick(PROMPTS.terminal,l):l==='en'?'machine':'الجهاز';return {key:false,text:pick(PROMPTS.closer,l,{name:gname})}}
  // Nuri is always nearby, so her prompt only appears when the player stands still for a moment.
  if(k==='nuri'&&Date.now()-lastMoveAt>5000&&s!=='ready')return {key:true,text:pick(PROMPTS.nuri,l)};
  return null;
}
function renderPassportChip(){
  const xp=progress.xp(),p=progress.get();
  $('resource-rows').innerHTML=`<button type="button" id="passport-chip" class="passport-chip"><img src="${asset('ui/ui-passport-pixel')}" alt=""/><div><small>${pick(PASSPORT.xp,locale)}</small><strong><img src="${asset('ui/ui-xp-pixel')}" alt=""/> <span id="hud-xp">${bdi(xp)}</span></strong><span class="chip-title">${esc(titleFor(xp).name[locale])}</span></div><span class="chip-badges"><b>${bdi(p.achievements.length)}</b>/${bdi(Object.keys(ACHIEVEMENTS).length)}<small>${pick(PASSPORT.badges,locale)}</small></span></button>`;
  $('passport-chip').onclick=()=>panels.toggle('passport');
}
function render(){
  document.documentElement.lang=locale;document.documentElement.dir=locale==='ar'?'rtl':'ltr';
  document.body.classList.toggle('guided',progress.get().settings.guidance==='guided');
  $('sol-label').textContent=pick(MISC.sol,locale);$('time-label').textContent=pick(MISC.demo,locale);
  renderPassportChip();
  $('nuri-name').textContent=locale==='en'?'NURI':'نوري';
  if(!$('nuri-text').textContent)$('nuri-text').textContent=pick(OBJECTIVES[science.getState().stage as StageKey].intro,locale);
  const pr=promptText();$('prompt').classList.toggle('hidden',!pr||modals.any());
  if(pr){$('prompt-key').classList.toggle('hidden',!pr.key);$('prompt-move').classList.toggle('hidden',pr.key);$('prompt-text').textContent=pr.text}
  const moved=state.exploredCourtyard||state.room!=null;$('move-hint').classList.toggle('hidden',moved||modals.any()||science.getState().stage==='ready');
  $('move-hint-text').textContent=pick(MISC.moveHint,locale);
  $('toolbar').innerHTML=['tablet','tool','scanner','sample'].map((n,i)=>`<button type="button" class="slot" aria-label="${esc(pick(MISC.items[i],locale))}"><small>${i+1}</small><img src="${asset('ui/ui-'+n+'-pixel')}" alt=""/></button>`).join('');
  document.querySelectorAll<HTMLButtonElement>('.slot').forEach(b=>b.onclick=()=>panels.toggle('inventory'));
  for(const [id,en,ar] of [['map-button','Map (M)','الخريطة (M)'],['journal-button','Science Passport (J)','جواز السفر العلمي (J)'],['inventory-button','Equipment (B)','المعدات (B)'],['pause-button','Settings (Esc)','الإعدادات (Esc)']]){const b=$(id);b.title=locale==='en'?en:ar;b.setAttribute('aria-label',b.title)}
  science.renderHud();
  if(panels.isOpen())panels.render();
}
function switchLocale(){locale=locale==='en'?'ar':'en';progress.setting('locale',locale);send('locale',locale);$('nuri-text').textContent=pick(OBJECTIVES[science.getState().stage as StageKey].intro,locale);science.updateGuide();science.rerenderCard();render()}

progress.onReward(n=>{
  const l=locale,parts:string[]=[];
  if(n.xp)parts.push(`<span class="t-xp"><img src="${asset('ui/ui-xp-pixel')}" alt=""/>${pick(TOAST.xp,l,{xp:n.xp})}</span>`);
  if(n.achievement)parts.push(`<span class="t-badge"><img src="${asset('badges/badge-'+n.achievement)}" alt=""/>${esc(pick(TOAST.badge,l,{name:ACHIEVEMENTS[n.achievement].name[l]}))}</span>`);
  for(const c of n.cards){const d=discovery(c);if(d)parts.push(`<span class="t-card"><img src="${asset(d.icon)}" alt=""/>${esc(pick(TOAST.card,l,{name:d.title[l]}))}</span>`)}
  if(n.title)parts.push(`<span class="t-title">${esc(pick(TOAST.title,l,{name:titleFor(progress.xp()).name[l]}))}</span>`);
  if(parts.length)toast(parts.join(''));
  renderPassportChip();
});
window.addEventListener('ripple-room',e=>{const id=(e as CustomEvent<{room:string|null}>).detail.room;if(id&&progress.get().places.includes(id)&&!progress.get().flags.includes('place-toast-'+id)){progress.flag('place-toast-'+id);const b=BUILDINGS.find(v=>v.id===id)!;toast(`<span class="t-card">${esc(pick(TOAST.place,locale,{name:locale==='en'?b.name:b.ar}))}</span>`)}
  if(progress.get().places.length===BUILDINGS.length&&progress.flag('all-places-line'))setTimeout(()=>window.dispatchEvent(new CustomEvent('ripple-dialogue',{detail:{text:pick(NURI.allPlaces,locale),mood:'happy'}})),1800)});
window.addEventListener('ripple-state',e=>{state=(e as CustomEvent<GameState>).detail;render()});
setInterval(()=>{const live=(window as any).__ripple?.state?.() as GameState|undefined;if(!live)return;const p=live.position.x+','+live.position.y;if(p!==lastPos){lastPos=p;lastMoveAt=Date.now()}state={...state,position:live.position};if(!modals.any())render()},700);
setTimeout(()=>$('arrival-note').classList.add('fade'),7000);
window.addEventListener('ripple-modal',()=>render());
window.addEventListener('ripple-dialogue',e=>{const {text,mood}=(e as CustomEvent<{text:string;mood:string}>).detail;$('nuri-text').textContent=text;$('nuri-portrait').classList.toggle('warning',mood==='warning');const p=$('nuri-panel');p.classList.remove('pop');void p.offsetWidth;p.classList.add('pop')});
// Esc closes the top overlay first; only with nothing open does it open Settings.
window.addEventListener('ripple-pause',()=>{if(!modals.closeTop())panels.open('settings')});
const guarded=(f:()=>void)=>()=>{if(modals.isOpen('science'))return;f()};
window.addEventListener('ripple-map',guarded(()=>panels.toggle('map')));
window.addEventListener('ripple-journal',guarded(()=>panels.toggle('passport')));
window.addEventListener('ripple-inventory',guarded(()=>panels.toggle('inventory')));
window.addEventListener('ripple-help',()=>panels.openHelp(modals.isOpen('science')?'card':'hud'));
window.addEventListener('ripple-language',switchLocale);
window.addEventListener('ripple-scene-ready',()=>{send('locale',locale);send('nuri-light',NURI_LIGHTS.find(n=>n.id===progress.get().settings.nuriLight)!.color);science.updateGuide()});
document.addEventListener('keydown',e=>{if(!modals.isOpen('science')||modals.top()!=='science')return;
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){const rtl=locale==='ar',fwd=(e.key==='ArrowRight')!==rtl;const btn=document.querySelector<HTMLButtonElement>(fwd?'#science-content .learning-next:not([disabled])':'#science-content .card-back');if(btn&&(fwd?btn.dataset.scienceAction==='next':true)){e.preventDefault();btn.click()}}});
for(const [id,f] of [['map-button',()=>panels.toggle('map')],['journal-button',()=>panels.toggle('passport')],['inventory-button',()=>panels.toggle('inventory')],['pause-button',()=>panels.toggle('settings')]] as const)$(id).addEventListener('click',guarded(f));
(window as any).__progress=progress;(window as any).__panels=panels;
new Phaser.Game({type:Phaser.AUTO,parent:'game',backgroundColor:'#7f4449',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH,width:1280,height:720},render:{antialias:false,pixelArt:true,roundPixels:true},scene:[MarsScene]});
render();
