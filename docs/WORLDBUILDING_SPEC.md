# Mission Ripple 2D worldbuilding specification

## Experience and art direction

The player is an Egyptian astronaut arriving at a shared Mars outpost. The current game loop is **walk → discover → enter → inspect → exit**. There are no failure states or mission mechanics. Nuri is one small, nonblocking, captioned robot companion who follows the astronaut, reacts to inspections, and remains visually present across scene transitions.

The viewpoint is three-quarter top-down. Terrain uses terracotta and sand contours; architecture uses warm ivory metal, deep navy recesses, steel shadows, orange safety lights, and teal science signals. Building rooflines and equipment silhouettes communicate purpose. The current assets are layered editable SVG artwork. They provide a cohesive illustrated prototype; see `UNFINISHED.md` for the hand-painting and animation polish still required.

Palette: navy `#101B31`, steel `#243E60`, orange `#F59E42`, teal `#39B9AF`, terracotta `#B95D46`, sand `#D79769`, pale metal `#E9E6D9`, shadow `#35283A`.

## Scale and assets

| Asset class | Native frame | Registration | Usage |
| --- | ---: | --- | --- |
| Exterior terrain | 2600×1800 | top left | one world plate |
| Exterior building | 330×185 | bottom center | 1.17 scale, sorted by foot position |
| Interior plate | 960×650 | top left | 1.5 scale to 1440×975 |
| Astronaut | 70×96 | bottom center | four directions, four walk frames each |
| Nuri | 86×80 | center near lower body | idle, speaking, happy, warning, thinking |
| Equipment | 115×95 or 145×95 | bottom center | exterior or interior reuse |

Regenerate source artwork with `python tools/generate_art.py`. The script writes `public/assets/{terrain,buildings,interiors,characters,equipment,props,effects,ui,animations}` and the manifest. Four-frame astronaut strips are included in `animations/`; the runtime loads individual registered SVG frames. Every asset is authored for this project. No third-party artwork is required. The Google font request is optional; the CSS has local fallbacks.

## World plan

The exterior is 2600×1800 world units. A north-south central road connects Command Hub, Oxygen Lab, and the field terminal. Three branch corridors on each side reach the remaining buildings. The hub is the first destination; after it has been entered, free exploration opens. Signs, lamps, rooflines, solar arrays, crates, antenna, rocks, and moving dust provide navigation and depth cues. Exterior colliders cover building bodies, solar arrays, and large rocks; the door target sits immediately outside each airlock.

| ID | Location | Future mission support | Visual cue |
| --- | --- | --- | --- |
| `command` | Command Hub | shared briefing | signal mast and orange ring |
| `habitat` | Habitat | M01 life support | large vaulted crew roof |
| `power` | Power Station | M01 energy | solar roof and lightning emblem |
| `greenhouse` | Greenhouse | M01 plants | glazed growing dome |
| `water` | Water Recovery | M02 water | reservoir roof and blue vessel |
| `comms` | Communications | M03 signal | dish and signal mast |
| `shelter` | Shelter & Research | M04 radiation | reinforced roof and shield emblem |
| `oxygen` | Oxygen Lab | M05 oxygen | twin circular process ports |

Every location has a walkable interior, a distinct wall/floor/furniture plate, separately placed reusable equipment, an inspect target, and an exit target. Scene changes use a short camera fade and restore the surface position. Interior layouts share the same 1440×975 coordinate system and entry at `(720,760)`; the equipment target is near `(720,580)` and the exit near `(720,865)`.

## Runtime contract

Phaser owns rendering, sprite playback, camera, and input. `world-data.ts` owns stable identifiers and bilingual content. The DOM layer owns text-heavy UI, map, pause menu, and RTL/LTR direction. The scene emits `ripple-state` and `ripple-dialogue` events to the DOM; UI sends `ripple-control` events back. Future simulation code should own resources, decisions, mission progression, and serializable state outside the Phaser scene. It should emit stable events and never infer game state from renderer objects.

Movement uses a capped frame delta, normalized diagonals, world bounds, and rectangle collision probes. The camera follows with smoothing and uses separate exterior and interior bounds. Nuri follows a damped offset; she has no collision body and cannot obstruct the astronaut. Depth uses the sprites' foot positions. The HUD stays at screen edges and switches `dir` when the language changes. Animation frames keep a bottom-center anchor. The astronaut's interaction currently uses a brief scale pulse; Nuri has face variants and an alternating speaking texture.

## Future mission integration

Use the eight `Building.id` values as semantic scene anchors. Add mission-specific equipment targets and presentation inside their own modules. Bind M01 to Habitat, Power Station, and Greenhouse; M02 to Water Recovery; M03 to Communications; M04 to Shelter & Research; M05 to Oxygen Lab. Command Hub may host cross-mission briefings. The old v3 reducer and source ledger can be evaluated for reuse only after its semantics are isolated from PlayCanvas; the present demo deliberately has no mission reducer. Preserve evidence provenance separately from training values and fiction. Resource status in this demo is illustrative static copy and must be replaced with reducer-driven values before a mission release.

## QA and performance

The final production check should cover 1280×720 and 1920×1080 in Chrome, keyboard and pointer controls, Arabic and English, collision boundaries, entrance/exit reachability, asset requests, FPS on an integrated GPU, and visual screenshot review. Current verification evidence is in `qa-screenshots/`. Artwork stays SVG so individual parts remain editable and scale cleanly; raster exports may be made later if SVG decode cost becomes material.
