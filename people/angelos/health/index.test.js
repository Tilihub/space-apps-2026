import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { COMPARED_MEASURES, DEMO_START, handleRequest } from '../../../shared/contract/contract.js';
import { crewUser, earthUser, makeTestContext, medicalOfficer } from '../../../shared/contract/testing.js';
import { createHealthModule } from './index.js';
import { dailyFor, referenceFor, weeklyFor } from './analysis.js';

const usual = { sleepHours: 7.8, restingHeartRateBpm: 61, mood: 8, stress: 3, fatigue: 3 };
const changed = { sleepHours: 5.5, restingHeartRateBpm: 77, mood: 4, stress: 7, fatigue: 7 };
const request = (mod, ctx, path, { user = crewUser('c1'), body, query = {}, method = 'GET' } = {}) =>
  handleRequest(mod, ctx, { method, path, user, body, query });
const post = (mod, ctx, body = usual, user = crewUser('c1')) =>
  request(mod, ctx, '/check-ins', { method: 'POST', body, user });
const daily = (mod, ctx, crewId = 'c1') =>
  request(mod, ctx, '/daily', { user: medicalOfficer(), query: { crewId } });
const exampleFixture = new URL('./fixtures/health.json', import.meta.url);

async function setup() {
  const mod = createHealthModule({ fixtureUrl: exampleFixture });
  const ctx = makeTestContext();
  await mod.reset(ctx);
  return { mod, ctx };
}

test('first app request initializes an empty module store from an external file', async () => {
  const mod = createHealthModule();
  const ctx = makeTestContext();
  const response = await request(mod, ctx, '/today');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data, { crewId: 'c1', missionDay: 42, checkedInToday: false, checkIn: null });
  assert.equal(ctx.saved().source.kind, 'synthetic');
  assert.equal(ctx.saved().source.fixture, 'petros-demo-data');
  const canonical = await readFile(new URL('../../petros_the_space_larper/demo-data/health.json', import.meta.url), 'utf8');
  assert.equal(ctx.saved().source.sha256, createHash('sha256').update(canonical).digest('hex'));
});

test('reset reads all five personal references from the external PET-1 fixture', async () => {
  const { ctx } = await setup();
  const state = ctx.saved();
  assert.equal(state.scaleVersion, 'self-report-1-10-v1');
  assert.equal(state.source.kind, 'synthetic');
  const source = await readFile(exampleFixture, 'utf8');
  assert.equal(state.source.sha256, createHash('sha256').update(source).digest('hex'));
  assert.equal(Object.keys(state.crew).length, 5);
  for (const person of Object.values(state.crew)) {
    assert.deepEqual(person.baseline.map(row => row.missionDay), [29, 30, 31, 32, 33, 34, 35]);
    assert.deepEqual(person.checkIns.map(row => row.missionDay), [36, 37, 38, 39, 40, 41]);
    assert.equal(person.checkIns[0].recordedAt, '2026-11-08T07:30:00.000Z');
  }
  assert.equal(referenceFor(state.crew.c1.baseline, 'restingHeartRateBpm').normal, 61);
  assert.equal(referenceFor(state.crew.c2.baseline, 'restingHeartRateBpm').normal, 67);
});

test('app POST saves server-assigned crew/day/time; the officer retrieves the comparison separately', async () => {
  const { mod, ctx } = await setup();
  const before = structuredClone(ctx.saved().crew.c4.baseline);
  const response = await post(mod, ctx, changed, crewUser('c4'));
  assert.equal(response.status, 201);
  const { checkIn, today } = response.body.data;
  const result = (await daily(mod, ctx, 'c4')).body.data;
  assert.equal(checkIn.crewId, 'c4');
  assert.equal(checkIn.missionDay, 42);
  assert.equal(checkIn.recordedAt, DEMO_START);
  assert.equal(checkIn.id, 'health_c4_d42');
  assert.equal(today.checkedInToday, true);
  assert.deepEqual(Object.keys(today).sort(), ['checkIn', 'checkedInToday', 'crewId', 'missionDay']);
  assert.ok(!('daily' in response.body.data));
  assert.equal(result.status, 'changes_found');
  assert.deepEqual(result.measures.map(item => item.measure), COMPARED_MEASURES);
  assert.equal(result.measures.filter(item => item.changed).length, 5);
  assert.equal(result.measures.find(item => item.measure === 'sleepHours').daysInARow, 3);
  assert.deepEqual(ctx.saved().crew.c4.baseline, before);
  assert.deepEqual(ctx.events, [{ type: 'health.check-in-saved', crewId: 'c4' }]);
});

