import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handleRequest } from '../../../shared/contract/contract.js';
import { crewUser, earthUser, makeTestContext, medicalOfficer } from '../../../shared/contract/testing.js';
import { createHealthModule } from './index.js';

const sample = { kind: 'push-ups', startedAt: '2026-11-14T07:40:00.000Z', endedAt: '2026-11-14T07:41:30.000Z',
  reps: 25, avgHeartRateBpm: 128, peakHeartRateBpm: 145, recoveryHeartRateBpm: 102,
  heartRateSource: 'synthetic: example exercise replay, not a live sensor' };
const call = (mod, ctx, { method = 'GET', user = crewUser('c1'), body, query = {} } = {}) =>
  handleRequest(mod, ctx, { method, path: '/workouts', user, body, query });
const post = (mod, ctx, body = sample, user = crewUser('c1')) => call(mod, ctx, { method: 'POST', body, user });
async function setup() {
  const mod = createHealthModule();
  const ctx = makeTestContext({ now: '2026-11-14T07:43:00.000Z' });
  await mod.reset(ctx);
  return { mod, ctx };
}

test('workouts persist separately with server identity, completed mission day and source label', async () => {
  const { mod, ctx } = await setup();
  const initial = structuredClone(ctx.saved());
  const response = await post(mod, ctx);
  assert.equal(response.status, 201);
  const { workout } = response.body.data;
  assert.match(workout.id, /^workout_c1_/);
  assert.equal(workout.crewId, 'c1');
  assert.equal(workout.missionDay, 42);
  assert.equal(workout.avgHeartRateBpm, 128);
  assert.equal(workout.heartRateSource, sample.heartRateSource);
  assert.deepEqual(ctx.saved().crew.c1.baseline, initial.crew.c1.baseline);
  assert.deepEqual(ctx.saved().crew.c1.checkIns, initial.crew.c1.checkIns);
  assert.deepEqual(ctx.saved().source, initial.source);
  for (const id of ['c2', 'c3', 'c4', 'c5']) assert.deepEqual(ctx.saved().crew[id], initial.crew[id]);
  assert.deepEqual(ctx.events, [{ type: 'health.workout-saved', crewId: 'c1' }]);
  const restored = makeTestContext({ now: ctx.now(), state: JSON.parse(JSON.stringify(ctx.saved())) });
  assert.deepEqual((await call(createHealthModule(), restored)).body.data.workouts, [workout]);
  const daily = await handleRequest(mod, ctx, { method: 'GET', path: '/daily', user: medicalOfficer(), query: { crewId: 'c1' } });
  assert.equal(daily.body.data.status, 'no_check_in_today');
  assert.ok(daily.body.data.measures.every(row => row.today === null));
});

test('one-minute recovery may be null at Stop and cannot claim a future measurement', async () => {
  const { mod, ctx } = await setup();
  ctx.advance(-1.5);
  assert.equal(ctx.now(), sample.endedAt);
  assert.equal((await post(mod, ctx)).status, 400);
  const response = await post(mod, ctx, { ...sample, recoveryHeartRateBpm: null });
  assert.equal(response.status, 201);
  assert.equal(response.body.data.workout.recoveryHeartRateBpm, null);
  await mod.reset(ctx);
  ctx.advance(1);
  assert.equal((await post(mod, ctx)).status, 201);
});

test('bad or forged workout inputs fail without saving or emitting events', async () => {
  const { mod, ctx } = await setup();
  const initial = structuredClone(ctx.saved());
  for (const body of [null, [], {}, { ...sample, crewId: 'c2' }, { ...sample, missionDay: 43 },
    { ...sample, id: 'forged' }, { ...sample, kind: '' }, { ...sample, heartRateSource: ' ' },
    { ...sample, startedAt: '2026-11-14T09:40:00+02:00' }, { ...sample, startedAt: '2026-02-30T07:40:00Z' },
    { ...sample, startedAt: '2026-10-02T07:40:00Z' }, { ...sample, endedAt: sample.startedAt },
    { ...sample, endedAt: '2026-11-14T07:50:00Z' }, { ...sample, reps: -1 }, { ...sample, reps: 2.5 },
    { ...sample, avgHeartRateBpm: NaN }, { ...sample, peakHeartRateBpm: 127 },
    { ...sample, avgHeartRateBpm: null }, { ...sample, recoveryHeartRateBpm: '102' },
    { ...sample, peakHeartRateBpm: Infinity }]) {
    assert.equal((await post(mod, ctx, body)).status, 400, JSON.stringify(body));
  }
  assert.deepEqual(ctx.saved(), initial);
  assert.equal(ctx.events.length, 0);
});

