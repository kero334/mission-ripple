// SVG evidence chart built from every retrieved RAD row. Points are joined only between
// consecutive real readings; any gap longer than GAP_HOURS is left empty and labelled.
import {MAY19,MAY20,WINDOWS,RISE,PEAK,hhmm,type Reading} from '../science/series';
import {evidence} from '../science/mission';
import {CARDS,type Locale,pick} from '../content/strings';

export type ChartOptions={selected?:number|null;compare?:boolean;cutoff?:boolean;highlightRise?:boolean;showPeak?:boolean;windows?:boolean;animate?:boolean;mini?:boolean};
const W=600,H=212,L=46,R=590,T=12,B=172,YMAX=320,GAP_HOURS=1;
const x=(h:number)=>L+(R-L)*h/24,y=(v:number)=>B-(B-T)*Math.min(v,YMAX)/YMAX;
function line(rows:Reading[]){
  const parts:string[][]=[];let cur:string[]=[];
  rows.forEach((r,i)=>{if(i&&r.h-rows[i-1].h>GAP_HOURS){parts.push(cur);cur=[]}cur.push(`${x(r.h).toFixed(1)},${y(r.v).toFixed(1)}`)});
  parts.push(cur);return parts.filter(p=>p.length>1);
}
function gaps(rows:Reading[]){const out:[number,number][]=[];for(let i=1;i<rows.length;i++)if(rows[i].h-rows[i-1].h>GAP_HOURS)out.push([rows[i-1].h,rows[i].h]);return out}

