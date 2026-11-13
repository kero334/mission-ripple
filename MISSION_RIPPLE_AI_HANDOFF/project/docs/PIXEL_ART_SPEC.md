# Mission Ripple 2D — pixel worldbuilding specification

## Visual direction

The attached Mars settlement screenshot in `docs/reference/visual-target.png` is the composition and quality target. It is documentation only and is never loaded by the game. The playable scene is assembled from original separate transparent sprites, a 32 px terrain atlas, a 40 × 35 tile map, props, characters, effects, and a DOM HUD. The palette extends the Mission Ripple navy, orange, and teal with terracotta soil, cream metal, cyan glass, and gold lamps. Light falls from the upper left; dark contact shadows anchor equipment. Buildings use three quarter top down art, with the Habitat as the courtyard focus.

## Resolution and conventions

- Logical game resolution: 640 × 360, scaled to 1280 × 720 and 1920 × 1080 with Phaser FIT and integer pixel art settings. Canvas texture filtering is nearest neighbor and positions are rounded.
- Ground and interior floor modules: 32 × 32. Buildings are multi tile transparent PNGs, approximately 175–236 px wide. Astronaut frames: 38 × 48, four frames per facing direction. Nuri expression frames: 34 × 34. UI icons: 24 × 24.
- Sprite origins are bottom center. Depth follows the bottom of each object. Collision is narrower than visible artwork so doors remain usable. Background terrain, path, structures, props, characters, effects, and DOM HUD occupy separate render layers.
- Name convention: `<facility>-pixel.png`, `astronaut-<direction>-<frame>-pixel.png`, `nuri-<mood>-pixel.png`, `ui-<name>-pixel.png`. `public/assets/pixel-manifest.json` lists the purpose, dimensions, frame count, file, reuse scope, and production status of each rendered asset.
- `art-source/` keeps the editable high resolution source images. `tools/build_pixel_assets.py` normalizes them and rebuilds sprites, sheets, map tiles, equipment and icons. Once sources exist locally, the build script does not require the image generation service.

## World and character systems

The courtyard centers the Habitat with Power to the left, Greenhouse to the upper right, Water to the lower left, Research to the right, and solar arrays plus communications beyond. Command, Radiation Shelter, and Oxygen Lab occupy connected map extensions. Every facility has a visible door, a matching interior scene, an equipment target, and an exit. The exterior camera follows the astronaut with 0.8 zoom and eased movement, showing an 800 × 450 world-unit view at the 640 × 360 logical canvas size. Interiors return to 1.0 zoom so each room fits its authored frame. Nuri floats after the astronaut, changes expression, speaks concise bilingual teaching lines, and has no collision.

WASD or arrows move; Shift sprints; E interacts; M opens the map; J the journal; B the equipment preview; Esc the pause panel; L changes language. The orientation checklist uses real exploration, visit, inspection, and dialogue state. Resources are inactive until future mission systems exist, so no fictional NASA percentages are displayed.

## Future science mission seams

Stable facility IDs are defined in `src/world-data.ts`. Keep scientific arithmetic in deterministic state modules and feed the HUD actual outputs. Intended anchors: M01 Power and solar arrays, M02 Water Recovery, M03 Communications, M04 Radiation Shelter and Research, M05 Oxygen Lab and Greenhouse. Preserve NASA provenance separately from fictional training values. No science mission mechanics or audio generation were added in this art task.

## Production passes

1. Composition: checkpoint, map layout, ground atlas, camera, individual facility sprite placement; Chrome captures at both target resolutions.
2. Asset quality: nine original building sprites, astronaut directions, Nuri expressions, solar arrays, five priority room machines, modular terrain and props. Existing vector foundation remains archived.
3. HUD and integration: pixel panels and icons, bilingual orientation state, enter/exit and equipment flow, final Chrome screenshots and bounded QA.

See `docs/UNFINISHED.md` for genuine remaining fidelity differences and function gaps.
