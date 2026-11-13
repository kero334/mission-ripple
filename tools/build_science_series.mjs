// Builds two small, versioned, read-only-derived science snapshots for the child-facing UI:
//   src/science/rad-series-v1.json   every retrieved Curiosity RAD row for 19 and 20 May 2024 UTC
//   src/science/exhibits-v1.json     source-linked values for optional exhibits, copied from canonical findings
// The research package is only read. Usage: node tools/build_science_series.mjs [path-to-package]
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

const pkg=resolve(process.argv[2]||'../NASA-Science-to-Mission-Engine/MISSION_RIPPLE_COMPLETE_SCIENTIFIC_DATA');
const sourceRecord='01_ORIGINAL_DATA/RADLAB/phase2/MSL_RAD_surface_2024.csv';
const raw=readFileSync(resolve(pkg,sourceRecord));
const sha=createHash('sha256').update(raw).digest('hex');
const lines=raw.toString('utf8').trim().split(/\r?\n/);
if(lines[0].replaceAll('"','')!=='timestamp,instrument_id,absorbed_dose_rate,dose_equivalent_rate')throw Error('Unexpected CSV header');
const rows=lines.slice(1).map(l=>l.replaceAll('"','').split(','));
const day=d=>rows.filter(p=>p[0].startsWith(d)).map(p=>{
  if(p[1]!=='MSL-RAD-Surface')throw Error('Unexpected instrument '+p[1]);
  if(p[3]!=='')throw Error('Dose equivalent unexpectedly present at '+p[0]);
  return [p[0],Number(p[2])];
});
const may19=day('2024-05-19'),may20=day('2024-05-20');
const findings=JSON.parse(readFileSync(resolve(pkg,'04_VERIFIED_DISCOVERIES/scientific_findings.json'),'utf8'));
const byId=Object.fromEntries(findings.map(f=>[f.id,f]));
const need=id=>{if(!byId[id])throw Error('Missing finding '+id);return byId[id]};
if(Math.max(...may20.map(r=>r[1]))!==need('P2-RAD-04').value)throw Error('Peak mismatch');

const series={
  schemaVersion:1,snapshotId:'radlab-may19-20-series-v1',missionId:'P2-M02',evidenceId:'RAD-MAY20-2024',
  sourceOrganization:'NASA',sourceUrl:'https://visualization.osdr.nasa.gov/radlab/gui/data-api/',
  datasetId:'MSL-RAD-Surface',instrument:'Curiosity RAD',environment:'Curiosity rover, Mars surface',
  sourceRecord,sourceSha256:sha,unit:'µGy/hour',timeZone:'UTC',
  note:'Every retrieved row for each UTC day, in source order. No interpolation, smoothing or gap filling. Dose equivalent is blank in every row.',
  findingIds:['P2-RAD-04','P2-RAD-05','P2-RAD-07','P2-RAD-09'],
  days:{'2024-05-19':may19,'2024-05-20':may20}
};
const pick=(f,keys)=>({findingId:f.id,sourceOrganization:f.source_organization,sourceUrl:f.source_url,datasetId:f.dataset_id,
  observationPeriod:f.observation_period,environment:f.location_or_environment,limitations:f.limitations,...keys});
const sci3=need('SCI-0003').value;
const exhibits={
  schemaVersion:1,snapshotId:'exhibits-v1',
  note:'Values copied verbatim from 04_VERIFIED_DISCOVERIES/scientific_findings.json. Rounded only for display in the UI.',
  records:{
    'surface-typical':pick(need('P2-RAD-02'),{value:need('P2-RAD-02').value,unit:need('P2-RAD-02').unit,coverageReadings:need('P2-RAD-01').value,coverageFindingId:'P2-RAD-01'}),
    'data-check':pick(need('P2-RAD-08'),{value:need('P2-RAD-08').value,unit:need('P2-RAD-08').unit,coverageReadings:need('P2-RAD-01').value,coverageFindingId:'P2-RAD-01'}),
    'solar-catalog':pick(need('SCI-0003'),{counts:sci3.counts,period:sci3.period,caveat:sci3.caveat,causalClaim:'none'}),
    'iss-environment':pick(need('SCI-0002'),{environmentNote:'ISS, low Earth orbit',datasetIdCompared:'MSL-RAD-Surface'}),
    'dose-equivalent':pick(need('P2-RAD-07'),{value:need('P2-RAD-07').value,unit:need('P2-RAD-07').unit})
  }
};
writeFileSync('src/science/rad-series-v1.json',JSON.stringify(series)+'\n','utf8');
writeFileSync('src/science/exhibits-v1.json',JSON.stringify(exhibits,null,2)+'\n','utf8');
console.log('rows',may19.length,may20.length,'sha',sha);
