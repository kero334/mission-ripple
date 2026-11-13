# Remaining work and honest visual comparison

The game is playable and all nine rooms are accessible. The main screenshot composition is close in building placement, warm palette, pixel scale, HUD shape, astronaut/Nuri pairing, and separate settlement objects. It is still a prototype, not a frame for frame reproduction.

- The generated exterior sprites are original and individually rendered, but several buildings have more intricate highlights and silhouette detail than the procedural terrain. Extra hand authored terrain clusters, edge transitions, layered rocks and path variants would make the ground as dense as the reference.
- The five priority rooms have distinct large equipment, modular floors, lighting and small props. Their wall systems and furniture need more room specific hand painted arrangements and more foreground occlusion.
- The astronaut uses four directions and four frame strips; some frames were extracted from a generated sheet, so a professional animator should refine foot cycles, strict silhouette registration and side views. Nuri expressions work but speaking and emotion changes use limited frames.
- Facility signs are rendered in a pixel font over sprites rather than integrated into each building sheet. More authored sign and icon treatments would improve fidelity.
- Static lights flicker and dust drifts subtly. There is no advanced day/night cycle, layered cast light, audio, or continuous machinery animation.
- Resource systems, an actual Sol clock, inventory item use and the remaining campaign missions are absent. The first NASA evidence mission saves its stage and choice locally; world position and general exploration do not yet save. The HUD labels resource readouts inactive instead of inventing measurements.
- The HUD uses a web font for English and Cairo fallback for Arabic. A production bilingual bitmap font and hand drawn Arabic glyph treatment would improve perfect cross-language pixel consistency.
- Chrome QA checked render sizes and interactions, but a human art review across multiple display panels remains useful. The 3D project remains untouched.
- The visual science cards were checked in Chrome in English and Arabic, but no usability session with children aged 7–12 has been conducted. Wording and icon recognition should be reviewed with that age group before release.