test('daily view does not present yesterday as today', async () => {
  const { mod, ctx } = await setup();
  const initial = await daily(mod, ctx);
  assert.equal(initial.body.data.status, 'no_check_in_today');
  assert.ok(initial.body.data.measures.every(item => item.today === null));
  assert.equal((await request(mod, ctx, '/today')).body.data.checkIn, null);
  await post(mod, ctx);
  assert.equal((await daily(mod, ctx)).body.data.status, 'no_changes');
  assert.equal((await request(mod, ctx, '/today')).body.data.checkIn.sleepHours, 7.8);
  ctx.advance(24 * 60);
  assert.equal((await daily(mod, ctx)).body.data.status, 'no_check_in_today');
  assert.equal((await request(mod, ctx, '/today')).body.data.checkIn, null);
});

test('saved state reloads in a new module/context and stays isolated by person', async () => {
  const { mod, ctx } = await setup();
  await post(mod, ctx);
  const other = structuredClone(ctx.saved().crew.c2);
  const restarted = createHealthModule();
  const restored = makeTestContext({ state: ctx.saved() });
  assert.equal((await request(restarted, restored, '/today')).body.data.checkedInToday, true);
  assert.equal((await request(restarted, restored, '/today', { user: crewUser('c2') })).body.data.checkedInToday, false);
  assert.deepEqual(restored.saved().crew.c2, other);
});

test('missing measurements remain null and extra sensor values are stored without extra comparisons', async () => {
  const { mod, ctx } = await setup();
  const response = await post(mod, ctx, { sleepHours: null, spo2Pct: 98, temperatureC: 36.7,
    systolicMmHg: 120, diastolicMmHg: 80 });
  assert.equal(response.status, 201);
  assert.equal(response.body.data.checkIn.mood, null);
  assert.equal(response.body.data.checkIn.spo2Pct, 98);
  const result = (await daily(mod, ctx)).body.data;
  assert.equal(result.status, 'not_enough_data');
  assert.equal(result.measures.length, 5);
  assert.ok(result.gaps.some(gap => gap.startsWith('mood:')));
});

test('new app uses integer self-reports 1-10 and finite sensor values in contract units', async () => {
  const { mod, ctx } = await setup();
  const before = structuredClone(ctx.saved());
  for (const body of [null, [], {}, { mood: null }, { sleepHours: null, stress: null },
    { mood: 0 }, { mood: 2.5 }, { stress: 11 }, { fatigue: '7' },
    { sleepHours: 25 }, { sleepHours: -1 }, { restingHeartRateBpm: Infinity }, { spo2Pct: NaN },
    { temperatureC: 80 }, { systolicMmHg: true }]) {
    assert.equal((await post(mod, ctx, body)).status, 400, JSON.stringify(body));
  }
  assert.deepEqual(ctx.saved(), before);
  assert.equal(ctx.events.length, 0);
  assert.equal((await post(mod, ctx, { mood: 1, stress: 10, fatigue: 1, sleepHours: 0 })).status, 201);
});

test('a page cannot choose crew identity, date or unknown/private journal fields', async () => {
  const { mod, ctx } = await setup();
  for (const extra of [{ crewId: 'c2' }, { missionDay: 43 }, { recordedAt: DEMO_START },
    { journal: 'private' }, { baseline: [] }, { sleep_hours: 8 }]) {
    assert.equal((await post(mod, ctx, { ...usual, ...extra })).status, 400);
  }
  const query = await request(mod, ctx, '/check-ins', { method: 'POST', body: usual, query: { crewId: 'c2' } });
  assert.equal(query.status, 400);
  assert.equal(ctx.events.length, 0);
});

