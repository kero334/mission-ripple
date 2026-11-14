// Campaign missions after The Rover Reading. Each one follows a research-package candidate and uses that
// candidate's own A/B decision design (05_MISSION_EVIDENCE/decision_evidence.json). Pretend meter effects
// are game rules from src/game/base-sim.ts, always labelled PRETEND in the UI.
import type {Tx} from '../content/strings';
import type {Effect} from '../game/base-sim';
const tx=(en:string,ar:string):Tx=>({en,ar});

export type Opt={id:'A'|'B';decisionId:string;title:Tx;gain:Tx;cost:Tx;icon:string;now:Tx;effect?:Effect;flag:string;later:Tx;laterEffect?:Effect};
export type Quiz={options:{label:Tx;ok:boolean;fb:Tx}[];award:string};
export type SceneDef={id:string;art:string;say:Tx;more?:Tx;stamp?:'nasa'|'game';grown?:string;quiz?:Quiz;alloc?:boolean;award?:string};
export type Step={id:string;building:string;task:Tx;where:Tx;scenes:SceneDef[];decide?:boolean};
export type CampaignMission={id:string;candidate:string;title:Tx;brief:Tx;icon:string;refs:string[];evidence:'nasa'|'pretend';steps:Step[];options:[Opt,Opt];lesson:Tx;think:Tx;badge:string};

