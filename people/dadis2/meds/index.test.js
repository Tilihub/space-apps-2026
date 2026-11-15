// meds module tests: every request runs exactly as the server will (handleRequest).
// The first tests follow the contract's wave 1 walk-through (section 12, steps 3 to 6).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest } from '../../../shared/contract/contract.js';
import { crewUser, earthUser, makeTestContext, medicalOfficer } from '../../../shared/contract/testing.js';
import meds, { catalogue } from './index.js';
import { encodeGrant } from './rules.js';

const tomas = crewUser('c4');
const mara = crewUser('c1');
const leo = crewUser('c2');
const kai = crewUser('c5');

async function setup(now) {
  const ctx = makeTestContext(now ? { now } : {});
  await meds.reset(ctx);
  return ctx;
}
const call = (ctx, user, method, path, body = null, query = {}) => handleRequest(meds, ctx, { method, path, user, body, query });
function ok(res) {
  assert.equal(res.body.ok, true, JSON.stringify(res.body.error));
  return res.body.data;
}
function fails(res, code) {
  assert.equal(res.body.ok, false, `expected ${code}, got ok`);
  assert.equal(res.body.error.code, code, res.body.error.message);
  return res.body.error.message;
}
const bin = (data, compartmentId) => data.lockers.flatMap((l) => l.shelves.flatMap((s) => s.bins)).find((b) => b.compartmentId === compartmentId);
const code = (crewId, startDate, items, issuer = 'EARTH') => encodeGrant(catalogue, { issuer, crewId, startDate, items });

// ---- wave 1 walk-through -------------------------------------------------------------------------

test('Step 3: a headache offers acetaminophen and blocks ibuprofen and aspirin (NSAID allergy)', async () => {
  const ctx = await setup();
  const data = ok(await call(ctx, tomas, 'POST', '/symptom-reports', { symptoms: [{ code: 'headache', severity: 5 }], note: null, vitals: { temperatureC: 36.8, spo2Pct: 98 } }));
  assert.equal(data.redFlag, false);
  assert.equal(data.suggestions[0].itemId, 'acetaminophen-325');
  assert.equal(data.suggestions[0].approval, 'none');
  assert.deepEqual(data.blocked.map((b) => b.itemId).sort(), ['aspirin-325', 'ibuprofen-400']);
  assert.match(data.blocked[0].why, /Allergy: NSAID/);
  assert.deepEqual(ctx.events.at(-1), { type: 'meds.symptom-reported', crewId: 'c4' });
});

test('Step 3: the cabinet dispenses acetaminophen, Tomas confirms it, the dose is logged once, then "Did it help?"', async () => {
  const ctx = await setup();
  const report = ok(await call(ctx, tomas, 'POST', '/symptom-reports', { symptoms: [{ code: 'headache', severity: 5 }] })).report;
  const before = bin(ok(await call(ctx, tomas, 'GET', '/lockers')), 'L1-1-01');
  assert.equal(before.locked, false);

  const col = ok(await call(ctx, tomas, 'POST', '/collections', { itemId: 'acetaminophen-325', units: 2, reportId: report.id })).collection;
  assert.equal(col.source, 'self-care');
  assert.deepEqual(col.compartments, [{ compartmentId: 'L1-1-01', itemId: 'acetaminophen-325', units: 2, scanned: false }]);
  assert.equal(bin(ok(await call(ctx, tomas, 'GET', '/lockers')), 'L1-1-01').open, true);

  fails(await call(ctx, tomas, 'POST', `/collections/${col.id}/scan`, { compartmentId: 'L1-1-02' }), 'invalid_field');
  const done = ok(await call(ctx, tomas, 'POST', `/collections/${col.id}/scan`, { compartmentId: 'L1-1-01', skipScan: false })).collection;
  assert.equal(done.status, 'complete');
  fails(await call(ctx, tomas, 'POST', `/collections/${col.id}/scan`, { compartmentId: 'L1-1-01' }), 'already_done');

  const after = bin(ok(await call(ctx, tomas, 'GET', '/lockers')), 'L1-1-01');
  assert.equal(after.units, before.units - 2);
  const doses = ok(await call(ctx, tomas, 'GET', '/doses', null, { days: '1' })).doses;
  assert.equal(doses.filter((d) => d.collectedAt === ctx.now()).length, 1);
  assert.equal(doses[0].helped, null);
  const followed = ok(await call(ctx, tomas, 'POST', `/doses/${doses[0].id}/follow-up`, { helped: true })).dose;
  assert.equal(followed.helped, true);
});

