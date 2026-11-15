import { createFalconHeatmap, simulatedZones, temperatureColor, temperatureScale } from './thermal-map.js';

const sensors = [
  { id: 'radiation', name: 'Radiation', zone: 'Forward hull', unit: 'µGy/h', digits: 1, side: 'left', y: 24, point: [422, 151], wire: 'M 155 163 H 354 L 380 151 H 422' },
  { id: 'co2', name: 'CO₂', zone: 'Crew cockpit', unit: 'ppm', digits: 0, side: 'right', y: 35, point: [697, 250], wire: 'M 845 238 H 762 L 750 250 H 697' },
  { id: 'humidity', name: 'Humidity', zone: 'Water recycler', unit: '%', digits: 1, side: 'left', y: 68, point: [370, 435], wire: 'M 155 462 H 304 L 331 435 H 370' },
  { id: 'temperature', name: 'Temperature', zone: 'Main lounge', unit: '°C', digits: 1, side: 'right', y: 70, point: [500, 378], wire: 'M 845 476 H 690 L 592 378 H 500' },
];

const states = { normal: 'Normal', warning: 'Warning', danger: 'Danger', 'no-reading': 'No reading' };
const coldLimit = temperatureScale[0][0];
const hotLimit = temperatureScale.at(-1)[0];
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);
const utc = iso => iso ? iso.slice(11, 16) : '—';
const hasValue = value => Number.isFinite(value);
const number = (value, digits) => hasValue(value) ? value.toFixed(digits) : '—';
const readingValue = (reading, sensor) => `${number(reading?.value, sensor.digits)}<small>${escape(reading?.unit ?? sensor.unit)}</small>`;

const falconArt = new URL('./millennium-falcon.png', import.meta.url).href;
const workspace = `
  <div class="workspace">
    <section class="panel map-panel" aria-labelledby="map-heading">
      <div class="panel-heading">
        <h2 id="map-heading">Millennium Falcon</h2>
        <span class="technical">Dorsal view</span>
      </div>
      <div class="map-stage" id="map-stage">
        <svg class="falcon" viewBox="0 0 1536 1024" role="img" aria-label="Millennium Falcon thermal map, from cooler forward compartments to warmer aft engineering">
          <defs>
            <mask id="falcon-hull" maskUnits="userSpaceOnUse" x="0" y="0" width="1536" height="1024" style="mask-type: alpha">
              <image href="${falconArt}" width="1536" height="1024"/>
            </mask>
            <filter id="falcon-edge" x="-5%" y="-8%" width="110%" height="116%">
              <feComponentTransfer in="SourceAlpha" result="silhouette">
                <feFuncA type="discrete" tableValues="0 0 1 1"/>
              </feComponentTransfer>
              <feMorphology in="silhouette" operator="dilate" radius="3" result="expanded"/>
              <feMorphology in="silhouette" operator="erode" radius="1" result="inset"/>
              <feComposite in="expanded" in2="inset" operator="out" result="edge"/>
              <feFlood class="falcon-blue"/>
              <feComposite in2="edge" operator="in" result="blue-edge"/>
              <feGaussianBlur in="blue-edge" stdDeviation="6" result="glow"/>
              <feMerge><feMergeNode in="glow"/><feMergeNode in="blue-edge"/></feMerge>
            </filter>
          </defs>
          <image id="falcon-heatmap" class="falcon-heatmap" width="1536" height="1024" mask="url(#falcon-hull)"/>
          <image class="falcon-interior" href="${falconArt}" width="1536" height="1024"/>
          <image class="falcon-outline" href="${falconArt}" width="1536" height="1024" filter="url(#falcon-edge)"/>
        </svg>
        <svg class="sensor-wires" id="sensor-wires" viewBox="0 0 1000 680" preserveAspectRatio="none" aria-hidden="true"></svg>
        <div role="group" aria-label="Environmental readings" id="sensors"></div>
      </div>
      <div class="map-note">
        <div id="thermal-key"></div>
        <dl class="thermal-zones" id="thermal-zones" aria-label="Simulated temperatures by zone"></dl>
        <p>Hover, focus or tap a sensor to inspect its trend.</p>
      </div>
    </section>

    <div class="details">
      <section class="panel trend-panel" id="trend-panel" aria-labelledby="trend-heading">
        <div class="panel-heading">
          <h2 id="trend-heading">Sensor trend</h2>
          <span class="technical" id="trend-window">24 mission hours</span>
        </div>
        <div class="trend-content" id="trend"></div>
      </section>

      <section class="panel alerts-panel" aria-labelledby="alerts-heading">
        <div class="panel-heading">
          <h2 id="alerts-heading">Cabin alerts</h2>
          <span class="alert-count" id="alert-count">—</span>
        </div>
        <div id="alerts" class="alerts">Waiting for replay data.</div>
      </section>
    </div>
  </div>
`;

