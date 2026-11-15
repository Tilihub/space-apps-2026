import {test} from 'node:test';
import assert from 'node:assert/strict';
import modules from './modules.js';
import {boot,dataOf} from './test-helpers.js';
const bins=r=>r.lockers.flatMap(l=>l.shelves.flatMap(s=>s.bins));
test('AED is emergency-only, one device, patient-linked collection, persistent checkout and reset',async()=>{
 let app=await boot(modules,{realNow:()=>0});
 try{
  const crew=await app.login('c1'),other=await app.login('c3'),med=await app.login('c2','medical');
  const get=(path,token=crew)=>app.call('GET','/api'+path,{token});
  const post=(path,body,token=crew)=>app.call('POST','/api'+path,{token,body});
  const aed=bins(dataOf(await get('/meds/lockers'))).find(b=>b.itemId==='aed');
  assert.equal(aed.compartmentId,'L3-4-01');assert.equal(aed.tier,'emergency');assert.equal(aed.locked,true);assert.equal(aed.units,1);
  assert.equal((await post('/meds/collections',{itemId:'aed',units:1})).body.ok,false);
  const emergency=dataOf(await post('/meds/emergencies',{patientId:'c5',reason:'Synthetic scenario: sudden cardiac arrest; retrieve AED.'})).emergency;
  assert.equal((await post('/meds/collections',{emergencyId:emergency.id,itemId:'aed',units:2})).body.ok,false);
  const collection=dataOf(await post('/meds/collections',{emergencyId:emergency.id,itemId:'aed',units:1})).collection;
  assert.equal(collection.patientId,'c5');assert.equal(collection.compartments.length,1);
  assert.equal((await post(`/meds/collections/${collection.id}/scan`,{compartmentId:aed.compartmentId},other)).status,403);
  dataOf(await post(`/meds/collections/${collection.id}/scan`,{compartmentId:aed.compartmentId}));
  assert.equal(bins(dataOf(await get('/meds/lockers'))).find(b=>b.itemId==='aed').units,0);
  assert.equal((await post(`/meds/collections/${collection.id}/scan`,{compartmentId:aed.compartmentId})).body.ok,false);
  assert.equal((await post('/meds/collections',{emergencyId:emergency.id,itemId:'aed',units:1})).body.ok,false);
  const log=dataOf(await get('/meds/doses?crewId=c5',med)).doses.find(d=>d.itemId==='aed');assert.equal(log.source,'emergency');assert.equal(log.units,1);
  const incident=dataOf(await get('/meds/emergencies?status=open',med)).emergencies.find(e=>e.id===emergency.id);assert.equal(incident.released.find(r=>r.itemId==='aed').units,1);assert.equal(incident.released.find(r=>r.itemId==='aed').releasedBy,'c1');
  const dir=app.dataDir;await app.close({keepData:true});app=await boot(modules,{dataDir:dir,realNow:()=>0});
  assert.equal(bins(dataOf(await get('/meds/lockers'))).find(b=>b.itemId==='aed').units,0);
  dataOf(await post('/demo/reset',{}));assert.equal(bins(dataOf(await get('/meds/lockers'))).find(b=>b.itemId==='aed').units,1);
  assert.equal(dataOf(await get('/meds/emergencies?status=open')).emergencies.length,0);
 }finally{await app.close();}
});
