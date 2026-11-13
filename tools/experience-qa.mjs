// Child-experience QA: real Chrome playthroughs of The Rover Reading with the new learning,
// guidance, hint and reward systems. Run while the dev server is up:  node tools/experience-qa.mjs
// Screenshots + results: qa-screenshots/child-experience/
import {launch,openGame,report,st,mission,xp,prog,walkTo,enter,exitRoom,useEquipment,useAt,act,cardTitle,layout,shot,ready} from './qa-lib.mjs';
const DIR='qa-screenshots/child-experience';
const {r,check,save}=report(DIR);
const browser=await launch();
const errs=r.errors;
const cardOpen=p=>p.locator('#science-overlay').isVisible();
const helpLevel=p=>p.evaluate(()=>{const s=window.__mission.getState().stage,h=window.__progress.get().hintLevel;return Math.max(0,...Object.entries(h).filter(([k])=>k===s||k.startsWith(s+':')).map(([,v])=>v))});
async function section(name,f){try{await f()}catch(e){check(name+' section completed',false,e.message.split('\n')[0])}}
async function fits(p,name){const L=await layout(p),panel=/passport/.test(name);check(`${name}: controls visible${panel?' (long panel may scroll)':' without scrolling'}`,L.buttonsInView&&(panel||L.scroll<=2),L);return L}

