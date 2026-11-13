// Science XP, achievements, titles, cosmetics and challenges.
// XP values are a configurable game balance, not a scientific measurement. Rebalance here only.
import type {Tx} from '../content/strings';
const tx=(en:string,ar:string):Tx=>({en,ar});

export const XP={
  discoverEvidence:10,      // discover a new evidence record
  interpretObservation:15,  // correctly interpret a scientific observation
  explainDecision:20,       // explain a decision using evidence
  reviseConclusion:15,      // revise / extend a conclusion using new evidence
  completeMission:30,       // complete a science mission
  optionalDiscovery:10,     // finish an optional educational discovery
} as const;
export type XpKind=keyof typeof XP;

export type AchievementId='first-discovery'|'evidence-detective'|'careful-scientist'|'second-look'|'scientific-thinker'|'mission-complete'|'method-master'|'outpost-explorer'|'curious-mind'|'branch-explorer';
export type Motivation='collect'|'solve'|'explore';
export const ACHIEVEMENTS:Record<AchievementId,{name:Tx;how:Tx;motivation:Motivation}>={
  'first-discovery':{name:tx('First Discovery','أول اكتشاف'),how:tx('Examine your first real NASA evidence record.','افحص أول سجل حقيقي من ناسا.'),motivation:'collect'},
  'evidence-detective':{name:tx('Evidence Detective','مخبر الأدلة'),how:tx('Find the part of the graph where the rover’s readings changed.','لاقي الجزء من الرسم اللي قراءات الروبوت اتغيرت فيه.'),motivation:'solve'},
  'careful-scientist':{name:tx('Careful Scientist','عالِم حريص'),how:tx('Explain your plan with strong evidence.','اشرح خطتك بدليل قوي.'),motivation:'solve'},
  'second-look':{name:tx('Second Look','بصة تانية'),how:tx('Look at the evidence again after learning what we don’t know.','بُص على الأدلة تاني بعد ما تعرف اللي منعرفوش.'),motivation:'collect'},
  'scientific-thinker':{name:tx('Scientific Thinker','مفكّر علمي'),how:tx('Explain why a rover reading is not an astronaut’s dose.','اشرح ليه قراية الروبوت مش جرعة رائد فضاء.'),motivation:'collect'},
  'mission-complete':{name:tx('Mission Complete','المهمة خلصت'),how:tx('Finish The Rover Reading and see its outcome.','خلّص مهمة قراءة روبوت المريخ وشوف النتيجة.'),motivation:'solve'},
  'method-master':{name:tx('Method Master','أستاذ الطريقة'),how:tx('Use the scientist’s method on a brand-new example.','استخدم طريقة العلماء في مثال جديد.'),motivation:'solve'},
  'outpost-explorer':{name:tx('Outpost Explorer','مستكشف القاعدة'),how:tx('Visit all nine places in the outpost.','زور كل الأماكن التسعة في القاعدة.'),motivation:'explore'},
  'curious-mind':{name:tx('Curious Mind','عقل فضولي'),how:tx('Read three optional science exhibits.','اقرا تلات معروضات علمية اختيارية.'),motivation:'explore'},
  'branch-explorer':{name:tx('Branch Explorer','مستكشف الطرق'),how:tx('Discover what both plans lead to (try a replay).','اكتشف الخطتين بيوصّلوا لإيه (جرّب تلعب تاني).'),motivation:'solve'},
};
export const ACHIEVEMENT_ORDER=Object.keys(ACHIEVEMENTS) as AchievementId[];

// Every reward has a stable event ID. An event pays out at most once per player profile.
export type RewardEvent={xp?:XpKind;achievement?:AchievementId;cards?:string[];challenge?:string};
export const REWARD_EVENTS:Record<string,RewardEvent>={
  'ev:curiosity-card':{cards:['curiosity-rover']},
  'ev:rad-card':{cards:['rad-instrument']},
  'ev:may20-series':{xp:'discoverEvidence',achievement:'first-discovery',cards:['may20-readings']},
  'ev:found-change':{xp:'interpretObservation',achievement:'evidence-detective',challenge:'check-evidence'},
  'ev:may19-compare':{xp:'discoverEvidence',cards:['compare-days']},
  'ev:unknowns':{cards:['rover-vs-person']},
  'ev:second-look':{xp:'reviseConclusion',achievement:'second-look',cards:['many-readings']},
  'ev:explain-choice':{xp:'explainDecision',achievement:'careful-scientist',challenge:'explain-choice'},
  'ev:reflect-dose':{xp:'interpretObservation',achievement:'scientific-thinker'},
  'ev:transfer':{xp:'interpretObservation',achievement:'method-master'},
  'ev:mission-complete:P2-M02':{xp:'completeMission',achievement:'mission-complete'},
  'ev:branches-both:P2-M02':{xp:'optionalDiscovery',achievement:'branch-explorer',challenge:'both-plans'},
  'ev:all-places':{xp:'optionalDiscovery',achievement:'outpost-explorer'},
  'ev:curious-mind':{achievement:'curious-mind'},
  'ex:data-check':{xp:'optionalDiscovery',cards:['data-check']},
  'ex:surface-typical':{xp:'optionalDiscovery',cards:['surface-typical']},
  'ex:solar-catalog':{xp:'optionalDiscovery',cards:['solar-catalog']},
  'ex:iss-environment':{xp:'optionalDiscovery',cards:['iss-environment']},
};
export const xpFor=(eventId:string)=>{const e=REWARD_EVENTS[eventId];return e?.xp?XP[e.xp]:0};

export const CHALLENGES:{id:string;name:Tx;how:Tx}[]=[
  {id:'check-evidence',name:tx('Check the Evidence','راجع الأدلة'),how:tx('Find out what changed in the rover’s readings.','اعرف إيه اللي اتغير في قراءات الروبوت.')},
  {id:'explain-choice',name:tx('Explain Your Choice','اشرح اختيارك'),how:tx('Which observation helped you make your plan?','أنهي ملاحظة ساعدتك تعمل خطتك؟')},
  {id:'both-plans',name:tx('Two Paths','طريقين'),how:tx('Replay and discover what the other plan changes.','العب تاني واكتشف الخطة التانية بتغيّر إيه.')},
];

export const TITLES:{xp:number;name:Tx}[]=[
  {xp:0,name:tx('Junior Researcher','باحث صغير')},
  {xp:40,name:tx('Data Observer','مراقب بيانات')},
  {xp:90,name:tx('Evidence Detective','مخبر أدلة')},
  {xp:140,name:tx('Science Investigator','محقق علمي')},
  {xp:180,name:tx('Mars Explorer','مستكشف المريخ')},
];
export const titleFor=(xp:number)=>TITLES.reduce((best,t)=>xp>=t.xp?t:best,TITLES[0]);
export const nextTitle=(xp:number)=>TITLES.find(t=>t.xp>xp)||null;

// Cosmetic only: a soft hover light under Nuri. Never gates science content.
export const NURI_LIGHTS:{id:string;color:number;css:string;name:Tx;unlock:AchievementId|null}[]=[
  {id:'cyan',color:0x59d5db,css:'#59d5db',name:tx('Cyan','سماوي'),unlock:null},
  {id:'gold',color:0xffcc68,css:'#ffcc68',name:tx('Gold','دهبي'),unlock:'mission-complete'},
  {id:'mint',color:0x85cb93,css:'#85cb93',name:tx('Mint','نعناعي'),unlock:'curious-mind'},
  {id:'coral',color:0xf08a6a,css:'#f08a6a',name:tx('Coral','مرجاني'),unlock:'branch-explorer'},
];
