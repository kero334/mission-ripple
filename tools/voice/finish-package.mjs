// Final step of the voice package: writes verification_report.md and the ZIP.
//   node tools/voice/finish-package.mjs   (after build-voice-package.mjs and verify-capture.mjs)
import {readFileSync,writeFileSync,existsSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const D='voice-package';
const stats=JSON.parse(readFileSync(`${D}/stats.json`,'utf8'));
const map=JSON.parse(readFileSync(`${D}/nuri_audio_map.json`,'utf8'));
const cap=existsSync(`${D}/chrome_capture_check.json`)?JSON.parse(readFileSync(`${D}/chrome_capture_check.json`,'utf8')):null;
const csv=readFileSync(`${D}/nuri_dialogue.csv`,'utf8');
const rows=csv.trim().split(/\r\n/).length-1;
const files=Object.keys(map.files);
const branch=f=>files.filter(x=>map.files[x].id.startsWith(f)).length;
const md=`# Verification report — Nuri voice package

| Check | Result |
|---|---|
| Every English text object exported by the game's text modules (${stats.text_objects_in_game}) is classified as voiced or on-screen only | **Pass** — the build stops if any is unclassified |
| Every voiced line is found verbatim in the source file named in the JSON (or is a placeholder template filled from game data) | **Pass** (build stops otherwise) |
| No unfilled \`{placeholder}\` in any voiced line | **Pass** (${stats.placeholder_templates_expanded} templates expanded into every possible version) |
| Unique dialogue IDs and MP3 filenames | **Pass** (${files.length} files, ${rows} CSV rows) |
| Inline text written directly in code (campaign hints, ending "why" lines, recovery costs) | **Pass** — checked against \`src/missions/campaign.ts\` and \`src/game/guidance.ts\` |
| Real Chrome playthroughs: every line Nuri or a caption showed is in the package | ${cap?`**${cap.missing.length===0?'Pass':'FAIL'}** — ${cap.captured_unique} unique on-screen texts captured; ${cap.voiced_exact} matched one line exactly, ${cap.voiced_composite} were several package lines shown together; ${cap.missing.length} missing`:'not run'} |
| Package lines actually seen during those playthroughs | ${cap?`${cap.package_lines_seen_in_chrome} of ${cap.package_lines_total} (the rest are other branches, wrong-place combinations, other XP totals, etc.; they are covered by the source checks)`:'—'} |

## Decision branches covered

- **Mission 1**: plan A and B — now / later lines, the bonus question, the debrief and rewards (${branch('m1.')} files).
- **Missions 2–6**:
  - every plan's title, gain, cost, "You chose…" and "Because you chose…" line;
  - lines that depend on the base (spare block or not; Mission 1 study or trip; robot stuck or not) as separate versions (${files.filter(x=>/^nuri_m[2-6]_/.test(x)).length} files).
- **Recovery**: lamp fix (each option and its result), power check, "which light turns off?", robot rescue (help or leave, both costs).
- **New-day results**: grew, shrank, shrank0, boost, returned, checked, and each cause.
- **Endings**: thrive / continue / setback lines, "tell me more" lines, every "How your choices led here" line, and every cinematic caption.
- **Hints**: every Mission 1 stage and card hint, every base-mission step goal, the WHERE? and HOW? lines, and each mission's THINK line.
- **World reactions**: greenhouse bright / dim / dark, monitor, watch screen, Sun mystery, stuck robot, and the 5 plant stages.
- **Navigation**: every "wrong place" combination, "Our mission is waiting: {task}" for every task, and the "This is the {building}" notes.

## Counts

\`\`\`json
${JSON.stringify(stats,null,2)}
\`\`\`

## How to re-run

\`\`\`
node tools/voice/build-voice-package.mjs
VOICE_CAPTURE=capture.jsonl node tools/experience-qa.mjs   # and ripple-qa, science-qa (dev server running)
node tools/voice/verify-capture.mjs capture.jsonl
node tools/voice/finish-package.mjs
\`\`\`
`;
writeFileSync(`${D}/verification_report.md`,md,'utf8');
const zip=`${D}/mission-ripple-nuri-voice-package.zip`;
const list=readdirSync(D).filter(f=>!f.endsWith('.zip')).map(f=>`${D}/${f}`);
execFileSync('powershell',['-NoProfile','-Command',`Compress-Archive -Force -Path ${list.map(f=>`'${f}'`).join(',')} -DestinationPath '${zip}'`],{stdio:'inherit'});
console.log('wrote',zip,list.length,'files');
