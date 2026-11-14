// PRETEND base simulation for the campaign missions. These numbers are game rules, not NASA data and not
// engineering estimates. Rules (kept deliberately small and internally consistent):
//   • Four meters — power, water, oxygen, food — each a whole number from 0 to 5. Every meter starts at 3.
//   • A choice may add or remove whole blocks. Meters are clamped to 0…5. Nothing changes over real time.
//   • Every effect has a written reason the child can see ("The scout trip used 1 power block").
//   • Delayed effects are stored as flags and applied once, when the next mission reveals them.
// The research package has no validated parameters for habitat power, oxygen, water or crop yield
// (blocked candidates MIS-B01/B02/B03, P2-BLOCK-01/02/03), so no meter is ever derived from a measurement.
export type MeterId='power'|'water'|'oxygen'|'food';
export type Meters=Record<MeterId,number>;
export const METER_IDS:MeterId[]=['power','water','oxygen','food'];
export const METER_MAX=5;
export const startMeters=():Meters=>({power:3,water:3,oxygen:3,food:3});
export type Effect=Partial<Meters>;
export function applyEffect(m:Meters,e:Effect|undefined):Meters{
  const out={...m};if(!e)return out;
  for(const k of METER_IDS)if(e[k])out[k]=Math.max(0,Math.min(METER_MAX,out[k]+e[k]!));
  return out;
}
export function sanitizeMeters(x:any):Meters{const m=startMeters();if(!x||typeof x!=='object')return m;for(const k of METER_IDS){const v=x[k];if(Number.isInteger(v))m[k]=Math.max(0,Math.min(METER_MAX,v))}return m}
/** Lowest pretend meter (used only for the ending text); ties resolve in METER_IDS order. */
export const lowest=(m:Meters)=>METER_IDS.reduce((a,b)=>m[b]<m[a]?b:a,METER_IDS[0]);
export const describeEffect=(e:Effect|undefined)=>METER_IDS.filter(k=>e?.[k]).map(k=>({id:k,delta:e![k]!}));
