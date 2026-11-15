// @ts-check
/**
 * meds module (dadis2): symptom reports and suggestions, allergies, lockers, dispensing,
 * requests and approvals, grants, dose log. Wave 1 of the onboard app contract,
 * shared/contract/README.md section 8. The rules are in rules.js.
 *
 * Dispensary style (the team's model, Tommy's decisions in people/tommy/contract-review.md): a
 * collection is one batch of everything due now; the cabinet dispenses each item (simulated) and the
 * crew member confirms it once with POST /collections/:id/scan. Stock and the dose log change only
 * on that confirmation.
 */
import { readFile } from 'node:fs/promises';
import {
  MEASUREMENTS, MEDICAL_OFFICER_ID, SCALES, SYMPTOMS, apiError, checkFields, isCrewId, resolveCrewId,
} from '../../../shared/contract/contract.js';
import {
  EARTH, addGrant, allergiesTo, approvalFor, canGrant, checkCourse, compartmentOf, decodeGrant, encodeGrant, grantConflicts,
  grantEnd, grantHold, importStartAt, isoOf, itemOf, itemState, labelOf, ms, pickLot, profileOf, suggest, usableLots, usableUnits,
} from './rules.js';

/** The static catalogue: medicines, lockers, limits, and the demo start data. */
const CAT = JSON.parse(await readFile(new URL('./catalogue.json', import.meta.url), 'utf8'));

const DAY = 86_400_000;
const newId = (prefix) => `${prefix}_${crypto.randomUUID()}`;

/** The demo start state, the same every time. */
export function startState() {
  return {
    seq: 40,
    lots: CAT.items.flatMap((it) => it.lots.map(([lot, qty, expiry]) => ({ itemId: it.id, lot, qty, expiry }))),
    profiles: structuredClone(CAT.profiles),
    reports: structuredClone(CAT.history.reports),
    doses: structuredClone(CAT.history.doses),
    requests: [],
    grants: [],
    collections: [],
    emergencies: [],
  };
}

const load = async (ctx) => {
  const state = (await ctx.store.load()) ?? startState();
  state.emergencies ??= []; // stores saved before wave 2
  return state;
};
const PAPERWORK_HOURS = 2;
const mustItem = (itemId) => {
  if (typeof itemId !== 'string') throw apiError('invalid_field', 'itemId must be a medicine id.');
  const item = itemOf(CAT, itemId);
  if (!item) throw apiError('not_found', `There is no medicine "${itemId}".`);
  return item;
};
const wholeIn = (n, lo, hi) => Number.isInteger(n) && n >= lo && n <= hi;
const daysQuery = (q) => {
  if (q === undefined || q === '') return 7;
  const n = Number(q);
  if (!wholeIn(n, 1, 60)) throw apiError('invalid_field', 'days must be a whole number from 1 to 60.');
  return n;
};
/** The medical officer may leave crewId out to see everyone; crew always get their own. */
const crewFilter = (user, crewId) => (user.role === 'medical_officer' && !crewId ? null : resolveCrewId(user, crewId));
const timeOf = (iso) => (iso ? iso.slice(11, 16) : '');

// ---- shapes sent to the pages -----------------------------------------------------------------

function grantView(state, g, now) {
  const items = g.items.map((x, idx) => {
    const st = itemState(state, g, idx, now);
    const item = itemOf(CAT, x.itemId);
    return { itemId: x.itemId, name: labelOf(item), units: x.units, perDay: x.perDay, days: x.days, status: st.state, nextDue: st.nextDue };
  });
  const upcoming = items.map((x) => x.nextDue).filter((t) => t && ms(t) > ms(now)).sort();
  const finished = items.every((x) => ['finished', 'replaced', 'cancelled'].includes(x.status));
  return {
    id: g.id, crewId: g.crewId, issuer: g.issuer, verification: g.verification, code: g.code, items,
    start: g.startAt, end: grantEnd(g), dueNow: items.some((x) => x.status === 'due'),
    nextDue: upcoming[0] ?? null, status: g.status === 'cancelled' ? 'cancelled' : finished ? 'finished' : 'active',
  };
}

function profileView(state, crewId) {
  const p = profileOf(state, crewId);
  return { crewId, conditions: [...p.conditions], allergies: p.allergies.map((a) => ({ ...a })) };
}

