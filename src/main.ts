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
import {IntroScene} from './intro/IntroScene';
import {setupIntro} from './intro/intro';
import {setupCampaign} from './missions/campaign';
import {EndingScene} from './ending/EndingScene';
import {setupEnding} from './ending/ending';
import {sfx} from './audio/sfx';
import './style.css';

const progress=createProgressStore();
let locale:Locale=progress.get().settings.locale;
let state:GameState={room:null,visited:[],inspected:[],talkedNuri:false,exploredCourtyard:false,nearest:null,nearestKind:null,nearestId:null,guideDistance:'none',paused:false,locale,position:{x:640,y:595}};
const send=(type:string,value?:unknown)=>window.dispatchEvent(new CustomEvent('ripple-control',{detail:{type,value}}));
let science:ReturnType<typeof setupScienceUI>;

let replayIntro=()=>{};
let ending:ReturnType<typeof setupEnding>;
const campaign=setupCampaign({locale:()=>locale,progress,roverDone:()=>science?.getState().stage==='complete',m1:()=>science?.getState().choice==='survey-followup'?'trip':'study',
  playEnding:(k,info,done)=>ending.play(k,info,done),guided:()=>progress.get().settings.guidance==='guided',
  openHelp:()=>panels.openHelp('card'),openPassport:()=>panels.open('passport'),onChange:()=>{science?.renderHud(true);science?.updateGuide();renderPassportChip()}});
const panels=setupPanels({locale:()=>locale,progress,mission:()=>science,position:()=>state.position,setLocale:l=>{if(l!==locale)switchLocale()},replayIntro:()=>replayIntro(),campaign});
science=setupScienceUI({locale:()=>locale,progress,openHelp:from=>panels.openHelp(from),openPassport:()=>panels.open('passport'),campaign});

