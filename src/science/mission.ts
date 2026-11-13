import rawEvidence from './evidence-v1.json';

export type MissionStage='ready'|'monitor'|'research'|'command'|'nextShift'|'debrief'|'complete';
export type Decision='review-defer'|'survey-followup';
export type MissionState={version:1;stage:MissionStage;choice:Decision|null;monitorReviewed:boolean;researchReviewed:boolean;nextShiftFlag:'trend_reviewed'|'followup_reading_due'|null;simulatedWorkSlotsUsed:number};
export const SAVE_KEY='mission-ripple-science-v1';
export const initialMission=():MissionState=>({version:1,stage:'ready',choice:null,monitorReviewed:false,researchReviewed:false,nextShiftFlag:null,simulatedWorkSlotsUsed:0});
function freezeDeep(value:unknown):void{if(value&&typeof value==='object'){for(const item of Object.values(value))freezeDeep(item);Object.freeze(value)}}
freezeDeep(rawEvidence);
export const evidence=rawEvidence;

export function validateEvidenceRecord(record:typeof rawEvidence){
  if(record.schemaVersion!==1||record.missionId!=='P2-M02'||record.datasetId!=='MSL-RAD-Surface')throw Error('Science snapshot identity mismatch');
  if(record.measurements.length!==10||record.measurements.some(p=>p.unit!=='µGy/hour'||!p.recordSelector.timestamp))throw Error('Science records incomplete');
  if(record.derived.peak!==303.98798||record.derived.readingsAboveExploratoryCutoff!==92||record.derived.exploratoryCutoff!==30)throw Error('Science values mismatch');
  if(!record.sourceUrl||!record.sourceRecord||!record.sourceSha256||record.provenanceRefs.length<3||!record.findingIds.every(id=>record.provenanceRefs.includes(id)))throw Error('Science provenance missing');
  if(record.scope!=='rover_surface_only'||record.humanSafetyThreshold!==null||record.habitatDose!==null||record.causalSolarEvent!==null||record.exploratoryCutoffIsSafetyLimit!==false)throw Error('Unsupported scientific transfer');
  return true;
}
validateEvidenceRecord(evidence);
export function transition(state:MissionState,action:'start'|'monitor-reviewed'|'research-reviewed'|'next-shift-reviewed'|'finish'|'replay'|Decision):MissionState{
  if(action==='replay')return initialMission();
  if(action==='start'&&state.stage==='ready')return {...state,stage:'monitor'};
  if(action==='monitor-reviewed'&&state.stage==='monitor')return {...state,stage:'research',monitorReviewed:true};
  if(action==='research-reviewed'&&state.stage==='research'&&state.monitorReviewed)return {...state,stage:'command',researchReviewed:true};
  if((action==='review-defer'||action==='survey-followup')&&state.stage==='command'&&state.researchReviewed)return {...state,stage:'nextShift',choice:action,nextShiftFlag:action==='review-defer'?'trend_reviewed':'followup_reading_due',simulatedWorkSlotsUsed:1};
  if(action==='next-shift-reviewed'&&state.stage==='nextShift'&&state.choice)return {...state,stage:'debrief'};
  if(action==='finish'&&state.stage==='debrief')return {...state,stage:'complete'};
  return state;
}
const STAGE_ORDER:MissionStage[]=['ready','monitor','research','command','nextShift','debrief','complete'];
export const stageIndex=(s:MissionStage)=>STAGE_ORDER.indexOf(s);
// Old or hand-edited saves are repaired, never silently discarded: the raw text is kept under a backup key.
function backup(raw:string){try{localStorage.setItem(SAVE_KEY+'.backup',raw)}catch{/* storage full: keep playing */}}
export function sanitizeMission(x:any):{state:MissionState;repaired:boolean}{
  const fresh=initialMission();
  if(!x||typeof x!=='object'||x.version!==1||!STAGE_ORDER.includes(x.stage))return {state:fresh,repaired:x!=null};
  let stage=x.stage as MissionStage;
  let choice:Decision|null=x.choice==='review-defer'||x.choice==='survey-followup'?x.choice:null;
  if(stageIndex(stage)>=stageIndex('nextShift')&&!choice)stage='command';
  if(stageIndex(stage)<stageIndex('nextShift'))choice=null;
  const state:MissionState={version:1,stage,choice,
    monitorReviewed:stageIndex(stage)>=stageIndex('research'),
    researchReviewed:stageIndex(stage)>=stageIndex('command'),
    nextShiftFlag:choice?choice==='review-defer'?'trend_reviewed':'followup_reading_due':null,
    simulatedWorkSlotsUsed:choice?1:0};
  const repaired=(['stage','choice','monitorReviewed','researchReviewed','nextShiftFlag','simulatedWorkSlotsUsed'] as const).some(k=>x[k]!==state[k]);
  return {state,repaired};
}
export function loadMission():MissionState{
  const raw=localStorage.getItem(SAVE_KEY);
  if(raw==null)return initialMission();
  let parsed:unknown=null;
  try{parsed=JSON.parse(raw)}catch{backup(raw);return initialMission()}
  const {state,repaired}=sanitizeMission(parsed);
  if(repaired){backup(raw);saveMission(state)}
  return state;
}
export function saveMission(state:MissionState){localStorage.setItem(SAVE_KEY,JSON.stringify(state))}
export function objective(stage:MissionStage,locale:'en'|'ar'){
  const copy={
    ready:['Begin The Rover Reading','ابدأ مهمة قراءة العربة'],
    monitor:['Inspect the courtyard field terminal','افحص وحدة الميدان في الساحة'],
    research:['Study the Curiosity record in Research Lab','ادرس سجل كيريوسيتي في مختبر الأبحاث'],
    command:['Schedule the optional survey in Command Hub','خطط للمسح الاختياري في مركز القيادة'],
    nextShift:['Check the next-shift brief in Communications','راجع تقرير النوبة التالية في الاتصالات'],
    debrief:['Review the science debrief','راجع الخلاصة العلمية'],
    complete:['Mission complete · explore or replay','اكتملت المهمة · استكشف أو أعدها'],
  } as const;
  return copy[stage][locale==='en'?0:1];
}
