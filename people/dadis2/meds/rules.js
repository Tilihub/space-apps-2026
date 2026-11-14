// @ts-check
/**
 * meds rules: pure functions, no I/O. Ported from dadis2's inventory prototype
 * (people/dadis2/inventory/logic.js) to the onboard app contract: crew c1–c5, mission time in UTC
 * from ctx.now(), the contract's tier and approval names.
 *
 * `cat` is the static catalogue (catalogue.json). `state` is the module's saved data:
 * { lots, profiles, reports, doses, requests, grants, collections, seq }.
 * Proof of concept: the medicines, limits and reserves are sample values, not medical advice.
 */
import { MEDICAL_OFFICER_ID, SYMPTOMS } from '../../../shared/contract/contract.js';

export const EARTH = 'EARTH';
const HOUR = 3_600_000;
const DAY = 86_400_000;

/** @param {string} iso */
export const ms = (iso) => Date.parse(iso);
/** @param {number} n */
export const isoOf = (n) => new Date(n).toISOString();
/** @param {string} iso @returns {string} "YYYY-MM-DD" (UTC) */
const ymdOf = (iso) => iso.slice(0, 10);

// ---- catalogue and profiles ------------------------------------------------------------------

export const itemOf = (cat, id) => cat.items.find((i) => i.id === id) ?? null;
export const itemByCode = (cat, code) => cat.items.find((i) => i.code === code) ?? null;
export const compartmentOf = (item) => `${item.place[0]}-${String(item.place[1]).padStart(2, '0')}`;
export const labelOf = (item) => (item.strength ? `${item.name} ${item.strength}` : item.name);
export const profileOf = (state, crewId) => state.profiles[crewId] ?? { conditions: [], allergies: [] };
const symptomLabel = (code) => SYMPTOMS.find((s) => s.code === code)?.label ?? code;
const officerFor = (crewId) => (crewId === MEDICAL_OFFICER_ID ? 'earth' : 'medical_officer');

/** The person's allergies (suspected or confirmed) that this item hits, by class or ingredient. */
export function allergiesTo(state, crewId, item) {
  const names = [...(item.classes ?? []), ...(item.ingredients ?? []).map((g) => g.name)].map((s) => s.toLowerCase());
  return profileOf(state, crewId).allergies
    .filter((a) => a.status !== 'removed' && names.includes(String(a.substance).toLowerCase()))
    .map((a) => a.substance);
}

// ---- stock -----------------------------------------------------------------------------------

/** Lots of an item that can still be used, earliest expiry first. */
export function usableLots(state, itemId, now) {
  const today = ymdOf(now);
  return state.lots
    .filter((l) => l.itemId === itemId && l.qty > 0 && (!l.expiry || l.expiry >= today))
    .sort((a, b) => String(a.expiry ?? '9999').localeCompare(String(b.expiry ?? '9999')));
}
export const usableUnits = (state, itemId, now) => usableLots(state, itemId, now).reduce((s, l) => s + l.qty, 0);
export const pickLot = (state, itemId, units, now) => usableLots(state, itemId, now).find((l) => l.qty >= units) ?? null;

// ---- safety checks -----------------------------------------------------------------------------

const recentDoses = (state, crewId, hours, now) =>
  state.doses.filter((d) => d.crewId === crewId && ms(d.collectedAt) > ms(now) - hours * HOUR && ms(d.collectedAt) <= ms(now));

/**
 * Every check for giving `units` of `item` to `crewId` now. Each is { name, block, msg }.
 * Names: allergy, condition, daily-limit, same-class, reserve, none-left.
 */
