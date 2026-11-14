// Ripple Effect QA: real Chrome playthroughs of missions 2–6 with real walking, for paths that reach all three
// endings, recovery actions, the stuck-robot rescue, reloads mid-campaign, and Arabic.
// Every Chrome run is compared with the engine's own prediction (src/game/base-sim.ts), the same rules the
// unit tests use for all 64 main paths.
import {launch,openGame,report,st,xp,prog,enter,exitRoom,useEquipment,walkTo,ready,checkAborted} from './qa-lib.mjs';
import {mkdirSync} from 'node:fs';
const DIR='qa-screenshots/ripple';mkdirSync(DIR,{recursive:true});
const {r,check,save}=report(DIR);
const browser=await launch();const errs=r.errors;
const seed=m1=>({'mission-ripple-science-v1':JSON.stringify({version:1,stage:'complete',choice:m1==='study'?'review-defer':'survey-followup',monitorReviewed:true,researchReviewed:true,nextShiftFlag:m1==='study'?'trend_reviewed':'followup_reading_due',simulatedWorkSlotsUsed:1})});
const C=p=>p.evaluate(()=>({s:window.__campaign.state(),active:window.__campaign.active(),open:window.__campaign.isOpen(),b:window.__campaign.step()?.building,card:window.__campaign.card()?.id,mission:window.__campaign.mission()?.id,base:window.__campaign.base()}));
const click=async(p,a)=>{await p.locator(`#campaign-content [data-c-action="${a}"]`).first().click();await p.waitForTimeout(180)};
const has=(p,a)=>p.locator(`#campaign-content [data-c-action="${a}"]`).count();
const shotWorld=async(p,name,x,y)=>{await p.evaluate(([x,y])=>{const c=window.__ripple.scene.cameras.main;c.stopFollow();c.centerOn(x,y)},[x,y]);await p.waitForTimeout(500);await p.screenshot({path:`${DIR}/${name}.png`});r.screens.push(name);
  await p.evaluate(()=>{const s=window.__ripple.scene;s.cameras.main.startFollow(s.player,false,.09,.09,0,25)});await p.waitForTimeout(200)};
