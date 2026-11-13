import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
mkdirSync('qa-screenshots/pixel', {recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const results={errors:[],screens:[]};
for(const [w,h] of [[1280,720],[1920,1080]]){
  const page=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:1});
  page.on('pageerror',e=>results.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')results.errors.push(m.text())});
  await page.goto('http://localhost:5182/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>Boolean(window.__ripple?.scene?.player?.texture));
  await page.locator('#begin-button').click();await page.waitForTimeout(450);
  const file=`qa-screenshots/pixel/pass1-${w}x${h}.png`;await page.screenshot({path:file});results.screens.push(file);
  await page.close();
}
writeFileSync('qa-screenshots/pixel/pass1-results.json',JSON.stringify(results,null,2));
console.log(results);await browser.close();
