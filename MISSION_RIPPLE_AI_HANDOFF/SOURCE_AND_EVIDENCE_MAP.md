# Source and evidence map

| Level | ID / path | Meaning and usage |
|---|---|---|
| Original NASA source | RadLab `MSL-RAD-Surface`, research `01_ORIGINAL_DATA/RADLAB/phase2/MSL_RAD_surface_2024.csv`; SHA-256 `baea6261262f499f02259fbfba986973038c88a7b03f4f1b2136d6e346132a11` | Direct Curiosity surface detector rows in µGy/hour; source URL `https://visualization.osdr.nasa.gov/radlab/gui/data-api/` |
| Researcher analysis | research `03_SCIENTIFIC_ANALYSIS/radiation/may_2024_radlab_case.json` | Episode and median analysis; derived, not direct measurements |
| Finding IDs | `P2-RAD-04`, `P2-RAD-05`, `P2-RAD-07`, `P2-RAD-08` | Peak, sustained sequence, missing dose equivalent and duplicate-row caveats; see research evidence matrix |
| Event ID | `P2-EVT-RAD-MAY20` | Dated observed case, not established solar cause |
| Mission | `P2-M02` / The Rover Reading | Game's evidence-led mission; selection rationale in `project/docs/MISSION_SELECTION_AND_SCIENCE.md` |
| Decision IDs | `P2-M02A`, `P2-M02B` in snapshot; reducer actions `review-defer`, `survey-followup` | Fictional schedule, not NASA measurement |
| Game subset | `project/src/science/evidence-v1.json`, schema 1, snapshot `radlab-may20-v1`, evidence `RAD-MAY20-2024` | Ten direct rows, derived case, bilingual explanation, limitations and provenance; immutable during play |

The scientific package includes `05_MISSION_EVIDENCE/mission_evidence_matrix.csv`, `04_VERIFIED_DISCOVERIES`, candidate mission graphs and blocked cases. Source registry authorizes NASA Open APIs, DONKI, OSDR, RADLAB, MARS_TREK, CSA_STEM and CSA_FOOD. The package is **not copied here** because runtime only needs the bounded snapshot, raw data are large, and original portal pages may contain publicly embedded key-like strings. To verify further claims, request the separate package at the original location in [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md) and follow its integrity and source audit documents.

The measurement at `2024-05-20T06:15:19Z` is `303.98798 µGy/hour`. The exploratory 30 µGy/hour cutoff and medians are researcher analyses. The UI rounds them and explains the trend. Neither observation nor analysis establishes human dose, a safety threshold, habitat exposure, shielding effectiveness or solar causation. Game work slots, robot survey and next-shift flags are explicit training assumptions. See [NASA_SCIENCE_INTEGRATION.md](NASA_SCIENCE_INTEGRATION.md).