function lockersView(state, crewId, now) {
  const open = state.collections.find((c) => c.crewId === crewId && c.status === 'open');
  return CAT.lockers.map((lk) => ({
    id: lk.id,
    name: lk.name,
    shelves: lk.shelves.map((sh) => ({
      id: sh.id,
      level: sh.level,
      zone: sh.zone,
      bins: CAT.items.filter((it) => it.place[0] === sh.id).sort((a, b) => a.place[1] - b.place[1]).map((it) => {
        const a = approvalFor(CAT, state, crewId, it, it.doseUnits, now);
        const compartmentId = compartmentOf(it);
        return {
          compartmentId, bin: it.place[1], itemId: it.id, label: labelOf(it), tier: it.tier,
          units: usableUnits(state, it.id, now),
          locked: a.approval !== 'none',
          why: a.approval === 'none' ? null : a.why,
          open: !!open && open.compartments.some((c) => c.compartmentId === compartmentId && !c.scanned),
        };
      }),
    })),
  }));
}

// ---- collections (dispensing) -------------------------------------------------------------------

function closeOpenCollection(state, crewId, now, ctx) {
  for (const c of state.collections) {
    if (c.crewId === crewId && c.status === 'open') {
      c.status = 'cancelled';
      c.closedAt = now;
      ctx.emit('meds.collection-closed', crewId);
    }
  }
}

function selfCareCollection(state, crewId, body, now) {
  const item = mustItem(body.itemId);
  const units = body.units ?? item.doseUnits;
  if (!wholeIn(units, 1, 9)) throw apiError('invalid_field', 'units must be a whole number from 1 to 9.');
  if (body.reportId != null && !state.reports.some((r) => r.id === body.reportId && r.crewId === crewId)) {
    throw apiError('not_found', 'That symptom report does not exist.');
  }
  const a = approvalFor(CAT, state, crewId, item, units, now);
  if (a.approval === 'emergency') throw apiError('needs_approval', `${item.name} opens only through the Emergency button.`);
  if (a.approval === 'earth' || a.approval === 'medical_officer') {
    throw apiError('needs_approval', `${a.why}. Ask for it first.`);
  }
  if (a.approval === 'blocked') {
    const code = a.safety.checks.some((c) => c.name === 'daily-limit' || c.name === 'same-class') ? 'not_due' : 'needs_approval';
    throw apiError(code, `${a.why}.`);
  }
  return {
    source: 'self-care', grantId: null, slot: null, reportId: body.reportId ?? null,
    compartments: [{ compartmentId: compartmentOf(item), itemId: item.id, units, scanned: false, grantIdx: null, slot: null }],
  };
}

function grantCollection(state, crewId, grantId, now) {
  const g = state.grants.find((x) => x.id === grantId);
  if (!g) throw apiError('not_found', 'That grant does not exist.');
  if (g.crewId !== crewId) throw apiError('not_your_data', 'This grant is for another crew member.');
  if (g.status === 'cancelled') throw apiError('not_due', 'This grant was cancelled.');
  const compartments = [];
  const held = [];
  const states = g.items.map((x, idx) => ({ x, idx, st: itemState(state, g, idx, now) }));
  for (const { x, idx, st } of states) {
    if (st.state !== 'due') continue;
    const item = itemOf(CAT, x.itemId);
    const h = grantHold(CAT, state, crewId, item, x.units, now);
    if (h.checks.length || !h.lot) { held.push(`${item.name}: ${h.checks[0]?.msg ?? 'none left'}`); continue; }
    compartments.push({ compartmentId: compartmentOf(item), itemId: item.id, units: x.units, scanned: false, grantIdx: idx, slot: st.slot });
  }
  if (!compartments.length) {
    const next = states.map((s) => s.st.nextDue).filter((t) => t && ms(t) > ms(now)).sort()[0];
    const at = next ? ` Next dose at ${timeOf(next)}.` : '';
    if (held.length) throw apiError('needs_approval', `${held.join('; ')}. Tell the medical officer.`);
    if (states.some((s) => s.st.state === 'done')) throw apiError('already_done', `This dose was already collected.${at}`);
    if (states.some((s) => s.st.state === 'too-soon')) throw apiError('not_due', `Too soon after the last dose.${at}`);
    if (states.every((s) => ['finished', 'replaced'].includes(s.st.state))) throw apiError('not_due', 'This course is finished.');
    throw apiError('not_due', `Nothing is due right now.${at}`);
  }
  return { source: 'grant', grantId: g.id, slot: compartments[0].slot, reportId: null, compartments };
}

/**
 * Emergency release (wave 2, Tommy's Q15): anyone, for whoever needs help, no approval. Only emergency
 * items. An allergy blocks unless overrideAllergy is true (the "give anyway" step), which is logged.
 * The reserve never holds it back.
 */
