import { LAUNCH, MEASUREMENTS, apiError, checkFields, missionDayOf } from '../../../shared/contract/contract.js';

const FIELDS = ['kind', 'startedAt', 'endedAt', 'reps', 'avgHeartRateBpm', 'peakHeartRateBpm',
  'recoveryHeartRateBpm', 'heartRateSource'];

function utcTime(value, field) {
  if (typeof value !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) {
    throw apiError('invalid_field', `${field} must be an ISO 8601 UTC timestamp ending in Z.`);
  }
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString().slice(0, 19) !== value.slice(0, 19)) {
    throw apiError('invalid_field', `${field} must be a valid UTC date and time.`);
  }
  return { milliseconds, iso: new Date(milliseconds).toISOString() };
}

export function validateWorkout(body, now) {
  checkFields(body, FIELDS, FIELDS.filter(field => field !== 'recoveryHeartRateBpm'));
  for (const [field, maximum] of [['kind', 80], ['heartRateSource', 500]]) {
    if (typeof body[field] !== 'string' || !body[field].trim() || body[field].length > maximum) {
      throw apiError('invalid_field', `${field} must be non-empty text of at most ${maximum} characters.`);
    }
  }
  const started = utcTime(body.startedAt, 'startedAt');
  const ended = utcTime(body.endedAt, 'endedAt');
  if (started.milliseconds < Date.parse(LAUNCH) || ended.milliseconds <= started.milliseconds
    || ended.milliseconds > Date.parse(now)) {
    throw apiError('invalid_field', 'The workout must start during the mission and end after its start, no later than mission time.');
  }
  if (!Number.isSafeInteger(body.reps) || body.reps < 0) {
    throw apiError('invalid_field', 'reps must be a non-negative whole number.');
  }
  const recovery = body.recoveryHeartRateBpm ?? null;
  // Reuse the contract's numeric bpm input range only; never its resting comparison.
  const { min, max } = MEASUREMENTS.restingHeartRateBpm;
  for (const [field, value] of [['avgHeartRateBpm', body.avgHeartRateBpm],
    ['peakHeartRateBpm', body.peakHeartRateBpm], ['recoveryHeartRateBpm', recovery]]) {
    if (field === 'recoveryHeartRateBpm' && value === null) continue;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
      throw apiError('invalid_field', `${field} must be a number from ${min} to ${max} bpm${field === 'recoveryHeartRateBpm' ? ', or null' : ''}.`);
    }
  }
  if (body.peakHeartRateBpm < body.avgHeartRateBpm) {
    throw apiError('invalid_field', 'Peak heart rate cannot be lower than average heart rate.');
  }
  if (recovery !== null && Date.parse(now) < ended.milliseconds + 60_000) {
    throw apiError('invalid_field', 'One-minute recovery is not available yet. Submit it after one minute, or leave it null.');
  }
  return { kind: body.kind.trim(), startedAt: started.iso, endedAt: ended.iso, reps: body.reps,
    avgHeartRateBpm: body.avgHeartRateBpm, peakHeartRateBpm: body.peakHeartRateBpm,
    recoveryHeartRateBpm: recovery, heartRateSource: body.heartRateSource.trim(),
    missionDay: missionDayOf(ended.iso) };
}

export function requestedDays(value, fallback) {
  const text = value ?? String(fallback);
  if (typeof text !== 'string' || !/^[1-9]\d?$/.test(text) || Number(text) > 60) {
    throw apiError('invalid_field', 'days must be a whole number from 1 to 60.');
  }
  return Number(text);
}
