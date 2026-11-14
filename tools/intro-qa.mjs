// Opening cinematic QA (real Chrome). Captures frames, tests skip / continue / replay / reduced motion / mobile / Arabic.
// Run with the dev server up:  node tools/intro-qa.mjs   → qa-screenshots/intro/
import {launch,report,URL,st,ready} from './qa-lib.mjs';
const DIR='qa-screenshots/intro';
const {r,check,save}=report(DIR);
const browser=await launch();
async function fresh(opts={}){
  const context=await browser.newContext({viewport:{width:opts.w||1280,height:opts.h||720},reducedMotion:opts.rm?'reduce':'no-preference',hasTouch:!!opts.touch,isMobile:!!opts.touch});
  if(opts.storage)await context.addInitScript(s=>{if(!sessionStorage.getItem('__s')){for(const [k,v] of Object.entries(s))localStorage.setItem(k,v);sessionStorage.setItem('__s','1')}},opts.storage);
  const page=await context.newPage();
  page.on('pageerror',e=>r.errors.push('pageerror: '+e.message));page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')r.errors.push(m.type()+': '+m.text())});
  await page.goto(URL,{waitUntil:'networkidle'});await page.waitForFunction(()=>Boolean(window.__title&&window.__ripple?.scene?.player));await page.waitForTimeout(300);
  return {context,page};
}
const shotAt=async(p,t0,sec,name)=>{const wait=t0+sec*1000-Date.now();if(wait>0)await p.waitForTimeout(wait);const cap=await p.locator('#intro-caption').textContent();await p.screenshot({path:`${DIR}/${name}.png`});r.screens.push(`${DIR}/${name}.png`);return cap};
const playing=p=>p.evaluate(()=>window.__intro?.playing===true);
const canMove=async p=>{const a=(await st(p)).position;await p.keyboard.down('d');await p.waitForTimeout(350);await p.keyboard.up('d');return (await st(p)).position.x!==a.x};