test('Step 3: ibuprofen is locked for Tomas and refused if he tries', async () => {
  const ctx = await setup();
  const ibu = bin(ok(await call(ctx, tomas, 'GET', '/lockers')), 'L1-1-02');
  assert.equal(ibu.locked, true);
  assert.match(ibu.why, /Allergy/);
  fails(await call(ctx, tomas, 'POST', '/collections', { itemId: 'ibuprofen-400', units: 1 }), 'needs_approval');
  fails(await call(ctx, tomas, 'POST', '/requests', { itemId: 'ibuprofen-400' }), 'needs_approval');
  // Mara has no allergy: for her it's self-care
  assert.equal(bin(ok(await call(ctx, mara, 'GET', '/lockers')), 'L1-1-02').locked, false);
});

test('Steps 4 and 5: Leo approves a request; Tomas collects only the due dose, and again gives already_done', async () => {
  const ctx = await setup();
  fails(await call(ctx, tomas, 'POST', '/collections', { itemId: 'ondansetron-4', units: 1 }), 'needs_approval');
  const request = ok(await call(ctx, tomas, 'POST', '/requests', { itemId: 'ondansetron-4', note: 'Nausea since lunch' })).request;
  assert.equal(request.status, 'waiting_medical_officer');
  assert.deepEqual(ctx.events.at(-1), { type: 'meds.request-created', crewId: 'c4' });
  fails(await call(ctx, tomas, 'POST', '/requests', { itemId: 'ondansetron-4' }), 'already_done');

  const waiting = ok(await call(ctx, medicalOfficer(), 'GET', '/requests', null, { status: 'waiting_medical_officer' })).requests;
  assert.deepEqual(waiting.map((r) => r.id), [request.id]);
  fails(await call(ctx, tomas, 'POST', `/requests/${request.id}/decision`, { decision: 'approve' }), 'wrong_role');

  const decided = ok(await call(ctx, medicalOfficer(), 'POST', `/requests/${request.id}/decision`, { decision: 'approve', units: 1, perDay: 2, days: 3, note: null }));
  assert.equal(decided.request.status, 'approved');
  assert.equal(decided.grant.issuer, 'c2');
  assert.equal(decided.grant.verification, 'onboard-officer');
  fails(await call(ctx, medicalOfficer(), 'POST', `/requests/${request.id}/decision`, { decision: 'deny' }), 'already_done');

  const grants = ok(await call(ctx, tomas, 'GET', '/grants')).grants;
  assert.equal(grants[0].dueNow, true);
  const col = ok(await call(ctx, tomas, 'POST', '/collections', { grantId: grants[0].id })).collection;
  assert.deepEqual(col.compartments.map((c) => [c.compartmentId, c.units]), [['L2-1-07', 1]]);
  assert.equal(ok(await call(ctx, tomas, 'POST', `/collections/${col.id}/scan`, { compartmentId: 'L2-1-07' })).collection.status, 'complete');

  fails(await call(ctx, tomas, 'POST', '/collections', { grantId: grants[0].id }), 'already_done');
  ctx.advance(6 * 60);
  fails(await call(ctx, tomas, 'POST', '/collections', { grantId: grants[0].id }), 'already_done');
  ctx.advance(6 * 60); // 12 hours later: the next dose time
  const next = ok(await call(ctx, tomas, 'POST', '/collections', { grantId: grants[0].id })).collection;
  assert.equal(next.compartments.length, 1);
});

