# Mission Ripple 2D — AI handoff

This is the **13 November 2026** portable development handoff. Read [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md), [CURRENT_STATE.md](CURRENT_STATE.md), [NEXT_AI_INSTRUCTIONS.md](NEXT_AI_INSTRUCTIONS.md), and [KNOWN_ISSUES.md](KNOWN_ISSUES.md) in that order. The runnable source is in [project/](project/); its own README is useful but has some stale descriptions. [HANDOFF_MANIFEST.json](HANDOFF_MANIFEST.json) records contents and verification.

**Source of truth:** current `project/src/` and `project/public/` for implemented behavior; `project/src/science/evidence-v1.json` for the game's bounded NASA snapshot; the separate read-only scientific research package for original data and further science work. The previous 3D PlayCanvas game is historical reference only. Nothing in the originals was modified to make this handoff.

**Fast start:** Install Node.js compatible with Vite 8 (Node 20.19+ or 22.12+), run `npm ci` and `npm run dev` inside `project/`, then open `http://localhost:5182/`. See [README_RUN_INSTRUCTIONS.md](README_RUN_INSTRUCTIONS.md). First playable science mission: **The Rover Reading / P2-M02**. It is a science literacy and fictional scheduling exercise, not an astronaut dose simulator.

**Portable boundary:** This archive includes the full current game source, runtime art, editable art source, small NASA game snapshot, documentation, QA images and tools. It excludes the large original science research package, old 3D game, generated dependencies and historical checkpoint ZIPs. The game can run from this archive; independently rebuilding/verifying the NASA snapshot requires the separate research package at the path described in [NASA_SCIENCE_INTEGRATION.md](NASA_SCIENCE_INTEGRATION.md).
