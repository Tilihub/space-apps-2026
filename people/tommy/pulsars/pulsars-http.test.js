import {test} from 'node:test';
import assert from 'node:assert/strict';
import {boot,dataOf} from '../../../integration/onboard-app/test-helpers.js';
import modules from '../../../integration/onboard-app/modules.js';
import {mainSteps} from './rules.js';
import {ANSWER_IDS} from './catalog.js';
test('HTTP wallet is serialized, private, durable; buying concurrently cannot overspend',async()=>{
 let app=await boot(modules,{realNow:()=>0});
 try{
  const token=await app.login('c1'),other=await app.login('c3'),med=await app.login('c2','medical');
  const post=(path,body)=>app.call('POST',`/api/pulsars${path}`,{token,body});
  const get=()=>app.call('GET','/api/pulsars/me',{token});
  const replies=await Promise.all(Array.from({length:8},()=>post('/wellbeing',{missionDay:42,answers:Object.fromEntries(ANSWER_IDS.map(k=>[k,5]))})));
  assert.equal(replies.flatMap(r=>dataOf(r).awards).length,1);assert.equal(dataOf(await get()).wallet.balance,100);
  for(const s of mainSteps(42))dataOf(await post('/exercise',{missionDay:42,sessionId:s.sessionId,stepId:s.id,...(s.sets?{sets:Array(s.sets).fill(s.repsPerSet),weightKg:20}:{})}));
  assert.equal(dataOf(await get()).wallet.balance,600);
  const purchases=await Promise.all([post('/purchase',{itemId:'ring-ice'}),post('/purchase',{itemId:'ring-rose'})]);
  assert.equal(purchases.filter(r=>r.status===200).length,1);assert.equal(dataOf(await get()).wallet.balance,100);
  const bought=dataOf(purchases.find(r=>r.status===200)).wallet.equipped.ring;
  assert.equal((await app.call('GET','/api/pulsars/me',{token:med})).status,403);
  assert.equal(dataOf(await app.call('GET','/api/pulsars/me',{token:other})).wallet.balance,0);
  assert.equal((await app.call('GET','/people/tommy/pulsars/index.js')).status,404);
  assert.equal((await app.call('GET','/pulsars/catalog.js')).status,200);
  const dir=app.dataDir;await app.close({keepData:true});app=await boot(modules,{dataDir:dir,realNow:()=>0});
  const saved=dataOf(await get()).wallet;assert.equal(saved.balance,100);assert.equal(saved.equipped.ring,bought);assert.equal(saved.todayAnswers.mood,5);
 }finally{await app.close();}
});
