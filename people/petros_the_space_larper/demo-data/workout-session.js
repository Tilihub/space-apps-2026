import { getDailyWorkout } from './workout-program.js';

const MIN_BPM = 20;
const MAX_BPM = 250;
const ONE_MINUTE_MS = 60_000;
const FRESH_SAMPLE_MS = 10_000;

function missionTime(iso) {
  const milliseconds = Date.parse(iso);
  if (typeof iso !== 'string' || !iso.endsWith('Z') || !Number.isFinite(milliseconds)) {
    throw new TypeError('Use a UTC timestamp from the mission clock.');
  }
  return milliseconds;
}

function validBpm(bpm) {
  return Number.isFinite(bpm) && bpm >= MIN_BPM && bpm <= MAX_BPM;
}

function validatePoints(points) {
  if (!Array.isArray(points) || !points.length || points[0]?.[0] !== 0
    || points.some((point, index) => !Array.isArray(point) || point.length !== 2
      || !Number.isFinite(point[0]) || !validBpm(point[1])
      || (index > 0 && point[0] <= points[index - 1][0]))) {
    throw new TypeError('Replay points must start at zero and contain ascending seconds and valid bpm.');
  }
}

function replayReading(points, seconds) {
  if (!points || seconds < 0 || seconds > points.at(-1)[0]) return null;
  const next = points.findIndex(([at]) => at >= seconds);
  if (next === 0) return points[0][1];
  const [from, bpm] = points[next - 1];
  const [to, nextBpm] = points[next];
  return bpm + (nextBpm - bpm) * (seconds - from) / (to - from);
}

function replayStats(points, seconds) {
  const last = Math.min(seconds, points.at(-1)[0]);
  const observed = [...points.filter(([at]) => at < last), [last, replayReading(points, last)]];
  if (last === 0) return [];
  let area = 0;
  for (let i = 1; i < observed.length; i++) {
    area += (observed[i][0] - observed[i - 1][0]) * (observed[i][1] + observed[i - 1][1]) / 2;
  }
  return [area / last, Math.max(...observed.map(([, bpm]) => bpm))];
}

function intervalProgress(step, elapsedSeconds) {
  const roundSeconds = step.workSeconds + step.recoverySeconds;
  const round = Math.min(step.count, Math.floor(elapsedSeconds / roundSeconds) + 1);
  const offset = elapsedSeconds - (round - 1) * roundSeconds;
  if (elapsedSeconds >= step.durationSeconds) return { round, phase: 'done', remainingSeconds: 0 };
  if (offset < step.workSeconds) return { round, phase: 'work', remainingSeconds: step.workSeconds - offset };
  return { round, phase: 'recovery', remainingSeconds: roundSeconds - offset };
}