// ---------------- 1. full playback, English
{
  const {page:p,context}=await fresh();
  check('Fresh start shows the title screen with START GAME',await p.locator('#title-start').isVisible()&&!(await p.locator('#title-continue').count()));
  check('No sound before the player presses Start',await p.evaluate(()=>!window.__introSound?.ctx));
  check('World is paused under the title',(await st(p)).paused);
  await p.screenshot({path:`${DIR}/00-title.png`});r.screens.push(`${DIR}/00-title.png`);
  await p.evaluate(()=>{window.__caps=[];window.addEventListener('ripple-intro-caption',e=>{if(e.detail.key)window.__caps.push(e.detail.key)})});
  await p.locator('#title-start').click();const t0=Date.now();
  await p.waitForTimeout(150);
  check('Start creates the audio context inside the click',await p.evaluate(()=>!!window.__introSound?.ctx));
  check('Cinematic is playing; Skip Intro visible',await playing(p)&&await p.locator('#intro-skip').isVisible());
  check('HUD hidden during the cinematic',await p.evaluate(()=>getComputedStyle(document.getElementById('mission-panel')).visibility==='hidden'));
  const caps={};
  for(const [sec,name] of [[1.6,'01-dream'],[4.0,'02-dream-close'],[5.2,'03-stars-swirl'],[6.3,'04-astronaut'],[7.8,'05-helmet-mars'],[9.0,'06-launchpad'],[10.4,'07-ignition'],[12.8,'08-liftoff'],[15.4,'09-journey-days'],[18.4,'10-journey-months'],[20.9,'11-hatch-open'],[22.0,'12-boot-lift'],[22.9,'13-first-step'],[25.6,'14-settlement-reveal']])caps[name]=await shotAt(p,t0,sec,name);
  const order=await p.evaluate(()=>window.__caps.join(','));
  check('Captions tell the story in order (dream → years → future → days → weeks → months → Mars)',order==='dream,years,future,days,weeks,months,mars',order);
  await p.waitForFunction(()=>window.__intro?.playing===false,null,{timeout:12000});
  await p.waitForTimeout(500);await p.screenshot({path:`${DIR}/15-camera-rising.png`});r.screens.push(`${DIR}/15-camera-rising.png`);
  await p.waitForFunction(()=>window.__title.state()==='play',null,{timeout:8000});const total=(Date.now()-t0)/1000;
  check('Full sequence ≈ 30 s and ends in the real world',total>27&&total<36,total.toFixed(1)+'s');
  await p.waitForTimeout(300);await p.screenshot({path:`${DIR}/16-gameplay-begins.png`});r.screens.push(`${DIR}/16-gameplay-begins.png`);
  check('Nuri says “Welcome to Mars, Explorer!”',(await p.locator('#nuri-text').textContent())==='Welcome to Mars, Explorer!');
  check('Camera back at the normal top-down zoom, following the player',await p.evaluate(()=>window.__ripple.scene.cameras.main.zoom===1.6&&!!window.__ripple.scene.cameras.main._follow));
  check('Nuri is next to the astronaut',await p.evaluate(()=>{const s=window.__ripple.scene;return Math.abs(s.nuri.x-s.player.x)<60&&s.nuri.alpha===1}));
  check('Player has control after the cinematic',!(await st(p)).paused&&await canMove(p));
  check('Mission untouched (ready); HUD visible again',(await p.evaluate(()=>window.__mission.getState().stage))==='ready'&&await p.evaluate(()=>getComputedStyle(document.getElementById('mission-panel')).visibility==='visible'));
  // replay from Settings
  await p.keyboard.press('Escape');await p.waitForTimeout(150);
  await p.locator('[data-panel-action="replay-intro"]').click();await p.waitForTimeout(400);
  check('Replay Cinematic from Settings plays it again',await playing(p));
  await p.waitForTimeout(1200);await p.locator('#intro-skip').click();
  await p.waitForFunction(()=>window.__title.state()==='play',null,{timeout:8000});
  check('Skip after replay returns control',await canMove(p));
  // reload: saved game → CONTINUE, no forced intro
  await p.reload({waitUntil:'networkidle'});await p.waitForFunction(()=>Boolean(window.__title));await p.waitForTimeout(300);
  check('After the intro was seen: CONTINUE + WATCH INTRO, no START',await p.locator('#title-continue').isVisible()&&await p.locator('#title-watch').isVisible()&&!(await p.locator('#title-start').count()));
  await p.locator('#title-continue').click();await p.waitForTimeout(300);
  check('CONTINUE goes straight to gameplay (no cinematic)',!(await playing(p))&&(await p.evaluate(()=>window.__title.state()))==='play'&&await canMove(p));
  await context.close();
}
// ---------------- 2. skip at different moments (button and keyboard)
for(const [sec,how] of [[0.5,'button'],[11,'Escape'],[21.5,'Enter']]){
  const {page:p,context}=await fresh();
  await p.locator('#title-start').click();await p.waitForTimeout(sec*1000);
  if(how==='button')await p.locator('#intro-skip').click();else await p.keyboard.press(how);
  await p.waitForFunction(()=>window.__title.state()==='play',null,{timeout:8000}).catch(()=>{});
  const ok=(await p.evaluate(()=>window.__title.state()))==='play';
  check(`Skip at ${sec}s with ${how} → gameplay, control works, settings not opened`,ok&&await canMove(p)&&!(await p.locator('#panel-overlay').isVisible())&&(await p.evaluate(()=>window.__intro.skipped))===true);
  await context.close();
}
// ---------------- 3. returning player save (no intro forced even without the flag)
{
  const save={'mission-ripple-science-v1':JSON.stringify({version:1,stage:'research',choice:null,monitorReviewed:true,researchReviewed:false,nextShiftFlag:null,simulatedWorkSlotsUsed:0})};
  const {page:p,context}=await fresh({storage:save});
  check('Saved mission in progress → CONTINUE offered, cinematic not forced',await p.locator('#title-continue').isVisible()&&!(await p.locator('#title-start').count()));
  await p.locator('#title-continue').click();await p.waitForTimeout(300);
  check('Continue keeps the saved stage',(await p.evaluate(()=>window.__mission.getState().stage))==='research');
  await context.close();
}
// ---------------- 4. reduced motion
{
  const {page:p,context}=await fresh({rm:true});
  await p.locator('#title-start').click();const t0=Date.now();
  await p.waitForTimeout(300);
  check('Reduced motion is detected',await p.evaluate(()=>window.__intro.reducedMotion===true));
  await shotAt(p,t0,7,'rm-launch');
  await p.waitForFunction(()=>window.__title.state()==='play',null,{timeout:30000});
  const total=(Date.now()-t0)/1000;
  check('Reduced-motion version is shorter (no shakes or camera flights)',total<20,total.toFixed(1)+'s');
  check('Reduced motion arrival goes straight to the normal view',await p.evaluate(()=>window.__ripple.scene.cameras.main.zoom===1.6));
  await context.close();
}
// ---------------- 5. Arabic + sound off
{
  const {page:p,context}=await fresh();
  await p.locator('#title-lang').click();await p.waitForTimeout(150);
  check('Title screen in Arabic (RTL)',(await p.locator('#title-start').textContent())==='ابدأ اللعب'&&await p.evaluate(()=>document.documentElement.dir)==='rtl');
  await p.screenshot({path:`${DIR}/ar-00-title.png`});r.screens.push(`${DIR}/ar-00-title.png`);
  await p.locator('#title-sound').click();await p.waitForTimeout(100);
  check('Sound can be turned off before starting',(await p.evaluate(()=>window.__progress.get().settings.sound))===false);
  await p.locator('#title-start').click();const t0=Date.now();
  const c=await shotAt(p,t0,1.6,'ar-01-dream');
  check('Arabic caption',c==='كل مستكشف بيبدأ بحلم…',c);
  check('Sound off → no audio context created',await p.evaluate(()=>!window.__introSound?.ctx));
  await shotAt(p,t0,18.4,'ar-10-months');
  check('Arabic skip button',(await p.locator('#intro-skip').textContent())==='تخطّي المقدمة');
  await p.locator('#intro-skip').click();await p.waitForFunction(()=>window.__title.state()==='play',null,{timeout:8000});
  check('Arabic welcome line',(await p.locator('#nuri-text').textContent())==='أهلًا بيك على المريخ يا مستكشف!');
  await context.close();
}
// ---------------- 6. mobile sizes
for(const [w,h,name] of [[390,844,'mobile-portrait'],[844,390,'mobile-landscape']]){
  const {page:p,context}=await fresh({w,h,touch:true});
  await p.screenshot({path:`${DIR}/${name}-title.png`});r.screens.push(`${DIR}/${name}-title.png`);
  const b=await p.locator('#title-start').boundingBox();
  check(`${name}: START GAME fully on screen`,!!b&&b.y>=0&&b.y+b.height<=h&&b.x>=0&&b.x+b.width<=w);
  await p.locator('#title-start').tap();const t0=Date.now();
  await shotAt(p,t0,9.6,`${name}-launch`);
  const s=await p.locator('#intro-skip').boundingBox();
  check(`${name}: Skip Intro on screen and ≥44 px tall`,!!s&&s.y>=0&&s.y+s.height<=h&&s.height>=44);
  await p.locator('#intro-skip').tap();await p.waitForFunction(()=>window.__title.state()==='play',null,{timeout:8000}).catch(()=>{});
  check(`${name}: returns to the game`,(await p.evaluate(()=>window.__title.state()))==='play');
  await context.close();
}
check('No browser errors or warnings',r.errors.length===0,r.errors.join(' | '));
await browser.close();
process.exit(save()?0:1);