test('Step 6: reset puts back the same start, every time', async () => {
  const ctx = await setup();
  const start = structuredClone(ctx.saved());
  await call(ctx, tomas, 'POST', '/symptom-reports', { symptoms: [{ code: 'headache', severity: 5 }] });
  await call(ctx, tomas, 'POST', '/requests', { itemId: 'ondansetron-4' });
  await meds.reset(ctx);
  assert.deepEqual(ctx.saved(), start);
});

// ---- who decides -------------------------------------------------------------------------------

test('Controlled medicines go to Earth, and Earth approves them', async () => {
  const ctx = await setup();
  const zol = ok(await call(ctx, tomas, 'POST', '/requests', { itemId: 'zolpidem-5' })).request;
  assert.equal(zol.status, 'waiting_earth');
  fails(await call(ctx, medicalOfficer(), 'POST', `/requests/${zol.id}/decision`, { decision: 'approve', units: 1, perDay: 1, days: 3 }), 'needs_earth');

  const forEarth = ok(await call(ctx, earthUser(), 'GET', '/requests')).requests;
  assert.deepEqual(forEarth.map((r) => r.id), [zol.id]);
  const decided = ok(await call(ctx, earthUser(), 'POST', `/requests/${zol.id}/decision`, { decision: 'approve', units: 1, perDay: 1, days: 3, note: null }));
  assert.deepEqual([decided.grant.issuer, decided.grant.verification], ['EARTH', 'simulated']);
});

test('The medical officer\'s own prescription request goes to the medical officer, not Earth (two routes only)', async () => {
  const ctx = await setup();
  const own = ok(await call(ctx, leo, 'POST', '/requests', { itemId: 'ondansetron-4' })).request;
  assert.equal(own.status, 'waiting_medical_officer');
  const decided = ok(await call(ctx, medicalOfficer(), 'POST', `/requests/${own.id}/decision`, { decision: 'approve', units: 1, perDay: 2, days: 3 }));
  assert.deepEqual([decided.grant.crewId, decided.grant.issuer], ['c2', 'c2']);
});

// ---- the medical officer console: any medicine, no further approval ----------------------------

test('The medical officer takes any medicine for any crew member with no further approval, and it is logged', async () => {
  const ctx = await setup();
  const lockers = ok(await call(ctx, medicalOfficer(), 'GET', '/lockers'));
  assert.deepEqual([bin(lockers, 'L2-1-01').locked, bin(lockers, 'L3-1-01').locked, bin(lockers, 'L2-1-07').locked], [false, false, false]);
  for (const itemId of ['zolpidem-5', 'ondansetron-4', 'epinephrine-auto', 'gauze-4x4']) {
    const col = ok(await call(ctx, medicalOfficer(), 'POST', '/collections', { itemId, units: 1, patientId: 'c3' })).collection;
    assert.deepEqual([col.source, col.patientId, col.crewId], ['medical-officer', 'c3', 'c2']);
    const done = ok(await call(ctx, medicalOfficer(), 'POST', `/collections/${col.id}/scan`, { compartmentId: col.compartments[0].compartmentId })).collection;
    assert.equal(done.status, 'complete');
  }
  const doses = ok(await call(ctx, medicalOfficer(), 'GET', '/doses', null, { crewId: 'c3' })).doses;
  assert.deepEqual(doses.map((d) => d.source).filter((s) => s === 'medical-officer').length, 4);
  // Crew still can't: the officer route belongs to the medical officer role
  fails(await call(ctx, tomas, 'POST', '/collections', { itemId: 'zolpidem-5', units: 1 }), 'needs_approval');
});

test('The medical officer must confirm "give anyway" for a patient\'s allergy', async () => {
  const ctx = await setup();
  const msg = fails(await call(ctx, medicalOfficer(), 'POST', '/collections', { itemId: 'ibuprofen-400', units: 1, patientId: 'c4' }), 'needs_approval');
  assert.match(msg, /Allergy: NSAID/);
  const col = ok(await call(ctx, medicalOfficer(), 'POST', '/collections', { itemId: 'ibuprofen-400', units: 1, patientId: 'c4', overrideAllergy: true })).collection;
  assert.equal(col.patientId, 'c4');
  fails(await call(ctx, medicalOfficer(), 'POST', '/collections', { itemId: 'ibuprofen-400', units: 1 }), 'invalid_field');
});

