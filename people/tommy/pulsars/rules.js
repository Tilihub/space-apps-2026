import {getDailyWorkout} from '../../petros_the_space_larper/demo-data/workout-program.js';
export const mainSteps=day=>getDailyWorkout(day).sessions.flatMap(session=>session.steps.filter(s=>!['warm-up','cool-down'].includes(s.id)).map(step=>({...step,sessionId:session.id})));
export const rewardRate=streak=>streak>5?300:streak>3?200:100;
// Rest preserves the training streak without incrementing it or creating a reward.
export function streakBefore(days,day,training=false){
 const done=new Set(days);let count=0;
 for(let d=day-1;d>=0;d--){
  if(training&&!mainSteps(d).length)continue;
  if(!done.has(d))break;
  count++;
 }
 return count;
}
export function streakNow(days,day,training=false){return streakBefore(days,day,training)+(days.includes(day)?1:0);}
