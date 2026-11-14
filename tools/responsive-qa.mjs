// Responsive layout QA: real Chrome at several window sizes. For each size it screenshots the title screen,
// the cinematic, exploration, a room, mission and campaign cards and the panels, and measures clipping,
// overflow and HUD overlaps. Usage: node tools/responsive-qa.mjs [outDir] [WxH,WxH...]
import {launch,report,passTitle} from './qa-lib.mjs';
const URL=process.env.RIPPLE_URL||'http://localhost:5182/';
const DIR=process.argv[2]||'qa-screenshots/responsive';
const SIZES=(process.argv[3]||'1366x768,1920x1080,1024x640,390x844').split(',').map(s=>s.split('x').map(Number));
const {r,check,save}=report(DIR);
const browser=await launch();
const roverDone={'mission-ripple-science-v1':JSON.stringify({version:1,stage:'complete',choice:'review-defer',monitorReviewed:true,researchReviewed:true,nextShiftFlag:'trend_reviewed',simulatedWorkSlotsUsed:1})};

/** Visible elements that must sit fully inside the window, must not overlap each other, and must not clip their text. */
const measure=(p,sels)=>p.evaluate(sels=>{
  const W=innerWidth,H=innerHeight,out=[],boxes=[];
  for(const sel of sels){for(const el of document.querySelectorAll(sel)){
    const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden'||el.closest('.hidden'))continue;
    const b=el.getBoundingClientRect();if(b.width<2||b.height<2)continue;
    const clip=el.scrollHeight-el.clientHeight>2&&cs.overflowY!=='visible'||el.scrollWidth-el.clientWidth>2&&cs.overflowX!=='visible';
    const off=b.left<-1||b.top<-1||b.right>W+1||b.bottom>H+1;
    out.push({sel,off,clip,box:[Math.round(b.left),Math.round(b.top),Math.round(b.right),Math.round(b.bottom)]});boxes.push({sel,b});
  }}
  const overlaps=[];for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i].b,c=boxes[j].b;
    const ix=Math.min(a.right,c.right)-Math.max(a.left,c.left),iy=Math.min(a.bottom,c.bottom)-Math.max(a.top,c.top);
    if(ix>3&&iy>3&&!document.querySelector(boxes[i].sel)?.contains(document.querySelector(boxes[j].sel)))overlaps.push(boxes[i].sel+' × '+boxes[j].sel)}
  const cv=document.querySelector('#game canvas').getBoundingClientRect();
  return {items:out,overlaps,canvas:[Math.round(cv.width),Math.round(cv.height)],cover:Math.round(cv.width*cv.height/(W*H)*100)}},sels);
const HUD=['#mission-panel','#resource-rows','#nuri-panel','#menu-buttons','#prompt','#move-hint','#toasts .toast'];
const CARD=['#science-overlay .science-card','#campaign-overlay .science-card','#panel-overlay .panel-card'];
const cardOk=async(p,name)=>{const m=await measure(p,CARD),btn=await p.evaluate(()=>{const c=document.querySelector('#science-overlay:not(.hidden) .science-card,#campaign-overlay:not(.hidden) .science-card,#panel-overlay:not(.hidden) .panel-card');if(!c)return null;
  const bs=[...c.querySelectorAll('.learning-next,.card-foot button,.big-choice,.chip,#science-close,#campaign-close,#panel-close,.panel-actions button')].filter(b=>b.offsetParent);
  const cr=c.getBoundingClientRect();return {n:bs.length,scroll:c.scrollHeight-c.clientHeight,primaryVisible:(()=>{const pb=c.querySelector('.learning-next');if(!pb)return true;const b=pb.getBoundingClientRect();return b.bottom<=Math.min(innerHeight,cr.bottom)+1&&b.top>=0})(),
    small:bs.filter(b=>{const x=b.getBoundingClientRect();return x.height<32||x.width<32}).length}});
  const it=m.items[0];check(`${name}: card inside the window, main button visible without scrolling`,it&&!it.off&&btn&&btn.primaryVisible,{card:it?.box,...btn});
  check(`${name}: buttons are at least 32 px (touch friendly)`,btn&&btn.small===0,btn);return m};
const hudOk=async(p,name)=>{const m=await measure(p,HUD);
  check(`${name}: HUD fully inside the window`,m.items.every(i=>!i.off),m.items.filter(i=>i.off));
  check(`${name}: HUD panels do not overlap`,m.overlaps.length===0,m.overlaps);
  check(`${name}: no clipped HUD text`,m.items.every(i=>!i.clip),m.items.filter(i=>i.clip));
  return m};
