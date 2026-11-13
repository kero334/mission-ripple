# First science mission: selection and scientific justification

## Package and evidence gate

The read-only portable research package passed its own validator on 13 Nov 2026: 6,846 checks, 20 findings, seven historical events, 22 candidates and six blocked candidates. This is package integrity, not independent peer review. Its IDs and cross references resolve. The selection below follows `09_GAME_CODEX_HANDOFF/MISSION_SELECTION_FRAMEWORK.md`. The old 3D game and science package remain read-only.

**Selected: P2-M02 — A sustained surface reading**, presented in game as **The Rover Reading**. Supporting IDs: P2-RAD-05 (92 retrieved readings above an exploratory 30 µGy/hour cutoff over 14.4047 hours on 20 May 2024), P2-RAD-04 (303.98798 µGy/hour maximum at 06:15:19 UTC within retrieved data), P2-RAD-08 (29 conflicting same-timestamp rows across the wider 2015–2024 export), P2-RAD-07 (dose equivalent absent), and event P2-EVT-RAD-MAY20. Direct source: NASA RadLab `MSL-RAD-Surface`, `01_ORIGINAL_DATA/RADLAB/phase2/MSL_RAD_surface_2024.csv`, SHA-256 `baea6261262f499f02259fbfba986973038c88a7b03f4f1b2136d6e346132a11`; [RadLab access page](https://visualization.osdr.nasa.gov/radlab/gui/data-api/). The exact source row at 06:15:19 has absorbed dose rate `303.98798` and blank dose equivalent. The derived case is `03_SCIENTIFIC_ANALYSIS/radiation/may_2024_radlab_case.json`.

**Observation:** Curiosity's Mars surface detector recorded an elevated sequence on that date. This is not a base monitor, astronaut dose, medical hazard label, or established effect of a solar event. The 30 µGy/hour line was selected for descriptive analysis and is not a human safety limit. Calibration flags, cause, human exposure, habitat shielding and an outpost transfer model are unavailable (PAR2-01, PAR2-02, PAR2-10).

**Educational objective:** Read a sequence rather than one dramatic value; identify instrument, location, units and unknowns; distinguish measurement from a scheduling simulation. **Gameplay objective:** walk to the field monitor, inspect the Research Lab record, then use Command to schedule a fictional optional robot survey. **Decisions:** defer optional survey to review the trend, or keep the survey while scheduling another reading. Both use one fictional crew-work slot. The first preserves follow-up investigation time; the second preserves the survey but leaves a follow-up reading due. No health effect, shielding result or physical resource percentage is computed. **Immediate consequence:** schedule and evidence note change. **Delayed consequence:** the next-shift Communications briefing offers a distinct follow-up based on that schedule, then a debrief. This later phase is part of the one vertical slice, with a persisted flag for a future mission.

### Framework scores (0–3, project design judgments)

| Dimension | P2-M02 selected | P2-M01 detector log | P2-M08 missing hours |
|---|---|---|---|
| Scientific credibility | 3 — CSV rows, units and bounded analysis resolve. | 3 — duplicate-row count resolves to annual CSVs. | 3 — gap handling and integration method are documented. |
| Historical authenticity | 3 — May 20 is a dated observed episode. | 2 — real multi-year quality pattern, less concrete event. | 2 — real multi-year gap pattern, no singular case. |
| Meaningful decisions | 3 — two defensible scheduling options. | 1 — “use the most dramatic value” is plainly poor practice. | 2 — repair versus partial record is a useful trade-off. |
| Ripple potential | 3 — follow-up versus deferred survey creates a next-shift dependency. | 3 — audited log can support a later mission. | 2 — gap plan could affect a later record. |
| Operational relevance | 3 — trend review and optional robot scheduling fit the outpost. | 3 — log quality is operationally relevant. | 3 — monitoring continuity matters. |
| Educational value | 3 — children can compare a peak to a sustained sequence. | 3 — children can learn why duplicate entries matter. | 3 — children can learn not to invent gap values. |
| Simulation feasibility | 2 — qualitative scheduling only; no human dose model. | 2 — qualitative data audit only. | 2 — qualitative log repair only. |
| 2D gameplay feasibility | 3 — monitor, Research and Command are already explorable. | 3 — existing terminals support it. | 3 — existing terminals support it. |
| Integration complexity | 2 — requires a chart, branches and next-shift stage. | 3 — one log station is simpler. | 3 — one log station is simpler. |
| Evidence gaps | 1 — sensor context and human transfer are unavailable. | 2 — duplicate cause unknown but quality lesson is bounded. | 2 — gap cause unknown but missing-time lesson is bounded. |

P2-M02 wins despite a harder science boundary because its two reasonable choices and dated sequence make a stronger first explorable mission. The UI keeps those boundaries visible. P2-M01 should follow later as a fuller log-quality mission; P2-M08 can expand the later data-integrity arc.

## Other candidates and campaign order

- **Next:** P2-M01 (full audit of repeated timestamps), P2-M08 (missing hours), then P2-M05 (plant controls). Their constraints are evidence literacy and qualitative scheduling.
- **Later with explicit limits:** P2-M03 and P2-M09 (DONKI catalog interpretation, never a Mars dose), P2-M04 (robot allocation), P2-M06 (CSA qualitative food context), P2-M07 (map interpretation without numerical slope), P2-M10 (evidence review). These need more authored progression.
- **Educational alternatives:** MIS-001, MIS-002, MIS-003, MIS-004, P2-EDU-01 and P2-EDU-02 are valid evidence-reading exercises, but their present forms offer less operational choice and spatial integration for the first slice. They can become short investigations within later missions.
- **Blocked and rejected:** MIS-B01 and P2-BLOCK-01 lack numeric terrain and rover energy data; MIS-B02 and P2-BLOCK-02 lack applicable crop yield and water-loop parameters; MIS-B03 and P2-BLOCK-03 lack personal dose and shelter shielding parameters. None becomes a physical survival mechanic.

This vertical slice does not replace the original five-mission concept. A later campaign design can align validated evidence families with its Power, Water, Communications, Radiation and Oxygen locations without introducing unsupported resource equations.