let lastMoveAt=Date.now(),lastPos='';
function promptText():{text:string;key:boolean}|null{
  const s=science.getState().stage as StageKey,k=state.nearestKind,id=state.nearestId,l=locale;
  const b=id?BUILDINGS.find(v=>v.id===id):undefined,bn=b?(l==='en'?b.name:b.ar):'';
  if(k==='field')return {key:true,text:pick(s==='monitor'?PROMPTS.examineRover:s==='ready'?PROMPTS.look:PROMPTS.reviewEvidence,l,{name:pick(PROMPTS.terminal,l)})};
  if(k==='equipment'&&b){
    if(campaign.active()&&campaign.step()?.building===b.id)return {key:true,text:pick(campaign.step()!.task,l)};
    if(b.id==='research'&&s==='research')return {key:true,text:pick(PROMPTS.studyRecord,l)};
    if(b.id==='command'&&s==='command')return {key:true,text:pick(PROMPTS.openSchedule,l)};
    if(b.id==='comms'&&s==='nextShift')return {key:true,text:pick(PROMPTS.readMessage,l)};
    return {key:true,text:pick(PROMPTS.look,l,{name:l==='en'?b.equipmentName:b.equipmentAr})}}
  if(k==='exhibit'&&id){const d=discovery(id);return {key:true,text:pick(PROMPTS.exhibit,l,{name:d?d.title[l]:''})}}
  if(k==='rover')return {key:true,text:campaign.step()?.building==='rover'?pick(campaign.step()!.task,l):l==='en'?'Look at the robot':'بُص على الروبوت'};
  if(k==='door'&&b)return {key:true,text:pick(PROMPTS.enter,l,{name:bn})};
  if(k==='exit')return {key:true,text:pick(PROMPTS.exit,l)};
  if(state.guideDistance==='near'){const gname=s==='monitor'&&!state.room?pick(PROMPTS.terminal,l):l==='en'?'machine':'الجهاز';return {key:false,text:pick(PROMPTS.closer,l,{name:gname})}}
  // Nuri is always nearby, so her prompt only appears when the player stands still for a moment.
  if(k==='nuri'&&Date.now()-lastMoveAt>5000&&s!=='ready')return {key:true,text:pick(PROMPTS.nuri,l)};
  return null;
}
function renderPassportChip(){
  const xp=progress.xp();
  $('resource-rows').innerHTML=`<button type="button" id="passport-chip" class="passport-chip pixel-panel" aria-label="${esc(pick(PASSPORT.xp,locale))}: ${xp}"><img src="${asset('ui/ui-xp-pixel')}" alt=""/><strong id="hud-xp">${bdi(xp)}</strong><small>XP</small></button>`;
  $('resource-rows').insertAdjacentHTML('beforeend',campaign.metersHtml(locale));
  $('passport-chip').onclick=()=>panels.toggle('passport');
}
function render(){
  try{sfx.ambience(intro.blocking()||ending.playing()?null:state.room?'hum':'wind')}catch{/* not set up yet */}
  document.documentElement.lang=locale;document.documentElement.dir=locale==='ar'?'rtl':'ltr';
  document.body.classList.toggle('guided',progress.get().settings.guidance==='guided');
  renderPassportChip();
  $('nuri-name').textContent=locale==='en'?'NURI':'نوري';
  if(!$('nuri-text').textContent)$('nuri-text').textContent=pick(OBJECTIVES[science.getState().stage as StageKey].intro,locale);
  const pr=promptText();$('prompt').classList.toggle('hidden',!pr||modals.any());
  if(pr){$('prompt-key').classList.toggle('hidden',!pr.key);$('prompt-move').classList.toggle('hidden',pr.key);$('prompt-text').textContent=pr.text}
  const moved=state.exploredCourtyard||state.room!=null;$('move-hint').classList.toggle('hidden',moved||modals.any()||science.getState().stage==='ready');
  $('move-hint-text').textContent=pick(MISC.moveHint,locale);
  for(const [id,en,ar] of [['map-button','Map (M)','الخريطة (M)'],['journal-button','My badges (J)','شاراتي (J)'],['pause-button','Settings (Esc)','الإعدادات (Esc)']]){const b=$(id);b.title=locale==='en'?en:ar;b.setAttribute('aria-label',b.title)}
  science.renderHud();
  if(panels.isOpen())panels.render();
}
function switchLocale(){locale=locale==='en'?'ar':'en';progress.setting('locale',locale);send('locale',locale);$('nuri-text').textContent=pick(OBJECTIVES[science.getState().stage as StageKey].intro,locale);science.updateGuide();science.rerenderCard();render()}

sfx.setSource(()=>progress.get().settings.sound);
document.addEventListener('click',e=>{const t=e.target as HTMLElement;sfx.unlock();if(t.closest('button,summary,rect[data-window]'))sfx.play('click',undefined,{gap:60})});
document.addEventListener('keydown',()=>sfx.unlock());
progress.onReward(n=>{
  if(n.achievement)sfx.play('badge',undefined,{delay:.15});else if(n.xp)sfx.play('xp',undefined,{delay:.1});
  const l=locale,parts:string[]=[];
  if(n.xp)parts.push(`<span class="t-xp"><img src="${asset('ui/ui-xp-pixel')}" alt=""/>${pick(TOAST.xp,l,{xp:n.xp})}</span>`);
  if(n.achievement)parts.push(`<span class="t-badge"><img src="${asset('badges/badge-'+n.achievement)}" alt=""/>${esc(ACHIEVEMENTS[n.achievement].name[l])}</span>`);
  // Cards and titles are collected quietly in the Passport; pop-ups stay to one or two short lines.
  if(parts.length)toast(parts.join(''));
  renderPassportChip();
});
window.addEventListener('ripple-room',e=>{const id=(e as CustomEvent<{room:string|null}>).detail.room;if(id&&progress.get().places.includes(id)&&!progress.get().flags.includes('place-toast-'+id)){progress.flag('place-toast-'+id);const b=BUILDINGS.find(v=>v.id===id)!;toast(`<span class="t-card">${esc(pick(TOAST.place,locale,{name:locale==='en'?b.name:b.ar}))}</span>`)}
  if(progress.get().places.length===BUILDINGS.length&&progress.flag('all-places-line'))setTimeout(()=>window.dispatchEvent(new CustomEvent('ripple-dialogue',{detail:{text:pick(NURI.allPlaces,locale),mood:'happy'}})),1800)});
