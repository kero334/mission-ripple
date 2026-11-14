// All child-facing words for Mission Ripple (English + Arabic).
// Reading level: a 7-year-old. Rules:
//  • One idea per line. Short sentences. Everyday words.
//  • No jargon on the main card. Exact numbers, units and IDs live only in the "For grown-ups" drawer.
//  • Round numbers only (about 300, not 303.98798). Never say a reading is safe or unsafe.
//  • Arabic is simple Egyptian colloquial. Numbers stay in Western digits inside <bdi>.
export type Locale='en'|'ar';
export type Tx={en:string;ar:string};
const tx=(en:string,ar:string):Tx=>({en,ar});
export const pick=(t:Tx,l:Locale,vars:Record<string,string|number>={})=>t[l].replace(/\{(\w+)\}/g,(_,k)=>String(vars[k]??''));

export const MISSION={
  name:tx('THE ROVER READING','قراءة روبوت المريخ'),
  kicker:tx('MISSION','مهمة'),
  start:tx('START MISSION','ابدأ المهمة'),
  brief:tx('MISSION','المهمة'),
  replay:tx('PLAY AGAIN','العب تاني'),
  help:tx('HELP','مساعدة'),
  step:tx('Step {n} of {total}','خطوة {n} من {total}'),
  now:tx('NOW','دلوقتي'),
  where:tx('WHERE','فين'),
  why:tx('WHY','ليه'),
};

export type StageKey='ready'|'monitor'|'research'|'command'|'nextShift'|'debrief'|'complete';
export const OBJECTIVES:Record<StageKey,{task:Tx;where:Tx;why:Tx;intro:Tx}>={
  ready:{task:tx('Start the mission','ابدأ المهمة'),where:tx('Press START MISSION','دوس ابدأ المهمة'),why:tx('A robot on Mars found a clue!','روبوت على المريخ لقى دليل!'),
    intro:tx('Hi, Explorer! A robot on Mars found a clue. Let’s check it out!','أهلًا يا مستكشف! روبوت على المريخ لقى دليل. يلا نشوفه!')},
  monitor:{task:tx('Look at the robot’s data','بُص على بيانات الروبوت'),where:tx('Glowing screen · near you','الشاشة المنوّرة · جنبك'),why:tx('See what the robot measured.','نشوف الروبوت قاس إيه.'),
    intro:tx('Follow the yellow arrow to the glowing screen!','امشي ورا السهم الأصفر لحد الشاشة المنوّرة!')},
  research:{task:tx('Learn what it means','اعرف معناه إيه'),where:tx('Research Lab','مختبر الأبحاث'),why:tx('Find what we know, and what we don’t.','نعرف إيه اللي نعرفه، وإيه اللي لأ.'),
    intro:tx('Next stop: the Research Lab!','المحطة الجاية: مختبر الأبحاث!')},
  command:{task:tx('Make a plan','اعمل خطة'),where:tx('Command Hub · top of the map','مركز القيادة · فوق خالص'),why:tx('Pick what the team does next.','اختار الفريق يعمل إيه بعد كده.'),
    intro:tx('Time to make a plan! Go to Command.','وقت الخطة! روح لمركز القيادة.')},
  nextShift:{task:tx('See what happened','شوف إيه اللي حصل'),where:tx('Communications · bottom right','الاتصالات · تحت على اليمين'),why:tx('Your choice changed something!','اختيارك غيّر حاجة!'),
    intro:tx('Your plan is ready. Let’s see what happens! Go to Communications.','خطتك جاهزة. يلا نشوف هيحصل إيه! روح للاتصالات.')},
  debrief:{task:tx('See what you learned','شوف اتعلمت إيه'),where:tx('Press MISSION','دوس المهمة'),why:tx('Put the clues together.','نجمّع الأدلة مع بعض.'),
    intro:tx('Let’s put the clues together!','يلا نجمّع الأدلة مع بعض!')},
  complete:{task:tx('Mission complete!','المهمة خلصت!'),where:tx('Explore, or play again','استكشف، أو العب تاني'),why:tx('Try the other plan next time!','جرّب الخطة التانية المرة الجاية!'),
    intro:tx('Great job, scientist! Explore, or play again with the other plan.','برافو يا عالِم! استكشف، أو العب تاني بالخطة التانية.')},
};

