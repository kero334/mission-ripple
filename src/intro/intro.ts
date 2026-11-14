// Title screen + opening-cinematic flow.
// Fresh start → START GAME plays the cinematic. Saved game → CONTINUE (no forced cinematic) + WATCH INTRO.
// Skip works at any moment (button, Esc, Enter or Space) and always hands control back through MarsScene.arrival().
import type Phaser from 'phaser';
import {INTRO,OBJECTIVES,type Locale,type StageKey,pick} from '../content/strings';
import type {ProgressStore} from '../game/progress';
import {introSound} from './sound';
import {$,esc} from '../ui/shell';

type Deps={game:()=>Phaser.Game;locale:()=>Locale;toggleLocale:()=>void;progress:ProgressStore;stage:()=>string};
const send=(type:string,value?:unknown)=>window.dispatchEvent(new CustomEvent('ripple-control',{detail:{type,value}}));
const say=(text:string,mood='happy')=>window.dispatchEvent(new CustomEvent('ripple-dialogue',{detail:{text,mood}}));
export const prefersReducedMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;

export function setupIntro(deps:Deps){
  const P=deps.progress;
  let state:'title'|'intro'|'arrival'|'play'='title',caption:string|null=null;
  const body=document.body;
  const isFresh=()=>{const p=P.get();return !p.flags.includes('intro-seen')&&deps.stage()==='ready'&&p.awarded.length===0};
  function render(){
    const l=deps.locale(),fresh=isFresh(),snd=P.get().settings.sound;
    $('title-screen').innerHTML=`<div class="title-card"><img class="title-rocket" src="/assets/intro/rocket.png" alt=""/><h1>${esc(pick(INTRO.title,l))}</h1><p class="tagline">${esc(pick(INTRO.tagline,l))}</p>
      <div class="title-actions">${fresh?`<button type="button" id="title-start" class="title-primary" data-title="start">${esc(pick(INTRO.start,l))}</button>`
        :`<button type="button" id="title-continue" class="title-primary" data-title="continue">${esc(pick(INTRO.continue,l))}</button><button type="button" id="title-watch" data-title="watch">${esc(pick(INTRO.watch,l))}</button>`}</div>
      <div class="title-small"><button type="button" id="title-sound" data-title="sound" aria-pressed="${snd}">${esc(pick(snd?INTRO.soundOn:INTRO.soundOff,l))}</button><button type="button" id="title-lang" data-title="lang">${l==='en'?'العربية':'English'}</button></div>
      <p class="fiction">${esc(pick(INTRO.fiction,l))}</p></div>`;
    $('title-screen').querySelectorAll<HTMLButtonElement>('[data-title]').forEach(b=>b.onclick=()=>titleAction(b.dataset.title!));
    $('intro-skip').textContent=pick(INTRO.skip,l);
    $('intro-caption').textContent=caption?pick(INTRO.captions[caption],l):'';
    $('intro-caption').classList.toggle('on',!!caption);
  }
  function titleAction(a:string){
    if(a==='start'||a==='watch')play();
    else if(a==='continue')enterWorld(false,true);
    else if(a==='sound'){P.setting('sound',!P.get().settings.sound);render()}
    else if(a==='lang'){deps.toggleLocale();render()}
  }
  function showTitle(){state='title';body.classList.add('title-open');body.classList.remove('intro-playing');$('title-screen').classList.remove('hidden');send('pause',true);render();
    requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>('#title-screen .title-primary')?.focus())}
  /** Plays the cinematic. Must be called from a user action so sound is allowed. */
  function play(){
    P.flag('intro-seen');state='intro';caption=null;
    body.classList.remove('title-open');body.classList.add('intro-playing');$('title-screen').classList.add('hidden');$('intro-ui').classList.remove('hidden');
    send('pause',true);render();
    const sound=P.get().settings.sound&&introSound.start();
    const game=deps.game();if(game.scene.isActive('IntroScene'))game.scene.stop('IntroScene');
    game.scene.start('IntroScene',{reducedMotion:prefersReducedMotion(),sound:!!sound});
    requestAnimationFrame(()=>$('intro-skip').focus());
  }
  function skip(){if(state!=='intro')return;const s=(window as any).__intro;if(s?.skip)s.skip()}
  function enterWorld(fromIntro:boolean,quick=false){
    state='arrival';caption=null;render();
    $('intro-ui').classList.add('hidden');$('title-screen').classList.add('hidden');body.classList.remove('title-open');
    const scene=(deps.game().scene.getScene('MarsScene') as any);
    const finish=()=>{state='play';body.classList.remove('intro-playing');send('pause',false);
      if(fromIntro){const l=deps.locale();say(pick(INTRO.welcome,l));if(deps.stage()==='ready')setTimeout(()=>{if(state==='play')say(pick(OBJECTIVES[deps.stage() as StageKey].intro,deps.locale()))},3600)}};
    if(quick){finish();return}
    scene.arrival(prefersReducedMotion(),finish);
  }
  window.addEventListener('ripple-intro-caption',e=>{caption=(e as CustomEvent<{key:string|null}>).detail.key;render()});
  window.addEventListener('ripple-intro-done',()=>enterWorld(true));
  $('intro-skip').addEventListener('click',skip);
  document.addEventListener('keydown',e=>{if(state==='intro'&&['Escape','Enter',' '].includes(e.key)){e.preventDefault();e.stopPropagation();skip()}},true);
  const api={showTitle,play,skip,state:()=>state,isFresh,render,blocking:()=>state!=='play'};
  (window as any).__title=api;
  return api;
}