export async function loadHabitat(get) {
  const [now, alerts, histories] = await Promise.all([
    get('/env/now'),
    get('/env/alerts?hours=24'),
    Promise.all(sensors.map(async ({ id }) => [id, await get(`/env/history?metric=${id}&hours=24`)])).then(Object.fromEntries),
  ]);
  return { now, alerts: alerts.alerts, histories };
}

function historyChart(sensor, history, endTime) {
  const points = history?.points ?? [];
  const present = points.filter(([, value]) => hasValue(value));
  if (!present.length) {
    const message = history ? 'No observations in this mission window.' : 'Waiting for replay data.';
    return `<p class="chart-empty">${message}</p>`;
  }

  const availableWindow = sensor.id === 'radiation';
  const last = present.at(-1);
  const end = Date.parse(availableWindow ? last[0] : endTime);
  const start = availableWindow ? Date.parse(present[0][0]) : end - 24 * 60 * 60 * 1000;
  const duration = end - start;
  const values = present.map(([, value]) => value);
  const bottom = Math.min(...values);
  const top = Math.max(...values);
  const padding = Math.max((top - bottom) * .12, 10 ** -sensor.digits);
  const min = bottom - padding;
  const max = top + padding;
  const x = time => {
    if (!duration) return '201.50';
    const fraction = (Date.parse(time) - start) / duration;
    return (46 + 311 * Math.max(0, Math.min(1, fraction))).toFixed(2);
  };
  const y = value => (111 - 96 * (value - min) / (max - min)).toFixed(2);
  const thermal = sensor.id === 'temperature';
  const gradientValues = [min, ...temperatureScale.map(([degrees]) => degrees).filter(degrees => degrees > min && degrees < max), max];
  const chartGradient = thermal ? `<defs><linearGradient id="temperature-chart-gradient" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="111" y2="15" color-interpolation="sRGB">
    ${gradientValues.map(degrees => `<stop offset="${(degrees - min) / (max - min)}" stop-color="${temperatureColor(degrees)}"/>`).join('')}
  </linearGradient></defs>` : '';

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

  const circle = ([time, value], radius) => `<circle cx="${x(time)}" cy="${y(value)}" r="${radius}"${thermal ? ` style="fill: ${temperatureColor(value)}"` : ''}/>`;
  const trace = segments.map(part => part.length === 1 ? circle(part[0], 2.75) :
    `<path d="${part.map(([time, value], i) => `${i ? 'L' : 'M'}${x(time)} ${y(value)}`).join(' ')}"/>`).join('');
  const grid = [min, (min + max) / 2, max].map(value =>
    `<line x1="46" x2="357" y1="${y(value)}" y2="${y(value)}"/><text x="39" y="${Number(y(value)) + 3}" text-anchor="end">${number(value, sensor.digits)}</text>`).join('');
  const startLabel = utc(new Date(start).toISOString());
  const endLabel = utc(new Date(end).toISOString());
  const tickLabels = duration
    ? `<text x="46" y="130">${availableWindow ? 'First' : '−24 h'} · ${startLabel}</text><text x="357" y="130" text-anchor="end">${availableWindow ? 'Last' : 'Now'} · ${endLabel} UTC</text>`
    : `<text x="201.5" y="130" text-anchor="middle">${endLabel} UTC</text>`;
  const range = availableWindow ? `from ${startLabel} to ${endLabel} UTC` : 'during the last 24 mission hours';
  return `<svg class="trend-chart" viewBox="0 0 365 136"${thermal ? ' style="--trace: url(#temperature-chart-gradient)"' : ''} role="img" aria-label="${sensor.name} ${range} in ${escape(history.unit)}, ${present.length} archived observations, from ${number(bottom, sensor.digits)} to ${number(top, sensor.digits)}">
    ${chartGradient}${grid}${trace}${circle(last, 3.75)}${tickLabels}
  </svg>`;
}

