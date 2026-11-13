# Project handoff

Mission Ripple is a browser-based, bilingual Mars outpost exploration and evidence-based decision game for ages 7–12, developed in a NASA Space Apps educational context. The learning loop is **Real NASA data → Scientific discovery → Playable mission → Meaningful decisions → Consequences → Learning**. Children move through a detailed illustrated pixel-art settlement with an Egyptian astronaut and Nuri, a friendly floating robot teacher. Evidence is source-linked; invented work schedules are visibly labeled as training-game decisions.

The team moved from the earlier PlayCanvas 3D prototype to a new 2D Phaser project to make a coherent illustrated, navigable world. A later user-supplied screenshot set a high-detail modern pixel-art target. The screenshot is preserved at `project/docs/reference/visual-target.png` and is **never loaded as a game background**. The current world is original separate terrain, building, character, equipment and UI assets, with some unfinished art noted in [VISUAL_STYLE_AND_ASSETS.md](VISUAL_STYLE_AND_ASSETS.md).

The current game has one completed vertical slice, **The Rover Reading (P2-M02)**. The five-location campaign concept (solar energy/dust, water recovery, communications delay, radiation safety, oxygen production) remains a vision, not five implemented missions. Science selection now follows available NASA/CSA evidence; future campaign changes require explicit design review. Immediate consequences are a changed fictional work schedule; the later Communications phase reads a persisted branch flag. No physical resource use or astronaut health is calculated.

## Boundaries and locations

| Role | Original computer | Portable status |
|---|---|---|
| Active 2D game | `C:\Users\ASUS\Downloads\nasa_video\mission-ripple-2d` | Included as `project/` |
| Full scientific package | `C:\Users\ASUS\Downloads\nasa_video\NASA-Science-to-Mission-Engine\MISSION_RIPPLE_COMPLETE_SCIENTIFIC_DATA` | External, read-only; bounded game snapshot included |
| Research project | `C:\Users\ASUS\Downloads\nasa_video\NASA-Science-to-Mission-Engine` | External, read-only |
| Previous 3D game | `C:\Users\ASUS\Downloads\nasa_video\mission-ripple-playcanvas-poc` | External, historical, read-only |
| Historical checkpoints | `C:\Users\ASUS\Downloads\nasa_video\mission-ripple-2d-checkpoints` | External, listed in inventory |

Read [ARCHITECTURE.md](ARCHITECTURE.md), [MISSIONS_AND_STORY.md](MISSIONS_AND_STORY.md), and [SOURCE_AND_EVIDENCE_MAP.md](SOURCE_AND_EVIDENCE_MAP.md) for implementation and provenance. Dates and historical facts without documentary proof are deliberately left undated.