export const HINTS:Record<StageKey,{nav:Tx;control:Tx;science:Tx}>={
  ready:{nav:tx('The START button is at the top left.','زرار البداية فوق على الشمال.'),
    control:tx('Click START MISSION.','اضغط ابدأ المهمة.'),
    science:tx('A clue is something that helps us learn.','الدليل حاجة بتساعدنا نتعلم.')},
  monitor:{nav:tx('The glowing screen is just below you. Follow the yellow arrow. Press M for the map.','الشاشة المنوّرة تحتك على طول. امشي ورا السهم الأصفر. دوس M للخريطة.'),
    control:tx('Walk to the screen. When you see E, tap E.','امشي للشاشة. لما تشوف E، دوس E.'),
    science:tx('On the graph, look for where the dots jump up.','في الرسم، دوّر على المكان اللي النقط بتنط فيه لفوق.')},
  research:{nav:tx('The Research Lab is to the right. Its door is at the bottom.','مختبر الأبحاث على اليمين. بابه من تحت.'),
    control:tx('Go inside. Walk to the big table. Tap E.','ادخل. امشي للترابيزة الكبيرة. دوس E.')
    ,science:tx('Was it one high dot, or lots of high dots?','كانت نقطة واحدة عالية، ولا نقط كتير عالية؟')},
  command:{nav:tx('Command is at the very top. Walk around the Habitat.','القيادة فوق خالص. لف حوالين وحدة السكن.'),
    control:tx('Inside, walk to the big machine. Tap E.','جوه، امشي للجهاز الكبير. دوس E.'),
    science:tx('Both plans are OK. Which one do you like, and why?','الخطتين كويسين. بتحب أنهي واحدة، وليه؟')},
  nextShift:{nav:tx('Communications is at the bottom right, past the solar panels.','الاتصالات تحت على اليمين، بعد الألواح الشمسية.'),
    control:tx('Go inside. Walk to the dish. Tap E.','ادخل. امشي للطبق. دوس E.'),
    science:tx('Remember your plan? What do you think changed?','فاكر خطتك؟ تفتكر إيه اللي اتغير؟')},
  debrief:{nav:tx('Press MISSION at the top left.','دوس المهمة فوق على الشمال.'),
    control:tx('Click the orange button to go on.','اضغط الزرار البرتقاني وكمّل.'),
    science:tx('Where was the robot when it measured? Inside our base, or outside?','الروبوت كان فين وهو بيقيس؟ جوه قاعدتنا ولا برّه؟')},
  complete:{nav:tx('Visit any building you like!','زور أي مبنى تحبه!'),
    control:tx('Press J to see your Science Passport.','دوس J وشوف جواز السفر العلمي.'),
    science:tx('Before you decide, look at lots of clues!','قبل ما تقرر، بُص على أدلة كتير!')},
};

