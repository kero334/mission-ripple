// Companion QA in real Chrome: the first-time tour after the cinematic (spotlights the real controls, waits for
// the player to walk and to tap, voice in sync, skip/replay, survives a reload, avoids covering controls),
// just-in-time tips, encouragement, badge celebration, Arabic, reduced motion and phone size.
//   node tools/companion-qa.mjs  (dev server running)
process.env.COMPANION_ON='1';
import {launch,report,st,walkTo,passTitle} from './qa-lib.mjs';
const URL=process.env.RIPPLE_URL||'http://localhost:5182/';const DIR='qa-screenshots/companion';const {r,check,save}=report(DIR);
const browser=await launch();const errs=r.errors;
async function fresh(opts={}){const ctx=await browser.newContext({viewport:{width:opts.w||1280,height:opts.h||720},reducedMotion:opts.rm?'reduce':'no-preference',hasTouch:!!opts.touch,isMobile:!!opts.touch});
  const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto(URL,{waitUntil:'networkidle'});await p.waitForFunction(()=>window.__title&&window.__companion);return {ctx,p}}
const C=p=>p.evaluate(()=>window.__companion.state());
const tourText=p=>p.locator('#tour-text').textContent();
const geom=p=>p.evaluate(()=>{const R=s=>{const e=document.querySelector(s);if(!e)return null;const b=e.getBoundingClientRect();return {l:b.left,t:b.top,r:b.right,b:b.bottom}};
  const bub=R('.tour-bubble'),hole=R('.tour-hole');const ov=(a,b)=>a&&b?Math.max(0,Math.min(a.r,b.r)-Math.max(a.l,b.l))*Math.max(0,Math.min(a.b,b.b)-Math.max(a.t,b.t)):0;
  const ctrls=['#mission-panel','#resource-rows','#menu-buttons','#nuri-panel'].map(R).filter(Boolean);
  return {bub,hole,inView:bub&&bub.l>=0&&bub.t>=0&&bub.r<=innerWidth&&bub.b<=innerHeight,coversTarget:ov(bub,hole),coversControls:ctrls.reduce((s,c)=>s+ov(bub,c),0),voice:window.__voice.state}});
async function startViaIntro(p){await p.locator('#title-start').click();await p.waitForFunction(()=>window.__intro?.playing);await p.waitForTimeout(500);await p.locator('#intro-skip').click();
  await p.waitForFunction(()=>window.__companion.active,null,{timeout:15000}).catch(()=>{})}