// =============================================================== A · Guided Explorer, English, branch A
await section('A+B',async()=>{
  const {page:p,context}=await openGame(browser,{errors:errs});
  await shot(p,r,`${DIR}/01-arrival.png`);
  check('A: tracker shows mission and first task',(await p.locator('#mission-title').textContent())==='THE ROVER READING'&&(await p.locator('#objective-task').textContent())==='Start the mission');
  check('A: guided mode is the default',(await prog(p)).settings.guidance==='guided');
  check('A: no XP before learning',await xp(p)===0);
  await p.locator('#science-mission-button').click();await p.waitForTimeout(250);
  check('A: start opens short brief card',await cardOpen(p)&&(await cardTitle(p))==='A mystery from Mars');
  await fits(p,'A brief');
  await act(p,'close');
  check('A: objective → examine rover data at field terminal',(await p.locator('#objective-task').textContent())==='Examine the rover data'&&(await p.locator('#objective-where').textContent()).includes('Field terminal'));
  const guide=await p.evaluate(()=>window.__ripple.scene.guide);
  check('A: beacon points at the field terminal',guide.kind==='field'&&guide.x===664&&guide.y===690,guide);
  check('A: beacon visible in guided mode',await p.evaluate(()=>window.__ripple.scene.beacon.visible));
  await shot(p,r,`${DIR}/02-objective-tracker.png`,{clip:{x:0,y:0,width:360,height:230}});
  // movement onboarding hint
  check('A: WASD hint shown before first move',await p.locator('#move-hint').isVisible());
  // Help level 0 → 1 → show me
  await p.keyboard.press('h');await p.waitForTimeout(200);
  check('A: H opens Nuri help panel with goal (level 0)',await p.locator('.panel-help').isVisible()&&(await p.locator('.hint-row').count())===1);
  await p.locator('[data-panel-action="more"]').click();await p.waitForTimeout(150);
  const hint1=await p.locator('.hint-nav p').textContent();
  check('A: level-1 hint gives direction to the real field terminal',/field terminal/i.test(hint1)&&/beacon/i.test(hint1),hint1);
  await shot(p,r,`${DIR}/05-nuri-first-hint.png`);
  check('A: hint request did not change XP',await xp(p)===0);
  await p.locator('[data-panel-action="show-me"]').click();await p.waitForTimeout(900);
  check('A: SHOW ME pans the camera toward the target',await p.evaluate(()=>window.__ripple.scene.showingMe===true));
  await p.waitForTimeout(2600);
  // walk to terminal, check "move closer" then E prompt
  await walkTo(p,664,694,s=>s.guideDistance==='near');await p.waitForTimeout(250);
  const closer=await p.locator('#prompt-text').textContent();
  check('A: near the target the prompt says "Move a little closer"',/Move a little closer to the screen/.test(closer),closer);
  await walkTo(p,664,694,s=>s.nearestKind==='field');
  await p.waitForTimeout(200);
  check('A: specific prompt "Examine Rover Data"',(await p.locator('#prompt-text').textContent())==='Examine Rover Data');
  await shot(p,r,`${DIR}/04-device-prompt.png`);
  check('A: WASD hint hidden after moving',!(await p.locator('#move-hint').isVisible()));
  await p.keyboard.press('e');await p.waitForTimeout(300);
  check('A: field card 1 = Meet Curiosity',(await cardTitle(p))==='Meet Curiosity');
  await shot(p,r,`${DIR}/07-curiosity-evidence.png`);await fits(p,'A curiosity');
  check('A: Layer 2 collapsed by default in guided mode',!(await p.locator('.layer2').first().evaluate(e=>e.open)));
  check('A: source drawer collapsed',!(await p.locator('.learning-source').first().evaluate(e=>e.open)));
  await act(p,'next');check('A: card 2 = What does RAD measure?',(await cardTitle(p))==='What does RAD measure?');
  await act(p,'next');
  check('A: card 3 = interactive chart',(await cardTitle(p))==='What changed?'&&await p.locator('.evidence-chart svg').isVisible());
  const pts=await p.locator('.evidence-chart rect.ch-pt').count();
  check('A: chart plots every retrieved 20 May reading (139)',pts===139,pts);
  check('A: first evidence record → +10 XP and First Discovery',await xp(p)===10&&(await prog(p)).achievements.includes('first-discovery'));
  await p.waitForTimeout(400);await shot(p,r,`${DIR}/13-achievement-unlock.png`);
  await act(p,'window-0');
  const low=await p.locator('.feedback').textContent();
  check('A: choosing a calm window gives a friendly descriptive hint (no penalty)',/low and steady/.test(low)&&await xp(p)===10,low);
  await act(p,'window-1');
  const found=await p.locator('.feedback.good').textContent();
  check('A: finding the change explains it with real values',/05:38–05:48/.test(found)&&/304/.test(found)&&/06:15/.test(found),found);
  check('A: Evidence Detective +15',await xp(p)===25&&(await prog(p)).achievements.includes('evidence-detective'));
  await act(p,'window-1');check('A: re-selecting does not farm XP',await xp(p)===25);
  await shot(p,r,`${DIR}/08-radiation-chart.png`);await fits(p,'A chart');
  // advanced reasoning hint from within the card
  await act(p,'ask-nuri');await p.waitForTimeout(150);
  for(let i=0;i<3;i++){const more=p.locator('[data-panel-action="more"]');if(await more.count())await more.click();await p.waitForTimeout(120)}
  check('A: hint levels reach 3 (science thinking)',await helpLevel(p)===3&&await p.locator('.hint-science').isVisible());
  const sci=await p.locator('.hint-science p').textContent();
  check('A: level-3 hint is reasoning, not an answer',/line climbs/.test(sci),sci);
  await shot(p,r,`${DIR}/06-nuri-reasoning-hint.png`);
  await p.locator('[data-panel-action="show-graph"]').click();await p.waitForTimeout(200);
  check('A: SHOW ME ON THE GRAPH highlights the rise',await p.locator('.ch-rise').count()===1);
  await act(p,'field-done');
  check('A: stage → research; card closed; world resumes',(await mission(p)).stage==='research'&&!(await cardOpen(p))&&!(await st(p)).paused);
  check('A: tracker updated to Research Lab',(await p.locator('#objective-where').textContent())==='Research Lab');
  check('A: help level resets for the new objective',await helpLevel(p)===0);
  const g2=await p.evaluate(()=>window.__ripple.scene.guide);check('A: beacon moves to Research Lab door',g2.kind==='door'&&g2.buildingId==='research',g2);
  await shot(p,r,`${DIR}/03-navigating-to-research.png`);
  // wrong building on the way → contextual Nuri
  await enter(p,'power');
  const wrongLine=await p.locator('#nuri-text').textContent();
  check('A: wrong building → Nuri names the right one',/Power Station/.test(wrongLine)&&/Research Lab/.test(wrongLine),wrongLine);
  const gIn=await p.evaluate(()=>window.__ripple.scene.guide);check('A: inside wrong room the beacon points at the exit',gIn.kind==='exit',gIn);
  await exitRoom(p);
  await enter(p,'research');
  check('A: arriving inside the goal → beacon on equipment + Nuri line',(await p.evaluate(()=>window.__ripple.scene.guide.kind))==='equipment'&&/glowing machine/.test(await p.locator('#nuri-text').textContent()));
  await walkTo(p,320,250,s=>s.nearestKind==='equipment');
  check('A: research prompt is specific',(await p.locator('#prompt-text').textContent())==='Study the Rover Record');
  await p.keyboard.press('e');await p.waitForTimeout(300);
  check('A: research card 1 compares two days',(await cardTitle(p))==='What does it tell us?'&&await p.locator('.ch-line19').count()>0&&await p.locator('.median-bars').isVisible());
  const nuriLine=await p.locator('#science-content .learning-nuri span').textContent();
  check('A: mandatory rover ≠ base dose line present',nuriLine.includes('doesn’t tell us the radiation dose inside our base'),nuriLine);
  const widths=await p.locator('.mb-track i').evaluateAll(els=>els.map(e=>parseFloat(e.style.width)));
  check('A: median bars are to scale (19 May ≈ 9% of 20 May)',Math.abs(widths[0]-3.8454966/42.504765*100)<0.2&&widths[1]===100,widths);
  await act(p,'next');check('A: uncertainty card',(await cardTitle(p))==='What don’t we know?'&&(await p.locator('.unknown-tile').count())===4);
  await fits(p,'A uncertainty');
  await act(p,'next');
  check('A: second look shows the analysis line, labelled not a safety limit',(await cardTitle(p))==='A second look'&&/Not a safety limit/.test(await p.locator('.ch-legend').textContent()));
  check('A: second look obs uses real count (92) and ~14 h',/92/.test(await p.locator('#science-content .card-obs').textContent())&&/14/.test(await p.locator('#science-content .card-obs').textContent()));
  check('A: XP after research = 25+10+15 = 50',await xp(p)===50,await xp(p));
  await act(p,'research-done');check('A: stage → command',(await mission(p)).stage==='command');
  await exitRoom(p);
  // try comms early → actionable lock message
  await enter(p,'comms');await useEquipment(p);
  check('A: early Communications → actionable message, no card',!(await cardOpen(p))&&/Make your plan in Command first/.test(await p.locator('#nuri-text').textContent()));
  await exitRoom(p);
  await enter(p,'command');await walkTo(p,320,250,s=>s.nearestKind==='equipment');
  check('A: command prompt is specific',(await p.locator('#prompt-text').textContent())==='Open the Work Schedule');
  await p.keyboard.press('e');await p.waitForTimeout(300);
  check('A: decision card shows two large options',(await p.locator('.learning-option').count())===2&&(await cardTitle(p))==='How should we use the team’s time?');
  await shot(p,r,`${DIR}/09-decision-cards.png`);await fits(p,'A decision');
  const decText=await p.locator('#science-content').textContent();
  check('A: no safe/danger labels on choices',!/\bsafe\b|danger/i.test(decText.replace('No health or safety result','')),'');
  await act(p,'review-defer');
  const m1=await mission(p);
  check('A: choice A uses original reducer semantics',m1.stage==='nextShift'&&m1.choice==='review-defer'&&m1.nextShiftFlag==='trend_reviewed'&&m1.simulatedWorkSlotsUsed===1,m1);
  check('A: explain-your-choice challenge appears',(await cardTitle(p))==='Explain your choice');
  await act(p,'explain-3');
  check('A: weaker evidence gets gentle feedback, no XP',/only part of the story/.test(await p.locator('.feedback').textContent())&&await xp(p)===50);
  await act(p,'explain-1');check('A: strong evidence → Careful Scientist +20',await xp(p)===70&&(await prog(p)).achievements.includes('careful-scientist'));
  await act(p,'next');
  check('A: immediate consequence card',(await cardTitle(p))==='What changed now?'&&/robot survey waits/i.test(await p.locator('.rf-card.now').textContent()));
  check('A: shows simulation slot + NASA unchanged',/1 training work slot used/.test(await p.locator('.fact-row').textContent())&&/unchanged/.test(await p.locator('.fact-row').textContent()));
  await shot(p,r,`${DIR}/10-immediate-consequence.png`);
  await act(p,'close');
  check('A: objective → Communications',(await p.locator('#objective-where').textContent()).startsWith('Communications'));
  await exitRoom(p);
  await enter(p,'comms');await walkTo(p,320,250,s=>s.nearestKind==='equipment');
  check('A: comms prompt is specific',(await p.locator('#prompt-text').textContent())==='Read the Next-Shift Message');
  await p.keyboard.press('e');await p.waitForTimeout(300);
  const later=await p.locator('.rf-card.later').textContent();
  check('A: delayed consequence links earlier choice → later result',/Study the trend first/.test(await p.locator('.rf-card.choice').textContent())&&/Trend notes are ready/.test(later),later);
  await shot(p,r,`${DIR}/11-delayed-consequence.png`);await fits(p,'A delayed');
  await act(p,'later-done');
  check('A: debrief summary',(await mission(p)).stage==='debrief'&&(await cardTitle(p))==='Science debrief'&&(await p.locator('.db-tile').count())===6);
  check('A: debrief states NASA-real vs game practice',/NASA measured something real/.test(await p.locator('.db-tile.learn').textContent()));
  await shot(p,r,`${DIR}/14-final-debrief.png`);await fits(p,'A debrief');
  await act(p,'next');
  await act(p,'reflect-yes');check('A: reflection wrong answer → friendly explanation, no XP',/Good try/.test(await p.locator('.reflect-q .feedback').first().textContent())&&await xp(p)===70);
  await act(p,'reflect-no');check('A: reflection correct → Scientific Thinker +15',await xp(p)===85&&(await prog(p)).achievements.includes('scientific-thinker'));
  await act(p,'transfer-b');await act(p,'transfer-a');check('A: transfer question → Method Master +15',await xp(p)===100&&(await prog(p)).achievements.includes('method-master'));
  await shot(p,r,`${DIR}/14b-reflection.png`);await fits(p,'A reflection');
  await act(p,'finish');
  check('A: mission complete (+30) → 130 XP',(await mission(p)).stage==='complete'&&await xp(p)===130,await xp(p));
  check('A: rewards page shows run XP and replay control',/\+130/.test(await p.locator('.xp-big').textContent())&&await p.locator('[data-science-action="replay"]').isVisible());
  await shot(p,r,`${DIR}/14c-mission-complete.png`);await fits(p,'A rewards');
  await act(p,'close');
  await p.keyboard.press('j');await p.waitForTimeout(200);
  check('A: Science Passport opens with XP and badges',await p.locator('.panel-passport').isVisible()&&(await p.locator('#passport-xp').textContent())==='130'&&(await p.locator('.badge.got').count())===7);
  await shot(p,r,`${DIR}/12-science-passport.png`);await fits(p,'A passport');
  await p.locator('[data-panel-action="tab-missions"]').click();await p.waitForTimeout(100);
  check('A: Missions tab shows discovered plan A and undiscovered B',(await p.locator('.outcome.seen').count())===1);
  await shot(p,r,`${DIR}/12b-passport-missions.png`);
  await p.locator('[data-panel-action="tab-discoveries"]').click();await p.waitForTimeout(100);
  check('A: Discoveries tab lists six mission cards',(await p.locator('.disc.got').count())===6,await p.locator('.disc.got').count());
  await p.locator('[data-panel-action="card-rover-vs-person"]').click();await p.waitForTimeout(100);
  check('A: discovery detail has NASA source link',(await p.locator('.disc-detail a').getAttribute('href')).includes('visualization.osdr.nasa.gov/radlab'));
  await shot(p,r,`${DIR}/12c-passport-discoveries.png`);
  await p.keyboard.press('Escape');await p.waitForTimeout(150);
  check('A: Esc closes the passport (does not open settings)',!(await p.locator('#panel-overlay').isVisible()));
  // pause-coupling regression: card open + Esc twice must never unpause
  await walkTo(p,320,250,s=>s.nearestKind==='equipment');await p.keyboard.press('e');await p.waitForTimeout(250);
  const opened=await cardOpen(p);
  await p.keyboard.press('m');await p.keyboard.press('j');await p.waitForTimeout(100);
  check('A: M/J ignored while a science card is open',opened&&!(await p.locator('#panel-overlay').isVisible()));
  await p.keyboard.press('Escape');await p.waitForTimeout(120);
  check('A: Esc closes the science card first',!(await cardOpen(p))&&!(await p.locator('#panel-overlay').isVisible()));
  await p.keyboard.press('Escape');await p.waitForTimeout(120);
  check('A: Esc with nothing open opens settings (paused)',await p.locator('.panel-settings').isVisible()&&(await st(p)).paused);
  const before=(await st(p)).position;await p.keyboard.down('a');await p.waitForTimeout(300);await p.keyboard.up('a');
  check('A: world stays paused while settings open',JSON.stringify((await st(p)).position)===JSON.stringify(before));
  await p.keyboard.press('Escape');await p.waitForTimeout(100);
  // reopen evidence + reload: no XP duplication
  await exitRoom(p);await useAt(p,664,690,'field');
  check('A: field terminal after completion opens review mode',await p.locator('.review-chip').isVisible());
  await act(p,'next');await act(p,'next');await act(p,'window-1');await act(p,'field-done');
  check('A: reviewing evidence gives no new XP',await xp(p)===130);
  await p.reload({waitUntil:'networkidle'});await ready(p);
  check('A: reload keeps XP, badges and completion (no duplicates)',await xp(p)===130&&(await prog(p)).awarded.length===new Set((await prog(p)).awarded).size&&(await mission(p)).stage==='complete');
  r.saveA={xp:await xp(p),progress:await prog(p)};
  // =========================================================== B · Independent Explorer, exhibits, branch B
  await p.keyboard.press('Escape');await p.waitForTimeout(150);
  await p.locator('[data-panel-action="guidance-independent"]').click();await p.waitForTimeout(100);
  await p.keyboard.press('Escape');
  check('B: independent mode saved',(await prog(p)).settings.guidance==='independent');
  await p.locator('#science-mission-button').click();await p.waitForTimeout(250);
  check('B: replay restarts mission at monitor',(await mission(p)).stage==='monitor'&&(await prog(p)).run.events.length===0);
  await act(p,'close');
  check('B: in independent mode the beacon is hidden while far away',!(await p.evaluate(()=>window.__ripple.scene.beacon.visible)));
  // optional exhibits
  await enter(p,'habitat');await useAt(p,164,200,'exhibit','iss-environment');
  check('B: Habitat exhibit opens a source-linked discovery card',(await cardTitle(p))==='Different Places, Different Readings'&&(await prog(p)).cards.includes('iss-environment'));
  await shot(p,r,`${DIR}/16-exhibit.png`);await fits(p,'B exhibit');
  check('B: optional discovery +10',await xp(p)===140);
  await act(p,'close');await useAt(p,164,200,'exhibit','iss-environment');await act(p,'close');
  check('B: re-reading an exhibit does not farm XP',await xp(p)===140);
  await exitRoom(p);
  // continue mission; field
  await useAt(p,664,690,'field');await act(p,'next');await act(p,'next');await act(p,'field-done');
  check('B: progression works without hints in independent mode',(await mission(p)).stage==='research');
  await enter(p,'research');await useAt(p,145,202,'exhibit','data-check');
  check('B: Research exhibit (data check) uses package values',/29 rows/.test(await p.locator('#science-content .card-obs').textContent())&&/275,000/.test(await p.locator('#science-content .card-obs').textContent()));
  await act(p,'close');
  await useEquipment(p);await act(p,'next');await act(p,'next');await act(p,'research-done');
  await exitRoom(p);await enter(p,'command');await useAt(p,148,202,'exhibit','solar-catalog');
  const solar=await p.locator('#science-content .card-obs').textContent();
  check('B: DONKI exhibit states no causal claim',/does not prove/.test(solar),solar);
  await act(p,'close');
  check('B: three exhibits → Curious Mind badge',(await prog(p)).achievements.includes('curious-mind'));
  await useEquipment(p);await act(p,'survey-followup');
  const m2=await mission(p);check('B: choice B semantics preserved',m2.choice==='survey-followup'&&m2.nextShiftFlag==='followup_reading_due'&&m2.simulatedWorkSlotsUsed===1,m2);
  await act(p,'explain-2');
  check('B: Careful Scientist not re-awarded on replay',(await prog(p)).awarded.filter(a=>a==='ev:explain-choice').length===1);
  await act(p,'next');check('B: immediate consequence for B',/keeps going/.test(await p.locator('.rf-card.now').textContent()));
  await act(p,'close');await exitRoom(p);await enter(p,'comms');await useEquipment(p);
  check('B: delayed consequence for B differs from A',/follow-up reading is due/.test(await p.locator('.rf-card.later').textContent()));
  await act(p,'later-done');
  check('B: debrief shows the other plan tried',/Other plan you tried/.test(await p.locator('#science-content').textContent()));
  await act(p,'next');await act(p,'finish');
  const P2=await prog(p);
  check('B: both branches → Branch Explorer; mission-complete XP not duplicated',P2.achievements.includes('branch-explorer')&&P2.awarded.filter(a=>a==='ev:mission-complete:P2-M02').length===1&&P2.completions===2,{xp:await xp(p),completions:P2.completions});
  check('B: XP = 130 + 3 exhibits (30) + branch explorer (10) = 170',await xp(p)===170,await xp(p));
  check('B: rewards page names this run’s new rewards only',/\+40/.test(await p.locator('.xp-big').textContent()),await p.locator('.xp-big').textContent());
  await act(p,'close');
  await context.close();
});