export function chartSvg(l:Locale,o:ChartOptions={}){
  const c=CARDS.chart,tick=[0,100,200,300];
  const sel=o.selected!=null?WINDOWS[o.selected]:null;
  const parts:string[]=[];
  parts.push(`<rect x="${L}" y="${T}" width="${R-L}" height="${B-T}" class="ch-bg"/>`);
  for(const t of tick)parts.push(`<line x1="${L}" x2="${R}" y1="${y(t)}" y2="${y(t)}" class="ch-grid"/><text x="${L-6}" y="${y(t)+4}" class="ch-tick" text-anchor="end">${t}</text>`);
  for(let h=0;h<=24;h+=4)parts.push(`<line x1="${x(h)}" x2="${x(h)}" y1="${B}" y2="${B+4}" class="ch-axis"/><text x="${x(h)}" y="${B+16}" class="ch-tick" text-anchor="middle">${String(h).padStart(2,'0')}:00</text>`);
  if(o.windows)for(const w of WINDOWS)parts.push(`<rect data-window="${w.index}" x="${x(w.start)+1}" y="${T}" width="${x(w.end)-x(w.start)-2}" height="${B-T}" class="ch-win ${sel?.index===w.index?'sel':''} ${sel?.index===w.index?'k-'+w.kind:''}"/>`);
  if(o.highlightRise)parts.push(`<rect x="${x(RISE.from.h)-8}" y="${T}" width="${x(RISE.to.h)-x(RISE.from.h)+16}" height="${B-T}" class="ch-rise"/>`);
  for(const [a,b] of gaps(MAY20))parts.push(`<rect x="${x(a)}" y="${T}" width="${x(b)-x(a)}" height="${B-T}" class="ch-gap"/><text x="${(x(a)+x(b))/2}" y="${T+14}" class="ch-gaptext" text-anchor="middle">${pick(c.gap,l)}</text>`);
  if(o.cutoff){const cy=y(evidence.derived.exploratoryCutoff);parts.push(`<line x1="${L}" x2="${R}" y1="${cy}" y2="${cy}" class="ch-cut"/>`)}
  if(o.compare)for(const p of line(MAY19))parts.push(`<polyline points="${p.join(' ')}" class="ch-line19"/>`);
  for(const p of line(MAY20))parts.push(`<polyline points="${p.join(' ')}" class="ch-line"/>`);
  if(o.compare)for(const r of MAY19)parts.push(`<rect x="${(x(r.h)-1.5).toFixed(1)}" y="${(y(r.v)-1.5).toFixed(1)}" width="3" height="3" class="ch-pt19"/>`);
  for(const r of MAY20){const hot=o.cutoff&&r.v>evidence.derived.exploratoryCutoff;parts.push(`<rect x="${(x(r.h)-2).toFixed(1)}" y="${(y(r.v)-2).toFixed(1)}" width="4" height="4" class="ch-pt ${hot?'hot':''}" style="animation-delay:${(r.h/24*1.8).toFixed(2)}s"><title>${hhmm(r.ts)} UTC · ${r.v} µGy/hour</title></rect>`)}
  if(o.showPeak){const px=x(PEAK.h),py=y(PEAK.v);parts.push(`<rect x="${px-4}" y="${py-4}" width="8" height="8" class="ch-peak"/><text x="${px+9}" y="${py+5}" class="ch-label">${l==='en'?'top dot':'أعلى نقطة'} ≈ ${Math.round(PEAK.v/10)*10}</text>`)}
  // Labels sit on the lines themselves (no separate legend box).
  if(o.compare){parts.push(`<text x="${x(PEAK.h)+12}" y="${y(PEAK.v)+14}" class="ch-label c20">${l==='en'?'20 May':'٢٠ مايو'}</text>`);
    parts.push(`<rect x="${x(1)-4}" y="${y(4)-24}" width="${l==='en'?110:118}" height="18" class="ch-tag19"/><text x="${x(1)+2}" y="${y(4)-10}" class="ch-label c19">${l==='en'?'↓ day before':'↓ اليوم اللي قبله'}</text>`)}
  if(o.cutoff){const cy=y(evidence.derived.exploratoryCutoff);parts.push(`<text x="${R-4}" y="${cy-5}" class="ch-label cut" text-anchor="end">${pick(CARDS.many.line,l)}</text>`)}
  parts.push(`<line x1="${L}" x2="${L}" y1="${T}" y2="${B}" class="ch-axis"/><line x1="${L}" x2="${R}" y1="${B}" y2="${B}" class="ch-axis"/>`);
  parts.push(`<text x="${(L+R)/2}" y="${H-2}" class="ch-title" text-anchor="middle">${pick(c.axisX,l)}</text>`);
  parts.push(`<text transform="translate(11 ${(T+B)/2}) rotate(-90)" class="ch-title" text-anchor="middle">${pick(c.axisY,l)}</text>`);
  const desc=l==='en'?`Line chart of ${MAY20.length} real Curiosity RAD readings on 20 May 2024 UTC. Readings stay near ${Math.round(MAY20[0].v)} until about ${hhmm(RISE.from.ts)}, jump to a highest value of about ${Math.round(PEAK.v)} µGy/hour at ${hhmm(PEAK.ts)}, then slowly fall to about ${Math.round(MAY20.at(-1)!.v)} by midnight.${o.compare?` The 19 May line stays near ${Math.round(MAY19[0].v)} all day.`:''}`
    :`رسم بياني لـ${MAY20.length} قراية حقيقية من جهاز RAD يوم ٢٠ مايو ٢٠٢٤. القراءات حوالي ${Math.round(MAY20[0].v)} لحد الساعة ${hhmm(RISE.from.ts)} تقريبًا، وبعدين بتطلع لأعلى قراية حوالي ${Math.round(PEAK.v)} الساعة ${hhmm(PEAK.ts)}، وبعدين بتنزل بالراحة لحوالي ${Math.round(MAY20.at(-1)!.v)} آخر اليوم.${o.compare?` وخط ١٩ مايو فاضل حوالي ${Math.round(MAY19[0].v)} طول اليوم.`:''}`;
  const windows=o.windows?`<div class="ch-windows" role="group" aria-label="${l==='en'?'Parts of the day':'أجزاء اليوم'}">${WINDOWS.map(w=>`<button type="button" data-science-action="window-${w.index}" class="${sel?.index===w.index?'sel k-'+w.kind:''}" aria-pressed="${sel?.index===w.index}">${String(w.start).padStart(2,'0')}–${String(w.end).padStart(2,'0')}</button>`).join('')}</div>`:'';
  return `<figure class="evidence-chart${o.mini?' mini':''}" dir="ltr"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${desc}" shape-rendering="crispEdges"><desc>${desc}</desc>${parts.join('')}</svg>${windows}<figcaption class="sr-only">${desc}</figcaption></figure>`;
}
