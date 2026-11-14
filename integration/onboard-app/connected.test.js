import test from 'node:test';
import assert from 'node:assert/strict';
import modules from './modules.js';
import { boot, dataOf } from './test-helpers.js';
import { createWorkoutController } from '../../people/petros_the_space_larper/demo-data/workout-session.js';
import { readFile } from 'node:fs/promises';

const get = (app, token, path) => app.call('GET', `/api${path}`, { token });
const post = (app, token, path, body) => app.call('POST', `/api${path}`, { token, body });

test('joined registry: private journal, own-today companion, clinical roles and restart persistence', async () => {
  let app = await boot(modules, { realNow: () => 0 });
  try {
    assert.deepEqual(modules.map(m => m.name), ['health', 'meds', 'mind', 'env', 'reports']);
    const crew = await app.login('c4'), other = await app.login('c1'), doctor = await app.login('c2', 'medical'), earth = await app.login(null, 'earth');
    const check = dataOf(await post(app, crew, '/health/check-ins', { sleepHours: 4.6, restingHeartRateBpm: 63, mood: 6, stress: 4, fatigue: 4 }));
    assert.equal(check.today.checkedInToday, true); assert.equal(check.analysis, undefined);
    const daily = dataOf(await get(app, doctor, '/health/daily?crewId=c4'));
    assert.equal(daily.measures.find(m => m.measure === 'sleepHours').daysInARow, 3);
    assert.equal((await get(app, crew, '/health/history')).status, 403);
    const privateText = 'PRIVATE DEMO JOURNAL SENTINEL';
    dataOf(await post(app, crew, '/mind/journal', { text: privateText }));
    assert.equal(dataOf(await get(app, other, '/mind/journal')).entries.length, 0);
    for (const token of [doctor, earth]) assert.equal((await get(app, token, '/mind/journal')).status, 403);
    assert.equal((await get(app, crew, '/mind/journal?crewId=c1')).status, 400);
    const reply = dataOf(await post(app, crew, '/mind/companion', { message: 'I feel tired.', context: { today: check.today } }));
    assert.match(reply.reply, /4.6 hours/); assert.ok(!JSON.stringify(reply).includes(privateText));
    assert.equal((await post(app, other, '/mind/companion', { message: 'hi', context: { today: check.today } })).status, 403);
    assert.ok(!JSON.stringify(dataOf(await get(app, crew, '/events'))).includes(privateText));
    const dir = app.dataDir;
    await app.close({ keepData: true }); app = await boot(modules, { dataDir: dir, realNow: () => 0 });
    assert.equal(dataOf(await get(app, crew, '/mind/journal')).entries[0].text, privateText);
    assert.equal(dataOf(await get(app, crew, '/health/today')).checkIn.sleepHours, 4.6);
    dataOf(await post(app, crew, '/demo/reset', {}));
    assert.deepEqual(dataOf(await get(app, crew, '/mind/journal')).entries, []);
    assert.equal(dataOf(await get(app, crew, '/health/today')).checkedInToday, false);
  } finally { await app.close(); }
});

test('Earth multi-item credential: same QR/text grant, allergy block, all due compartments, one dose and next dose', async () => {
  const app = await boot(modules, { realNow: () => 0 });
  try {
    const crew = await app.login('c1'), other = await app.login('c4'), earth = await app.login(null, 'earth');
    const lockers = dataOf(await get(app, crew, '/meds/lockers')).lockers;
    const bins = lockers.flatMap(l => l.shelves.flatMap(s => s.bins));
    const itemIds = ['acetaminophen-325', 'amox-clav-875'];
    assert.ok(itemIds.every(id => bins.some(b => b.itemId === id)));
    const items = itemIds.map(itemId => ({ itemId, units: 1, perDay: 2, days: 3 }));
    const { code } = dataOf(await post(app, earth, '/reports/grants-code', { crewId: 'c1', items }));
    assert.equal((await post(app, other, '/meds/grants/import', { code })).status, 403);
    const first = dataOf(await post(app, crew, '/meds/grants/import', { code })).grant;
    const again = dataOf(await post(app, crew, '/meds/grants/import', { code: code.toLowerCase() }));
    assert.equal(again.grant.id, first.id); assert.equal(again.alreadyImported, true);
    let collection = dataOf(await post(app, crew, '/meds/collections', { grantId: first.id })).collection;
    assert.equal(collection.compartments.length, 2);
    for (const p of collection.compartments) {
      collection = dataOf(await post(app, crew, `/meds/collections/${collection.id}/scan`, { compartmentId: p.compartmentId })).collection;
      assert.equal((await post(app, crew, `/meds/collections/${collection.id}/scan`, { compartmentId: p.compartmentId })).status, 409);
    }
    assert.equal(collection.status, 'complete');
    assert.equal((await post(app, crew, '/meds/collections', { grantId: first.id })).status, 409);
    dataOf(await post(app, crew, '/clock/advance', { minutes: 720 }));
    const repeated = dataOf(await post(app, crew, '/meds/grants/import', { code })).grant;
    assert.equal(repeated.id, first.id);
    assert.equal(dataOf(await post(app, crew, '/meds/collections', { grantId: first.id })).collection.compartments.length, 2);
    const blocked = dataOf(await post(app, other, '/meds/symptom-reports', { symptoms: [{ code: 'headache', severity: 5 }] }));
    assert.ok(blocked.blocked.some(b => /ibuprofen/i.test(b.name)));
    assert.equal((await post(app, other, '/meds/collections', { itemId: 'ibuprofen-400', units: 1 })).status, 403);
  } finally { await app.close(); }
});