test('one check-in per mission day; serialized concurrent writes do not lose another crew member', async () => {
  const { mod, ctx } = await setup();
  const responses = await Promise.all([
    post(mod, ctx), post(mod, ctx), post(mod, ctx, usual, crewUser('c2')),
  ]);
  assert.deepEqual(responses.map(item => item.status), [201, 409, 201]);
  assert.equal(ctx.saved().crew.c1.checkIns.length, 7);
  assert.equal(ctx.saved().crew.c2.checkIns.length, 7);
  assert.equal(ctx.events.length, 2);
});

test('today access uses the core session: own crew only, without comparison fields', async () => {
  const { mod, ctx } = await setup();
  const cases = [
    [null, {}, 401], [crewUser('c1'), { crewId: 'c2' }, 400], [earthUser(), {}, 403],
    [{ role: 'medical_officer', crewId: 'c1' }, { crewId: 'c4' }, 403],
    [medicalOfficer(), {}, 403], [crewUser('c1'), {}, 200],
  ];
  for (const [user, query, status] of cases) {
    assert.equal((await request(mod, ctx, '/today', { user, query })).status, status);
  }
  assert.equal((await post(mod, ctx, usual, medicalOfficer())).status, 403);
});

test('contract policy: daily analysis, history, weekly and crew overview are medical-officer-only', async () => {
  const { mod, ctx } = await setup();
  for (const path of ['/daily', '/history', '/weekly', '/crew']) {
    for (const user of [crewUser('c1'), crewUser('c2'), earthUser(), { role: 'medical_officer', crewId: 'c1' }]) {
      assert.equal((await request(mod, ctx, path, { user })).status, 403, `${path} ${user.role}`);
    }
    assert.equal((await request(mod, ctx, path, { user: medicalOfficer() })).status, 200);
  }
  const overview = await request(mod, ctx, '/crew', { user: medicalOfficer() });
  assert.equal(overview.body.data.crew.length, 5);
  assert.ok(overview.body.data.crew.every(row => !row.checkedInToday && row.changed.length === 0));
});

test('medical history has fixed reference plus bounded recent days, and rejects invalid queries', async () => {
  const { mod, ctx } = await setup();
  await post(mod, ctx);
  const response = await request(mod, ctx, '/history', { user: medicalOfficer(), query: { crewId: 'c1', days: '2' } });
  assert.equal(response.body.data.baseline.length, 7);
  assert.deepEqual(response.body.data.checkIns.map(row => row.missionDay), [41, 42]);
  for (const days of ['0', '-1', '61', '2.5', '2days', '01', '']) {
    assert.equal((await request(mod, ctx, '/history', { user: medicalOfficer(), query: { days } })).status, 400);
  }
  assert.equal((await request(mod, ctx, '/daily', { user: medicalOfficer(), query: { other: 'x' } })).status, 400);
  assert.equal((await request(mod, ctx, '/daily', { user: medicalOfficer(), query: { crewId: 'c6' } })).status, 400);
});

test('weekly report excludes reference rows from recent coverage and labels partial periods', async () => {
  const { mod, ctx } = await setup();
  await post(mod, ctx);
  const report = (await request(mod, ctx, '/weekly', { user: medicalOfficer(), query: { crewId: 'c1' } })).body.data;
  assert.deepEqual(report.currentPeriod, { from: 36, to: 42, recordedDays: 7 });
  assert.deepEqual(report.previousPeriod, { from: 29, to: 35, recordedDays: 0 });
  assert.equal(report.completeness, 'partial');
  assert.ok(report.measures.every(row => row.changeFromPreviousWeek === null && row.previous.median === null));
  for (let day = 43; day <= 49; day += 1) {
    ctx.advance(1440);
    await post(mod, ctx, { ...usual, sleepHours: 6.8 });
  }
  const complete = (await request(mod, ctx, '/weekly', { user: medicalOfficer(), query: { crewId: 'c1' } })).body.data;
  assert.equal(complete.completeness, 'complete');
  const sleep = complete.measures.find(row => row.measure === 'sleepHours');
  assert.equal(sleep.changeFromPreviousWeek, -1);
  assert.equal(sleep.changeFromBaseline, -1);
});

