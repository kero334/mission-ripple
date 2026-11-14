// Connects Nuri's voice to everything she shows. Rules:
// • The dialogue box (bottom-left): each Nuri line plays when it appears. If a card or panel is covering the box, the
//   line waits and plays when the box is visible again — unless the card already said the same thing.
// • Cards: the main line plays when the page opens or changes (quiz feedback included); "Tell me more" plays after it
//   when opened; the ending recap reads its "how your choices led here" list after the main line.
// • Help panel: each tip plays when shown.
// • Closing a card/panel, entering or leaving a building, switching to Arabic, muting: the old line stops at once.
import {voice} from './voice';
type Deps={enabled:()=>boolean;volume:()=>number;locale:()=>string;duck:(on:boolean)=>void;blocked:()=>boolean};
const norm=(s:string|null|undefined)=>(s||'').replace(/\s+/g,' ').trim();
export function setupVoice(d:Deps){
  void voice.init({enabled:d.enabled,volume:d.volume,locale:d.locale,duck:d.duck});
  let pending:string|null=null;const spokenOnCard=new Set<string>();let cardText='';
  const hudHidden=()=>d.blocked()||document.body.classList.contains('modal-open')||document.body.classList.contains('tour-open');
  window.addEventListener('ripple-tour-end',()=>{const p=pending;pending=null;if(p&&!hudHidden())setTimeout(()=>{if(!voice.speaking)voice.say(p,'hud',{force:true})},900)});
  window.addEventListener('ripple-dialogue',e=>{const t=norm((e as CustomEvent<{text:string}>).detail?.text);if(!t)return;
    if(hudHidden()){if(!spokenOnCard.has(t))pending=t;return}pending=null;voice.say(t,'hud',{force:true})});
  window.addEventListener('ripple-room',()=>{voice.stop();pending=null});
  window.addEventListener('ripple-control',e=>{if((e as CustomEvent<{type:string}>).detail?.type==='locale'){voice.stop();pending=null}});
  window.addEventListener('ripple-voice-settings',()=>document.body.classList.toggle('voice-off',!d.enabled()));document.body.classList.toggle('voice-off',!d.enabled());
  window.addEventListener('ripple-modal',e=>{const open=(e as CustomEvent<{open:string[]}>).detail.open;
    if(!open.length){voice.stop('card');voice.stop('help');cardText='';const p=pending;pending=null;spokenOnCard.clear();if(p&&!hudHidden())setTimeout(()=>voice.say(p,'hud',{force:true}),120)}
    else if(voice.state.channel==='help'&&!document.querySelector('#panel-overlay:not(.hidden) .help-scene'))voice.stop('help')});
  // ---- cards (Mission 1, base missions, bonus facts) and the help panel
  const cardSay=()=>{const box=document.querySelector('#science-overlay:not(.hidden) #science-say,#campaign-overlay:not(.hidden) #science-say');return box?norm(box.textContent):''};
  const scan=()=>{
    const help=document.querySelector('#panel-overlay:not(.hidden) .help-scene .nuri-say p');
    if(help){const t=norm(help.textContent);if(t&&voice.state.text!==t&&help.getAttribute('data-voiced')!==t){help.setAttribute('data-voiced',t);voice.say(t,'help')}return}
    const t=cardSay();if(!t||t===cardText)return;cardText=t;spokenOnCard.add(t);if(pending===t)pending=null;
    const root=document.querySelector('#science-overlay:not(.hidden) .scene,#campaign-overlay:not(.hidden) .scene');
    voice.say(t,'card',{force:true});
    for(const li of root?.querySelectorAll('.why-list li')||[])voice.then(norm(li.textContent),'card');
  };
  new MutationObserver(()=>scan()).observe(document.getElementById('hud')!,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']});
  document.addEventListener('toggle',e=>{const el=e.target as HTMLDetailsElement;if(el.classList?.contains('say-more')&&el.open){const t=norm(el.querySelector('p')?.textContent);if(t)voice.speaking?voice.then(t,'card'):voice.say(t,'card')}},true);
  // ---- hear-again buttons (dialogue box and cards)
  document.addEventListener('click',e=>{const b=(e.target as HTMLElement).closest('[data-voice-replay]');if(!b)return;e.preventDefault();
    const where=b.getAttribute('data-voice-replay');const t=where==='hud'?norm(document.getElementById('nuri-text')?.textContent):cardSay();if(t)voice.say(t,where==='hud'?'hud':'card',{force:true})});
  return {stop:()=>voice.stop(),voice};
}