export const CARD_HINTS:Record<string,{goal:Tx;nav:Tx;control:Tx}>={
  field:{goal:tx('Find where the dots change.','لاقي النقط اتغيرت فين.'),
    nav:tx('The buttons under the graph are parts of the day.','الأزرار اللي تحت الرسم هي أجزاء من اليوم.'),
    control:tx('Click a button, or click the graph. Then press NEXT.','اضغط زرار، أو اضغط على الرسم. وبعدين دوس التالي.')},
  research:{goal:tx('Learn what we know, and what we don’t.','اعرف اللي نعرفه، واللي منعرفوش.'),
    nav:tx('Read one card. Then press NEXT.','اقرا كارت واحد. وبعدين دوس التالي.'),
    control:tx('“Tell me more” is extra. You can skip it.','«قولي أكتر» زيادة. ممكن تسيبها.')},
  decide:{goal:tx('Pick a plan for the team.','اختار خطة للفريق.'),
    nav:tx('Each big card shows what happens now and later.','كل كارت كبير بيوريك هيحصل إيه دلوقتي وبعدين.'),
    control:tx('Click the plan you like. No plan is wrong!','اضغط على الخطة اللي تحبها. مفيش خطة غلط!')},
  later:{goal:tx('See what your choice changed.','شوف اختيارك غيّر إيه.'),
    nav:tx('First card: your choice. Arrow: what happened.','الكارت الأول: اختيارك. السهم: اللي حصل.'),
    control:tx('Press the orange button.','دوس الزرار البرتقاني.')},
  debrief:{goal:tx('Look at all your clues.','بُص على كل أدلتك.'),
    nav:tx('Each box is one thing you found.','كل مربع حاجة واحدة لقيتها.'),
    control:tx('The questions are just for fun. Press the orange button.','الأسئلة للتسلية بس. دوس الزرار البرتقاني.')},
};

export const HELP={
  title:tx('NURI’S HELP','مساعدة نوري'),
  goal:tx('YOUR GOAL','هدفك'),
  nav:tx('WHERE TO GO','تروح فين'),
  control:tx('HOW','إزاي'),
  science:tx('THINK LIKE A SCIENTIST','فكّر زي العلماء'),
  more:tx('MORE HELP','مساعدة كمان'),
  showMe:tx('SHOW ME','ورّيني'),
  showGraph:tx('SHOW ME ON THE GRAPH','ورّيني على الرسم'),
  back:tx('BACK','رجوع'),
  levels:[tx('GOAL','الهدف'),tx('WHERE?','فين؟'),tx('HOW?','إزاي؟'),tx('THINK','فكّر')],
  noMore:tx('That’s all my tips. You can do it!','دي كل نصايحي. إنت تقدر!'),
  offer:tx('Need help? Press H!','محتاج مساعدة؟ دوس H!'),
  noPenalty:tx('Asking for help is always OK.','إنك تطلب مساعدة دايمًا حاجة كويسة.'),
};

export const PROMPTS={
  pressE:tx('Press E','دوس E'),
  examineRover:tx('Look at the robot’s data','بُص على بيانات الروبوت'),
  studyRecord:tx('Learn what it means','اعرف معناه إيه'),
  openSchedule:tx('Make a plan','اعمل خطة'),
  readMessage:tx('See what happened','شوف إيه اللي حصل'),
  reviewEvidence:tx('Look at the data again','بُص على البيانات تاني'),
  enter:tx('Go into {name}','ادخل {name}'),
  exit:tx('Go outside','اخرج برّه'),
  look:tx('Look at the {name}','بُص على {name}'),
  exhibit:tx('Bonus fact: {name}','معلومة زيادة: {name}'),
  nuri:tx('Talk to Nuri','اتكلم مع نوري'),
  closer:tx('Walk a little closer to the {name}','قرّب شوية من {name}'),
  move:tx('Move','اتحرك'),
  terminal:tx('screen','الشاشة'),
};