// One browser controller per crew member and scheduled day. Render snapshots in the existing page.
export function createWorkoutController({ missionDay, stage = false, replay, wearableSource, submitWorkout }) {
  if (replay && wearableSource) throw new TypeError('Choose one heart-rate source per workout.');
  if (replay) {
    if (!['synthetic', 'historical'].includes(replay.kind)) throw new TypeError('Invalid replay kind.');
    validatePoints(replay.points);
    if (replay.recoveryPoints) validatePoints(replay.recoveryPoints);
    replay = structuredClone(replay);
  }
  const sourceName = replay?.source ?? wearableSource ?? null;
  if ((replay || wearableSource !== undefined)
    && (typeof sourceName !== 'string' || !sourceName.trim() || sourceName.length > 480)) {
    throw new TypeError('Provide a heart-rate source name.');
  }
  const source = replay ? `replayed (${replay.kind}): ${sourceName}`
    : sourceName && `measured: ${sourceName}`;
  const day = getDailyWorkout(missionDay, { stage });
  const outcomes = new Map();
  let run = null;
  let pendingSave = null;

  function timeForRun(now) {
    const at = missionTime(now);
    const earliest = run.endedAt ?? run.lastStepAt;
    if (at < earliest) throw new RangeError('Mission time moved backwards during this workout.');
    return at;
  }

  function pulseAt(at) {
    if (!run || at < run.startedAt) return null;
    if (replay) {
      if (run.endedAt === null || at <= run.endedAt) {
        return replayReading(replay.points, (at - run.startedAt) / 1000);
      }
      const endBpm = replayReading(replay.points, (run.endedAt - run.startedAt) / 1000);
      const recovery = replayReading(replay.recoveryPoints, (at - run.endedAt) / 1000);
      if (endBpm === null || recovery === null) return null;
      const baseline = replay.points[0][1];
      const recoveryRange = replay.recoveryPoints[0][1] - baseline;
      if (recoveryRange <= 0) return recovery;
      const fraction = (recovery - baseline) / recoveryRange;
      return Math.max(MIN_BPM, Math.min(MAX_BPM, baseline + (endBpm - baseline) * fraction));
    }
    const sample = run.samples.findLast(point => point.at <= at);
    return sample && at - sample.at <= FRESH_SAMPLE_MS ? sample.bpm : null;
  }

  function snapshot(now) {
    const at = missionTime(now);
    const currentStep = run?.endedAt === null ? run.session.steps[run.completed.length] : null;
    const stepElapsedSeconds = currentStep ? Math.max(0, Math.floor((at - run.lastStepAt) / 1000)) : null;
    const bpm = pulseAt(at);
    return {
      day: structuredClone(day),
      status: run?.status ?? (day.sessions.length ? 'ready' : 'rest'),
      nextSessionId: day.sessions.find(session => !outcomes.has(session.id))?.id ?? null,
      outcomes: [...outcomes.values()].map(value => ({ ...value })),
      sessionId: run?.session.id ?? null,
      currentStep: currentStep ? { ...currentStep } : null,
      completed: run?.completed.map(step => ({ ...step })) ?? [],
      totalSteps: run?.session.steps.length ?? 0,
      elapsedSeconds: run ? Math.max(0, Math.floor(((run.endedAt ?? at) - run.startedAt) / 1000)) : 0,
      stepElapsedSeconds,
      interval: currentStep?.kind === 'intervals' ? intervalProgress(currentStep, stepElapsedSeconds) : null,
      heartRate: { bpm: bpm === null ? null : Math.round(bpm), source },
      recoveryReady: run?.endedAt != null && at >= run.endedAt + ONE_MINUTE_MS,
      saveStatus: run?.saveStatus ?? 'idle',
    };
  }

  function start(now, sessionId = snapshot(now).nextSessionId) {
    if (run?.status === 'active' || pendingSave || run?.saveStatus === 'pending' || run?.saveStatus === 'failed') {
      throw new Error('Finish or stop the current workout and resolve its save before starting another.');
    }
    const session = day.sessions.find(item => item.id === sessionId);
    if (!session || outcomes.has(sessionId)) throw new Error('Choose an unfinished session from today.');
    const at = missionTime(now);
    run = { session, startedAt: at, lastStepAt: at, endedAt: null, status: 'active',
      completed: [], samples: [], saveStatus: 'idle', record: null };
    return snapshot(now);
  }

  function end(at, status) {
    if (at <= run.startedAt) throw new RangeError('Wait for the mission clock to move past Start.');
    run.endedAt = at;
    run.status = status;
    run.saveStatus = 'pending';
    outcomes.set(run.session.id, { sessionId: run.session.id, status, endedAt: new Date(at).toISOString() });
  }

  function completeStep(stepId, now, { reps } = {}) {
    if (run?.status !== 'active') return snapshot(now);
    const step = run.session.steps[run.completed.length];
    // Ignore a repeated click for a step that already advanced.
    if (step.id !== stepId) return snapshot(now);
    const at = timeForRun(now);
    const completedReps = reps ?? (step.sets ? step.sets * step.repsPerSet : step.kind === 'resistance' ? null : 0);
    if (!Number.isSafeInteger(completedReps) || completedReps < 0 || completedReps > 1_000_000
      || (step.kind !== 'resistance' && completedReps !== 0)) {
      throw new RangeError('Enter a valid total rep count for the resistance step.');
    }
    if (run.completed.length + 1 === run.session.steps.length) end(at, 'completed');
    run.completed.push({ stepId, reps: completedReps });
    run.lastStepAt = at;
    return snapshot(now);
  }

  function stop(now) {
    if (run?.status === 'active') end(timeForRun(now), 'stopped');
    return snapshot(now);
  }

  function recordHeartRate(bpm, now) {
    if (!wearableSource || !run || run.saveStatus === 'saved' || run.record) return false;
    const at = missionTime(now);
    if (at < run.startedAt || (run.endedAt !== null && at > run.endedAt + ONE_MINUTE_MS)
      || at < (run.samples.at(-1)?.at ?? run.startedAt) || (bpm !== null && !validBpm(bpm))) return false;
    if (run.samples.at(-1)?.at === at) run.samples.pop();
    run.samples.push({ at, bpm });
    return true;
  }

  function buildRecord(withRecovery) {
    const seconds = (run.endedAt - run.startedAt) / 1000;
    const observed = run.samples
      .filter(({ at, bpm }) => at <= run.endedAt && bpm !== null)
      .map(({ bpm }) => bpm);
    const stats = replay ? replayStats(replay.points, seconds) : observed.length
      ? [observed.reduce((sum, bpm) => sum + bpm, 0) / observed.length,
        observed.reduce((peak, bpm) => Math.max(peak, bpm), MIN_BPM)] : [];
    if (!stats.length) return null;
    const recovery = withRecovery ? pulseAt(run.endedAt + ONE_MINUTE_MS) : null;
    return {
      kind: run.session.id,
      startedAt: new Date(run.startedAt).toISOString(),
      endedAt: new Date(run.endedAt).toISOString(),
      reps: run.completed.reduce((sum, step) => sum + step.reps, 0),
      avgHeartRateBpm: Math.round(stats[0]),
      peakHeartRateBpm: Math.round(stats[1]),
      recoveryHeartRateBpm: recovery === null ? null : Math.round(recovery),
      heartRateSource: source,
    };
  }

  async function save(now, { withRecovery = false } = {}) {
    if (pendingSave) return pendingSave;
    if (run?.endedAt == null) throw new Error('Finish or stop the session before saving.');
    if (['saved', 'unavailable', 'skipped'].includes(run.saveStatus)) return snapshot(now);
    const at = timeForRun(now);
    if (!run.record && withRecovery && at < run.endedAt + ONE_MINUTE_MS) {
      throw new Error('One-minute recovery is still in progress.');
    }
    run.record ??= buildRecord(withRecovery);
    if (!run.record) {
      run.saveStatus = 'unavailable';
      return snapshot(now);
    }
    if (typeof submitWorkout !== 'function') throw new TypeError('Connect the health client before saving.');
    run.saveStatus = 'saving';
    pendingSave = Promise.resolve()
      .then(() => submitWorkout({ ...run.record }))
      .catch(error => {
        // The API deduplicates by kind, start and end, including retries after a lost response.
        if (error?.code !== 'already_done') throw error;
      })
      .then(() => {
        run.saveStatus = 'saved';
        return snapshot(now);
      }, error => {
        run.saveStatus = 'failed';
        throw error;
      })
      .finally(() => { pendingSave = null; });
    return pendingSave;
  }

  function skipSave(now) {
    if (run?.endedAt == null || pendingSave || run.saveStatus === 'saved') {
      throw new Error('Only an unsaved, finished workout can be dismissed.');
    }
    run.saveStatus = 'skipped';
    return snapshot(now);
  }

  return Object.freeze({ snapshot, start, completeStep, stop, recordHeartRate, save, skipSave });
}
