// Shared helpers for real-browser QA. Movement always uses real key presses against the game's
// own collision rectangles (BFS path over scene.blocks); nothing is teleported unless a test says so.
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync,appendFileSync} from 'node:fs';
export const URL=process.env.RIPPLE_URL||'http://localhost:5182/';
export function report(dir){
  mkdirSync(dir,{recursive:true});
  const r={checks:[],errors:[],screens:[]};
  return {r,check:(name,pass,detail='')=>{r.checks.push({name,pass:!!pass,detail:typeof detail==='string'?detail:JSON.stringify(detail)});console.log(pass?'PASS':'FAIL',name,pass?'':detail)},
    save:()=>{writeFileSync(dir+'/results.json',JSON.stringify(r,null,2));const f=r.checks.filter(c=>!c.pass);console.log(`\n${r.checks.length-f.length}/${r.checks.length} passed, ${r.errors.length} browser errors`);return f.length===0&&r.errors.length===0}};
}
export async function launch({headless=process.env.HEADED?false:true}={}){return chromium.launch({channel:'chrome',headless})}
export async function openGame(browser,{width=1280,height=720,errors=[],storage=null}={}){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  if(storage)await context.addInitScript(s=>{if(!sessionStorage.getItem('__seeded')){for(const [k,v] of Object.entries(s))localStorage.setItem(k,v);sessionStorage.setItem('__seeded','1')}},storage);
  const page=await context.newPage();
  if(process.env.VOICE_CAPTURE)await captureDialogue(page,process.env.VOICE_CAPTURE);
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errors.push(m.type()+': '+m.text())});
  page.on('response',res=>{if(res.status()>=400)errors.push(res.status()+' '+res.url())});
  page.on('requestfailed',q=>{if(!q.url().includes('fonts.g'))errors.push('failed '+q.url())});
  await page.goto(URL,{waitUntil:'networkidle'});
  await ready(page);
  return {context,page};
}
/** Voice-package check (VOICE_CAPTURE=file): records every English line Nuri or a caption shows, as JSON lines. */
export async function captureDialogue(page,file){
  await page.exposeFunction('__voiceCapture',(kind,text)=>appendFileSync(file,JSON.stringify({kind,text})+'\n'));
  await page.addInitScript(()=>{
    const SEL={nuri:'#nuri-text',card:'#science-say',more:'.say-more p',help:'.panel-help .nuri-say p,.help-scene .nuri-say p',caption:'#intro-caption,#ending-caption',why:'.why-list li',
      option:'#science-content .chip,#campaign-content .chip',plan:'.big-choice b,.big-choice span.gain,.big-choice span.cost',slot:'.slot-btn b,.slot-btn small',disc:'.disc-detail>div>p'};
    const seen=new Set();
    const scan=()=>{if(document.documentElement.lang!=='en')return;for(const [k,s] of Object.entries(SEL))for(const el of document.querySelectorAll(s)){const t=(el.textContent||'').replace(/\s+/g,' ').trim();const key=k+'|'+t;if(t&&!seen.has(key)){seen.add(key);window.__voiceCapture(k,t)}}};
    new MutationObserver(()=>scan()).observe(document,{subtree:true,childList:true,characterData:true});
  });
}
/** Gets past the title screen: START + Skip Intro on a fresh save, CONTINUE otherwise. */
export async function passTitle(page){
  await page.waitForFunction(()=>Boolean(window.__title),null,{timeout:20000});
  if((await page.evaluate(()=>window.__title.state()))==='title'){
    if(await page.locator('#title-start').count()){await page.locator('#title-start').click();await page.waitForFunction(()=>window.__intro?.playing===true,null,{timeout:5000});await page.locator('#intro-skip').click()}
    else await page.locator('#title-continue').click();
  }
  await page.waitForFunction(()=>window.__title.state()==='play',null,{timeout:15000});
}
export const ready=page=>page.waitForFunction(()=>Boolean(window.__ripple?.scene?.player&&window.__mission&&window.__progress),null,{timeout:20000}).then(()=>passTitle(page)).then(()=>page.waitForTimeout(400));
export const st=page=>page.evaluate(()=>window.__ripple.state());
export const mission=page=>page.evaluate(()=>window.__mission.getState());
export const xp=page=>page.evaluate(()=>window.__progress.xp());
export const prog=page=>page.evaluate(()=>window.__progress.get());
export async function plan(page,tx,ty){return page.evaluate(([tx,ty])=>{const sc=window.__ripple.scene,G=8,room=sc.room,b=room?{minX:47,maxX:593,minY:132,maxY:318}:{minX:20,maxX:1260,minY:30,maxY:1100};
  const free=(x,y)=>x>=b.minX&&x<=b.maxX&&y>=b.minY&&y<=b.maxY&&!sc.blocks.some(r=>[-6,0,6].some(ox=>[-12,-7,-2].some(oy=>r.contains(x+ox,y+oy))));
  const sx=Math.round(sc.player.x/G),sy=Math.round(sc.player.y/G),ex=Math.round(tx/G),ey=Math.round(ty/G),key=(x,y)=>x+','+y,prev=new Map([[key(sx,sy),null]]),q=[[sx,sy]];
  while(q.length){const [x,y]=q.shift();if(x===ex&&y===ey)break;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=key(nx,ny);if(prev.has(k)||!free(nx*G,ny*G))continue;prev.set(k,[x,y]);q.push([nx,ny])}}
  if(!prev.has(key(ex,ey)))return null;const path=[];let cur=[ex,ey];while(cur){path.unshift([cur[0]*G,cur[1]*G]);cur=prev.get(key(cur[0],cur[1]))}
  return path.filter((c,i)=>{const a=path[i-1],n=path[i+1];return !a||!n||(a[0]-c[0])!==(c[0]-n[0])||(a[1]-c[1])!==(c[1]-n[1])})},[tx,ty])}
