import {evidence,initialMission,loadMission,objective,saveMission,transition,validateEvidenceRecord,type MissionState} from './mission';

type Locale='en'|'ar';
type Deps={locale:()=>Locale;pause:(value:boolean)=>void;panelOpen:()=>boolean};
type Card='brief'|'monitor'|'research'|'decision'|'impact'|'delayed'|'debrief';
const $=(id:string)=>document.getElementById(id)!;
const tr=(l:Locale,en:string,ar:string)=>l==='en'?en:ar;
const icon=(name:string,alt='')=>`<img class="learning-icon" src="/assets/ui/science-${name}.png" alt="${alt}"/>`;
const say=(en:string,ar:string,l:Locale,mood='thinking')=>window.dispatchEvent(new CustomEvent('ripple-dialogue',{detail:{text:tr(l,en,ar),mood}}));
const source=(l:Locale)=>`<details class="learning-source"><summary>${tr(l,'NASA source and exact readings','مصدر ناسا والقراءات الدقيقة')}</summary><div class="learning-source-body"><p>${tr(l,'Curiosity rover RAD · Mars surface · 20 May 2024 UTC. Absorbed dose rate, not an astronaut dose.','كاشف RAD في عربة كيريوسيتي · سطح المريخ · ٢٠ مايو ٢٠٢٤. معدل الجرعة الممتصة، وليس جرعة رائد فضاء.')}</p><p>${tr(l,'Highest retrieved row','أعلى صف مسترجع')}: ${evidence.derived.peak} µGy/hour · 06:15:19 UTC. ${tr(l,'The 30 µGy/hour analysis line is not a human safety limit.','خط التحليل 30 ميكروغراي/ساعة ليس حدًا للسلامة البشرية.')}</p><p>${tr(l,'Selected original rows','صفوف أصلية مختارة')}: ${evidence.measurements.map(p=>`${p.timestampUtc.slice(11,16)} · ${p.absorbedDoseRate}`).join(' | ')}</p><p>${evidence.datasetId} · ${evidence.findingIds.join(', ')} · ${evidence.eventId}<br>${evidence.sourceRecord}<br>SHA-256: ${evidence.sourceSha256}</p><a href="${evidence.sourceUrl}" target="_blank" rel="noopener noreferrer">${tr(l,'Open NASA RadLab source ↗','افتح مصدر ناسا ↗')}</a></div></details>`;
const button=(action:string,label:string)=>`<button class="learning-next" data-science-action="${action}">${label}<span aria-hidden="true">→</span></button>`;
const nuri=(line:string)=>`<div class="learning-nuri"><img src="/assets/ui/nuri-portrait-pixel.png" alt="Nuri"/><div><b>NURI</b><span>${line}</span></div></div>`;
const tile=(name:string,label:string,headline:string,meaning:string,kind='')=>`<div class="learning-tile ${kind}"><div class="learning-tile-art">${icon(name)}</div><div class="learning-tile-copy"><small>${label}</small><strong>${headline}</strong><span>${meaning}</span></div></div>`;
const steps=(l:Locale,card:Card)=>{
  const active=card==='brief'||card==='monitor'?0:card==='research'?1:card==='decision'?2:3;
  const labels=l==='en'?['SEE','UNDERSTAND','CHOOSE','RESULT']:['شاهد','افهم','اختر','النتيجة'];
  return `<div class="learning-steps">${labels.map((label,i)=>`<span class="${i===active?'active':i<active?'done':''}"><b>${i<active?'✓':i+1}</b>${label}</span>`).join('')}</div>`;
};
const sequence=(l:Locale)=>{
  const picks=[evidence.measurements[0],evidence.measurements[3],evidence.measurements[9]];
  const labels=l==='en'?['EARLIER','HIGHEST','LATER']:['أبكر','الأعلى','لاحقًا'];
  return `<div class="reading-sequence" role="img" aria-label="${tr(l,'Three selected Curiosity RAD readings','ثلاث قراءات مختارة من كاشف كيريوسيتي')}">${picks.map((p,i)=>`<div class="sequence-point"><div class="sequence-bar-wrap"><i style="height:${Math.max(7,Math.round(p.absorbedDoseRate/evidence.derived.peak*100))}%" title="${p.absorbedDoseRate} µGy/hour"></i></div><b>${labels[i]}</b></div>`).join('')}</div><p class="learning-caption">${tr(l,'Three real rover snapshots. The tall bar is one reading, not the whole day.','ثلاث لقطات حقيقية من العربة. العمود الطويل قراءة واحدة، وليس اليوم كله.')}</p>`;
};
const comparison=(l:Locale)=>`<div class="day-comparison"><div class="day-reading"><span>${tr(l,'19 MAY','١٩ مايو')}</span><div class="day-bar small"></div><strong>${evidence.derived.previousDayMedian.toFixed(2)}</strong></div><div class="comparison-arrow">→</div><div class="day-reading"><span>${tr(l,'20 MAY','٢٠ مايو')}</span><div class="day-bar tall"></div><strong>${evidence.derived.eventDayMedian.toFixed(2)}</strong></div></div><p class="learning-caption">${tr(l,'Middle reading on each day, rounded · µGy/hour. May 20 was higher in this record.','القراءة الوسطى في كل يوم، بعد التقريب · ميكروغراي/ساعة. كانت قراءة ٢٠ مايو أعلى في هذا السجل.')}</p>`;

