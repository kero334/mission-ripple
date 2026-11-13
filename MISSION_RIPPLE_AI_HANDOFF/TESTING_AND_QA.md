# Testing and QA

From `project/`, run `npm ci`, `npm run build`, then `npm run dev` and open desktop Chrome at `http://localhost:5182/`. The source's `npm test` script deliberately fails (`no test specified`); do not report that as a product regression. `node tools/camera-qa.mjs` runs against the Vite server. `node tools/science-qa.mjs` additionally needs the raw research package at its expected sibling path. `tools/pixel-qa.mjs` is a broader browser smoke script but has timed movement; `playtest.mjs` and `pixel-pass1.mjs` are obsolete.

Archived results: `qa-screenshots/science/results.json` has 23 passing checks, no errors, including exact source SHA/rows, unsupported claim rejection, field movement, branch effects, reload/replay and Arabic. `qa-screenshots/camera/results.json` has 6 passing checks, no errors, including 1280×720 and 1920×1080, smooth follow and room scale. Inspect screenshots in those folders plus `qa-screenshots/pixel/`. They are evidence of the state tested on the original computer, not guarantees after new edits.

QA route: launch → start mission → walk to field terminal → E → Research Lab E → Command Hub E → choose A → Communications E → debrief → reload → replay → repeat B → Arabic RTL → 720p/1080p camera → browser errors/missing assets. Check the external source hash and all selected measurement rows before scientific changes. Use normal navigation at least once; `window.__ripple.travel(id)` is only a test shortcut and does not verify door access.

The user-supplied AGENTS.md ARTEMIS mobile testing rules apply **when authoring mobile tests**. This handoff authors no new mobile tests and targets a desktop browser game; no Android device validation is claimed. Clean extraction/build results for the archive are in `HANDOFF_MANIFEST.json`.
