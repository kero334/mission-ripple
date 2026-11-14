# Opening cinematic (updated 14 Nov 2026)

A 30-second pixel-art opening plays after **START GAME** on a fresh save. Code: `src/intro/IntroScene.ts` (Phaser
scene: tweens, camera zoom/pan/shake/flash), `src/intro/intro.ts` (title screen, skip, continue, replay),
`src/intro/sound.ts` (Web Audio score). Art: `public/assets/intro/` (28 files, 16.5 KB), built by
`tools/build_intro_art.py` and kept separate from gameplay art.

| Time | Scene | What moves |
|---|---|---|
| 0–4.6 s | The dream: a child asleep, with a toy rocket and a Mars drawing | Camera slowly approaches, the child breathes (2 frames), window stars twinkle, the lamp glows |
| 4.6–8.6 s | Growing up | Star ring swirls around the child, a flash, the **playable astronaut sprite** appears, then a helmet close-up with Mars in the visor |
| 8.6–14.6 s | Launch | Engine ignites (3 flame frames), smoke puffs spread, the camera shakes, and the rocket accelerates up with the camera following into the stars |
| 14.6–19.6 s | Journey | Two parallax star layers; Earth shrinks and fades, Mars grows; captions "Days… Weeks… Months in space" |
| 19.6–26.4 s | First steps | Low camera on the boots; the lander hatch opens, a boot lifts and lands, dust puffs, a footprint. The camera tilts up to the **real outpost building sprites** and the playable astronaut |
| 26.4–30 s | Into the game | Fade to the game's Mars colour. `MarsScene.arrival()` zooms from 5.5× to the normal 1.6× view on the real player, Nuri flies in and says "Welcome to Mars, Explorer!", then control returns |

- **Skip:** a SKIP INTRO button (44 px or more), Esc, Enter or Space. It can be used at any time and always
  returns through `arrival()`.
- **Continue:** a saved game shows CONTINUE plus WATCH INTRO; the cinematic is never forced.
- **Replay:** Settings → REPLAY CINEMATIC.
- **Reduced motion:** with `prefers-reduced-motion: reduce`, the cinematic runs at about 62 % length with no
  shake, zoom or camera flights, and the arrival skips the zoom.
- **Sound:** made procedurally with Web Audio; there are no audio files. The AudioContext is created only inside
  the START click. Sound can be switched off on the title screen and in Settings.
- **Determinism:** fixed timeline, seeded star positions, no `Math.random`.
- **Text:** English and Arabic captions and buttons. The title screen states that this is a made-up story about
  the future, and that the Mars data in the game is real NASA data.
- **Dependencies:** none added. It uses only Phaser 3.90 and the browser Web Audio API (no GSAP).
- **Tests:** `node tools/intro-qa.mjs`, 38 checks covering:
  - playback and caption order;
  - skip at 0.5 s, 11 s and 21.5 s;
  - continue and replay;
  - reduced motion;
  - Arabic;
  - sound off;
  - 390×844 and 844×390 mobile sizes;
  - no browser errors.
- **Limitations:**
  - The art is procedurally drawn and simpler than the hand-painted outpost buildings.
  - Headless Chrome timing varies by about 1 s.
  - There is no voice-over.
  - On phones, the game itself still needs a keyboard (touch controls do not exist yet).
