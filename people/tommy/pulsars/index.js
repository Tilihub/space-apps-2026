import {apiError,checkFields,resolveCrewId} from '../../../shared/contract/contract.js';
import {DEFAULT_LOOK,ITEM_BY_ID,ANSWER_IDS} from './catalog.js';
import {mainSteps,rewardRate,streakBefore,streakNow} from './rules.js';
const blank=()=>({balance:0,owned:Object.values(DEFAULT_LOOK),equipped:{...DEFAULT_LOOK},exercises:{},trainingDays:[],wellbeing:{},records:{},ledger:[]});
const load=async ctx=>(await ctx.store.load())??{crew:{}};
const fail=message=>{throw apiError('invalid_field',message);};
function view(p,day){
 const wellbeingDays=Object.keys(p.wellbeing).map(Number);
 return {balance:p.balance,owned:p.owned,equipped:p.equipped,records:p.records,
  trainingStreak:streakNow(p.trainingDays,day,true),wellbeingStreak:streakNow(wellbeingDays,day),
  nextExerciseReward:rewardRate(streakBefore(p.trainingDays,day,true)+1),
  nextWellbeingReward:rewardRate(streakBefore(wellbeingDays,day)+1),
  trainingDone:p.trainingDays.includes(day),wellbeingDone:!!p.wellbeing[day],todayAnswers:p.wellbeing[day]?.answers??null,
  completedExercises:Object.values(p.exercises).filter(e=>e.missionDay===day).map(e=>e.stepId),
  ledger:p.ledger.slice(-30).reverse()};
}
async function transact(req,ctx,fn){
 checkFields(req.query??{},[]);
 const crewId=resolveCrewId(req.user),state=await load(ctx),p=state.crew[crewId]??=blank();
 const awards=fn(p,ctx.missionDay());
 await ctx.store.save(state);ctx.emit('pulsars.changed',crewId);
 return {wallet:view(p,ctx.missionDay()),awards};
}
function credit(p,amount,reason,ctx,key){
 const entry={id:key,amount,reason,at:ctx.now(),missionDay:ctx.missionDay()};
 p.balance+=amount;p.ledger.push(entry);return entry;
}
export default {
 name:'pulsars',owner:'tommy',reset:ctx=>ctx.store.save({crew:{}}),routes:[
 {method:'GET',path:'/me',roles:['crew'],handler:async(req,ctx)=>{
  checkFields(req.query??{},[]);const state=await load(ctx),crewId=resolveCrewId(req.user);
  return {wallet:view(state.crew[crewId]??blank(),ctx.missionDay())};
 }},
 {method:'POST',path:'/wellbeing',roles:['crew'],handler:(req,ctx)=>{
  const b=checkFields(req.body,['answers','missionDay'],['answers','missionDay']);if(b.missionDay!==ctx.missionDay())fail('The mission day changed. Refresh before finishing.');checkFields(b.answers,ANSWER_IDS,ANSWER_IDS);
  for(const id of ANSWER_IDS)if(!Number.isInteger(b.answers[id])||b.answers[id]<1||b.answers[id]>10)fail('Answer all ten questions from 1 to 10.');
  return transact(req,ctx,(p,day)=>{
   if(p.wellbeing[day])return [];
   const amount=rewardRate(streakBefore(Object.keys(p.wellbeing).map(Number),day)+1);
   p.wellbeing[day]={answers:{...b.answers},at:ctx.now()};
   return [credit(p,amount,'For completing daily wellbeing',ctx,`wellbeing:${day}`)];
  });
 }},
 {method:'POST',path:'/exercise',roles:['crew'],handler:(req,ctx)=>{
  const b=checkFields(req.body,['sessionId','stepId','sets','weightKg','missionDay'],['sessionId','stepId','missionDay']);
  if(b.missionDay!==ctx.missionDay())fail('This completion belongs to another mission day.');
  const step=mainSteps(ctx.missionDay()).find(s=>s.id===b.stepId&&s.sessionId===b.sessionId);
  if(!step)fail('Choose a main exercise in today’s assigned program.');
  const sets=b.sets??null,kg=b.weightKg??null;
  if(step.sets){
   if(!Array.isArray(sets)||sets.length!==step.sets||sets.some(n=>!Number.isInteger(n)||n!==step.repsPerSet))fail('Complete every assigned set with the prescribed repetitions.');
   if(kg!==null&&(!Number.isFinite(kg)||kg<0||kg>1000))fail('Load must be between 0 and 1000 kg.');
  }else if(sets!==null||kg!==null)fail('Load records apply only to the prescribed resistance exercises.');
  return transact(req,ctx,(p,day)=>{
   const key=`exercise:${day}:${step.id}`;if(p.exercises[key])return [];
   const amount=rewardRate(streakBefore(p.trainingDays,day,true)+1);
   const awards=[credit(p,amount,'For completing daily exercise',ctx,key)];
   p.exercises[key]={missionDay:day,sessionId:b.sessionId,stepId:step.id,sets,weightKg:kg,at:ctx.now()};
   if(kg!==null&&kg>0){
    const previous=p.records[step.id];
    if(!previous||kg>previous.weightKg){
     p.records[step.id]={weightKg:kg,sets:step.sets,repsPerSet:step.repsPerSet,at:ctx.now()};
     if(previous)awards.push(credit(p,100,'For a new personal best',ctx,`pr:${day}:${step.id}`));
    }
   }
   if(!p.trainingDays.includes(day)&&mainSteps(day).every(s=>p.exercises[`exercise:${day}:${s.id}`]))p.trainingDays.push(day);
   return awards;
  });
 }},
 {method:'POST',path:'/purchase',roles:['crew'],handler:(req,ctx)=>{
  const b=checkFields(req.body,['itemId'],['itemId']),item=typeof b.itemId==='string'&&Object.hasOwn(ITEM_BY_ID,b.itemId)?ITEM_BY_ID[b.itemId]:null;
  if(!item)fail('Choose an item from the shop.');
  return transact(req,ctx,p=>{
   if(p.owned.includes(item.id)){p.equipped[item.slot]=item.id;return [];}
   if(p.balance<item.price)fail('Keep saving Pulsars to unlock this item.');
   p.balance-=item.price;p.owned.push(item.id);p.equipped[item.slot]=item.id;
   p.ledger.push({id:`purchase:${item.id}`,amount:-item.price,reason:`Unlocked ${item.name}`,at:ctx.now(),missionDay:ctx.missionDay()});
   return [];
  });
 }},
 {method:'POST',path:'/equip',roles:['crew'],handler:(req,ctx)=>{
  const b=checkFields(req.body,['itemId'],['itemId']),item=typeof b.itemId==='string'&&Object.hasOwn(ITEM_BY_ID,b.itemId)?ITEM_BY_ID[b.itemId]:null;if(!item)fail('Choose an item from the shop.');
  return transact(req,ctx,p=>{if(!p.owned.includes(item.id))fail('Unlock this item before wearing it.');p.equipped[item.slot]=item.id;return [];});
 }},
 ]
};
