// First working implementation of contract section 11. Exact connection API is in README.md.
// Clinical reports are snapshots assembled by the authorized medical page; no journal access.
import { readFile } from 'node:fs/promises';
import { apiError, checkFields, isCrewId } from '../../../shared/contract/contract.js';
import { encodeGrant, checkCourse, EARTH, labelOf } from '../../../people/dadis2/meds/rules.js';
const CAT = JSON.parse(await readFile(new URL('../../../people/dadis2/meds/catalogue.json', import.meta.url), 'utf8'));
const roles = ['medical_officer', 'earth'];
const DELAY = 12 * 60_000;
const initial = () => ({ linkUp: true, reports: [] });
async function load(ctx) { return await ctx.store.load() ?? initial(); }
function deliver(state, now) {
  if (!state.linkUp) return;
  for (const report of state.reports) {
    if (report.status === 'queued') {
      report.status = 'sent'; report.sentAt = now;
      report.arrivesAt = new Date(Date.parse(now) + DELAY).toISOString();
    }
    if (report.status === 'sent' && report.arrivesAt <= now) report.status = 'received';
    for (const reply of report.replies) {
      if (reply.status === 'queued') {
        reply.status = 'sent'; reply.arrivesAt = new Date(Date.parse(now) + DELAY).toISOString();
      }
      if (reply.status === 'sent' && reply.arrivesAt <= now) reply.status = 'received';
    }
  }
}
function view(state, role) {
  return state.reports.filter(r => role !== 'earth' || r.status === 'received').map(r => ({ ...r,
    replies: r.replies.filter(reply => role === 'earth' || reply.status === 'received') }));
}
function text(value, max, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) {
    throw apiError('invalid_field', `Enter ${required ? '1–' : 'up to '}${max} characters.`);
  }
  return value.trim();
}
function rejectPrivateKeys(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (/journal|companion|psycholog/i.test(key)) throw apiError('invalid_field', 'Private mind data must never enter a clinical report.');
    rejectPrivateKeys(child);
  }
}
export default {
  name: 'reports', owner: 'tommy (connection implementation; proposed owner handoff pending)',
  async reset(ctx) { await ctx.store.save(initial()); },
  async tick(ctx) { const state = await load(ctx); deliver(state, ctx.now()); await ctx.store.save(state); },
  routes: [{ method: 'GET', path: '/catalogue', roles: ['earth'], async handler(req) {
    checkFields(req.query, []);
    return { items: CAT.items.filter(i => i.tier !== 'emergency').map(i => ({ itemId: i.id, label: labelOf(i) })) };
  } }, { method: 'GET', path: '/', roles, async handler(req, ctx) {
    checkFields(req.query, []); const state = await load(ctx); deliver(state, ctx.now()); await ctx.store.save(state);
    return { reports: view(state, req.user.role) };
  } }, { method: 'POST', path: '/', roles: ['medical_officer'], status: 201, async handler(req, ctx) {
    checkFields(req.query, []);
    const body = checkFields(req.body, ['crewId', 'note', 'health', 'meds', 'environment'], ['crewId', 'health', 'meds', 'environment']);
    if (!isCrewId(body.crewId)) throw apiError('invalid_field', 'Choose a crew member.');
    checkFields(body.health, ['daily', 'history', 'weekly', 'workouts'], ['daily', 'history']);
    checkFields(body.meds, ['reports', 'doses', 'profile'], ['reports', 'doses', 'profile']);
    for (const section of [body.health.daily, body.health.history, body.meds.profile, body.environment]) {
      if (!section || typeof section !== 'object' || Array.isArray(section)) {
        throw apiError('invalid_field', 'Report sections must be objects from the clinical APIs.');
      }
    }
    for (const rows of [body.meds.reports, body.meds.doses, body.health.history.checkIns,
      body.health.history.baseline, body.health.workouts ?? []]) {
      if (!Array.isArray(rows) || rows.some(row => !row || typeof row !== 'object' || Array.isArray(row))) {
        throw apiError('invalid_field', 'Report records must be arrays from the clinical APIs.');
      }
    }
    rejectPrivateKeys(body);
    for (const section of [body.health.daily, body.health.history, body.health.weekly, body.meds.profile]) {
      if (section?.crewId && section.crewId !== body.crewId) throw apiError('invalid_field', 'All report sections must belong to this patient.');
    }
    for (const row of [...body.meds.reports, ...body.meds.doses, ...body.health.history.checkIns,
      ...body.health.history.baseline, ...(body.health.workouts ?? [])]) {
      if (row.crewId !== body.crewId) throw apiError('invalid_field', 'Do not mix patients in a report.');
    }
    const state = await load(ctx);
    const report = { ...structuredClone(body), note: text(body.note ?? '', 5000),
      id: `report_${crypto.randomUUID()}`, createdAt: ctx.now(), createdBy: req.user.crewId,
      status: 'queued', sentAt: null, arrivesAt: null, replies: [] };
    state.reports.unshift(report); deliver(state, ctx.now()); await ctx.store.save(state);
    return { report };
  } }, { method: 'GET', path: '/link', roles, async handler(req, ctx) {
    checkFields(req.query, []); return { linkUp: (await load(ctx)).linkUp, delayMinutes: 12, simulated: true };
  } }, { method: 'POST', path: '/link', roles, async handler(req, ctx) {
    const { linkUp } = checkFields(req.body, ['linkUp'], ['linkUp']);
    if (typeof linkUp !== 'boolean') throw apiError('invalid_field', 'linkUp must be true or false.');
    const state = await load(ctx); state.linkUp = linkUp; deliver(state, ctx.now()); await ctx.store.save(state);
    return { linkUp, delayMinutes: 12, simulated: true };
  } }, { method: 'POST', path: '/:id/replies', roles: ['earth'], status: 201, async handler(req, ctx) {
    const { note = '', code = '' } = checkFields(req.body, ['note', 'code']);
    const state = await load(ctx); deliver(state, ctx.now());
    const report = state.reports.find(r => r.id === req.params.id && r.status === 'received');
    if (!report) throw apiError('not_found', 'The report has not reached Earth.');
    const reply = { id: `reply_${crypto.randomUUID()}`, note: text(note, 5000), code: text(code, 10000),
      createdAt: ctx.now(), status: 'queued', arrivesAt: null };
    if (!reply.note && !reply.code) throw apiError('invalid_field', 'Write a reply or a grant code.');
    report.replies.push(reply); deliver(state, ctx.now()); await ctx.store.save(state); return { reply };
  } }, { method: 'POST', path: '/grants-code', roles: ['earth'], async handler(req, ctx) {
    const { crewId, items } = checkFields(req.body, ['crewId', 'items'], ['crewId', 'items']);
    if (!isCrewId(crewId) || !Array.isArray(items) || !items.length || items.length > 8) throw apiError('invalid_field', 'Choose a patient and 1–8 medicines.');
    if (new Set(items.map(i => i.itemId)).size !== items.length) throw apiError('invalid_field', 'Choose each medicine only once.');
    for (const x of items) {
      checkFields(x, ['itemId', 'units', 'perDay', 'days'], ['itemId', 'units', 'perDay', 'days']);
      const item = CAT.items.find(i => i.id === x.itemId);
      if (!item || item.tier === 'emergency') throw apiError('invalid_field', 'Choose a non-emergency medicine.');
      const error = checkCourse(item, x); if (error) throw apiError('invalid_field', error);
    }
    return { code: encodeGrant(CAT, { issuer: EARTH, crewId, startDate: ctx.now().slice(0, 10), items }),
      verification: 'simulated', note: 'Demo credential. Import rechecks patient, allergy, stock and dose eligibility.' };
  } }],
};
