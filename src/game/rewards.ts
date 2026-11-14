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

export type AchievementId='first-discovery'|'evidence-detective'|'careful-scientist'|'second-look'|'scientific-thinker'|'mission-complete'|'method-master'|'outpost-explorer'|'curious-mind'|'branch-explorer'|'log-keeper'|'sun-watcher'|'plant-scientist'|'power-planner'|'base-commander';
export type Motivation='collect'|'solve'|'explore';
export const ACHIEVEMENTS:Record<AchievementId,{name:Tx;how:Tx;motivation:Motivation}>={
  'first-discovery':{name:tx('First Clue','أول دليل'),how:tx('Look at real NASA data.','بُص على بيانات ناسا حقيقية.'),motivation:'collect'},
  'evidence-detective':{name:tx('Evidence Detective','مخبر الأدلة'),how:tx('Find where the dots jump up.','لاقي النقط نطت فين.'),motivation:'solve'},
  'careful-scientist':{name:tx('Careful Scientist','عالِم حريص'),how:tx('Pick a strong clue for your plan.','اختار دليل قوي لخطتك.'),motivation:'solve'},
  'second-look':{name:tx('Second Look','بصة تانية'),how:tx('Look at the dots again.','بُص على النقط تاني.'),motivation:'collect'},
  'scientific-thinker':{name:tx('Big Thinker','مفكّر كبير'),how:tx('Know that a robot reading is not a person’s.','اعرف إن قراية الروبوت مش قراية إنسان.'),motivation:'collect'},
  'mission-complete':{name:tx('Mission Complete','المهمة خلصت'),how:tx('Finish the mission.','خلّص المهمة.'),motivation:'solve'},
  'method-master':{name:tx('Clue Master','أستاذ الأدلة'),how:tx('Answer the new robot question.','جاوب سؤال الروبوت الجديد.'),motivation:'solve'},
  'outpost-explorer':{name:tx('Outpost Explorer','مستكشف القاعدة'),how:tx('Visit all 9 places.','زور الـ٩ أماكن كلهم.'),motivation:'explore'},
  'curious-mind':{name:tx('Curious Mind','عقل فضولي'),how:tx('Find 3 bonus facts.','لاقي ٣ معلومات زيادة.'),motivation:'explore'},
  'branch-explorer':{name:tx('Two Paths','طريقين'),how:tx('Try both plans. Play again!','جرّب الخطتين. العب تاني!'),motivation:'solve'},
  'log-keeper':{name:tx('Notebook Keeper','حارس الكشكول'),how:tx('Fix the robot’s notebook.','صلّح كشكول الروبوت.'),motivation:'solve'},
  'sun-watcher':{name:tx('Sun Watcher','مراقب الشمس'),how:tx('Finish Sun Storm Watch.','خلّص مراقبة عواصف الشمس.'),motivation:'solve'},
  'plant-scientist':{name:tx('Plant Scientist','عالِم نباتات'),how:tx('Learn what a fair plant test needs.','اعرف الاختبار العادل للنباتات محتاج إيه.'),motivation:'collect'},
  'power-planner':{name:tx('Power Planner','مخطط الطاقة'),how:tx('Share the base power.','قسّم طاقة القاعدة.'),motivation:'solve'},
  'base-commander':{name:tx('Base Commander','قائد القاعدة'),how:tx('Finish every base mission.','خلّص كل مهمات القاعدة.'),motivation:'collect'},
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
  'ex:crop-education':{xp:'optionalDiscovery',cards:['crop-education']},
  'ex:mars-map':{xp:'optionalDiscovery',cards:['mars-map']},
  // Campaign missions (src/missions/campaign-data.ts)
  'ev:c-log-seen':{xp:'discoverEvidence'},'ev:c-log-dupes':{xp:'interpretObservation'},'ev:c-log-gap':{xp:'interpretObservation'},
  'ev:mission-complete:M2-LOG':{xp:'completeMission',achievement:'log-keeper'},
  'ev:c-sun-seen':{xp:'discoverEvidence'},'ev:c-sun-quiz':{xp:'interpretObservation'},
  'ev:mission-complete:M3-SUN':{xp:'completeMission',achievement:'sun-watcher'},
  'ev:c-plants-seen':{xp:'discoverEvidence'},'ev:c-plants-quiz':{xp:'interpretObservation'},
  'ev:mission-complete:M4-PLANTS':{xp:'completeMission',achievement:'plant-scientist'},
  'ev:c-power-share':{xp:'optionalDiscovery'},'ev:c-map-seen':{xp:'discoverEvidence'},'ev:c-map-quiz':{xp:'interpretObservation'},
  'ev:mission-complete:M5-POWER':{xp:'completeMission',achievement:'power-planner'},
  'ev:c-story-seen':{xp:'reviseConclusion'},
  'ev:mission-complete:M6-PLAN':{xp:'completeMission'},
  'ev:campaign-complete':{xp:'completeMission',achievement:'base-commander'},
};
export const xpFor=(eventId:string)=>{const e=REWARD_EVENTS[eventId];return e?.xp?XP[e.xp]:0};

export const CHALLENGES:{id:string;name:Tx;how:Tx}[]=[
  {id:'check-evidence',name:tx('Check the Clue','راجع الدليل'),how:tx('Find what changed in the dots.','لاقي إيه اللي اتغير في النقط.')},
  {id:'explain-choice',name:tx('Why This Plan?','ليه الخطة دي؟'),how:tx('Pick the clue that helped you.','اختار الدليل اللي ساعدك.')},
  {id:'both-plans',name:tx('Two Paths','طريقين'),how:tx('Play again and try the other plan.','العب تاني وجرّب الخطة التانية.')},
];

export const TITLES:{xp:number;name:Tx}[]=[
  {xp:0,name:tx('Junior Researcher','باحث صغير')},
  {xp:40,name:tx('Data Observer','مراقب بيانات')},
  {xp:90,name:tx('Evidence Detective','مخبر أدلة')},
  {xp:140,name:tx('Science Investigator','محقق علمي')},
  {xp:180,name:tx('Mars Explorer','مستكشف المريخ')},
  {xp:300,name:tx('Base Scientist','عالِم القاعدة')},
  {xp:450,name:tx('Mars Commander','قائد المريخ')},
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
