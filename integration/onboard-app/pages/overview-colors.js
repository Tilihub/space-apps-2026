import { MEASUREMENTS } from '../../../shared/contract/contract.js';

// Pure presentation: interpolate cyan/amber using the accepted input span as a canvas axis.
// The contract's min/max catch input errors; neither they nor this tint are medical limits.
// No baseline, private analysis, alert, recommendation or health classification is derived.
export function scaleTint(position) {
  const amount=Number.isFinite(position)?Math.max(0,Math.min(1,position)):0;
  return `color-mix(in srgb, var(--graph-base, #27EAFF) ${((1-amount)*100).toFixed(2)}%, var(--graph-warm, #F0C56B))`;
}

export function readingTint(measure, value) {
  const span=MEASUREMENTS[measure];
  if(!span||typeof value!=='number'||!Number.isFinite(value))return null;
  const position=Math.max(0,Math.min(1,(value-span.min)/(span.max-span.min)));
  const intensity=measure==='sleepHours'?1-position:position;
  return scaleTint(intensity);
}
