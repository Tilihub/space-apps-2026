"use strict";

const datasets = window.missionEnvironment ?? [];
const ui = Object.fromEntries(
  ["dataset", "metric", "window", "chart", "chart-title", "context", "download", "latest", "min", "max",
    "count", "reading", "notes", "source", "status"].map(id => [id, document.getElementById(id)])
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

function setOptions(select, entries) {
  select.replaceChildren(...entries.map(([value, label]) => new Option(label, value)));
}

function formatTime(time, short = false) {
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
  currentDataset = datasets.find(dataset => dataset.id === ui.dataset.value);
  setOptions(ui.metric, currentDataset.metrics.map(({id, title}) => [id, title]));
  ui.context.textContent = currentDataset.context;
  ui.source.href = currentDataset.url;
  ui.source.textContent = currentDataset.source;
  selectMetric();
}

function selectMetric() {
  currentMetric = currentDataset.metrics.find(metric => metric.id === ui.metric.value);
  const {points: observations, bucket} = currentMetric;
  const span = observations.at(-1)[0] - observations[0][0];
  const options = currentDataset.timeMode === "utc"
    ? rangePresets.filter(([, seconds]) => seconds < span || seconds === Infinity)
    : [["Full series", Infinity]];
  setOptions(ui.window, options.map(([label, seconds]) => [seconds, label]));
  ui.window.value = options.some(([, seconds]) => seconds === 86400) ? "86400" : options.at(-1)[1];
  ui.window.disabled = options.length === 1;
  ui["chart-title"].textContent = currentMetric.title;
  ui.chart.setAttribute("aria-label", `${currentMetric.title} in ${currentMetric.unit}. ${currentDataset.context}.`);
  const aggregation = bucket ? ` Displayed points are ${bucket / 60}-minute means.` : "";
  ui.notes.textContent = currentDataset.notes + aggregation;
  selectWindow();
}

function selectWindow() {
  const all = currentMetric.points;
  const cutoff = all.at(-1)[0] - Number(ui.window.value);
  points = all.filter(([time]) => time >= cutoff);
  bounds = points.reduce((stats, [, value, count]) => {
    stats.min = Math.min(stats.min, value);
    stats.max = Math.max(stats.max, value);
    stats.count += count;
    return stats;
  }, {min: Infinity, max: -Infinity, count: 0});
  ui.latest.textContent = formatReading(points.at(-1)[1]);
  ui.min.textContent = formatReading(bounds.min);
  ui.max.textContent = formatReading(bounds.max);
  ui.count.textContent = bounds.count.toLocaleString("en");
  selection = -1;
  showReading();
}

function showReading() {
  const [time, value] = points[selection] ?? points.at(-1);
  ui.reading.textContent = `${formatReading(value)} · ${formatTime(time)}`;
  draw();
}

function draw() {
  const {clientWidth: width, clientHeight: height} = ui.chart;
  if (!width || !height || !points.length) return;
  const ratio = window.devicePixelRatio || 1;
  ui.chart.width = Math.round(width * ratio);
  ui.chart.height = Math.round(height * ratio);
  paint.setTransform(ratio, 0, 0, ratio, 0, 0);
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
  const start = points[0][0];
  const stop = points.at(-1)[0];
  const span = Math.max(stop - start, 1);
  const x = time => left + (time - start) / span * (right - left);
  const y = value => bottom - (value - lower) / (upper - lower) * (bottom - top);
  xToTime = pos => start + (pos - left) / (right - left) * span;

  paint.font = "11px Segoe UI, system-ui, sans-serif";
  paint.strokeStyle = "#2d3e48";
  paint.fillStyle = "#a8bac5";
  paint.textAlign = "left";
  paint.fillText(currentMetric.unit, 7, 18);
  const clockLabel = {utc: "UTC", lmst: "Mars local mean solar time", sol: "Mars sol"}[currentDataset.timeMode];
  paint.textAlign = "right";
  paint.fillText(clockLabel, right, 18);
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
  const tickCount = Math.min(width < 600 ? 3 : 5, points.length);
  const tickTimes = Array.from({length: tickCount}, (_, index) => {
    const time = start + index * (stop - start) / Math.max(tickCount - 1, 1);
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
  if (!xToTime) return;
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
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
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
    currentDataset.timeMode === "utc" ? new Date(time * 1000).toISOString() : formatTime(time),
    value, currentMetric.unit, count,
  ].join(","));
  const csv = ["\uFEFFtimestamp,value,unit,sample_count", ...rows].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], {type: "text/csv;charset=utf-8"}));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${currentDataset.id}-${currentMetric.id}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

if (datasets.length && paint) {
  setOptions(ui.dataset, datasets.map(({id, title}) => [id, title]));
  ui.dataset.addEventListener("change", selectDataset);
  ui.metric.addEventListener("change", selectMetric);
  ui.window.addEventListener("change", selectWindow);
  ui.chart.addEventListener("pointermove", inspectPointer);
  ui.chart.addEventListener("pointerdown", inspectPointer);
  ui.chart.addEventListener("keydown", inspectKeys);
  ui.download.addEventListener("click", exportCsv);
  new ResizeObserver(draw).observe(ui.chart);
  selectDataset();
} else {
  ui.status.textContent = "The offline chart data could not be loaded.";
  ui.download.disabled = true;
}
