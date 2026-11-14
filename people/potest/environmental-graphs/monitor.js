"use strict";

const archive = window.missionEnvironment ?? [];
const datasets = [...archive.slice(0, 1), makeAlertExercise(), ...archive.slice(1)];
const ui = Object.fromEntries(
  ["dataset", "metric", "window", "chart", "chart-title", "context", "download", "latest", "min", "max",
    "count", "reading", "notes", "source", "status", "view", "playback", "speed", "play", "restart", "seek",
    "mode-label", "replay-clock", "progress", "cabin", "cabin-metrics", "thresholds", "standard",
    "event-panel", "events", "events-empty", "chart-help", "snapshot"].map(id => [id, document.getElementById(id)])
);
const paint = ui.chart.getContext("2d");
const compactTime = new Intl.DateTimeFormat("en", {
  month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "UTC",
});
const fullTime = new Intl.DateTimeFormat("en", {
  year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  hourCycle: "h23", timeZone: "UTC",
});
const rangePresets = [["2 hours", 7200], ["24 hours", 86400], ["7 days", 604800], ["Full series", Infinity]];
let currentDataset;
let currentMetric;
let points = [];
let selection = -1;
let xToTime;
let bounds;
let timeline = [];
let cursor = 0;
let loop = 1;
let timer;
let eventHistory = [];
let visibleEvents = [];
let alerts = new Map();

const isReplay = () => ui.view.value === "replay";
const isExercise = () => currentDataset.id === "alert-exercise";

const bridge = createEnvironmentBridge(() => ({
  dataset: currentDataset,
  replayStart: timeline[0],
  time: isReplay() ? timeline[cursor] : currentMetric.points.at(-1)[0],
  cycle: isReplay() ? loop : null,
  readingsAt,
}));

function upperBound(items, time, timestamp = row => row[0]) {
  let left = 0;
  let right = items.length;
  while (left < right) {
    const middle = Math.floor((left + right) / 2);
    if (timestamp(items[middle]) <= time) left = middle + 1;
    else right = middle;
  }
  return left;
}

function setOptions(select, entries) {
  select.replaceChildren(...entries.map(([value, label]) => new Option(label, value)));
}

function formatTime(time, short = false) {
  if (currentDataset.timeMode === "elapsed") return `T+${Math.floor(time / 60)} min`;
  if (currentDataset.timeMode === "lmst") {
    const clock = new Date(time * 1000).toISOString().slice(11, 16);
    return short ? clock : `Sol 49 · ${clock} LMST`;
  }
  if (currentDataset.timeMode === "sol") return `Sol ${Math.round(time)}`;
  return (short ? compactTime : fullTime).format(time * 1000) + (short ? "" : " UTC");
}

function formatNumber(value) {
  return new Intl.NumberFormat("en", { maximumFractionDigits: currentMetric.decimals }).format(value);
}

function formatReading(value) {
  return `${formatNumber(value)} ${currentMetric.unit}`;
}

function selectDataset() {
  pausePlayback();
  currentDataset = datasets.find(dataset => dataset.id === ui.dataset.value);
  setOptions(ui.metric, currentDataset.metrics.map(({id, title}) => [id, title]));
  ui.context.textContent = currentDataset.context;
  ui.source.textContent = currentDataset.source;
  if (currentDataset.url) ui.source.href = currentDataset.url;
  else ui.source.removeAttribute("href");

  timeline = [...new Set(currentDataset.metrics.flatMap(metric => metric.points.map(([time]) => time)))].sort((a, b) => a - b);
  const supportsCabin = /^(RR-\d+-telemetry|alert-exercise)$/.test(currentDataset.id);
  alerts = new Map(currentDataset.metrics
    .filter(metric => supportsCabin && cabinLimits[metric.id])
    .map(metric => [metric.id, {metric, limit: cabinLimits[metric.id], ...buildAlertHistory(metric, cabinLimits[metric.id])}]));
  eventHistory = [...alerts.values()].flatMap(alert => alert.events).sort((a, b) => a.time - b.time);
  const lastSample = timeline.at(-1);
  timeline = [...new Set([...timeline, ...eventHistory.filter(event => event.kind === "gap" && event.time < lastSample)
    .map(event => event.time)])].sort((a, b) => a - b);
  visibleEvents = [];
  ui.events.replaceChildren();
  ui["events-empty"].hidden = false;
  ui.cabin.hidden = !alerts.size;
  ui.standard.hidden = !alerts.size;
  ui.thresholds.replaceChildren(...[...alerts.values()].map(({limit}) => {
    const item = document.createElement("li");
    const low = level => limit[`${level}Low`] === undefined ? "" : `≤ ${limit[`${level}Low`].toLocaleString("en")} or `;
    item.textContent = `${limit.name} (${limit.unit}) · Warning ${low("warning")}≥ ${limit.warningHigh.toLocaleString("en")} · Danger ${low("danger")}≥ ${limit.dangerHigh.toLocaleString("en")}`;
    return item;
  }));
  ui.seek.max = timeline.length - 1;
  ui.speed.value = isExercise() || timeline.length < 60 ? "1" : "4";
  cursor = 0;
  loop = 1;
  selectMetric();
  bridge.beginCycle("dataset-changed");
  if (isReplay() && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) startPlayback();
}