test('Earth can deny, and a denied request stays decided', async () => {
  const ctx = await setup();
  const r = ok(await call(ctx, tomas, 'POST', '/requests', { itemId: 'modafinil-100' })).request;
  const d = ok(await call(ctx, earthUser(), 'POST', `/requests/${r.id}/decision`, { decision: 'deny', note: 'Sleep first' }));
  assert.deepEqual([d.request.status, d.grant], ['denied', null]);
  assert.equal(ok(await call(ctx, tomas, 'GET', '/requests')).requests[0].status, 'denied');
});

// ---- grant codes: the same code works at every dose time ------------------------------------------

test('A code typed or scanned again finds the same grant; only a collected dose is refused', async () => {
  const ctx = await setup();
  const c = code('c4', '2026-11-14', [{ itemId: 'ondansetron-4', units: 1, perDay: 2, days: 3 }]);
  const first = ok(await call(ctx, tomas, 'POST', '/grants/import', { code: c }));
  assert.equal(first.alreadyImported, false);
  assert.equal(first.grant.dueNow, true);
  const again = ok(await call(ctx, tomas, 'POST', '/grants/import', { code: c.toLowerCase() }));
  assert.deepEqual([again.grant.id, again.alreadyImported], [first.grant.id, true]);

  const col = ok(await call(ctx, tomas, 'POST', '/collections', { grantId: first.grant.id })).collection;
  ok(await call(ctx, tomas, 'POST', `/collections/${col.id}/scan`, { compartmentId: col.compartments[0].compartmentId }));
  fails(await call(ctx, tomas, 'POST', '/collections', { grantId: ok(await call(ctx, tomas, 'POST', '/grants/import', { code: c })).grant.id }), 'already_done');
  assert.equal(ok(await call(ctx, tomas, 'GET', '/grants')).grants.length, 1);
});

test('A code is refused for the wrong person, with a typo, for an allergy, or once expired', async () => {
  const ctx = await setup();
  const c = code('c4', '2026-11-14', [{ itemId: 'ondansetron-4', units: 1, perDay: 2, days: 3 }]);
  fails(await call(ctx, mara, 'POST', '/grants/import', { code: c }), 'not_your_data');
  fails(await call(ctx, tomas, 'POST', '/grants/import', { code: c.replace('OND1X2X3', 'OND1X2X2') }), 'invalid_code');
  fails(await call(ctx, tomas, 'POST', '/grants/import', { code: code('c4', '2026-11-14', [{ itemId: 'ibuprofen-400', units: 1, perDay: 2, days: 3 }]) }), 'needs_approval');
  fails(await call(ctx, tomas, 'POST', '/grants/import', { code: code('c4', '2026-11-01', [{ itemId: 'ondansetron-4', units: 1, perDay: 2, days: 3 }]) }), 'invalid_code');
});

test('Earth\'s reply QR (inventory/earth-reply-qr.svg) answers Tomas\'s waiting sleeping-pill request', async () => {
  const ctx = await setup();
  const r = ok(await call(ctx, tomas, 'POST', '/requests', { itemId: 'zolpidem-5' })).request;
  assert.equal(r.status, 'waiting_earth');
  const g = ok(await call(ctx, tomas, 'POST', '/grants/import', { code: 'RX2-EARTH-C4-261114-ZOL1X1X7-9Z' })).grant;
  assert.deepEqual([g.issuer, g.verification, g.dueNow, g.items[0].itemId, g.items[0].days], ['EARTH', 'simulated', true, 'zolpidem-5', 7]);
  const after = ok(await call(ctx, tomas, 'GET', '/requests')).requests[0];
  assert.deepEqual([after.status, after.grantId], ['approved', g.id]);
  assert.equal(ok(await call(ctx, earthUser(), 'GET', '/requests')).requests.length, 0);
});

