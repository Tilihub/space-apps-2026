const strength = (id, label, reps) => ({
  id, label, kind: 'resistance', equipment: 'ARED', sets: 4, repsPerSet: reps,
  instruction: 'Use your assigned load and rest between sets as directed.',
});

const timed = (id, label, equipment, durationSeconds, instruction) => ({
  id, label, kind: 'timed', equipment, durationSeconds, instruction,
});

function strengthAndEndurance(day, label, reps, exercises, equipment) {
  return {
    label,
    sessions: [
      {
        id: `day-${day}-resistance`, label: 'Resistance training',
        steps: exercises.map(([id, title]) => strength(id, title, reps)),
      },
      {
        id: `day-${day}-endurance`, label: 'Steady aerobic training',
        recommendedMinutesAfterResistance: [240, 360],
        steps: [
          timed('warm-up', 'Aerobic warm-up', equipment, 300, 'Build gradually to the assigned workload.'),
          timed('steady', 'Steady aerobic exercise', equipment, 1800, 'Hold the assigned steady workload. The study used a workload calibrated to 75% of individual VO₂peak.'),
          timed('cool-down', 'Aerobic cool-down', equipment, 300, 'Reduce the workload gradually.'),
        ],
      },
    ],
  };
}

function intervals(day, equipment, count, workSeconds, recoverySeconds, warmUpSeconds) {
  const label = `Aerobic intervals · ${count} × ${workSeconds < 60 ? `${workSeconds} sec` : `${workSeconds / 60} min`}`;
  return {
    label,
    sessions: [{
      id: `day-${day}-intervals`, label,
      steps: [
        timed('warm-up', 'Aerobic warm-up', equipment, warmUpSeconds, 'Build gradually to the assigned workload.'),
        {
          id: 'intervals', label: 'Work and recovery intervals', kind: 'intervals', equipment,
          count, workSeconds, recoverySeconds, durationSeconds: count * workSeconds + (count - 1) * recoverySeconds,
          instruction: 'Alternate work at the assigned intensity with easy recovery. Start the cool-down after the final work interval.',
        },
        timed('cool-down', 'Aerobic cool-down', equipment, 300, 'Reduce the workload gradually.'),
      ],
    }],
  };
}

const week = [
  strengthAndEndurance(1, 'Resistance (higher volume) and steady cycling', 12, [
    ['squat', 'Squat'], ['deadlift', 'Deadlift'], ['heel-raise', 'Heel raise'], ['bench-press', 'Bench press'],
  ], 'CEVIS cycle'),
  intervals(2, 'CEVIS cycle', 6, 120, 120, 300),
  strengthAndEndurance(3, 'Resistance (moderate volume) and steady treadmill', 8, [
    ['single-leg-squat', 'Single-leg squat'], ['romanian-deadlift', 'Romanian deadlift'],
    ['heel-raise', 'Heel raise'], ['cable-row', 'Cable row'],
  ], 'T2 treadmill with harness'),
  intervals(4, 'CEVIS cycle', 8, 30, 15, 600),
  strengthAndEndurance(5, 'Resistance (lower volume) and steady cycling', 6, [
    ['sumo-squat', 'Sumo squat'], ['sumo-deadlift', 'Sumo deadlift'], ['heel-raise', 'Heel raise'],
    ['bench-press', 'Bench press'],
  ], 'CEVIS cycle'),
  intervals(6, 'T2 treadmill with harness', 4, 240, 180, 300),
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

export function getDailyWorkout(missionDay, { stage = false } = {}) {
  if (!Number.isSafeInteger(missionDay) || missionDay < 0) {
    throw new RangeError('missionDay must be a non-negative integer from the mission clock.');
  }
  const dayOfWeek = missionDay % 7 + 1;
  return {
    ...structuredClone(stage ? stageDay : week[dayOfWeek - 1]),
    missionDay, dayOfWeek, program: stage ? 'stage-demo' : 'iss-sprint-demo',
  };
}
