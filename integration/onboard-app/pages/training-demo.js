// Explicitly synthetic exercise display data, separate from resting measurements.
export function makeTrainingReplay(stage) {
  const ramp = stage.points;
  const last = ramp.at(-1)[0];
  const points = [];
  for (let second = 0; second <= 21600; second += 5) {
    const bpm = second <= last
      ? ramp.find(p => p[0] === second)?.[1] ?? ramp.at(-1)[1]
      : Math.round(136 + 6 * Math.sin((second - last) / 43) + 3 * Math.sin((second - last) / 13));
    points.push([second, second > 0 && second <= last ? Math.round(bpm + 2 * Math.sin(second / 2.8)) : bpm]);
  }
  return { kind: 'synthetic', source: 'PULSE extended synthetic exercise demo based on Petros stage trace; no wearable',
    points, recoveryPoints: stage.recoveryPoints };
}
// Five-minute display window includes fictional pre-start sensor history.
// Negative timestamps are presentation-only and never enter the workout controller or health records.
function interpolate(points, second) {
  const next = points.findIndex(([at]) => at >= second);
  if (next < 0) return null;
  if (next === 0) return points[0][1];
  const [from, a] = points[next-1], [to, b] = points[next];
  return a + (b-a) * (second-from) / (to-from);
}
export function trainingTrace(snapshot, replay) {
  if (!snapshot.sessionId || !replay) return { pulse: [], breathing: [], breathsPerMinute: null };
  const end = snapshot.elapsedSeconds, pulse = [];
  for (let second = end - 300; second <= end; second += 5) {
    const bpm = second < 0
      ? Math.round(72 + 6 * Math.sin(second / 18) + 3 * Math.sin(second / 4.7))
      : interpolate(replay.points, second);
    pulse.push([second, bpm === null ? null : Math.round(bpm)]);
  }
  const breathing = pulse.map(([second, bpm]) => [second, bpm === null ? null
    : Math.round((12 + (bpm-72)*.12 + 1.2 * Math.sin(second/13) + .7 * Math.sin(second/4))*10)/10]);
  return { pulse, breathing, breathsPerMinute: breathing.at(-1)?.[1] ?? null };
}