test('The prototype\'s Earth test code still works here', async () => {
  const ctx = await setup();
  const g = ok(await call(ctx, tomas, 'POST', '/grants/import', { code: 'RX2-EARTH-C4-261114-OND1X2X3.CAL2X3X5-LW' })).grant;
  const col = ok(await call(ctx, tomas, 'POST', '/collections', { grantId: g.id })).collection;
  // dispensary style: one batch with every medicine due now
  assert.deepEqual(col.compartments.map((c) => c.compartmentId).sort(), ['L1-2-04', 'L2-1-07']);
});

// ---- never a double dose (Tommy's review of #58) ----------------------------------------------------

test('A replacement doesn\'t offer a dose time that was already collected', async () => {
  const ctx = await setup('2026-11-14T08:30:00.000Z');
  const a = ok(await call(ctx, tomas, 'POST', '/grants/import', { code: code('c4', '2026-11-14', [{ itemId: 'ondansetron-4', units: 1, perDay: 2, days: 5 }]) })).grant;
  const col = ok(await call(ctx, tomas, 'POST', '/collections', { grantId: a.id })).collection;
  ok(await call(ctx, tomas, 'POST', `/collections/${col.id}/scan`, { compartmentId: 'L2-1-07' }));
  const b = ok(await call(ctx, tomas, 'POST', '/grants/import', { code: code('c4', '2026-11-14', [{ itemId: 'ondansetron-4', units: 1, perDay: 3, days: 5 }]) })).grant;
  assert.equal(b.dueNow, false);
  fails(await call(ctx, tomas, 'POST', '/collections', { grantId: b.id }), 'already_done');
});

test('A replacement starting later doesn\'t stop the current course before it starts', async () => {
  const ctx = await setup('2026-11-14T08:30:00.000Z');
  const a = ok(await call(ctx, tomas, 'POST', '/grants/import', { code: code('c4', '2026-11-14', [{ itemId: 'ondansetron-4', units: 1, perDay: 2, days: 5 }]) })).grant;
  ok(await call(ctx, tomas, 'POST', '/grants/import', { code: code('c4', '2026-11-16', [{ itemId: 'ondansetron-4', units: 1, perDay: 2, days: 5 }]) }));
  let grants = ok(await call(ctx, tomas, 'GET', '/grants')).grants;
  assert.equal(grants.find((g) => g.id === a.id).dueNow, true);
  ctx.advance(2 * 24 * 60); // 16 Nov, 08:30
  grants = ok(await call(ctx, tomas, 'GET', '/grants')).grants;
  assert.equal(grants.find((g) => g.id === a.id).items[0].status, 'replaced');
  assert.equal(grants.find((g) => g.id !== a.id).dueNow, true);
});

test('Two NSAIDs at once are refused', async () => {
  const ctx = await setup();
  ok(await call(ctx, mara, 'POST', '/grants/import', { code: code('c1', '2026-11-14', [{ itemId: 'ibuprofen-400', units: 1, perDay: 3, days: 3 }]) }));
  const msg = fails(await call(ctx, mara, 'POST', '/grants/import', { code: code('c1', '2026-11-14', [{ itemId: 'aspirin-325', units: 1, perDay: 2, days: 3 }]) }), 'invalid_code');
  assert.match(msg, /NSAID/);
});

// ---- profile, allergies, privacy -------------------------------------------------------------------

test('Crew see only their own data; the medical officer sees anyone\'s; Earth sees no lockers', async () => {
  const ctx = await setup();
  fails(await call(ctx, tomas, 'GET', '/profile', null, { crewId: 'c1' }), 'not_your_data');
  const p = ok(await call(ctx, medicalOfficer(), 'GET', '/profile', null, { crewId: 'c4' })).profile;
  assert.equal(p.allergies[0].substance, 'NSAID');
  fails(await call(ctx, earthUser(), 'GET', '/lockers'), 'wrong_role');
  fails(await call(ctx, tomas, 'GET', '/doses', null, { crewId: 'c1' }), 'not_your_data');
  assert.ok(ok(await call(ctx, medicalOfficer(), 'GET', '/symptom-reports')).reports.length >= 2);
});