export const NURI={
  miss:tx('Nothing here. Walk closer until you see E!','مفيش حاجة هنا. قرّب لحد ما تشوف E!'),
  arrivedInside:tx('We’re here! Walk to the glowing machine. Tap E.','وصلنا! امشي للجهاز المنوّر. دوس E.'),
  arrivedNear:tx('There it is! Walk closer and tap E.','أهو! قرّب ودوس E.'),
  wrongPlace:tx('This is the {name}. Our clue is in the {target}!','ده {name}. الدليل في {target}!'),
  wrongPlaceField:tx('This is the {name}. Our clue is on the screen outside!','ده {name}. الدليل في الشاشة اللي برّه!'),
  detour:tx('Our mission is waiting: {task}!','مهمتنا مستنيانا: {task}!'),
  lockStart:tx('First, press START MISSION!','الأول، دوس ابدأ المهمة!'),
  lockResearch:tx('First, look at the robot’s data on the glowing screen.','الأول، بُص على بيانات الروبوت في الشاشة المنوّرة.'),
  lockCommand:tx('First, learn about the data. Then make a plan!','الأول، اعرف معنى البيانات. وبعدين اعمل خطة!'),
  lockComms:tx('No message yet. Make your plan in Command first!','لسه مفيش رسالة. اعمل خطتك في القيادة الأول!'),
  reviewDone:tx('You did this already! Next: {where}.','إنت عملت ده قبل كده! الجاي: {where}.'),
  xpIntro:tx('Ooh, Science XP! Press J to see it.','واو، نقاط علوم! دوس J وشوفها.'),
  exhibitIntro:tx('A bonus fact! Collect them all!','معلومة زيادة! جمّعهم كلهم!'),
  allPlaces:tx('You visited every place! Wow!','زرت كل الأماكن! واو!'),
  back:tx('We’re outside. Where to next?','إحنا برّه. نروح فين؟'),
  inside:tx('This is the {name}. {note}','ده {name}. {note}'),
  celebrate:tx('Nice work, scientist!','شغل حلو يا عالِم!'),
};

export const TAGS={
  nasa:tx('REAL NASA DATA','بيانات ناسا حقيقية'),
  sim:tx('PRETEND GAME PLAN','خطة لعبة خيالية'),
  choice:tx('YOUR CHOICE','اختيارك'),
  learn:tx('WHAT WE LEARN','اللي بنتعلمه'),
};

export const KIND={
  observation:tx('NASA CLUE','دليل من ناسا'),
  meaning:tx('WHAT IT MEANS','معناه إيه'),
  think:tx('LOOK CLOSELY','بُص كويس'),
  uncertainty:tx('STILL A MYSTERY','لسه لغز'),
  decision:tx('YOUR CHOICE','اختيارك'),
  consequence:tx('WHAT HAPPENED','اللي حصل'),
  discovery:tx('YOU DISCOVERED','اكتشفت'),
  exhibit:tx('BONUS FACT','معلومة زيادة'),
  status:tx('MISSION','المهمة'),
};

export const STEPS=[tx('SEE','شوف'),tx('LEARN','اتعلم'),tx('THINK','فكّر'),tx('CHOOSE','اختار'),tx('WATCH','تابع'),tx('EXPLAIN','اشرح')];

export const UI={
  next:tx('NEXT','التالي'),
  back:tx('BACK','رجوع'),
  close:tx('DONE','تمام'),
  skip:tx('SKIP','تخطّي'),
  tellMore:tx('Tell me more','قولي أكتر'),
  details:tx('For grown-ups: exact numbers and NASA source','للكبار: الأرقام بالظبط ومصدر ناسا'),
  askNuri:tx('ASK NURI','اسأل نوري'),
  openSource:tx('Open the NASA source ↗','افتح مصدر ناسا ↗'),
  illustration:tx('A drawing of Curiosity. Not a photo.','رسمة لكيوريوسيتي. مش صورة حقيقية.'),
  illustrationRad:tx('A drawing. Real radiation is invisible!','دي رسمة. الإشعاع الحقيقي مش بيتشاف!'),
  unit:tx('µGy/hour','ميكروغراي/ساعة'),
  utc:tx('UTC','UTC'),
  reviewMode:tx('LOOKING AGAIN · no new XP','بصة تانية · من غير نقاط جديدة'),
};

