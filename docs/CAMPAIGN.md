# Mission Ripple campaign: the Ripple Effect (updated 15 Nov 2026)

After **The Rover Reading (P2-M02)**, **NEXT MISSION** starts five connected missions on one pretend training
base. Every choice changes the base, the base is visible in the world, and the base decides the ending.

- Code: `src/game/base-sim.ts` (pretend rules), `src/missions/campaign.ts` (engine, save, cards),
  `src/missions/campaign-data.ts` (words), `src/scene.ts` (`drawRipple`, `runTour`: what the world shows),
  `src/ending/` (the three ending cinematics).
- Art: `public/assets/ripple/`, built by `tools/build_ripple_art.py`.

## The pretend base (game rules, not NASA data)

- **3 power blocks.** Each block lights one thing: greenhouse lamp 1, lamp 2, the Research Lab **spare monitor**,
  or the Communications **Sun-watch screen**. At the start, both lamps are on and 1 block is spare.
- A **robot trip** or a **rescue** borrows 1 block for one day.
- **Every new day** (between missions 3→4, 4→5, 5→6 and after 6): 2 lamps on → plants grow one stage;
  fewer → they shrink one stage (Drooping, Weak, Growing, Healthy, Thriving). A watch screen that is on
  checks the Sun alert overnight.
- **Open problems:** notes with gaps (monitor off when the plan is written), Sun alert not checked, no fair
  plant test, robot still stuck.
- **Ending:**
  - **Thrives:** plants Healthy or better, and at most 1 open problem.
  - **Setback:** plants Weak or worse, or 3 or more open problems.
  - **Continues:** everything else.
  - Sharing the plan (Mission 6 A) means the next team helps with one open problem.
- The base is **rebuilt from the saved event history**. So reloads never drift, delayed effects never apply
  twice, and the same choices always give the same base.

## How the decisions connect

| Mission | A | B | What it changes later |
|---|---|---|---|
| 1 Rover Reading | Study first: the robot rests | Go and check again: the robot learns a road | Mission 5: a rested robot scouts for free; a robot that knows the road never gets stuck |
| 2 Robot's Notebook (P2-M08) | Spare monitor **on** (uses the spare block) | Keep going, mark gaps | With no spare block, Mission 3 A must **turn a greenhouse lamp off**. Monitor off at the plan = open problem |
| 3 Sun Storm Watch (P2-M03) | Watch screen **on** (spare block, or a lamp turns off) | Keep doing science | Overnight the watch screen identifies the flare. A dark lamp shrinks the plants |
| Day 1 → 4 Plant Detectives | **Recovery:** if a lamp is dark, turn off the watch screen or monitor to relight it, or keep the plan | | |
| 4 Plant Detectives (P2-M05) | Control tray: fair test, +1 growth the next day | Use all trays: +1 growth now, no fair test | Fair test closes a problem |
| Day 2 → 5 Share the Power | **Recovery:** the power check, where you tap any light on or off (max 3 blocks) | | |
| 5 Share the Power (P2-M07) | Scout first: free if the robot rested; otherwise it borrows a block (you pick which light dims) | Short route now | B with a rested robot: the robot is **stuck by the rocks** |
| Day 3 → 6 The Base Plan | **Recovery:** walk to the stuck robot, then send the helper robot (borrows a block for a day) or leave it | | |
| 6 Base Plan (P2-M10) | Share the plan and the questions | Pause: monitor and watch screen turn off, both lamps on | Ending |

## What the player sees

- **In the world:**
  - The greenhouse glows or dims, with a shadow over it.
  - Lamp posts turn on or off, and a plant tray outside shows the growth stage.
  - The spare monitor and watch screen screens light up or go dark.
  - **?** bubbles appear on unsolved problems.
  - The robot is parked, driving, or stuck with a repair bubble; the helper robot appears during a rescue.
  - Inside the greenhouse, the plants and lamps match the base.
- **After a choice:** when you step outside, the camera visits each place that changed, with sparkles and a ring.
- **Nuri reacts while you explore:** "The greenhouse is dim. Only one lamp has power."
- **On cards:**
  - "You chose X. So Y." with change chips (Lamp 2 off, Plants 2→1).
  - A *new day* card showing what grew or shrank and **why** ("Remember? The watch screen is using a lamp's power").
  - "Because you chose…" at the start of the next mission.
  - Mission 1 is remembered at the start of Mission 2.
- **HUD:** 3 power blocks showing what uses each, the plant stage, and the stuck robot.

## The three endings (`src/ending/EndingScene.ts`, about 15 s each, skippable, replayable)

| Ending | Scene |
|---|---|
| **The base thrives** | Dusk with stars. Every building glows and the greenhouse glows green. The plant tray grows to thriving with sparkles, the robot drives by, and the astronaut jumps while Nuri spins. Celebration sparkles over a wide view. Bright music. |
| **The mission continues** | Daylight. Buildings with open problems are dimmed and show **?** or wrench bubbles; a stuck robot is shown if it was left. The astronaut walks to a console and repairs it, and Nuri cheers. Evening falls and Earth appears. Calm music. |
| **A hard day for the base** | Night. Lights go out one by one, each with a green "stopped safely" check. Close-up of the weak plant tray while the astronaut and Nuri watch quietly. Nuri brightens, and the habitat light stays on: everyone is OK. Gentle music. |

After the cinematic, the **recap card** shows:
- the ending title;
- an animated **timeline of every decision, recovery and day**, with the change chips;
- a short "How your choices led here" list ("Many days were dim, so the plants got weak. Earlier, the watch screen
  took a lamp's power. Then you kept the plan, so the lamp stayed off.");
- the problems that were solved.

From the recap the player can play again, replay the ending, or go exploring. The tracker also offers **WATCH THE
ENDING AGAIN**.

## Verified

- **`npm test`** checks all **64 main paths** (Mission 1 study/trip × 32 A/B combinations):
  - with **no recovery**: 23 thrive, 17 continue, 24 setback;
  - with the **best recovery**: 64 thrive;
  - no unwinnable path; every path is deterministic;
  - at least 40 different final bases;
  - the specific chains above;
  - save migration from version 1.
- **`node tools/ripple-paths.mjs`** prints every path whose ending depends on recovery.
- **`node tools/ripple-qa.mjs`** runs real Chrome playthroughs with walking, reaching all three endings:
  - R1 (all A, keep the plan) → setback;
  - R2 (same choices, relight the lamp) → thrive;
  - R3 (stuck robot rescued) → thrive;
  - R4 → continue;
  - R5 (Mission 1 "trip" prevents the stuck robot) → thrive;
  - R6: a reload in the middle in Arabic at 1024×640.

  Screenshots are in `qa-screenshots/ripple/`.

Still needed: children's playtesting, a science review of the wording, and tuning of the pretend rules.
