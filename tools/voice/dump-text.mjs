// Dev helper: lists every {en,ar} text object exported by the game's text modules, with its path and placeholders.
import {createServer} from 'vite';
const server=await createServer({server:{middlewareMode:true,hmr:false,watch:null},appType:'custom',logLevel:'error',optimizeDeps:{noDiscovery:true,include:[]}});
const mods={strings:'/src/content/strings.ts',disc:'/src/content/discoveries.ts',rewards:'/src/game/rewards.ts',cdata:'/src/missions/campaign-data.ts',world:'/src/world-data.ts',exhibits:'/src/game/exhibits.ts'};
const out=[];
const walk=(x,p,seen=new Set())=>{if(!x||typeof x!=='object'||seen.has(x))return;seen.add(x);if(typeof x.en==='string'&&typeof x.ar==='string'){out.push([p,x.en]);return}for(const [k,v] of Object.entries(x))walk(v,p+'.'+k,seen)};
for(const [n,f] of Object.entries(mods)){try{const m=await server.ssrLoadModule(f);for(const [k,v] of Object.entries(m))walk(v,n+'.'+k)}catch(e){console.log('ERR',n,e.message)}}
const mode=process.argv[2]||'ph';
if(mode==='ph'){for(const [p,t] of out)if(/\{\w+\}/.test(t))console.log(p,'|',t)}
else if(mode==='keys'){const g={};for(const [p] of out){const k=p.split('.').slice(0,3).join('.');g[k]=(g[k]||0)+1}console.log(Object.entries(g).map(([k,v])=>k+':'+v).join('\n'))}
console.log('total',out.length);
await server.close();
