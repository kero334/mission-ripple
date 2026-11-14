// Nuri voice QA in real Chrome: the voice matches the bubble, never overlaps, stops when the screen changes,
// follows mute/volume/language, ducks music and effects, and the hear-again buttons work.
//   node tools/voice-qa.mjs   (dev server running)
import {launch,openGame,report,st,enter,exitRoom,useEquipment,walkTo,passTitle} from './qa-lib.mjs';
const DIR='qa-screenshots/voice';const {r,check,save}=report(DIR);
const browser=await launch();const errs=r.errors;
const V=p=>p.evaluate(()=>({...window.__voice.state,src:(()=>{const a=[...document.querySelectorAll('audio')];return null})(),duck:window.__sfx.ducked}));
const speaking=p=>p.evaluate(()=>window.__voice.state);
const audioState=p=>p.evaluate(()=>{const l=window.__voice.log();return {last:l.at(-1)||null,n:l.length}});
const waitSpeak=(p,ms=4000)=>p.waitForFunction(()=>window.__voice.state.speaking,null,{timeout:ms}).then(()=>true).catch(()=>false);
const waitQuiet=(p,ms=15000)=>p.waitForFunction(()=>!window.__voice.state.speaking,null,{timeout:ms}).then(()=>true).catch(()=>false);
// count simultaneous <audio>/Audio() playing: the voice uses one element; patch to detect any second voice element
const OVERLAP=()=>{window.__playing=new Set();window.__maxPlaying=0;const P=HTMLMediaElement.prototype,play=P.play;
  P.play=function(){window.__playing.add(this);window.__maxPlaying=Math.max(window.__maxPlaying,[...window.__playing].filter(a=>!a.paused||a===this).length);const res=play.call(this);this.addEventListener('pause',()=>window.__playing.delete(this),{once:true});this.addEventListener('ended',()=>window.__playing.delete(this),{once:true});return res}};