export function safetyChecks(cat, state, crewId, item, units, now) {
  /** @type {{ name: string, block: boolean, msg: string }[]} */
  const checks = [];
  const add = (name, block, msg) => checks.push({ name, block, msg });

  const allergic = allergiesTo(state, crewId, item);
  if (allergic.length) add('allergy', true, `Allergy: ${allergic.join(', ')}`);

  const conditions = (item.contraindications ?? []).filter((c) => profileOf(state, crewId).conditions.includes(c));
  if (conditions.length) add('condition', true, `Not safe with: ${conditions.join(', ')}`);

  const last24 = recentDoses(state, crewId, 24, now);
  if (item.maxPerDay) {
    const taken = last24.filter((d) => d.itemId === item.id).reduce((s, d) => s + d.units, 0);
    if (taken + units > item.maxPerDay) add('daily-limit', true, `Daily limit reached: ${taken} taken in 24 h, max ${item.maxPerDay}`);
  }
  for (const g of item.ingredients ?? []) {
    const limit = cat.ingredientLimits[g.name];
    if (!limit || !g.mg) continue;
    const taken = last24.reduce((s, d) => {
      const other = itemOf(cat, d.itemId);
      const ing = other?.ingredients.find((x) => x.name === g.name);
      return ing ? s + ing.mg * d.units : s;
    }, 0);
    if (taken + g.mg * units > limit) add('daily-limit', true, `Daily limit reached: ${g.name} would be ${taken + g.mg * units} mg in 24 h, max ${limit}`);
  }
  if (item.classes.includes('NSAID')) {
    const other = last24.map((d) => itemOf(cat, d.itemId)).find((it) => it && it.id !== item.id && it.classes.includes('NSAID'));
    if (other) add('same-class', true, `Another NSAID (${other.name}) in the last 24 hours`);
  }

  const lot = pickLot(state, item.id, units, now);
  if (!lot) add('none-left', true, 'None left');
  else if (item.reserve && usableUnits(state, item.id, now) - units < item.reserve) {
    add('reserve', true, 'Only the reserve is left');
  }
  return { checks, lot, blocked: checks.some((c) => c.block) };
}

/**
 * Who has to say yes before `crewId` takes `units` of `item` now.
 * approval: none | medical_officer | earth | emergency | blocked (nobody: allergy, limit, none left).
 * By tier (MED_TIERS), then the person's situation for self-care (dadis2, 14 Nov):
 * reserve or a condition → the medical officer decides; daily limit → wait; allergy → nobody.
 * When the medical officer is the patient, their approval goes to Earth.
 */
export function approvalFor(cat, state, crewId, item, units, now) {
  const sf = safetyChecks(cat, state, crewId, item, units, now);
  const has = (name) => sf.checks.find((c) => c.name === name);
  const result = (approval, why) => ({ approval, why, safety: sf });
  if (item.tier === 'emergency') return result('emergency', 'Emergency medicine: use the Emergency button');
  if (has('allergy')) return result('blocked', has('allergy').msg);
  if (item.tier === 'supply') return result(has('none-left') ? 'blocked' : 'none', has('none-left') ? 'None left' : 'Supply');
  if (item.tier === 'controlled') return result('earth', 'Controlled medicine: Earth decides');
  if (item.tier === 'prescription') {
    return result(officerFor(crewId), crewId === MEDICAL_OFFICER_ID ? 'Prescription: Earth decides when the medical officer is the patient' : 'Prescription: the medical officer decides');
  }
  if (has('none-left')) return result('blocked', 'None left: tell the medical officer');
  if (has('daily-limit')) return result('blocked', has('daily-limit').msg);
  if (has('same-class')) return result('blocked', has('same-class').msg);
  if (has('condition')) return result(officerFor(crewId), `${has('condition').msg}: the medical officer decides`);
  if (has('reserve')) return result(officerFor(crewId), 'Only the reserve is left: the medical officer decides');
  return result('none', 'Self-care');
}

// ---- symptom reports and suggestions -------------------------------------------------------------

/** Reasons a report needs the medical officer now (red-flag symptom, high severity, vitals out of range). */
export function redFlags(cat, report) {
  const reasons = [];
  for (const s of report.symptoms) {
    const sym = SYMPTOMS.find((x) => x.code === s.code);
    if (sym?.redFlag) reasons.push(sym.label);
    else if (s.severity >= cat.redFlag.severity) reasons.push(`${symptomLabel(s.code)} at ${s.severity}/10`);
  }
  for (const [field, lim] of Object.entries(cat.redFlag.vitals)) {
    const v = report.vitals?.[field];
    if (v === null || v === undefined) continue;
    if ((lim.max !== undefined && v >= lim.max) || (lim.min !== undefined && v < lim.min)) reasons.push(`${field} ${v}`);
  }
  return reasons;
}