async function waitTour(p){await p.waitForFunction(()=>!window.__ripple.scene.showingMe&&!window.__ripple.scene.tour.length,null,{timeout:20000}).catch(()=>{})}
/** Walks to the current step's place, presses E, and plays every card with the given policy. */
async function playStep(p,pol,tag,seen){
  const c=await C(p);
  if(c.b==='rover'){await exitRoom(p);await walkTo(p,1188,1060,s=>s.nearestKind==='rover');check(`${tag}: robot reachable, prompt shows`,(await st(p)).nearestKind==='rover');await p.keyboard.press('e');await p.waitForTimeout(350)}
  else{if((await st(p)).room!==c.b){await exitRoom(p);await waitTour(p);await enter(p,c.b)}await useEquipment(p);await p.waitForTimeout(250)}
  check(`${tag} ${c.mission}/${c.b}: E opens the mission scene`,(await C(p)).open);
  for(let g=0;g<20;g++){
    const cc=await C(p);if(!cc.open||cc.card==='campaign-end')break;const id=cc.card;seen.push(cc.mission+':'+id);
    const L=await p.evaluate(()=>{const c=document.querySelector('#campaign-overlay:not(.hidden) .science-card');return c?c.scrollHeight-c.clientHeight:0});
    if(L>2)check(`${tag} ${id}: fits without scrolling`,false,L);
    if(id==='borrow'){await click(p,'lend-'+(pol.lend&&await has(p,'lend-'+pol.lend)?pol.lend:(await p.locator('#campaign-content [data-c-action^="lend-"]').first().getAttribute('data-c-action')).slice(5)));continue}
    if(id==='choose'){await click(p,'choose-'+pol.c[cc.s.index]);continue}
    if(id==='fix'&&await p.locator('#campaign-content [data-c-action^="fix-"]').count()){await p.screenshot({path:`${DIR}/${tag}-fix.png`});const f=pol.fix&&await has(p,'fix-'+pol.fix)?pol.fix:'keep';await click(p,'fix-'+f);pol.did=(pol.did||[]).concat('fix-'+f)}
    if(id==='rescue'&&await p.locator('#campaign-content [data-c-action^="rescue-"]').count()){await p.screenshot({path:`${DIR}/${tag}-rescue.png`});await click(p,'rescue-'+(pol.rescue?'help':'leave'));if(await C(p).then(x=>x.card==='borrow'))continue}
    if(id==='power'){await p.screenshot({path:`${DIR}/${tag}-power-check.png`});for(const k of pol.toggle||[])await click(p,'toggle-'+k)}
    if(await p.locator('#campaign-content [data-c-action^="quiz-"]').count()){const n=await p.locator('#campaign-content [data-c-action^="quiz-"]').count();for(let i=0;i<n;i++){await click(p,'quiz-'+i);if(await p.locator('#campaign-content .nuri-say.good').count())break}}
    if(['day','garden','ripple','m1','now'].includes(id)&&!seen.includes('shot:'+cc.mission+id)){seen.push('shot:'+cc.mission+id);await p.screenshot({path:`${DIR}/${tag}-${cc.mission}-${id}.png`})}
    const a=await p.locator('#campaign-content .learning-next').getAttribute('data-c-action').catch(()=>null);if(!a)break;await click(p,a);
    if(a==='finish'&&cc.s.index===4)break;
  }
}
async function playCampaign(name,m1,pol,expect,extra=async()=>{}){
  const {page:p,context}=await openGame(browser,{errors:errs,storage:seed(m1)});const seen=[],tag=name;
  await p.locator('#campaign-start').click();await p.waitForTimeout(400);
  check(`${tag}: base view appears in the world (greenhouse lamps, robot, HUD blocks)`,await p.evaluate(()=>window.__ripple.scene.baseView?.active===true)&&(await p.locator('.hud-meters .power-strip .blk').count())===3);
  const x0=await xp(p);
  for(let guard=0;guard<16;guard++){const c=await C(p);if(!c.active)break;const before=c.s.index;await playStep(p,pol,tag,seen);
    const after=await C(p);if(after.s.index>before&&after.s.index<5){check(`${tag}: ${c.mission} complete, badge + XP once`,(await prog(p)).awarded.filter(x=>x==='ev:mission-complete:'+c.mission).length===1);await extra(p,after,seen)}
    if(after.s.index>=5)break}
  // ---- ending cinematic
  await p.waitForFunction(()=>window.__ending?.playing===true,null,{timeout:8000}).catch(()=>{});
  const kind=await p.evaluate(()=>window.__ending?.kind);
  check(`${tag}: ending is "${expect}" (engine prediction)`,kind===expect,kind);
  check(`${tag}: HUD hidden and Skip visible during the ending`,await p.locator('#ending-skip').isVisible()&&await p.evaluate(()=>getComputedStyle(document.getElementById('mission-panel')).visibility==='hidden'));
  for(const [t,n] of [[1800,'a'],[5200,'b'],[9600,'c'],[12600,'d']]){await p.waitForTimeout(t-(n==='a'?0:[1800,5200,9600,12600][['a','b','c','d'].indexOf(n)-1]));await p.screenshot({path:`${DIR}/${tag}-ending-${n}.png`})}
  await p.waitForFunction(()=>window.__campaign.card()?.id==='campaign-end',null,{timeout:12000}).catch(()=>{});
  check(`${tag}: ending plays to the end, then the recap card opens`,(await C(p)).card==='campaign-end');
  const recap=await p.evaluate(()=>({title:document.querySelector('.end-head strong')?.textContent,tl:document.querySelectorAll('#campaign-content .timeline .tl').length,why:[...document.querySelectorAll('#campaign-content .why-list li')].map(l=>l.textContent)}));
  check(`${tag}: recap timeline shows every decision and day (≥ 10 cards) and explains why`,recap.tl>=10&&recap.why.length>=1,recap);
  await p.waitForTimeout(1600);await p.screenshot({path:`${DIR}/${tag}-recap.png`});
  const gained=await xp(p)-x0;check(`${tag}: XP earned for the campaign`,gained>=300,gained);
  const fin=await C(p);
  await p.locator('#campaign-close').click();await p.waitForTimeout(200);
  await p.reload({waitUntil:'networkidle'});await ready(p);
  const re=await C(p);check(`${tag}: reload keeps the ending, decisions and base`,re.s.ending===expect&&JSON.stringify(re.base)===JSON.stringify(fin.base));
  await shotWorld(p,`${tag}-world-final`,860,520);
  // replay ending from the tracker, and skip it
  await p.locator('#campaign-button2').click();await p.waitForTimeout(300);
  check(`${tag}: tracker offers WATCH THE ENDING AGAIN (opens recap)`,(await C(p)).card==='campaign-end');
  await click(p,'replay-ending');await p.waitForFunction(()=>window.__ending?.playing===true,null,{timeout:5000});await p.waitForTimeout(800);
  await p.locator('#ending-skip').click();await p.waitForFunction(()=>window.__campaign.card()?.id==='campaign-end',null,{timeout:5000}).catch(()=>{});
  check(`${tag}: ending is replayable and skippable`,(await C(p)).card==='campaign-end'&&!(await p.evaluate(()=>window.__ending.playing)));
  await context.close();return {seen,recap,base:fin.base};
}
async function section(n,f){try{await f()}catch(e){check(n+' section completed',false,e.message.split('\n')[0])}}