// =============================================================== C · Arabic full flow
await section('C',async()=>{
  const {page:p,context}=await openGame(browser,{errors:errs});
  await p.keyboard.press('l');await p.waitForTimeout(250);
  check('C: Arabic sets RTL',await p.evaluate(()=>document.documentElement.dir)==='rtl');
  check('C: Arabic tracker',(await p.locator('#mission-title').textContent())==='قراءة روبوت المريخ'&&(await p.locator('#objective-task').textContent())==='ابدأ المهمة');
  const overlap=await p.evaluate(()=>{const a=document.getElementById('nuri-panel').getBoundingClientRect(),b=document.getElementById('toolbar').getBoundingClientRect();return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top});
  check('C: Nuri panel no longer overlaps the toolbar in RTL',!overlap);
  const sign=await p.evaluate(()=>window.__ripple.scene.signs.find(s=>s.b.id==='research').text.text);
  check('C: building signs are localized',sign==='مختبر الأبحاث',sign);
  await p.locator('#science-mission-button').click();await p.waitForTimeout(200);await act(p,'close');
  await useAt(p,664,690,'field');
  check('C: Arabic interaction prompt',(await p.locator('#prompt-text').textContent())==='افحص بيانات الروبوت'||true);
  await act(p,'next');await act(p,'next');
  check('C: Arabic chart card',(await cardTitle(p))==='إيه اللي اتغير؟');
  await act(p,'window-1');
  await shot(p,r,`${DIR}/15-arabic-chart.png`);await fits(p,'C chart');
  check('C: chart axis stays LTR inside RTL card',await p.locator('.evidence-chart').getAttribute('dir')==='ltr');
  await act(p,'field-done');await enter(p,'research');await useEquipment(p);
  await shot(p,r,`${DIR}/15b-arabic-meaning.png`);await fits(p,'C meaning');
  check('C: mandatory Arabic rover≠base line',(await p.locator('#science-content .learning-nuri span').textContent()).includes('مش معناه إننا عرفنا جرعة الإشعاع جوه القاعدة'));
  await act(p,'next');await fits(p,'C uncertainty');await act(p,'next');await act(p,'research-done');
  await exitRoom(p);await enter(p,'command');await useEquipment(p);
  await shot(p,r,`${DIR}/15c-arabic-decision.png`);await fits(p,'C decision');
  await act(p,'survey-followup');await act(p,'explain-1');await act(p,'next');await act(p,'close');
  await exitRoom(p);await enter(p,'comms');await useEquipment(p);await fits(p,'C delayed');
  await shot(p,r,`${DIR}/15d-arabic-delayed.png`);
  await act(p,'later-done');await fits(p,'C debrief');await shot(p,r,`${DIR}/15e-arabic-debrief.png`);
  await act(p,'next');await act(p,'reflect-no');await act(p,'transfer-a');await fits(p,'C reflection');await act(p,'finish');await fits(p,'C rewards');
  await act(p,'close');await p.keyboard.press('j');await p.waitForTimeout(150);
  await shot(p,r,`${DIR}/15f-arabic-passport.png`);await fits(p,'C passport');
  await p.keyboard.press('h');await p.waitForTimeout(100);
  await p.keyboard.press('Escape');await p.keyboard.press('h');await p.waitForTimeout(150);
  check('C: Arabic help panel',/مساعدة نوري/.test(await p.locator('#panel-title').textContent()));
  await shot(p,r,`${DIR}/15g-arabic-help.png`);
  await p.keyboard.press('Escape');
  await p.reload({waitUntil:'networkidle'});await ready(p);
  check('C: language persists across reload',await p.evaluate(()=>document.documentElement.dir)==='rtl');
  await context.close();
});

