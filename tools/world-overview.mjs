// Captures the whole exterior map at 1:1 (two canvas shots stitched by tools/stitch_overview.py).
// Usage: node tools/world-overview.mjs [outPrefix]   (dev server must be running)
import {launch,openGame} from './qa-lib.mjs';
const out=process.argv[2]||'qa-screenshots/world/overview';
const browser=await launch();const errors=[];
const {page:p}=await openGame(browser,{errors});
await p.addStyleTag({content:'#hud,#dialogue,#prompt{visibility:hidden!important}'});
await p.evaluate(()=>{const s=window.__ripple.scene;s.player.setVisible(false);s.nuri.setVisible(false);s.nuriGlow?.setVisible(false);window.dispatchEvent(new CustomEvent('ripple-control',{detail:{type:'guide',value:{kind:'none'}}}))});
const H=await p.evaluate(()=>window.__ripple.scene.cameras.main.getBounds().height);
for(const [i,cy] of [[0,360],[1,H-360]]){
  await p.evaluate(cy=>{const c=window.__ripple.scene.cameras.main;c.stopFollow();c.setZoom(1);c.centerOn(640,cy)},cy);
  await p.waitForTimeout(500);
  await p.locator('canvas').first().screenshot({path:`${out}-${i}.png`});
}
console.log(JSON.stringify({height:H,errors}));
await browser.close();
