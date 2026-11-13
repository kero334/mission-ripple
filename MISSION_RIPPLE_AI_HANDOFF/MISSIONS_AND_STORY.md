# Missions and story

The astronaut explores a fictional Mars settlement with Nuri, who teaches evidence-based reasoning. The original five-place campaign vision was: 01 solar energy/dust storm, 02 water recovery, 03 communication delay, 04 radiation safety, 05 oxygen production. Those are design anchors, not completed missions. The evidence pipeline now chooses missions from supported findings, and the current P2-M02 vertical slice does not map one-to-one onto the old numbering.

## Implemented mission: The Rover Reading / P2-M02

| State / objective | World action | UI result |
|---|---|---|
| `ready` / begin | Click Start Science Mission in mission panel | Nuri briefing; saved stage `monitor` |
| `monitor` / courtyard monitor | Walk to field terminal; E, then `monitor-reviewed` | Three-bar rover sequence, real NASA scope and source drawer; stage `research` |
| `research` / Research Lab record | Enter Research, E at equipment, then `research-reviewed` | Day comparison, about-14-hour pattern, unknowns; stage `command` |
| `command` / schedule | Enter Command, E at equipment | Two illustrated decision cards |
| `nextShift` / later effect | Decision produces immediate card; visit Communications equipment with E | Branch-specific later brief; `next-shift-reviewed` → `debrief` |
| `debrief` / explanation | Read evidence/unknown/game-choice cards; `finish` | `complete` persisted |
| `complete` | Mission button | Replay resets and restarts; world remains explorable |

World interaction event details are `{kind:'field'|'equipment'|'door'|'exit'|'nuri', buildingId}`; mission progression listens to `field`, then `equipment/research`, `equipment/command`, `equipment/comms` at matching stages. HUD objective labels are stage-based, with **no separate objective ID strings** in current code. Mission IDs: P2-M02, P2-M02A/B in source snapshot design; actual reducer actions are `review-defer` / `survey-followup`. Evidence ID `RAD-MAY20-2024`; finding IDs P2-RAD-04, -05, -07, -08; event `P2-EVT-RAD-MAY20`. See [SOURCE_AND_EVIDENCE_MAP.md](SOURCE_AND_EVIDENCE_MAP.md).

**A / `review-defer`**: fictional optional robot survey waits; one fictional work slot reviews trend; stored flag `trend_reviewed`. At next shift, notes are ready but survey remains pending. **B / `survey-followup`**: optional survey stays; another reading queued; stored flag `followup_reading_due`. At next shift, question remains open pending that reading. Both set `simulatedWorkSlotsUsed=1`. The slot is game scheduling only, not measured NASA time, radiation protection, energy or health. The original rover readings never change. The later effect appears within the same mission and the flag remains available to future missions, which are not yet implemented.

Source architecture: `src/science/mission.ts`, `src/science/ui.ts`, `src/science/evidence-v1.json`; tests `tools/science-qa.mjs` and `qa-screenshots/science/results.json`. Exact card copy and state guards are in source. There is no verified voice for these new lines.