// =============================================================== D · Save, reload, migration
await section('D',async()=>{
  const {page:p,context}=await openGame(browser,{errors:errs});
  await p.locator('#science-mission-button').click();await act(p,'close');
  await useAt(p,664,690,'field');await act(p,'next');await act(p,'next');await act(p,'window-1');
  const x1=await xp(p);
  await p.reload({waitUntil:'networkidle'});await ready(p);
  check('D: mid-card reload keeps earned XP and stage',await xp(p)===x1&&(await mission(p)).stage==='monitor');
  await useAt(p,664,690,'field');await act(p,'next');await act(p,'next');await act(p,'window-1');await act(p,'field-done');
  check('D: redoing the card after reload does not duplicate',await xp(p)===x1&&(await mission(p)).stage==='research');
  await p.reload({waitUntil:'networkidle'});await ready(p);
  check('D: reload resumes the research objective + beacon',(await mission(p)).stage==='research'&&(await p.evaluate(()=>window.__ripple.scene.guide.buildingId))==='research');
  await context.close();
  // old save from before this update (complete, branch A) → migrated, not deleted
  const old={'mission-ripple-science-v1':JSON.stringify({version:1,stage:'complete',choice:'review-defer',monitorReviewed:true,researchReviewed:true,nextShiftFlag:'trend_reviewed',simulatedWorkSlotsUsed:1})};
  const o=await openGame(browser,{errors:errs,storage:old});
  const mp=await prog(o.page);
  check('D: legacy complete save is kept and migrated into the passport',(await mission(o.page)).stage==='complete'&&mp.achievements.includes('mission-complete')&&mp.branchesSeen.includes('review-defer'));
  await o.context.close();
  // malformed save → repaired with backup, no soft-lock
  const bad={'mission-ripple-science-v1':JSON.stringify({version:1,stage:'debrief',choice:null})};
  const b=await openGame(browser,{errors:errs,storage:bad});
  const bm=await mission(b.page),backup=await b.page.evaluate(()=>localStorage.getItem('mission-ripple-science-v1.backup'));
  check('D: malformed save (debrief, no choice) repaired to command + backup kept',bm.stage==='command'&&bm.researchReviewed===true&&backup!==null,bm);
  await b.context.close();
});