export function setupScienceUI(deps:Deps){
  let mission:MissionState=loadMission(),open=false,card:Card='brief';
  const missionButton=document.createElement('button');missionButton.id='science-mission-button';missionButton.type='button';$('mission-panel').append(missionButton);
  const overlay=document.createElement('div');overlay.id='science-overlay';overlay.className='hidden';
  overlay.innerHTML='<article class="science-card pixel-panel"><button id="science-close" aria-label="Close">×</button><div id="science-content"></div></article>';
  $('hud').append(overlay);
  const pause=(value:boolean)=>{open=value;overlay.classList.toggle('hidden',!value);deps.pause(value||deps.panelOpen())};
  const close=()=>pause(false);
  $('science-close').addEventListener('click',close);
  const target=()=>mission.stage==='monitor'?'field':mission.stage==='research'?'research':mission.stage==='command'?'command':mission.stage==='nextShift'?'comms':'habitat';
  const notifyTarget=()=>window.dispatchEvent(new CustomEvent('ripple-control',{detail:{type:'mission-target',value:target()}}));
  function renderHud(){
    const l=deps.locale(),en=l==='en';
    $('mission-title').textContent=tr(l,'THE ROVER READING','قراءة عربة المريخ');
    const list=[['monitor','Courtyard monitor','مراقب الساحة'],['research','Research Lab record','سجل مختبر الأبحاث'],['command','Command schedule','خطة مركز القيادة'],['nextShift','Next-shift briefing','تقرير النوبة التالية']];
    const order=['ready','monitor','research','command','nextShift','debrief','complete'],index=order.indexOf(mission.stage);
    $('objective-list').innerHTML=list.map(([stage,enLabel,arLabel])=>`<div class="objective ${index>order.indexOf(stage)?'done':mission.stage===stage?'current':''}"><span class="check">${index>order.indexOf(stage)?'✓':''}</span><span>${en?enLabel:arLabel}</span></div>`).join('');
    $('explored-text').textContent=objective(mission.stage,l);
    missionButton.textContent=mission.stage==='ready'?tr(l,'START SCIENCE MISSION','ابدأ المهمة العلمية'):mission.stage==='complete'?tr(l,'REPLAY MISSION','أعد المهمة'):tr(l,'MISSION BRIEF','موجز المهمة');
    notifyTarget();if(open)renderCard();
  }
  const save=(next:MissionState)=>{mission=next;saveMission(next);renderHud()};
  function renderCard(){
    const l=deps.locale();
    overlay.querySelector('.science-card')!.className=`science-card pixel-panel card-${card}`;
    const header=(title:string)=>`<div class="learning-kicker">${tr(l,'MISSION RIPPLE · SCIENCE STORY','مهمة ريبل · قصة علمية')}</div><h2>${title}</h2>${steps(l,card)}`;
    const real=`<span class="learning-tag real">${tr(l,'REAL NASA ROVER DATA','بيانات حقيقية من عربة ناسا')}</span>`;
    const sim=`<span class="learning-tag sim">${tr(l,'TRAINING GAME CHOICE','خيار في لعبة تدريبية')}</span>`;
    let html='';
    if(card==='brief')html=header(tr(l,'A clue from Mars','دليل من المريخ'))+
      `<div class="learning-hero">${icon('rover')}<div><small>${tr(l,'WHAT NASA SAW','ما شاهدته ناسا')}</small><strong>${tr(l,'The rover saw higher readings for hours.','رصدت العربة قراءات أعلى لساعات.')}</strong><span>${tr(l,'Our pretend crew has a robot survey to plan.','لدى فريقنا التدريبي مسح آلي يجب التخطيط له.')}</span></div></div>`+
      `<div class="learning-route">${[['radiation','FIELD','الميدان'],['research','RESEARCH','الأبحاث'],['choice','COMMAND','القيادة'],['calendar','NEXT SHIFT','النوبة التالية']].map(([name,en,ar])=>`<span>${icon(name)}<b>${tr(l,en,ar)}</b></span>`).join('')}</div>`+
      nuri(tr(l,'First, follow the marker to the field screen.','أولًا، اتبع العلامة إلى شاشة الميدان.'))+
      `<p class="learning-honesty">${real} ${tr(l,'The schedule you choose later belongs to our training game.','الجدول الذي ستختاره لاحقًا جزء من لعبتنا التدريبية.')}</p>`+
      button('close',tr(l,'GO TO THE FIELD SCREEN','اذهب إلى شاشة الميدان'));
    if(card==='monitor')html=header(tr(l,'See the rover reading','شاهد قراءة العربة'))+
      `<div class="learning-hero">${icon('rover')}<div><small>${tr(l,'NASA READING · 20 MAY 2024','قراءة ناسا · ٢٠ مايو ٢٠٢٤')}</small><strong>${tr(l,'One reading reached about 304 µGy/hour.','وصلت إحدى القراءات إلى نحو ٣٠٤ ميكروغراي/ساعة.')}</strong><span>${tr(l,'That number came from Curiosity on Mars. It is not a reading inside our base.','جاء هذا الرقم من عربة كيريوسيتي على المريخ. وليس قراءة داخل قاعدتنا.')}</span></div></div>`+
      sequence(l)+nuri(tr(l,'One tall bar is a clue. Check the readings around it!','العمود الطويل دليل. انظر إلى القراءات حوله!'))+
      `<p class="learning-honesty">${real} ${tr(l,'Exact values and the NASA link are below.','القيم الدقيقة ورابط ناسا أدناه.')}</p>`+
      source(l)+button('monitor-reviewed',tr(l,'NEXT · VISIT RESEARCH','التالي · زر مختبر الأبحاث'));
    if(card==='research')html=header(tr(l,'Understand the pattern','افهم النمط'))+
      `<div class="learning-hero compact">${icon('clock')}<div><small>${tr(l,'WHAT WE FOUND','ما وجدناه')}</small><strong>${tr(l,'Higher readings lasted about 14 hours.','استمرت القراءات الأعلى نحو ١٤ ساعة.')}</strong><span>${tr(l,'It was more than one tall bar.','كانت أكثر من عمود طويل واحد.')}</span></div></div>`+
      comparison(l)+
      tile('question',tr(l,`WHAT WE DON'T KNOW`,'ما لا نعرفه'),tr(l,'Why did it happen?','لماذا حدث ذلك؟'),tr(l,'The rover record cannot tell us an astronaut’s dose or a safe limit.','لا يخبرنا سجل العربة بجرعة رائد الفضاء أو حد آمن.'))+
      nuri(tr(l,'A good scientist tells us what is still unknown.','العالم الجيد يذكر ما لا نعرفه بعد.'))+
      `<p class="learning-honesty">${real}</p>`+source(l)+button('research-reviewed',tr(l,'NEXT · PLAN IN COMMAND','التالي · خطط في القيادة'));
    if(card==='decision')html=header(tr(l,'Choose a plan','اختر خطة'))+
      `<div class="learning-hero compact">${icon('choice')}<div><small>${tr(l,'YOUR TRAINING DECISION','قرارك في التدريب')}</small><strong>${tr(l,'Use one pretend work slot.','استخدم فترة عمل تدريبية واحدة.')}</strong><span>${tr(l,'Both plans are possible. They change the next shift.','كلتا الخطتين ممكنة. وستغيران النوبة التالية.')}</span></div></div>`+
      `<div class="learning-options"><button data-science-action="review-defer" class="learning-option">${icon('research')}<b>${tr(l,'A · STUDY FIRST','أ · ادرس أولًا')}</b><span>${tr(l,'Now: robot survey waits.','الآن: ينتظر المسح الآلي.')}</span><small>${tr(l,'Later: trend notes are ready.','لاحقًا: ملاحظات الاتجاه جاهزة.')}</small></button><button data-science-action="survey-followup" class="learning-option">${icon('rover')}<b>${tr(l,'B · SURVEY + RECHECK','ب · امسح ثم أعد الفحص')}</b><span>${tr(l,'Now: robot survey stays.','الآن: يستمر المسح الآلي.')}</span><small>${tr(l,'Later: another reading is needed.','لاحقًا: نحتاج قراءة أخرى.')}</small></button></div>`+
      nuri(tr(l,'This is our game schedule. NASA did not measure our base.','هذا جدول لعبتنا. ناسا لم تقس قاعدتنا.'))+
      `<p class="learning-honesty">${sim} ${tr(l,'No health or safety result is calculated.','لا نحسب نتيجة صحية أو حدًا للسلامة.')}</p>`+source(l);
    if(card==='impact')html=header(tr(l,'Your plan changed today','غيّرت خطتك هذا اليوم'))+
      `<div class="learning-result-pair">${tile(mission.choice==='review-defer'?'research':'rover',tr(l,'RIGHT NOW','الآن'),mission.choice==='review-defer'?tr(l,'Survey waits','ينتظر المسح'):tr(l,'Survey stays','يستمر المسح'),mission.choice==='review-defer'?tr(l,'The crew reviews the trend.','يراجع الفريق الاتجاه.'):tr(l,'A new reading is queued.','أُضيفت قراءة جديدة.'),'now')}${tile('calendar',tr(l,'NEXT SHIFT','النوبة التالية'),mission.choice==='review-defer'?tr(l,'Notes ready','الملاحظات جاهزة'):tr(l,'Reading due','قراءة مطلوبة'),mission.choice==='review-defer'?tr(l,'The survey is still waiting.','لا يزال المسح منتظرًا.'):tr(l,'The question stays open.','يبقى السؤال مفتوحًا.'),'later')}</div>`+
      nuri(tr(l,'Now go to Communications to see the ripple.','اذهب إلى الاتصالات لترى الأثر.'))+
      `<p class="learning-honesty">${sim} ${tr(l,'The NASA measurements did not change.','قياسات ناسا لم تتغير.')}</p>`+
      button('close',tr(l,'GO TO COMMUNICATIONS','اذهب إلى الاتصالات'));
    if(card==='delayed')html=header(tr(l,'The next shift','النوبة التالية'))+
      tile('calendar',tr(l,'YOUR LATER RESULT · TRAINING GAME','نتيجتك اللاحقة · لعبة تدريبية'),mission.choice==='review-defer'?tr(l,'Trend notes are ready','ملاحظات الاتجاه جاهزة'):tr(l,'Another reading is due','نحتاج قراءة أخرى'),mission.choice==='review-defer'?tr(l,'The optional robot survey is still pending.','لا يزال المسح الآلي الاختياري منتظرًا.'):tr(l,'The survey stayed, but we still need a follow-up reading.','استمر المسح، لكننا ما زلنا بحاجة إلى قراءة متابعة.'))+
      `<div class="learning-mini-poster">${icon('choice')}<span>${tr(l,'Your choice changed the schedule, not the rover’s old readings.','غيّر قرارك الجدول، ولم يغيّر قراءات العربة القديمة.')}</span></div>`+
      nuri(tr(l,'See? A choice can change what we learn next.','أرأيت؟ قد يغير القرار ما نتعلمه لاحقًا.'))+
      button('next-shift-reviewed',tr(l,'SEE WHAT WE LEARNED','شاهد ما تعلمناه'));
    if(card==='debrief')html=header(tr(l,'Science debrief','الخلاصة العلمية'))+
      `<div class="learning-debrief">${tile('rover',tr(l,'NASA OBSERVED','شاهدت ناسا'),tr(l,'Rover readings rose','ارتفعت قراءات العربة'),tr(l,'Several readings stayed higher on 20 May.','بقيت عدة قراءات أعلى في ٢٠ مايو.'))}${tile('question',tr(l,'STILL UNKNOWN','ما زال مجهولًا'),tr(l,'Cause and human dose','السبب وجرعة الإنسان'),tr(l,'This record cannot answer those questions.','لا يستطيع هذا السجل الإجابة عنها.'))}${tile('choice',tr(l,'YOU CHOSE · GAME','اخترت · لعبة'),mission.choice==='review-defer'?tr(l,'Study first','ادرس أولًا'):tr(l,'Survey + recheck','امسح وأعد الفحص'),tr(l,'Your schedule shaped the next task.','شكّل جدولك المهمة التالية.'))}</div>`+
      nuri(tr(l,'You used evidence and named what we do not know. Great science!','استخدمت الأدلة وذكرت ما لا نعرفه. علم رائع!'))+
      source(l)+button(mission.stage==='complete'?'close':'finish',tr(l,mission.stage==='complete'?'KEEP EXPLORING':'COMPLETE MISSION',mission.stage==='complete'?'واصل الاستكشاف':'أكمل المهمة'));
    $('science-content').innerHTML=html;
    $('science-content').querySelectorAll<HTMLButtonElement>('[data-science-action]').forEach(b=>b.onclick=()=>act(b.dataset.scienceAction!));
  }
  function show(value:Card){card=value;pause(true);renderCard()}
  function act(action:string){
    const l=deps.locale();
    if(action==='close'){close();return}
    const next=transition(mission,action as Parameters<typeof transition>[1]);
    if(next===mission)return;
    save(next);
    if(action==='monitor-reviewed'){close();say('Those are real rover readings. Let’s learn what they mean.','هذه قراءات حقيقية من العربة. لنعرف معناها.',l)}
    else if(action==='research-reviewed'){close();say('We saw the pattern and named the unknowns. Let’s plan in Command.','رأينا النمط وذكرنا ما نجهله. لنخطط في القيادة.',l)}
    else if(action==='review-defer'||action==='survey-followup'){show('impact');say('Your training plan changed. Let’s see what happens next shift.','تغيرت خطتك التدريبية. لنرَ ما يحدث في النوبة التالية.',l,'happy')}
    else if(action==='next-shift-reviewed')show('debrief');
    else if(action==='finish'){show('debrief');say('You followed the evidence. Great scientific thinking!','اتبعت الأدلة. هذا تفكير علمي رائع!',l,'happy')}
  }
  missionButton.onclick=()=>{
    const l=deps.locale();
    if(mission.stage==='ready'){save(transition(mission,'start'));show('brief');say('The rover found a clue. Follow the field marker.','عثرت العربة على دليل. اتبع علامة الميدان.',l,'warning')}
    else if(mission.stage==='complete'){save(initialMission());save(transition(mission,'start'));show('brief')}
    else show(mission.stage==='debrief'?'debrief':'brief');
  };
  window.addEventListener('ripple-world-interaction',event=>{
    const detail=(event as CustomEvent<{kind:string;buildingId:string|null}>).detail;
    if(mission.stage==='monitor'&&detail.kind==='field')show('monitor');
    else if(mission.stage==='research'&&detail.kind==='equipment'&&detail.buildingId==='research')show('research');
    else if(mission.stage==='command'&&detail.kind==='equipment'&&detail.buildingId==='command')show('decision');
    else if(mission.stage==='nextShift'&&detail.kind==='equipment'&&detail.buildingId==='comms')show('delayed');
  });
  const api={getState:()=>mission,getEvidence:()=>evidence,validateEvidenceRecord,renderHud,openMission:()=>missionButton.click(),replay:()=>{save(initialMission());close()}};
  (window as any).__mission=api;renderHud();return api;
}
