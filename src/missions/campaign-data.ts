// Campaign missions after The Rover Reading. Each one follows a research-package candidate and uses that
// candidate's own A/B decision design (05_MISSION_EVIDENCE/decision_evidence.json). The base that the choices
// change is a PRETEND training base (src/game/base-sim.ts), always labelled as pretend in the UI.
// Chain: Mission 1 → robot (Mission 5) · Mission 2 → spare block → cost of Mission 3 → greenhouse lamps → plants
// (Missions 4–6) · Mission 5 road → stuck robot (Mission 6) · power check, lamp fix, rescue = recovery chances.
import type {Tx} from '../content/strings';
import {spare,lamps,type Base,type Slot} from '../game/base-sim';
const tx=(en:string,ar:string):Tx=>({en,ar});
export type Dyn=Tx|((b:Base)=>Tx);
export const dyn=(d:Dyn,b:Base):Tx=>typeof d==='function'?d(b):d;

export type Opt={id:'A'|'B';decisionId:string;title:Tx;gain:Dyn;cost:Dyn;icon:string;now:Tx;flag:string;later?:Dyn};
export type Quiz={options:{label:Tx;ok:boolean;fb:Tx}[];award:string};
export type SceneKind='garden'|'fix'|'power'|'stuck'|'rescue';
export type SceneDef={id:string;art:string;say:Tx;more?:Tx;stamp?:'nasa'|'game';grown?:string;quiz?:Quiz;award?:string;kind?:SceneKind;when?:(b:Base)=>boolean};
export type Step={id:string;building:string;task:Tx;where:Tx;scenes:SceneDef[];decide?:boolean;when?:(b:Base)=>boolean};
export type CampaignMission={id:string;candidate:string;title:Tx;brief:Tx;icon:string;refs:string[];evidence:'nasa'|'pretend';steps:Step[];options:[Opt,Opt];lesson:Tx;think:Tx;badge:string};

const go=(b:string,en:string,ar:string):SceneDef=>({id:'go-'+b,art:'building:'+b,say:tx(en,ar)});
const spareOr=(yes:Tx,no:Tx)=>(b:Base)=>spare(b)>0?yes:no;

