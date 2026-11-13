// Quick visual tour of every mission scene (fast: uses world-interaction events, no walking).
// node tools/tour.mjs [outDir] [en|ar]
import {launch,openGame,act} from './qa-lib.mjs';
import {mkdirSync} from 'node:fs';
const out=process.argv[2]||'qa-screenshots/child-experience/tour',lang=process.argv[3]||'en';mkdirSync(out,{recursive:true});
const errors=[];const browser=await launch();const {page:p}=await openGame(browser,{errors});
if(lang==='ar'){await p.keyboard.press('l');await p.waitForTimeout(200)}
const snap=async name=>{await p.waitForTimeout(2100);const id=await p.evaluate(()=>document.querySelector('#science-content [data-page]')?.dataset.page||'world');const L=await p.evaluate(()=>{const c=document.querySelector('#science-overlay:not(.hidden) .science-card');return c?c.scrollHeight-c.clientHeight:0});await p.screenshot({path:`${out}/${name}-${id}.png`});console.log(name,id,'scroll',L)};
const world=(kind,buildingId=null)=>p.evaluate(([k,b])=>window.dispatchEvent(new CustomEvent('ripple-world-interaction',{detail:{kind:k,buildingId:b}})),[kind,buildingId]);
await p.waitForTimeout(500);await p.screenshot({path:`${out}/00-hud.png`});
await p.locator('#science-mission-button').click();await snap('01');await act(p,'close');
await world('field');await snap('02');await act(p,'next');await snap('03');await act(p,'next');await snap('04');await act(p,'window-0');await snap('05');await act(p,'window-1');await snap('06');await act(p,'next');await snap('07');await act(p,'field-done');
await world('equipment','research');await snap('08');for(const n of ['09','10','11','12']){await act(p,'next');await snap(n)}await act(p,'research-done');
await world('equipment','command');await snap('13');await act(p,'review-defer');await snap('14');await act(p,'explain-1');await snap('15');await act(p,'next');await snap('16');await act(p,'next');await snap('17');await act(p,'close');
await world('equipment','comms');await snap('18');await act(p,'next');await snap('19');await act(p,'later-done');await snap('20');
await act(p,'next');await snap('21');await act(p,'reflect-no');await snap('22');await act(p,'next');await act(p,'transfer-a');await snap('23');await act(p,'finish');await snap('24');
await act(p,'close');await p.keyboard.press('h');await p.waitForTimeout(300);await p.screenshot({path:`${out}/25-help.png`});
await p.keyboard.press('Escape');await p.keyboard.press('j');await p.waitForTimeout(300);await p.screenshot({path:`${out}/26-passport.png`});
console.log('errors',JSON.stringify(errors));await browser.close();