function selectMetric() {
  currentMetric = currentDataset.metrics.find(metric => metric.id === ui.metric.value);
  const {points: observations, bucket} = currentMetric;
  const span = observations.at(-1)[0] - observations[0][0];
  const options = ["utc", "lmst", "elapsed"].includes(currentDataset.timeMode)
    ? rangePresets.filter(([, seconds]) => seconds < span || seconds === Infinity)
    : [["Full series", Infinity]];
  setOptions(ui.window, options.map(([label, seconds]) => [seconds, label]));
  ui.window.value = options.find(([, seconds]) => seconds === 86400)?.[1] ?? options.at(-1)[1];
  ui.window.disabled = options.length === 1;
  ui["chart-title"].textContent = currentMetric.title;
  ui.chart.setAttribute("aria-label", `${currentMetric.title} in ${currentMetric.unit}. ${currentDataset.context}.`);
  const aggregation = bucket ? ` Displayed points are ${bucket / 60}-minute means.` : "";
  ui.notes.textContent = currentDataset.notes + aggregation;
  render();
}

function readingsAt(time) {
  return [...alerts.values()].map(({metric, states, limit}) => {
    const index = upperBound(metric.points, time) - 1;
    const observation = metric.points[index];
    const available = Boolean(observation && time - observation[0] <= metric.gap);
    return {metric, limit, observation, available, state: states[index] ?? null};
  });
}

function renderCabin(time) {
  const cards = ui["cabin-metrics"];
  if (!alerts.size) return;
  const readings = readingsAt(time);
  if (cards.children.length !== readings.length) {
    cards.replaceChildren(...readings.map(() => {
      const button = document.createElement("button");
      button.type = "button";
      button.innerHTML = '<span></span><strong></strong><small></small>';
      return button;
    }));
  }
  readings.forEach(({metric, limit, observation, available, state}, index) => {
    const button = cards.children[index];
    button.onclick = () => {
      ui.metric.value = metric.id;
      selectMetric();
    };
    button.setAttribute("aria-pressed", String(metric === currentMetric));
    button.dataset.level = available ? state.level : "missing";
    button.children[0].textContent = limit.name;
    button.children[1].textContent = available
      ? `${observation[1].toLocaleString("en", {maximumFractionDigits: metric.decimals})} ${metric.unit}`
      : "—";
    if (!available) button.children[2].textContent = state?.level
      ? `No recent reading · ${levels[state.level]} recovery unverified` : "No recent reading";
    else if (state.recoveryUnverified) button.children[2].textContent = `${levels[state.level]} · recovery unverified`;
    else if (state.pending) button.children[2].textContent = `${levels[state.level]} · checking ${state.pending.direction} reading`;
    else button.children[2].textContent = levels[state.level] + (state.direction ? ` · ${state.direction}` : "");
  });
}