test('real environment replay and doctor-only queued reports with a delayed Earth reply and no journal', async () => {
  const app = await boot(modules, { realNow: () => 0 });
  try {
    const crew = await app.login('c4'), doctor = await app.login('c2', 'medical'), earth = await app.login(null, 'earth');
    const environment = dataOf(await get(app, doctor, '/env/now'));
    assert.equal(environment.source.kind, 'historical');
    assert.equal(environment.readings.length, 4);
    assert.equal(environment.readings.find(r => r.metric === 'radiation').source.dataset, 'curiosity-cruise');
    const alerts = dataOf(await get(app, crew, '/env/alerts?hours=48')).alerts;
    const overnight = alerts.filter(a => a.metric === 'co2').at(-1);
    assert.equal(overnight.recoveredAt, '2026-11-14T07:00:00.000Z');
    assert.equal(overnight.peakLevel, 'danger');
    assert.equal((await get(app, crew, '/env/snapshot?at=2026-11-15T00%3A00%3A00Z')).status, 400);
    const daily = dataOf(await get(app, doctor, '/health/daily?crewId=c4'));
    const history = dataOf(await get(app, doctor, '/health/history?crewId=c4'));
    const profile = dataOf(await get(app, doctor, '/meds/profile?crewId=c4')).profile;
    const body = { crewId: 'c4', note: 'Review demo patient', health: { daily, history }, meds: { reports: [], doses: [], profile }, environment };
    assert.equal((await post(app, crew, '/reports', body)).status, 403);
    assert.equal((await get(app, crew, '/reports')).status, 403);
    assert.equal((await post(app, doctor, '/reports', { ...body, journal: 'private' })).status, 400);
    assert.equal((await post(app, doctor, '/reports', { ...body, health: { daily: { ...daily, journal: 'private' }, history } })).status, 400);
    assert.equal((await post(app, doctor, '/reports', { ...body, health: { daily, history: null } })).status, 400);
    assert.equal((await post(app, doctor, '/reports', { ...body, meds: { ...body.meds, reports: 'invalid' } })).status, 400);
    dataOf(await post(app, doctor, '/reports/link', { linkUp: false }));
    const report = dataOf(await post(app, doctor, '/reports', body)).report;
    assert.equal(report.status, 'queued');
    assert.deepEqual(dataOf(await get(app, earth, '/reports')).reports, []);
    dataOf(await post(app, doctor, '/clock/advance', { minutes: 12 }));
    assert.deepEqual(dataOf(await get(app, earth, '/reports')).reports, []);
    dataOf(await post(app, doctor, '/reports/link', { linkUp: true }));
    dataOf(await post(app, doctor, '/clock/advance', { minutes: 12 }));
    assert.equal(dataOf(await get(app, earth, '/reports')).reports[0].status, 'received');
    dataOf(await post(app, earth, `/reports/${report.id}/replies`, { note: 'Demo specialist response' }));
    assert.equal(dataOf(await get(app, doctor, '/reports')).reports[0].replies.length, 0);
    dataOf(await post(app, doctor, '/clock/advance', { minutes: 12 }));
    assert.equal(dataOf(await get(app, doctor, '/reports')).reports[0].replies[0].note, 'Demo specialist response');
    assert.ok(app.logs.every(line => !/failed|server_error|Error/.test(line)));
  } finally { await app.close(); }
});

test('Petros stage controller saves replayed workout through the mounted health API', async () => {
 const app = await boot(modules, { realNow: () => 0 });
 try {
  const crew = await app.login('c4');
  const replay = JSON.parse(await readFile(new URL('../../people/petros_the_space_larper/demo-data/workout-heart-rate.json', import.meta.url)));
  const controller = createWorkoutController({ missionDay: 42, stage: true, replay,
    submitWorkout: async body => dataOf(await post(app, crew, '/health/workouts', body)) });
  controller.start('2026-11-14T07:30:00.000Z');
  let snap = controller.snapshot('2026-11-14T07:30:10.000Z');
  while(snap.currentStep) snap = controller.completeStep(snap.currentStep.id, '2026-11-14T07:31:30.000Z', snap.currentStep.kind === 'resistance' ? { reps: 25 } : {});
  dataOf(await post(app, crew, '/clock/advance', { minutes: 3 }));
  const saved = await controller.save('2026-11-14T07:33:00.000Z', { withRecovery: true });
  assert.equal(saved.saveStatus, 'saved');
  const workouts = dataOf(await get(app, crew, '/health/workouts')).workouts;
  assert.equal(workouts.length, 1);assert.equal(workouts[0].reps, 25);assert.match(workouts[0].heartRateSource, /synthetic/);
  assert.equal((await get(app, crew, '/health/weekly')).status, 403);
 } finally { await app.close(); }
});
