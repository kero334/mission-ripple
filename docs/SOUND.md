# Sound effects (updated 15 Nov 2026)

All effects are **procedural Web Audio** (`src/audio/sfx.ts`). There are no audio files and no new dependencies.

**How it plays:**
- Effects share one AudioContext with the opening score. The context is created only after the first click or key press.
- **Settings → Sound** (and the title-screen switch) turns every effect and the ambience off at once.

**Mix:**
- Each sound has a category gain: UI, footsteps, world, rewards, cinematic, ambience.
- Each sound also has a measured trim (dB).
- Everything then goes through a shared compressor and a limiter, so no sound is ever much louder than another and nothing clips.
- Repeats are rate-limited (footsteps every 150 ms or more, Nuri's bubble pop every 1.5 s or more).

| Group | Sounds | Played when |
|---|---|---|
| Movement | `stepDust` (outside), `stepMetal` (inside) | Every second walk frame (about 4 per second), with a slight variation per step |
| Ambience | `wind` (outside), `hum` (inside) | A looping bed that cross-fades on entering or leaving a building. Silent during the title screen, cinematics and with Sound off |
| Doors and machines | `doorOpen`, `doorClose`, `equipment`, `exhibit`, `miss` | Entering or leaving a building, E on a machine, E on a bonus fact, E with nothing nearby |
| Interface | `click`, `open`, `close`, `pop` | Any button, a card or panel opening and closing, Nuri's dialogue bubble |
| Learning | `right`, `tryAgain` (soft, never harsh), `xp`, `badge` | Quiz answers and chart windows, XP and badge rewards |
| Decisions and the Ripple Effect | `decision`, `powerUp`, `powerDown`, `ripple`, `newDay`, `rover`, `stuck`, `helper` | Plan choices, recovery and rescue choices, lights turning on or off, the camera visiting a changed place, the "new day" card, the robot driving, getting stuck or being rescued |
| Opening cinematic | `ignition`, `rumble`, `whoosh`, `thrusters`, `touchdown`, `hatch`, `bootStep`, `sparkle` | Timed to the cinematic, on top of the existing score |
| Endings | `sparkle`, `rover`, `cheer` (thrives) · `stepDust`, `repair`, `powerUp`, `cheer` (continues) · `shutdown` ×4, `helper`, `sparkle` (setback, gentle) | Timed to each ending, on top of its music |

**Test:** `node tools/sfx-qa.mjs` renders every sound offline through the game's mix chain and checks:
- no clipping (peak ≤ −1 dBFS) and no silent sounds;
- active loudness inside a ±5 dB window per category (UI about −31, footsteps −34, world and rewards −26, cinematic −22, ambience −38 dB);
- spread within a category ≤ 8 dB.

It then plays the game in Chrome and checks:
- no sound before a gesture;
- the cinematic launch sounds;
- footsteps, doors, ambience switching, card open and click;
- Sound OFF silences everything.
