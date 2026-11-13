# Decision register

Dates below say “undated” where the original decision date cannot be verified. User instructions and current implementation are the support, not fabricated meeting notes.

| ID | Date | Decision / reason | Affected systems | Status / evidence |
|---|---|---|---|---|
| D01 | undated | Browser Phaser 2D replaces 3D as active development path for illustrated exploration. | architecture/world | active; `package.json`, user request |
| D02 | undated | Preserve old 3D and science research read-only. | boundaries | active; user request |
| D03 | undated | Original high-detail pixel art; screenshot is comparison target, not runtime background. | art/renderer | active; `docs/PIXEL_ART_SPEC.md`, source |
| D04 | undated | Ages 7–12, English/Arabic, Nuri teaching role. | education/UI | active; user request, source |
| D05 | undated | Select missions from verified NASA/CSA findings before fiction. | science/campaign | active; `docs/MISSION_SELECTION_AND_SCIENCE.md` |
| D06 | undated | P2-M02 first vertical slice rather than P2-M01/P2-M08; stronger dated sequence and two scheduling choices. | mission | implemented; selection score table |
| D07 | undated | Keep direct rover measurements distinct from derived analysis, education copy and fictional scheduling. | science/state/UI | implemented; snapshot, cards |
| D08 | undated | Show immediate and later branch effects; store `nextShiftFlag`. | reducer/persistence | implemented; `mission.ts` |
| D09 | undated | Visual-first science cards; exact rows/provenance in optional drawer. | UX | implemented; `ui.ts` |
| D10 | undated | Three overlapping player motivations and non-manipulative rewards. | future progression | planned only; user design brief |
| D11 | undated | Do not invent human dose, shelter/resource calculations or causation. | all future science | binding; scientific limitations and user request |

Potential alternatives documented for D06 are P2-M01 log audit and P2-M08 missing hours; see selection report. Other alternatives or rationale not recorded should not be invented. The five original missions are contextual until evidence-backed content is approved. No NASA endorsement is implied.
