const sensors = [
  { id: 'radiation', name: 'Radiation', zone: 'Forward hull', unit: 'µGy/h', digits: 1, side: 'left', y: 24, point: [422, 151], wire: 'M 155 163 H 354 L 380 151 H 422' },
  { id: 'co2', name: 'CO₂', zone: 'Crew cockpit', unit: 'ppm', digits: 0, side: 'right', y: 35, point: [697, 250], wire: 'M 845 238 H 762 L 750 250 H 697' },
  { id: 'humidity', name: 'Humidity', zone: 'Water recycler', unit: '%', digits: 1, side: 'left', y: 68, point: [370, 435], wire: 'M 155 462 H 304 L 331 435 H 370' },
  { id: 'temperature', name: 'Temperature', zone: 'Aft engineering', unit: '°C', digits: 1, side: 'right', y: 78, point: [555, 520], wire: 'M 845 530 H 666 L 656 520 H 555' },
];

const states = { normal: 'Normal', warning: 'Warning', danger: 'Danger', 'no-reading': 'No reading' };
const sessionKey = 'pulse-habitat-preview-token';
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);
const utc = iso => iso ? iso.slice(11, 16) : '—';
const hasValue = value => Number.isFinite(value);
const number = (value, digits) => hasValue(value) ? value.toFixed(digits) : '—';
const readingValue = (reading, sensor) => `${number(reading?.value, sensor.digits)}<small>${escape(reading?.unit ?? sensor.unit)}</small>`;

const sensorGroup = document.querySelector('#sensors');
const trend = document.querySelector('#trend');
const trendPanel = document.querySelector('#trend-panel');
const connection = document.querySelector('#connection');
const clock = document.querySelector('#mission-clock');
const alertsContent = document.querySelector('#alerts');
const alertCount = document.querySelector('#alert-count');

let selected = 'co2';
let hovered = null;
let focused = null;
let replay = null;
let token = sessionStorage.getItem(sessionKey);

document.querySelector('#sensor-wires').innerHTML = sensors.map(sensor => {
  const [x, y] = sensor.point;
  return `<g class="sensor-wire" data-metric="${sensor.id}"><path d="${sensor.wire}"/><circle cx="${x}" cy="${y}" r="10"/><circle cx="${x}" cy="${y}" r="3"/></g>`;
}).join('');

sensorGroup.innerHTML = sensors.map(sensor => `<button type="button" class="sensor" data-metric="${sensor.id}" data-side="${sensor.side}" style="--y: ${sensor.y}%" aria-controls="trend-panel" aria-pressed="false">
  <span class="sensor-name">${sensor.name}</span>
  <b class="sensor-number">${readingValue(null, sensor)}</b>
  <span class="sensor-location">${sensor.zone}</span>
</button>`).join('');

function historyChart(sensor, history, endTime) {
  const points = history?.points ?? [];
  const present = points.filter(([, value]) => hasValue(value));
  if (!present.length) {
    const message = history ? 'No observations in this mission window.' : 'Waiting for replay data.';
    return `<p class="chart-empty">${message}</p>`;
  }

  const end = Date.parse(endTime);
  const start = end - 24 * 60 * 60 * 1000;
  const values = present.map(([, value]) => value);
  const bottom = Math.min(...values);
  const top = Math.max(...values);
  const padding = Math.max((top - bottom) * .12, 10 ** -sensor.digits);
  const min = bottom - padding;
  const max = top + padding;
  const x = time => (46 + 311 * Math.max(0, Math.min(1, (Date.parse(time) - start) / (end - start)))).toFixed(2);
  const y = value => (111 - 96 * (value - min) / (max - min)).toFixed(2);

  // Each null in the replay ends a segment. Isolated samples remain visible as dots.
  const segments = [];
  let segment = [];
  for (const point of points) {
    if (hasValue(point[1])) segment.push(point);
    else if (segment.length) {
      segments.push(segment);
      segment = [];
    }
  }
  if (segment.length) segments.push(segment);

  const last = present.at(-1);
  const circle = ([time, value], radius) => `<circle cx="${x(time)}" cy="${y(value)}" r="${radius}"/>`;
  const trace = segments.map(part => part.length === 1 ? circle(part[0], 2.75) :
    `<path d="${part.map(([time, value], i) => `${i ? 'L' : 'M'}${x(time)} ${y(value)}`).join(' ')}"/>`).join('');
  const grid = [min, (min + max) / 2, max].map(value =>
    `<line x1="46" x2="357" y1="${y(value)}" y2="${y(value)}"/><text x="39" y="${Number(y(value)) + 3}" text-anchor="end">${number(value, sensor.digits)}</text>`).join('');
  const startLabel = utc(new Date(start).toISOString());
  return `<svg class="trend-chart" viewBox="0 0 365 136" role="img" aria-label="${sensor.name} during the last 24 mission hours in ${escape(history.unit)}, ${present.length} archived observations, from ${number(bottom, sensor.digits)} to ${number(top, sensor.digits)}">
    ${grid}${trace}${circle(last, 3.75)}
    <text x="46" y="130">−24 h · ${startLabel}</text><text x="357" y="130" text-anchor="end">Now · ${utc(endTime)} UTC</text>
  </svg>`;
}

