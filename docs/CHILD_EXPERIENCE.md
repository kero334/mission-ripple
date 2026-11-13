# Child experience layer — The Rover Reading (P2-M02)

Updated 14 Nov 2026. This document describes what is **implemented and tested** in the game. It does not
claim any child usability testing: that is still pending (see `CHILD_TESTING_PROTOCOL.md`).

## 1. Learning flow: one idea per screen

Each science interaction is a short run of **Nuri scenes**, rendered by `renderScene()` in `src/ui/shell.ts`. Every scene has:

- **one big picture:** an illustration, the real-data chart, or a simple visual such as robot ✓ / base ?;
- **one Nuri line**, one or two short sentences, with optional "Tell me more" for one extra sentence;
- **one big button.**

There are no step bars, tag rows or information boxes. A small corner stamp marks **REAL NASA DATA** or
**PRETEND PLAN**. Exact values, units, UTC times, IDs, the SHA-256 and the NASA link sit in a small
"For grown-ups" drawer at the bottom. Each sequence ends with a **What's next** scene: a picture of the next
building and "LET'S GO!". The objective tracker then updates, so every step shows what happened, then why,
then what's next.

| Place (stage) | Scenes |
|---|---|
| Glowing screen (`monitor`) | This is Curiosity → RAD measures radiation → tap where the dots jump up (real chart) → next: Research Lab |
| Research Lab (`research`) | 20 May vs the day before (real chart) → robot measured outside ✓ / base ? → why? we don't know yet → lots of dots for about 14 h → next: Command |
| Command Hub (`command`) | Pick a plan: two big picture buttons, each with a ✓ gain and a ⏸ wait → which clue helped? (optional) → "You chose X. So right now, Y." → next: Communications |
| Communications (`nextShift`) | "Because you chose X, Z! But …" → REAL (NASA chart) vs GAME (base) side by side |
| Debrief | Big idea → quick question 1 (optional) → quick question 2 (optional) → Mission complete (+XP, badges, PLAY AGAIN) |

Mission stages and both decisions are unchanged: they still go only through `transition()` in
`src/science/mission.ts`. While a card is open the HUD panels hide (`body.modal-open`), so only the card is on
screen. Reward pop-ups show "+XP" and the badge only.

**HUD:**
- **Top left:** one task line (beacon icon, task and place) plus HELP. START or PLAY AGAIN appears only when relevant.
- **Top right:** one XP chip.
- **Bottom:** Nuri's dialogue box, plus map / passport / settings buttons. The decorative toolbar and the
  inactive resource rows were removed.

## 2. Writing rules (enforced by `npm test`)

- One idea per line. Each sentence has at most 14 words.
- **Every screen** is checked in Chrome by `experience-qa.mjs`: one Nuri line of at most 2 sentences, at most
  one main button, and no step bar, tag rows or info boxes.
- No jargon in anything a child reads first. Words like µGy, UTC, median, dataset, absorbed, dose
  equivalent, catalog and simulation are blocked.
- No decimals or big numbers in child text. The peak shows as "about 300". Exact values are only in the
  grown-ups drawer.
- Never "safe" or "unsafe" for a reading. The counting line is labelled "not 'safe' or 'unsafe'".
- All words live in `src/content/strings.ts` (English and simple Egyptian Arabic). Tests check that every
  text has both languages and that the `{placeholders}` match between them.

## 3. Real evidence graphics

- `src/ui/chart.ts` draws **every retrieved row** for 20 May 2024 (139 dots) and 19 May (82 dots) from
  `src/science/rad-series-v1.json`.
  - Dots are joined only to the next real reading. Nothing is smoothed or filled in.
  - A gap of more than 1 h would be left empty and labelled; none exists on these two days.
- **The child task:** tap the part of the day where the dots jump up. The "change" window is not hard-coded.
  It is the window that contains the steepest real rise (05:38:56 → 05:48:02 UTC).
