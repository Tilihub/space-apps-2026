// Product draft: 24-hour prompts, not a validated or scored psychological instrument.
// mood/stress/fatigue retain PET-2 and the existing health contract. Extra items are session drafts.
export const EXTRA_QUESTIONS = Object.freeze([
 {id:'worry',prompt:'How worried or anxious have you felt?',low:'Not at all',high:'Extremely'},
 {id:'focus',prompt:'How easy was it to concentrate on your tasks?',low:'Very difficult',high:'Very easy'},
 {id:'motivation',prompt:'How interested and motivated did you feel?',low:'Not at all',high:'Very much'},
 {id:'loneliness',prompt:'How lonely or isolated did you feel?',low:'Not at all',high:'Extremely'},
 {id:'connection',prompt:'How connected and supported did you feel by your crew?',low:'Not at all',high:'Very much'},
 {id:'workload',prompt:'How demanding did your workload feel?',low:'Very light',high:'Extremely demanding'},
 {id:'mentalRest',prompt:'How mentally refreshed have you felt?',low:'Not at all',high:'Very refreshed'},
]);

export const WELLBEING_SCALE_IDS=Object.freeze(['mood','stress','fatigue',...EXTRA_QUESTIONS.map(q=>q.id)]);
export function validWellbeingSubmission(values){
 return WELLBEING_SCALE_IDS.every(key=>{const v=Number(values[key]);return Number.isInteger(v)&&v>=1&&v<=10;});
}
