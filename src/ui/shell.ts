// Shared DOM helpers: modal stack with a single pause owner, toasts, and the simple "Nuri scene" card.
import {CARDS,type Locale,type Tx,pick} from '../content/strings';

export const $=(id:string)=>document.getElementById(id)!;
export const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export const bdi=(s:string|number)=>`<bdi>${s}</bdi>`;
export const asset=(p:string)=>`/assets/${p}.png`;
const send=(type:string,value?:unknown)=>window.dispatchEvent(new CustomEvent('ripple-control',{detail:{type,value}}));

// ---------------------------------------------------------------- modal stack
// Every overlay registers here. The scene is paused while any modal is open, so closing one
// overlay can never unpause the world behind another.
const stack:{id:string;close:()=>void}[]=[];
const changed=()=>{send('pause',stack.length>0);document.body.classList.toggle('modal-open',stack.length>0);window.dispatchEvent(new CustomEvent('ripple-modal',{detail:{open:stack.map(m=>m.id)}}))};
export const modals={
  open(id:string,close:()=>void){if(!stack.some(m=>m.id===id))stack.push({id,close});changed()},
  closed(id:string){const i=stack.findIndex(m=>m.id===id);if(i>=0)stack.splice(i,1);changed()},
  top:()=>stack.at(-1)?.id||null,
  any:()=>stack.length>0,
  isOpen:(id:string)=>stack.some(m=>m.id===id),
  closeTop(){const m=stack.at(-1);if(m)m.close();return !!m},
};

// ---------------------------------------------------------------- toasts
const queue:string[]=[];let showing=false;
export function toast(html:string){queue.push(html);if(!showing)next()}
function next(){
  const box=$('toasts'),html=queue.shift();if(!html){showing=false;return}
  showing=true;const el=document.createElement('div');el.className='toast pixel-panel';el.innerHTML=html;box.append(el);
  requestAnimationFrame(()=>el.classList.add('in'));
  setTimeout(()=>{el.classList.remove('in');el.classList.add('out');setTimeout(()=>{el.remove();next()},260)},2600);
}

// ---------------------------------------------------------------- Nuri scene card
// One picture, one short thing Nuri says, one big button. Nothing else competes for attention.
export type Scene={
  id:string;                     // stable page id (tests, screen readers)
  art?:string;                   // the picture / chart / interactive visual
  stamp?:'nasa'|'game';          // small corner stamp: real NASA data or pretend game plan
  say:string;                    // what Nuri says (1–2 short sentences)
  more?:string;                  // optional extra sentence behind "Tell me more"
  good?:boolean;                 // Nuri is celebrating (feedback was right)
  choices?:string;               // big choice buttons / chips under the picture
  primary?:{label:string;action:string};
  secondary?:{label:string;action:string}[];
  back?:boolean;page?:[number,number];
  grownups?:string;              // exact numbers, units, IDs and NASA link
};
export function nuriLine(text:string,l:Locale){return `<div class="nuri-say"><img src="${asset('ui/nuri-portrait-pixel')}" alt="${l==='en'?'Nuri':'نوري'}"/><p>${text}</p></div>`}
export function renderScene(l:Locale,s:Scene){
  const B=CARDS.btn;
  const stamp=s.stamp?`<span class="stamp ${s.stamp}">${pick(CARDS.stamp[s.stamp],l)}</span>`:'';
  const art=s.art?`<div class="scene-art">${s.art}${stamp}</div>`:'';
  const more=s.more?`<details class="say-more"><summary>${pick(B.more,l)}</summary><p>${s.more}</p></details>`:'';
  const dots=s.page&&s.page[1]>1?`<span class="pager" aria-label="${s.page[0]+1}/${s.page[1]}">${Array.from({length:s.page[1]},(_,i)=>`<i class="${i===s.page![0]?'on':i<s.page![0]?'past':''}"></i>`).join('')}</span>`:'<span></span>';
  const grown=s.grownups?`<details class="grownups"><summary>${pick(B.grownups,l)}</summary><div class="grownups-body">${s.grownups}</div></details>`:'';
  return `<div class="scene" data-page="${s.id}" aria-label="${esc(s.say.replace(/<[^>]+>/g,''))}">${art}
    <div class="nuri-say ${s.good?'good':''}" aria-live="polite"><img src="${asset('ui/nuri-portrait-pixel')}" alt=""/><div><p id="science-say">${s.say}</p>${more}</div></div>
    ${s.choices||''}
    <div class="scene-foot">${s.back?`<button type="button" class="card-back" data-science-action="back" aria-label="${l==='en'?'Back':'رجوع'}"><span aria-hidden="true">←</span></button>`:'<span></span>'}${dots}
      <div class="card-actions">${(s.secondary||[]).map(b=>`<button type="button" class="card-secondary" data-science-action="${b.action}">${b.label}</button>`).join('')}${s.primary?`<button type="button" class="learning-next" data-science-action="${s.primary.action}">${s.primary.label}<span aria-hidden="true">→</span></button>`:''}</div></div>
    ${grown}</div>`;
}
export const T=(t:Tx,l:Locale,v?:Record<string,string|number>)=>pick(t,l,v);