function emergencyCollection(state, body, now) {
  const e = state.emergencies.find((x) => x.id === body.emergencyId);
  if (!e) throw apiError('not_found', 'That emergency does not exist.');
  if (e.status !== 'open') throw apiError('already_done', 'This emergency is closed.');
  const item = mustItem(body.itemId);
  if (item.tier !== 'emergency') {
    throw apiError('needs_approval', `Only emergency medicines are released in an emergency. ${item.name} needs the usual approval.`);
  }
  const units = body.units ?? item.doseUnits;
  if (!wholeIn(units, 1, 9)) throw apiError('invalid_field', 'units must be a whole number from 1 to 9.');
  if (body.overrideAllergy != null && typeof body.overrideAllergy !== 'boolean') throw apiError('invalid_field', 'overrideAllergy must be true or false.');
  const allergic = allergiesTo(state, e.patientId, item);
  if (allergic.length && body.overrideAllergy !== true) {
    throw apiError('needs_approval', `Allergy: ${allergic.join(', ')}. Give it anyway only if there is no other option (overrideAllergy).`);
  }
  if (!pickLot(state, item.id, units, now)) throw apiError('needs_approval', `No ${item.name} left. Use another emergency medicine.`);
  return {
    source: 'emergency', grantId: null, slot: null, reportId: null, emergencyId: e.id, patientId: e.patientId,
    allergyOverridden: allergic.length > 0,
    compartments: [{ compartmentId: compartmentOf(item), itemId: item.id, units, scanned: false, grantIdx: null, slot: null }],
  };
}

function collectionView(c) {
  return {
    id: c.id, crewId: c.crewId, source: c.source, grantId: c.grantId, slot: c.slot, status: c.status,
    emergencyId: c.emergencyId ?? null, patientId: c.patientId ?? c.crewId,
    openedAt: c.openedAt, closedAt: c.closedAt,
    compartments: c.compartments.map((x) => ({ compartmentId: x.compartmentId, itemId: x.itemId, units: x.units, scanned: x.scanned })),
  };
}

/** Confirms one dispensed item: takes it from stock (earliest expiry first) and logs the dose once. */
function confirmItem(state, c, part, now, ctx, scanSkipped) {
  const item = itemOf(CAT, part.itemId);
  const patientId = c.patientId ?? c.crewId;
  let lot;
  let emergency = null;
  if (c.source === 'emergency') {
    emergency = state.emergencies.find((x) => x.id === c.emergencyId);
    if (!emergency || emergency.status !== 'open') throw apiError('already_done', 'This emergency is closed.');
    lot = pickLot(state, item.id, part.units, now);
  } else if (c.source === 'grant') {
    const g = state.grants.find((x) => x.id === c.grantId);
    const st = itemState(state, g, part.grantIdx, now);
    if (st.state !== 'due' || st.slot !== part.slot) throw apiError('already_done', 'This dose was already collected.');
    const h = grantHold(CAT, state, c.crewId, item, part.units, now);
    if (h.checks.length) throw apiError('needs_approval', `${h.checks[0].msg}. Tell the medical officer.`);
    lot = h.lot;
  } else {
    const a = approvalFor(CAT, state, c.crewId, item, part.units, now);
    if (a.approval !== 'none') throw apiError('needs_approval', `${a.why}.`);
    lot = a.safety.lot;
  }
  if (!lot) throw apiError('needs_approval', `No ${item.name} left. Tell the medical officer.`);
  lot.qty -= part.units;
  part.scanned = true;
  part.scanSkipped = !!scanSkipped;
  const dose = {
    id: newId('dose'), crewId: patientId, itemId: item.id, name: labelOf(item), units: part.units, collectedAt: now,
    source: c.source, grantId: c.grantId, grantIdx: part.grantIdx, slot: part.slot, reportId: c.reportId, lot: lot.lot,
    collectionId: c.id, emergencyId: c.emergencyId ?? null, collectedBy: c.crewId, helped: null,
  };
  state.doses.push(dose);
  ctx.emit('meds.dose-collected', patientId);
  if (emergency) {
    emergency.released.push({ itemId: item.id, units: part.units, at: now, scanSkipped: !!scanSkipped, allergyOverridden: !!c.allergyOverridden, releasedBy: c.crewId });
    ctx.emit('meds.emergency-updated', emergency.patientId);
  }
  return dose;
}

/** Crew see only who has an open emergency; the medical officer sees everything. */
function emergencyView(e, role) {
  if (role !== 'medical_officer') return { id: e.id, patientId: e.patientId, raisedAt: e.raisedAt, status: e.status };
  return {
    id: e.id, patientId: e.patientId, raisedBy: e.raisedBy, raisedAt: e.raisedAt, reason: e.reason, vitals: e.vitals,
    status: e.status, paperworkDueAt: e.paperworkDueAt, paperworkNote: e.paperworkNote, closedAt: e.closedAt,
    released: e.released.map((r) => ({ ...r, name: labelOf(itemOf(CAT, r.itemId)) })),
  };
}

