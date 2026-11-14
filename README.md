# Mission Ripple 2D — pixel Mars outpost

A Phaser 3 / TypeScript exploration game for children aged 7–12, in English and Arabic. It opens with a
30-second pixel-art cinematic, then plays six connected missions. The first is **The Rover Reading (P2-M02)**,
built on real Curiosity RAD readings from 20 May 2024. Five campaign missions follow, each based on a research
package candidate (see `docs/CAMPAIGN.md`).
The PlayCanvas 3D project and the scientific research package are read-only and were not modified.

## Run

```powershell
npm install
npm run dev        # http://localhost:5182/
npm test           # unit tests for science, rewards, hints, saves, translations and reading level
npm run build      # typecheck + production bundle
```

With the dev server running: `npm run qa:experience` (real Chrome playthroughs, about 10 min),
`npm run qa:science` (compares every charted row with the original NASA CSV; needs the research package as a
sibling folder), `npm run qa:camera`, `npm run qa:intro` (cinematic: playback, skip, continue, replay,
reduced motion, Arabic, mobile sizes) and `npm run qa:campaign` (missions 2–6 on both paths, reload, Arabic).
`node tools/campaign-tour.mjs [dir] [en|ar]` screenshots every campaign scene.

## Play

- **Controls:** WASD or the arrow keys move (Shift runs). **E** uses things and talks. **H** opens Nuri's help.
  **M** is the map, **J** the Science Passport, **B** your tools, **Esc** pause and settings, **L** English/Arabic.
- **Start:** a fresh game shows the title screen; **START GAME** plays the cinematic (SKIP INTRO, Esc, Enter
  or Space skips it). A saved game offers **CONTINUE** and never forces the cinematic. Settings has
  **REPLAY CINEMATIC** and a sound switch.
- **The first mission:** press **START MISSION**, then follow the yellow arrow:
  glowing screen (see the robot's real data) → Research Lab (what it means, what is still a mystery) →
  Command Hub (pick plan A or B) → Communications (see what your choice changed) → debrief and rewards.
  Play again to try the other plan.
- **The base story:** after the first mission, **NEXT MISSION** starts five more. They are: Fix the Robot's
  Notebook, Sun Storm Watch, Plant Detectives, Share the Power and The Base Plan. Each choice changes four
  **pretend** base meters (power, water, air, food; game rules, not NASA data), and the next mission opens by
  showing what the earlier choice changed.
- **Extras:** six optional **bonus facts** are hidden in the Habitat, Research Lab, Command Hub, Radiation
  Shelter, Greenhouse and Communications.

Every number a child sees is rounded and comes from the NASA snapshot. Exact values and sources are in each
card's "For grown-ups" drawer. The robot's readings are never presented as an astronaut's dose, a reading
inside the base, or a safety level. The work plan, XP and badges are pretend game rules.

## Docs

- `docs/CINEMATIC.md`: the opening cinematic (storyboard, skip/continue/replay, sound, reduced motion, tests).
- `docs/CAMPAIGN.md`: missions 2–6, their NASA evidence and decision IDs, pretend meter rules, what is blocked.
- `docs/CHILD_EXPERIENCE.md`: learning flow, writing rules, chart, Nuri hints, guidance, rewards, saves, files.
- `docs/CHILD_TESTING_PROTOCOL.md`: first-time player test plan. **No child test has been run yet.**
- `docs/SCIENCE_MISSION_ARCHITECTURE.md`, `docs/MISSION_SELECTION_AND_SCIENCE.md`: science boundaries and why
  this mission was chosen.
- `docs/PIXEL_ART_SPEC.md`, `docs/UNFINISHED.md`: art rules and open art gaps.
- `MISSION_RIPPLE_AI_HANDOFF/`: frozen 13 Nov handoff, plus `UPDATE_2026-11-14.md`.

## Structure

- `src/scene.ts`: tile world, camera, collision, sprites, Nuri, rooms, guidance beacon, bonus-fact screens.
- `src/main.ts`, `index.html`, `src/style.css`: the HUD (objective tracker, XP chip, prompts, toasts) and wiring.
- `src/content/strings.ts`: **all child-facing words** (EN and AR). `src/content/discoveries.ts`: science cards.
- `src/science/`:
  - `mission.ts`: the unchanged mission state machine and save repair.
  - `ui.ts`: the mission cards.
  - `series.ts`: the validated 19–20 May readings.
  - `*.json`: the NASA snapshots.
- `src/intro/`: the cinematic (`IntroScene.ts`), title screen and skip/replay (`intro.ts`), Web Audio score
  (`sound.ts`). Art is in `public/assets/intro/`, built by `tools/build_intro_art.py`.
- `src/missions/`: campaign content (`campaign-data.ts`) and engine and save (`campaign.ts`).
  Its evidence is `src/science/campaign-evidence-v1.json`, built by `tools/build_campaign_snapshot.mjs`.
- `src/game/`: rewards configuration, progress store, guidance and hints, bonus-fact placement, pretend base
  meters (`base-sim.ts`).
- `src/ui/`: card shell and modal stack, real-data chart, help, passport, map and settings panels.
- `public/assets/`: pixel art. `pixel-manifest.json` (89 world assets) and `experience-manifest.json`
  (34 badge, science and guide assets).
- `tools/`: art builders, science snapshot builders, unit tests and Chrome QA.
  `playtest.mjs`, `pixel-pass1.mjs` and `pixel-qa.mjs` target the old UI.
