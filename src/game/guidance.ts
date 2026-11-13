// Mission guidance: turns the mission stage + player location into one clear objective,
// one world target for the beacon, and an ordered three-level hint ladder.
import {BUILDINGS} from '../world-data';
import {CARD_HINTS,HINTS,OBJECTIVES,type Locale,type StageKey,pick} from '../content/strings';

export type GuideTarget={kind:'door'|'equipment'|'field'|'exit'|'none';buildingId:string|null;x:number;y:number;label:string};
export const MISSION_BUILDING:Partial<Record<StageKey,string>>={research:'research',command:'command',nextShift:'comms'};
export const FIELD_POS={x:664,y:690};
export const EQUIPMENT_POS={x:320,y:243};
export const EXIT_POS={x:320,y:318};

/** Where the player should go next, given the stage and the room they are in (null = outdoors). */
export function guideTarget(stage:StageKey,room:string|null,l:Locale):GuideTarget{
  const none:GuideTarget={kind:'none',buildingId:null,x:0,y:0,label:''};
  if(stage==='ready'||stage==='debrief'||stage==='complete')return none;
  const goal=MISSION_BUILDING[stage];
  if(room){
    if(goal&&room===goal)return {kind:'equipment',buildingId:goal,...EQUIPMENT_POS,label:OBJECTIVES[stage].task[l]};
    return {kind:'exit',buildingId:room,...EXIT_POS,label:''};
  }
  if(stage==='monitor')return {kind:'field',buildingId:null,...FIELD_POS,label:OBJECTIVES.monitor.where[l]};
  const b=BUILDINGS.find(v=>v.id===goal)!;
  return {kind:'door',buildingId:b.id,x:b.x,y:b.y+18,label:l==='en'?b.name:b.ar};
}

export type HintLevel=0|1|2|3;
export type HintStep={level:HintLevel;category:'goal'|'nav'|'control'|'science';text:string;visual:'none'|'beacon'|'device'|'graph'};
/** Level 0 objective → 1 navigation → 2 controls → 3 scientific thinking. Never names a decision branch as correct.
 *  When help is opened from inside a science card, levels 0–2 describe that card instead of the world. */
export function hintLadder(stage:StageKey,room:string|null,l:Locale,card:string|null=null):HintStep[]{
  const o=OBJECTIVES[stage],h=HINTS[stage],goal=MISSION_BUILDING[stage];
  const ch=card?CARD_HINTS[card]:null;
  if(ch)return [
    {level:0,category:'goal',text:pick(ch.goal,l),visual:'none'},
    {level:1,category:'nav',text:pick(ch.nav,l),visual:'none'},
    {level:2,category:'control',text:pick(ch.control,l),visual:'none'},
    {level:3,category:'science',text:pick(h.science,l),visual:card==='field'||card==='research'?'graph':'none'},
  ];
  const atGoal=(goal&&room===goal)||(stage==='monitor'&&!room);
  const goalText=`${pick(o.task,l)} · ${pick(o.where,l)}`;
  const nav=room&&goal&&room!==goal?(l==='en'?'Walk to the exit at the bottom of this room, then follow the yellow beacon.':'امشي لباب الخروج اللي تحت في الأوضة، وبعدين امشي ورا العلامة الصفرا.'):
    room&&stage==='monitor'?(l==='en'?'The field terminal is outside. Walk to the exit at the bottom of this room.':'شاشة الميدان برّه. امشي لباب الخروج اللي تحت في الأوضة.'):pick(h.nav,l);
  return [
    {level:0,category:'goal',text:goalText,visual:'none'},
    {level:1,category:'nav',text:atGoal&&stage!=='monitor'?(l==='en'?'You are in the right place!':'إنت في المكان الصح!'):nav,visual:'beacon'},
    {level:2,category:'control',text:pick(h.control,l),visual:'device'},
    {level:3,category:'science',text:pick(h.science,l),visual:stage==='monitor'||stage==='research'?'graph':'none'},
  ];
}

export const IDLE_OFFER_MS={guided:45000,independent:120000} as const;