export const CARDS={
  // Every screen = one picture + one short Nuri line + one big button.
  // Glowing screen ------------------------------------------------------------
  brief:{say:tx('A robot on Mars found a clue! Follow the yellow arrow to the glowing screen.','روبوت على المريخ لقى دليل! امشي ورا السهم الأصفر لحد الشاشة المنوّرة.')},
  rover:{say:tx('This is Curiosity. It’s a real NASA robot on Mars!','ده كيوريوسيتي. روبوت حقيقي من ناسا على المريخ!'),
    more:tx('Our base in this game is pretend. Curiosity is real!','قاعدتنا في اللعبة خيالية. لكن كيوريوسيتي حقيقي!')},
  rad:{say:tx('Curiosity has a tool called RAD. It measures radiation, an invisible energy from space.','كيوريوسيتي معاه أداة اسمها RAD. بتقيس الإشعاع، طاقة مش بتتشاف جاية من الفضاء.'),
    more:tx('There are many kinds of radiation. Scientists measure it to learn about Mars.','فيه أنواع كتير من الإشعاع. العلماء بيقيسوه عشان يتعلموا عن المريخ.')},
  chart:{say:tx('Each dot is a real reading. Tap where the dots jump up!','كل نقطة قراية حقيقية. اضغط مكان ما النقط بتنط لفوق!'),
    found:tx('Yes! The dots jumped way up, super fast!','أيوه! النقط نطت لفوق أوي، وبسرعة!'),
    low:tx('Here the dots stay low. Try another part!','هنا النقط واطية. جرّب جزء تاني!'),
    falling:tx('Here the dots go down. Look a bit earlier!','هنا النقط بتنزل. بُص قبلها شوية!'),
    more:tx('The top dot was about {peak}. Every dot is real. We didn’t make any up.','أعلى نقطة كانت حوالي {peak}. كل نقطة حقيقية. ما ألفناش ولا واحدة.'),
    axisY:tx('Radiation reading','قراية الإشعاع'),axisX:tx('Time of day · 20 May 2024','وقت اليوم · ٢٠ مايو ٢٠٢٤'),gap:tx('No dots here','مفيش نقط هنا')},
  goResearch:{say:tx('What does it mean? Let’s find out in the Research Lab!','ده معناه إيه؟ يلا نعرف في مختبر الأبحاث!')},
  // Research Lab --------------------------------------------------------------
  compare:{say:tx('Orange dots are 20 May. They went much higher than the blue dots from the day before!','النقط البرتقاني يوم ٢٠ مايو. طلعت أعلى بكتير من النقط الزرقا بتاعة اليوم اللي قبله!')},
  outside:{say:tx('The robot measured outside, on Mars. It can’t tell us what happened inside our base.','الروبوت قاس برّه على المريخ. ما يقدرش يقولنا إيه اللي حصل جوه قاعدتنا.'),
    more:tx('It can’t tell us about people, either.','ولا يقدر يقولنا عن الناس كمان.')},
  why:{say:tx('Why did the dots jump? We don’t know yet. Good scientists say so!','ليه النقط نطت؟ لسه منعرفش. والعلماء الشاطرين بيقولوا كده!')},
  many:{say:tx('It wasn’t just one dot. Lots of dots stayed high for about {h} hours!','ما كانتش نقطة واحدة. نقط كتير فضلت عالية حوالي {h} ساعة!'),
    more:tx('{n} dots were above the dashed counting line. The line does not mean “safe” or “unsafe”.','{n} نقطة كانوا فوق خط العدّ المتقطع. الخط ده مش معناه «أمان» ولا «خطر».'),
    line:tx('Counting line','خط العدّ')},
  goCommand:{say:tx('Now let’s make a plan. Next stop: Command!','دلوقتي نعمل خطة. المحطة الجاية: القيادة!')},
  // Command -------------------------------------------------------------------
  choose:{say:tx('The team has time for one job. Which plan do you pick?','الفريق عنده وقت لشغلانة واحدة. هتختار أنهي خطة؟'),
    more:tx('This plan is pretend, just for our game. Each plan gives one thing and waits on another.','الخطة دي خيالية، للعبتنا بس. كل خطة بتدّي حاجة وبتأجل حاجة.')},
  decide:{aTitle:tx('Study first','ندرس الأول'),aGain:tx('We get notes about the data','ناخد ملاحظات عن البيانات'),aCost:tx('The robot trip waits','رحلة الروبوت تستنى'),
    bTitle:tx('Go and check again','نروح ونقيس تاني'),bGain:tx('The robot trip goes on','رحلة الروبوت تكمّل'),bCost:tx('We need one more reading later','هنحتاج قراية كمان بعدين')},
  explain:{say:tx('Nice! Which clue helped you most?','حلو! أنهي دليل ساعدك أكتر؟'),
    c1:tx('The dots stayed high for hours','النقط فضلت عالية لساعات'),f1:tx('Great clue! Many dots tell us more than one.','دليل جامد! نقط كتير بتقول أكتر من نقطة واحدة.'),
    c2:tx('We don’t know about inside the base','منعرفش جوه القاعدة'),f2:tx('Smart! Knowing what we don’t know helps us plan.','شاطر! لما نعرف اللي منعرفوش بنخطط أحسن.'),
    c3:tx('One dot was very high','نقطة واحدة كانت عالية أوي'),f3:tx('That’s a clue! But one dot is only a small part.','دا دليل! بس نقطة واحدة جزء صغير بس.')},
  now:{aNow:tx('You chose Study first. So right now, the team is studying the data.','إنت اخترت ندرس الأول. فدلوقتي الفريق بيدرس البيانات.'),
    bNow:tx('You chose Go and check again. So right now, the robot trip goes on.','إنت اخترت نروح ونقيس تاني. فدلوقتي رحلة الروبوت مكمّلة.')},
  goComms:{say:tx('Something will change later. Let’s go to Communications!','فيه حاجة هتتغير بعدين. يلا نروح الاتصالات!')},
  // Communications ------------------------------------------------------------
  later:{aLater:tx('Because you chose Study first, our notes are ready! But the robot trip is still waiting.','عشان اخترت ندرس الأول، ملاحظاتنا جاهزة! بس رحلة الروبوت لسه مستنية.'),
    bLater:tx('Because you chose Go and check again, the robot trip happened! But we still need one more reading.','عشان اخترت نروح ونقيس تاني، رحلة الروبوت حصلت! بس لسه محتاجين قراية كمان.')},
  unchanged:{say:tx('The dots are real NASA data. Your plan only changed our pretend game!','النقط دي بيانات ناسا حقيقية. وخطتك غيّرت لعبتنا الخيالية بس!'),
    real:tx('REAL','حقيقي'),game:tx('GAME','لعبة')},
  // Debrief -------------------------------------------------------------------
  bigIdea:{say:tx('NASA’s robot measured something real. You used it to think like a scientist!','روبوت ناسا قاس حاجة حقيقية. وإنت استخدمتها عشان تفكر زي العلماء!'),
    other:tx('You tried both plans. NASA’s dots never changed!','جرّبت الخطتين. ونقط ناسا عمرها ما اتغيرت!')},
  q1:{say:tx('Quick question! Can the robot tell us how much radiation an astronaut got inside the base?','سؤال سريع! الروبوت يقدر يقولنا رائد الفضاء أخد إشعاع قد إيه جوه القاعدة؟'),
    yes:tx('Yes','أيوه'),no:tx('No','لأ'),
    right:tx('Right! The robot measured outside, not inside.','صح! الروبوت قاس برّه، مش جوه.'),
    try:tx('Good try! The robot was outside. Inside is a different place.','محاولة حلوة! الروبوت كان برّه. وجوه مكان تاني.')},
  q2:{say:tx('A new robot sees a strange number. What should scientists do first?','روبوت جديد شاف رقم غريب. العلماء يعملوا إيه الأول؟'),
    a:tx('Look at lots of readings','يبصوا على قراءات كتير'),b:tx('Decide from one number','يقرروا من رقم واحد'),c:tx('Say it’s dangerous','يقولوا إنها خطر'),
    aF:tx('Yes! Lots of clues show the whole picture.','أيوه! أدلة كتير بتوري الصورة كاملة.'),
    bF:tx('Hmm, one number can trick us. Try again!','همم، رقم واحد ممكن يضحك علينا. جرّب تاني!'),
    cF:tx('Wait! We need more clues first. Try again!','استنى! محتاجين أدلة أكتر الأول. جرّب تاني!')},
  done:{say:tx('Mission complete! You earned {xp} Science XP!','المهمة خلصت! كسبت {xp} نقطة علوم!'),
    none:tx('Mission complete! You keep everything you earned.','المهمة خلصت! وكل اللي كسبته معاك.')},
  // Buttons -------------------------------------------------------------------
  btn:{next:tx('NEXT','التالي'),go:tx('LET’S GO!','يلا بينا!'),skip:tx('SKIP','تخطّي'),finish:tx('FINISH','خلّص'),
    replay:tx('PLAY AGAIN','العب تاني'),explore:tx('KEEP EXPLORING','كمّل استكشاف'),badges:tx('MY BADGES','شاراتي'),
    done:tx('DONE','تمام'),more:tx('Tell me more','قولي أكتر'),grownups:tx('For grown-ups','للكبار'),showWay:tx('SHOW ME THE WAY','ورّيني الطريق'),
    look:tx('LOOK AGAIN','بُص تاني')},
  status:{say:tx('Now: {task}. Go to: {where}.','دلوقتي: {task}. روح: {where}.')},
  stamp:{nasa:tx('REAL NASA DATA','بيانات ناسا حقيقية'),game:tx('PRETEND PLAN','خطة خيالية')},
};