- **Second look:** the researchers' 30 µGy/hour counting line is dashed. 92 dots above it, about 14 hours.
- **The two-day comparison bars** use the real day medians and are drawn to scale (19 May ≈ 9 % of 20 May).
- **Animation:** the line draws itself from left to right the first time a chart appears.
- **Accessibility:** each chart has a full text description (`<desc>` and screen-reader text).

## 4. Guidance and Nuri

- **Objective tracker** (top left): NOW (task), WHERE (place), WHY, progress pips, MISSION and HELP (H)
  buttons. It comes from `OBJECTIVES` and the mission stage.
- **World guidance** (`src/game/guidance.ts`, drawn in `src/scene.ts`):
  - a bobbing yellow arrow-beacon and a ground ring on the current target;
  - a screen-edge arrow when the target is off screen;
  - inside the wrong room the beacon points at the exit;
  - inside the right room it points at the machine.
  - In "I'll explore on my own" mode the beacon only shows near the target, or for 12 s after help.
- **Prompts** use verbs, not "Interact": "Look at the robot's data", "Make a plan", and so on. When the
  child is close but not in range, the prompt says "Walk a little closer to the screen". Nuri's own prompt
  only appears after 5 s of standing still.
- **Nuri lines depend on the situation:**
  - arriving at the goal;
  - entering the wrong building ("This is the Power Station. Our clue is in the Research Lab!");
  - pressing E with nothing near (twice);
  - trying a later step too early ("Make your plan in Command first!");
  - leaving a room mid-mission;
  - reviewing a finished step;
  - the first XP earned;
  - the first bonus fact.
- **Help panel** (H, the HELP button, talking to Nuri, or "?" inside a card) shows **one Nuri bubble at a time**.
  Pressing MORE HELP replaces it with the next level:
  - **Level 0:** the goal.
  - **Level 1:** where to go. Includes SHOW ME, which pans the camera to the target and back.
  - **Level 2:** how to do it.
  - **Level 3:** a thinking question. It never names a plan as the right one. On chart scenes,
    "SHOW ME ON THE GRAPH" highlights the real rise.
  - Opened over a card, levels 0–2 describe that card.
  - Levels are saved per objective. Asking for help never changes XP.
- **Help offers:** after 45 s without progress ("Show me the way" mode; 120 s in "I'll explore on my own"),
  or after two wrong buildings, the HELP button bounces and Nuri says "Need help? Press H!". Nothing opens
  by itself.
- **Pause handling:** all overlays share one modal stack (`modals` in `src/ui/shell.ts`).
  - Esc closes the top overlay first.
  - M, J and B are ignored while a science card is open.
  - Closing one overlay can no longer unpause the world behind another.

## 5. Rewards (Science XP, badges, Science Passport)

- **Configuration:** `src/game/rewards.ts`. These are game balance values, not science.

  | Action | XP |
  |---|---:|
  | New evidence | 10 |
  | Correct observation | 15 |
  | Explain a choice with evidence | 20 |
  | Revise or extend a conclusion | 15 |
  | Complete the mission | 30 |
  | Optional discovery | 10 |

  The maximum is 210 XP. Titles: Junior Researcher (0) → Data Observer (40) → Evidence Detective (90) →
  Science Investigator (140) → Mars Explorer (200).
- **10 badges:**
  - **Mission:** First Clue, Evidence Detective, Careful Scientist, Second Look, Big Thinker,
    Mission Complete, Clue Master, Two Paths.
  - **Exploring:** Outpost Explorer, Curious Mind.
- **No XP farming:** every reward is a stable event ID that pays once.
  - XP is recomputed from the set of awarded IDs (`src/game/progress.ts`), so reloading, replaying,
    reopening a card or editing the save cannot add XP.
  - Both plans earn the same rewards. Seeing both unlocks Two Paths.
- **Science Passport** (J, or the XP chip at the top right). It suggests what to try next, using the
  optional "What do you like most?" choice in Settings, which can be changed at any time.
  - **BADGES:** XP, title and progress bar, badges (locked ones show how to earn them), and Nuri's light
    color (cosmetic).
  - **MISSIONS:** the current task, the steps, three extra challenges, and the plans tried (A and B).
  - **CARDS:** 12 science cards (6 from the mission and 6 bonus facts) with "for grown-ups" details and
    NASA links, plus the 9 places.