test('per-measure gaps prevent unsupported week-to-week comparisons', async () => {
  const { mod, ctx } = await setup();
  await post(mod, ctx, usual, crewUser('c3'));
  for (let day = 43; day <= 49; day += 1) {
    ctx.advance(1440);
    await post(mod, ctx, usual, crewUser('c3'));
  }
  const report = (await request(mod, ctx, '/weekly', { user: medicalOfficer(), query: { crewId: 'c3' } })).body.data;
  assert.equal(report.completeness, 'partial');
  const pulse = report.measures.find(row => row.measure === 'restingHeartRateBpm');
  assert.equal(pulse.previous.validDays, 6);
  assert.equal(pulse.changeFromPreviousWeek, null);
});

test('reset restores the input fixture without changing its fixed baseline', async () => {
  const { mod, ctx } = await setup();
  const original = structuredClone(ctx.saved());
  await post(mod, ctx, changed);
  await mod.reset(ctx);
  assert.deepEqual(ctx.saved(), original);
});

test('failed save does not mutate persisted data or emit a success event', async () => {
  const { mod, ctx } = await setup();
  const original = structuredClone(ctx.saved());
  const broken = { ...ctx, store: { load: async () => ctx.saved(), save: async () => { throw new Error('disk full'); } }, log() {} };
  assert.equal((await post(mod, broken)).status, 500);
  assert.deepEqual(ctx.saved(), original);
  assert.equal(ctx.events.length, 0);
  assert.equal((await post(mod, ctx)).status, 201);
});

test('clock inconsistencies, rewinds and legacy storage never silently replace history', async () => {
  const { mod, ctx } = await setup();
  assert.equal((await post(mod, { ...ctx, missionDay: () => 43 })).status, 500);
  await post(mod, ctx);
  ctx.advance(-1440);
  assert.equal((await post(mod, ctx)).status, 409);
  ctx.advance(-7 * 1440);
  assert.equal((await post(mod, ctx)).status, 400);
  const old = makeTestContext({ state: { crew: {} } });
  assert.equal((await daily(mod, old)).status, 500);
  assert.deepEqual(old.saved(), { crew: {} });
});

test('references use median/MAD with a minimum of five measured reference days and inclusive limits', () => {
  const baseline = [60, 61, 62, 63, 100, 64, 65].map((value, index) =>
    ({ missionDay: 29 + index, restingHeartRateBpm: value, sleepHours: 8 }));
  assert.equal(referenceFor(baseline, 'restingHeartRateBpm').normal, 63);
  assert.equal(referenceFor(baseline, 'restingHeartRateBpm').limit, 10);
  const wide = baseline.map((row, index) => ({ ...row, restingHeartRateBpm: 40 + index * 10 }));
  assert.ok(referenceFor(wide, 'restingHeartRateBpm').limit > 10);
  assert.equal(referenceFor(baseline.slice(0, 4), 'sleepHours').normal, null);
  const result = dailyFor({ baseline, checkIns: [{ missionDay: 42, sleepHours: 6.5 }] }, 'c1', 42);
  assert.equal(result.measures[0].changed, true);
  assert.ok(result.gaps.includes('mood: fewer than 5 reference days'));
});

test('streaks stop at a missing day, missing measure or a change in the opposite direction', () => {
  const baseline = Array.from({ length: 7 }, (_, index) => ({ missionDay: index + 29, sleepHours: 8 }));
  for (const checkIns of [
    [{ missionDay: 40, sleepHours: 5 }, { missionDay: 42, sleepHours: 5 }],
    [{ missionDay: 40, sleepHours: 5 }, { missionDay: 41, sleepHours: null }, { missionDay: 42, sleepHours: 5 }],
    [{ missionDay: 40, sleepHours: 5 }, { missionDay: 41, sleepHours: 10 }, { missionDay: 42, sleepHours: 5 }],
  ]) {
    assert.equal(dailyFor({ baseline, checkIns }, 'c1', 42).measures[0].daysInARow, 1);
  }
  const report = weeklyFor({ baseline, checkIns: [] }, 'c1', 42);
  assert.equal(report.measures[0].current.median, null);
});

