# Nuri's voice and companion (updated 15 Nov 2026)

## Voice

- **Recordings:** generated with ElevenLabs, model `eleven_multilingual_v2`, voice `XfNU2rGpBa01ckF309OY`.
  - Settings: stability 0.55, similarity 0.8, style 0.25, speaker boost, speed 0.94.
  - Each file is trimmed and loudness-normalised (−18 LUFS, peaks ≤ −1.5 dBTP, mono 96 kbps).
  - Files are in `public/assets/voice/en/` with `manifest.json`, which maps the exact text to the file and its length.
- **Making the recordings:** `node tools/voice/generate.mjs`.
  - It reads `voice-package/nuri_audio_map.json` and only requests lines whose cache file (`voice-cache/<hash>.mp3`) is missing, so re-runs cost nothing.
  - `--regen id1,id2` re-takes chosen lines with a new seed.
  - `--dry` reports what would be generated.
- **API key:** read only from `%TEMP%/opencode/elevenlabs.env` (or `ELEVENLABS_ENV`). It is never in the game, the repo or the logs. `voice-cache/` is git-ignored.
- **Checks:**
  - `node tools/voice/audit.mjs` measures loudness and transcribes every file locally (Parakeet), then flags lines whose words differ.
  - `node tools/voice/recheck.mjs` re-listens to the flagged lines one by one.
- **In the game:** `src/audio/voice.ts` (player) and `src/audio/voice-hooks.ts` (when lines play).
  - A line plays only when its **exact text** is on screen: the dialogue box, a card's main line (including quiz feedback), "Tell me more" when opened, help tips, and the ending recap list.
  - One voice at a time. A new line, a page change, closing a card or panel, entering or leaving a building, switching to Arabic, or muting stops the old line.
  - A dialogue-box line said while a card covers it waits, and plays when the box is visible again, unless the card already said it.
  - Music and effects are lowered while Nuri speaks.
  - **Hear again** buttons sit on the dialogue box and on every card. **Settings → Nuri's voice** has ON/OFF and Quiet / Normal / Loud, saved with the other settings. The global SOUND switch also silences the voice.
  - English only for now. In Arabic the voice is silent and the buttons are hidden.
- **Tests:**
  - `node tools/voice-qa.mjs`: sync, no overlap, stopping, ducking, replay, help, Arabic, mute, volume, reload.
  - Running the full suites with `VOICE_CAPTURE=file`, then `node tools/voice/coverage.mjs file`, checks that every Nuri line shown during real playthroughs had a recording and that the right one played.

## Companion (`src/companion/companion.ts`, words in `src/content/companion.ts`)

- **First-time tour:** starts right after the opening cinematic for a fresh player. Each step:
  - dims the screen and spotlights the real thing (camera-aware for Nuri, the astronaut and the Habitat);
  - shows an animated arrow, plus a tapping cursor when the player should try it;
  - Nuri's bubble avoids covering the target and the HUD controls, and her voice is in sync.

  Steps:
  1. Nuri introduces herself.
  2. Walk: waits until the player walks, then "Great job, Commander!". On touch-only devices it says a keyboard is needed.
  3. Buildings and doors.
  4. Mission tracker.
  5. HELP: tap to try.
  6. Science XP.
  7. Science Passport: tap to try.
  8. Map.
  9. Settings.
  10. The Ripple Effect, in three short lines, with a ripple animation: "Be careful, Commander! Every choice creates a ripple. Your decisions shape how our mission ends!"
  11. START MISSION (last step).

  Highlighted controls stay clickable. Opening a panel pauses the tour until it closes. **Skip tour** works at every step. **Settings → REPLAY THE TOUR** starts it again. The current step is saved, so a reload resumes it. Returning players are never forced into it.
- **Just-in-time tips:** shown once each, when the thing first appears.
  - Press E at a door.
  - The REAL NASA DATA stamp, then the PRETEND stamp.
  - The hear-again speaker.
  - The first plan choice ("Think carefully. What could happen next?").
  - The base power blocks.
  - The first lamp fix ("you can fix problems!").
  - The Passport badge grid.
- **Encouragement:** varied pools that rotate and are rate-limited.
  - Right answers: "Wow! You found something important!" (at most once a minute).
  - A second wrong try in a row: "That's okay! Scientists learn by trying again!" It never gives the answer.
  - Recovery: "You did it! We fixed the problem!".
  - A surprising consequence (a lamp goes dark, the robot gets stuck): "Interesting! Let's see why that happened.".
  - Mission complete: "Amazing teamwork, Commander!".
- **Badge celebration:** confetti, spinning rays and the badge, with what it was for. Nuri says "Yay! You earned the … badge!". It waits for a calm moment: never during a cinematic, the tour, an open card, or while Nuri is speaking on a card.
- **Reduced motion:** all tour and celebration animations switch off.
- **Saving:** `mission-ripple-companion-v1` stores the tour state and step, the tips seen, and the rotation of the encouragement lines.
- **Test:** `node tools/companion-qa.mjs`.
