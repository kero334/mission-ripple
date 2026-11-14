// Ending cinematic controller: starts EndingScene, shows a SKIP button + captions, then hands back to the recap card.
import type Phaser from 'phaser';
import {C_UI} from '../missions/campaign-data';
import type {EndingKind} from '../game/base-sim';
import {type Locale,pick} from '../content/strings';
import {introSound} from '../intro/sound';
import {prefersReducedMotion} from '../intro/intro';
import {$} from '../ui/shell';

type Deps={game:()=>Phaser.Game;locale:()=>Locale;sound:()=>boolean};
const send=(type:string,value?:unknown)=>window.dispatchEvent(new CustomEvent('ripple-control',{detail:{type,value}}));
export function setupEnding(deps:Deps){
  const ui=document.createElement('div');ui.id='ending-ui';ui.className='hidden';
  ui.innerHTML='<button type="button" id="ending-skip"></button><p id="ending-caption" aria-live="polite"></p>';
  $('hud').append(ui);
  let playing=false,kind:EndingKind='continue',done:(()=>void)|null=null;
  const caption=(i:number|null)=>{const el=$('ending-caption');const t=i==null?null:C_UI.caps[kind][i];el.textContent=t?pick(t,deps.locale()):'';el.classList.toggle('on',!!t)};
  function play(k:EndingKind,info:{plants:number;power:any;open:string[];rover:string},onDone:()=>void){
    kind=k;done=onDone;playing=true;
    $('ending-skip').textContent=pick(C_UI.skip,deps.locale());caption(null);
    document.body.classList.add('ending-playing');ui.classList.remove('hidden');send('pause',true);
    const sound=deps.sound()&&introSound.start();
    const g=deps.game();if(g.scene.isActive('EndingScene'))g.scene.stop('EndingScene');
    g.scene.start('EndingScene',{kind:k,...info,reducedMotion:prefersReducedMotion(),sound:!!sound});
    requestAnimationFrame(()=>$('ending-skip').focus());
  }
  const skip=()=>{if(playing)(window as any).__ending?.skip?.()};
  window.addEventListener('ripple-ending-caption',e=>caption((e as CustomEvent<{i:number|null}>).detail.i));
  window.addEventListener('ripple-ending-done',()=>{playing=false;ui.classList.add('hidden');document.body.classList.remove('ending-playing');send('pause',false);const f=done;done=null;f?.()});
  $('ending-skip').addEventListener('click',skip);
  document.addEventListener('keydown',e=>{if(playing&&['Escape','Enter',' '].includes(e.key)){e.preventDefault();e.stopPropagation();skip()}},true);
  return {play,skip,playing:()=>playing};
}
