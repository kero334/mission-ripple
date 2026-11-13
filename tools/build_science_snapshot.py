"""Build the small, deterministic, public science snapshot from the read-only handoff."""
from pathlib import Path
import csv, hashlib, json, sys

root=Path(__file__).resolve().parents[1]
package=Path(sys.argv[1]) if len(sys.argv)>1 else root.parent/'NASA-Science-to-Mission-Engine'/'MISSION_RIPPLE_COMPLETE_SCIENTIFIC_DATA'
raw=package/'01_ORIGINAL_DATA/RADLAB/phase2/MSL_RAD_surface_2024.csv'
findings=json.loads((package/'04_VERIFIED_DISCOVERIES/scientific_findings.json').read_text(encoding='utf8'))
by_id={x['id']:x for x in findings}
for id in ['P2-RAD-04','P2-RAD-05','P2-RAD-07','P2-RAD-08']:
    assert id in by_id
rows={x['timestamp']:x for x in csv.DictReader(raw.open(encoding='utf8',newline=''))}
times=['2024-05-20T03:56:33','2024-05-20T05:38:56','2024-05-20T05:57:07','2024-05-20T06:15:19','2024-05-20T08:59:02','2024-05-20T12:01:41','2024-05-20T15:01:50','2024-05-20T18:04:29','2024-05-20T20:03:13','2024-05-20T20:58:01']
points=[]
for time in times:
    row=rows[time]
    assert row['instrument_id']=='MSL-RAD-Surface' and not row['dose_equivalent_rate']
    points.append({'timestampUtc':time+'Z','absorbedDoseRate':float(row['absorbed_dose_rate']),'unit':'µGy/hour','recordSelector':{'timestamp':time}})
assert points[3]['absorbedDoseRate']==by_id['P2-RAD-04']['value']
case=json.loads((package/'03_SCIENTIFIC_ANALYSIS/radiation/may_2024_radlab_case.json').read_text(encoding='utf8'))
assert case['count_above_cutoff']==by_id['P2-RAD-05']['value']['readings_above_exploratory_30']
assert case['cutoff_is_hazard_limit'] is False
snapshot={
 'schemaVersion':1,'snapshotId':'radlab-may20-v1','missionId':'P2-M02','evidenceId':'RAD-MAY20-2024',
 'findingIds':['P2-RAD-04','P2-RAD-05','P2-RAD-07','P2-RAD-08'],'eventId':'P2-EVT-RAD-MAY20',
 'sourceOrganization':'NASA','sourceUrl':'https://visualization.osdr.nasa.gov/radlab/gui/data-api/',
 'datasetId':'MSL-RAD-Surface','instrument':'Curiosity RAD','environment':'Curiosity rover, Mars surface',
 'observationPeriod':'2024-05-20 UTC','sourceRecord':'01_ORIGINAL_DATA/RADLAB/phase2/MSL_RAD_surface_2024.csv',
 'sourceSha256':hashlib.sha256(raw.read_bytes()).hexdigest(),
 'analysisRecord':'03_SCIENTIFIC_ANALYSIS/radiation/may_2024_radlab_case.json',
 'scope':'rover_surface_only','humanSafetyThreshold':None,'habitatDose':None,'causalSolarEvent':None,'exploratoryCutoffIsSafetyLimit':False,
 'measurements':points,
 'derived':{'peak':by_id['P2-RAD-04']['value'],'readingsAboveExploratoryCutoff':case['count_above_cutoff'],'exploratoryCutoff':case['exploratory_cutoff_ugy_h'],'spanHours':case['span_hours'],'previousDayMedian':case['previous_day_median_ugy_h'],'eventDayMedian':case['event_day_median_ugy_h'],'unit':'µGy/hour'},
 'uncertainty':{'en':'The cause and detector quality flags for this episode are not established. No astronaut or habitat exposure was measured.','ar':'لم يُحدد سبب هذه الحلقة أو علامات جودة الكاشف. لم يُقَس تعرض رائد فضاء أو داخل وحدة السكن.'},
 'explanation':{'en':'Several rover readings stayed elevated across many hours. A sequence gives more context than one peak.','ar':'ظلّت عدة قراءات للكاشف على العربة مرتفعة لساعات. تعطينا السلسلة معلومات أكثر من قمة واحدة.'},
 'verificationStatus':'source-linked, package-validated; scientific transfer to fictional outpost not validated',
 'provenanceRefs':['P2-RAD-04','P2-RAD-05','P2-RAD-07','P2-RAD-08','P2-EVT-RAD-MAY20'],
 'relatedDecisionIds':['P2-M02A','P2-M02B']
}
out=root/'src/science/evidence-v1.json';out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps(snapshot,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(out, snapshot['sourceSha256'],len(points),'records')