export const CAMPAIGN:CampaignMission[]=[
  {id:'M2-LOG',candidate:'P2-M01 + P2-M08',icon:'science/science-rows',refs:['P2-RAD-08','P2-RAD-06'],evidence:'nasa',badge:'log-keeper',
    title:tx('Fix the Robot’s Notebook','نصلّح كشكول الروبوت'),
    brief:tx('The robot’s notebook has two problems. Let’s find them in the Research Lab!','كشكول الروبوت فيه مشكلتين. يلا نلاقيهم في مختبر الأبحاث!'),
    think:tx('If a number is missing, should we guess it? What would a good scientist do?','لو رقم ناقص، نخمّنه؟ العالِم الشاطر يعمل إيه؟'),
    steps:[
      {id:'log',building:'research',task:tx('Check the robot’s notebook','راجع كشكول الروبوت'),where:tx('Research Lab','مختبر الأبحاث'),scenes:[
        {id:'notebook',art:'notebook',stamp:'nasa',award:'ev:c-log-seen',say:tx('Curiosity writes every reading in a long list, like a notebook.','كيوريوسيتي بيكتب كل قراية في قايمة طويلة، زي الكشكول.'),grown:'log'},
        {id:'dupes',art:'dupes',stamp:'nasa',say:tx('Look at these real rows. What’s strange?','بُص على الصفوف الحقيقية دي. إيه الغريب؟'),grown:'log',
          quiz:{award:'ev:c-log-dupes',options:[
            {label:tx('Two readings have the same time','قراءتين ليهم نفس الوقت'),ok:true,fb:tx('Yes, same time but different numbers! Scientists keep both and check.','أيوه، نفس الوقت وأرقام مختلفة! العلماء بيحتفظوا بالاتنين وبيراجعوا.')},
            {label:tx('One number is too big','رقم واحد كبير أوي'),ok:false,fb:tx('Look again at the times on the left.','بُص تاني على الأوقات اللي على الشمال.')},
            {label:tx('Nothing is strange','مفيش حاجة غريبة'),ok:false,fb:tx('Look closely. Two rows share something.','بُص كويس. فيه صفين بيشتركوا في حاجة.')}]}},
        {id:'gap',art:'gap',stamp:'nasa',say:tx('Here, two hours have no readings. Should we fill them with a guess?','هنا ساعتين مفيهمش قراءات. نملاهم بتخمين؟'),grown:'log',
          quiz:{award:'ev:c-log-gap',options:[
            {label:tx('No, mark them as missing','لأ، نكتب إنهم ناقصين'),ok:true,fb:tx('Right! We never make up readings.','صح! عمرنا ما نألف قراءات.')},
            {label:tx('Yes, guess a number','أيوه، نخمّن رقم'),ok:false,fb:tx('Careful, a guess is not a measurement! Try again.','خلي بالك، التخمين مش قياس! جرّب تاني.')}]}},
        go('command','Now let’s make a plan. Go to Command!','دلوقتي نعمل خطة. روح للقيادة!')]},
      {id:'plan',building:'command',task:tx('Plan for missing hours','خطّط للساعات الناقصة'),where:tx('Command Hub','مركز القيادة'),decide:true,scenes:[]}],
    options:[
      {id:'A',decisionId:'P2-M08A',icon:'ripple/monitor-on',title:tx('Turn on a spare monitor','نشغّل شاشة احتياطي'),gain:tx('Fewer gaps in new notes','فراغات أقل في الملاحظات الجديدة'),cost:tx('Uses our spare power block','بتاخد مكعب الطاقة الزيادة'),
        now:tx('You chose the spare monitor. Look, it’s on outside the lab!','إنت اخترت الشاشة الاحتياطي. بُص، اشتغلت برّه المختبر!'),flag:'log_repair_planned',
        later:tx('Because the spare monitor is on, our new notes have fewer gaps!','عشان الشاشة الاحتياطي شغالة، ملاحظاتنا الجديدة فيها فراغات أقل!')},
      {id:'B',decisionId:'P2-M08B',icon:'ui/science-check',title:tx('Keep going, mark gaps','نكمّل ونعلّم الفراغات'),gain:tx('Our spare block stays free','مكعب الطاقة الزيادة يفضل فاضي'),cost:tx('New notes may have gaps','الملاحظات الجديدة ممكن يبقى فيها فراغات'),
        now:tx('You chose Keep going. We marked the gaps and kept our spare block.','إنت اخترت نكمّل. علّمنا الفراغات وفضل معانا المكعب الزيادة.'),flag:'partial_series',
        later:tx('Because you kept going, our notes still have marked gaps. That’s honest!','عشان كمّلنا، ملاحظاتنا لسه فيها فراغات متعلّمة. ودا صدق!')}],
    lesson:tx('Good scientists never make up missing readings. They mark what is missing.','العلماء الشاطرين عمرهم ما بيألفوا قراءات ناقصة. بيكتبوا إيه اللي ناقص.')},

  {id:'M3-SUN',candidate:'P2-M03 / MIS-003',icon:'science/science-sun',refs:['SCI-0003'],evidence:'nasa',badge:'sun-watcher',
    title:tx('Sun Storm Watch','مراقبة عواصف الشمس'),
    brief:tx('NASA’s Sun list has a big alert! Let’s check it at Communications.','قايمة ناسا للشمس فيها تنبيه كبير! يلا نشوفه في الاتصالات.'),
    think:tx('Something happened on the Sun. Does that tell us what happened on Mars?','حصل حاجة على الشمس. ده بيقولنا إيه اللي حصل على المريخ؟'),
    steps:[
      {id:'alert',building:'comms',task:tx('Check the Sun alert','شوف تنبيه الشمس'),where:tx('Communications','الاتصالات'),scenes:[
        {id:'sun',art:'sun',stamp:'nasa',award:'ev:c-sun-seen',say:tx('NASA keeps a list of storms on the Sun. In May 2024 it listed a very big flare!','ناسا عندها قايمة بعواصف الشمس. في مايو ٢٠٢٤ سجّلت توهج كبير جدًا!'),grown:'sun'},
        {id:'sunToMars',art:'sunToMars',stamp:'nasa',say:tx('The flare happened on the Sun. Does the list tell us the radiation on Mars?','التوهج حصل على الشمس. القايمة بتقولنا الإشعاع على المريخ؟'),grown:'sun',
          quiz:{award:'ev:c-sun-quiz',options:[
            {label:tx('No, it’s a list about the Sun','لأ، دي قايمة عن الشمس'),ok:true,fb:tx('Right! A Sun list is a clue, not a Mars measurement.','صح! قايمة الشمس دليل، مش قياس على المريخ.')},
            {label:tx('Yes, it shows Mars radiation','أيوه، بتوري إشعاع المريخ'),ok:false,fb:tx('Hmm, the list is about the Sun, not Mars. Try again!','همم، القايمة عن الشمس، مش المريخ. جرّب تاني!')}]}},
        go('shelter','Let’s make a plan at the Radiation Shelter.','يلا نعمل خطة في ملجأ الإشعاع.')]},
      {id:'plan',building:'shelter',task:tx('Plan for the alert','خطّط للتنبيه'),where:tx('Radiation Shelter · bottom left','ملجأ الإشعاع · تحت على الشمال'),decide:true,scenes:[
        {id:'pretendShelter',art:'building:shelter',stamp:'game',say:tx('In our game, this shelter is a practice room. We don’t know how well it would protect.','في لعبتنا، الملجأ ده أوضة تدريب. منعرفش هيحمي قد إيه.')}]}],
    options:[
      {id:'A',decisionId:'P2-M03A',icon:'ripple/watch-on',title:tx('Watch and check','نراقب ونتأكد'),gain:tx('We learn what the alert was','نعرف التنبيه كان إيه'),
        cost:spareOr(tx('Uses our spare power block','بتاخد مكعب الطاقة الزيادة'),tx('No spare block! One greenhouse lamp turns off','مفيش مكعب زيادة! لمبة في البيت الزراعي هتطفي')),
        now:tx('You chose Watch and check. The watch screen at Communications is on!','إنت اخترت نراقب ونتأكد. شاشة المراقبة في الاتصالات اشتغلت!'),flag:'watch_prepared',
        later:tx('Because you watched, we know the alert was a Sun flare. No mystery!','عشان راقبنا، عرفنا إن التنبيه كان توهج شمسي. مفيش لغز!')},
      {id:'B',decisionId:'P2-M03B',icon:'ui/science-research',title:tx('Keep doing science','نكمّل شغل علمي'),gain:tx('No power used','من غير طاقة'),cost:tx('The alert stays a mystery','التنبيه يفضل لغز'),
        now:tx('You chose Keep doing science. We wrote the alert down for later.','إنت اخترت نكمّل شغل علمي. كتبنا التنبيه عشان بعدين.'),flag:'unresolved_alert',
        later:tx('Because you kept doing science, the Sun alert is still a mystery.','عشان كمّلنا شغل علمي، تنبيه الشمس لسه لغز.')}],
    lesson:tx('A Sun storm list is a clue. It is not a measurement on Mars.','قايمة عواصف الشمس دليل. مش قياس على المريخ.')},

  {id:'M4-PLANTS',candidate:'P2-M05 (+ P2-M06 CSA)',icon:'ui/ui-plant-pixel',refs:['P2-OSD-615','P2-CSA-01'],evidence:'nasa',badge:'plant-scientist',
    title:tx('Plant Detectives','مخبرين النباتات'),
    brief:tx('A new day! Let’s see how our plants are doing in the Greenhouse.','يوم جديد! يلا نشوف النباتات عاملة إيه في البيت الزراعي.'),
    think:tx('To know what helped a plant, what do we need to compare it with?','عشان نعرف إيه اللي ساعد النبات، نقارنه بإيه؟'),
    steps:[
      {id:'study',building:'greenhouse',task:tx('Check on the plants','اطمّن على النباتات'),where:tx('Greenhouse','البيت الزراعي'),scenes:[
        {id:'garden',art:'garden',kind:'garden',stamp:'game',say:tx('',''),grown:'pretend'},
        {id:'fix',art:'fix',kind:'fix',stamp:'game',say:tx('One lamp is off, so the plants are shrinking. Can we move power back?','لمبة طافية، فالنباتات بتصغر. نقدر نرجّع الطاقة؟'),when:b=>lamps(b)<2},
        {id:'study',art:'plants',stamp:'nasa',award:'ev:c-plants-seen',say:tx('NASA grew plants in space, and the same kind on the ground. 6 and 6!','ناسا زرعت نباتات في الفضاء، ونفس النوع على الأرض. ٦ و٦!'),grown:'plants'},
        {id:'control',art:'plants',stamp:'nasa',say:tx('Why grow the same plants on the ground too?','ليه نزرع نفس النباتات على الأرض كمان؟'),grown:'plants',
          quiz:{award:'ev:c-plants-quiz',options:[
            {label:tx('To compare them','عشان نقارنهم'),ok:true,fb:tx('Yes, that’s a control group! It makes the test fair.','أيوه، دي مجموعة المقارنة! بتخلّي الاختبار عادل.')},
            {label:tx('To have more plants','عشان يبقى عندنا نباتات أكتر'),ok:false,fb:tx('More plants is nice, but think about comparing. Try again!','نباتات أكتر حلو، بس فكّر في المقارنة. جرّب تاني!')},
            {label:tx('No reason','مفيش سبب'),ok:false,fb:tx('There is a good reason! Think about a fair test.','فيه سبب حلو! فكّر في الاختبار العادل.')}]}},
        {id:'noYield',art:'icon:ui/science-question',say:tx('This study tells us how it was set up. It doesn’t tell us how much food plants make on Mars.','الدراسة دي بتقول اتعملت إزاي. ما بتقولش النباتات بتعمل أكل قد إيه على المريخ.'),grown:'plants'},
        go('command','Let’s plan our plant trays at Command!','يلا نخطط لصواني الزرع في القيادة!')]},
      {id:'plan',building:'command',task:tx('Plan the greenhouse trays','خطّط صواني الزرع'),where:tx('Command Hub','مركز القيادة'),decide:true,scenes:[]}],
    options:[
      {id:'A',decisionId:'P2-M05A',icon:'science/science-compare',title:tx('Keep a control tray','نسيب صينية للمقارنة'),gain:tx('We can compare fairly','نقدر نقارن بعدل'),cost:tx('Extra growth comes tomorrow','النمو الزيادة بكرة'),
        now:tx('You chose Keep a control tray. One tray stays the same, for comparing.','إنت اخترت نسيب صينية للمقارنة. صينية واحدة فضلت زي ما هي، للمقارنة.'),flag:'plant_control_ready',
        later:tx('Because you kept a control tray, we found the better tray. The plants grew extra!','عشان سبنا صينية للمقارنة، لقينا الصينية الأحسن. والنباتات كبرت زيادة!')},
      {id:'B',decisionId:'P2-M05B',icon:'ui/ui-plant-pixel',title:tx('Use all trays','نستخدم كل الصواني'),gain:tx('Plants grow a bit more now','النباتات تكبر شوية دلوقتي'),cost:tx('We can’t compare','مش هنقدر نقارن'),
        now:tx('You chose Use all trays. Look, the plants grew a little!','إنت اخترت نستخدم كل الصواني. بُص، النباتات كبرت شوية!'),flag:'plant_comparison_missing',
        later:tx('Because you used all trays, we can’t tell what helped the plants.','عشان استخدمنا كل الصواني، مش عارفين إيه اللي ساعد النباتات.')}],
    lesson:tx('A fair test compares with a control group.','الاختبار العادل بيقارن بمجموعة مقارنة.')},

  {id:'M5-POWER',candidate:'P2-M07 + pretend base systems',icon:'ui/ui-power-pixel',refs:['P2-TREK-01'],evidence:'nasa',badge:'power-planner',
    title:tx('Share the Power','نقسّم الطاقة'),
    brief:tx('Time for the power check! Let’s go to the Power Station.','وقت مراجعة الطاقة! يلا نروح محطة الطاقة.'),
    think:tx('Can a colorful map tell us exactly how steep a hill is?','الخريطة الملونة تقدر تقولنا الجبل عالي قد إيه بالظبط؟'),
    steps:[
      {id:'check',building:'power',task:tx('Do the power check','راجع الطاقة'),where:tx('Power Station','محطة الطاقة'),scenes:[
        {id:'power',art:'power',kind:'power',stamp:'game',award:'ev:c-power-share',say:tx('This is our power check. Tap a light to turn it on or off.','دي مراجعة الطاقة. دوس على أي نور عشان تشغّله أو تطفيه.'),more:tx('We have 3 blocks. Each block lights one thing.','عندنا ٣ مكعبات. كل مكعب بينوّر حاجة واحدة.'),grown:'pretend'},
        go('command','Now the robot trip. Let’s look at the map in Command!','دلوقتي رحلة الروبوت. يلا نبص على الخريطة في القيادة!')]},
      {id:'route',building:'command',task:tx('Plan the robot trip','خطّط رحلة الروبوت'),where:tx('Command Hub','مركز القيادة'),decide:true,scenes:[
        {id:'map',art:'map',stamp:'nasa',award:'ev:c-map-seen',say:tx('NASA’s Mars Trek makes maps of Mars. Colors show high and low places.','موقع مارس تريك بتاع ناسا بيعمل خرايط للمريخ. الألوان بتوري الأماكن العالية والواطية.'),grown:'map',
          quiz:{award:'ev:c-map-quiz',options:[
            {label:tx('No, colors are only a picture','لأ، الألوان صورة بس'),ok:true,fb:tx('Right! The colors can’t tell us exactly how steep it is.','صح! الألوان ما تقدرش تقولنا الانحدار بالظبط.')},
            {label:tx('Yes, colors give exact steepness','أيوه، الألوان بتدّي الانحدار بالظبط'),ok:false,fb:tx('Not exactly, the map is a colored picture! Try again.','مش بالظبط، الخريطة صورة ملونة! جرّب تاني.')}]}}]}],
    options:[
      {id:'A',decisionId:'P2-M07A',icon:'ui/science-robot',title:tx('Scout first','نستكشف الأول'),gain:tx('We learn the road first','نعرف الطريق الأول'),
        cost:b=>b.m1==='study'?tx('Free! The robot rested in Mission 1','ببلاش! الروبوت ارتاح في المهمة ١'):spare(b)>0?tx('Uses the spare block for one day','بتاخد المكعب الزيادة يوم واحد'):tx('Borrows one light’s power for one day','بتستلف طاقة نور واحد يوم واحد'),
        now:tx('You chose Scout first. The robot drove off to check the road!','إنت اخترت نستكشف الأول. الروبوت طلع يشوف الطريق!'),flag:'route_recon_done',
        later:tx('The robot is back! It checked the road for us.','الروبوت رجع! شاف الطريق عشاننا.')},
      {id:'B',decisionId:'P2-M07B',icon:'ui/science-rover',title:tx('Short route now','الطريق القصير دلوقتي'),gain:tx('No power used','من غير طاقة'),
        cost:b=>b.m1==='trip'?tx('No problem! The robot knows this road from Mission 1','مفيش مشكلة! الروبوت عارف الطريق ده من المهمة ١'):tx('The ground is unknown','الأرض مش معروفة'),
        now:tx('You chose Short route now. The robot drove off on the short road.','إنت اخترت الطريق القصير. الروبوت طلع على الطريق القصير.'),flag:'route_uncertainty',
        later:b=>b.rover==='stuck'?tx('Oh no! The robot hit a bump on the unknown road. It’s stuck!','يا خبر! الروبوت خبط في مطب على الطريق المجهول. وعلّق!'):tx('The robot knew this road from Mission 1, so the trip went fine!','الروبوت كان عارف الطريق من المهمة ١، فالرحلة عدّت كويس!')}],
    lesson:tx('Every plan has a trade-off. A colored map is a picture, not exact numbers.','كل خطة ليها مقابل. والخريطة الملونة صورة، مش أرقام دقيقة.')},

  {id:'M6-PLAN',candidate:'P2-M10',icon:'ui/science-check',refs:['P2-RAD-07'],evidence:'nasa',badge:'base-commander',
    title:tx('The Base Plan','خطة القاعدة'),
    brief:tx('Last day! Let’s write our base plan for the next team at Command.','آخر يوم! يلا نكتب خطة القاعدة للفريق الجاي في القيادة.'),
    think:tx('Is it OK to say “we don’t know yet” in a plan?','ينفع نقول «لسه منعرفش» في خطة؟'),
    steps:[
      {id:'rover',building:'rover',task:tx('Help the stuck robot','ساعد الروبوت العالق'),where:tx('By the rocks · follow the arrow','عند الصخور · امشي ورا السهم'),when:b=>b.rover==='stuck',scenes:[
        {id:'stuck',art:'stuck',kind:'stuck',stamp:'game',say:tx('Oh no! The robot is stuck on a bump. The road was unknown.','يا خبر! الروبوت علّق في مطب. الطريق كان مجهول.'),more:tx('Remember? You chose Short route now.','فاكر؟ إنت اخترت الطريق القصير.')},
        {id:'rescue',art:'rescue',kind:'rescue',stamp:'game',say:tx('How should we help?','نساعد إزاي؟')},
        go('command','Now let’s write the base plan at Command!','دلوقتي يلا نكتب خطة القاعدة في القيادة!')]},
      {id:'plan',building:'command',task:tx('Write the base plan','اكتب خطة القاعدة'),where:tx('Command Hub','مركز القيادة'),decide:true,scenes:[
        {id:'story',art:'history',stamp:'game',award:'ev:c-story-seen',say:tx('Here is your base story so far. Every icon is one of your choices!','دي حكاية قاعدتك لحد دلوقتي. كل أيقونة اختيار من اختياراتك!')},
        {id:'missing',art:'icon:ui/science-question',stamp:'nasa',say:tx('We still don’t have some real numbers, like a person’s radiation dose. Saying so is good science!','لسه ما عندناش أرقام حقيقية زي جرعة الإشعاع للإنسان. وإننا نقول كده دا علم شاطر!'),grown:'dose'}]}],
    options:[
      {id:'A',decisionId:'P2-M10A',icon:'ui/science-check',title:tx('Share the plan + questions','ننشر الخطة والأسئلة'),gain:tx('The next team helps with one problem','الفريق الجاي يساعد في مشكلة'),cost:tx('Machines stay as they are','الأجهزة تفضل زي ما هي'),
        now:tx('You chose Share the plan. We wrote what we know, and what we don’t.','إنت اخترت ننشر الخطة. كتبنا اللي نعرفه، واللي منعرفوش.'),flag:'operations_plan_published'},
      {id:'B',decisionId:'P2-M10B',icon:'ripple/lamp-on',title:tx('Pause, ask for data','نوقف ونطلب بيانات'),gain:tx('All power goes to the greenhouse lamps','كل الطاقة تروح للمبات الزرع'),cost:tx('The monitor and watch screen turn off','الشاشة الاحتياطي وشاشة المراقبة يطفوا'),
        now:tx('You chose Pause. Extra machines stopped safely. The lamps are bright!','إنت اخترت نوقف. الأجهزة الزيادة وقفت بأمان. واللمبات منوّرة!'),flag:'safe_early_termination'}],
    lesson:tx('A good plan says what we know, and what we still need to find out.','الخطة الحلوة بتقول إيه اللي نعرفه، وإيه اللي لسه محتاجين نعرفه.')},
];