// R1: careful science (all A), no recovery → the dim greenhouse ends in a setback
await section('R1',async()=>{const res=await playCampaign('R1-setback','study',{c:'AAAAA'},'setback',async(p,c)=>{
  if(c.mission==='M4-PLANTS'){await exitRoom(p);await waitTour(p);const b=c.base;check('R1: earlier choices dimmed the greenhouse (lamp 2 off, caused by the watch screen)',b.power.lamp2===false&&b.lampCause==='watch'&&b.plants===1,b);
    check('R1: the world shows it: greenhouse tinted, lamp sprite off, plants weak',await p.evaluate(()=>{const s=window.__ripple.scene;return s.bSprites.greenhouse?.isTinted&&s.rippleObjs.some(o=>o.texture?.key==='ripple-lamp-off')&&s.rippleObjs.some(o=>o.texture?.key==='ripple-plants-1')}));
    await shotWorld(p,'R1-world-dim-greenhouse',840,480)}});
  check('R1: a new day shrank the plants and the fix offer appeared',res.seen.includes('M4-PLANTS:day')&&res.seen.includes('M4-PLANTS:fix'));
  check('R1: Mission 1 is remembered at the start of Mission 2',res.seen.includes('M2-LOG:m1'))});
// R2: same plan choices, but the player moves power back to the lamp → the base thrives
await section('R2',async()=>{const res=await playCampaign('R2-recovered','study',{c:'AAAAA',fix:'watch'},'thrive',async(p,c)=>{
  if(c.mission==='M5-POWER'){check('R2: the recovery turned the lamp back on (watch screen off)',c.base.power.lamp2&&!c.base.power.watch);await waitTour(p)}});
  check('R2: same choices as R1, different ending because of recovery',res.base.plants>=3)});
// R3: Short route with a rested robot → it gets stuck; rescue it → thrives
await section('R3',async()=>{const res=await playCampaign('R3-rescue','study',{c:'BAABA',rescue:true},'thrive',async(p,c)=>{
  if(c.mission==='M6-PLAN'&&c.s.step===0){await exitRoom(p);await waitTour(p);check('R3: the robot is stuck in the world, with a repair bubble, and the tracker sends you there',c.base.rover==='stuck'&&c.b==='rover'&&await p.evaluate(()=>window.__ripple.scene.rippleObjs.some(o=>o.texture?.key==='ripple-rover-stuck')));
    await shotWorld(p,'R3-world-robot-stuck',1150,1000)}});
  check('R3: rescue card was played',res.seen.includes('M6-PLAN:rescue'))});
// R4: leave the robot, keep many problems open → the mission continues
await section('R4',async()=>{await playCampaign('R4-continue','study',{c:'BBABA'},'continue')});
// R5: Mission 1 "Go and check again" → same Short route, but the robot already knows the road (no rescue step)
await section('R5',async()=>{const res=await playCampaign('R5-trip','trip',{c:'BBABA'},'thrive');
  check('R5: Mission 1 changed Mission 6 — no stuck robot, no rescue step',!res.seen.some(x=>x.includes('rescue'))&&res.base.rover==='home')});
// R6: reload in the middle (after the lamp turned off) + Arabic + small window
await section('R6',async()=>{const {page:p,context}=await openGame(browser,{errors:errs,storage:seed('study'),width:1024,height:640});
  await p.keyboard.press('l');await p.waitForTimeout(250);await p.locator('#campaign-start').click();await p.waitForTimeout(300);const seen=[];
  for(let i=0;i<4;i++)await playStep(p,{c:'AAAAA'},'R6',seen); // M2 (2 steps) + M3 (2 steps)
  const before=await C(p);check('R6: after Mission 3 the lamp is off',before.base.power.lamp2===false);
  await p.reload({waitUntil:'networkidle'});await ready(p);const after=await C(p);
  check('R6: reload mid-campaign keeps the base, the mission and the step',JSON.stringify(after.base)===JSON.stringify(before.base)&&after.mission==='M4-PLANTS');
  await playStep(p,{c:'AAAAA',fix:'watch'},'R6',seen);
  check('R6: Arabic day card + fix shown',seen.includes('M4-PLANTS:day')&&seen.includes('M4-PLANTS:fix'));
  check('R6: delayed day effect not applied twice after reload',(await C(p)).s.events.filter(e=>e.t==='day').length===1);
  await context.close()});
const abortedMedia=await checkAborted(errs);console.log('expected media cancellations (verified files exist):',abortedMedia);
check('No browser errors or warnings',errs.length===0,errs.join(' | '));
await browser.close();process.exit(save()?0:1);