export const STAGE_STEPS:{stage:StageKey;label:Tx}[]=[
  {stage:'monitor',label:tx('See the data','شوف البيانات')},
  {stage:'research',label:tx('Learn','اتعلم')},
  {stage:'command',label:tx('Make a plan','اعمل خطة')},
  {stage:'nextShift',label:tx('See what happened','شوف حصل إيه')},
  {stage:'debrief',label:tx('Big idea','الفكرة الكبيرة')},
];

export const PASSPORT={
  title:tx('SCIENCE PASSPORT','جواز السفر العلمي'),
  tabs:{achievements:tx('BADGES','الشارات'),missions:tx('MISSIONS','المهمات'),discoveries:tx('CARDS','الكروت')},
  xp:tx('Science XP','نقاط العلوم'),
  titleL:tx('Your title','لقبك'),
  nextTitle:tx('{xp} more XP to “{title}”','{xp} نقطة كمان للقب «{title}»'),
  maxTitle:tx('Top title! Wow!','أعلى لقب! واو!'),
  badges:tx('Badges','الشارات'),
  locked:tx('Not yet','لسه'),
  nuriLight:tx('Nuri’s light color','لون نور نوري'),
  unlockWith:tx('Get it with: {badge}','تاخده بـ: {badge}'),
  current:tx('Mission','المهمة'),
  challenges:tx('Extra challenges','تحديات زيادة'),
  outcomes:tx('Plans you tried','الخطط اللي جربتها'),
  notSeen:tx('Not tried yet. Play again to see!','لسه ما جربتهاش. العب تاني وشوف!'),
  science:tx('Science cards','كروت العلوم'),
  places:tx('Places','الأماكن'),
  foundIn:tx('Find it: {where}','تلاقيه في: {where}'),
  source:tx('Source','المصدر'),
  suggested:tx('Try next','جرّب بعد كده'),
  backToList:tx('BACK','رجوع'),
  close:tx('CLOSE','اقفل'),
  noPublic:tx('Your progress stays on this computer. No sharing.','تقدّمك بيفضل على الجهاز ده. من غير مشاركة.'),
};