export const SLOT_NAMES:Record<Slot,Tx>={lamp1:tx('Lamp 1','لمبة ١'),lamp2:tx('Lamp 2','لمبة ٢'),monitor:tx('Spare monitor','الشاشة الاحتياطي'),watch:tx('Watch screen','شاشة المراقبة')};
export const SLOT_HINTS:Record<Slot,Tx>={lamp1:tx('2 lamps on: plants grow','لمبتين: النباتات تكبر'),lamp2:tx('2 lamps on: plants grow','لمبتين: النباتات تكبر'),monitor:tx('On: fewer gaps in notes','شغالة: فراغات أقل'),watch:tx('On: checks the Sun alert','شغالة: بتتأكد من تنبيه الشمس')};
export const STAGE_SAY:Tx[]=[
  tx('The plants are drooping. They need light!','النباتات دبلانة. محتاجة نور!'),
  tx('The plants look weak. The greenhouse is dim.','النباتات ضعيفة. البيت الزراعي ضلمة شوية.'),
  tx('The plants are growing. Nice!','النباتات بتكبر. حلو!'),
  tx('The plants look healthy!','النباتات شكلها صحتها كويسة!'),
  tx('The plants are thriving! Both lamps are bright.','النباتات زي الفل! واللمبتين منوّرين.')];
