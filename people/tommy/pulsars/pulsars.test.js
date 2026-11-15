import {test} from 'node:test';
import assert from 'node:assert/strict';
import {handleRequest} from '../../../shared/contract/contract.js';
import {crewUser,medicalOfficer,earthUser,makeTestContext} from '../../../shared/contract/testing.js';
import pulsars from './index.js';
import {ANSWER_IDS,DEFAULT_LOOK} from './catalog.js';
import {mainSteps,rewardRate,streakBefore} from './rules.js';
const user=crewUser('c1');
const answers=Object.fromEntries(ANSWER_IDS.map(id=>[id,5]));
const call=(ctx,method,path,body,who=user,query={})=>handleRequest(pulsars,ctx,{method,path,body:body&&['/exercise','/wellbeing'].includes(path)?{missionDay:ctx.missionDay(),...body}:body,user:who,query});
const ok=r=>{assert.equal(r.body.ok,true,JSON.stringify(r.body));return r.body.data;};
const stepBody=(s,kg=10)=>({sessionId:s.sessionId,stepId:s.id,...(s.sets?{sets:Array(s.sets).fill(s.repsPerSet),weightKg:kg}:{})});

test('private wallet, zero start, role and author isolation; no client-funded coins',async()=>{
 const ctx=makeTestContext();await pulsars.reset(ctx);
 assert.equal(ok(await call(ctx,'GET','/me')).wallet.balance,0);
 for(const who of [medicalOfficer(),earthUser()])assert.equal((await call(ctx,'GET','/me',null,who)).status,403);
 assert.equal((await call(ctx,'GET','/me',null,user,{crewId:'c2'})).status,400);
 assert.equal((await call(ctx,'POST','/wellbeing',{answers,balance:3000})).status,400);
 await call(ctx,'POST','/wellbeing',{answers});
 assert.equal(ok(await call(ctx,'GET','/me',null,crewUser('c3'))).wallet.balance,0);
 assert.ok(!JSON.stringify(ctx.events).includes('answers'));
});

test('ten answers saved privately, value-independent reward and once-per-day retry',async()=>{
 const ctx=makeTestContext();
 assert.equal((await call(ctx,'POST','/wellbeing',{answers:{...answers,mentalRest:0}})).status,400);
 assert.equal((await call(ctx,'POST','/wellbeing',{answers:{mood:5}})).status,400);
 const first=ok(await call(ctx,'POST','/wellbeing',{answers}));assert.equal(first.awards[0].amount,100);
 assert.deepEqual(first.wallet.todayAnswers,answers);
 const retry=ok(await call(ctx,'POST','/wellbeing',{answers:{...answers,mood:1}}));assert.equal(retry.awards.length,0);assert.equal(retry.wallet.balance,100);assert.equal(retry.wallet.todayAnswers.mood,5);
 const other=ok(await call(ctx,'POST','/wellbeing',{answers:Object.fromEntries(ANSWER_IDS.map(id=>[id,1]))},crewUser('c3')));assert.equal(other.wallet.balance,100);
});

test('wellbeing rate changes on fourth and sixth day, gaps reset rate but never coins',async()=>{
 const ctx=makeTestContext();const amounts=[];
 for(let i=0;i<7;i++){amounts.push(ok(await call(ctx,'POST','/wellbeing',{answers})).awards[0].amount);ctx.advance(1440);}
 assert.deepEqual(amounts,[100,100,100,200,200,300,300]);
 const saved=ok(await call(ctx,'GET','/me')).wallet.balance;ctx.advance(1440);
 const after=ok(await call(ctx,'POST','/wellbeing',{answers}));assert.equal(after.awards[0].amount,100);assert.equal(after.wallet.balance,saved+100);
 assert.deepEqual([1,3,4,5,6].map(rewardRate),[100,100,200,200,300]);
});

test('only main assigned steps; exact prescribed sets/reps and per-day exercise deduplication',async()=>{
 const ctx=makeTestContext(),step=mainSteps(42)[0],body=stepBody(step);
 assert.equal((await call(ctx,'POST','/exercise',{...body,sets:[12]})).status,400);
 assert.equal((await call(ctx,'POST','/exercise',{...body,sets:[12,12,12,11]})).status,400);
 assert.equal((await call(ctx,'POST','/exercise',{...body,weightKg:-5})).status,400);
 assert.equal((await call(ctx,'POST','/exercise',{sessionId:step.sessionId,stepId:'warm-up'})).status,400);
 assert.equal((await call(ctx,'POST','/exercise',{sessionId:'push-ups',stepId:'push-ups'})).status,400);
 const one=ok(await call(ctx,'POST','/exercise',body));assert.equal(one.wallet.balance,100);assert.equal(one.wallet.trainingDone,false);assert.equal(one.wallet.records[step.id].weightKg,10);assert.equal(one.awards.length,1);
 const retry=ok(await call(ctx,'POST','/exercise',{...body,weightKg:20}));assert.equal(retry.wallet.balance,100);assert.equal(retry.wallet.records[step.id].weightKg,10);
 for(const other of mainSteps(42).slice(1))await call(ctx,'POST','/exercise',stepBody(other));
 const full=ok(await call(ctx,'GET','/me')).wallet;assert.equal(full.trainingDone,true);assert.equal(full.balance,500);assert.equal(full.trainingStreak,1);
});

