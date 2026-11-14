// Builds src/science/campaign-evidence-v1.json: the small, source-linked evidence set used by the campaign
// missions after The Rover Reading. Reads the research package only. Usage: node tools/build_campaign_snapshot.mjs [pkg]
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const pkg=resolve(process.argv[2]||'../NASA-Science-to-Mission-Engine/MISSION_RIPPLE_COMPLETE_SCIENTIFIC_DATA');
const findings=Object.fromEntries(JSON.parse(readFileSync(resolve(pkg,'04_VERIFIED_DISCOVERIES/scientific_findings.json'),'utf8')).map(f=>[f.id,f]));
const need=id=>{if(!findings[id])throw Error('missing '+id);return findings[id]};
const radDir='01_ORIGINAL_DATA/RADLAB/phase2';
const sha=p=>createHash('sha256').update(readFileSync(resolve(pkg,p))).digest('hex');
const rows=p=>readFileSync(resolve(pkg,p),'utf8').trim().split(/\r?\n/).slice(1).map(l=>l.replaceAll('"','').split(','));

// 1) one real conflicting same-timestamp pair (P2-RAD-08), earliest in the retrieved files
let dup=null;
for(const f of readdirSync(resolve(pkg,radDir)).filter(n=>/^MSL_RAD_surface_\d{4}\.csv$/.test(n)).sort()){
  const path=`${radDir}/${f}`,r=rows(path),seen=new Map();
  for(let i=0;i<r.length;i++){const [ts,inst,v]=r[i];if(inst!=='MSL-RAD-Surface')continue;
    if(seen.has(ts)&&r[seen.get(ts)][2]!==v){const j=seen.get(ts);dup={sourceRecord:path,sourceSha256:sha(path),before:r[Math.max(0,j-1)].slice(0,3),a:r[j].slice(0,3),b:r[i].slice(0,3)};break}
    seen.set(ts,i)}
  if(dup)break;
}
if(!dup)throw Error('no duplicate pair found');
// 2) one real multi-hour gap in 2024 (P2-RAD-06 integrates only intervals <= 30 min)
const p24=`${radDir}/MSL_RAD_surface_2024.csv`,r24=rows(p24);let gap=null;
for(let i=1;i<r24.length;i++){const g=(Date.parse(r24[i][0]+'Z')-Date.parse(r24[i-1][0]+'Z'))/60000;if(g>=120&&g<=600){gap={sourceRecord:p24,sourceSha256:sha(p24),before:r24.slice(Math.max(0,i-3),i).map(x=>x.slice(0,3)),after:r24.slice(i,i+3).map(x=>x.slice(0,3)),minutes:Math.round(g)};break}}
if(!gap)throw Error('no gap found');
const sci3=need('SCI-0003'),osd=need('P2-OSD-615'),trek=need('P2-TREK-01'),r06=need('P2-RAD-06'),r08=need('P2-RAD-08'),r07=need('P2-RAD-07');
const snap={schemaVersion:1,snapshotId:'campaign-evidence-v1',note:'Values copied from original RadLab CSV rows or 04_VERIFIED_DISCOVERIES/scientific_findings.json. Game meters and outcomes are NOT in this file: they are pretend game rules (src/game/base-sim.ts).',
  log:{findingIds:['P2-RAD-08','P2-RAD-06'],sourceUrl:r08.source_url,datasetId:'MSL-RAD-Surface',unit:'µGy/hour',duplicate:dup,gap,conflictingRows:r08.value,coveredHours:r06.value.covered_hours,limitation:r08.uncertainty,method:r06.calculation_or_method},
  sun:{findingIds:['SCI-0003'],sourceUrl:sci3.source_url,datasetId:sci3.dataset_id,period:sci3.value.period,counts:sci3.value.counts,strongest:sci3.value.strongest_listed_flare,caveat:sci3.value.caveat,environment:sci3.location_or_environment},
  plants:{findingIds:['P2-OSD-615'],sourceUrl:osd.source_url,datasetId:osd.dataset_id,samples:osd.value.samples,groups:osd.value.groups,limitation:osd.uncertainty},
  map:{findingIds:['P2-TREK-01'],sourceUrl:trek.source_url,datasetId:trek.dataset_id,format:trek.value,limitation:trek.uncertainty},
  dose:{findingIds:['P2-RAD-07'],sourceUrl:r07.source_url,limitation:r07.uncertainty}};
writeFileSync('src/science/campaign-evidence-v1.json',JSON.stringify(snap,null,2)+'\n','utf8');
console.log('dup',dup.a,dup.b,'gap',gap.minutes,'min',gap.before.at(-1)[0],'→',gap.after[0][0]);