function renderTrend() {
  const active = hovered ?? focused ?? selected;
  const sensor = sensors.find(item => item.id === active);
  const reading = replay?.now.readings.find(item => item.metric === active);
  const history = replay?.histories[active];
  const state = reading?.state ?? '';
  const source = history?.source?.label ?? reading?.source?.label;

  for (const element of document.querySelectorAll('.sensor, .sensor-wire')) {
    const metric = element.dataset.metric;
    element.classList.toggle('active', metric === active);
    if (element.matches('button')) element.setAttribute('aria-pressed', String(metric === selected));
  }

  trend.dataset.metric = active;
  trend.innerHTML = `<div class="trend-top">
    <div><p class="trend-name">${sensor.name}</p><p class="trend-zone">${sensor.zone}</p></div>
    <span class="reading-state" data-state="${escape(state)}">${states[state] ?? 'Connecting'}</span>
  </div>
  <p class="trend-value">${readingValue(reading, sensor)}</p>
  ${historyChart(sensor, history, replay?.now.at)}
  ${source ? `<div class="trend-source"><p>${escape(source)}</p><p>${hasValue(reading?.value) ? `Measured at ${utc(reading.measuredAt)} UTC` : 'No current sample'}${reading?.recoveryUnverified ? ' · Recovery unverified' : ''}</p></div>` : ''}`;
}

for (const button of sensorGroup.querySelectorAll('button')) {
  const id = button.dataset.metric;
  button.addEventListener('pointerenter', event => {
    if (event.pointerType === 'touch') return;
    hovered = id;
    renderTrend();
  });
  button.addEventListener('pointerleave', () => {
    if (hovered !== id) return;
    hovered = null;
    renderTrend();
  });
  button.addEventListener('focus', () => {
    hovered = null;
    focused = id;
    renderTrend();
  });
  button.addEventListener('blur', () => {
    focused = null;
    renderTrend();
  });
  button.addEventListener('click', () => {
    hovered = null;
    selected = id;
    renderTrend();
    if (matchMedia('(max-width: 670px)').matches) trendPanel.scrollIntoView({ block: 'nearest' });
  });
}

async function api(path, session = token, body) {
  const response = await fetch(`/api${path}`, {
    method: body ? 'POST' : 'GET',
    cache: 'no-store',
    headers: {
      ...(session ? { Authorization: `Bearer ${session}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw Object.assign(new Error(payload.error?.message), { status: response.status });
  return payload.data;
}

async function loadReplay() {
  if (!token) {
    const session = await api('/session', null, { crewId: 'c1', platform: 'astronaut' });
    token = session.token;
    sessionStorage.setItem(sessionKey, token);
  }

  const [now, alerts, histories] = await Promise.all([
    api('/env/now'),
    api('/env/alerts?hours=24'),
    Promise.all(sensors.map(async ({ id }) => [id, await api(`/env/history?metric=${id}&hours=24`)])).then(Object.fromEntries),
  ]);
  return { now, alerts: alerts.alerts, histories };
}

function renderReadings() {
  const { now, alerts } = replay;
  clock.dateTime = now.at;
  clock.textContent = `${now.at.slice(11, 19)} UTC`;
  for (const button of sensorGroup.querySelectorAll('button')) {
    const sensor = sensors.find(({ id }) => id === button.dataset.metric);
    const reading = now.readings.find(({ metric }) => metric === sensor.id);
    button.querySelector('.sensor-number').innerHTML = readingValue(reading, sensor);
    button.setAttribute('aria-label', `${sensor.name}, ${sensor.zone}, ${hasValue(reading?.value) ? `${number(reading.value, sensor.digits)} ${reading.unit}` : 'no reading'}`);
  }

  alertCount.textContent = `${now.openAlerts.length} open`;
  alertCount.dataset.open = String(now.openAlerts.length > 0);
  const sortedAlerts = [...alerts].sort((a, b) => Number(Boolean(a.recoveredAt)) - Number(Boolean(b.recoveredAt)) || b.openedAt.localeCompare(a.openedAt));
  alertsContent.innerHTML = sortedAlerts.map(alert => {
    const sensor = sensors.find(({ id }) => id === alert.metric);
    const state = alert.recoveredAt ? 'Recovered' : states[alert.level];
    const event = alert.recoveredAt ? `Recovered at ${utc(alert.recoveredAt)} UTC` : `Opened at ${utc(alert.openedAt)} UTC`;
    return `<div class="alert" data-metric="${sensor?.id ?? ''}"><div><b>${sensor?.name ?? escape(alert.metric)}</b><small>${event}</small></div><span class="reading-state" data-state="${escape(alert.recoveredAt ? 'normal' : alert.level)}">${escape(state)}</span></div>`;
  }).join('') || 'No alert transitions in the last 24 mission hours.';
  renderTrend();
}

function setConnection(state, label) {
  connection.dataset.state = state;
  const text = connection.querySelector('span');
  if (text.textContent !== label) text.textContent = label;
}

async function refresh() {
  try {
    try {
      replay = await loadReplay();
    } catch (error) {
      if (error.status !== 401 || !token) throw error;
      token = null;
      sessionStorage.removeItem(sessionKey);
      replay = await loadReplay();
    }
    renderReadings();
    setConnection('connected', 'Historical replay');
  } catch {
    setConnection('offline', replay ? 'Replay disconnected · last known data' : 'Replay unavailable · reconnecting');
  } finally {
    setTimeout(refresh, 3000);
  }
}

renderTrend();
void refresh();