export const STAGE_NAME:Tx[]=[tx('Drooping','دبلانة'),tx('Weak','ضعيفة'),tx('Growing','بتكبر'),tx('Healthy','كويسة'),tx('Thriving','زي الفل')];
export const CAUSE:Record<'watch'|'rover'|'helper'|'you',Tx>={
  watch:tx('Remember? The watch screen is using a lamp’s power.','فاكر؟ شاشة المراقبة واخدة طاقة لمبة.'),
  rover:tx('Remember? The robot borrowed a lamp’s power.','فاكر؟ الروبوت استلف طاقة لمبة.'),
  helper:tx('Remember? The helper robot borrowed a lamp’s power.','فاكر؟ الروبوت المساعد استلف طاقة لمبة.'),
  you:tx('You turned a lamp off at the power check.','إنت طفيت لمبة في مراجعة الطاقة.')};

export const C_UI={
  nextMission:tx('NEXT MISSION','المهمة الجاية'),
  missionN:tx('MISSION {n} OF {total}','مهمة {n} من {total}'),
  remember:tx('Remember last mission?','فاكر المهمة اللي فاتت؟'),
  rememberM1:tx('Remember Mission 1?','فاكر المهمة ١؟'),
  m1:{study:tx('Because you chose Study first, the robot rested. It is parked and fully charged!','عشان اخترت ندرس الأول، الروبوت ارتاح. راكن ومشحون على الآخر!'),
    trip:tx('Because you chose Go and check again, the robot drove out. It learned part of a road!','عشان اخترت نروح ونقيس تاني، الروبوت طلع. واتعلّم حتة من طريق!')},
  choose:tx('The team has time for one plan. Which do you pick?','الفريق عنده وقت لخطة واحدة. هتختار أنهي؟'),
  pretendMore:tx('This plan is pretend, just for our game.','الخطة دي خيالية، للعبتنا بس.'),
  lessonTitle:tx('What we learned','اتعلمنا إيه'),
  done:tx('Mission complete! You earned {xp} Science XP!','المهمة خلصت! كسبت {xp} نقطة علوم!'),
  playStory:tx('PLAY THE BASE STORY AGAIN','العب حكاية القاعدة تاني'),
  watchEnding:tx('WATCH THE ENDING AGAIN','اتفرج على النهاية تاني'),
  seeEnding:tx('SEE THE ENDING','شوف النهاية'),
  meters:tx('PRETEND BASE','قاعدة خيالية'),
  // a new day
  day:tx('A new day on our base!','يوم جديد في قاعدتنا!'),
  grew:tx('Both lamps were on, so the plants grew!','اللمبتين كانوا منوّرين، فالنباتات كبرت!'),
  shrank:tx('Only one lamp was on, so the plants shrank a little.','لمبة واحدة بس كانت منوّرة، فالنباتات صغرت شوية.'),
  shrank0:tx('The lamps were off, so the plants shrank a little.','اللمبات كانت طافية، فالنباتات صغرت شوية.'),
  boost:tx('The better tray helped them grow extra!','الصينية الأحسن ساعدتهم يكبروا زيادة!'),
  returned:tx('The borrowed block came back!','المكعب اللي اتسلف رجع!'),
  checked:tx('The watch screen found it: the alert was a Sun flare!','شاشة المراقبة عرفت: التنبيه كان توهج شمسي!'),
  // recovery
  fixWatch:tx('Turn off the watch screen','نطفي شاشة المراقبة'),fixWatchOk:tx('We already know it was a flare','إحنا خلاص عارفين إنه توهج'),fixWatchNo:tx('The alert check stops','التأكد من التنبيه يقف'),
  fixMonitor:tx('Turn off the spare monitor','نطفي الشاشة الاحتياطي'),fixMonitorNo:tx('New notes may get gaps','الملاحظات الجديدة ممكن يبقى فيها فراغات'),
  fixKeep:tx('Keep the plan','نكمّل بالخطة'),fixKeepNo:tx('The plants keep shrinking','النباتات تفضل تصغر'),fixGain:tx('A lamp turns back on','لمبة ترجع تنوّر'),
  fixed:tx('The lamp is back on! The plants can grow again.','اللمبة رجعت تنوّر! النباتات تقدر تكبر تاني.'),
  kept:tx('OK! We keep the plan. Let’s watch the plants tomorrow.','ماشي! نكمّل بالخطة. نشوف النباتات بكرة.'),
  // power check
  spareN:tx('{n} spare','{n} زيادة'),robotBlock:tx('The robot is using 1 block','الروبوت واخد مكعب'),powerDone:tx('DONE','خلصت'),
  powerFull:tx('No spare block! Turn something off first.','مفيش مكعب زيادة! طفّي حاجة الأول.'),
  // borrow
  borrow:tx('There is no spare block. Which light turns off for one day?','مفيش مكعب زيادة. أنهي نور يطفي يوم واحد؟'),
  // rescue
  help:tx('Send the helper robot','نبعت الروبوت المساعد'),helpGain:tx('Our robot comes home','الروبوت بتاعنا يرجع'),
  leave:tx('Leave it for now','نسيبه دلوقتي'),leaveGain:tx('No power used','من غير طاقة'),leaveCost:tx('The robot stays stuck','الروبوت يفضل عالق'),
  helped:tx('The helper robot is on its way! Our robot will be home tomorrow.','الروبوت المساعد في الطريق! الروبوت بتاعنا هيرجع بكرة.'),
  left:tx('OK. The robot waits by the rocks. We write it in our plan.','ماشي. الروبوت مستني عند الصخور. هنكتبها في الخطة.'),
  // world reactions (Nuri, while exploring)
  nearDim:tx('The greenhouse is dim. Only one lamp has power.','البيت الزراعي ضلمة. لمبة واحدة بس فيها طاقة.'),
  nearDark:tx('The greenhouse is dark. The plants need their lamps!','البيت الزراعي ضلمة خالص. النباتات محتاجة اللمبات!'),
  nearBright:tx('Look how bright the greenhouse is!','بُص البيت الزراعي منوّر إزاي!'),
  nearMonitor:tx('The spare monitor is on. Fewer gaps in our notes!','الشاشة الاحتياطي شغالة. فراغات أقل في ملاحظاتنا!'),
  nearWatch:tx('The watch screen is on. It keeps an eye on the Sun list.','شاشة المراقبة شغالة. بتراقب قايمة الشمس.'),
  nearMystery:tx('The Sun alert is still a mystery. The watch screen is off.','تنبيه الشمس لسه لغز. شاشة المراقبة طافية.'),
  nearStuck:tx('There’s our robot, stuck by the rocks!','أهو الروبوت بتاعنا، عالق عند الصخور!'),
  // ending
  endTitle:{thrive:tx('THE BASE THRIVES','القاعدة مزدهرة'),continue:tx('THE MISSION CONTINUES','المهمة مستمرة'),setback:tx('A HARD DAY FOR THE BASE','يوم صعب على القاعدة')},
  endSay:{thrive:tx('Healthy plants and few open problems. Great teamwork!','نباتات صحتها كويسة ومشاكل قليلة. شغل جماعي جميل!'),
    continue:tx('The base works, but some problems are still open.','القاعدة شغالة، بس فيه مشاكل لسه مفتوحة.'),
    setback:tx('Weak plants or many open problems. Every scientist has hard days!','نباتات ضعيفة أو مشاكل كتير. كل العلماء عندهم أيام صعبة!')},
  endMore:{thrive:tx('Your choices helped the whole base grow.','اختياراتك ساعدت القاعدة كلها تكبر.'),
    continue:tx('Next time, try fixing one more problem.','المرة الجاية، جرّب تصلّح مشكلة كمان.'),
    setback:tx('Try a different plan. Watch how the base changes!','جرّب خطة تانية. وشوف القاعدة هتتغير إزاي!')},
  why:tx('How your choices led here','اختياراتك وصلتنا هنا إزاي'),
  plantsWhy:[tx('Many days were dim, so the plants got weak.','أيام كتير كانت ضلمة، فالنباتات ضعفت.'),tx('Many days were dim, so the plants got weak.','أيام كتير كانت ضلمة، فالنباتات ضعفت.'),
    tx('Some days were dim, so the plants grew only a little.','شوية أيام كانت ضلمة، فالنباتات كبرت شوية بس.'),tx('The lamps were bright most days, so the plants grew.','اللمبات كانت منوّرة أغلب الأيام، فالنباتات كبرت.'),tx('The lamps were bright most days, so the plants grew.','اللمبات كانت منوّرة أغلب الأيام، فالنباتات كبرت.')],
  open:{notes:tx('Our notes still have gaps.','ملاحظاتنا لسه فيها فراغات.'),alert:tx('The Sun alert is still a mystery.','تنبيه الشمس لسه لغز.'),fair:tx('We could not compare the plant trays.','ما قدرناش نقارن صواني الزرع.'),rover:tx('The robot is still stuck.','الروبوت لسه عالق.')},
  solved:{notes:tx('Fewer gaps in our notes','فراغات أقل في الملاحظات'),alert:tx('The Sun alert was a flare','تنبيه الشمس كان توهج'),fair:tx('A fair plant test','اختبار زرع عادل'),rover:tx('The robot is home','الروبوت رجع البيت')},
  shared:tx('You shared the plan, so the next team will help with one problem.','إنت نشرت الخطة، فالفريق الجاي هيساعد في مشكلة.'),
  caps:{thrive:[tx('The greenhouse is glowing. Our plants are thriving!','البيت الزراعي منوّر. نباتاتنا زي الفل!'),tx('Science, plants and robots, all working together.','العلم والنباتات والروبوتات، شغالين مع بعض.'),tx('Our base on Mars is thriving!','قاعدتنا على المريخ مزدهرة!')],
    continue:[tx('The base is working, but some jobs are still open.','القاعدة شغالة، بس فيه شغلانات لسه مفتوحة.'),tx('One repair at a time.','تصليح واحد كل مرة.'),tx('The mission continues.','المهمة مستمرة.')],
    setback:[tx('Our base had a hard day.','قاعدتنا عندها يوم صعب.'),tx('The machines stopped safely. Everyone is OK.','الأجهزة وقفت بأمان. والكل بخير.'),tx('We can learn, change our plan, and try again.','نقدر نتعلم، ونغيّر خطتنا، ونجرّب تاني.')]},
  pretendEnd:tx('This ending is from our pretend base, not from NASA data.','النهاية دي من قاعدتنا الخيالية، مش من بيانات ناسا.'),
  skip:tx('SKIP','تخطّي'),
  // timeline
  tl:{m1:tx('Mission 1','المهمة ١'),fix:tx('Lamp fix','تصليح اللمبة'),check:tx('Power check','مراجعة الطاقة'),rescue:tx('Robot rescue','إنقاذ الروبوت'),day:tx('New day','يوم جديد')},
  chip:{on:tx('on','شغّال'),off:tx('off','طافي'),plants:tx('Plants','النباتات'),robotOut:tx('Robot out','الروبوت برّه'),robotHome:tx('Robot home','الروبوت رجع'),robotStuck:tx('Robot stuck','الروبوت علّق'),helper:tx('Helper sent','المساعد طلع'),checked:tx('Alert: flare','التنبيه: توهج'),rested:tx('Robot rested','الروبوت ارتاح'),road:tx('Robot learned a road','الروبوت اتعلّم طريق'),kept:tx('Kept plan','نفس الخطة'),left:tx('Robot waits','الروبوت مستني')},
};
