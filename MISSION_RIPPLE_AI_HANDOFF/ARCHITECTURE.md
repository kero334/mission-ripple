# Architecture

The app is a Vite 8 + TypeScript 7 client. Phaser 3.90 renders the world; a DOM/CSS HUD renders menus and science cards. `index.html` mounts the app through `src/main.ts`. `src/scene.ts` imports `world-data.ts`, `public/assets/pixel-manifest.json` and the 40×35 tile map. `src/science/mission.ts` imports a versioned JSON evidence snapshot and implements deterministic transitions. `src/science/ui.ts` connects world interactions to mission cards and state. All paths below are relative to `project/`.

| System / purpose | Main entry and functions | Dependencies, state/events, extension |
|---|---|---|
| World renderer and navigation | `src/scene.ts`: `MarsScene.preload/create/update`, `buildExterior`, `buildInterior`, `changeScene`, `interact`, `move`, `snapshot` | Phaser + asset manifest/map. `GameState` tracks room, visited, inspected, Nuri, courtyard, nearest, pause, locale, position in memory. Emits `ripple-state`, `ripple-dialogue`, `ripple-world-interaction`; consumes `ripple-control`. Extend via stable building IDs and target kinds, test collision/entry. |
| Facility data and bilingual base copy | `src/world-data.ts`: `BUILDINGS`, `WORLD_W/H`, `SPAWN`, `STRINGS` | Nine stable IDs, equipment names, scene coordinates. New facility needs art, map space, collisions and locale. |
| HUD and menus | `src/main.ts`: `render`, `renderPanel`, `openPanel`, `switchLocale` | DOM `index.html`, CSS, `GameState`, science UI. Resource rows inactive; map textual, journal basic. Button handlers emit `ripple-control`. |
| Science state | `src/science/mission.ts`: `initialMission`, `transition`, `loadMission`, `saveMission`, `objective`, `validateEvidenceRecord` | Pure reducer + localStorage key `mission-ripple-science-v1`; imported evidence frozen. New mission should use separate ID/version and validate provenance. Save validation is shallow beyond stage/choice. |
| Science card UI | `src/science/ui.ts`: `setupScienceUI`, internal `renderHud`, `renderCard`, `act` | World interaction event; mission reducer; DOM. Cards and Nuri prompts are bilingual. Add cards without writing facts that exceed snapshot scope. |
| Styling/assets | `src/style.css`, `public/assets/`, `art-source/`, `tools/build_pixel_assets.py` | Nearest-neighbor Phaser pixel rendering, DOM HUD. Asset manifest references runtime files; use generation tool only when regenerating and verify output. |

Logical canvas is 640×360 with Phaser FIT; world is 1280×1120 at 32-pixel tiles. Exterior camera zoom is 0.8 with eased follow 0.09 and Y offset 25; rooms use zoom 1 and 640×360 bounds. Depth generally follows sprite Y; shadows and tile layers sit behind, HUD above. The scene rebuilds environment objects at room transitions while retaining player/Nuri. The general world state is not persisted.

`window.__ripple` and `window.__mission` are QA hooks. Their `travel`/`replay` methods bypass normal play and should not be used as evidence that navigation works. See [GAMEPLAY_SYSTEMS.md](GAMEPLAY_SYSTEMS.md), [SAVE_STATE_AND_PROGRESS.md](SAVE_STATE_AND_PROGRESS.md), and project docs for detail.
