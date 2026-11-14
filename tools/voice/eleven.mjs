// Shared ElevenLabs helper for local tools only. The key is read from an env file OUTSIDE the project
// (default %TEMP%/opencode/elevenlabs.env, or ELEVENLABS_ENV=path) or from process env. It is never printed,
// never written into the game, and never committed.
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
export function creds(){
  const f=process.env.ELEVENLABS_ENV||join(process.env.TEMP||tmpdir(),'opencode','elevenlabs.env');
  const env={...process.env};
  if(existsSync(f))for(const l of readFileSync(f,'utf8').split(/\r?\n/)){const m=l.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);if(m&&!env[m[1]])env[m[1]]=m[2]}
  if(!env.ELEVENLABS_API_KEY||!env.ELEVENLABS_VOICE_ID)throw Error('ElevenLabs key or voice id missing (set ELEVENLABS_ENV or env vars)');
  return {key:env.ELEVENLABS_API_KEY,voice:env.ELEVENLABS_VOICE_ID};
}
const BASE='https://api.elevenlabs.io';
export async function api(path,{method='GET',body,accept='application/json'}={}){
  const {key}=creds();
  const r=await fetch(BASE+path,{method,headers:{'xi-api-key':key,'Content-Type':'application/json',Accept:accept},body:body?JSON.stringify(body):undefined});
  if(!r.ok){const t=(await r.text()).replaceAll(key,'***');throw Object.assign(Error(`ElevenLabs ${method} ${path} → ${r.status}: ${t.slice(0,300)}`),{status:r.status})}
  return accept==='application/json'?r.json():{buf:Buffer.from(await r.arrayBuffer()),headers:r.headers};
}
