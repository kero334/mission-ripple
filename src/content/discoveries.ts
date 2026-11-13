// Discovery cards (Science Passport → Discoveries). Every number is read from a validated snapshot.
import {evidence} from '../science/mission';
import {exhibitRecords,MAY19,MAY20,PEAK,median,hhmm,ABOVE_CUTOFF} from '../science/series';
import type {Locale} from './strings';

export type Discovery={id:string;icon:string;title:{en:string;ar:string};short:(l:Locale)=>string;detail:(l:Locale)=>string;org:string;url:string;refs:string[];where:{en:string;ar:string};kind:'mission'|'exhibit'};
const r1=(n:number)=>n.toFixed(1),r0=(n:number)=>String(Math.round(n));
const fmt=(n:number)=>n.toLocaleString('en-US');
const RAD='https://visualization.osdr.nasa.gov/radlab/gui/data-api/';
const ex=exhibitRecords;
const tr=(l:Locale,en:string,ar:string)=>l==='en'?en:ar;
const b=(s:string)=>`<bdi>${s}</bdi>`;

export const DISCOVERIES:Discovery[]=[
  {id:'curiosity-rover',icon:'science/science-curiosity',kind:'mission',title:{en:'Curiosity Rover',ar:'الروبوت كيوريوسيتي'},
    short:l=>tr(l,'A NASA rover that drives on Mars and gathers science measurements.','روبوت تبع ناسا بيتحرك على المريخ وبيجمع قياسات علمية.'),
    detail:l=>tr(l,`The readings in this mission come from ${evidence.instrument} on the ${evidence.environment.toLowerCase()} (dataset ${evidence.datasetId}). The picture is an original drawing, not a NASA photo.`,`القراءات في المهمة دي جاية من جهاز RAD على كيوريوسيتي فوق سطح المريخ (مجموعة البيانات ${b(evidence.datasetId)}). الصورة رسمة أصلية، مش صورة من ناسا.`),
    org:'NASA',url:RAD,refs:[evidence.datasetId],where:{en:'Field terminal',ar:'شاشة الميدان'}},
  {id:'rad-instrument',icon:'science/science-rad',kind:'mission',title:{en:'RAD Instrument',ar:'جهاز RAD'},
    short:l=>tr(l,'RAD helps scientists study radiation in the rover’s environment.','جهاز RAD بيساعد العلماء يدرسوا الإشعاع في المكان اللي حوالين الروبوت.'),
    detail:l=>tr(l,`RAD reports absorbed dose rate in ${evidence.derived.unit}: how much radiation energy its detector absorbs each hour. Different kinds of radiation can have different effects.`,`جهاز RAD بيقيس معدل الجرعة الممتصة بوحدة ${b(evidence.derived.unit)}: قد إيه طاقة إشعاع الكاشف بياخدها كل ساعة. وأنواع الإشعاع المختلفة ممكن يبقى ليها تأثيرات مختلفة.`),
    org:'NASA',url:RAD,refs:[evidence.datasetId],where:{en:'Field terminal',ar:'شاشة الميدان'}},
  {id:'may20-readings',icon:'ui/science-radiation',kind:'mission',title:{en:'The 20 May Readings',ar:'قراءات ٢٠ مايو'},
    short:l=>tr(l,`The rover’s readings jumped from about ${r0(MAY20[0].v)} to a highest reading of about ${r0(PEAK.v)} µGy/hour.`,`قراءات الروبوت طلعت من حوالي ${b(r0(MAY20[0].v))} لأعلى قراية حوالي ${b(r0(PEAK.v)+' µGy/h')}.`),
    detail:l=>tr(l,`${MAY20.length} retrieved rows on 20 May 2024 UTC. Highest: ${PEAK.v} µGy/hour at ${hhmm(PEAK.ts)} UTC (finding P2-RAD-04).`,`${b(String(MAY20.length))} صف مسترجع يوم ٢٠ مايو ٢٠٢٤. الأعلى: ${b(PEAK.v+' µGy/hour')} الساعة ${b(hhmm(PEAK.ts)+' UTC')} (P2-RAD-04).`),
    org:'NASA',url:RAD,refs:['P2-RAD-04',evidence.eventId],where:{en:'Field terminal',ar:'شاشة الميدان'}},
  {id:'compare-days',icon:'science/science-compare',kind:'mission',title:{en:'Comparing Two Days',ar:'مقارنة يومين'},
    short:l=>tr(l,`The middle reading on 20 May (about ${r1(median(MAY20.map(r=>r.v)))}) was much higher than on 19 May (about ${r1(median(MAY19.map(r=>r.v)))}).`,`القراية اللي في النص يوم ٢٠ مايو (حوالي ${b(r1(median(MAY20.map(r=>r.v))))}) كانت أعلى بكتير من ١٩ مايو (حوالي ${b(r1(median(MAY19.map(r=>r.v))))}).`),
    detail:l=>tr(l,`Medians of all retrieved rows: 19 May ${evidence.derived.previousDayMedian.toFixed(3)}, 20 May ${evidence.derived.eventDayMedian.toFixed(3)} µGy/hour. This is the largest day-to-day median increase in the retrieved records (P2-RAD-09). It is a description, not a cause or a hazard label.`,`وسيط كل الصفوف: ١٩ مايو ${b(evidence.derived.previousDayMedian.toFixed(3))}، ٢٠ مايو ${b(evidence.derived.eventDayMedian.toFixed(3)+' µGy/hour')}. ودي أكبر زيادة من يوم ليوم في السجلات المسترجعة (P2-RAD-09). ده وصف، مش سبب ولا تصنيف خطر.`),
    org:'NASA',url:RAD,refs:['P2-RAD-09'],where:{en:'Research Lab',ar:'مختبر الأبحاث'}},
  {id:'rover-vs-person',icon:'ui/science-question',kind:'mission',title:{en:'Rover ≠ Astronaut',ar:'الروبوت مش رائد فضاء'},
    short:l=>tr(l,'A rover’s detector reading is not an astronaut’s dose, and not a reading inside a base.','قراية كاشف الروبوت مش جرعة رائد فضاء، ومش قراية جوه قاعدة.'),
    detail:l=>tr(l,'The dose-equivalent column is blank in this export (P2-RAD-07), and absorbed dose must not be converted into a person’s dose by guessing. The cause of the 20 May increase is not established in this record.','خانة الجرعة المكافئة فاضية في الملف ده (P2-RAD-07)، ومينفعش نحوّل الجرعة الممتصة لجرعة إنسان بالتخمين. وسبب زيادة ٢٠ مايو مش متحدد في السجل ده.'),
    org:'NASA',url:RAD,refs:['P2-RAD-07'],where:{en:'Research Lab',ar:'مختبر الأبحاث'}},
  {id:'many-readings',icon:'ui/science-clock',kind:'mission',title:{en:'A Long Pattern',ar:'حاجة مستمرة'},
    short:l=>tr(l,`${ABOVE_CUTOFF.length} readings stayed above the researchers’ counting line for about ${r0(evidence.derived.spanHours)} hours.`,`${b(String(ABOVE_CUTOFF.length))} قراية فضلوا فوق خط العدّ بتاع الباحثين حوالي ${b(r0(evidence.derived.spanHours))} ساعة.`),
    detail:l=>tr(l,`The ${evidence.derived.exploratoryCutoff} µGy/hour line is a descriptive cutoff chosen for analysis. It is not a human safety limit (P2-RAD-05). Span: ${evidence.derived.spanHours.toFixed(2)} hours.`,`خط ${b(evidence.derived.exploratoryCutoff+' µGy/hour')} اتختار للتحليل والوصف. مش حد أمان للإنسان (P2-RAD-05). المدة: ${b(evidence.derived.spanHours.toFixed(2))} ساعة.`),
    org:'NASA',url:RAD,refs:['P2-RAD-05'],where:{en:'Research Lab',ar:'مختبر الأبحاث'}},
  {id:'data-check',icon:'science/science-rows',kind:'exhibit',title:{en:'Data Detectives',ar:'مخبرين البيانات'},
    short:l=>tr(l,`Out of about ${fmt(Math.round(ex['data-check'].coverageReadings/1000)*1000)} rover readings, ${ex['data-check'].value} rows share a time with another row. Scientists keep them all and check carefully.`,`من حوالي ${b(fmt(Math.round(ex['data-check'].coverageReadings/1000)*1000))} قراية للروبوت، فيه ${b(String(ex['data-check'].value))} صف ليهم نفس الوقت زي صف تاني. العلماء بيحتفظوا بيهم كلهم وبيراجعوا بحرص.`),
    detail:l=>tr(l,`${fmt(ex['data-check'].coverageReadings)} retrieved readings, ${ex['data-check'].observationPeriod} (P2-RAD-01). The reason for the ${ex['data-check'].value} conflicting same-time rows is unknown (P2-RAD-08).`,`${b(fmt(ex['data-check'].coverageReadings))} قراية مسترجعة في الفترة ${b(ex['data-check'].observationPeriod)} (P2-RAD-01). وسبب الـ${b(String(ex['data-check'].value))} صف المتعارضين مش معروف (P2-RAD-08).`),
    org:'NASA',url:ex['data-check'].sourceUrl,refs:['P2-RAD-08','P2-RAD-01'],where:{en:'Research Lab · left screen',ar:'مختبر الأبحاث · الشاشة الشمال'}},
  {id:'surface-typical',icon:'science/science-mars-day',kind:'exhibit',title:{en:'A Usual Day on Mars',ar:'يوم عادي على المريخ'},
    short:l=>tr(l,`Across 2015 to mid-2024, the middle rover reading was about ${r1(ex['surface-typical'].value)} µGy/hour. 20 May 2024 was very different.`,`من ٢٠١٥ لنص ٢٠٢٤، القراية اللي في النص للروبوت كانت حوالي ${b(r1(ex['surface-typical'].value)+' µGy/h')}. ويوم ٢٠ مايو ٢٠٢٤ كان مختلف خالص.`),
    detail:l=>tr(l,`Pooled median ${ex['surface-typical'].value} µGy/hour of retrieved rows, ${ex['surface-typical'].observationPeriod} (P2-RAD-02). Coverage is uneven between years, and this is a rover detector, not an astronaut dose.`,`الوسيط المجمّع ${b(ex['surface-typical'].value+' µGy/hour')} للصفوف المسترجعة، ${b(ex['surface-typical'].observationPeriod)} (P2-RAD-02). التغطية مش متساوية بين السنين، وده كاشف روبوت مش جرعة رائد فضاء.`),
    org:'NASA',url:ex['surface-typical'].sourceUrl,refs:['P2-RAD-02'],where:{en:'Radiation Shelter · right screen',ar:'ملجأ الإشعاع · الشاشة اليمين'}},
  {id:'solar-catalog',icon:'science/science-sun',kind:'exhibit',title:{en:'The Sun-Watchers’ Catalog',ar:'كتالوج مراقبين الشمس'},
    short:l=>tr(l,`In May 2024, NASA’s DONKI catalog listed ${ex['solar-catalog'].counts.FLR} solar flares. Being listed at the same time does not prove it caused the rover’s readings.`,`في مايو ٢٠٢٤، كتالوج DONKI بتاع ناسا سجّل ${b(String(ex['solar-catalog'].counts.FLR))} توهج شمسي. إن حاجة تتسجل في نفس الوقت مش دليل إنها السبب في قراءات الروبوت.`),
    detail:l=>tr(l,`DONKI, ${ex['solar-catalog'].period}: ${ex['solar-catalog'].counts.FLR} flares, ${ex['solar-catalog'].counts.CME} CMEs, ${ex['solar-catalog'].counts.SEP} SEP records (SCI-0003). ${ex['solar-catalog'].caveat} No cause of the 20 May rover increase is established in our evidence.`,`DONKI، ${b(ex['solar-catalog'].period)}: ${b(String(ex['solar-catalog'].counts.FLR))} توهج، ${b(String(ex['solar-catalog'].counts.CME))} انبعاث كتلي، ${b(String(ex['solar-catalog'].counts.SEP))} سجل جسيمات شمسية (SCI-0003). ده كتالوج، مش قياس على المريخ. ومفيش سبب متأكد منه لزيادة ٢٠ مايو في أدلتنا.`),
    org:'NASA',url:ex['solar-catalog'].sourceUrl,refs:['SCI-0003'],where:{en:'Command Hub · left screen',ar:'مركز القيادة · الشاشة الشمال'}},
  {id:'iss-environment',icon:'science/science-station',kind:'exhibit',title:{en:'Different Places, Different Readings',ar:'أماكن مختلفة وقراءات مختلفة'},
    short:l=>tr(l,'Radiation instruments on the space station measure in low Earth orbit, not on Mars. Scientists don’t mix them up.','أجهزة الإشعاع في محطة الفضاء بتقيس في مدار حوالين الأرض، مش على المريخ. والعلماء ما بيخلطوش بينهم.'),
    detail:l=>tr(l,`ISS DosTel readings (${ex['iss-environment'].observationPeriod}) belong to a different environment from Curiosity’s ${evidence.datasetId} (SCI-0002). They are described separately, without converting one into the other.`,`قراءات ISS DosTel (${b(ex['iss-environment'].observationPeriod)}) من مكان مختلف عن ${b(evidence.datasetId)} بتاع كيوريوسيتي (SCI-0002). وبتتوصف لوحدها من غير ما نحوّل واحدة للتانية.`),
    org:'NASA',url:ex['iss-environment'].sourceUrl,refs:['SCI-0002'],where:{en:'Habitat · left screen',ar:'وحدة السكن · الشاشة الشمال'}},
];
export const discovery=(id:string)=>DISCOVERIES.find(d=>d.id===id);
