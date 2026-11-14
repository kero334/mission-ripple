// Campaign QA: real Chrome playthroughs of missions 2–6 with real walking between buildings.
// Path A (all A choices) and path B (all B), Arabic, save/reload mid-campaign, small window.
import {launch,openGame,report,st,xp,prog,enter,exitRoom,useEquipment,layout,shot,ready} from './qa-lib.mjs';
const DIR='qa-screenshots/campaign';
const {r,check,save}=report(DIR);
const browser=await launch();
const errs=r.errors;
const roverDone={'mission-ripple-science-v1':JSON.stringify({version:1,stage:'complete',choice:'review-defer',monitorReviewed:true,researchReviewed:true,nextShiftFlag:'trend_reviewed',simulatedWorkSlotsUsed:1})};
async function section(name,f){try{await f()}catch(e){check(name+' section completed',false,e.message.split('\n')[0])}}
const C=p=>p.evaluate(()=>({s:window.__campaign.state(),active:window.__campaign.active(),open:window.__campaign.isOpen(),b:window.__campaign.step()?.building,card:window.__campaign.card()?.id,mission:window.__campaign.mission()?.id}));
const say=p=>p.locator('#campaign-content #science-say').textContent();
const click=async(p,a)=>{await p.locator(`#campaign-content [data-c-action="${a}"]`).first().click();await p.waitForTimeout(170)};
async function simple(p,name){const s=await p.evaluate(()=>{const c=document.querySelector('#campaign-content'),t=c.querySelector('#science-say').textContent;return {bubbles:c.querySelectorAll('.nuri-say').length,sentences:t.split(/(?<=[.!?؟])\s+/).filter(Boolean).length,primaries:c.querySelectorAll('.learning-next').length}});
  const L=await layout(p);check(`${name}: one idea, fits on screen`,s.bubbles===1&&s.sentences<=2&&s.primaries<=1&&L.scroll<=2&&L.buttonsInView,{...s,scroll:L.scroll})}
/** Walks to the current step's building, uses the machine, and plays every scene (quiz → right answer, choice → pick). */
async function playStep(p,pick,tag){
  const c=await C(p);if((await st(p)).room!==c.b){await exitRoom(p);await enter(p,c.b)}
  check(`${tag}: beacon on the machine inside ${c.b}`,(await p.evaluate(()=>window.__ripple.scene.guide.kind))==='equipment');
  await useEquipment(p);await p.waitForTimeout(250);
  check(`${tag}: E on the machine opens the mission scene`,(await C(p)).open);
  for(let g=0;g<14;g++){
    const cc=await C(p);if(!cc.open||cc.card==='campaign-end')break;const id=cc.card;
    await simple(p,`${tag} ${id}`);
    if(await p.locator('#campaign-content .big-choice').count()){await click(p,'choose-'+pick);continue}
    if(await p.locator('#campaign-content [data-c-action^="alloc-"]').count()){await click(p,'alloc-E');}
    else if(await p.locator('#campaign-content [data-c-action^="quiz-"]').count()){
      const n=await p.locator('#campaign-content [data-c-action^="quiz-"]').count();
      // try a wrong answer first when there is one, then the right one
      let right=-1;for(let i=n-1;i>=0;i--){await click(p,'quiz-'+i);if(await p.locator('#campaign-content .nuri-say.good').count()){right=i;break}}
      check(`${tag} ${id}: quiz has a right answer that earns praise`,right>=0);
    }
    const a=await p.locator('#campaign-content .learning-next').getAttribute('data-c-action');
    if(a==='finish'){await shot(p,r,`${DIR}/${tag}-${cc.mission}-lesson.png`)}
    await click(p,a);
  }
}
async function playCampaign(p,pick,tag){
  await p.locator('#campaign-start').click();await p.waitForTimeout(300);
  let c=await C(p);check(`${tag}: NEXT MISSION starts mission 2`,c.active&&c.mission==='M2-LOG');
  check(`${tag}: pretend meters appear in the HUD, all 3`,(await p.locator('.hud-meters b').allTextContents()).join(',')==='3,3,3,3');
  check(`${tag}: tracker shows the mission and where to go`,/Fix the Robot’s Notebook|كشكول/.test(await p.locator('#mission-title').textContent())&&(await p.locator('#objective-where').count())===1);
  for(let guard=0;guard<14;guard++){c=await C(p);if(!c.active)break;const before=c.s.index;await playStep(p,pick,tag);
    const after=await C(p);if(after.s.index>before){check(`${tag}: ${c.mission} complete, badge + XP awarded once`,(await prog(p)).awarded.filter(x=>x==='ev:mission-complete:'+c.mission).length===1);}}
  return C(p);
}