const cam=p=>p.evaluate(()=>{const c=window.__ripple.scene.cameras.main;return {zoom:+c.zoom.toFixed(3),view:[Math.round(c.worldView.width),Math.round(c.worldView.height)],vp:[c.x,c.y,c.width,c.height]}});
const say=(p,text,mood='speak')=>p.evaluate(([t,m])=>window.dispatchEvent(new CustomEvent('ripple-dialogue',{detail:{text:t,mood:m}})),[text,mood]);

for(const [W,H] of SIZES){
  const tag=`${W}x${H}`,mobile=W<600,errs=[];
  const ctx=await browser.newContext({viewport:{width:W,height:H},deviceScaleFactor:1,hasTouch:mobile,isMobile:mobile});
  const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto(URL,{waitUntil:'networkidle'});await p.waitForFunction(()=>Boolean(window.__title&&window.__ripple?.scene?.player));await p.waitForTimeout(400);
  // ---- title
  await p.screenshot({path:`${DIR}/${tag}-01-title.png`});
  const t=await measure(p,['#title-screen .title-actions button','#title-screen h1','#title-screen .title-small button','#title-screen .title-note,#title-screen p']);
  check(`${tag} title: every title button and line fits`,t.items.length>0&&t.items.every(i=>!i.off),t.items.filter(i=>i.off));
  // ---- cinematic
  await p.locator('#title-start').click();await p.waitForTimeout(2600);await p.screenshot({path:`${DIR}/${tag}-02-intro-dream.png`});
  const ic=await measure(p,['#intro-skip','#intro-caption']);check(`${tag} intro: Skip and caption inside the window`,ic.items.length>=1&&ic.items.every(i=>!i.off),ic.items);
  const icam=await p.evaluate(()=>{const s=window.__ripple.scene.game.scene.getScene('IntroScene');const c=s.cameras.main;return {zoom:c.zoom,vp:[c.x,c.y,c.width,c.height],view:[Math.round(c.worldView.width),Math.round(c.worldView.height)]}});
  check(`${tag} intro: the 320×180 film frame is shown whole (letterboxed if needed)`,icam.view[0]<=322&&icam.view[1]<=182&&icam.view[0]>=318,icam);
  await p.waitForTimeout(8200);await p.screenshot({path:`${DIR}/${tag}-03-intro-launch.png`});
  await p.locator('#intro-skip').click();await p.waitForFunction(()=>window.__title.state()==='play',null,{timeout:15000});await p.waitForTimeout(3800);
  // ---- exploration
  await say(p,'Hi, Explorer! A robot on Mars found a clue. Let’s check it out!');await p.waitForTimeout(400);
  await p.screenshot({path:`${DIR}/${tag}-04-explore.png`});
  const c0=await cam(p);check(`${tag} explore: camera shows a comfortable slice of the world`,c0.view[0]>=300&&c0.view[0]<=900&&c0.view[1]>=300&&c0.view[1]<=900,c0);
  check(`${tag} explore: canvas fills the window`,(await measure(p,[])).cover>=99,(await measure(p,[])).canvas);
  await hudOk(p,`${tag} explore`);
  // player must be visible and not hidden behind HUD
  const pv=await p.evaluate(()=>{const s=window.__ripple.scene,c=s.cameras.main,cv=document.querySelector('#game canvas').getBoundingClientRect(),k=cv.width/c.width;
    const x=(s.player.x-c.worldView.x)*c.zoom*k+cv.left,y=(s.player.y-20-c.worldView.y)*c.zoom*k+cv.top;
    const hit=[...document.querySelectorAll('#mission-panel,#nuri-panel,#menu-buttons,#resource-rows')].filter(e=>{const b=e.getBoundingClientRect();return getComputedStyle(e).visibility!=='hidden'&&x>b.left&&x<b.right&&y>b.top&&y<b.bottom}).map(e=>e.id);
    return {x:Math.round(x),y:Math.round(y),hit}});
  check(`${tag} explore: astronaut on screen and not under a HUD panel`,pv.x>0&&pv.x<W&&pv.y>0&&pv.y<H&&pv.hit.length===0,pv);
  // ---- P2-M02 brief card
  await p.locator('#science-mission-button').click();await p.waitForTimeout(500);
  await p.screenshot({path:`${DIR}/${tag}-05-mission-brief.png`});await cardOk(p,`${tag} brief card`);
  await p.locator('#science-content .learning-next').first().click();await p.waitForTimeout(400);
  await hudOk(p,`${tag} after brief`);
  // field cards (chart) via the same event the world sends
  await p.evaluate(()=>window.dispatchEvent(new CustomEvent('ripple-world-interaction',{detail:{kind:'field',buildingId:null}})));await p.waitForTimeout(400);
  for(let i=0;i<3;i++){await p.screenshot({path:`${DIR}/${tag}-06-field-${i}.png`});await cardOk(p,`${tag} field card ${i}`);
    const nx=p.locator('#science-content .learning-next:not([disabled])');if(await nx.count())await nx.first().click();else{const ch=p.locator('#science-content .chip, #science-content [data-science-action^="window-"]');if(await ch.count())await ch.first().click();await p.waitForTimeout(200);const n2=p.locator('#science-content .learning-next:not([disabled])');if(await n2.count())await n2.first().click()}
    await p.waitForTimeout(350)}
  await p.keyboard.press('Escape');await p.waitForTimeout(300);
  // ---- panels
  for(const [k,name] of [['m','map'],['j','passport'],['h','help']]){await p.keyboard.press(k);await p.waitForTimeout(350);await p.screenshot({path:`${DIR}/${tag}-07-${name}.png`});await cardOk(p,`${tag} ${name} panel`);await p.keyboard.press('Escape');await p.waitForTimeout(250)}
  await p.keyboard.press('Escape');await p.waitForTimeout(350);await p.screenshot({path:`${DIR}/${tag}-07-settings.png`});await cardOk(p,`${tag} settings panel`);await p.keyboard.press('Escape');await p.waitForTimeout(250);
  // ---- room
  await p.evaluate(()=>window.__ripple.travel('research'));await p.waitForTimeout(800);
  const rc=await cam(p);await p.screenshot({path:`${DIR}/${tag}-08-room.png`});
  check(`${tag} room: camera shows the room (whole room, or follows the astronaut on narrow screens)`,rc.view[0]>=300&&rc.zoom>=0.9,rc);
  await hudOk(p,`${tag} room`);
  // ---- Arabic exploration + dialogue
  await p.keyboard.press('l');await p.waitForTimeout(300);await say(p,'المحطة الجاية: مختبر الأبحاث! يلا نروح هناك ونشوف العلماء بيعملوا إيه.');await p.waitForTimeout(350);
  await p.screenshot({path:`${DIR}/${tag}-09-room-ar.png`});await hudOk(p,`${tag} room Arabic`);
  await p.keyboard.press('l');await p.waitForTimeout(200);
  check(`${tag}: no browser errors`,errs.length===0,errs);r.errors.push(...errs);
  await ctx.close();
  // ---- campaign card (separate save: first mission already done)
  const ctx2=await browser.newContext({viewport:{width:W,height:H},deviceScaleFactor:1,hasTouch:mobile,isMobile:mobile});
  await ctx2.addInitScript(s=>{if(!sessionStorage.getItem('__seeded')){for(const [k,v] of Object.entries(s))localStorage.setItem(k,v);sessionStorage.setItem('__seeded','1')}},roverDone);
  const q=await ctx2.newPage();await q.goto(URL,{waitUntil:'networkidle'});await q.waitForFunction(()=>Boolean(window.__title&&window.__ripple?.scene?.player));await passTitle(q);await q.waitForTimeout(500);
  await q.screenshot({path:`${DIR}/${tag}-10-campaign-offer.png`});await hudOk(q,`${tag} campaign offer`);
  await q.locator('#campaign-start').click();await q.waitForTimeout(400);
  await q.screenshot({path:`${DIR}/${tag}-11-campaign-hud.png`});await hudOk(q,`${tag} campaign HUD`);
  await q.evaluate(()=>window.dispatchEvent(new CustomEvent('ripple-world-interaction',{detail:{kind:'equipment',buildingId:'research'}})));await q.waitForTimeout(400);
  await q.evaluate(()=>window.__campaign.act('next'));await q.waitForTimeout(350);
  await q.screenshot({path:`${DIR}/${tag}-12-campaign-quiz.png`});await cardOk(q,`${tag} campaign quiz`);
  for(const a of ['quiz-0','next','quiz-0','next','step-done'])await q.evaluate(a=>window.__campaign.act(a),a);
  await q.evaluate(()=>window.dispatchEvent(new CustomEvent('ripple-world-interaction',{detail:{kind:'equipment',buildingId:'command'}})));await q.waitForTimeout(400);
  await q.screenshot({path:`${DIR}/${tag}-13-campaign-choice.png`});await cardOk(q,`${tag} campaign choice`);
  await ctx2.close();
}
await browser.close();
process.exit(save()?0:1);
