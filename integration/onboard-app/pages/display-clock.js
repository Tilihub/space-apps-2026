import {missionDayOf,missionTimeOf} from '../../../shared/contract/contract.js';

// Rendering only. API submissions, completion timestamps and recovery saves use server time.
// Stop extrapolating after a missed connection rather than inventing an indefinitely live clock.
export function createDisplayClock({now=()=>performance.now(),maxAgeMs=10000}={}){
 let sample=null,receivedAt=0;
 return {
  sync(value){if(!value?.now||!Number.isFinite(Date.parse(value.now)))return;sample={...value};receivedAt=now();},
  get(){
   if(!sample)return null;
   const elapsed=Math.max(0,Math.min(maxAgeMs,now()-receivedAt));
   const iso=new Date(Date.parse(sample.now)+elapsed).toISOString();
   return {...sample,now:iso,missionDay:missionDayOf(iso),time:missionTimeOf(iso)};
  },
  clear(){sample=null;},
 };
}