test('A crew member adds a suspected allergy; only the medical officer confirms it; it blocks at once', async () => {
  const ctx = await setup();
  const p = ok(await call(ctx, kai, 'POST', '/allergies', { crewId: 'c5', substance: 'antihistamine', status: 'suspected', note: 'Rash after loratadine' })).profile;
  assert.equal(p.allergies[0].status, 'suspected');
  fails(await call(ctx, kai, 'POST', '/allergies', { crewId: 'c5', substance: 'antihistamine', status: 'confirmed', note: null }), 'wrong_role');
  fails(await call(ctx, kai, 'POST', '/allergies', { crewId: 'c4', substance: 'peanut', status: 'suspected', note: null }), 'not_your_data');
  ok(await call(ctx, medicalOfficer(), 'POST', '/allergies', { crewId: 'c5', substance: 'antihistamine', status: 'confirmed', note: null }));
  assert.deepEqual(ctx.events.at(-1), { type: 'meds.allergy-changed', crewId: 'c5' });
  fails(await call(ctx, kai, 'POST', '/collections', { itemId: 'loratadine-10', units: 1 }), 'needs_approval');
});

// ---- inputs ---------------------------------------------------------------------------------------

test('Red flags: no suggestions, call the medical officer', async () => {
  const ctx = await setup();
  const data = ok(await call(ctx, tomas, 'POST', '/symptom-reports', { symptoms: [{ code: 'neuro-headache', severity: 6 }] }));
  assert.deepEqual([data.redFlag, data.suggestions, data.blocked], [true, [], []]);
});

test('Unknown or out-of-range fields are refused', async () => {
  const ctx = await setup();
  fails(await call(ctx, tomas, 'POST', '/symptom-reports', { symptoms: [{ code: 'headache', severity: 5 }], mood: 3 }), 'invalid_field');
  fails(await call(ctx, tomas, 'POST', '/symptom-reports', { symptoms: [{ code: 'headache', severity: 11 }] }), 'invalid_field');
  fails(await call(ctx, tomas, 'POST', '/symptom-reports', { symptoms: [{ code: 'sneezing', severity: 3 }] }), 'invalid_field');
  fails(await call(ctx, tomas, 'POST', '/collections', { itemId: 'acetaminophen-325', units: 0 }), 'invalid_field');
  const col = ok(await call(ctx, tomas, 'POST', '/collections', { itemId: 'acetaminophen-325', units: 1 })).collection;
  fails(await call(ctx, tomas, 'POST', `/collections/${col.id}/scan`, { compartmentId: 'L1-1-01', skipScan: true }), 'invalid_field');
  fails(await call(ctx, tomas, 'POST', '/collections/col_x/scan', { compartmentId: 'L1-1-01' }), 'not_found');
  fails(await call(ctx, tomas, 'POST', '/collections', { itemId: 'epinephrine-auto', units: 1 }), 'needs_approval');
});

test('Self-care quantity is the crew member\'s choice, within the daily limit', async () => {
  const ctx = await setup();
  // Tomas took 2 acetaminophen last night; the limit is 8 a day
  fails(await call(ctx, tomas, 'POST', '/collections', { itemId: 'acetaminophen-325', units: 7 }), 'not_due');
  ok(await call(ctx, tomas, 'POST', '/collections', { itemId: 'acetaminophen-325', units: 1 }));
});

// ---- wave 2: emergencies and stock (scene C, then E) ------------------------------------------------