/** { redFlag, advice, suggestions, blocked } for a report, in the contract's shapes. */
export function suggest(cat, state, report, now) {
  const reasons = redFlags(cat, report);
  if (reasons.length) {
    return { redFlag: true, advice: `Call the medical officer now (${reasons.join(', ')}).`, suggestions: [], blocked: [] };
  }
  const codes = report.symptoms.map((s) => s.code);
  const suggestions = [];
  const blocked = [];
  for (const item of cat.items) {
    if (item.kind !== 'medication' || item.tier === 'emergency') continue;
    const matched = item.indications.filter((c) => codes.includes(c));
    if (!matched.length) continue;
    const a = approvalFor(cat, state, report.crewId, item, item.doseUnits, now);
    if (a.approval === 'blocked') {
      blocked.push({ itemId: item.id, name: labelOf(item), why: a.why });
    } else {
      suggestions.push({ itemId: item.id, name: labelOf(item), units: item.doseUnits, approval: a.approval,
        why: `For your ${matched.map(symptomLabel).join(' and ').toLowerCase()}`, matched: matched.length });
    }
  }
  const order = { none: 0, medical_officer: 1, earth: 2 };
  suggestions.sort((a, b) => order[a.approval] - order[b.approval] || b.matched - a.matched);
  const clean = suggestions.map(({ matched, ...s }) => s);
  const advice = clean.some((s) => s.approval === 'none')
    ? 'You can take this yourself. If it gets worse, tell the medical officer.'
    : clean.length ? 'Ask for one of these.' : 'Nothing on board matches. Tell the medical officer.';
  return { redFlag: false, advice, suggestions: clean, blocked };
}

// ---- grant codes (same format as the prototype, so Earth's codes work) ---------------------------

function rxCheck(body) {
  let h = 7;
  for (let i = 0; i < body.length; i++) h = (h * 31 + body.charCodeAt(i)) % 1296;
  return h.toString(36).toUpperCase().padStart(2, '0');
}

/**
 * @param {{ issuer: string, crewId: string, startDate: string, items: { itemId: string, units: number, perDay: number, days: number }[] }} g
 */
export function encodeGrant(cat, g) {
  const ymd = g.startDate.slice(2, 4) + g.startDate.slice(5, 7) + g.startDate.slice(8, 10);
  const body = `RX2-${g.issuer.toUpperCase()}-${g.crewId.toUpperCase()}-${ymd}-` + g.items.map((x) => {
    const item = itemOf(cat, x.itemId);
    if (!item?.code) throw new Error(`No grant code for ${x.itemId}`);
    return `${item.code}${x.units}X${x.perDay}X${x.days}`;
  }).join('.');
  return `${body}-${rxCheck(body)}`;
}

/** Who may grant what: the medical officer (never to themselves) or Earth; controlled → Earth only. */
export function canGrant(cat, state, issuer, crewId, item) {
  if (!item || item.kind !== 'medication') return { code: 'invalid_field', why: 'Only medicines can be granted.' };
  if (item.tier === 'emergency') return { code: 'invalid_field', why: `${item.name} is an emergency medicine: use the Emergency button.` };
  const allergic = allergiesTo(state, crewId, item);
  if (allergic.length) return { code: 'needs_approval', why: `Allergy: ${allergic.join(', ')}. Nobody grants ${item.name} to this crew member.` };
  if (issuer === EARTH) return null;
  if (issuer !== MEDICAL_OFFICER_ID) return { code: 'invalid_code', why: 'Only the medical officer or Earth can issue a grant.' };
  if (crewId === MEDICAL_OFFICER_ID) return { code: 'needs_earth', why: 'The medical officer is the patient: Earth decides.' };
  if (item.tier === 'controlled') return { code: 'needs_earth', why: `${item.name} is controlled: Earth decides.` };
  return null;
}

/** Checks one prescribed item; returns an error message or null. */
export function checkCourse(item, x) {
  const whole = (n, lo, hi) => Number.isInteger(n) && n >= lo && n <= hi;
  if (!whole(x.units, 1, 9) || !whole(x.perDay, 1, 4) || !whole(x.days, 1, 30)) {
    return `${item.name}: units 1–9, times a day 1–4, days 1–30.`;
  }
  if (item.maxPerDay && x.units * x.perDay > item.maxPerDay) return `${item.name}: over the daily limit of ${item.maxPerDay}.`;
  return null;
}

