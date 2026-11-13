import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
mkdirSync('qa-screenshots/camera',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={checks:[],errors:[],screens:[]};
const check=(name,pass,detail='')=>report.checks.push({name,pass,detail});
for(const [width,height] of [[1280,720],[1920,1080]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text())});
  await page.goto('http://localhost:5182/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>Boolean(window.__ripple?.scene?.player));await page.evaluate(()=>localStorage.clear());
  await page.waitForTimeout(550);
  const cam=await page.evaluate(()=>{const c=window.__ripple.scene.cameras.main;return {zoom:c.zoom,viewWidth:c.width/c.zoom,viewHeight:c.height/c.zoom,scrollY:c.scrollY}});
  check(`Exterior framing ${width}x${height}`,cam.zoom===1.6&&cam.viewWidth===800&&cam.viewHeight===450,JSON.stringify(cam));
  const file=`qa-screenshots/camera/outpost-${width}x${height}.png`;await page.screenshot({path:file});report.screens.push(file);
  if(width===1280){
    const scroll=[cam.scrollY];await page.keyboard.down('w');
    for(let i=0;i<7;i++){await page.waitForTimeout(90);scroll.push(await page.evaluate(()=>window.__ripple.scene.cameras.main.scrollY))}
    await page.keyboard.up('w');
    const deltas=scroll.slice(1).map((v,i)=>Math.abs(v-scroll[i]));
    const position=await page.evaluate(()=>window.__ripple.state().position);
    check('Camera follows movement smoothly',scroll.at(-1)<scroll[0]&&Math.max(...deltas)<30&&position.y<595,JSON.stringify({scroll,deltas,position}));
    await page.evaluate(()=>window.__ripple.scene.player.setPosition(640,468));
    await page.waitForFunction(()=>window.__ripple.state().nearest==='Enter Habitat');
    await page.keyboard.press('e');
    await page.waitForFunction(()=>window.__ripple.state().room==='habitat');
    check('Interior remains at room scale',await page.evaluate(()=>window.__ripple.scene.cameras.main.zoom===2&&window.__ripple.scene.cameras.main.worldView.width===640));
    await page.evaluate(()=>window.__ripple.scene.player.setPosition(320,318));
    await page.waitForFunction(()=>window.__ripple.state().nearest==='Exit to outpost');
    await page.keyboard.press('e');
    await page.waitForFunction(()=>window.__ripple.state().room===null);
    check('Exterior zoom restores after exit',await page.evaluate(()=>window.__ripple.scene.cameras.main.zoom===1.6));
  }
  await page.close();
}
check('No browser errors',report.errors.length===0,report.errors.join('; '));
writeFileSync('qa-screenshots/camera/results.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));await browser.close();