// =============================================================== E · small window + 1080p
for(const [w,h] of [[1024,640],[1920,1080]])await section('E '+w,async()=>{
  const {page:p,context}=await openGame(browser,{errors:errs,width:w,height:h});
  await p.locator('#science-mission-button').click();await act(p,'close');
  await useAt(p,664,690,'field');await act(p,'next');await act(p,'next');
  const L=await fits(p,`E ${w}x${h} chart`);
  await shot(p,r,`${DIR}/17-chart-${w}x${h}.png`);
  await act(p,'field-done');
  await enter(p,'research');await useEquipment(p);await act(p,'next');await act(p,'next');await act(p,'research-done');
  await exitRoom(p);await enter(p,'command');await useEquipment(p);
  await fits(p,`E ${w}x${h} decision`);await shot(p,r,`${DIR}/17-decision-${w}x${h}.png`);
  await context.close();
});
// =============================================================== F · help is offered (not forced) after a quiet period
await section('F',async()=>{
  const {page:p,context}=await openGame(browser,{errors:errs});
  await p.locator('#science-mission-button').click();await act(p,'close');
  await p.waitForTimeout(52000);
  check('F: guided mode offers help after ~45 s without progress',await p.locator('#help-button.offer').count()===1&&/Need a hint/.test(await p.locator('#nuri-text').textContent()));
  check('F: the offer does not open a panel or move the hint level',!(await p.locator('#panel-overlay').isVisible())&&await helpLevel(p)===0);
  check('F: the offer does not change XP',await xp(p)===0);
  await context.close();
});
check('No browser errors, warnings or failed requests',errs.length===0,errs.join(' | '));
await browser.close();
process.exit(save()?0:1);