const go=(b:string,en:string,ar:string):SceneDef=>({id:'go-'+b,art:'building:'+b,say:tx(en,ar)});

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
            {label:tx('Two readings have the same time','قراءتين ليهم نفس الوقت'),ok:true,fb:tx('Yes, same time but different numbers! Scientists keep both and check.','أيوه! نفس الوقت وأرقام مختلفة. العلماء بيحتفظوا بالاتنين وبيراجعوا.')},
            {label:tx('One number is too big','رقم واحد كبير أوي'),ok:false,fb:tx('Look again at the times on the left.','بُص تاني على الأوقات اللي على الشمال.')},
            {label:tx('Nothing is strange','مفيش حاجة غريبة'),ok:false,fb:tx('Look closely. Two rows share something.','بُص كويس. فيه صفين بيشتركوا في حاجة.')}]}},
        {id:'gap',art:'gap',stamp:'nasa',say:tx('Here, two hours have no readings. Should we fill them with a guess?','هنا ساعتين مفيهمش قراءات. نملاهم بتخمين؟'),grown:'log',
          quiz:{award:'ev:c-log-gap',options:[
            {label:tx('No, mark them as missing','لأ، نكتب إنهم ناقصين'),ok:true,fb:tx('Right! We never make up readings.','صح! عمرنا ما نألف قراءات.')},
            {label:tx('Yes, guess a number','أيوه، نخمّن رقم'),ok:false,fb:tx('Careful, a guess is not a measurement! Try again.','خلي بالك! التخمين مش قياس. جرّب تاني.')}]}},
        go('command','Now let’s make a plan. Go to Command!','دلوقتي نعمل خطة. روح للقيادة!')]},
      {id:'plan',building:'command',task:tx('Plan for missing hours','خطّط للساعات الناقصة'),where:tx('Command Hub','مركز القيادة'),decide:true,scenes:[]}],
    options:[
      {id:'A',decisionId:'P2-M08A',icon:'ui/science-research',title:tx('Fix gaps later','نصلّح الفراغات بعدين'),gain:tx('Fewer gaps in future notes','فراغات أقل بعد كده'),cost:tx('Uses 1 power block','بتاخد مكعب طاقة'),
        now:tx('You chose Fix gaps later. So the team set up a spare monitor, using 1 power block.','إنت اخترت نصلّح الفراغات بعدين. فالفريق جهّز جهاز احتياطي، واستخدم مكعب طاقة.'),effect:{power:-1},flag:'log_repair_planned',
        later:tx('Because you chose Fix gaps later, our new notes have fewer gaps!','عشان اخترت نصلّح الفراغات بعدين، ملاحظاتنا الجديدة فيها فراغات أقل!')},
      {id:'B',decisionId:'P2-M08B',icon:'ui/science-check',title:tx('Keep going, mark gaps','نكمّل ونعلّم الفراغات'),gain:tx('No power used','من غير طاقة'),cost:tx('Our notes stay patchy','ملاحظاتنا تفضل ناقصة'),
        now:tx('You chose Keep going. So we marked the gaps clearly and saved our power.','إنت اخترت نكمّل. فعلّمنا الفراغات بوضوح ووفّرنا الطاقة.'),flag:'partial_series',
        later:tx('Because you chose Keep going, our notes still have marked gaps. That’s OK, we were honest!','عشان اخترت نكمّل، ملاحظاتنا لسه فيها فراغات متعلّمة. عادي. إحنا كنا صادقين!')}],
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
            {label:tx('Yes, it shows Mars radiation','أيوه، بتوري إشعاع المريخ'),ok:false,fb:tx('Hmm, the list is about the Sun, not Mars. Try again!','همم. القايمة عن الشمس. والمريخ ما اتقاسش هنا. جرّب تاني!')}]}},
        go('shelter','Let’s make a plan at the Radiation Shelter.','يلا نعمل خطة في ملجأ الإشعاع.')]},
      {id:'plan',building:'shelter',task:tx('Plan for the alert','خطّط للتنبيه'),where:tx('Radiation Shelter · bottom left','ملجأ الإشعاع · تحت على الشمال'),decide:true,scenes:[
        {id:'pretendShelter',art:'building:shelter',stamp:'game',say:tx('In our game, this shelter is a practice room. We don’t know how well it would protect.','في لعبتنا، الملجأ ده أوضة تدريب. منعرفش هيحمي قد إيه.')}]}],
    options:[
      {id:'A',decisionId:'P2-M03A',icon:'science/science-sun',title:tx('Watch and check','نراقب ونتأكد'),gain:tx('We learn what kind of event it was','نعرف الحدث كان إيه'),cost:tx('Uses 1 power block','بتاخد مكعب طاقة'),
        now:tx('You chose Watch and check. So the watch screen is on, using 1 power block.','إنت اخترت نراقب ونتأكد. فشاشة المراقبة شغالة، واستخدمت مكعب طاقة.'),effect:{power:-1},flag:'watch_prepared',
        later:tx('Because you chose Watch and check, we know the alert was a Sun flare. No new mystery!','عشان اخترت نراقب ونتأكد، عرفنا إن التنبيه كان توهج شمسي. مفيش لغز جديد!')},
      {id:'B',decisionId:'P2-M03B',icon:'ui/science-research',title:tx('Keep doing science','نكمّل شغل علمي'),gain:tx('Science work keeps going','الشغل العلمي يكمّل'),cost:tx('The alert stays a mystery','التنبيه يفضل لغز'),
        now:tx('You chose Keep doing science. So the team kept working, and wrote the alert down.','إنت اخترت نكمّل شغل علمي. فالفريق كمّل، وكتب التنبيه.'),flag:'unresolved_alert',
        later:tx('Because you chose Keep doing science, the Sun alert is still a mystery. We wrote it down.','عشان اخترت نكمّل شغل علمي، تنبيه الشمس لسه لغز. وكتبناه.')}],
    lesson:tx('A Sun storm list is a clue. It is not a measurement on Mars.','قايمة عواصف الشمس دليل. مش قياس على المريخ.')},

  {id:'M4-PLANTS',candidate:'P2-M05 (+ P2-M06 CSA)',icon:'ui/ui-plant-pixel',refs:['P2-OSD-615','P2-CSA-01'],evidence:'nasa',badge:'plant-scientist',
    title:tx('Plant Detectives','مخبرين النباتات'),
    brief:tx('How do scientists test plants fairly? Let’s learn in the Greenhouse!','العلماء بيختبروا النباتات بعدل إزاي؟ يلا نتعلم في البيت الزراعي!'),
    think:tx('To know what helped a plant, what do we need to compare it with?','عشان نعرف إيه اللي ساعد النبات، نقارنه بإيه؟'),
    steps:[
      {id:'study',building:'greenhouse',task:tx('Learn about a plant study','اتعرّف على دراسة نباتات'),where:tx('Greenhouse','البيت الزراعي'),scenes:[
        {id:'study',art:'plants',stamp:'nasa',award:'ev:c-plants-seen',say:tx('NASA grew plants in space, and the same kind on the ground. 6 and 6!','ناسا زرعت نباتات في الفضاء، ونفس النوع على الأرض. ٦ و٦!'),grown:'plants'},
        {id:'control',art:'plants',stamp:'nasa',say:tx('Why grow the same plants on the ground too?','ليه نزرع نفس النباتات على الأرض كمان؟'),grown:'plants',
          quiz:{award:'ev:c-plants-quiz',options:[
            {label:tx('To compare them','عشان نقارنهم'),ok:true,fb:tx('Yes, that’s a control group! It makes the test fair.','أيوه! دي مجموعة المقارنة. بتخلّي الاختبار عادل.')},
            {label:tx('To have more plants','عشان يبقى عندنا نباتات أكتر'),ok:false,fb:tx('More plants is nice, but think about comparing. Try again!','نباتات أكتر حلو، بس فكّر في المقارنة. جرّب تاني!')},
            {label:tx('No reason','مفيش سبب'),ok:false,fb:tx('There is a good reason! Think about a fair test.','فيه سبب حلو! فكّر في الاختبار العادل.')}]}},
        {id:'noYield',art:'icon:ui/science-question',say:tx('This study tells us how it was set up. It doesn’t tell us how much food plants make on Mars.','الدراسة دي بتقول اتعملت إزاي. ما بتقولش النباتات بتعمل أكل قد إيه على المريخ.'),grown:'plants'},
        go('command','Let’s plan our greenhouse at Command!','يلا نخطط للبيت الزراعي في القيادة!')]},
      {id:'plan',building:'command',task:tx('Plan the greenhouse trays','خطّط صواني الزرع'),where:tx('Command Hub','مركز القيادة'),decide:true,scenes:[]}],
    options:[
      {id:'A',decisionId:'P2-M05A',icon:'science/science-compare',title:tx('Keep a control tray','نسيب صينية للمقارنة'),gain:tx('We can compare fairly','نقدر نقارن بعدل'),cost:tx('Fewer trays to grow food now','صواني أقل للأكل دلوقتي'),
        now:tx('You chose Keep a control tray. So one tray stays the same, for comparing.','إنت اخترت نسيب صينية للمقارنة. فصينية واحدة فضلت زي ما هي، للمقارنة.'),flag:'plant_control_ready',
        later:tx('Because you kept a control tray, we learned which tray grew better! Pretend food +1.','عشان سبت صينية للمقارنة، عرفنا أنهي صينية كبرت أحسن! أكل خيالي +١.'),laterEffect:{food:1}},
      {id:'B',decisionId:'P2-M05B',icon:'ui/ui-plant-pixel',title:tx('Use all trays','نستخدم كل الصواني'),gain:tx('More plants now: pretend food +1','نباتات أكتر دلوقتي: أكل خيالي +١'),cost:tx('We can’t compare','مش هنقدر نقارن'),
        now:tx('You chose Use all trays. So we grew more plants now: pretend food +1.','إنت اخترت نستخدم كل الصواني. فزرعنا نباتات أكتر دلوقتي: أكل خيالي +١.'),effect:{food:1},flag:'plant_comparison_missing',
        later:tx('Because you used all trays, we have more plants. But we can’t tell what helped them grow.','عشان استخدمت كل الصواني، عندنا نباتات أكتر. بس مش عارفين إيه اللي ساعدها تكبر.')}],
    lesson:tx('A fair test compares with a control group.','الاختبار العادل بيقارن بمجموعة مقارنة.')},

  {id:'M5-POWER',candidate:'P2-M07 + pretend base systems',icon:'ui/ui-power-pixel',refs:['P2-TREK-01'],evidence:'nasa',badge:'power-planner',
    title:tx('Share the Power','نقسّم الطاقة'),
    brief:tx('Our pretend base needs power for air, water and a robot trip. Let’s plan at the Power Station!','قاعدتنا الخيالية محتاجة طاقة للهوا والميه ورحلة الروبوت. يلا نخطط في محطة الطاقة!'),
    think:tx('Can a colorful map tell us exactly how steep a hill is?','الخريطة الملونة تقدر تقولنا الجبل عالي قد إيه بالظبط؟'),
    steps:[
      {id:'meters',building:'power',task:tx('Share the spare power','قسّم الطاقة الزيادة'),where:tx('Power Station','محطة الطاقة'),scenes:[
        {id:'meters',art:'meters',stamp:'game',say:tx('These meters are pretend. They show our game base, not NASA data.','العدادات دي خيالية. بتوري قاعدة لعبتنا، مش بيانات ناسا.')},
        {id:'share',art:'meters',stamp:'game',alloc:true,award:'ev:c-power-share',say:tx('We have 2 spare power blocks. Where should they go?','عندنا مكعبين طاقة زيادة. يروحوا فين؟')},
        go('command','Now the robot trip. Let’s look at the map in Command!','دلوقتي رحلة الروبوت. يلا نبص على الخريطة في القيادة!')]},
      {id:'route',building:'command',task:tx('Plan the robot trip','خطّط رحلة الروبوت'),where:tx('Command Hub','مركز القيادة'),decide:true,scenes:[
        {id:'map',art:'map',stamp:'nasa',award:'ev:c-map-seen',say:tx('NASA’s Mars Trek makes maps of Mars. Colors show high and low places.','موقع مارس تريك بتاع ناسا بيعمل خرايط للمريخ. الألوان بتوري الأماكن العالية والواطية.'),grown:'map',
          quiz:{award:'ev:c-map-quiz',options:[
            {label:tx('No, colors are only a picture','لأ، الألوان صورة بس'),ok:true,fb:tx('Right! The colors can’t tell us exactly how steep it is.','صح! الألوان ما تقدرش تقولنا الانحدار بالظبط.')},
            {label:tx('Yes, colors give exact steepness','أيوه، الألوان بتدّي الانحدار بالظبط'),ok:false,fb:tx('Not exactly, the map is a colored picture! Try again.','مش بالظبط. الخريطة دي صورة ملونة، مش أرقام دقيقة. جرّب تاني!')}]}}]}],
    options:[
      {id:'A',decisionId:'P2-M07A',icon:'ui/science-robot',title:tx('Scout first','نستكشف الأول'),gain:tx('We learn the way first','نعرف الطريق الأول'),cost:tx('Uses 1 power block now','بتاخد مكعب طاقة دلوقتي'),
        now:tx('You chose Scout first. So a robot checked the route, using 1 power block.','إنت اخترت نستكشف الأول. فروبوت راجع الطريق، واستخدم مكعب طاقة.'),effect:{power:-1},flag:'route_recon_done',
        later:tx('Because the robot scouted first, the route was known. No surprises!','عشان الروبوت استكشف الأول، الطريق كان معروف. مفيش مفاجآت!')},
      {id:'B',decisionId:'P2-M07B',icon:'ui/science-rover',title:tx('Short route now','الطريق القصير دلوقتي'),gain:tx('The trip starts now','الرحلة تبدأ دلوقتي'),cost:tx('The ground is unknown','الأرض مش معروفة'),
        now:tx('You chose Short route now. So the trip started, with a note: “ground unknown”.','إنت اخترت الطريق القصير دلوقتي. فالرحلة بدأت، ومعاها ملاحظة: «الأرض مش معروفة».'),flag:'route_uncertainty',
        later:tx('The ground was unknown, so the robot hit a bump! It used 1 extra power block (pretend).','الأرض ما كانتش معروفة، فالروبوت خبط في مطب! واستخدم مكعب طاقة زيادة (خيالي).'),laterEffect:{power:-1}}],
    lesson:tx('Every plan has a trade-off. A colored map is a picture, not exact numbers.','كل خطة ليها مقابل. والخريطة الملونة صورة، مش أرقام دقيقة.')},

  {id:'M6-PLAN',candidate:'P2-M10',icon:'ui/science-check',refs:['P2-RAD-07'],evidence:'nasa',badge:'base-commander',
    title:tx('The Base Plan','خطة القاعدة'),
    brief:tx('Time to write our base plan for the next team! Go to Command.','وقت نكتب خطة القاعدة للفريق الجاي! روح للقيادة.'),
    think:tx('Is it OK to say “we don’t know yet” in a plan?','ينفع نقول «لسه منعرفش» في خطة؟'),
    steps:[
      {id:'plan',building:'command',task:tx('Write the base plan','اكتب خطة القاعدة'),where:tx('Command Hub','مركز القيادة'),decide:true,scenes:[
        {id:'story',art:'history',stamp:'game',award:'ev:c-story-seen',say:tx('Here is your base story so far. Every icon is one of your choices!','دي حكاية قاعدتك لحد دلوقتي. كل أيقونة اختيار من اختياراتك!')},
        {id:'missing',art:'icon:ui/science-question',stamp:'nasa',say:tx('We still don’t have some real numbers, like a person’s radiation dose. Saying so is good science!','لسه ما عندناش أرقام حقيقية زي جرعة الإشعاع للإنسان. وإننا نقول كده دا علم شاطر!'),grown:'dose'}]}],
    options:[
      {id:'A',decisionId:'P2-M10A',icon:'ui/science-check',title:tx('Share the plan + questions','ننشر الخطة والأسئلة'),gain:tx('The next team knows what we know','الفريق الجاي يعرف اللي نعرفه'),cost:tx('Some questions stay open','شوية أسئلة تفضل مفتوحة'),
        now:tx('You chose Share the plan. So we wrote what we know, and what we don’t.','إنت اخترت ننشر الخطة. فكتبنا اللي نعرفه، واللي منعرفوش.'),flag:'operations_plan_published',
        later:tx('The next team got your plan and your questions. Great teamwork!','الفريق الجاي خد خطتك وأسئلتك. شغل جماعي جميل!')},
      {id:'B',decisionId:'P2-M10B',icon:'ui/science-question',title:tx('Pause, ask for data','نوقف ونطلب بيانات'),gain:tx('Extra work stops safely','الشغل الزيادة يقف بأمان'),cost:tx('We wait for new measurements','نستنى قياسات جديدة'),
        now:tx('You chose Pause and ask. So extra work stopped, and we asked for more measurements.','إنت اخترت نوقف ونطلب. فالشغل الزيادة وقف، وطلبنا قياسات أكتر.'),effect:{power:1},flag:'safe_early_termination',
        later:tx('Pausing saved 1 pretend power block, and our request for data is on its way.','الوقفة وفّرت مكعب طاقة خيالي، وطلب البيانات في الطريق.')}],
    lesson:tx('A good plan says what we know, and what we still need to find out.','الخطة الحلوة بتقول إيه اللي نعرفه، وإيه اللي لسه محتاجين نعرفه.')},
];