function stockView(state, now) {
  return CAT.items.map((it) => {
    const units = usableUnits(state, it.id, now);
    const lots = usableLots(state, it.id, now);
    return {
      itemId: it.id, name: labelOf(it), tier: it.tier, units, reserve: it.reserve, belowReserve: units < it.reserve,
      nextExpiry: lots[0]?.expiry ?? null,
      expiredUnits: state.lots.filter((l) => l.itemId === it.id && l.qty > 0 && !lots.includes(l)).reduce((s, l) => s + l.qty, 0),
    };
  });
}

const doseView = (d) => ({
  id: d.id, crewId: d.crewId, itemId: d.itemId, name: d.name ?? labelOf(itemOf(CAT, d.itemId)), units: d.units,
  collectedAt: d.collectedAt, source: d.source, grantId: d.grantId, slot: d.slot, helped: d.helped,
});

// ---- requests and grants ------------------------------------------------------------------------

const requestView = (r) => ({
  id: r.id, crewId: r.crewId, itemId: r.itemId, name: labelOf(itemOf(CAT, r.itemId)), reportId: r.reportId, note: r.note,
  status: r.status, createdAt: r.createdAt, decidedAt: r.decidedAt, decisionNote: r.decisionNote, grantId: r.grantId,
});

const REQUEST_STATUS = ['waiting_medical_officer', 'waiting_earth', 'approved', 'denied'];

function storeGrant(state, draft, now, ctx) {
  const cf = grantConflicts(CAT, state, draft, now);
  if (cf.error) return { error: cf.error };
  const g = addGrant(state, draft, cf.replaces, now);
  ctx.emit('meds.grant-added', g.crewId);
  return { grant: g };
}

// ---- validation helpers ------------------------------------------------------------------------

function checkSymptoms(list) {
  if (!Array.isArray(list) || list.length < 1 || list.length > 10) throw apiError('invalid_field', 'symptoms must list 1 to 10 symptoms.');
  const seen = new Set();
  return list.map((s) => {
    checkFields(s, ['code', 'severity'], ['code', 'severity']);
    if (!SYMPTOMS.some((x) => x.code === s.code)) throw apiError('invalid_field', `Unknown symptom code: ${s.code}.`);
    if (seen.has(s.code)) throw apiError('invalid_field', `${s.code} is listed twice.`);
    seen.add(s.code);
    const { min, max } = SCALES.symptomSeverity;
    if (!wholeIn(s.severity, min, max)) throw apiError('invalid_field', `severity must be a whole number from ${min} to ${max}.`);
    return { code: s.code, severity: s.severity };
  });
}

function checkVitals(vitals) {
  if (vitals === null || vitals === undefined) return null;
  checkFields(vitals, Object.keys(MEASUREMENTS));
  const out = {};
  for (const [field, value] of Object.entries(vitals)) {
    if (value === null) { out[field] = null; continue; }
    const m = MEASUREMENTS[field];
    if (typeof value !== 'number' || value < m.min || value > m.max) throw apiError('invalid_field', `${field} must be from ${m.min} to ${m.max} ${m.unit}.`);
    out[field] = value;
  }
  return out;
}

const checkNote = (note, max = 1000) => {
  if (note === null || note === undefined) return null;
  if (typeof note !== 'string' || note.length > max) throw apiError('invalid_field', `note must be text, up to ${max} characters.`);
  return note;
};

// ---- the module ---------------------------------------------------------------------------------

