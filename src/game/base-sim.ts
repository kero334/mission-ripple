// PRETEND training-simulation rules for the Mars base in the campaign. These are game rules, NOT NASA data and
// NOT engineering estimates. The research package has no validated habitat power, crop-yield or rover-energy
// parameters (blocked candidates MIS-B01/B02/B03, P2-BLOCK-01/02/03), so nothing here is derived from a measurement.
//
// The base has 3 power blocks. Each block can light one thing:
//   lamp1, lamp2 (greenhouse lamps) · monitor (Research Lab spare monitor) · watch (Sun-watch screen at Communications)
// A robot trip or a rescue can BORROW one block for one day; it comes back on the next day.
// Every new day: 2 lamps on → plants grow one stage; fewer lamps → plants shrink one stage (0–4).
//
// The whole base is DERIVED from the event history (replay), so a save can never drift, a delayed effect can never
// be applied twice, and the same choices always give the same base.
export type Slot='lamp1'|'lamp2'|'monitor'|'watch';
export const SLOTS:Slot[]=['lamp1','lamp2','monitor','watch'];
export const BLOCKS=3,PLANT_MAX=4,PLANT_START=2;
export type M1='study'|'trip';
export type Cause='watch'|'rover'|'helper'|'you'|null;
export type Base={
  power:Record<Slot,boolean>;
  lampCause:Cause;                 // why a greenhouse lamp is off (Nuri explains it)
  plants:number;                   // 0 wilting · 1 weak · 2 growing · 3 healthy · 4 thriving
  plantBoost:number;               // fair plant test: +1 waits for the next day
  alert:'none'|'watching'|'checked'|'mystery';
  notes:'none'|'fixed'|'marked';
  fair:boolean|null;
  m1:M1;
  rover:'home'|'scouting'|'driving'|'stuck'|'rescue';
  borrow:Slot|'spare'|null;        // where the robot's / helper's block came from
  route:'none'|'scouted'|'known'|'stuck';
  day:number;
  finalPlan:'A'|'B'|null;
  notesAtPlan:boolean|null;        // was the monitor running when the plan was written?
};
export type Ev=
  |{t:'choose';m:string;o:'A'|'B';sub?:Slot}
  |{t:'fix';o:'watch'|'monitor'|'keep'}
  |{t:'toggle';slot:Slot}
  |{t:'rescue';o:'help'|'leave';sub?:Slot}
  |{t:'day'};
export type Change={slot?:Slot;on?:boolean;plants?:number;from?:number;rover?:Base['rover'];alert?:Base['alert'];note?:string};
export type DayReport={day:number;lamps:number;before:number;after:number;boost:number;alertChecked:boolean;returned:Slot|'spare'|null;rover:'back'|'stuck'|'known'|'rescued'|null};

export const lamps=(b:Base)=>(b.power.lamp1?1:0)+(b.power.lamp2?1:0);
export const used=(b:Base)=>SLOTS.filter(s=>b.power[s]).length+(b.borrow?1:0);
export const spare=(b:Base)=>Math.max(0,BLOCKS-used(b));
export const isSlot=(x:unknown):x is Slot=>SLOTS.includes(x as Slot);
export function startBase(m1:M1):Base{
  return {power:{lamp1:true,lamp2:true,monitor:false,watch:false},lampCause:null,plants:PLANT_START,plantBoost:0,alert:'none',notes:'none',fair:null,m1,
    rover:'home',borrow:null,route:'none',day:0,finalPlan:null,notesAtPlan:null};
}
const clone=(b:Base):Base=>({...b,power:{...b.power}});
const darkLamp=(b:Base):Slot|null=>!b.power.lamp2?'lamp2':!b.power.lamp1?'lamp1':null;
const litLamp=(b:Base):Slot|null=>b.power.lamp2?'lamp2':b.power.lamp1?'lamp1':null;
/** Slots that can give a block when nothing is spare (used for "which light turns off?" questions). */
export const lenders=(b:Base)=>SLOTS.filter(s=>b.power[s]);