function renderEvents(time) {
  ui["event-panel"].hidden = !isReplay() || !alerts.size;
  if (ui["event-panel"].hidden) return;
  const end = upperBound(eventHistory, time, event => event.time);
  const recent = eventHistory.slice(Math.max(0, end - 6), end).reverse();
  if (recent.length === visibleEvents.length && recent.every((event, i) => event === visibleEvents[i])) return;
  visibleEvents = recent;
  ui["events-empty"].hidden = recent.length > 0;
  ui.events.replaceChildren(...recent.map(event => {
    const item = document.createElement("li");
    item.dataset.level = event.kind === "gap" ? "missing" : event.level;
    const title = document.createElement("strong");
    const label = {gap: "Data gap", restored: "Feed restored", recovered: "Recovered"}[event.kind] ?? levels[event.level];
    title.textContent = label + (event.kind.startsWith("alert-") && event.direction ? ` · ${event.direction}` : "");
    const details = document.createElement("span");
    const value = event.value !== undefined ? ` · ${event.value.toLocaleString("en")} ${event.limit.unit}` : "";
    details.textContent = `${event.limit.name}${value} · ${formatTime(event.time)}`;
    item.append(title, details);
    return item;
  }));
}

function render() {
  const all = currentMetric.points;
  const time = isReplay() ? timeline[cursor] : all.at(-1)[0];
  const windowSize = Number(ui.window.value);
  const cutoff = time - windowSize;
  const offset = upperBound(all, cutoff - 1);
  points = all.slice(offset, upperBound(all, time));
  bounds = points.reduce((stats, [, value, count]) => {
    stats.min = Math.min(stats.min, value);
    stats.max = Math.max(stats.max, value);
    stats.count += count;
    return stats;
  }, {min: Infinity, max: -Infinity, count: 0});
  const latest = points.at(-1);
  const fresh = latest && time - latest[0] <= currentMetric.gap;
  ui.latest.textContent = fresh ? formatReading(latest[1]) : "—";
  ui.min.textContent = latest ? formatReading(bounds.min) : "—";
  ui.max.textContent = latest ? formatReading(bounds.max) : "—";
  ui.count.textContent = bounds.count.toLocaleString("en");
  ui.download.disabled = !latest;
  ui.playback.hidden = !isReplay();
  ui["mode-label"].textContent = isExercise() ? "Synthetic exercise" : (isReplay() ? "Historical replay" : "Historical archive");
  ui.seek.value = cursor;
  ui.progress.textContent = `${(cursor + 1).toLocaleString("en")} / ${timeline.length.toLocaleString("en")} · Loop ${loop}`;
  ui["replay-clock"].textContent = formatTime(time);
  ui.reading.setAttribute("aria-live", timer === undefined ? "polite" : "off");
  ui["chart-help"].textContent = isReplay() && timer !== undefined
    ? "Pause to inspect individual readings."
    : "Hover, tap, or use the arrow keys to inspect readings.";
  renderCabin(time);
  renderEvents(time);
  selection = -1;
  showReading();
}

function showReading() {
  const observation = points[selection] ?? points.at(-1);
  ui.reading.textContent = observation
    ? `${formatReading(observation[1])} · ${formatTime(observation[0])}`
    : "No readings in this window.";
  draw();
}

function pausePlayback() {
  clearInterval(timer);
  timer = undefined;
  ui.play.textContent = "Play";
}

function advancePlayback(batch) {
  const start = timeline[cursor];
  if (cursor === timeline.length - 1) {
    cursor = 0;
    loop++;
    bridge.beginCycle("loop");
  } else {
    cursor = Math.min(timeline.length - 1, cursor + batch);
    bridge.publish(eventHistory.slice(upperBound(eventHistory, start, event => event.time),
      upperBound(eventHistory, timeline[cursor], event => event.time)));
  }
  render();
}

function startPlayback() {
  pausePlayback();
  ui.play.textContent = "Pause";
  const speed = Number(ui.speed.value);
  const batch = Math.max(1, speed / 16);
  timer = setInterval(() => advancePlayback(batch), 1000 * batch / speed);
  render();
}

