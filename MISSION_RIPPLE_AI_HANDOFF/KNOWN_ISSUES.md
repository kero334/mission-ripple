# Known issues and verification gaps

## P0 — before scientific or campaign expansion

- External scientific research package is absent from this portable ZIP. Game runtime uses its included snapshot, but source-row QA and regeneration require the separate research package. Do not claim independent science validation from integrity checks alone.
- `npm test` is a placeholder command that exits 1. Use focused QA scripts; design a real stable test entry when development resumes.
- Save loader checks only version/stage/choice, leaving malformed flags or numeric fields possible. Add full versioned validation before linking future missions to saved flags.

## P1 — important next work

- No observed child usability test for card text, icons, navigation or Arabic wording. The current UI is an implementation judged through automated Chrome QA.
- Art remains less detailed than reference in terrain variation, interior arrangement, walk-cycle registration and signs. See `project/docs/UNFINISHED.md`.
- World position, exploration history, locale and preferences do not persist; Journal/Map/Inventory are basic previews.
- No production localization extraction, screen-reader audit, color contrast report or Arabic bitmap font. Cairo/VT323 fonts depend on a web request for intended appearance.
- Browser QA scripts `tools/playtest.mjs` and `tools/pixel-pass1.mjs` refer to obsolete `BEGIN EXPLORING` UI. `tools/pixel-qa.mjs` uses timed movement and may be flaky. `tools/science-qa.mjs` assumes original research package nearby. Inspect before relying on any script.

## P2 — later polish / planned systems

- No active 2D audio, day/night cycle, advanced lighting, continuous machinery animation, usable inventory, physical resource simulation, science XP, badges, Science Passport, discoveries or three-level hint persistence.
- Only P2-M02 is implemented. The other four original campaign concepts and research opportunities are future work; some numeric variants are blocked by missing science parameters.
- `project/README.md` says 80 pixel assets, but manifest currently has 89. `project/docs/WORLDBUILDING_SPEC.md` and `public/assets/asset-manifest.json` describe an obsolete SVG/no-mission version.
- No Git history in active project; timeline relies on checkpoint names/documents and cannot certify every intermediate change.
- The Vite development server emitted warnings about JavaScript imports of JSON under `public/`; the clean production build and Chrome smoke launch passed. Future maintainers should resolve the warning before relying on a Vite upgrade.

No known Chrome runtime error was present in the captured final science/camera QA results. This does not exclude issues on untested devices or after dependency updates.


