// Connect Potest's original archive and two-reading rules to the common mission clock.
// Originals are read, never copied or edited. Mapping and API adapter belong to this connection.
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { apiError, checkFields } from '../../../shared/contract/contract.js';
const folder = new URL('../../../people/potest/environmental-graphs/', import.meta.url);
const scope = { window: {} };
runInNewContext(await readFile(new URL('data/series.js', folder), 'utf8'), scope);
runInNewContext((await readFile(new URL('alerts.js', folder), 'utf8'))
  + '\nthis.rules = { cabinLimits, buildAlertHistory, levels };', scope);
const { cabinLimits, buildAlertHistory, levels } = scope.rules;
const archive = scope.window.missionEnvironment;
const cabin = archive.find(d => d.id === 'RR-9-telemetry');
const radiation = archive.find(d => d.id === 'curiosity-cruise');
const OFFSET = Date.parse('2026-11-14T07:00:00Z') / 1000 - Date.parse('2018-09-17T16:48:00Z') / 1000;
const RAD_OFFSET = Date.parse('2026-11-14T00:00:00Z') / 1000 - radiation.metrics[0].points[0][0];
const iso = seconds => new Date(seconds * 1000).toISOString();
const toSeconds = time => Date.parse(time) / 1000;
const metrics = ['co2', 'temperature', 'humidity'].map((id, i) => {
  const original = cabin.metrics[i];
  // Exclude the archive's early flat fill period from the demo's alert history.
  const metric = { ...original, points: original.points.filter(p => p[0] >= Date.parse('2018-09-15T00:00:00Z') / 1000) };
  return { ...metric, id, offset: OFFSET, limit: cabinLimits[original.id],
    history: buildAlertHistory(metric, cabinLimits[original.id]), dataset: cabin };
});
metrics.push({ ...radiation.metrics[0], id: 'radiation', offset: RAD_OFFSET,
  dataset: radiation, limit: null, history: null });
function source(metric, at) {
  return { dataset: metric.dataset.id, label: metric.id === 'radiation'
    ? 'Curiosity cruise detector B, 8 Dec 2011, replayed' : 'ISS cabin, RR-9 mission (2018), replayed',
    kind: 'historical', sourceTime: iso(toSeconds(at) - metric.offset), url: metric.dataset.url };
}
function indexAt(metric, at) {
  const t = toSeconds(at) - metric.offset;
  let lo = 0, hi = metric.points.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (metric.points[mid][0] <= t) lo = mid + 1; else hi = mid; }
  return lo - 1;
}
function reading(metric, at) {
  const idx = indexAt(metric, at), point = metric.points[idx];
  const available = point && toSeconds(at) - metric.offset - point[0] <= metric.gap;
  const state = metric.history?.states[idx];
  return { metric: metric.id, value: available ? point[1] : null, unit: metric.unit,
    state: !available ? 'no-reading' : state ? levels[state.level].toLowerCase() : 'normal',
    measuredAt: point ? iso(point[0] + metric.offset) : null,
    source: source(metric, at), recoveryUnverified: Boolean(state?.level && (!available || state.recoveryUnverified)) };
}
function alertsAt(at) {
  const result = [];
  for (const metric of metrics.filter(m => m.history)) {
    let open = null;
    for (const e of metric.history.events) {
      if (e.time + metric.offset > toSeconds(at)) break;
      if (e.kind === 'alert-opened') {
        open = { id: `env_${metric.id}_${e.time}`, metric: metric.id, level: levels[e.level].toLowerCase(),
          openedAt: iso(e.time + metric.offset), recoveredAt: null, peak: e.value, peakLevel: levels[e.level].toLowerCase(), source: source(metric, at) };
        result.push(open);
      } else if (e.kind === 'recovered' && open) {
        open.recoveredAt = iso(e.time + metric.offset); open = null;
      } else if (e.kind === 'alert-updated' && open) {
        open.level = levels[e.level].toLowerCase();
        if (e.level > levels.findIndex(l => l.toLowerCase() === open.peakLevel)) open.peakLevel = open.level;
      }
      if (open && Number.isFinite(e.value)) open.peak = Math.max(open.peak, e.value);
    }
    // Include the actual observed peak, not only transition readings.
    for (const a of result.filter(a => a.metric === metric.id)) {
      const values = metric.points.filter(p => p[0] + metric.offset >= toSeconds(a.openedAt)
        && p[0] + metric.offset <= toSeconds(a.recoveredAt ?? at)).map(p => p[1]);
      if (values.length) a.peak = Math.max(...values);
    }
  }
  return result;
}
export function environmentAt(at) {
  return { at, source: source(metrics[0], at), readings: metrics.map(m => reading(m, at)),
    openAlerts: alertsAt(at).filter(a => !a.recoveredAt) };
}
const roles = ['crew', 'medical_officer', 'earth'];
function hoursOf(query) {
  const h = Number(query.hours ?? 24);
  if (!Number.isInteger(h) || h < 1 || h > 168) throw apiError('invalid_field', 'hours must be 1–168.');
  return h;
}
export default {
  name: 'env', owner: 'tommy (clock/API connection), potest (data and rules)',
  async reset(ctx) { await ctx.store.save({ last: ctx.now() }); },
  async tick(ctx) {
    const state = await ctx.store.load() ?? { last: ctx.now() };
    for (const m of metrics.filter(m => m.history)) for (const e of m.history.events) {
      const at = iso(e.time + m.offset);
      if (at > state.last && at <= ctx.now() && ['alert-opened', 'recovered'].includes(e.kind)) {
        ctx.emit(e.kind === 'recovered' ? 'env.alert-recovered' : 'env.alert-opened');
      }
    }
    await ctx.store.save({ last: ctx.now() });
  },
  routes: [{ method: 'GET', path: '/now', roles, async handler(req, ctx) {
    checkFields(req.query, []); return environmentAt(ctx.now());
  } }, { method: 'GET', path: '/snapshot', roles, async handler(req, ctx) {
    const { at } = checkFields(req.query, ['at'], ['at']);
    if (typeof at !== 'string' || !at.endsWith('Z') || !Number.isFinite(Date.parse(at)) || Date.parse(at) > Date.parse(ctx.now())) {
      throw apiError('invalid_field', 'Choose a UTC mission time up to now.');
    }
    return environmentAt(new Date(at).toISOString());
  } }, { method: 'GET', path: '/history', roles, async handler(req, ctx) {
    checkFields(req.query, ['metric', 'hours']); const hours = hoursOf(req.query);
    const m = metrics.find(m => m.id === (req.query.metric ?? 'co2'));
    if (!m) throw apiError('invalid_field', 'Unknown environment metric.');
    const end = toSeconds(ctx.now()), start = end - hours * 3600;
    const points = [];
    let previous = null;
    for (const p of m.points) {
      const at = p[0] + m.offset;
      if (at < start || at > end) continue;
      if (previous !== null && at - previous > m.gap) points.push([iso(previous + m.gap + 1), null]);
      points.push([iso(at), p[1]]); previous = at;
    }
    if (previous !== null && end - previous > m.gap) points.push([ctx.now(), null]);
    return { metric: m.id, unit: m.unit, limits: m.limit, points, source: source(m, ctx.now()) };
  } }, { method: 'GET', path: '/alerts', roles, async handler(req, ctx) {
    checkFields(req.query, ['hours']); const from = toSeconds(ctx.now()) - hoursOf(req.query) * 3600;
    return { alerts: alertsAt(ctx.now()).filter(a => toSeconds(a.recoveredAt ?? ctx.now()) >= from) };
  } }],
};