export const SETTINGS={
  title:tx('PAUSED · SETTINGS','وقفة · الإعدادات'),
  guidance:tx('Help style','شكل المساعدة'),
  guided:tx('Show me the way','ورّيني الطريق'),
  guidedD:tx('The yellow arrow is always on. Nuri helps more.','السهم الأصفر شغال على طول. ونوري بيساعد أكتر.'),
  independent:tx('I’ll explore on my own','هستكشف لوحدي'),
  independentD:tx('Fewer arrows. Press H for help anytime.','أسهم أقل. دوس H للمساعدة في أي وقت.'),
  same:tx('Both have the same science.','الاتنين فيهم نفس العلوم.'),
  enjoy:tx('What do you like most? (You can change it.)','بتحب إيه أكتر؟ (تقدر تغيّره.)'),
  pExplore:tx('Finding new things','ألاقي حاجات جديدة'),
  pSolve:tx('Solving missions','أحل مهمات'),
  pCollect:tx('Getting badges','آخد شارات'),
  pMix:tx('A bit of everything','شوية من كل حاجة'),
  controls:tx('WASD or arrows · move<br>Shift · run<br>E · use / talk<br>H · help<br>M · map<br>J · Science Passport<br>B · tools<br>Esc · pause<br>L · language','WASD أو الأسهم · الحركة<br>Shift · الجري<br>E · استخدم / اتكلم<br>H · مساعدة<br>M · الخريطة<br>J · جواز السفر العلمي<br>B · الأدوات<br>Esc · وقفة<br>L · اللغة'),
  controlsTitle:tx('Keys','الأزرار'),
  language:tx('Language','اللغة'),
  resume:tx('PLAY','العب'),
};