{const {page:p,context}=await openGame(browser,{errors:errs});await p.addInitScript(OVERLAP);await p.reload({waitUntil:'networkidle'});
  await p.waitForFunction(()=>window.__title);
  check('Voice manifest loaded: 390 recorded lines',await p.evaluate(()=>window.__voice.state.lines)===390,await p.evaluate(()=>window.__voice.state.lines));
  await passTitle(p);await p.waitForTimeout(600);
  // 1) the first mission line plays and matches the bubble
  await p.locator('#science-mission-button').click();
  check('Opening the mission card: Nuri speaks the card line',await waitSpeak(p));
  let v=await speaking(p),bubble=await p.locator('#science-content #science-say').textContent();
  check('Voice = the exact text in the card bubble',v.text===bubble.replace(/\s+/g,' ').trim(),{voice:v.text,bubble});
  check('Music and effects are lowered while Nuri speaks',await p.evaluate(()=>window.__sfx.ducked));
  // 2) closing the card stops it, and the HUD line that was waiting plays next (no overlap)
  await p.locator('#science-content .learning-next').first().click();await p.waitForTimeout(250);
  const after=await speaking(p);
  check('Closing the card replaces the card line (one voice at a time)',after.channel!=='card',after);
  check('The HUD line plays after the card closes and matches the dialogue box',after.speaking&&after.text===(await p.locator('#nuri-text').textContent()).trim(),after);
  // 3) quiet → effects return to normal volume
  await waitQuiet(p);await p.waitForTimeout(300);check('After Nuri finishes, music/effects come back up',!(await p.evaluate(()=>window.__sfx.ducked)));
  // 4) hear-again button on the dialogue box
  await p.locator('#nuri-replay').click();check('Hear-again button replays the dialogue line',await waitSpeak(p,2000)&&(await speaking(p)).text===(await p.locator('#nuri-text').textContent()).trim());
  // 5) entering a building stops the old line
  await enter(p,'habitat');await p.waitForTimeout(150);
  const inRoom=await speaking(p);check('Entering a building: the old line stops; the new line is the one on screen',!inRoom.speaking||inRoom.text===(await p.locator('#nuri-text').textContent()).trim(),inRoom);
  await exitRoom(p);
  // 6) field card: page changes switch lines; quiz feedback is voiced
  await walkTo(p,664,694,s=>s.nearestKind==='field');await p.keyboard.press('e');await p.waitForTimeout(400);
  const ids=[];for(let i=0;i<3;i++){await waitSpeak(p,3000);ids.push((await speaking(p)).text);if(i<2){await p.locator('#science-content .learning-next').first().click();await p.waitForTimeout(350)}}
  check('Each card page speaks its own line',new Set(ids).size===3,ids);
  await p.locator('#science-content rect[data-window="0"]').click().catch(()=>{});await p.waitForTimeout(300);
  const fb=await speaking(p);check('Tapping the chart: the feedback line is voiced and matches',fb.speaking&&fb.text===(await p.locator('#science-content #science-say').textContent()).replace(/\s+/g,' ').trim(),fb);
  // 7) card hear-again
  await waitQuiet(p);await p.locator('#science-content .voice-replay').click();check('Card hear-again button replays the card line',await waitSpeak(p,2000));
  // 8) help panel: tips are voiced; closing stops them
  await p.keyboard.press('h');await p.waitForTimeout(400);const h=await speaking(p);
  check('Help panel: Nuri reads the tip',h.speaking&&h.channel==='help'&&h.text===(await p.locator('.help-scene .nuri-say p').textContent()).trim(),h);
  await p.locator('[data-panel-action="more"]').click();await p.waitForTimeout(300);const h2=await speaking(p);check('MORE TIPS: the next tip replaces the first',h2.text!==h.text&&h2.channel==='help',h2);
  await p.keyboard.press('Escape');await p.waitForTimeout(250);check('Closing help stops the tip',(await speaking(p)).channel!=='help');
  await p.keyboard.press('Escape');await p.waitForTimeout(300);
  // 9) Arabic: no English voice
  await p.keyboard.press('l');await p.waitForTimeout(300);check('Switching to Arabic stops the English voice',!(await speaking(p)).speaking);
  await p.evaluate(()=>window.dispatchEvent(new CustomEvent('ripple-dialogue',{detail:{text:'test',mood:'speak'}})));
  await p.locator('#science-mission-button').click().catch(()=>{});await p.waitForTimeout(400);check('In Arabic, Nuri is silent and the hear-again buttons are hidden',!(await speaking(p)).speaking&&!(await p.locator('#nuri-replay').isVisible()));
  await p.evaluate(()=>{window.__mission&&document.querySelector('#science-close')?.click()});await p.keyboard.press('l');await p.waitForTimeout(300);
  // 10) volume + mute in Settings
  await p.evaluate(()=>window.__panels.open('settings'));await p.waitForTimeout(300);
  await p.locator('[data-panel-action="vvol-0.5"]').click();await p.waitForTimeout(150);
  check('Voice volume setting saved (Quiet = 0.5)',await p.evaluate(()=>window.__progress.get().settings.voiceVolume)===0.5);
  await p.locator('[data-panel-action="voice-toggle"]').click();await p.waitForTimeout(150);
  check('Voice OFF saved',await p.evaluate(()=>window.__progress.get().settings.voice)===false);
  await p.keyboard.press('Escape');await p.waitForTimeout(250);
  await p.evaluate(()=>window.dispatchEvent(new CustomEvent('ripple-dialogue',{detail:{text:'Nice work, scientist!',mood:'happy'}})));await p.waitForTimeout(300);
  check('With the voice OFF, Nuri stays silent and the hear-again button is hidden',!(await speaking(p)).speaking&&!(await p.locator('#nuri-replay').isVisible()));
  await p.evaluate(()=>window.__panels.open('settings'));await p.waitForTimeout(250);await p.locator('[data-panel-action="voice-toggle"]').click();await p.locator('[data-panel-action="vvol-0.85"]').click();await p.keyboard.press('Escape');
  await p.reload({waitUntil:'networkidle'});await passTitle(p);
  check('Voice settings survive a reload',await p.evaluate(()=>{const s=window.__progress.get().settings;return s.voice===true&&s.voiceVolume===0.85}));
  check('Never more than one voice playing at once',await p.evaluate(()=>window.__maxPlaying<=1),await p.evaluate(()=>window.__maxPlaying));
  check('No line shown to the player was missing a recording',(await p.evaluate(()=>window.__voice.missing())).length===0,await p.evaluate(()=>window.__voice.missing()));
  await p.screenshot({path:`${DIR}/hud-replay-button.png`});
  await context.close()}
check('No browser errors',errs.length===0,errs);
await browser.close();process.exit(save()?0:1);
