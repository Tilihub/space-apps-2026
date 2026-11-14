// Populate a fresh, disposable demo through the existing APIs. No server/module changes.
import { readFile } from 'node:fs/promises';
const origin = process.argv[2] ?? 'http://localhost:8012';
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) throw Error('Use a local demo server.');
const read = p => readFile(new URL(p, import.meta.url), 'utf8').then(JSON.parse);
const health = await read('../../../people/petros_the_space_larper/demo-data/health.json');
const scenarios = await read('../../../people/petros_the_space_larper/demo-data/scenarios.json');
async function api(path, token, body) {
  const r = await fetch(origin+'/api'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const result=await r.json();if(!r.ok||!result.ok)throw Error(path+': '+result.error?.message);return result.data;
}
const sessions=[];
try {
for(const crewId of Object.keys(health.crew)) {
  const {token}=await api('/session',null,{crewId,platform:'astronaut'});
  sessions.push({crewId,token});
  const today=await api('/health/today',token);
  if((await api('/clock',token)).missionDay!==42)throw Error('Start this presentation on mission day 42.');
  if(today.checkedInToday)throw Error('Use a fresh demo store; existing check-ins will not be overwritten.');
}
for(const {crewId,token} of sessions) {
  // Stage values where supplied; otherwise extend the crew member's last stable synthetic day.
  const {missionDay,time,...previous}=health.crew[crewId].checkIns.at(-1);
  const values={...previous,...scenarios.cases[crewId]?.checkInBody};
  await api('/health/check-ins',token,values);
  const symptom=scenarios.cases[crewId]?.symptomReportBody;
  if(symptom)await api('/meds/symptom-reports',token,{...symptom,note:symptom.note+' Body area: head.'});
  if(crewId==='c3')await api('/mind/journal',token,{text:'Synthetic stage journal: I miss home and would like a quiet conversation today.'});
  console.log(crewId+': day-42 check-in loaded from PET-1 / stage scenario.');
}
} finally {
  for(const {token} of sessions) await fetch(origin+'/api/session',{method:'DELETE',headers:{Authorization:'Bearer '+token}});
}
