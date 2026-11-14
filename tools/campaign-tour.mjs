// Quick visual tour of every campaign scene (fast: uses events, no walking). node tools/campaign-tour.mjs [outDir] [en|ar]
import {launch,openGame} from './qa-lib.mjs';
import {mkdirSync} from 'node:fs';
const out=process.argv[2]||'qa-screenshots/campaign/tour',lang=process.argv[3]||'en';mkdirSync(out,{recursive:true});
const errors=[];const browser=await launch();
const done={'mission-ripple-science-v1':JSON.stringify({version:1,stage:'complete',choice:'review-defer',monitorReviewed:true,researchReviewed:true,nextShiftFlag:'trend_reviewed',simulatedWorkSlotsUsed:1})};
const {page:p}=await openGame(browser,{errors,storage:done});
if(lang==='ar'){await p.keyboard.press('l');await p.waitForTimeout(200)}
let n=0;const snap=async()=>{await p.waitForTimeout(500);const id=await p.evaluate(()=>window.__campaign.card()?.id||'world');const L=await p.evaluate(()=>{const c=document.querySelector('#campaign-overlay:not(.hidden) .science-card');return c?c.scrollHeight-c.clientHeight:0});
  await p.screenshot({path:`${out}/${String(++n).padStart(2,'0')}-${id}.png`});console.log(n,id,'scroll',L)};
const c=a=>p.evaluate(x=>window.__campaign.act(x),a);
await p.locator('#campaign-start').click();await p.waitForTimeout(300);await p.screenshot({path:`${out}/00-hud.png`});
const ids=()=>p.evaluate(()=>window.__campaign.card()?.id);
for(let guard=0;guard<80;guard++){
  const C=await p.evaluate(()=>({active:window.__campaign.active(),open:window.__campaign.isOpen(),b:window.__campaign.step()?.building,done:window.__campaign.done()}));
  if(!C.open){if(!C.active)break;await p.evaluate(b=>window.dispatchEvent(new CustomEvent('ripple-world-interaction',{detail:{kind:'equipment',buildingId:b}})),C.b);}
  await snap();const id=await ids();
  if(id==='campaign-end')break;
  const quiz=await p.locator('#campaign-content .chip').count(),choice=await p.locator('#campaign-content .big-choice').count();
  if(choice){await c('choose-'+(n%2?'A':'B'));continue}
  if(quiz){const k=await p.evaluate(()=>{const b=[...document.querySelectorAll('#campaign-content .chip')];return b.length});
    for(let i=0;i<k;i++){await c((await p.evaluate(()=>document.querySelector('#campaign-content [data-c-action^=\"alloc\"]')?'alloc-':'quiz-'))+(await p.evaluate(()=>document.querySelector('#campaign-content [data-c-action^=\"alloc\"]')?['O','W','E'][2]:''))+(await p.evaluate(()=>document.querySelector('#campaign-content [data-c-action^=\"alloc\"]'))?'':i));
      if(await p.locator('#campaign-content .nuri-say.good').count())break}
    await snap();}
  const prim=await p.evaluate(()=>document.querySelector('#campaign-content .learning-next')?.dataset.cAction);
  if(prim)await c(prim);
}
console.log('errors',JSON.stringify(errors));await browser.close();