/** @type {import('../../../shared/contract/contract.js').Module} */
export default {
  name: 'meds',
  owner: 'dadis2',

  reset: async (ctx) => {
    await ctx.store.save(startState());
  },

  routes: [
    // ---- symptom reports ----
    {
      method: 'POST', path: '/symptom-reports', roles: ['crew'], status: 201,
      handler: async (req, ctx) => {
        const body = checkFields(req.body, ['symptoms', 'note', 'vitals'], ['symptoms']);
        const crewId = resolveCrewId(req.user);
        const state = await load(ctx);
        const now = ctx.now();
        const report = {
          id: newId('sym'), crewId, reportedAt: now, missionDay: ctx.missionDay(),
          symptoms: checkSymptoms(body.symptoms), note: checkNote(body.note), vitals: checkVitals(body.vitals),
        };
        const result = suggest(CAT, state, report, now);
        state.reports.push({ ...report, redFlag: result.redFlag });
        await ctx.store.save(state);
        ctx.emit('meds.symptom-reported', crewId);
        return { report: { ...report, redFlag: result.redFlag }, ...result };
      },
    },
    {
      method: 'GET', path: '/symptom-reports', roles: ['crew', 'medical_officer'],
      handler: async (req, ctx) => {
        const crewId = crewFilter(req.user, req.query.crewId);
        const since = ms(ctx.now()) - daysQuery(req.query.days) * DAY;
        const state = await load(ctx);
        const reports = state.reports.filter((r) => (!crewId || r.crewId === crewId) && ms(r.reportedAt) > since)
          .sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));
        return { reports };
      },
    },

    // ---- profile and allergies ----
    {
      method: 'GET', path: '/profile', roles: ['crew', 'medical_officer'],
      handler: async (req, ctx) => {
        const crewId = resolveCrewId(req.user, req.query.crewId);
        return { profile: profileView(await load(ctx), crewId) };
      },
    },
    {
      method: 'POST', path: '/allergies', roles: ['crew', 'medical_officer'],
      handler: async (req, ctx) => {
        const body = checkFields(req.body, ['crewId', 'substance', 'status', 'note'], ['crewId', 'substance', 'status']);
        const crewId = resolveCrewId(req.user, body.crewId);
        if (typeof body.substance !== 'string' || !body.substance.trim() || body.substance.length > 80) {
          throw apiError('invalid_field', 'substance must be a name, up to 80 characters.');
        }
        if (!['suspected', 'confirmed', 'removed'].includes(body.status)) throw apiError('invalid_field', 'status must be suspected, confirmed or removed.');
        if (req.user.role !== 'medical_officer' && body.status !== 'suspected') {
          throw apiError('wrong_role', 'Only the medical officer can confirm or remove an allergy.');
        }
        const state = await load(ctx);
        const profile = state.profiles[crewId];
        const substance = body.substance.trim();
        const existing = profile.allergies.find((a) => a.substance.toLowerCase() === substance.toLowerCase());
        if (body.status === 'removed') {
          if (!existing) throw apiError('not_found', `${substance} isn't on the allergy list.`);
          profile.allergies = profile.allergies.filter((a) => a !== existing);
        } else if (existing) {
          existing.status = body.status;
          existing.note = checkNote(body.note, 500) ?? existing.note;
        } else {
          profile.allergies.push({ substance, status: body.status, since: ctx.now(), note: checkNote(body.note, 500) });
        }
        await ctx.store.save(state);
        ctx.emit('meds.allergy-changed', crewId);
        return { profile: profileView(state, crewId) };
      },
    },

    // ---- lockers ----
    {
      method: 'GET', path: '/lockers', roles: ['crew', 'medical_officer'],
      handler: async (req, ctx) => {
        const crewId = /** @type {string} */ (req.user.crewId);
        return { lockers: lockersView(await load(ctx), crewId, ctx.now()) };
      },
    },

    // ---- collections: the cabinet dispenses, the crew member confirms each item ----
    {
      method: 'POST', path: '/collections', roles: ['crew'], status: 201,
      handler: async (req, ctx) => {
        const body = checkFields(req.body, ['itemId', 'units', 'reportId', 'grantId', 'emergencyId', 'overrideAllergy']);
        const crewId = resolveCrewId(req.user);
        const state = await load(ctx);
        const now = ctx.now();
        const emergency = body.emergencyId != null;
        if (body.grantId != null && (body.itemId != null || emergency)) throw apiError('invalid_field', 'Send grantId alone, itemId (self-care), or emergencyId with itemId.');
        if (body.grantId == null && body.itemId == null) throw apiError('invalid_field', 'Send itemId (self-care), grantId (a grant), or emergencyId with itemId.');
        if (!emergency && body.overrideAllergy != null) throw apiError('invalid_field', 'overrideAllergy is only for an emergency release.');
        const open = state.collections.find((c) => c.crewId === crewId && c.status === 'open');
        if (open && body.grantId != null && open.grantId === body.grantId) return { collection: collectionView(open) };
        const plan = emergency ? emergencyCollection(state, body, now)
          : body.grantId != null ? grantCollection(state, crewId, body.grantId, now) : selfCareCollection(state, crewId, body, now);
        closeOpenCollection(state, crewId, now, ctx);
        const collection = { id: newId('col'), crewId, status: 'open', openedAt: now, closedAt: null, ...plan };
        state.collections.push(collection);
        await ctx.store.save(state);
        ctx.emit('meds.collection-opened', crewId);
        return { collection: collectionView(collection) };
      },
    },
    {
      method: 'POST', path: '/collections/:id/scan', roles: ['crew'],
      handler: async (req, ctx) => {
        const body = checkFields(req.body, ['compartmentId', 'skipScan'], ['compartmentId']);
        if (body.skipScan != null && typeof body.skipScan !== 'boolean') throw apiError('invalid_field', 'skipScan must be true or false.');
        const state = await load(ctx);
        const now = ctx.now();
        const c = state.collections.find((x) => x.id === req.params.id);
        if (!c) throw apiError('not_found', 'That collection does not exist.');
        resolveCrewId(req.user, c.crewId);
        if (body.skipScan === true && c.source !== 'emergency') throw apiError('invalid_field', 'Skipping the scan is only for emergencies.');
        if (c.status !== 'open') throw apiError('already_done', `This collection is ${c.status}.`);
        const part = c.compartments.find((x) => x.compartmentId === body.compartmentId);
        if (!part) throw apiError('invalid_field', "That compartment isn't part of this collection.");
        if (part.scanned) throw apiError('already_done', 'This item was already confirmed.');
        confirmItem(state, c, part, now, ctx, body.skipScan === true);
        if (c.compartments.every((x) => x.scanned)) {
          c.status = 'complete';
          c.closedAt = now;
          ctx.emit('meds.collection-closed', c.crewId);
        }
        await ctx.store.save(state);
        return { collection: collectionView(c) };
      },
    },
    {
      method: 'DELETE', path: '/collections/:id', roles: ['crew'],
      handler: async (req, ctx) => {
        const state = await load(ctx);
        const c = state.collections.find((x) => x.id === req.params.id);
        if (!c) throw apiError('not_found', 'That collection does not exist.');
        resolveCrewId(req.user, c.crewId);
        if (c.status !== 'open') throw apiError('already_done', `This collection is already ${c.status}.`);
        c.status = 'cancelled';
        c.closedAt = ctx.now();
        await ctx.store.save(state);
        ctx.emit('meds.collection-closed', c.crewId);
        return { collection: collectionView(c) };
      },
    },

    // ---- requests and approvals ----
    {
      method: 'POST', path: '/requests', roles: ['crew'], status: 201,
      handler: async (req, ctx) => {
        const body = checkFields(req.body, ['itemId', 'reportId', 'note'], ['itemId']);
        const crewId = resolveCrewId(req.user);
        const item = mustItem(body.itemId);
        const state = await load(ctx);
        const now = ctx.now();
        if (body.reportId != null && !state.reports.some((r) => r.id === body.reportId && r.crewId === crewId)) {
          throw apiError('not_found', 'That symptom report does not exist.');
        }
        const a = approvalFor(CAT, state, crewId, item, item.doseUnits, now);
        if (a.approval === 'emergency') throw apiError('invalid_field', `${item.name} opens only through the Emergency button.`);
        if (a.approval === 'none') throw apiError('invalid_field', `${item.name} needs no approval: take it yourself.`);
        if (a.approval === 'blocked') throw apiError('needs_approval', `${a.why}. It can't be requested.`);
        if (state.requests.some((r) => r.crewId === crewId && r.itemId === item.id && r.status.startsWith('waiting'))) {
          throw apiError('already_done', `You already asked for ${item.name}. It's waiting for a decision.`);
        }
        const request = {
          id: newId('req'), crewId, itemId: item.id, reportId: body.reportId ?? null, note: checkNote(body.note),
          status: a.approval === 'earth' ? 'waiting_earth' : 'waiting_medical_officer', createdAt: now,
          decidedAt: null, decisionNote: null, grantId: null,
        };
        state.requests.push(request);
        await ctx.store.save(state);
        ctx.emit('meds.request-created', crewId);
        return { request: requestView(request) };
      },
    },
    {
      method: 'GET', path: '/requests', roles: ['crew', 'medical_officer', 'earth'],
      handler: async (req, ctx) => {
        const status = req.query.status || null;
        if (status && !REQUEST_STATUS.includes(status)) throw apiError('invalid_field', `status must be one of ${REQUEST_STATUS.join(', ')}.`);
        const state = await load(ctx);
        let list;
        if (req.user.role === 'earth') {
          if (status && status !== 'waiting_earth') throw apiError('wrong_role', 'Earth sees only requests waiting for Earth.');
          list = state.requests.filter((r) => r.status === 'waiting_earth');
        } else {
          const crewId = crewFilter(req.user, req.query.crewId);
          list = state.requests.filter((r) => (!crewId || r.crewId === crewId) && (!status || r.status === status));
        }
        return { requests: list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(requestView) };
      },
    },
    {
      method: 'POST', path: '/requests/:id/decision', roles: ['medical_officer', 'earth'],
      handler: async (req, ctx) => {
        const body = checkFields(req.body, ['decision', 'units', 'perDay', 'days', 'note'], ['decision']);
        if (!['approve', 'deny'].includes(body.decision)) throw apiError('invalid_field', 'decision must be approve or deny.');
        const state = await load(ctx);
        const now = ctx.now();
        const r = state.requests.find((x) => x.id === req.params.id);
        if (!r) throw apiError('not_found', 'That request does not exist.');
        if (!r.status.startsWith('waiting')) throw apiError('already_done', `This request was already ${r.status}.`);
        const earth = req.user.role === 'earth';
        if (!earth && r.status === 'waiting_earth') throw apiError('needs_earth', 'Earth decides on this request.');
        if (earth && r.status !== 'waiting_earth') throw apiError('wrong_role', 'Earth decides only requests waiting for Earth.');
        const note = checkNote(body.note);
        let grant = null;
        if (body.decision === 'approve') {
          const item = itemOf(CAT, r.itemId);
          const x = { itemId: r.itemId, units: body.units ?? item.doseUnits, perDay: body.perDay ?? 1, days: body.days ?? 1 };
          const bad = checkCourse(item, x);
          if (bad) throw apiError('invalid_field', bad);
          const issuer = earth ? EARTH : MEDICAL_OFFICER_ID;
          const no = canGrant(CAT, state, issuer, r.crewId, item);
          if (no) throw apiError(no.code === 'invalid_code' ? 'invalid_field' : no.code, no.why);
          const draft = {
            code: encodeGrant(CAT, { issuer, crewId: r.crewId, startDate: now.slice(0, 10), items: [x] }),
            issuer, crewId: r.crewId, startAt: now, items: [x], requestId: r.id,
            verification: earth ? 'simulated' : 'onboard-officer',
          };
          const added = storeGrant(state, draft, now, ctx);
          if (added.error) throw apiError('invalid_field', added.error);
          grant = added.grant;
          r.status = 'approved';
          r.grantId = grant.id;
        } else {
          r.status = 'denied';
        }
        r.decidedAt = now;
        r.decisionNote = note;
        await ctx.store.save(state);
        ctx.emit('meds.request-decided', r.crewId);
        return { request: requestView(r), grant: grant && grantView(state, grant, now) };
      },
    },

    // ---- grants ----
    {
      method: 'GET', path: '/grants', roles: ['crew', 'medical_officer'],
      handler: async (req, ctx) => {
        const crewId = crewFilter(req.user, req.query.crewId);
        const state = await load(ctx);
        const now = ctx.now();
        return { grants: state.grants.filter((g) => !crewId || g.crewId === crewId).map((g) => grantView(state, g, now)).reverse() };
      },
    },
    {
      method: 'POST', path: '/grants/import', roles: ['crew'], status: 201,
      handler: async (req, ctx) => {
        const body = checkFields(req.body, ['code'], ['code']);
        if (typeof body.code !== 'string' || body.code.length > 200) throw apiError('invalid_field', 'code must be the grant code text.');
        const crewId = resolveCrewId(req.user);
        const state = await load(ctx);
        const now = ctx.now();
        const d = decodeGrant(CAT, state, body.code);
        if (!d.draft) throw apiError(d.code, d.error);
        if (d.draft.crewId !== crewId) throw apiError('not_your_data', 'This grant is for another crew member.');
        // The same code, scanned or typed again, finds the same grant (Tommy: one reusable credential).
        const existing = state.grants.find((g) => g.code === d.draft.code);
        if (existing) return { grant: grantView(state, existing, now), alreadyImported: true };
        const startAt = importStartAt(d.draft.startDate, now);
        const draft = { ...d.draft, startAt, verification: 'simulated' };
        if (ms(grantEnd(draft)) <= ms(now)) throw apiError('invalid_code', 'This grant has expired.');
        const added = storeGrant(state, draft, now, ctx);
        if (added.error) throw apiError('invalid_code', added.error);
        // Earth's code answers this crew member's waiting requests for the same medicines
        for (const r of state.requests) {
          if (r.crewId !== crewId || !r.status.startsWith('waiting') || !added.grant.items.some((x) => x.itemId === r.itemId)) continue;
          Object.assign(r, { status: 'approved', decidedAt: now, decisionNote: 'Answered by a grant code from Earth', grantId: added.grant.id });
          ctx.emit('meds.request-decided', crewId);
        }
        await ctx.store.save(state);
        return { grant: grantView(state, added.grant, now), alreadyImported: false };
      },
    },

    // ---- emergencies (wave 2) ----
    {
      method: 'POST', path: '/emergencies', roles: ['crew'], status: 201,
      handler: async (req, ctx) => {
        const body = checkFields(req.body, ['patientId', 'reason', 'vitals'], ['patientId', 'reason']);
        resolveCrewId(req.user); // any crew member, for anyone
        if (!isCrewId(body.patientId)) throw apiError('invalid_field', `Unknown crew member: ${String(body.patientId)}.`);
        if (typeof body.reason !== 'string' || !body.reason.trim() || body.reason.length > 500) {
          throw apiError('invalid_field', 'reason must say what happened, up to 500 characters.');
        }
        const vitals = checkVitals(body.vitals);
        const state = await load(ctx);
        const now = ctx.now();
        // One open emergency per person: pressing again (or a crewmate pressing too) finds the same one
        const open = state.emergencies.find((e) => e.patientId === body.patientId && e.status === 'open');
        if (open) return { emergency: emergencyView(open, req.user.role), alreadyOpen: true };
        const e = {
          id: newId('emg'), patientId: body.patientId, raisedBy: req.user.crewId, raisedAt: now, reason: body.reason.trim(), vitals,
          status: 'open', paperworkDueAt: isoOf(ms(now) + PAPERWORK_HOURS * 3_600_000), paperworkNote: null, closedAt: null, released: [],
        };
        state.emergencies.push(e);
        await ctx.store.save(state);
        ctx.emit('meds.emergency-raised', e.patientId);
        return { emergency: emergencyView(e, req.user.role), alreadyOpen: false };
      },
    },
    {
      method: 'GET', path: '/emergencies', roles: ['crew', 'medical_officer'],
      handler: async (req, ctx) => {
        const status = req.query.status || null;
        if (status && !['open', 'closed'].includes(status)) throw apiError('invalid_field', 'status must be open or closed.');
        const state = await load(ctx);
        const list = state.emergencies.filter((e) => !status || e.status === status).sort((a, b) => b.raisedAt.localeCompare(a.raisedAt));
        return { emergencies: list.map((e) => emergencyView(e, req.user.role)) };
      },
    },
    {
      method: 'POST', path: '/emergencies/:id/paperwork', roles: ['medical_officer'],
      handler: async (req, ctx) => {
        const body = checkFields(req.body, ['note'], ['note']);
        if (typeof body.note !== 'string' || !body.note.trim() || body.note.length > 4000) {
          throw apiError('invalid_field', 'note must say what happened and what was given, up to 4,000 characters.');
        }
        const state = await load(ctx);
        const e = state.emergencies.find((x) => x.id === req.params.id);
        if (!e) throw apiError('not_found', 'That emergency does not exist.');
        if (e.status !== 'open') throw apiError('already_done', 'The paperwork for this emergency is already done.');
        const now = ctx.now();
        e.status = 'closed';
        e.paperworkNote = body.note.trim();
        e.closedAt = now;
        // Release still in progress for this emergency: nothing more comes out
        for (const c of state.collections) {
          if (c.emergencyId === e.id && c.status === 'open') { c.status = 'cancelled'; c.closedAt = now; ctx.emit('meds.collection-closed', c.crewId); }
        }
        await ctx.store.save(state);
        ctx.emit('meds.emergency-updated', e.patientId);
        return { emergency: emergencyView(e, req.user.role) };
      },
    },

    // ---- stock (wave 2) ----
    {
      method: 'GET', path: '/stock', roles: ['medical_officer'],
      handler: async (req, ctx) => ({ items: stockView(await load(ctx), ctx.now()) }),
    },

    // ---- dose log ----
    {
      method: 'GET', path: '/doses', roles: ['crew', 'medical_officer'],
      handler: async (req, ctx) => {
        const crewId = crewFilter(req.user, req.query.crewId);
        const since = ms(ctx.now()) - daysQuery(req.query.days) * DAY;
        const state = await load(ctx);
        const doses = state.doses.filter((d) => (!crewId || d.crewId === crewId) && ms(d.collectedAt) > since)
          .sort((a, b) => b.collectedAt.localeCompare(a.collectedAt));
        return { doses: doses.map(doseView) };
      },
    },
    {
      method: 'POST', path: '/doses/:id/follow-up', roles: ['crew'],
      handler: async (req, ctx) => {
        const body = checkFields(req.body, ['helped'], ['helped']);
        if (typeof body.helped !== 'boolean') throw apiError('invalid_field', 'helped must be true or false.');
        const state = await load(ctx);
        const dose = state.doses.find((d) => d.id === req.params.id);
        if (!dose) throw apiError('not_found', 'That dose does not exist.');
        resolveCrewId(req.user, dose.crewId);
        dose.helped = body.helped;
        await ctx.store.save(state);
        return { dose: doseView(dose) };
      },
    },
  ],
};

export { CAT as catalogue };