export function createHabitatView(root) {
  root.innerHTML = workspace;

  const heatStops = temperatureScale.map(([degrees, color]) => `${color} ${(degrees - coldLimit) / (hotLimit - coldLimit) * 100}%`);
  root.querySelector('#thermal-key').innerHTML = `<figure class="heat-scale">
    <figcaption>Simulated zone temperatures</figcaption>
    <div class="heat-scale-bar" style="background: linear-gradient(90deg, ${heatStops.join(', ')})" aria-hidden="true"></div>
    <div class="heat-scale-labels"><span>≤ ${coldLimit} °C</span><span>${(coldLimit + hotLimit) / 2} °C</span><span>≥ ${hotLimit} °C</span></div>
  </figure>`;

  const sensorGroup = root.querySelector('#sensors');
  const trend = root.querySelector('#trend');
  const trendPanel = root.querySelector('#trend-panel');
  const mapStage = root.querySelector('#map-stage');
  const trendWindow = root.querySelector('#trend-window');
  const alertsContent = root.querySelector('#alerts');
  const alertCount = root.querySelector('#alert-count');
  const zoneReadings = root.querySelector('#thermal-zones');
  const paintHull = createFalconHeatmap(root.querySelector('#falcon-heatmap'));

  let selected = 'temperature';
  let hovered = null;
  let focused = null;
  let replay = null;

  root.querySelector('#sensor-wires').innerHTML = sensors.map(sensor => {
    const [x, y] = sensor.point;
    return `<g class="sensor-wire" data-metric="${sensor.id}"><path d="${sensor.wire}"/><circle cx="${x}" cy="${y}" r="10"/><circle cx="${x}" cy="${y}" r="3"/></g>`;
  }).join('');

  sensorGroup.innerHTML = sensors.map(sensor => `<button type="button" class="sensor" data-metric="${sensor.id}" data-side="${sensor.side}" style="--y: ${sensor.y}%" aria-controls="trend-panel" aria-pressed="false">
    <span class="sensor-name">${sensor.name}</span>
    <b class="sensor-number">${readingValue(null, sensor)}</b>
    <span class="sensor-location">${sensor.zone}</span>
  </button>`).join('');

  function renderTrend() {
    const active = hovered ?? focused ?? selected;
    const sensor = sensors.find(item => item.id === active);
    const reading = replay?.now.readings.find(item => item.metric === active);
    const history = replay?.histories[active];
    const state = reading?.state ?? '';
    const source = history?.source?.label ?? reading?.source?.label;
    const sampleTime = hasValue(reading?.value) ? `${active === 'temperature' ? 'Replay sample' : 'Measured'} at ${utc(reading.measuredAt)} UTC` : 'No current sample';

    for (const element of root.querySelectorAll('.sensor, .sensor-wire')) {
      const metric = element.dataset.metric;
      element.classList.toggle('active', metric === active);
      if (element.matches('button')) element.setAttribute('aria-pressed', String(metric === selected));
    }

    trend.dataset.metric = active;
    trendWindow.textContent = active === 'radiation' ? 'Recorded interval' : '24 mission hours';
    trend.innerHTML = `<div class="trend-top">
      <div><p class="trend-name">${sensor.name}</p><p class="trend-zone">${sensor.zone}</p></div>
      <span class="reading-state" data-state="${escape(state)}">${states[state] ?? 'Connecting'}</span>
    </div>
    <p class="trend-value">${readingValue(reading, sensor)}</p>
    ${historyChart(sensor, history, replay?.now.at)}
    ${source ? `<div class="trend-source">${active === 'temperature' ? '<p>Cabin replay used as the main lounge reference.</p>' : ''}<p>${escape(source)}</p><p>${sampleTime}${reading?.recoveryUnverified ? ' · Recovery unverified' : ''}</p></div>` : ''}`;
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
      if (trendPanel.getBoundingClientRect().top > mapStage.getBoundingClientRect().bottom) trendPanel.scrollIntoView({ block: 'nearest' });
    });
  }

  function renderReadings() {
    const { now, alerts } = replay;
    const temperature = now.readings.find(({ metric }) => metric === 'temperature')?.value;
    if (hasValue(temperature)) root.style.setProperty('--temperature', temperatureColor(temperature));
    else root.style.removeProperty('--temperature');
    paintHull(temperature);
    zoneReadings.innerHTML = simulatedZones(temperature).filter(zone => zone.offset !== 0).map(zone =>
      `<div${hasValue(zone.temperature) ? ` style="--zone-color: ${temperatureColor(zone.temperature)}"` : ''}><dt>${zone.name}</dt><dd>${number(zone.temperature, 1)} °C</dd></div>`).join('');
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

  renderTrend();
  return {
    update(next) {
      if (!next) return;
      replay = next;
      renderReadings();
    },
  };
}