window.addEventListener('ripple-state',e=>{state=(e as CustomEvent<GameState>).detail;render()});
setInterval(()=>{const live=(window as any).__ripple?.state?.() as GameState|undefined;if(!live)return;const p=live.position.x+','+live.position.y;if(p!==lastPos){lastPos=p;lastMoveAt=Date.now()}state={...state,position:live.position};if(!modals.any())render()},700);
setTimeout(()=>$('arrival-note').classList.add('fade'),7000);
window.addEventListener('ripple-modal',()=>render());
window.addEventListener('ripple-dialogue',e=>{const {text,mood}=(e as CustomEvent<{text:string;mood:string}>).detail;if(live())sfx.play('pop',undefined,{gap:1500});$('nuri-text').textContent=text;$('nuri-portrait').classList.toggle('warning',mood==='warning');const p=$('nuri-panel');p.classList.remove('pop');void p.offsetWidth;p.classList.add('pop')});
// Esc closes the top overlay first; only with nothing open does it open Settings.
// While the title screen or the cinematic is showing, world keys do nothing.
const live=()=>!intro.blocking()&&!ending?.playing();
window.addEventListener('ripple-pause',()=>{if(!live())return;if(!modals.closeTop())panels.open('settings')});
const guarded=(f:()=>void)=>()=>{if(!live()||modals.isOpen('science'))return;f()};
window.addEventListener('ripple-map',guarded(()=>panels.toggle('map')));
window.addEventListener('ripple-journal',guarded(()=>panels.toggle('passport')));
window.addEventListener('ripple-inventory',guarded(()=>panels.toggle('inventory')));
window.addEventListener('ripple-help',()=>{if(live())panels.openHelp(modals.isOpen('science')?'card':'hud')});
window.addEventListener('ripple-language',()=>{if(live())switchLocale()});
window.addEventListener('ripple-scene-ready',()=>{send('locale',locale);send('nuri-light',NURI_LIGHTS.find(n=>n.id===progress.get().settings.nuriLight)!.color);science.updateGuide();if(intro.blocking())send('pause',true)});
document.addEventListener('keydown',e=>{if(!modals.isOpen('science')||modals.top()!=='science')return;
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){const rtl=locale==='ar',fwd=(e.key==='ArrowRight')!==rtl;const btn=document.querySelector<HTMLButtonElement>(fwd?'#science-content .learning-next:not([disabled])':'#science-content .card-back');if(btn&&(fwd?btn.dataset.scienceAction==='next':true)){e.preventDefault();btn.click()}}});
for(const [id,f] of [['map-button',()=>panels.toggle('map')],['journal-button',()=>panels.toggle('passport')],['pause-button',()=>panels.toggle('settings')]] as const)$(id).addEventListener('click',guarded(f));
(window as any).__progress=progress;(window as any).__panels=panels;
const game=new Phaser.Game({type:Phaser.AUTO,parent:'game',backgroundColor:'#7f4449',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH,width:1280,height:720},render:{antialias:false,pixelArt:true,roundPixels:true},scene:[MarsScene,IntroScene,EndingScene]});
ending=setupEnding({game:()=>game,locale:()=>locale,sound:()=>progress.get().settings.sound});
const intro=setupIntro({game:()=>game,locale:()=>locale,toggleLocale:()=>switchLocale(),progress,stage:()=>science.getState().stage});
replayIntro=()=>{panels.close();intro.play()};
render();
intro.showTitle();
