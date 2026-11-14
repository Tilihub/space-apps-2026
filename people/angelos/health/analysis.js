import { BASELINE_DAYS, COMPARED_MEASURES, MEASUREMENTS } from '../../../shared/contract/contract.js';

export const LIMIT_FLOORS = Object.freeze({
  sleepHours: 1.5, restingHeartRateBpm: 10, mood: 2, stress: 2, fatigue: 2,
});
export const MIN_REFERENCE_DAYS = 5;

export function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function referenceFor(baseline, measure) {
  const values = baseline.filter(row => row.missionDay >= BASELINE_DAYS.from
    && row.missionDay <= BASELINE_DAYS.to && row[measure] != null).map(row => row[measure]);
  if (values.length < MIN_REFERENCE_DAYS) return { normal: null, limit: null, days: values.length };
  const normal = median(values);
  const mad = median(values.map(value => Math.abs(value - normal)));
  return { normal, limit: Math.max(3 * 1.4826 * mad, LIMIT_FLOORS[measure]), days: values.length };
}

export function todayFor(person, crewId, missionDay) {
  const checkIn = person.checkIns.find(row => row.missionDay === missionDay) ?? null;
  return { crewId, missionDay, checkedInToday: checkIn !== null, checkIn };
}

export function dailyFor(person, crewId, missionDay) {
  const today = person.checkIns.find(row => row.missionDay === missionDay);
  const byDay = new Map(person.checkIns.map(row => [row.missionDay, row]));
  const gaps = [];
  const measures = COMPARED_MEASURES.map(measure => {
    const { normal, limit } = referenceFor(person.baseline, measure);
    const value = today?.[measure] ?? null;
    if (value === null) gaps.push(`${measure}: not measured today`);
    if (normal === null) gaps.push(`${measure}: fewer than ${MIN_REFERENCE_DAYS} reference days`);
    const changed = value !== null && normal !== null && Math.abs(value - normal) >= limit;
    const direction = changed ? (value > normal ? 'higher' : 'lower') : null;
    let daysInARow = 0;
    if (changed) {
      for (let day = missionDay; ; day -= 1) {
        const previous = byDay.get(day)?.[measure];
        if (previous === null || previous === undefined || Math.abs(previous - normal) < limit
          || (previous - normal) * (value - normal) <= 0) break;
        daysInARow += 1;
      }
    }
    return { measure, today: value, normal, limit, changed, direction, daysInARow };
  });
  const changedCount = measures.filter(item => item.changed).length;
  const status = !today ? 'no_check_in_today' : changedCount ? 'changes_found'
    : gaps.length ? 'not_enough_data' : 'no_changes';
  const message = !today ? 'No check-in has been saved for this mission day.'
    : changedCount ? `${changedCount} measures differ from your personal reference. This is not a diagnosis.`
      : gaps.length ? 'Some measures cannot be compared because data is missing.'
        : 'No demo thresholds were crossed. This does not establish that you are healthy.';
  return { crewId, missionDay, checkedInToday: Boolean(today), status, measures, gaps, message,
    limitations: ['Demo comparison rules, not medical limits.', 'The personal baseline stays fixed.',
      'No detected change does not rule out a health concern.'] };
}

export function weeklyFor(person, crewId, missionDay) {
  const currentRows = person.checkIns.filter(row => row.missionDay >= missionDay - 6 && row.missionDay <= missionDay);
  const previousRows = person.checkIns.filter(row => row.missionDay >= missionDay - 13 && row.missionDay <= missionDay - 7);
  const summary = (rows, measure) => {
    const values = rows.map(row => row[measure]).filter(value => value != null);
    return { median: median(values), validDays: values.length, missingDays: 7 - values.length };
  };
  const rounded = value => Math.round(value * 1000) / 1000;
  const measures = COMPARED_MEASURES.map(measure => {
    const current = summary(currentRows, measure);
    const previous = summary(previousRows, measure);
    const baseline = referenceFor(person.baseline, measure);
    return { measure, unit: MEASUREMENTS[measure]?.unit ?? 'points', current, previous, baseline,
      changeFromPreviousWeek: current.validDays === 7 && previous.validDays === 7
        ? rounded(current.median - previous.median) : null,
      changeFromBaseline: current.median !== null && baseline.normal !== null
        ? rounded(current.median - baseline.normal) : null };
  });
  return { crewId, missionDay, statistic: 'median',
    currentPeriod: { from: missionDay - 6, to: missionDay, recordedDays: currentRows.length },
    previousPeriod: { from: missionDay - 13, to: missionDay - 7, recordedDays: previousRows.length },
    completeness: measures.every(item => item.current.validDays === 7 && item.previous.validDays === 7
      && item.baseline.normal !== null) ? 'complete' : 'partial', measures,
    limitations: ['Descriptive statistics, not a medical assessment.',
      'Partial periods describe available days only.',
      'Week-to-week changes require seven measured days in both periods.',
      'Baseline observations never fill missing recent days.'] };
}