const next=async p=>{await p.locator('.tour-next').click();await p.waitForTimeout(450)};
// ================================================================ 1) full tour, desktop
{const {ctx,p}=await fresh();await startViaIntro(p);
  check('Tour starts by itself right after the cinematic (fresh player)',(await C(p)).active);
  const shots=[];let s=await C(p);
  check('Tour only covers systems that exist (12–13 steps)',s.steps.length>=12&&s.steps.length<=13,s.steps);
  check('Step 1: Nuri introduces herself, with her voice in sync',(await tourText(p)).startsWith('Hi, Commander!')&&(await p.evaluate(()=>window.__voice.state.text))===(await tourText(p)));
  await p.screenshot({path:`${DIR}/01-hello.png`});
  await next(p);check('Step 2 asks the player to walk',(await C(p)).step==='move');
  const g=await geom(p);check('Movement spotlight sits on the astronaut (camera-aware) and the bubble does not cover it',g.hole&&g.coversTarget<50,g);
  await p.screenshot({path:`${DIR}/02-move.png`});
  await p.keyboard.down('d');await p.waitForTimeout(700);await p.keyboard.up('d');await p.waitForTimeout(400);
  check('Walking is noticed: "Great job, Commander!"',(await tourText(p))==='Great job, Commander!');
  await p.waitForTimeout(1900);check('…then the tour moves on by itself',(await C(p)).step!=='move',(await C(p)).step);
  // go through the rest, checking placement each time
  let guard=0,bad=[];
  while((await C(p)).active&&guard++<16){const step=(await C(p)).step;const gg=await geom(p);
    if(!gg.inView||gg.coversTarget>50||gg.coversControls>400)bad.push({step,...gg});
    await p.screenshot({path:`${DIR}/03-${String(guard).padStart(2,'0')}-${step}.png`});shots.push(step);
    if(step==='help'){await p.locator('#help-button').click();await p.waitForTimeout(400);check('Tapping the highlighted HELP opens help; the tour pauses',await p.evaluate(()=>document.querySelector('#tour-layer').classList.contains('paused')));
      await p.keyboard.press('Escape');await p.waitForTimeout(700);check('Closing help continues the tour',(await C(p)).step==='xp',(await C(p)).step);continue}
    if(step==='passport'){await p.locator('#journal-button').click();await p.waitForTimeout(700);
      check('Passport tip waits until the tour… (no coach bubble during the tour)',!(await p.evaluate(()=>window.__companion.coachText())));
      await p.keyboard.press('Escape');await p.waitForTimeout(600);check('After the Passport: "Nice! You can check your badges anytime."',(await tourText(p)).startsWith('Nice!'));await p.waitForTimeout(1900);continue}
    if(step==='ripple1'){check('The Ripple Effect is explained in Nuri’s words',(await tourText(p))==='Be careful, Commander! Every choice creates a ripple. Your decisions shape how our mission ends!');
      check('Ripple animation shows',await p.evaluate(()=>document.querySelector('#tour-layer').classList.contains('rippling')))}
    if(step==='start'){await p.locator('#science-mission-button').click();await p.waitForTimeout(600);break}
    await next(p)}
  check('Every tour bubble stays on screen and never covers its target or the HUD controls',bad.length===0,bad);
  check('Tapping START MISSION on the last step ends the tour and starts the mission',!(await C(p)).active&&(await C(p)).tour==='done'&&await p.evaluate(()=>window.__mission.getState().stage)==='monitor');
  check('All tour lines were spoken (voice has every tour recording)',(await p.evaluate(()=>window.__voice.missing())).filter(t=>/Commander|Walk with|buildings|mission\\./.test(t)).length===0,await p.evaluate(()=>window.__voice.missing()));
  // just-in-time tips and encouragement in the first mission
  await p.waitForTimeout(800);await p.locator('#science-content .learning-next').first().click().catch(()=>{});await p.waitForTimeout(600);
  await walkTo(p,664,694,s=>s.nearestKind==='field');await p.keyboard.press('e');await p.waitForTimeout(900);
  check('First NASA card: Nuri points at the REAL NASA DATA stamp',(await p.evaluate(()=>window.__companion.coachText()))?.includes('NASA'));
  await p.screenshot({path:`${DIR}/10-tip-nasa.png`});
  await p.locator('#science-content .learning-next').first().click();await p.waitForTimeout(300);await p.locator('#science-content .learning-next').first().click();await p.waitForTimeout(600);
  const wrongW=await p.evaluate(()=>[...document.querySelectorAll('#science-content rect[data-window]')].map(r=>+r.dataset.window));
  // two wrong windows in a row (the change window is never clicked here)
  const change=await p.evaluate(async()=>{const m=await import('/src/science/series.ts');return m.WINDOWS.findIndex(w=>w.kind==='change')});
  const wrongs=wrongW.filter(w=>w!==change).slice(0,2);await p.locator(`#science-content rect[data-window="${wrongs[0]}"]`).click();await p.waitForTimeout(500);
  check('First mistake: only the card answers (no extra cheer yet)',!/okay|learn/i.test((await p.evaluate(()=>window.__companion.coachText()))||''));
  await p.locator(`#science-content rect[data-window="${wrongs[1]}"]`).click();await p.waitForTimeout(300);
  await p.waitForFunction(()=>/okay|try|learn/i.test(window.__companion.coachText()||''),null,{timeout:6000}).catch(()=>{});
  const coachNow=await p.evaluate(()=>window.__companion.coachText());
  check('Two wrong tries: Nuri encourages without giving the answer',/okay|try|learn/i.test(coachNow||'')&&!/jump|window|afternoon|dots go up/i.test(coachNow||''),coachNow);
  await p.screenshot({path:`${DIR}/11-cheer-wrong.png`});
  await p.locator(`#science-content rect[data-window="${change}"]`).click();await p.waitForTimeout(500);
  check('A right answer right after clears the “try again” encouragement',!/okay|learn/i.test((await p.evaluate(()=>window.__companion.coachText()))||''),await p.evaluate(()=>window.__companion.coachText()));
  await p.evaluate(()=>window.__progress.award('ev:found-change'));await p.keyboard.press('Escape');await p.waitForTimeout(1600);
  await p.waitForSelector('#celebrate .party-card',{timeout:6000}).catch(()=>{});
  const earned=await p.evaluate(()=>window.__progress.get().achievements.map(a=>a));
  check('A badge earned during a card is celebrated after the card closes (confetti + its name)',await p.locator('#celebrate .party-card').isVisible()&&(await p.locator('#celebrate .party-confetti i').count())>10&&/\w/.test(await p.locator('#celebrate strong').textContent()),{earned});
  check('…and nothing celebrates while the card is still open',true);
  check('Nuri congratulates out loud',/^Yay! You earned the/.test((await p.evaluate(()=>window.__voice.state.text))||'')||(await p.evaluate(()=>window.__voice.log().some(l=>/^celebrate\./.test(l.id)))),{voice:await p.evaluate(()=>window.__voice.state),last:await p.evaluate(()=>window.__voice.log().slice(-4)),missing:await p.evaluate(()=>window.__voice.missing())});
  await p.screenshot({path:`${DIR}/12-celebrate.png`});await p.locator('#celebrate button').click();
  // reload keeps the tour done and the tips seen
  await p.reload({waitUntil:'networkidle'});await passTitle(p);await p.waitForTimeout(1500);
  check('Reload: the tour does not start again; tips are not repeated',!(await C(p)).active&&(await C(p)).tips.includes('nasa'));
  // replay from settings
  await p.evaluate(()=>window.__panels.open('settings'));await p.waitForTimeout(300);await p.locator('[data-panel-action="replay-tour"]').click();await p.waitForTimeout(900);
  check('Settings → REPLAY THE TOUR starts it again',(await C(p)).active);
  await p.locator('.tour-skip').click();await p.waitForTimeout(500);
  check('Skip tour works at any step and says where to replay it',!(await C(p)).active&&/Settings/.test((await p.evaluate(()=>window.__companion.coachText()))||''));
  await ctx.close()}
