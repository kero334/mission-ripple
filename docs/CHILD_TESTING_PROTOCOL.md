# First-time player testing protocol (not yet run)

**Status:** prepared, not run. No child has played this version yet. Do not report any result from this
protocol until real sessions have taken place with consent.

## Who and how

- **Groups:** two small groups, about 5 children aged 7–8 and about 5 aged 9–12, for a qualitative pilot.
  It is meant to find obvious problems and is not a statistical study.
- **Consent:** written consent from a parent or guardian, and verbal agreement from the child, who may stop
  at any time.
- **Privacy:** no names in notes (use P1, P2…). No audio, video or screen recording unless separately
  consented. Nothing is uploaded; the game stores data only in the browser.
- **Setup:** desktop Chrome at 1280×720 or larger, a fresh browser profile, and the game at
  `http://localhost:5182/`. Run half the sessions in English and half in Arabic, matching each child's
  language.
- **Adult role:** one adult observes. They only answer "What do you think?" until the child has been stuck
  for 60 s, then say "You can ask Nuri."

## Usability (watch and note)

| Indicator | How to measure |
|---|---|
| Time to first meaningful action | Stopwatch from load to START MISSION, then to the first E on the screen |
| Wrong destination attempts | Count wrong buildings entered (also in `__progress.get().stats.wrongPlaces`) |
| Interaction errors | E pressed with nothing near (`stats.misses`); clicks on non-buttons |
| Hint use | `stats.hintRequests`; the levels reached (`hintLevel`) |
| Objective completion | Each stage reached without adult help: yes or no |
| Repeated interactions | Same card reopened by accident |
| Next step unclear | The child says or shows "what now?" |
| Map | Can find and use M without being told |
| Passport | Opens J after the first XP message |
| Debrief understood | See the educational questions below |

## Learning (short talk after play; record the child's own words)

1. What did the robot measure?
2. What did you notice on the graph?
3. Did the robot measure inside our base? How do you know?
4. Why did you pick your plan?
5. What happened later because of your plan?
6. A different robot sees a strange number. What would you check first?

## Enjoyment

Did you like walking around? Was the mission interesting? Did the badges and XP feel good? Would you play
again? Did you find a bonus fact? Was anything annoying or too long to read?

## After the sessions

Group the problems by screen. For each fix, rerun `npm test` and `npm run qa:experience`. Never trade
scientific accuracy for a simpler sentence: if a child misunderstands, change the wording or the picture,
not the facts.
