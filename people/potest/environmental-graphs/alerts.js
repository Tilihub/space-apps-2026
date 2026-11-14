"use strict";

const cabinLimits = {
  co2_iss: {name: "Cabin CO₂", unit: "ppm", warningHigh: 3500, dangerHigh: 3900},
  temperature_iss: {name: "Cabin temperature", unit: "°C", warningLow: 19, warningHigh: 27, dangerLow: 16, dangerHigh: 30},
  humidity_iss: {name: "Cabin humidity", unit: "%", warningLow: 30, warningHigh: 70, dangerLow: 20, dangerHigh: 85},
};

const levels = ["Normal", "Warning", "Danger"];
const colors = ["#6edcc1", "#ffc573", "#ff9298"];

function thresholdState(value, limit) {
  if (value <= limit.dangerLow) return {level: 2, direction: "low"};
  if (value >= limit.dangerHigh) return {level: 2, direction: "high"};
  if (value <= limit.warningLow) return {level: 1, direction: "low"};
  if (value >= limit.warningHigh) return {level: 1, direction: "high"};
  return {level: 0, direction: ""};
}

function buildAlertHistory(metric, limit) {
  const normal = {level: 0, direction: ""};
  let current = normal;
  let candidate = normal;
  let streak = 0;
  let previousTime = -Infinity;
  const events = [];
  const states = metric.points.map(([time, value]) => {
    if (time - previousTime > metric.gap) {
      if (current.level) events.push({time: previousTime + metric.gap + 1, limit, kind: "gap", ...current});
      current = normal;
      candidate = normal;
      streak = 0;
    }
    previousTime = time;
    const next = thresholdState(value, limit);
    const sameCandidate = next.level === candidate.level && next.direction === candidate.direction;
    const continuedExcursion = next.direction === candidate.direction && next.level > candidate.level
      && candidate.level > current.level;
    streak = sameCandidate ? streak + 1 : 1;
    candidate = next;
    const changed = next.level !== current.level || next.direction !== current.direction;
    if (streak >= 2 && changed) {
      current = next;
      events.push({time, value, limit, kind: "state", ...current});
    } else if (continuedExcursion && current.level === 0) {
      current = {level: 1, direction: next.direction};
      events.push({time, value, limit, kind: "state", ...current});
    }
    return {...current, pending: changed && streak < 2 && next.level > current.level ? next : null};
  });
  return {states, events};
}

function makeAlertExercise() {
  const readings = [
    [2850, 23, 44], [2900, 23, 45], [3550, 27.5, 48], [3700, 28, 50],
    [3940, 30.2, 54], [4080, 31, 58], [3760, 29, 64], [3640, 28, 66],
    [3230, 24, 64], [3100, 23, 62], [3060, 18.7, 29], [3000, 18.5, 27],
    [2930, 16, 20], [2930, 15.8, 19], [2850, 22, 41], [2820, 23, 43],
  ];
  return {
    id: "alert-exercise", title: "Alert exercise · Synthetic",
    context: "Simulated cabin readings for an alert walkthrough",
    source: "Synthetic cabin alert exercise", url: "",
    notes: "Synthetic data. The alert exercise runs at one reading per second by default.",
    timeMode: "elapsed",
    metrics: Object.entries(cabinLimits).map(([id, limit], index) => ({
      id, title: limit.name, unit: limit.unit, decimals: index === 1 ? 1 : 0, gap: 60, bucket: 0,
      points: readings.map((row, step) => [step * 60, row[index], 1]),
    })),
  };
}