/** Applies one event. Invalid events are ignored (returns the same base and no changes). */
export function step(b0:Base,e:Ev):{base:Base;changes:Change[];report?:DayReport}{
  const b=clone(b0),ch:Change[]=[];
  const off=(s:Slot,cause:Cause)=>{if(!b.power[s])return;b.power[s]=false;ch.push({slot:s,on:false});if(s.startsWith('lamp'))b.lampCause=cause};
  const on=(s:Slot)=>{if(b.power[s])return;b.power[s]=true;ch.push({slot:s,on:true});if(s.startsWith('lamp')&&lamps(b)===2)b.lampCause=null};
  if(e.t==='day'){
    const l=lamps(b),before=b.plants,boost=b.plantBoost;
    b.plants=Math.max(0,Math.min(PLANT_MAX,b.plants+(l===2?1:-1)+boost));b.plantBoost=0;b.day++;
    ch.push({plants:b.plants,from:before});
    let alertChecked=false;if(b.power.watch&&b.alert!=='checked'){b.alert='checked';alertChecked=true;ch.push({alert:'checked'})}
    let rover:DayReport['rover']=null;
    if(b.rover==='scouting'){b.rover='home';b.route='scouted';rover='back'}
    else if(b.rover==='rescue'){b.rover='home';rover='rescued'}
    else if(b.rover==='driving'){if(b.m1==='trip'){b.rover='home';b.route='known';rover='known'}else{b.rover='stuck';b.route='stuck';rover='stuck'}}
    if(rover)ch.push({rover:b.rover});
    const returned=b.borrow;if(isSlot(b.borrow)){const s=b.borrow;b.borrow=null;on(s)}else b.borrow=null;
    return {base:b,changes:ch,report:{day:b.day,lamps:l,before,after:b.plants,boost,alertChecked,returned,rover}};
  }
  if(e.t==='toggle'){
    if(b.power[e.slot])off(e.slot,'you');else if(spare(b)>0)on(e.slot);
    return {base:b,changes:ch};
  }
  if(e.t==='fix'){
    const dark=darkLamp(b);if(!dark||e.o==='keep')return {base:b,changes:ch};
    if(!b.power[e.o])return {base:b,changes:ch};
    off(e.o,null);on(dark);return {base:b,changes:ch};
  }
  if(e.t==='rescue'){
    if(b.rover!=='stuck'||e.o==='leave')return {base:b,changes:ch};
    if(spare(b)>0)b.borrow='spare';else{const s=isSlot(e.sub)&&b.power[e.sub]?e.sub:lenders(b)[0];if(!s)return {base:b,changes:ch};off(s,'helper');b.borrow=s}
    b.rover='rescue';ch.push({rover:'rescue'});return {base:b,changes:ch};
  }
  // ---- plan choices
  const {m,o}=e;
  if(m==='M2-LOG'){if(o==='A'){b.notes='fixed';if(spare(b)>0)on('monitor');else{const s=litLamp(b);if(s){off(s,'you');on('monitor')}}}else b.notes='marked'}
  else if(m==='M3-SUN'){if(o==='A'){b.alert='watching';if(spare(b)===0){const s=litLamp(b);if(s)off(s,'watch')}on('watch')}else b.alert='mystery'}
  else if(m==='M4-PLANTS'){if(o==='A'){b.fair=true;b.plantBoost=1;ch.push({note:'boost'})}else{b.fair=false;const f=b.plants;b.plants=Math.min(PLANT_MAX,b.plants+1);ch.push({plants:b.plants,from:f})}}
  else if(m==='M5-POWER'){
    if(o==='A'){
      if(b.m1==='study'){/* the robot rested in Mission 1, so it is already charged */}
      else if(spare(b)>0)b.borrow='spare';
      else{const s=isSlot(e.sub)&&b.power[e.sub]?e.sub:lenders(b)[0];if(s){off(s,'rover');b.borrow=s}}
      b.rover='scouting';ch.push({rover:'scouting'});
    }else{b.rover='driving';ch.push({rover:'driving'})}
  }
  else if(m==='M6-PLAN'){
    b.notesAtPlan=b.power.monitor;b.finalPlan=o;
    if(o==='B'){off('monitor',null);off('watch',null);on('lamp1');on('lamp2');b.lampCause=null}
  }
  return {base:b,changes:ch};
}
/** Rebuilds the base from the start of the campaign. */
export function replay(m1:M1,events:Ev[]){
  let b=startBase(m1);const reports:DayReport[]=[],changes:Change[][]=[];
  for(const e of events){const r=step(b,e);b=r.base;changes.push(r.changes);if(r.report)reports.push(r.report)}
  return {base:b,reports,changes};
}
export type ProblemId='notes'|'alert'|'fair'|'rover';
export function problems(b:Base):ProblemId[]{
  const out:ProblemId[]=[];
  if(!(b.notesAtPlan??b.power.monitor))out.push('notes');
  if(b.alert!=='checked')out.push('alert');
  if(b.fair!==true)out.push('fair');
  if(b.rover==='stuck')out.push('rover');
  return out;
}
export type EndingKind='thrive'|'continue'|'setback';
/** The ending uses the whole base: plant growth (from every lamp decision) + open problems (from every science
 *  decision) − 1 if the plan and its questions were shared with the next team. */
export function outcome(b:Base){
  const open=problems(b),shared=b.finalPlan==='A'?1:0,eff=Math.max(0,open.length-shared);
  const kind:EndingKind=b.plants>=3&&eff<=1?'thrive':b.plants<=1||eff>=3?'setback':'continue';
  return {kind,plants:b.plants,open,shared:!!shared,eff};
}
export const plantStage=(p:number)=>(['wilting','weak','growing','healthy','thriving'] as const)[Math.max(0,Math.min(4,p))];
