import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDisplayClock} from './pages/display-clock.js';
import {validWellbeingSubmission,WELLBEING_SCALE_IDS} from './pages/wellbeing-questions.js';
import {createWorkoutController} from '../../people/petros_the_space_larper/demo-data/workout-session.js';

test('display time advances between server polls without accumulating timer drift',()=>{
 let elapsed=0;
 const display=createDisplayClock({now:()=>elapsed});
 const server={now:'2026-11-14T07:30:00.000Z',missionDay:42,time:'07:30'};
 assert.equal(display.get(),null);
 display.sync(server);
 elapsed=1000;assert.equal(display.get().now,'2026-11-14T07:30:01.000Z');
 elapsed=4700;
 for(let i=0;i<10;i++)assert.equal(display.get().now,'2026-11-14T07:30:04.700Z');
 assert.equal(server.now,'2026-11-14T07:30:00.000Z');
 display.sync({now:'2026-11-14T07:30:05.000Z'});
 elapsed=5700;assert.equal(display.get().now,'2026-11-14T07:30:06.000Z');
});

test('exercise time resets per step while total session time continues',()=>{
 let elapsed=0;
 const display=createDisplayClock({now:()=>elapsed});
 const workout=createWorkoutController({missionDay:42,stage:true});
 const start='2026-11-14T07:30:00.000Z';
 display.sync({now:start});workout.start(start);
 elapsed=7000;
 assert.equal(workout.snapshot(display.get().now).stepElapsedSeconds,7);
 const stepEnd='2026-11-14T07:30:10.000Z';
 workout.completeStep('warm-up',stepEnd);
 elapsed=10000;display.sync({now:stepEnd});
 elapsed=13750;
 const snapshot=workout.snapshot(display.get().now);
 assert.equal(snapshot.elapsedSeconds,13);
 assert.equal(snapshot.stepElapsedSeconds,3);
 assert.equal(snapshot.currentStep.id,'push-ups');
});

test('display time follows explicit mission jumps, rolls dates and stops extrapolating when disconnected',()=>{
 let elapsed=0;
 const display=createDisplayClock({now:()=>elapsed});
 display.sync({now:'2026-11-14T23:59:59.000Z'});
 elapsed=2000;
 assert.equal(display.get().missionDay,43);
 assert.equal(display.get().time,'00:00');
 elapsed=60000;
 assert.equal(display.get().now,'2026-11-15T00:00:09.000Z');
 display.sync({now:'2026-11-15T08:00:00.000Z'});
 assert.equal(display.get().time,'08:00');
 display.clear();assert.equal(display.get(),null);
});

test('wellbeing completion requires all nine scales and the final support answer',()=>{
 const answers=Object.fromEntries(WELLBEING_SCALE_IDS.map(k=>[k,'5']));
 assert.equal(validWellbeingSubmission(answers),false);
 answers.supportWanted='no';
 assert.equal(validWellbeingSubmission(answers),true);
 for(const key of WELLBEING_SCALE_IDS){
  assert.equal(validWellbeingSubmission({...answers,[key]:''}),false,key);
  assert.equal(validWellbeingSubmission({...answers,[key]:'11'}),false,key);
  assert.equal(validWellbeingSubmission({...answers,[key]:'1.5'}),false,key);
 }
 assert.equal(validWellbeingSubmission({...answers,supportWanted:'yes'}),true);
});
