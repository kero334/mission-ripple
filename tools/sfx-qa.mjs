// Sound-effect QA in real Chrome: renders every recipe offline through the game's own mix chain and measures
// peak and loudness, so no sound is too loud, too quiet, clipped, or silent. Also checks the live game: sounds
// start only after a user gesture, follow the Sound setting, and fire on the right events.
//   node tools/sfx-qa.mjs   (dev server must be running)
import {launch,report,openGame,enter,exitRoom,useEquipment,walkTo} from './qa-lib.mjs';
const URL=process.env.RIPPLE_URL||'http://localhost:5182/';
const DIR='qa-screenshots/sfx';const {r,check,save}=report(DIR);
const browser=await launch();
// ---------------------------------------------------------------- 1) offline loudness of every recipe
{const p=await browser.newPage();p.on('pageerror',e=>r.errors.push(e.message));await p.goto(URL,{waitUntil:'networkidle'});
  const res=await p.evaluate(async()=>{const m=await import('/src/audio/sfx.ts');const out={};
    for(const [name,R] of Object.entries(m.RECIPES)){const dur=R.cat==='amb'?10:R.cat==='cine'?4.5:2,c=new OfflineAudioContext(1,48000*dur,48000),ch=m.buildChain(c,c.destination);
      m.fire(c,ch,name,.05,R.cat==='amb'?9:name==='rumble'?4:0);const b=await c.startRendering(),d=b.getChannelData(0);
      let peak=0,sum=0,n=0;const win=2400;for(let i=0;i<d.length;i++)peak=Math.max(peak,Math.abs(d[i]));
      // loudness = RMS of the loudest 300 ms (what the ear notices for short effects)
      let best=0;for(let s=0;s+win<=d.length;s+=win/2){let q=0;for(let i=s;i<s+win*6&&i<d.length;i++)q+=d[i]*d[i];best=Math.max(best,Math.sqrt(q/Math.min(win*6,d.length-s)))}
      for(let i=0;i<d.length;i++){if(Math.abs(d[i])>.001){sum+=d[i]*d[i];n++}}
      // active loudness: RMS over the samples within 30 dB of the peak (the part you actually hear)
      let s2=0,n2=0;for(let i=0;i<d.length;i++)if(Math.abs(d[i])>peak*.0316){s2+=d[i]*d[i];n2++}void best;void sum;void n;
      out[name]={cat:R.cat,peakDb:+(20*Math.log10(peak||1e-9)).toFixed(1),loudDb:+(10*Math.log10(s2/Math.max(1,n2)||1e-12)).toFixed(1),nan:[...d].some(Number.isNaN)}}
    return out});
  // target loudness per category ±5 dB: footsteps and UI quiet, world and rewards medium, cinematic fullest, ambience a soft bed
  const TARGET={ui:[-36,-26],foot:[-39,-29],world:[-31,-21],reward:[-31,-21],cine:[-27,-17],amb:[-43,-33]};
  for(const [n,v] of Object.entries(res)){const [lo,hi]=TARGET[v.cat];
    check(`sfx ${n} (${v.cat}): no clipping (peak ≤ −1 dBFS) and not silent`,v.peakDb<=-1&&v.peakDb>-60&&!v.nan,v);
    check(`sfx ${n} (${v.cat}): loudness in the ${v.cat} window ${lo}…${hi} dB`,v.loudDb>=lo&&v.loudDb<=hi,v)}
  const byCat={};for(const v of Object.values(res))(byCat[v.cat]||=[]).push(v.loudDb);
  for(const [c,a] of Object.entries(byCat)){const spread=Math.max(...a)-Math.min(...a);check(`sfx category ${c}: consistent volume (spread ≤ 8 dB)`,spread<=8,{spread:+spread.toFixed(1),a})}
  r.levels=res;await p.close()}
// ---------------------------------------------------------------- 2) live game
{const errs=r.errors;const ctx=await browser.newContext({viewport:{width:1280,height:720}});const p=await ctx.newPage();
  await p.addInitScript(()=>{window.__sfxLog=[]});p.on('pageerror',e=>errs.push(e.message));
  await p.goto(URL,{waitUntil:'networkidle'});await p.waitForFunction(()=>Boolean(window.__title&&window.__sfx));
  check('No sound before the first click (browser autoplay rule)',await p.evaluate(()=>window.__sfx.state.ctx)!=='running');
  await p.locator('#title-start').click();await p.waitForTimeout(2000);
  check('Start click unlocks sound',await p.evaluate(()=>window.__sfx.state.ctx==='running'));
  await p.waitForTimeout(8500);
  const introLog=await p.evaluate(()=>window.__sfxLog.slice());check('Cinematic plays launch sounds (ignition, rumble)',introLog.includes('ignition')&&introLog.includes('rumble'),introLog);
  await p.locator('#intro-skip').click();await p.waitForFunction(()=>window.__title.state()==='play',null,{timeout:15000});await p.waitForTimeout(3500);
  check('Outdoor ambience (wind) after arriving',await p.evaluate(()=>window.__sfx.state.ambience)==='wind');
  await p.evaluate(()=>window.__sfxLog.length=0);
  await p.keyboard.down('d');await p.waitForTimeout(900);await p.keyboard.up('d');
  const steps=await p.evaluate(()=>window.__sfxLog.filter(x=>x.startsWith('step')).length);check('Footsteps while walking (about 3 per second)',steps>=2&&steps<=6,steps);
  await p.locator('#science-mission-button').click();await p.waitForTimeout(400);
  check('Opening a card plays a soft "open" sound',await p.evaluate(()=>window.__sfxLog.includes('open')));
  await p.locator('#science-content .learning-next').first().click();await p.waitForTimeout(300);
  check('Buttons click',await p.evaluate(()=>window.__sfxLog.includes('click')));
  await enter(p,'habitat');
  const log=await p.evaluate(()=>window.__sfxLog.slice());check('Doors: open sound when entering',log.includes('doorOpen'),log.slice(-6));
  check('Indoor ambience (hum) inside a building',await p.evaluate(()=>window.__sfx.state.ambience)==='hum');
  await p.keyboard.down('a');await p.waitForTimeout(600);await p.keyboard.up('a');
  check('Indoor footsteps sound metallic',await p.evaluate(()=>window.__sfxLog.includes('stepMetal')));
  await exitRoom(p);check('Doors: close sound when leaving',await p.evaluate(()=>window.__sfxLog.includes('doorClose')));
  // sound off in settings → silence
  await p.evaluate(()=>window.__panels.open('settings'));await p.waitForTimeout(300);
  await p.locator('[data-panel-action="sound-toggle"]').click();await p.waitForTimeout(200);
  await p.keyboard.press('Escape');await p.waitForTimeout(900);await p.evaluate(()=>window.__sfxLog.length=0);
  await p.keyboard.down('d');await p.waitForTimeout(700);await p.keyboard.up('d');
  check('Sound OFF in Settings silences every effect and the ambience',(await p.evaluate(()=>window.__sfxLog.length))===0&&await p.evaluate(()=>window.__sfx.state.ambience)===null);
  check('No browser errors',errs.length===0,errs);await ctx.close()}
await browser.close();process.exit(save()?0:1);