async function raise(ctx, by = mara, patientId = 'c5') {
  return ok(await call(ctx, by, 'POST', '/emergencies', { patientId, reason: 'Lips swelling after a new food', vitals: { restingHeartRateBpm: 125, spo2Pct: 91 } }));
}
async function release(ctx, by, emergencyId, itemId, overrideAllergy = false) {
  const col = ok(await call(ctx, by, 'POST', '/collections', { emergencyId, itemId, units: 1, overrideAllergy })).collection;
  return ok(await call(ctx, by, 'POST', `/collections/${col.id}/scan`, { compartmentId: col.compartments[0].compartmentId, skipScan: true })).collection;
}
const stockOf = async (ctx, itemId) => ok(await call(ctx, medicalOfficer(), 'GET', '/stock')).items.find((i) => i.itemId === itemId);

test('Scene C: a crewmate raises an emergency for Kai; every page hears it; crew see only who and when', async () => {
  const ctx = await setup();
  const { emergency } = await raise(ctx);
  assert.deepEqual(ctx.events.at(-1), { type: 'meds.emergency-raised', crewId: 'c5' });
  assert.deepEqual(Object.keys(emergency).sort(), ['id', 'patientId', 'raisedAt', 'status']);
  const forCrew = ok(await call(ctx, tomas, 'GET', '/emergencies', null, { status: 'open' })).emergencies;
  assert.deepEqual(forCrew.map((e) => [e.patientId, e.status]), [['c5', 'open']]);
  assert.equal(forCrew[0].reason, undefined);
  const forLeo = ok(await call(ctx, medicalOfficer(), 'GET', '/emergencies', null, { status: 'open' })).emergencies[0];
  assert.equal(forLeo.reason, 'Lips swelling after a new food');
  assert.equal(forLeo.vitals.spo2Pct, 91);
  assert.equal(Date.parse(forLeo.paperworkDueAt) - Date.parse(forLeo.raisedAt), 2 * 3_600_000);
  // Pressing again finds the same emergency
  const again = await raise(ctx, kai);
  assert.deepEqual([again.emergency.id, again.alreadyOpen], [emergency.id, true]);
});

test('Scene C: epinephrine is released at once, no sign-off, scan skipped, and the dose is logged for Kai', async () => {
  const ctx = await setup();
  const { emergency } = await raise(ctx);
  const done = await release(ctx, mara, emergency.id, 'epinephrine-auto');
  assert.deepEqual([done.status, done.source, done.patientId, done.compartments[0].compartmentId], ['complete', 'emergency', 'c5', 'L3-1-01']);
  const e = ok(await call(ctx, medicalOfficer(), 'GET', '/emergencies')).emergencies[0];
  assert.deepEqual(e.released.map((r) => [r.itemId, r.units, r.scanSkipped, r.allergyOverridden]), [['epinephrine-auto', 1, true, false]]);
  const doses = ok(await call(ctx, medicalOfficer(), 'GET', '/doses', null, { crewId: 'c5' })).doses;
  assert.deepEqual(doses.map((d) => [d.itemId, d.source]), [['epinephrine-auto', 'emergency']]);
  assert.ok(ctx.events.some((ev) => ev.type === 'meds.emergency-updated' && ev.crewId === 'c5'));
});

test('Scene E: after the release, epinephrine is below its reserve', async () => {
  const ctx = await setup();
  assert.equal((await stockOf(ctx, 'epinephrine-auto')).belowReserve, false);
  const { emergency } = await raise(ctx);
  await release(ctx, kai, emergency.id, 'epinephrine-auto');
  const epi = await stockOf(ctx, 'epinephrine-auto');
  assert.deepEqual([epi.units, epi.reserve, epi.belowReserve, epi.tier], [3, 4, true, 'emergency']);
  assert.equal(epi.nextExpiry, '2028-04-30');
  fails(await call(ctx, tomas, 'GET', '/stock'), 'wrong_role');
});

