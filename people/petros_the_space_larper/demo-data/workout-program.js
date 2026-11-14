const flywheel = 'Compact flywheel';
const resistanceExercises = [
  ['squat', 'Harness squat', 'harness'],
  ['deadlift', 'Deadlift', 'bar'],
  ['heel-raise', 'Harness heel raise', 'harness'],
  ['bar-row', 'Bent-over row', 'bar'],
];

const strength = (id, label, attachment, repsPerSet, restBetweenSetsSeconds) => ({
  id, label, kind: 'resistance', equipment: `${flywheel} with ${attachment}`, sets: 4, repsPerSet,
  restBetweenSetsSeconds, repsInReserve: [2, 3],
  instruction: `Secure your feet and use your assigned flywheel setting. Finish each set with 2–3 clean reps in reserve. Rest ${restBetweenSetsSeconds / 60} min between sets.`,
});

const timed = (id, label, equipment, durationSeconds, instruction) => ({
  id, label, kind: 'timed', equipment, durationSeconds, instruction,
});

const rowWarmUp = seconds => timed('warm-up', 'Rowing warm-up', flywheel, seconds,
  'Check the foot restraints and build gradually from easy rowing.');
const rowCoolDown = () => timed('cool-down', 'Rowing cool-down', flywheel, 300,
  'Row easily and gradually reduce effort.');

function strengthAndEndurance(day, volume, reps, restSeconds) {
  return {
    label: `${volume} resistance and steady rowing`,
    sessions: [
      {
        id: `day-${day}-resistance`, label: 'Resistance training',
        preparation: 'Check the anchor and restraints. Warm up each movement at light effort before the working sets.',
        steps: resistanceExercises.map(([id, title, attachment]) => strength(id, title, attachment, reps, restSeconds)),
      },
      {
        id: `day-${day}-endurance`, label: 'Steady rowing',
        recommendedMinutesAfterResistance: [240, 360],
        steps: [
          rowWarmUp(300),
          {
            ...timed('steady', 'Steady rowing', flywheel, 1800,
              'Hold the workload calibrated to about 75% of your measured rowing VO₂peak. Use your assigned steady effort.'),
            oxygenUptakePercentOfPeak: 75,
          },
          rowCoolDown(),
        ],
      },
    ],
  };
}

function intervals(day, count, workSeconds, recoverySeconds, warmUpSeconds, workTarget, heartRatePercentOfPeak) {
  const label = `Rowing intervals · ${count} × ${workSeconds < 60 ? `${workSeconds} sec` : `${workSeconds / 60} min`}`;
  const recoveryTarget = 'Between efforts, row easily at about 2–3 out of 10.';
  return {
    label,
    sessions: [{
      id: `day-${day}-intervals`, label,
      steps: [
        rowWarmUp(warmUpSeconds),
        {
          id: 'intervals', label: 'Rowing work and recovery intervals', kind: 'intervals', equipment: flywheel,
          count, workSeconds, recoverySeconds, durationSeconds: count * workSeconds + (count - 1) * recoverySeconds,
          workTarget, recoveryTarget,
          ...(heartRatePercentOfPeak ? { heartRatePercentOfPeak } : {}),
          instruction: `${workTarget} ${recoveryTarget} Start the cool-down after the final work interval.`,
        },
        rowCoolDown(),
      ],
    }],
  };
}

const week = [
  strengthAndEndurance(1, 'Higher-volume', 12, 120),
  intervals(2, 6, 120, 120, 300, 'Build to hard rowing, about 7–8 out of 10, using your assigned power or pace.'),
  strengthAndEndurance(3, 'Moderate-volume', 8, 120),
  intervals(4, 8, 30, 15, 600, 'Row hard and controlled, about 8–9 out of 10, at your assigned short-interval power or pace.'),
  strengthAndEndurance(5, 'Lower-volume', 6, 180),
  intervals(6, 4, 240, 180, 300,
    'Use your assigned power or pace. When a measured rowing peak and live pulse are available, aim for 85–95% of peak late in each effort. Otherwise use the assigned hard effort, about 8–9 out of 10.',
    [85, 95]),
  { label: 'Rest day', sessions: [] },
];

const stageDay = {
  label: 'Stage demo · push-ups',
  sessions: [{
    id: 'push-ups', label: 'Push-ups',
    steps: [
      timed('warm-up', 'Warm up', 'None', 10, 'Move gently to get ready for the demonstration.'),
      {
        id: 'push-ups', label: 'Push-ups', kind: 'resistance', equipment: 'Floor',
        instruction: 'Record the number of repetitions you actually performed.',
      },
    ],
  }],
};

export function getDailyWorkout(missionDay, { stage = false, rowingHrPeakBpm } = {}) {
  if (!Number.isSafeInteger(missionDay) || missionDay < 0) {
    throw new RangeError('missionDay must be a non-negative integer from the mission clock.');
  }
  if (rowingHrPeakBpm !== undefined
    && (!Number.isFinite(rowingHrPeakBpm) || rowingHrPeakBpm < 20 || rowingHrPeakBpm > 250)) {
    throw new RangeError('rowingHrPeakBpm must be a measured peak in bpm between 20 and 250.');
  }
  const dayOfWeek = missionDay % 7 + 1;
  const day = structuredClone(stage ? stageDay : week[dayOfWeek - 1]);
  if (rowingHrPeakBpm !== undefined) {
    for (const step of day.sessions.flatMap(session => session.steps)) {
      if (step.heartRatePercentOfPeak) {
        step.targetHeartRateBpm = step.heartRatePercentOfPeak.map(percent => Math.round(rowingHrPeakBpm * percent / 100));
      }
    }
  }
  return {
    ...day, missionDay, dayOfWeek, program: stage ? 'stage-demo' : 'mars-transit',
  };
}
