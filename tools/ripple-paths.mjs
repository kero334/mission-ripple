import {createServer} from 'vite';
const server=await createServer({server:{middlewareMode:true,hmr:false,watch:null},appType:'custom',logLevel:'error',optimizeDeps:{noDiscovery:true,include:[]}});
const SIM=await server.ssrLoadModule('/src/game/base-sim.ts');
function play(m1,c,pol={}){const E=[];const cur=()=>SIM.replay(m1,E).base;
  E.push({t:'choose',m:'M2-LOG',o:c[0]});E.push({t:'choose',m:'M3-SUN',o:c[1]});E.push({t:'day'});
  if(SIM.lamps(cur())<2)E.push({t:'fix',o:pol.fix&&cur().power[pol.fix]?pol.fix:'keep'});
  E.push({t:'choose',m:'M4-PLANTS',o:c[2]});E.push({t:'day'});
  E.push({t:'choose',m:'M5-POWER',o:c[3]});E.push({t:'day'});
  const stuck=cur().rover==='stuck';if(stuck)E.push({t:'rescue',o:pol.rescue?'help':'leave'});
  E.push({t:'choose',m:'M6-PLAN',o:c[4]});E.push({t:'day'});
  const b=SIM.replay(m1,E).base;return {k:SIM.outcome(b).kind,plants:b.plants,open:SIM.outcome(b).open.join('+'),stuck}}
for(const m1 of ['study','trip'])for(let k=0;k<32;k++){const c=[...Array(5)].map((_,i)=>k>>i&1?'B':'A').join('');const n=play(m1,c),r=play(m1,c,{rescue:true}),f=play(m1,c,{fix:'watch'});
  if(n.stuck||n.k!==f.k)console.log(m1,c,'none',n.k,n.plants,n.open,'| rescue',r.k,r.open,'| fixWatch',f.k,f.plants)}
await server.close();
