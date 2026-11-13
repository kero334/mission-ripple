// Player progress: Science XP, badges, discovery cards, places, exhibits, challenges, preferences.
// Separate from the mission save so the original P2-M02 save stays untouched and compatible.
// XP is never stored as a free number: it is recomputed from the set of awarded event IDs,
// so a reward can never be counted twice (reload, replay or reopening a card).
import {ACHIEVEMENTS,REWARD_EVENTS,XP,titleFor,xpFor,NURI_LIGHTS,type AchievementId} from './rewards';
import type {Locale} from '../content/strings';

export const PROGRESS_KEY='mission-ripple-progress-v1';
export type Guidance='guided'|'independent';
export type Preference='explore'|'solve'|'collect'|'mix'|null;
export type Decision='review-defer'|'survey-followup';
export type Progress={
  version:1;
  awarded:string[];
  achievements:AchievementId[];
  cards:string[];
  places:string[];
  exhibits:string[];
  challenges:string[];
  branchesSeen:Decision[];
  completions:number;
  run:{events:string[]};
  settings:{locale:Locale;guidance:Guidance;preference:Preference;nuriLight:string};
  hintLevel:Record<string,number>;
  stats:{hintRequests:number;wrongPlaces:number;misses:number;helpOffers:number};
  flags:string[];
};
const PLACE_IDS=['habitat','power','greenhouse','water','research','comms','command','shelter','oxygen'];
const EXHIBIT_IDS=['data-check','surface-typical','solar-catalog','iss-environment','crop-education','mars-map'];
export const fresh=():Progress=>({version:1,awarded:[],achievements:[],cards:[],places:[],exhibits:[],challenges:[],branchesSeen:[],completions:0,run:{events:[]},
  settings:{locale:'en',guidance:'guided',preference:null,nuriLight:'cyan'},hintLevel:{},stats:{hintRequests:0,wrongPlaces:0,misses:0,helpOffers:0},flags:[]});

const uniq=<T>(a:T[])=>[...new Set(a)];
const strings=(a:unknown,allowed?:readonly string[])=>Array.isArray(a)?uniq(a.filter((v):v is string=>typeof v==='string'&&(!allowed||allowed.includes(v)))):[];
const nonNeg=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>=0?Math.floor(n):0;

/** Rebuilds every derived field from the awarded event list; tolerant of old or edited data. */
export function sanitize(x:any):Progress{
  const p=fresh();if(!x||typeof x!=='object'||x.version!==1)return p;
  p.awarded=strings(x.awarded,Object.keys(REWARD_EVENTS));
  const fromEvents=(f:(e:typeof REWARD_EVENTS[string])=>string|string[]|undefined)=>uniq(p.awarded.flatMap(id=>{const v=f(REWARD_EVENTS[id]);return v?Array.isArray(v)?v:[v]:[]}));
  p.achievements=fromEvents(e=>e.achievement) as AchievementId[];
  p.cards=fromEvents(e=>e.cards);
  p.challenges=fromEvents(e=>e.challenge);
  p.places=strings(x.places,PLACE_IDS);
  p.exhibits=strings(x.exhibits,EXHIBIT_IDS);
  p.branchesSeen=strings(x.branchesSeen,['review-defer','survey-followup']) as Decision[];
  p.completions=nonNeg(x.completions);
  p.run={events:strings(x.run?.events,p.awarded)};
  const s=x.settings||{};
  p.settings={locale:s.locale==='ar'?'ar':'en',guidance:s.guidance==='independent'?'independent':'guided',
    preference:['explore','solve','collect','mix'].includes(s.preference)?s.preference:null,
    nuriLight:NURI_LIGHTS.some(n=>n.id===s.nuriLight)?s.nuriLight:'cyan'};
  if(x.hintLevel&&typeof x.hintLevel==='object')for(const [k,v] of Object.entries(x.hintLevel))p.hintLevel[k]=Math.min(3,nonNeg(v));
  const st=x.stats||{};p.stats={hintRequests:nonNeg(st.hintRequests),wrongPlaces:nonNeg(st.wrongPlaces),misses:nonNeg(st.misses),helpOffers:nonNeg(st.helpOffers)};
  p.flags=strings(x.flags);
  return p;
}
export const totalXp=(p:Progress)=>p.awarded.reduce((sum,id)=>sum+xpFor(id),0);
export const runXp=(p:Progress)=>p.run.events.reduce((sum,id)=>sum+xpFor(id),0);

export type RewardNotice={eventId:string;xp:number;achievement?:AchievementId;cards:string[];challenge?:string;title?:string};