export const MAP={
  title:tx('MAP','الخريطة'),
  you:tx('You','إنت'),
  goal:tx('Go here','روح هنا'),
  visited:tx('You visited {n} of {total} places','زرت {n} من {total} أماكن'),
  help:tx('Walk to a door. Press E to go in.','امشي لأي باب. دوس E عشان تدخل.'),
  field:tx('Glowing screen','الشاشة المنوّرة'),
};

export const TOAST={
  xp:tx('+{xp} Science XP','+{xp} نقطة علوم'),
  badge:tx('New badge: {name}','شارة جديدة: {name}'),
  card:tx('New card: {name}','كارت جديد: {name}'),
  place:tx('New place: {name}','مكان جديد: {name}'),
  title:tx('New title: {name}','لقب جديد: {name}'),
  challenge:tx('Challenge done: {name}','تحدي خلص: {name}'),
};

export const INTRO={
  title:tx('MISSION RIPPLE','مهمة ريبل'),
  tagline:tx('A Mars science adventure','مغامرة علمية على المريخ'),
  start:tx('START GAME','ابدأ اللعب'),
  continue:tx('CONTINUE','كمّل'),
  watch:tx('WATCH INTRO','شوف المقدمة'),
  replay:tx('REPLAY CINEMATIC','شوف المقدمة تاني'),
  skip:tx('SKIP INTRO','تخطّي المقدمة'),
  soundOn:tx('SOUND: ON','الصوت: شغال'),
  soundOff:tx('SOUND: OFF','الصوت: مقفول'),
  fiction:tx('A made-up story about the future. The Mars data in the game is real NASA data.','قصة خيالية عن المستقبل. وبيانات المريخ في اللعبة بيانات ناسا حقيقية.'),
  welcome:tx('Welcome to Mars, Explorer!','أهلًا بيك على المريخ يا مستكشف!'),
  captions:{
    dream:tx('Every explorer starts with a dream…','كل مستكشف بيبدأ بحلم…'),
    years:tx('Years later…','بعد سنين…'),
    future:tx('One day, in the future…','في يوم، في المستقبل…'),
    days:tx('Days…','أيام…'),
    weeks:tx('Weeks…','أسابيع…'),
    months:tx('Months in space, on the way to Mars.','شهور في الفضاء، في الطريق للمريخ.'),
    mars:tx('Mars.','المريخ.'),
  } as Record<string,Tx>,
};

export const MISC={
  sol:tx('SOL 001','اليوم 001'),
  demo:tx('SCIENCE MISSION','مهمة علمية'),
  equipment:tx('TOOLS','الأدوات'),
  equipmentNote:tx('You’ll use these tools in future missions.','هتستخدم الأدوات دي في مهمات جاية.'),
  items:[tx('Tablet','تابلت'),tx('Wrench','مفتاح'),tx('Scanner','ماسح'),tx('Plant','نبات')],
  moveHint:tx('Move','اتحرك'),
};