test('invalid replacement fixture fails before overwriting saved state', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'health-fixture-test-'));
  const fixturePath = join(folder, 'health.json');
  try {
    const source = JSON.parse(await readFile(new URL('./fixtures/health.json', import.meta.url), 'utf8'));
    const { ctx } = await setup();
    const original = structuredClone(ctx.saved());
    const mod = createHealthModule({ fixtureUrl: pathToFileURL(fixturePath) });
    for (const alter of [packet => { packet.kind = 'real'; }, packet => { delete packet.crew.c5; },
      packet => { packet.crew.c1.checkIns[0].mood = 0; },
      packet => { packet.crew.c1.checkIns[1].missionDay = 29; },
      packet => { packet.crew.c1.checkIns[0].missionDay = 42; },
      packet => { packet.crew.c1.checkIns[0].time = ['07:30']; },
      packet => { packet.crew.c1.checkIns[0].time = '25:00'; }]) {
      const packet = structuredClone(source);
      alter(packet);
      await writeFile(fixturePath, JSON.stringify(packet));
      await assert.rejects(() => mod.reset(ctx));
      assert.deepEqual(ctx.saved(), original);
    }
    // Valid changes in the supplied file are read as data, not replaced by generated values.
    source.crew.c1.checkIns.slice(0, 7).forEach(row => { row.sleepHours = 9; });
    await writeFile(fixturePath, JSON.stringify(source));
    assert.equal((await post(mod, ctx)).status, 201);
    assert.deepEqual(ctx.saved().crew.c1.baseline, original.crew.c1.baseline);
    assert.equal(ctx.saved().source.sha256, original.source.sha256);
    await mod.reset(ctx);
    assert.equal(referenceFor(ctx.saved().crew.c1.baseline, 'sleepHours').normal, 9);
    assert.notEqual(ctx.saved().source.sha256, original.source.sha256);
  } finally {
    if (dirname(fixturePath) !== folder || !folder.startsWith(join(tmpdir(), 'health-fixture-test-'))) {
      throw new Error('Refusing cleanup outside this fixture test directory.');
    }
    await rm(folder, { recursive: true, force: true });
  }
});

const pet1 = JSON.parse(await readFile(new URL('./fixtures/scenarios.json', import.meta.url), 'utf8'));
for (const [crewId, scenario] of Object.entries(pet1.cases)) {
  test(`published PET-1 ${crewId} input works through the app contract without mixing roles or histories`, async () => {
    const { mod, ctx } = await setup();
    const initial = structuredClone(ctx.saved().crew);
    const response = await post(mod, ctx, scenario.checkInBody, crewUser(crewId));
    assert.equal(response.status, 201);
    assert.equal(response.body.data.today.crewId, crewId);
    assert.ok(!('daily' in response.body.data));
    const result = (await daily(mod, ctx, crewId)).body.data;
    assert.deepEqual(result.measures.filter(row => row.changed).map(row => row.measure), scenario.expectedChangedMeasures);
    assert.deepEqual(result.measures.filter(row => row.today === null).map(row => row.measure),
      scenario.expectedMissingComparedMeasures);
    if (scenario.expectedDaysInARow !== undefined) {
      assert.ok(result.measures.filter(row => row.changed).every(row => row.daysInARow === scenario.expectedDaysInARow));
    }
    assert.equal(result.status, scenario.expectedChangedMeasures.length ? 'changes_found'
      : scenario.expectedMissingComparedMeasures.length ? 'not_enough_data' : 'no_changes');
    assert.deepEqual(ctx.saved().crew[crewId].baseline, initial[crewId].baseline);
    for (const otherId of Object.keys(initial).filter(id => id !== crewId)) {
      assert.deepEqual(ctx.saved().crew[otherId], initial[otherId]);
    }
    for (const path of ['/daily', '/history', '/weekly']) {
      assert.equal((await request(mod, ctx, path, { user: crewUser(crewId) })).status, 403);
    }
  });
}