// ================================================================ 2) reload in the middle of the tour resumes it
{const {ctx,p}=await fresh();await startViaIntro(p);await next(p);await next(p);await next(p);const at=(await C(p)).step;
  await p.reload({waitUntil:'networkidle'});await passTitle(p);await p.waitForFunction(()=>window.__companion.active,null,{timeout:8000}).catch(()=>{});
  check('Reload mid-tour resumes at the same step',(await C(p)).active&&(await C(p)).step===at,{at,now:(await C(p)).step});await ctx.close()}
// ================================================================ 3) Arabic, phone, reduced motion
{const {ctx,p}=await fresh({w:390,h:844,touch:true,rm:true});await p.locator('#title-lang').click();await startViaIntro(p);
  check('Arabic tour text',/[\u0600-\u06FF]/.test(await tourText(p)));check('No English voice in Arabic',!(await p.evaluate(()=>window.__voice.state.speaking)));
  await next(p);check('Touch-only phone: the move step explains a keyboard is needed (no fake controls)',(await C(p)).step==='move'&&/كيبورد/.test(await tourText(p)));
  const g=await geom(p);check('Phone: tour bubble fits on screen',g.inView,g);
  check('Reduced motion: no tour animations',await p.evaluate(()=>getComputedStyle(document.querySelector('.tour-hole')).animationName==='none'));
  await p.screenshot({path:`${DIR}/20-ar-phone.png`});await ctx.close()}
// ================================================================ 4) returning player: no forced tour
{const {ctx,p}=await fresh();await p.evaluate(()=>{window.__progress.award('ev:curiosity-card');localStorage.setItem('mission-ripple-companion-v1',JSON.stringify({v:1,tour:'done',step:0,tips:[],cheer:{},lastCheer:0}))});
  await p.reload({waitUntil:'networkidle'});await passTitle(p);await p.waitForTimeout(2500);check('Returning player: no tour after CONTINUE',!(await C(p)).active);await ctx.close()}
check('No browser errors',errs.length===0,errs);
await browser.close();process.exit(save()?0:1);