// =============================================================== Path A (+ screenshots, English)
await section('A',async()=>{
  const {page:p,context}=await openGame(browser,{errors:errs,storage:roverDone});
  check('A: after The Rover Reading the tracker offers NEXT MISSION and PLAY AGAIN',await p.locator('#campaign-start').isVisible()&&await p.locator('#science-mission-button').isVisible());
  await shot(p,r,`${DIR}/A-00-offer.png`);
  const x0=await xp(p);
  const end=await playCampaign(p,'A','A');
  check('A: final scene “every mission” shown',end.open&&end.card==='campaign-end');
  await shot(p,r,`${DIR}/A-99-campaign-end.png`);
  const s=end.s;check('A: all A choices + flags recorded',Object.values(s.choices).join('')==='AAAAA'&&['log_repair_planned','watch_prepared','plant_control_ready','route_recon_done','operations_plan_published'].every(f=>s.flags.includes(f)),s);
  check('A: pretend meters follow the written rules (power 3−1−1−1=0, food +1 later, air/water +1)',JSON.stringify(s.meters)===JSON.stringify({power:0,water:4,oxygen:4,food:4}),s.meters);
  check('A: Base Commander badge',(await prog(p)).achievements.includes('base-commander'));
  const gained=await xp(p)-x0;check('A: campaign XP earned',gained>=300,gained);
  await p.locator('#campaign-content [data-c-action="close"]').click();
  await p.reload({waitUntil:'networkidle'});await ready(p);
  check('A: reload keeps the finished campaign and XP',(await C(p)).s.index===5&&await xp(p)===x0+gained);
  await p.keyboard.press('j');await p.waitForTimeout(200);await p.locator('[data-panel-action="tab-missions"]').click();await p.waitForTimeout(150);
  check('A: Passport lists all 6 missions with choices',(await p.locator('.campaign-list li.done').count())===6);
  await shot(p,r,`${DIR}/A-passport-missions.png`);
  await context.close();
});
// =============================================================== Path B (delayed effects differ)
await section('B',async()=>{
  const {page:p,context}=await openGame(browser,{errors:errs,storage:roverDone});
  await p.locator('#campaign-start').click();await p.waitForTimeout(300);
  // play mission 2 with B and check that mission 3 starts with the B ripple
  await playStep(p,'B','B');await playStep(p,'B','B');
  const c=await C(p);check('B: mission 3 active',c.mission==='M3-SUN');
  await exitRoom(p);await enter(p,'comms');await useEquipment(p);await p.waitForTimeout(250);
  check('B: next mission opens with the delayed effect of the earlier choice',(await C(p)).card==='ripple'&&/still have marked gaps/.test(await say(p)));
  await shot(p,r,`${DIR}/B-ripple.png`);
  await p.locator('#campaign-close').click();await p.waitForTimeout(200);
  // save / reload mid-campaign
  await p.reload({waitUntil:'networkidle'});await ready(p);
  const c2=await C(p);check('B: reload mid-campaign resumes mission 3 step 1',c2.mission==='M3-SUN'&&c2.s.step===0&&c2.s.choices['M2-LOG']==='B');
  check('B: delayed effect is not applied twice after reload',c2.s.revealed.filter(x=>x==='M2-LOG').length===1);
  for(let g=0;g<10&&(await C(p)).active;g++)await playStep(p,'B','B');
  const s=(await C(p)).s;
  check('B: all B choices + flags recorded',Object.values(s.choices).join('')==='BBBBB'&&['partial_series','unresolved_alert','plant_comparison_missing','route_uncertainty','safe_early_termination'].every(f=>s.flags.includes(f)),s);
  check('B: pretend meters follow the rules (food +1 now, bump −1 later, pause +1)',JSON.stringify(s.meters)===JSON.stringify({power:3,water:4,oxygen:4,food:4}),s.meters);
  await context.close();
});
// =============================================================== Arabic + small window
await section('C',async()=>{
  const {page:p,context}=await openGame(browser,{errors:errs,storage:roverDone,width:1024,height:640});
  await p.keyboard.press('l');await p.waitForTimeout(250);
  await p.locator('#campaign-start').click();await p.waitForTimeout(300);
  check('C: Arabic campaign tracker',/كشكول الروبوت/.test(await p.locator('#mission-title').textContent()));
  await enter(p,'research');await useEquipment(p);await p.waitForTimeout(250);
  check('C: Arabic scene text',/كيوريوسيتي/.test(await say(p)));
  await click(p,'next');await shot(p,r,`${DIR}/C-ar-dupes-1024.png`);await simple(p,'C ar dupes 1024x640');
  await p.keyboard.press('h');await p.waitForTimeout(200);
  check('C: help over a campaign card shows one Nuri bubble',(await p.locator('.panel-help .nuri-say').count())===1);
  await p.keyboard.press('Escape');await p.waitForTimeout(150);
  check('C: Esc closes help first, campaign card stays',!(await p.locator('#panel-overlay').isVisible())&&(await C(p)).open);
  await context.close();
});
check('No browser errors or warnings',errs.length===0,errs.join(' | '));
await browser.close();
process.exit(save()?0:1);
