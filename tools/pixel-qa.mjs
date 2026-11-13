import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
mkdirSync('qa-screenshots/pixel',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={checks:[],errors:[],screens:[]};
const check=(name,pass,detail='')=>report.checks.push({name,pass,detail});
for(const [width,height] of [[1280,720],[1920,1080]]){
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
 page.on('pageerror',e=>report.errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`)});
 page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text())});
 await page.goto('http://localhost:5182/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>Boolean(window.__ripple?.scene?.player?.texture));
 await page.waitForTimeout(500);
 const asset=await page.evaluate(()=>({count:window.__ripple.scene.textures.list,canvas:document.querySelector('canvas')?.getBoundingClientRect().toJSON()}));
 check(`Canvas visible ${width}x${height}`,asset.canvas?.width>0,`${asset.canvas?.width}x${asset.canvas?.height}`);
 const file=`qa-screenshots/pixel/final-${width}x${height}.png`;await page.screenshot({path:file});report.screens.push(file);
 if(width===1280){
   await page.keyboard.down('w');await page.waitForTimeout(960);await page.keyboard.up('w');
   const moved=await page.evaluate(()=>window.__ripple.state());
   check('WASD movement and exploration state',moved.position.y<550&&moved.exploredCourtyard,JSON.stringify(moved.position));
   check('Habitat door prompt reached',moved.nearest==='Enter Habitat',String(moved.nearest));
   await page.keyboard.press('e');await page.waitForFunction(()=>window.__ripple.state().room==='habitat',{timeout:3000});
   check('Enter Habitat by walking to door and pressing E',true);
   await page.waitForTimeout(350);await page.screenshot({path:'qa-screenshots/pixel/habitat-interior.png'});report.screens.push('qa-screenshots/pixel/habitat-interior.png');
   await page.keyboard.press('e');await page.waitForTimeout(100);
   check('Habitat equipment inspection',await page.evaluate(()=>window.__ripple.state().inspected.includes('habitat')));
   await page.evaluate(()=>window.__ripple.scene.player.setPosition(320,318));await page.waitForTimeout(120);await page.keyboard.press('e');
   await page.waitForFunction(()=>window.__ripple.state().room===null,{timeout:3000});
   check('Exit Habitat to outpost',true);
   for(const id of ['power','greenhouse','water','research','comms','command','shelter','oxygen']){
     await page.evaluate(id=>window.__ripple.travel(id),id);
     await page.waitForFunction(id=>window.__ripple.state().room===id,id,{timeout:3000});
     check(`Enter ${id}`,true);
     if(['power','greenhouse','water','research'].includes(id)){await page.waitForTimeout(350);await page.screenshot({path:`qa-screenshots/pixel/${id}-interior.png`});report.screens.push(`qa-screenshots/pixel/${id}-interior.png`)}
     await page.evaluate(()=>window.__ripple.scene.player.setPosition(320,318));await page.waitForTimeout(80);await page.keyboard.press('e');await page.waitForFunction(()=>window.__ripple.state().room===null,{timeout:3000});
   }
   await page.keyboard.press('m');check('Map opens',await page.locator('#overlay-title').textContent()==='OUTPOST MAP');await page.keyboard.press('m');
   await page.keyboard.press('j');check('Journal opens',await page.locator('#overlay-title').textContent()==='FIELD JOURNAL');await page.keyboard.press('j');
   await page.keyboard.press('b');check('Inventory opens',await page.locator('#overlay-title').textContent()==='EQUIPMENT');await page.keyboard.press('b');
   await page.keyboard.press('Escape');check('Pause opens',await page.locator('#overlay-title').textContent()==='PAUSED · SETTINGS');await page.keyboard.press('Escape');
   await page.keyboard.press('l');check('Arabic RTL',await page.locator('html').getAttribute('dir')==='rtl');await page.screenshot({path:'qa-screenshots/pixel/arabic-1280x720.png'});report.screens.push('qa-screenshots/pixel/arabic-1280x720.png');
 }
 await page.close();
}
check('No browser errors',report.errors.length===0,report.errors.join('; '));
writeFileSync('qa-screenshots/pixel/final-results.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));await browser.close();
