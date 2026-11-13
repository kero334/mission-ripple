import Phaser from 'phaser';
import {MarsScene,type GameState} from './scene';
import {BUILDINGS,STRINGS,type Locale} from './world-data';
import {setupScienceUI} from './science/ui';
import './style.css';

let locale:Locale='en';
let state:GameState={room:null,visited:[],inspected:[],talkedNuri:false,exploredCourtyard:false,nearest:null,paused:false,locale:'en',position:{x:640,y:595}};
let panel:''|'map'|'journal'|'inventory'|'settings'='';
let science:ReturnType<typeof setupScienceUI>|null=null;
const $=(id:string)=>document.getElementById(id)!;
const send=(type:string,value?:Locale|boolean|string)=>window.dispatchEvent(new CustomEvent('ripple-control',{detail:{type,value}}));
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const objectives=()=>locale==='en'?[
  ['Explore the courtyard',state.exploredCourtyard],
  ['Enter the Habitat',state.visited.includes('habitat')],
  ['Inspect the Power Station',state.inspected.includes('power')],
  ['Talk to Nuri',state.talkedNuri],
]:[
  ['استكشف الساحة',state.exploredCourtyard],
  ['ادخل وحدة السكن',state.visited.includes('habitat')],
  ['افحص محطة الطاقة',state.inspected.includes('power')],
  ['تحدث إلى نوري',state.talkedNuri],
];
function render(){
  document.documentElement.lang=locale;document.documentElement.dir=locale==='ar'?'rtl':'ltr';
  $('mission-title').textContent=locale==='en'?'FIELD ORIENTATION':'التعرف على القاعدة';
  const list=objectives();$('objective-list').innerHTML=list.map(([label,done],i)=>`<div class="objective ${done?'done':!list.slice(0,i).some(v=>!v[1])?'current':''}"><span class="check">${done?'✓':''}</span><span>${esc(String(label))}</span></div>`).join('');
  $('explored-text').textContent=locale==='en'?`${state.visited.length} / ${BUILDINGS.length} FACILITIES VISITED`:`زرت ${state.visited.length} من ${BUILDINGS.length} منشآت`;
  $('sol-label').textContent=locale==='en'?'SOL 001':'اليوم ٠٠١';
  $('time-label').textContent=locale==='en'?'EXPLORATION DEMO':'نسخة الاستكشاف';
  const resourceLabels=locale==='en'?['POWER','WATER','CROPS','OXYGEN']:['الطاقة','المياه','النباتات','الأكسجين'];
  $('resource-rows').innerHTML=resourceLabels.map((label,i)=>`<div class="resource"><img src="/assets/ui/ui-${['power','water','food','oxygen'][i]}-pixel.png" alt=""/><span>${label}</span><b>—</b></div>`).join('')+`<div class="resource-note">${locale==='en'?'Systems activate in future missions':'تُفعّل الأنظمة في المهمات القادمة'}</div>`;
  $('nuri-name').textContent=locale==='en'?'NURI':'نوري';
  if(!$('nuri-text').textContent)$('nuri-text').textContent=STRINGS[locale].first;
  const near=state.nearest;$('prompt').classList.toggle('hidden',!near||!!panel);
  if(near){let label=near;if(locale==='ar'){const b=BUILDINGS.find(v=>near.endsWith(v.name)||near.endsWith(v.equipmentName));label=near.startsWith('Enter ')?`ادخل ${b?.ar||''}`:near.startsWith('Inspect ')?`افحص ${b?.equipmentAr||'وحدة الميدان'}`:near==='Exit to outpost'?'اخرج إلى القاعدة':near==='Talk to Nuri'?'تحدث إلى نوري': 'افحص وحدة الميدان'}$('prompt-text').textContent=label}
  $('overlay').classList.toggle('hidden',!panel);
  $('lang-button').textContent=locale==='en'?'العربية':'ENGLISH';
  $('resume-button').textContent=locale==='en'?'RESUME':'متابعة';
  $('toolbar').innerHTML=Array.from({length:10},(_,i)=>`<button class="slot" data-slot="${i}" aria-label="${locale==='en'?'Equipment slot':'خانة المعدات'} ${i+1}"><small>${(i+1)%10}</small>${i<4?`<img src="/assets/ui/ui-${['tablet','tool','scanner','sample'][i]}-pixel.png" alt=""/>`:''}</button>`).join('');
  document.querySelectorAll<HTMLButtonElement>('.slot').forEach(button=>button.onclick=()=>openPanel('inventory'));
  if(panel)renderPanel();
  science?.renderHud();
}
function renderPanel(){
  const en=locale==='en',title={map:en?'OUTPOST MAP':'خريطة القاعدة',journal:en?'FIELD JOURNAL':'سجل الاستكشاف',inventory:en?'EQUIPMENT':'المعدات',settings:en?'PAUSED · SETTINGS':'توقف · الإعدادات'};
  $('overlay-title').textContent=panel?title[panel]:'';
  if(panel==='map')$('overlay-content').innerHTML=`<p>${en?'Approach an airlock and press E to enter.':'اقترب من البوابة واضغط E للدخول.'}</p><div class="facility-grid">${BUILDINGS.map((b,i)=>`<div><b>${String(i+1).padStart(2,'0')}</b> ${esc(en?b.name:b.ar)} <span>${state.visited.includes(b.id)?'✓':'·'}</span></div>`).join('')}</div>`;
  else if(panel==='journal')$('overlay-content').innerHTML=`<p>${en?'The Rover Reading is the first science mission. The remaining campaign missions are future work.':'قراءة العربة هي المهمة العلمية الأولى. بقية مهمات الحملة ستُضاف لاحقًا.'}</p><div class="journal-line">${en?'Stage':'المرحلة'}: ${science?.getState().stage||'ready'}</div><div class="journal-line">${en?'Scheduling choice':'خيار الجدولة'}: ${science?.getState().choice||'—'}</div>`;
  else if(panel==='inventory')$('overlay-content').innerHTML=`<p>${en?'Field equipment preview. Item use is reserved for future missions.':'معاينة معدات الميدان. سيُضاف استخدامها في المهمات القادمة.'}</p><div class="inventory-grid">${['tablet','tool','scanner','sample'].map((name,i)=>`<div><img src="/assets/ui/ui-${name}-pixel.png" alt=""/><span>${en?['Research tablet','Repair tool','Scanner','Plant sample'][i]:['لوح البحث','أداة إصلاح','ماسح','عينة نبات'][i]}</span></div>`).join('')}</div>`;
  else $('overlay-content').innerHTML=`<p>${en?'WASD or arrows · move<br>Shift · sprint<br>E · interact<br>M · map<br>J · journal<br>B · equipment<br>Esc · pause':'WASD أو الأسهم · الحركة<br>Shift · الركض<br>E · تفاعل<br>M · الخريطة<br>J · السجل<br>B · المعدات<br>Esc · توقف'}</p><p>${en?'Language can be changed below.':'يمكن تغيير اللغة أدناه.'}</p>`;
}
function openPanel(value:typeof panel){panel=panel===value?'':value;send('pause',!!panel);render()}
function switchLocale(){locale=locale==='en'?'ar':'en';send('locale',locale);$('nuri-text').textContent=STRINGS[locale].first;render()}
window.addEventListener('ripple-state',e=>{state=(e as CustomEvent<GameState>).detail;render()});
window.addEventListener('ripple-dialogue',e=>{const {text,mood}=(e as CustomEvent<{text:string;mood:string}>).detail;$('nuri-text').textContent=text;$('nuri-portrait').classList.toggle('warning',mood==='warning')});
window.addEventListener('ripple-pause',()=>openPanel('settings'));
window.addEventListener('ripple-map',()=>openPanel('map'));
window.addEventListener('ripple-journal',()=>openPanel('journal'));
window.addEventListener('ripple-inventory',()=>openPanel('inventory'));
window.addEventListener('ripple-language',switchLocale);
for(const [id,value] of [['map-button','map'],['journal-button','journal'],['inventory-button','inventory'],['pause-button','settings']] as const)$(id).addEventListener('click',()=>openPanel(value));
$('close-overlay').addEventListener('click',()=>openPanel(panel));$('resume-button').addEventListener('click',()=>openPanel(panel));$('lang-button').addEventListener('click',switchLocale);
science=setupScienceUI({locale:()=>locale,pause:value=>send('pause',value),panelOpen:()=>!!panel});
new Phaser.Game({type:Phaser.AUTO,parent:'game',backgroundColor:'#7f4449',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH,width:640,height:360},render:{antialias:false,pixelArt:true,roundPixels:true},scene:[MarsScene]});
render();