/** Reads a code. Returns { draft: { code, issuer, crewId, startDate, items } } or { code, error }. */
export function decodeGrant(cat, state, raw) {
  const code = String(raw ?? '').toUpperCase().replace(/\s+/g, '');
  const m2 = /^(RX2-([A-Z0-9]+)-([A-Z0-9]+)-(\d{6})-([A-Z0-9.]+))-([A-Z0-9]{2})$/.exec(code);
  const m1 = /^(RX1-([A-Z0-9]+)-(\d{6})-([A-Z0-9.]+))-([A-Z0-9]{2})$/.exec(code);
  let body, issuer, crew, ymd, list, check;
  if (m2) [, body, issuer, crew, ymd, list, check] = m2;
  else if (m1) { [, body, crew, ymd, list, check] = m1; issuer = EARTH; }
  else return { code: 'invalid_code', error: "That isn't a grant code." };
  if (rxCheck(body) !== check) return { code: 'invalid_code', error: 'The code has a typo. Check it and try again.' };
  issuer = issuer === EARTH ? EARTH : issuer.toLowerCase();
  const crewId = crew.toLowerCase();
  if (!state.profiles[crewId]) return { code: 'invalid_code', error: 'Unknown crew member in the code.' };
  const startDate = `20${ymd.slice(0, 2)}-${ymd.slice(2, 4)}-${ymd.slice(4, 6)}`;
  if (Number.isNaN(ms(`${startDate}T00:00:00.000Z`)) || isoOf(ms(`${startDate}T00:00:00.000Z`)).slice(0, 10) !== startDate) {
    return { code: 'invalid_code', error: 'Bad date in the code.' };
  }
  const items = [];
  for (const part of list.split('.')) {
    const pm = /^([A-Z]{3})(\d)X(\d)X(\d{1,2})$/.exec(part);
    if (!pm) return { code: 'invalid_code', error: `Can't read ${part}.` };
    const item = itemByCode(cat, pm[1]);
    if (!item) return { code: 'invalid_code', error: `Unknown medicine ${pm[1]}.` };
    if (items.some((x) => x.itemId === item.id)) return { code: 'invalid_code', error: `${item.name} is listed twice.` };
    const x = { itemId: item.id, units: Number(pm[2]), perDay: Number(pm[3]), days: Number(pm[4]) };
    const bad = checkCourse(item, x);
    if (bad) return { code: 'invalid_code', error: bad };
    const no = canGrant(cat, state, issuer, crewId, item);
    if (no) return { code: no.code === 'needs_earth' ? 'invalid_code' : no.code, error: no.why };
    items.push(x);
  }
  return { draft: { code, issuer, crewId, startDate, items } };
}

/**
 * When an imported code's course starts. Dose times follow from it: every 24/perDay hours.
 * Imported on its start day before 08:00 → now (the first dose is due right away);
 * otherwise 08:00 on the start day (a future start waits; a running course keeps its times).
 */
export function importStartAt(startDate, now) {
  const morning = ms(`${startDate}T08:00:00.000Z`);
  const midnight = ms(`${startDate}T00:00:00.000Z`);
  return isoOf(ms(now) >= midnight && ms(now) < morning ? ms(now) : morning);
}

// ---- courses: dose times, one course per medicine -----------------------------------------------

const intervalOf = (x) => (24 / x.perDay) * HOUR;
const courseEnd = (startAt, x) => ms(startAt) + x.days * DAY;
export const grantEnd = (g) => isoOf(Math.max(...g.items.map((x) => courseEnd(g.startAt, x))));

/**
 * The state of one medicine in a grant at `now`:
 * cancelled | replaced | not-started | finished | done (this dose time collected) | too-soon | due,
 * with `slot` (the current dose time) and `nextDue` (the next time something can be collected).
 * A dose time is due once, from its time until the next one; missed ones are not added up.
 * Never a double dose (Tommy's review of #58):
 * - a dose of the same medicine collected at or after this dose time, from any grant (for example the
 *   course this one replaced), counts as this dose time;
 * - a dose is held until half an interval has passed since the last dose of the same medicine.
 * A replacement takes over at its own start, not when it was added.
 */
export function itemState(state, g, idx, now) {
  const x = g.items[idx];
  const t = ms(now);
  const start = ms(g.startAt);
  const every = intervalOf(x);
  if (g.status === 'cancelled') return { state: 'cancelled', slot: null, nextDue: null };
  if (x.replacedBy && t >= ms(x.replacedAt)) return { state: 'replaced', slot: null, nextDue: null };
  if (t < start) return { state: 'not-started', slot: null, nextDue: g.startAt };
  const k = Math.floor((t - start) / every);
  if (k >= x.perDay * x.days) return { state: 'finished', slot: null, nextDue: null };
  const slotAt = start + k * every;
  const slot = isoOf(slotAt);
  const nextAt = k + 1 < x.perDay * x.days && !(x.replacedAt && start + (k + 1) * every >= ms(x.replacedAt)) ? isoOf(start + (k + 1) * every) : null;
  const same = state.doses.filter((d) => d.crewId === g.crewId && d.itemId === x.itemId && ms(d.collectedAt) <= t);
  if (same.some((d) => ms(d.collectedAt) >= slotAt)) return { state: 'done', slot, nextDue: nextAt };
  const last = same.reduce((m, d) => Math.max(m, ms(d.collectedAt)), -Infinity);
  if (t - last < every / 2) return { state: 'too-soon', slot, nextDue: isoOf(last + every / 2) };
  return { state: 'due', slot, nextDue: nextAt };
}

