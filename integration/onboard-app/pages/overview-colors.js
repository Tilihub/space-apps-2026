import { MEASUREMENTS } from '../../../shared/contract/contract.js';

// Pure presentation: interpolate amber/copper using the accepted input span as a canvas axis.
// The contract's min/max catch input errors; neither they nor this tint are medical limits.
// No baseline, private analysis, alert, recommendation or health classification is derived.
export function readingTint(measure, value) {
  const span=MEASUREMENTS[measure];
  if(!span||typeof value!=='number'||!Number.isFinite(value))return null;
  const position=Math.max(0,Math.min(1,(value-span.min)/(span.max-span.min)));
  const intensity=measure==='sleepHours'?1-position:position;
  const hue=(46-18*intensity).toFixed(2);
  return `hsl(${hue} 72% var(--instrument-lightness, 66%))`;
}