export function createProgressStore(storage:Pick<Storage,'getItem'|'setItem'>=localStorage){
  let state:Progress;
  try{state=sanitize(JSON.parse(storage.getItem(PROGRESS_KEY)||'null'))}catch{state=fresh()}
  const listeners=new Set<(n:RewardNotice)=>void>();
  const save=()=>{try{storage.setItem(PROGRESS_KEY,JSON.stringify(state))}catch{/* keep playing without persistence */}};
  const api={
    get:()=>state,
    xp:()=>totalXp(state),
    has:(eventId:string)=>state.awarded.includes(eventId),
    onReward:(f:(n:RewardNotice)=>void)=>{listeners.add(f);return ()=>listeners.delete(f)},
    /** Idempotent. Returns null when the event is unknown or was already awarded. */
    award(eventId:string,{silent=false}={}):RewardNotice|null{
      const e=REWARD_EVENTS[eventId];if(!e||state.awarded.includes(eventId))return null;
      const before=titleFor(totalXp(state));
      state.awarded=[...state.awarded,eventId];
      state.run={events:[...state.run.events,eventId]};
      if(e.achievement&&!state.achievements.includes(e.achievement))state.achievements=[...state.achievements,e.achievement];
      const newCards=(e.cards||[]).filter(c=>!state.cards.includes(c));state.cards=[...state.cards,...newCards];
      if(e.challenge&&!state.challenges.includes(e.challenge))state.challenges=[...state.challenges,e.challenge];
      const after=titleFor(totalXp(state));
      save();
      const notice:RewardNotice={eventId,xp:e.xp?XP[e.xp]:0,achievement:e.achievement,cards:newCards,challenge:e.challenge,title:after!==before?after.name.en:undefined};
      if(!silent)listeners.forEach(f=>f(notice));
      return notice;
    },
    visitPlace(id:string){if(!PLACE_IDS.includes(id)||state.places.includes(id))return false;state.places=[...state.places,id];save();if(state.places.length===PLACE_IDS.length)api.award('ev:all-places');return true},
    readExhibit(id:string){if(!EXHIBIT_IDS.includes(id))return null;const first=!state.exhibits.includes(id);if(first){state.exhibits=[...state.exhibits,id];save()}const n=api.award('ex:'+id);if(state.exhibits.length>=3)api.award('ev:curious-mind');return first?n:null},
    seeBranch(choice:Decision){if(!state.branchesSeen.includes(choice)){state.branchesSeen=[...state.branchesSeen,choice];save()}if(state.branchesSeen.length===2)api.award('ev:branches-both:P2-M02')},
    completeRun(){state.completions+=1;save();api.award('ev:mission-complete:P2-M02')},
    startRun(){state.run={events:[]};state.hintLevel={};save()},
    setting<K extends keyof Progress['settings']>(k:K,v:Progress['settings'][K]){state.settings={...state.settings,[k]:v};save()},
    hintLevel:(stage:string)=>state.hintLevel[stage]||0,
    setHintLevel(stage:string,level:number){state.hintLevel={...state.hintLevel,[stage]:Math.max(0,Math.min(3,level))};save()},
    count(k:keyof Progress['stats']){state.stats={...state.stats,[k]:state.stats[k]+1};save()},
    flag(id:string){if(state.flags.includes(id))return false;state.flags=[...state.flags,id];save();return true},
    flagOnce:(id:string)=>api.flag(id),
    xpOf:(eventId:string)=>xpFor(eventId),
    eventAchievement:(eventId:string)=>REWARD_EVENTS[eventId]?.achievement||null,
    eventCards:(eventId:string)=>REWARD_EVENTS[eventId]?.cards||[],
    titleName:(l:Locale)=>titleFor(totalXp(state)).name[l],
    achievementLabel:(id:string,l:Locale)=>ACHIEVEMENTS[id as AchievementId]?.name[l]||id,
    /** One-time seeding from an older P2-M02 save made before progress existed. */
    migrateFromMission(m:{stage:string;choice:Decision|null}){
      if(!api.flag('migrated-from-mission-v1'))return;
      if(m.choice)api.seeBranch(m.choice);
      if(m.stage==='complete'){state.completions=Math.max(1,state.completions);api.award('ev:mission-complete:P2-M02',{silent:true})}
      save();
    },
    reset(){state=fresh();save()},
  };
  return api;
}
export type ProgressStore=ReturnType<typeof createProgressStore>;
export const achievementName=(id:AchievementId,l:Locale)=>ACHIEVEMENTS[id].name[l];