/** Walks with real WASD presses until `until(state)` is true or the path ends. */
export async function walkTo(page,tx,ty,until=null,maxMs=70000){
  const path=await plan(page,tx,ty);if(!path)throw Error(`no path to ${tx},${ty}`);
  const t0=Date.now();await page.keyboard.down('Shift');
  try{for(const [wx,wy] of path){
    while(Date.now()-t0<maxMs){const s=await st(page);if(until&&until(s)){await page.keyboard.up('Shift');return s}
      const dx=wx-s.position.x,dy=wy-s.position.y;if(Math.abs(dx)<=3&&Math.abs(dy)<=3)break;
      const k=Math.abs(dx)>3?(dx>0?'d':'a'):(dy>0?'s':'w'),d=Math.abs(Math.abs(dx)>3?dx:dy);
      await page.keyboard.down(k);await page.waitForTimeout(Math.max(16,Math.min(150,d*6)));await page.keyboard.up(k);}
  }}finally{await page.keyboard.up('Shift')}
  return st(page);
}
export const DOORS={habitat:[640,468],power:[445,578],greenhouse:[840,493],water:[455,808],research:[845,698],comms:[1110,918],command:[640,123],shelter:[140,998],oxygen:[640,1003]};
export async function enter(page,id){
  const [x,y]=DOORS[id];const s=await walkTo(page,x,y+8,s=>s.nearestKind==='door'&&s.nearestId===id);
  if(!(s.nearestKind==='door'&&s.nearestId===id))throw Error('could not reach door '+id+' '+JSON.stringify(s.position));
  await page.keyboard.press('e');await page.waitForFunction(i=>window.__ripple.state().room===i,id,{timeout:5000});await page.waitForTimeout(450);
}
export async function exitRoom(page){
  if(!(await st(page)).room)return;
  await walkTo(page,320,312,s=>s.nearestKind==='exit');await page.keyboard.press('e');
  await page.waitForFunction(()=>window.__ripple.state().room===null,null,{timeout:5000});await page.waitForTimeout(450);
}
export async function useEquipment(page){await walkTo(page,320,250,s=>s.nearestKind==='equipment');await page.keyboard.press('e');await page.waitForTimeout(350)}
export async function useAt(page,x,y,kind,id){await walkTo(page,x,y+4,s=>s.nearestKind===kind&&(!id||s.nearestId===id));await page.keyboard.press('e');await page.waitForTimeout(350)}
export const act=async(page,a)=>{await page.locator(`#science-content [data-science-action="${a}"]`).first().click();await page.waitForTimeout(160)};
export const cardTitle=page=>page.locator('#science-title').textContent();
export async function layout(page){return page.evaluate(()=>{
  const vis=el=>{if(!el)return null;const r=el.getBoundingClientRect();return {top:Math.round(r.top),bottom:Math.round(r.bottom),left:Math.round(r.left),right:Math.round(r.right),inView:r.top>=0&&r.left>=0&&r.bottom<=innerHeight&&r.right<=innerWidth}};
  const card=document.querySelector('#science-overlay:not(.hidden) .science-card')||document.querySelector('#panel-overlay:not(.hidden) .panel-card');
  const btns=[...(card?.querySelectorAll('.card-foot button,.panel-actions button,#science-close,#panel-close')||[])].map(vis);
  return {card:vis(card),scroll:card?card.scrollHeight-card.clientHeight:0,buttonsInView:btns.every(b=>b.inView),buttons:btns.length};})}
export async function shot(page,r,path,opts={}){await page.screenshot({path,...opts});r.screens.push(path)}