test('In an emergency only emergency medicines come out, and only while it is open', async () => {
  const ctx = await setup();
  const { emergency } = await raise(ctx);
  fails(await call(ctx, mara, 'POST', '/collections', { emergencyId: emergency.id, itemId: 'ondansetron-4', units: 1, overrideAllergy: false }), 'needs_approval');
  fails(await call(ctx, mara, 'POST', '/collections', { emergencyId: 'emg_nope', itemId: 'epinephrine-auto', units: 1 }), 'not_found');
  ok(await call(ctx, medicalOfficer(), 'POST', `/emergencies/${emergency.id}/paperwork`, { note: 'Anaphylaxis to a new food. Epinephrine 0.3 mg.' }));
  fails(await call(ctx, mara, 'POST', '/collections', { emergencyId: emergency.id, itemId: 'epinephrine-auto', units: 1 }), 'already_done');
});

test('An allergy blocks an emergency medicine unless "give anyway" is confirmed, which is logged', async () => {
  const ctx = await setup();
  ok(await call(ctx, medicalOfficer(), 'POST', '/allergies', { crewId: 'c5', substance: 'antihistamine', status: 'confirmed', note: null }));
  const { emergency } = await raise(ctx);
  fails(await call(ctx, mara, 'POST', '/collections', { emergencyId: emergency.id, itemId: 'diphenhydramine-inj', units: 1, overrideAllergy: false }), 'needs_approval');
  await release(ctx, mara, emergency.id, 'diphenhydramine-inj', true);
  const e = ok(await call(ctx, medicalOfficer(), 'GET', '/emergencies')).emergencies[0];
  assert.equal(e.released[0].allergyOverridden, true);
});

test('Only the medical officer closes the paperwork, once', async () => {
  const ctx = await setup();
  const { emergency } = await raise(ctx);
  fails(await call(ctx, kai, 'POST', `/emergencies/${emergency.id}/paperwork`, { note: 'I am fine' }), 'wrong_role');
  fails(await call(ctx, medicalOfficer(), 'POST', `/emergencies/${emergency.id}/paperwork`, { note: '' }), 'invalid_field');
  const closed = ok(await call(ctx, medicalOfficer(), 'POST', `/emergencies/${emergency.id}/paperwork`, { note: 'Done' })).emergency;
  assert.deepEqual([closed.status, closed.paperworkNote], ['closed', 'Done']);
  fails(await call(ctx, medicalOfficer(), 'POST', `/emergencies/${emergency.id}/paperwork`, { note: 'Again' }), 'already_done');
  assert.equal(ok(await call(ctx, tomas, 'GET', '/emergencies', null, { status: 'open' })).emergencies.length, 0);
});

test('Scene C, step 6: the new allergy goes on Kai\'s profile as suspected; Leo confirms it in scene E', async () => {
  const ctx = await setup();
  ok(await call(ctx, kai, 'POST', '/allergies', { crewId: 'c5', substance: 'New food item (freeze-dried)', status: 'suspected', note: 'Lips swelled after eating it' }));
  const p = ok(await call(ctx, medicalOfficer(), 'POST', '/allergies', { crewId: 'c5', substance: 'New food item (freeze-dried)', status: 'confirmed', note: null })).profile;
  assert.deepEqual(p.allergies.map((a) => a.status), ['confirmed']);
});

test('Emergency inputs are checked; Earth can\'t raise one', async () => {
  const ctx = await setup();
  fails(await call(ctx, mara, 'POST', '/emergencies', { patientId: 'c9', reason: 'x' }), 'invalid_field');
  fails(await call(ctx, mara, 'POST', '/emergencies', { patientId: 'c5', reason: '' }), 'invalid_field');
  fails(await call(ctx, mara, 'POST', '/emergencies', { patientId: 'c5', reason: 'x', vitals: { spo2Pct: 140 } }), 'invalid_field');
  fails(await call(ctx, earthUser(), 'POST', '/emergencies', { patientId: 'c5', reason: 'x' }), 'wrong_role');
  fails(await call(ctx, mara, 'POST', '/collections', { itemId: 'acetaminophen-325', units: 1, overrideAllergy: true }), 'invalid_field');
  // reset clears emergencies
  await raise(ctx);
  await meds.reset(ctx);
  assert.equal(ok(await call(ctx, medicalOfficer(), 'GET', '/emergencies')).emergencies.length, 0);
});
