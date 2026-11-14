import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { handleRequest } from '../../../shared/contract/contract.js';
import { crewUser, makeTestContext, medicalOfficer } from '../../../shared/contract/testing.js';
import { createHealthModule } from './index.js';
import { createHealthClient, HealthApiError } from './client.js';

test('the browser adapter runs check-ins, clinician views, companion context and workouts over real HTTP', async t => {
  let mod = createHealthModule();
  let ctx = makeTestContext();
  const sessions = new Map([['crew-four', crewUser('c4')], ['crew-one', crewUser('c1')], ['medical-two', medicalOfficer()]]);
  // Disposable HTTP stand-in for zt's core, not another application server.
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const response = await handleRequest(mod, ctx, { method: req.method,
      path: url.pathname.slice('/api/health'.length),
      user: sessions.get(req.headers.authorization?.replace(/^Bearer /, '')) ?? null,
      query: Object.fromEntries(url.searchParams), body: raw ? JSON.parse(raw) : null });
    res.writeHead(response.status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response.body));
  });
  t.after(async () => {
    server.closeAllConnections();
    if (server.listening) await new Promise((accept, reject) => server.close(error => error ? reject(error) : accept()));
  });
  await new Promise((accept, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', accept);
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/health`;
  let token = 'crew-four';
  const client = createHealthClient({ token: () => token, baseUrl });
  const other = createHealthClient({ token: 'crew-one', baseUrl });
  assert.equal((await client.getToday()).checkIn, null);
  const posted = await client.submitCheckIn({ sleepHours: 4.6, restingHeartRateBpm: 63, mood: 6, stress: 4, fatigue: 4 });
  assert.equal(posted.today.crewId, 'c4');
  assert.ok(!('daily' in posted));
  assert.equal((await other.getToday()).checkedInToday, false);
  await assert.rejects(() => client.submitCheckIn({ sleepHours: 8 }),
    error => error instanceof HealthApiError && error.status === 409 && error.code === 'already_done');
  await assert.rejects(() => client.getDaily({ crewId: 'c4' }), error => error.status === 403);
  const context = await client.getCompanionContext();
  assert.deepEqual(Object.keys(context), ['today']);
  assert.deepEqual(Object.keys(context.today).sort(), ['checkIn', 'checkedInToday', 'crewId', 'missionDay']);
  assert.equal(context.today.checkIn.sleepHours, 4.6);
  // JSON round-trip and a new module/context simulate the core reloading its saved store.
  ctx = makeTestContext({ state: JSON.parse(JSON.stringify(ctx.saved())) });
  mod = createHealthModule();
  assert.deepEqual(await client.getToday(), posted.today);
  token = 'medical-two';
  assert.equal((await client.getDaily({ crewId: 'c4' })).status, 'changes_found');
  assert.equal((await client.getHistory({ crewId: 'c4', days: 1 })).checkIns.length, 1);
  assert.equal((await client.getWeekly({ crewId: 'c4' })).statistic, 'median');
  assert.equal((await client.getCrew()).crew.length, 5);
  await assert.rejects(() => client.getCompanionContext(), error => error.status === 403);
  token = 'crew-four';
  ctx.advance(13);
  const workout = { kind: 'push-ups', startedAt: '2026-11-14T07:40:00Z', endedAt: '2026-11-14T07:41:30Z',
    reps: 25, avgHeartRateBpm: 128, peakHeartRateBpm: 145, recoveryHeartRateBpm: 102,
    heartRateSource: 'synthetic: test replay' };
  const saved = await client.submitWorkout(workout);
  assert.equal(saved.workout.crewId, 'c4');
  assert.deepEqual((await client.getWorkouts()).workouts, [saved.workout]);
  assert.deepEqual((await other.getWorkouts()).workouts, []);
  await assert.rejects(() => other.getWorkouts({ crewId: 'c4' }), error => error.status === 403);
  token = 'medical-two';
  assert.equal((await client.getWorkouts({ crewId: 'c4', days: 7 })).workouts.length, 1);
  await mod.reset(ctx);
  token = 'crew-four';
  assert.equal((await client.getToday()).checkedInToday, false);
  assert.deepEqual((await client.getWorkouts()).workouts, []);
  token = '';
  await assert.rejects(() => client.getToday(), error => error.code === 'not_logged_in');
});

test('client keeps nulls and rejects non-finite numbers before a request', async () => {
  const calls = [];
  const client = createHealthClient({ token: 'example', fetchImpl: async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 201, json: async () => ({ ok: true, data: { saved: true } }) };
  } });
  await client.submitCheckIn({ sleepHours: null, mood: 7 });
  assert.deepEqual(JSON.parse(calls[0].options.body), { sleepHours: null, mood: 7 });
  assert.equal(calls[0].options.cache, 'no-store');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer example');
  assert.ok(!calls[0].url.includes('example'));
  for (const value of [NaN, Infinity, -Infinity]) {
    await assert.rejects(() => client.submitCheckIn({ sleepHours: value }), TypeError);
  }
  assert.equal(calls.length, 1);
});

test('client reads the current token each time and encodes query fields as data', async () => {
  let token = 'first';
  const calls = [];
  const client = createHealthClient({ token: () => token, fetchImpl: async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200, json: async () => ({ ok: true, data: {} }) };
  } });
  await client.getHistory({ crewId: 'c4&days=60', days: 1 });
  const query = new URL(calls[0].url, 'http://localhost').searchParams;
  assert.equal(query.get('crewId'), 'c4&days=60');
  assert.equal(query.get('days'), '1');
  token = 'second';
  await client.submitWorkout();
  assert.equal(calls[1].options.headers.Authorization, 'Bearer second');
  assert.equal(calls[1].options.method, 'POST');
});

test('client surfaces authorization/service errors and refuses malformed successful envelopes', async () => {
  for (const response of [
    { ok: false, status: 403, json: async () => ({ ok: false, error: { code: 'wrong_role', message: 'Role refused.' } }) },
    { ok: true, status: 200, json: async () => ({ result: {} }) },
    { ok: true, status: 200, json: async () => { throw new SyntaxError('not JSON'); } },
  ]) {
    const client = createHealthClient({ token: 'example', fetchImpl: async () => response });
    await assert.rejects(() => client.getToday(), error => error instanceof HealthApiError
      && error.status === response.status && error.code === (response.status === 403 ? 'wrong_role' : 'invalid_response'));
  }
  const networkFailure = new TypeError('connection unavailable');
  const client = createHealthClient({ token: 'example', fetchImpl: async () => { throw networkFailure; } });
  await assert.rejects(() => client.getToday(), error => error === networkFailure);
});