test('PR awards only for a higher load on a later completion, never first or equal record',async()=>{
 const ctx=makeTestContext();
 for(const s of mainSteps(42))await call(ctx,'POST','/exercise',stepBody(s));
 ctx.advance(2880);const s=mainSteps(44)[0];
 const pr=ok(await call(ctx,'POST','/exercise',stepBody(s,15)));assert.deepEqual(pr.awards.map(a=>a.amount),[100,100]);assert.equal(pr.wallet.records[s.id].weightKg,15);
 ctx.advance(2880);const equal=ok(await call(ctx,'POST','/exercise',stepBody(mainSteps(46)[0],15)));assert.equal(equal.awards.length,1);
});

test('full-program training streak, separate wellbeing streak, planned rest preserves without increment',async()=>{
 const ctx=makeTestContext();const perDay=[];
 for(let i=0;i<9;i++){
  let rewards=[];for(const s of mainSteps(ctx.missionDay()))rewards.push(...ok(await call(ctx,'POST','/exercise',stepBody(s))).awards.filter(a=>!a.id.startsWith('pr:')));
  perDay.push(rewards.map(a=>a.amount));ctx.advance(1440);
 }
 assert.deepEqual(perDay.slice(0,6).map(a=>a[0]),[100,100,100,200,200,300]);assert.deepEqual(perDay[6],[]);assert.equal(perDay[7][0],300);
 assert.equal(streakBefore([42,43,44,45,46,47],49,true),6);
 const wallet=ok(await call(ctx,'GET','/me')).wallet;assert.equal(wallet.wellbeingStreak,0);assert.equal(wallet.trainingStreak,8);
});

test('server-priced purchases, insufficient funds, no duplicate debit, owned-only equip and restart',async()=>{
 const ctx=makeTestContext();
 assert.equal((await call(ctx,'POST','/purchase',{itemId:'body-mint'})).status,400);
 for(const itemId of ['__proto__','constructor','toString'])assert.equal((await call(ctx,'POST','/purchase',{itemId})).status,400);
 assert.equal((await call(ctx,'POST','/purchase',{itemId:'ring-ice',price:0})).status,400);
 assert.equal((await call(ctx,'POST','/equip',{itemId:'gear-crown'})).status,400);
 for(const s of mainSteps(42))await call(ctx,'POST','/exercise',stepBody(s));
 const bought=ok(await call(ctx,'POST','/purchase',{itemId:'ring-ice'}));assert.equal(bought.wallet.balance,0);assert.equal(bought.wallet.equipped.ring,'ring-ice');
 assert.equal(ok(await call(ctx,'POST','/purchase',{itemId:'ring-ice'})).wallet.balance,0);
 const restarted=makeTestContext({state:ctx.saved()});assert.equal(ok(await call(restarted,'GET','/me')).wallet.equipped.ring,'ring-ice');
 const unequip=ok(await call(restarted,'POST','/equip',{itemId:DEFAULT_LOOK.ring}));assert.equal(unequip.wallet.equipped.ring,DEFAULT_LOOK.ring);
 await pulsars.reset(restarted);assert.equal(ok(await call(restarted,'GET','/me')).wallet.balance,0);
});

test('failed durable save cannot create points or spend coins on the next retry',async()=>{
 const ctx=makeTestContext();await pulsars.reset(ctx);const save=ctx.store.save;ctx.store.save=async()=>{throw Error('disk unavailable');};
 ctx.log=()=>{};
 const failed=await call(ctx,'POST','/wellbeing',{answers});assert.equal(failed.body.ok,false);ctx.store.save=save;
 assert.equal(ok(await call(ctx,'GET','/me')).wallet.balance,0);
 assert.equal(ok(await call(ctx,'POST','/wellbeing',{answers})).wallet.balance,100);
});

test('stale completions cannot be reassigned to a later mission day',async()=>{const ctx=makeTestContext();assert.equal((await call(ctx,'POST','/wellbeing',{missionDay:41,answers})).status,400);assert.equal((await call(ctx,'POST','/exercise',{...stepBody(mainSteps(42)[0]),missionDay:41})).status,400);assert.equal(ok(await call(ctx,'GET','/me')).wallet.balance,0);});

test('questionnaire UI and server require the same ten fields',async()=>{
 const {WELLBEING_SCALE_IDS}=await import('../../../integration/onboard-app/pages/wellbeing-questions.js');
 assert.deepEqual(ANSWER_IDS,WELLBEING_SCALE_IDS);
});