test('workout permissions are own crew or the sole medical officer, never Earth', async () => {
  const { mod, ctx } = await setup();
  await post(mod, ctx);
  assert.equal((await call(mod, ctx, { query: { crewId: 'c2' } })).status, 403);
  assert.equal((await call(mod, ctx, { user: crewUser('c2') })).body.data.workouts.length, 0);
  assert.equal((await call(mod, ctx, { user: medicalOfficer(), query: { crewId: 'c1' } })).body.data.workouts.length, 1);
  for (const user of [null, earthUser(), { crewId: 'c1', role: 'medical_officer' }]) {
    assert.equal((await call(mod, ctx, { user })).status, user === null ? 401 : 403);
  }
  assert.equal((await post(mod, ctx, sample, medicalOfficer())).status, 403);
  assert.equal((await call(mod, ctx, { method: 'POST', body: sample, query: { crewId: 'c2' } })).status, 400);
});

test('concurrent retries save a workout once while another crew member is retained', async () => {
  const { mod, ctx } = await setup();
  const responses = await Promise.all([post(mod, ctx), post(mod, ctx, { ...sample, startedAt: '2026-11-14T07:40:00Z' }),
    post(mod, ctx, sample, crewUser('c2'))]);
  assert.deepEqual(responses.map(row => row.status), [201, 409, 201]);
  assert.equal(ctx.saved().crew.c1.workouts.length, 1);
  assert.equal(ctx.saved().crew.c2.workouts.length, 1);
  assert.equal(ctx.events.length, 2);
});

test('workout history is chronological, bounded by completed mission day, and hides future rows after a rewind', async () => {
  const { mod, ctx } = await setup();
  await post(mod, ctx);
  ctx.advance(1440);
  const later = { ...sample, startedAt: '2026-11-15T07:40:00Z', endedAt: '2026-11-15T07:41:30Z' };
  await post(mod, ctx, later);
  const history = (await call(mod, ctx)).body.data.workouts;
  assert.deepEqual(history.map(row => row.missionDay), [42, 43]);
  assert.equal((await call(mod, ctx, { query: { days: '1' } })).body.data.workouts.length, 1);
  ctx.advance(-1440);
  assert.deepEqual((await call(mod, ctx)).body.data.workouts.map(row => row.missionDay), [42]);
  for (const query of [{ days: '0' }, { days: '61' }, { days: '1.5' }, { other: 'x' }]) {
    assert.equal((await call(mod, ctx, { query })).status, 400);
  }
  await post(mod, ctx, { ...sample, kind: 'sit-ups', endedAt: '2026-11-14T07:41:30.500Z', recoveryHeartRateBpm: null });
  const wholeSecondClock = { ...ctx, now: () => '2026-11-14T07:41:30Z' };
  assert.deepEqual((await call(mod, wholeSecondClock)).body.data.workouts.map(row => row.endedAt), [sample.endedAt]);
});

test('cross-midnight workouts belong to the completion day; absence of recovery is explicit null', async () => {
  const { mod, ctx } = await setup();
  ctx.advance(24 * 60);
  const body = { ...sample, startedAt: '2026-11-14T23:59:30Z', endedAt: '2026-11-15T00:01:00Z', reps: 0 };
  delete body.recoveryHeartRateBpm;
  const response = await post(mod, ctx, body);
  assert.equal(response.status, 201);
  assert.equal(response.body.data.workout.missionDay, 43);
  assert.equal(response.body.data.workout.recoveryHeartRateBpm, null);
});

test('reset clears workout records, and earlier stored sessions are accepted without losing health history', async () => {
  const { mod, ctx } = await setup();
  const earlier = structuredClone(ctx.saved());
  for (const person of Object.values(earlier.crew)) delete person.workouts;
  const restored = makeTestContext({ now: ctx.now(), state: earlier });
  assert.deepEqual((await call(mod, restored)).body.data.workouts, []);
  assert.deepEqual(restored.saved(), earlier);
  assert.equal((await post(mod, restored)).status, 201);
  assert.deepEqual(restored.saved().crew.c1.baseline, earlier.crew.c1.baseline);
  await mod.reset(restored);
  assert.deepEqual((await call(mod, restored)).body.data.workouts, []);
});

test('failed workout persistence keeps saved state intact and sends no event', async () => {
  const { mod, ctx } = await setup();
  const before = structuredClone(ctx.saved());
  const failing = { ...ctx, log() {}, store: { load: async () => ctx.saved(), save: async () => { throw new Error('disk full'); } } };
  assert.equal((await post(mod, failing)).status, 500);
  assert.deepEqual(ctx.saved(), before);
  assert.equal(ctx.events.length, 0);
});