export const C_UI={
  nextMission:tx('NEXT MISSION','المهمة الجاية'),
  missionN:tx('MISSION {n} OF {total}','مهمة {n} من {total}'),
  remember:tx('Remember last mission?','فاكر المهمة اللي فاتت؟'),
  choose:tx('The team has time for one plan. Which do you pick?','الفريق عنده وقت لخطة واحدة. هتختار أنهي؟'),
  pretendMore:tx('This plan is pretend, just for our game.','الخطة دي خيالية، للعبتنا بس.'),
  lessonTitle:tx('What we learned','اتعلمنا إيه'),
  done:tx('Mission complete! You earned {xp} Science XP!','المهمة خلصت! كسبت {xp} نقطة علوم!'),
  allDone:tx('You finished every mission! You are a real base scientist!','خلّصت كل المهمات! إنت عالِم قاعدة حقيقي!'),
  playStory:tx('PLAY THE BASE STORY AGAIN','العب حكاية القاعدة تاني'),
  meters:tx('PRETEND BASE','قاعدة خيالية'),
  meterNames:{power:tx('Power','طاقة'),water:tx('Water','ميه'),oxygen:tx('Air','هوا'),food:tx('Food','أكل')},
  allocO:tx('Air +2','هوا +٢'),allocW:tx('Water +2','ميه +٢'),allocE:tx('One each','واحد لكل واحد'),
  allocOF:tx('Air +2 (pretend). Our crew’s air machine has extra power.','هوا +٢ (خيالي). جهاز الهوا عنده طاقة زيادة.'),
  allocWF:tx('Water +2 (pretend). The water cleaner has extra power.','ميه +٢ (خيالي). جهاز تنضيف الميه عنده طاقة زيادة.'),
  allocEF:tx('Air +1 and water +1 (pretend). A balanced plan!','هوا +١ وميه +١ (خيالي). خطة متوازنة!'),
  ending:{steady:tx('Your pretend base is steady. Every meter has power to spare!','قاعدتك الخيالية مستقرة. كل العدادات فيها طاقة كفاية!'),
    low:tx('Your pretend base is low on {meter}. Next time, plan a little extra for it!','قاعدتك الخيالية ناقصها {meter}. المرة الجاية خطّط زيادة شوية ليه!')},
};
