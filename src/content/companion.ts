// Everything Nuri says as a companion: the first-time tour, just-in-time tips, encouragement and badge
// celebrations. English + Egyptian Arabic, one short idea per line (ages 7–12).
import type {Tx} from './strings';
const tx=(en:string,ar:string):Tx=>({en,ar});

export const TOUR={
  hello:tx('Hi, Commander! I’m Nuri, your robot helper. I’ll stay with you on Mars.','أهلًا يا قائد! أنا نوري، الروبوت المساعد بتاعك. هفضل معاك على المريخ.'),
  move:tx('Walk with the arrow keys, or W, A, S and D. Try it now!','امشي بالأسهم، أو W و A و S و D. جرّب دلوقتي!'),
  moveTouch:tx('Walking needs a keyboard for now. Tap NEXT to keep going.','المشي محتاج كيبورد دلوقتي. دوس التالي عشان نكمّل.'),
  moved:tx('Great job, Commander!','برافو عليك يا قائد!'),
  buildings:tx('These are our buildings. Walk to a door and press E to go inside.','دي مباني قاعدتنا. امشي لأي باب ودوس E عشان تدخل.'),
  mission:tx('This is your mission. It always tells you what to do next.','دي مهمتك. دايمًا بتقولك تعمل إيه بعد كده.'),
  help:tx('Stuck? Press this help button, or H. Asking for help is always OK!','محتار؟ دوس زرار المساعدة ده، أو H. طلب المساعدة دايمًا حاجة كويسة!'),
  xp:tx('You earn Science XP when you learn something new.','بتكسب نقط علوم لما تتعلم حاجة جديدة.'),
  passport:tx('Your badges live in your Science Passport. Tap it to peek!','الشارات بتاعتك في جواز سفر العلوم. دوس عليه وبُص!'),
  passportBack:tx('Nice! You can check your badges anytime.','حلو! تقدر تشوف شاراتك في أي وقت.'),
  map:tx('Lost? The map shows where to go. You can also press M.','تايه؟ الخريطة بتوريك تروح فين. وممكن تدوس M كمان.'),
  settings:tx('Here you can change help, language, sound, and my voice.','هنا تقدر تغيّر المساعدة واللغة والصوت وصوتي أنا.'),
  ripple1:tx('Be careful, Commander! Every choice creates a ripple. Your decisions shape how our mission ends!','خلي بالك يا قائد! كل اختيار بيعمل موجة. قراراتك هي اللي بتحدد مهمتنا هتخلص إزاي!'),
  ripple2:tx('Some changes happen right away. Others show up later.','فيه تغييرات بتحصل على طول. وفيه تغييرات بتظهر بعدين.'),
  ripple3:tx('If something goes wrong, you can often fix it. Different journeys lead to different endings!','لو حاجة باظت، غالبًا تقدر تصلّحها. رحلات مختلفة بتوصل لنهايات مختلفة!'),
  start:tx('Ready? Press START MISSION, and follow the yellow arrow!','جاهز؟ دوس ابدأ المهمة، وامشي ورا السهم الأصفر!'),
  skipped:tx('Okay! You can replay the tour in Settings anytime.','ماشي! تقدر تعيد الجولة من الإعدادات في أي وقت.'),
};
export const TIP={
  door:tx('Press E to go inside!','دوس E عشان تدخل!'),
  nasa:tx('See this stamp? It means real NASA data!','شايف الختم ده؟ معناه بيانات حقيقية من ناسا!'),
  pretend:tx('This stamp means pretend. It is part of our game, not NASA data.','الختم ده معناه خيالي. ده جزء من لعبتنا، مش بيانات ناسا.'),
  hear:tx('Tap the speaker to hear me again.','دوس على السمّاعة عشان تسمعني تاني.'),
  choice:tx('Think carefully. What could happen next?','فكّر كويس. إيه اللي ممكن يحصل بعد كده؟'),
  meters:tx('These blocks show our base power. Watch them change!','المكعبات دي بتوري طاقة قاعدتنا. خلي عينك عليها وهي بتتغير!'),
  fix:tx('Good news: you can fix problems! Pick how to help.','خبر حلو: تقدر تصلّح المشاكل! اختار هتساعد إزاي.'),
  consequence:tx('Interesting! Let’s see why that happened.','حاجة مثيرة! يلا نشوف ده حصل ليه.'),
  recovered:tx('You did it! We fixed the problem!','عملتها! صلّحنا المشكلة!'),
  badges:tx('These are your badges. Gray ones are still waiting for you!','دي شاراتك. اللي لونها رمادي لسه مستنياك!'),
};
export const CHEER={
  right:[tx('Wow! You found something important!','واو! لقيت حاجة مهمة!'),tx('Great thinking!','تفكير جامد!'),tx('You think like a real scientist!','إنت بتفكر زي عالِم حقيقي!')],
  wrong:[tx('That’s okay! Scientists learn by trying again!','عادي خالص! العلماء بيتعلموا لما يجربوا تاني!'),tx('Good try! Look one more time.','محاولة حلوة! بُص مرة كمان.'),tx('Mistakes help us learn. Try again!','الغلط بيعلّمنا. جرّب تاني!')],
  complete:[tx('Amazing teamwork, Commander!','شغل جماعي تحفة يا قائد!'),tx('Mission done! I’m so proud of you!','المهمة خلصت! أنا فخورة بيك أوي!')],
};
export const CELEBRATE={
  title:tx('NEW BADGE!','شارة جديدة!'),
  say:tx('Yay! You earned the {name} badge!','هيه! كسبت شارة {name}!'),
  close:tx('YAY!','هيه!'),
};
export const TOUR_UI={
  next:tx('NEXT','التالي'),skip:tx('Skip tour','تخطّي الجولة'),done:tx('LET’S GO!','يلا بينا!'),tryIt:tx('Try it!','جرّبها!'),
  step:tx('Step {n} of {total}','خطوة {n} من {total}'),replay:tx('REPLAY THE TOUR','عيد الجولة'),
};
