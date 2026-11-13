// Shared DOM helpers: modal stack with a single pause owner, toasts, and the Science Card shell.
import {KIND,STEPS,TAGS,UI,type Locale,type Tx,pick} from '../content/strings';

export const $=(id:string)=>document.getElementById(id)!;
export const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export const bdi=(s:string|number)=>`<bdi>${s}</bdi>`;
export const asset=(p:string)=>`/assets/${p}.png`;
const send=(type:string,value?:unknown)=>window.dispatchEvent(new CustomEvent('ripple-control',{detail:{type,value}}));

// ---------------------------------------------------------------- modal stack
// Every overlay registers here. The scene is paused while any modal is open, so closing one
// overlay can never unpause the world behind another (fixes the Esc-toggle defect).
const stack:{id:string;close:()=>void}[]=[];
export const modals={
  open(id:string,close:()=>void){if(!stack.some(m=>m.id===id))stack.push({id,close});send('pause',true);window.dispatchEvent(new CustomEvent('ripple-modal',{detail:{open:stack.map(m=>m.id)}}))},
  closed(id:string){const i=stack.findIndex(m=>m.id===id);if(i>=0)stack.splice(i,1);send('pause',stack.length>0);window.dispatchEvent(new CustomEvent('ripple-modal',{detail:{open:stack.map(m=>m.id)}}))},
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

// ---------------------------------------------------------------- Science Card
export type CardKind='observation'|'meaning'|'think'|'uncertainty'|'decision'|'consequence'|'discovery'|'exhibit'|'status';
export type CardSpec={
  kind:CardKind;step?:number;title:string;
  art?:string;           // HTML for the illustration / chart
  artWide?:boolean;      // chart cards use the full width
  obs?:string;           // Layer 1: one key observation
  expl?:string;          // Layer 2: shown under "Tell me more" (or open in independent mode)
  more?:string;          // extra Layer 2 text
  body?:string;          // interactive content
  nuri?:string;          // one short Nuri line
  tags?:('nasa'|'sim'|'choice'|'learn')[];
  details?:string;       // Layer 3: exact values and NASA source
  primary?:{label:string;action:string;disabled?:boolean};
  secondary?:{label:string;action:string}[];
  back?:boolean;page?:[number,number];review?:boolean;
};
export function stepper(l:Locale,active:number){
  return `<ol class="learn-steps" aria-label="${l==='en'?'Learning steps':'خطوات التعلم'}">${STEPS.map((s,i)=>`<li class="${i===active?'active':i<active?'done':''}" ${i===active?'aria-current="step"':''}><b>${i<active?'✓':i+1}</b>${pick(s,l)}</li>`).join('')}</ol>`;
}
export function tags(l:Locale,list:CardSpec['tags']=[]){return list.length?`<p class="learn-tags">${list.map(t=>`<span class="learning-tag ${t}">${pick(TAGS[t],l)}</span>`).join('')}</p>`:''}
export function nuriLine(text:string,l:Locale){return `<div class="learning-nuri"><img src="${asset('ui/nuri-portrait-pixel')}" alt=""/><div><b>${l==='en'?'NURI':'نوري'}</b><span>${text}</span></div></div>`}
export function renderCard(l:Locale,c:CardSpec,openLayer2=false){
  const head=`<div class="card-head"><span class="kind-chip kind-${c.kind}">${pick(KIND[c.kind],l)}</span>${c.review?`<span class="review-chip">${pick(UI.reviewMode,l)}</span>`:''}</div>`;
  const step=c.step!=null?stepper(l,c.step):'';
  const layer2=c.expl||c.more?`<details class="layer2" ${openLayer2?'open':''}><summary>${pick(UI.tellMore,l)}</summary>${c.expl?`<p>${c.expl}</p>`:''}${c.more?`<p>${c.more}</p>`:''}</details>`:'';
  const text=`${c.obs?`<p class="card-obs">${c.obs}</p>`:''}${layer2}`;
  const main=c.art?(c.artWide?`<div class="card-art wide">${c.art}</div>${text}`:`<div class="card-split"><div class="card-art">${c.art}</div><div class="card-text">${text}</div></div>`):text;
  const details=c.details?`<details class="learning-source"><summary>${pick(UI.details,l)}</summary><div class="learning-source-body">${c.details}</div></details>`:'';
  const pager=c.page&&c.page[1]>1?`<span class="pager" aria-label="${c.page[0]+1}/${c.page[1]}">${Array.from({length:c.page[1]},(_,i)=>`<i class="${i===c.page![0]?'on':''}"></i>`).join('')}</span>`:'<span></span>';
  const foot=`<div class="card-foot">${c.back?`<button type="button" class="card-back" data-science-action="back"><span aria-hidden="true">←</span> ${pick(UI.back,l)}</button>`:'<span></span>'}${pager}<div class="card-actions">${(c.secondary||[]).map(s=>`<button type="button" class="card-secondary" data-science-action="${s.action}">${s.label}</button>`).join('')}${c.primary?`<button type="button" class="learning-next" data-science-action="${c.primary.action}" ${c.primary.disabled?'disabled':''}>${c.primary.label}<span aria-hidden="true">→</span></button>`:''}</div></div>`;
  return `${head}${step}<h2 id="science-title">${c.title}</h2>${main}${c.body||''}${c.nuri?nuriLine(c.nuri,l):''}${tags(l,c.tags)}${details}${foot}`;
}
export const T=(t:Tx,l:Locale,v?:Record<string,string|number>)=>pick(t,l,v);