const runningStates = ['not-started', 'done', 'too-soon', 'due'];

/** The person's courses still running, and not already being replaced. */
export function activeCourses(state, crewId, now) {
  const out = [];
  for (const g of state.grants) {
    if (g.crewId !== crewId || g.status !== 'active') continue;
    g.items.forEach((x, idx) => {
      if (x.replacedBy) return;
      if (!runningStates.includes(itemState(state, g, idx, now).state)) return;
      out.push({ grant: g, idx, x, from: ms(g.startAt), to: courseEnd(g.startAt, x) });
    });
  }
  return out;
}

/**
 * One course per medicine per crew member: a new grant for a medicine with a running course
 * replaces it (from the new start). Ingredients are added up across courses, and two NSAIDs at once
 * are refused. Returns { replaces: [{ grant, idx }], error }.
 */
export function grantConflicts(cat, state, draft, now) {
  const courses = activeCourses(state, draft.crewId, now);
  const replaces = [];
  const dFrom = ms(draft.startAt);
  for (const x of draft.items) {
    for (const c of courses) {
      if (c.x.itemId === x.itemId && dFrom < c.to && c.from < courseEnd(draft.startAt, x)) replaces.push({ grant: c.grant, idx: c.idx });
    }
  }
  const dTo = Math.max(...draft.items.map((x) => courseEnd(draft.startAt, x)));
  const others = courses.filter((c) => !replaces.some((r) => r.grant === c.grant && r.idx === c.idx) && dFrom < c.to && c.from < dTo);
  const all = [...draft.items, ...others.map((c) => c.x)];
  const totals = {};
  for (const x of all) {
    for (const g of itemOf(cat, x.itemId).ingredients) if (g.mg) totals[g.name] = (totals[g.name] ?? 0) + g.mg * x.units * x.perDay;
  }
  for (const [name, mg] of Object.entries(totals)) {
    const limit = cat.ingredientLimits[name];
    if (limit && mg > limit) return { replaces, error: `${name} would be ${mg} mg a day across courses, over the ${limit} mg limit.` };
  }
  const nsaids = [...new Set(all.map((x) => x.itemId))].map((id) => itemOf(cat, id)).filter((it) => it.classes.includes('NSAID'));
  if (nsaids.length > 1) return { replaces, error: `${nsaids[0].name} and ${nsaids[1].name} are both NSAIDs: not at the same time.` };
  return { replaces, error: null };
}

/** Adds a grant (draft: { code, issuer, crewId, startAt, items, verification, requestId }) and applies replacements. */
export function addGrant(state, draft, replaces, now) {
  state.seq += 1;
  const g = {
    id: `G${state.seq}`, code: draft.code, crewId: draft.crewId, issuer: draft.issuer, verification: draft.verification,
    items: draft.items.map((x) => ({ itemId: x.itemId, units: x.units, perDay: x.perDay, days: x.days, replacedBy: null, replacedAt: null })),
    startAt: draft.startAt, createdAt: now, requestId: draft.requestId ?? null, status: 'active',
  };
  for (const r of replaces) {
    r.grant.items[r.idx].replacedBy = g.id;
    r.grant.items[r.idx].replacedAt = isoOf(Math.max(ms(draft.startAt), ms(now)));
  }
  state.grants.push(g);
  return g;
}

/**
 * Checks that still hold a granted dose back when it's collected. Whoever granted it weighed the
 * reserve and the person's conditions; an allergy, the 24-hour limits and missing stock still count.
 */
export function grantHold(cat, state, crewId, item, units, now) {
  const sf = safetyChecks(cat, state, crewId, item, units, now);
  return { checks: sf.checks.filter((c) => c.block && c.name !== 'reserve' && c.name !== 'condition'), lot: sf.lot };
}
