# Current state and acceptance

These labels describe code and captured QA evidence available at packaging time. QA is automated browser evidence, not a child usability study or independent scientific certification.

| Feature | Status | Evidence and boundary |
|---|---|---|
| Phaser pixel-art exterior, nine buildings, paths, collision, movement and camera | COMPLETE AND VERIFIED | `project/src/scene.ts`, `project/src/world-data.ts`; Chrome camera QA 6/6 at 720p and 1080p |
| Nine enterable interiors and equipment | COMPLETE AND VERIFIED | `project/src/scene.ts`; priority five have distinct large equipment; art polish remains |
| Astronaut four-direction walk, Nuri float/follow/moods | COMPLETE AND VERIFIED | `project/src/scene.ts`; animation polish remains |
| P2-M02 mission including both choices, next-shift result, debrief, replay, local save | COMPLETE AND VERIFIED | `project/src/science/`; science QA 23/23 |
| Bilingual English/Arabic UI and visual science cards | COMPLETE AND VERIFIED | `project/src/main.ts`, `project/src/science/ui.ts`; automated RTL check, no child usability study |
| Resource panel, Sol label, equipment toolbar | PARTIALLY IMPLEMENTED | UI exists; values are inactive dashes, Sol 001 demo label, item use absent |
| Mission journal and outpost map | PARTIALLY IMPLEMENTED | Basic stage/choice journal and text facility list; no full discovery journal |
| Save system | PARTIALLY IMPLEMENTED | P2-M02 stage/choice/flag localStorage only; position, exploration, locale and broader campaign do not persist |
| Contextual assistance | PARTIALLY IMPLEMENTED | Objective marker, interaction prompt and Nuri lines; no three-level hint engine |
| Science XP, badges, Science Passport, preference types, anti-farming, cosmetics | PLANNED | No source implementation found |
| Remaining campaign missions, validated physical resource simulation | PLANNED / BLOCKED | Mission concepts exist; quantitative simulations blocked where scientific parameters absent |
| Voice narration/audio | PLANNED | No audio runtime/assets in active 2D project; prior 3D work must not be assumed reusable without matching files |
| Pre-pixel SVG presentation | DEPRECATED | `project/docs/WORLDBUILDING_SPEC.md` and old SVG manifest describe earlier state |

## Current acceptance evidence

`project/qa-screenshots/science/results.json` records 23 passing checks and no browser errors, including source hash/row comparison, stage traversal, two decisions, persistence/replay and Arabic. That source comparison requires the external research package when rerun. `project/qa-screenshots/camera/results.json` records 6 passing checks and no browser errors at 1280×720 and 1920×1080. The captured screenshots are included. Build results for this portable copy are recorded in `HANDOFF_MANIFEST.json`.

See [KNOWN_ISSUES.md](KNOWN_ISSUES.md) for gaps, [ROADMAP_AND_PRIORITIES.md](ROADMAP_AND_PRIORITIES.md) for next work, and [TESTING_AND_QA.md](TESTING_AND_QA.md) for commands and limits.
