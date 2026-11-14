// Prints the ElevenLabs account quota and the selected voice (no secrets). node tools/voice/account.mjs
// Restricted keys may lack some permissions; each call is tried separately.
import {api,creds} from './eleven.mjs';
const {voice}=creds();
const tryit=async(name,f)=>{try{console.log(name,JSON.stringify(await f()))}catch(e){console.log(name,'unavailable:',e.status||'',String(e.message).match(/"message":"([^"]+)"/)?.[1]||e.message.slice(0,120))}};
await tryit('quota',async()=>{const s=await api('/v1/user/subscription');return {tier:s.tier,used:s.character_count,limit:s.character_limit,left:s.character_limit-s.character_count}});
await tryit('voice',async()=>{const v=await api('/v1/voices/'+voice);return {name:v.name,category:v.category,labels:v.labels,settings:v.settings}});
await tryit('models',async()=>(await api('/v1/models')).filter(m=>m.can_do_text_to_speech).map(m=>({id:m.model_id,cost:m.model_rates?.character_cost_multiplier})));