function draw() {
  const {clientWidth: width, clientHeight: height} = ui.chart;
  if (!width || !height) return;
  const ratio = window.devicePixelRatio || 1;
  ui.chart.width = Math.round(width * ratio);
  ui.chart.height = Math.round(height * ratio);
  paint.setTransform(ratio, 0, 0, ratio, 0, 0);
  if (!points.length) {
    paint.fillStyle = "#a8bac5";
    paint.font = "14px Segoe UI, system-ui, sans-serif";
    paint.textAlign = "center";
    paint.fillText("No readings in this window", width / 2, height / 2);
    xToTime = undefined;
    return;
  }
  const {min, max} = bounds;
  const spread = max - min || Math.max(Math.abs(max) * 0.08, 0.1);
  const step = niceStep(spread / 4);
  const center = (min + max) / 2;
  const lower = Math.floor((min === max ? center - spread / 2 : min) / step) * step;
  const upper = Math.ceil((min === max ? center + spread / 2 : max) / step) * step;
  const left = width < 500 ? 53 : 69;
  const right = width - 17;
  const top = 36;
  const bottom = height - 37;
  const stop = isReplay() ? timeline[cursor] : points.at(-1)[0];
  const windowSize = Number(ui.window.value);
  const start = isReplay() && Number.isFinite(windowSize)
    ? Math.max(timeline[0], stop - windowSize) : points[0][0];
  const span = Math.max(stop - start, 1);
  const x = time => left + (time - start) / span * (right - left);
  const y = value => bottom - (value - lower) / (upper - lower) * (bottom - top);
  xToTime = pos => start + (pos - left) / (right - left) * span;

  paint.font = "11px Segoe UI, system-ui, sans-serif";
  paint.strokeStyle = "#2d3e48";
  paint.fillStyle = "#a8bac5";
  paint.textAlign = "left";
  paint.fillText(currentMetric.unit, 7, 18);
  const clockLabel = {utc: "UTC", lmst: "Mars local mean solar time", sol: "Mars sol", elapsed: "Scenario time"}[currentDataset.timeMode];
  paint.textAlign = "right";
  paint.fillText(clockLabel, right, 18);
  const limit = alerts.get(currentMetric.id)?.limit;
  if (limit) {
    for (const [from, to, color] of [
      [limit.warningHigh, limit.dangerHigh, "rgba(255, 197, 115, 0.11)"],
      [limit.dangerHigh, Infinity, "rgba(255, 146, 152, 0.17)"],
      [limit.dangerLow, limit.warningLow, "rgba(255, 197, 115, 0.11)"],
      [-Infinity, limit.dangerLow, "rgba(255, 146, 152, 0.17)"],
    ]) {
      const floor = Math.max(from, lower);
      const ceiling = Math.min(to, upper);
      if (!(floor < ceiling)) continue;
      paint.fillStyle = color;
      paint.fillRect(left, y(ceiling), right - left, y(floor) - y(ceiling));
    }
    paint.fillStyle = "#a8bac5";
  }
  const tickLabel = new Intl.NumberFormat("en", {maximumFractionDigits: Math.max(currentMetric.decimals, 3)});
  for (let tick = 0; tick <= Math.round((upper - lower) / step); tick++) {
    const value = lower + step * tick;
    const vertical = y(value);
    paint.beginPath();
    paint.moveTo(left, vertical);
    paint.lineTo(right, vertical);
    paint.stroke();
    paint.fillText(tickLabel.format(Number(value.toFixed(8))), left - 8, vertical + 4);
  }
  const tickCount = stop > start ? Math.min(width < 600 ? 3 : 5, span + 1) : 1;
  const tickTimes = Array.from({length: tickCount}, (_, index) => {
    const time = stop - (tickCount - 1 - index) * (stop - start) / Math.max(tickCount - 1, 1);
    return currentDataset.timeMode === "sol" ? Math.round(time) : time;
  });
  for (const time of new Set(tickTimes)) {
    const horizontal = x(time);
    paint.textAlign = time === start ? "left" : time === stop ? "right" : "center";
    paint.fillText(formatTime(time, true), horizontal, bottom + 22);
  }

  paint.beginPath();
  paint.strokeStyle = "#6edcc1";
  paint.lineWidth = 1.7;
  let lastTime = -Infinity;
  for (const [time, value] of points) {
    if (time - lastTime > currentMetric.gap) paint.moveTo(x(time), y(value));
    else paint.lineTo(x(time), y(value));
    lastTime = time;
  }
  paint.stroke();

  if (points.length < 100) {
    paint.fillStyle = "#6edcc1";
    for (const [time, value] of points) {
      paint.beginPath();
      paint.arc(x(time), y(value), 2, 0, Math.PI * 2);
      paint.fill();
    }
  }
  if (isReplay() && selection < 0 && stop - points.at(-1)[0] <= currentMetric.gap) {
    const [time, value] = points.at(-1);
    paint.fillStyle = colors[alerts.get(currentMetric.id)?.states[upperBound(currentMetric.points, time) - 1]?.level ?? 0];
    paint.beginPath();
    paint.arc(x(time), y(value), 4, 0, Math.PI * 2);
    paint.fill();
  }
  if (selection >= 0) {
    const [time, value] = points[selection];
    paint.strokeStyle = "#81949d";
    paint.lineWidth = 1;
    paint.setLineDash([3, 4]);
    paint.beginPath();
    paint.moveTo(x(time), top);
    paint.lineTo(x(time), bottom);
    paint.stroke();
    paint.setLineDash([]);
    paint.fillStyle = "#6edcc1";
    paint.beginPath();
    paint.arc(x(time), y(value), 4, 0, Math.PI * 2);
    paint.fill();
  }
}

