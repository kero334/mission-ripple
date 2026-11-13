# Mission Ripple 2D — pixel Mars outpost

Playable Phaser 3 / TypeScript exploration game built from original separate pixel assets. It now includes one NASA evidence-driven mission, **The Rover Reading**. The original PlayCanvas 3D project and the external scientific package are read-only and were not modified. The attached art reference is stored in `docs/reference/` for visual comparison, never loaded as the game world.

## Run

```powershell
npm install
npm run dev
```

Open [http://localhost:5182/](http://localhost:5182/) in desktop Chrome. `npm run build` creates the production bundle. `python tools/build_pixel_assets.py` rebuilds the pixel assets and manifest from checked-in art source and the procedural source generator.

## Explore

Move with WASD or arrows; hold Shift to sprint. Press E at doors, equipment, or Nuri. M opens the map, J the journal, B the equipment preview, Esc the pause and settings panel, and L switches English / Arabic. All nine facilities can be entered and left. The Habitat, Greenhouse, Power Station, Water Recovery, and Research Lab have distinct main equipment. The opening orientation checklist reflects actual play state. Resource systems remain inactive until science missions are implemented.

Click **Start Science Mission** in the top-left panel. Walk to the courtyard field terminal and press E, examine the real Curiosity RAD readings, then inspect equipment in Research Lab, Command Hub, and Communications. Choose how to use one fictional crew-work slot. The next-shift result and debrief depend on that choice. Mission state saves locally and can be replayed. The research readings are rover measurements, not an astronaut or habitat dose.

The science mission now teaches through illustrated pixel cards: **See → Understand → Choose → Result**. Nuri gives one short idea at a time. Exact measurements and provenance remain available in each card’s optional NASA source drawer.

## Structure

- `src/scene.ts`: layered tile world, camera, collision, sprite animation, Nuri, interiors and interactions.
- `src/world-data.ts`: facility identities, bilingual copy and mission anchors.
- `src/main.ts`, `src/style.css`, `index.html`: RPG style HUD, real orientation state, menu panels and locale.
- `art-source/`: editable original source images.
- `tools/build_pixel_assets.py`: reproducible normalization and procedural pixel asset pipeline.
- `public/assets/pixel-manifest.json`: dimensions, frames, purpose, location, scope and status for 80 assets.
- `public/assets/terrain/world-map.json`: 40 × 35 tile map.
- `docs/PIXEL_ART_SPEC.md`: art, scale, world, animation and mission integration conventions.
- `docs/UNFINISHED.md`: open fidelity and feature gaps.
- `src/science/`: immutable versioned NASA evidence snapshot, deterministic mission reducer, bilingual in-game evidence and decision UI.
- `tools/build_science_snapshot.py`: reproducible subset extraction from the read-only research package.
- `tools/build_science_icons.py`: original pixel icons for the visual science cards.
- `docs/MISSION_SELECTION_AND_SCIENCE.md`: evidence-based mission choice and alternative scores.
- `docs/SCIENCE_MISSION_ARCHITECTURE.md`: provenance, stage, ripple and scientific limits.
- `qa-screenshots/pixel/`: before / pass / final Chrome images and final check result.

## Verification

Run `node tools/pixel-qa.mjs` while the Vite server is active. It launches desktop Chrome, captures 1280 × 720 and 1920 × 1080, walks to the Habitat and enters with E, inspects equipment, exits, smoke checks every other interior, and checks menu panels and Arabic RTL. See `qa-screenshots/pixel/final-results.json`.

Run `node tools/science-qa.mjs` for source-row comparison, mission choices, persistence, Arabic, and Chrome screenshots in `qa-screenshots/science/`.

The other planned science missions remain future work: solar energy and dust, water recovery, communication delay, and oxygen production. The HUD uses no invented NASA measurements or unsupported survival calculations.
