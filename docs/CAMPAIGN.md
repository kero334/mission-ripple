# Mission Ripple campaign — the base story (updated 14 Nov 2026)

After **The Rover Reading (P2-M02)**, the tracker offers **NEXT MISSION**, which starts five more missions in one
connected story. Every mission follows a research-package candidate and uses that candidate's own A/B decision
design and delayed flag (`05_MISSION_EVIDENCE/decision_evidence.json`). Code: `src/missions/campaign-data.ts`
(content), `src/missions/campaign.ts` (engine and save), `src/game/base-sim.ts` (pretend meters).
Evidence snapshot: `src/science/campaign-evidence-v1.json`, built by `tools/build_campaign_snapshot.mjs` from the
read-only package.

## Missions

| # | Mission | Places | Real evidence (what the child sees) | Decision (package ID) | Delayed effect (shown at the start of the next mission) |
|---|---|---|---|---|---|
| 1 | The Rover Reading | Glowing screen → Research → Command → Communications | Curiosity RAD, 20 May 2024 (P2-RAD-04/05/07/08) | P2-M02A / B | Same mission (Communications) |
| 2 | Fix the Robot's Notebook | Research Lab → Command | Real same-time RAD rows from 2016-06-02 (P2-RAD-08) and a real 2-hour gap from 2024-01-06 (P2-RAD-06) | Fix gaps later (P2-M08A) / Keep going, mark gaps (P2-M08B) | `log_repair_planned` / `partial_series` |
| 3 | Sun Storm Watch | Communications → Radiation Shelter | NASA DONKI, May 2024: 181 flares; strongest X8.7 on 14 May (SCI-0003); "a Sun list is not a Mars measurement" | Watch and check (P2-M03A) / Keep doing science (P2-M03B) | `watch_prepared` / `unresolved_alert` |
| 4 | Plant Detectives | Greenhouse → Command | NASA OSDR OSD-615: 6 space-flight and 6 ground-control samples (P2-OSD-615); no Mars yield in the evidence (also P2-CSA-01 bonus fact) | Keep a control tray (P2-M05A) / Use all trays (P2-M05B) | `plant_control_ready` (+1 pretend food) / `plant_comparison_missing` |
| 5 | Share the Power | Power Station → Command | NASA Mars Trek MOLA colour layer: "colours are a picture, not exact heights" (P2-TREK-01) | Scout first (P2-M07A) / Short route now (P2-M07B) | `route_recon_done` / `route_uncertainty` (−1 pretend power) |
| 6 | The Base Plan | Command | Dose equivalent is missing from the rover export (P2-RAD-07); saying "we don't know" is good science | Share plan + questions (P2-M10A) / Pause, ask for data (P2-M10B) | Ending text |

Each mission has the same shape:
1. Nuri introduces a problem, and the tracker plus the yellow beacon show where to go.
2. At the machine, real evidence is shown as a picture, one idea per screen, with a quiz or tap activity.
   - A wrong answer gets a friendly "try again" and costs nothing.
   - The right answer is praised and pays XP once.
3. "What's next" sends the child to the next building.
4. The decision screen has two big picture buttons, each with a ✓ gain and a ⏸ wait.
5. "You chose X. So Y." shows the meter change.
6. A lesson screen with a badge and XP follows.
7. The next mission opens with "Because you chose X, Z".

## Pretend base meters (game rules, not NASA data)

Power, Water, Air and Food are whole blocks from 0 to 5, and each starts at 3. They are shown in the HUD as
**PRETEND BASE**, and every meter screen is stamped **PRETEND PLAN**.

Effects:
- Fix gaps later: −1 power.
- Watch and check: −1 power.
- Use all trays: +1 food now.
- Keep a control tray: +1 food later.
- Share the power (spare blocks): air +2, water +2, or one each.
- Scout first: −1 power.
- Short route: −1 power later.
- Pause and ask: +1 power.

Unit tests enumerate all 32 choice paths and check that every meter stays within 0–5. The research package
has **no validated parameters** for habitat power, oxygen, water or crop yield (blocked candidates
MIS-B01/B02/B03 and P2-BLOCK-01/02/03), so no meter is ever presented as a measurement. The ending text only
says which pretend meter was lowest.

## Supported, partial and blocked

- **Implemented (evidence-backed qualitative missions):** P2-M02, P2-M01 + P2-M08, P2-M03 (with MIS-003),
  P2-M05 (with P2-M06 / CSA as a bonus fact), P2-M07, P2-M10.
- **Not implemented yet (supported, but would repeat lessons):**
  - P2-M04 (one robot, two jobs)
  - P2-M06 as its own mission (food inventory)
  - P2-M09 (competing science windows)
  - MIS-001, MIS-002 (partly covered by bonus facts), MIS-004
  - P2-EDU-01, P2-EDU-02
- **Blocked, and not implemented as science:**
  - Rover slope/energy (MIS-B01, P2-BLOCK-01)
  - Greenhouse yield/water loop (MIS-B02, P2-BLOCK-02)
  - Shelter protection / human dose (MIS-B03, P2-BLOCK-03)

  These topics appear only as pretend meters or honest "we don't know" lines.

## Save, replay, rewards

- **Save:** `mission-ripple-campaign-v1` (version 1) stores the index, step, choices, flags, meters, revealed
  delayed effects and power sharing. `sanitizeCampaign()` repairs bad data. It is separate from the P2-M02 and
  progress saves.
- **Rewards:** five new badges (Notebook Keeper, Sun Watcher, Plant Scientist, Power Planner, Base Commander)
  and two new titles (Base Scientist 300 XP, Mars Commander 450 XP). Every reward is a once-only event ID.
- **Replay:** "Play the base story again" resets the story but keeps earned rewards. The Passport → Missions
  tab lists all six missions and the plans chosen.

## Tests

- `npm test`: 44 unit tests, including campaign decision IDs vs the package, quiz answers, meter bounds over all
  32 paths, save repair, real CSV rows for the notebook and gap, and the text rules.
- `node tools/campaign-qa.mjs`: real walking through all missions on path A and path B, the delayed effects,
  reload mid-campaign, Arabic at 1024×640, and the help/Esc order.
- `node tools/campaign-tour.mjs [dir] [en|ar]`: screenshots of every scene.

Still needed: playtesting with real children, and a science review of the wording of each lesson.