function niceStep(target) {
  const order = 10 ** Math.floor(Math.log10(target));
  const normalized = target / order;
  return order * ([1, 2, 2.5, 5, 10].find(step => step >= normalized) ?? 10);
}

function inspectPointer(event) {
  if (!xToTime || timer !== undefined) return;
  const time = xToTime(event.clientX - ui.chart.getBoundingClientRect().left);
  let left = 0;
  let right = points.length - 1;
  while (left < right) {
    const middle = Math.floor((left + right) / 2);
    if (points[middle][0] < time) left = middle + 1;
    else right = middle;
  }
  const closest = left > 0 && time - points[left - 1][0] < points[left][0] - time ? left - 1 : left;
  if (selection !== closest) {
    selection = closest;
    showReading();
  }
}

function inspectKeys(event) {
  if (!points.length || timer !== undefined || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const end = points.length - 1;
  if (event.key === "Home") selection = 0;
  else if (event.key === "End") selection = end;
  else {
    const index = selection < 0 ? end : selection;
    selection = Math.min(end, Math.max(0, index + (event.key === "ArrowRight" ? 1 : -1)));
  }
  showReading();
}

function exportCsv() {
  const rows = points.map(([time, value, count]) => [
    exportTime(time), value, currentMetric.unit, count,
  ].join(","));
  const csv = ["\uFEFFtimestamp,value,unit,sample_count", ...rows].join("\r\n");
  downloadFile(csv, "text/csv;charset=utf-8", `${currentDataset.id}-${currentMetric.id}.csv`);
}

function exportTime(time) {
  return currentDataset.timeMode === "utc" ? new Date(time * 1000).toISOString() : formatTime(time);
}

function exportSnapshot() {
  const snapshot = bridge.getSnapshot();
  downloadFile(JSON.stringify(snapshot, null, 2), "application/json;charset=utf-8", `${currentDataset.id}-cabin-snapshot.json`);
}

function downloadFile(content, type, filename) {
  const url = URL.createObjectURL(new Blob([content], {type}));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

if (archive.length && paint) {
  setOptions(ui.dataset, datasets.map(({id, title}) => [id, title]));
  ui.dataset.addEventListener("change", selectDataset);
  ui.metric.addEventListener("change", selectMetric);
  ui.window.addEventListener("change", render);
  ui.view.addEventListener("change", () => {
    if (isReplay()) startPlayback();
    else {
      pausePlayback();
      render();
    }
  });
  ui.play.addEventListener("click", () => {
    if (timer === undefined) startPlayback();
    else {
      pausePlayback();
      render();
    }
  });
  ui.restart.addEventListener("click", () => {
    cursor = 0;
    loop++;
    bridge.beginCycle("restart");
    render();
  });
  ui.speed.addEventListener("change", () => {
    if (timer !== undefined) startPlayback();
  });
  ui.seek.addEventListener("input", () => {
    pausePlayback();
    cursor = Number(ui.seek.value);
    render();
  });
  ui.chart.addEventListener("pointermove", inspectPointer);
  ui.chart.addEventListener("pointerdown", inspectPointer);
  ui.chart.addEventListener("keydown", inspectKeys);
  ui.download.addEventListener("click", exportCsv);
  ui.snapshot.addEventListener("click", exportSnapshot);
  new ResizeObserver(draw).observe(ui.chart);
  selectDataset();
  window.environmentMonitor = Object.freeze({getSnapshot: bridge.getSnapshot, subscribe: bridge.subscribe});
} else {
  ui.status.textContent = "The offline chart data could not be loaded.";
  ui.download.disabled = true;
}