- **Bonus facts** (Explorer). They are optional and source-linked (`src/game/exhibits.ts`,
  `src/science/exhibits-v1.json`):

  | Bonus fact | Place | Findings |
  |---|---|---|
  | Data Detectives | Research Lab, left screen | P2-RAD-08, P2-RAD-01 |
  | A Usual Day on Mars | Radiation Shelter, right screen | P2-RAD-02 |
  | The Sun Storm List | Command Hub, left screen | SCI-0003; says "same time does not prove cause" |
  | Different Places, Different Readings | Habitat, left screen | SCI-0002 |
  | Growing Food in Space | Greenhouse, left plants | P2-CSA-01; credits the Canadian Space Agency; says "our plants are pretend" (no measured Mars harvest in the evidence) |
  | A Map of Mars | Communications, left dish | P2-TREK-01; says "the colors are a picture, not exact heights" |

  The Power Station, Water Recovery and Oxygen Lab only describe the pretend outpost. They don't have a
  science system yet, so the game doesn't pretend one exists.

- **Child safety:** no leaderboards, timers, streaks, random rewards, purchases or sharing. Progress stays
  in this browser's localStorage.

## 6. Save data

- **Mission save** (`mission-ripple-science-v1`): the same format as before.
  - `loadMission()` now repairs broken saves instead of trusting them. Booleans and flags are rebuilt from
    the stage, and a later stage without a choice goes back to `command`.
  - The original text is kept under `mission-ripple-science-v1.backup`.
- **Progress save** (`mission-ripple-progress-v1`): awarded event IDs, places, bonus facts, plans seen,
  settings (language, help style, preference, Nuri light), help levels, and simple local counters (help
  requests, wrong places, misses, help offers). Nothing about the child as a person is stored.
- **Older saves:** a mission save made before this update is migrated once into the passport (plan seen,
  Mission Complete) and is never deleted.

## 7. What is fictional

The outpost and the crew; the robot survey ("robot trip"); the team's one job time
(`simulatedWorkSlotsUsed`); "next shift"; the A/B outcomes; XP, titles and badges; Nuri. The game calculates
no dose, no health effect, no safety level and no cause.

## 8. Files

- **New:**
  - `src/content/strings.ts`, `src/content/discoveries.ts`
  - `src/game/{rewards,progress,guidance,exhibits}.ts`
  - `src/ui/{shell,chart,panels}.ts`
  - `src/science/series.ts`, `src/science/rad-series-v1.json`, `src/science/exhibits-v1.json`
  - `src/fonts.css` and `public/fonts/` (self-hosted Cairo and VT323 fonts, SIL OFL)
  - `public/assets/{badges,science,guide}/`, `public/assets/experience-manifest.json`
  - `tools/build_experience_art.py`, `tools/build_science_series.mjs`
  - `tools/unit-tests.mjs`, `tools/experience-qa.mjs`, `tools/qa-lib.mjs`, `tools/smoke.mjs`
- **Changed:** `src/main.ts`, `src/scene.ts`, `src/science/ui.ts`, `src/science/mission.ts` (save repair
  only), `src/world-data.ts` (simpler building notes), `src/style.css`, `index.html`, `package.json`
  (scripts), `tools/science-qa.mjs`, `tools/camera-qa.mjs`.
- **Rendering:** the canvas is now 1280×720 with exterior zoom 1.6 and room zoom 2. The world view is the
  same as before (800×450 outside, 640×360 in rooms), but signs and text get twice the pixels.
- **JSON loading:** JSON in `public/` is loaded at runtime by Phaser, which fixes the Vite
  "public directory" warning.

## 9. Commands

`npm test` · `npm run build` · `npm run dev` · `npm run qa:experience` · `npm run qa:science` ·
`npm run qa:camera` · `npm run build:science-snapshots` (reads the research package) ·
`npm run build:experience-art` (Python and Pillow).
