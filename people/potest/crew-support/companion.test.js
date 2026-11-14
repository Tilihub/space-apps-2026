import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHealthModule } from '../../angelos/health/index.js';
import { handleRequest } from '../../../shared/contract/contract.js';
import { crewUser, earthUser, makeTestContext, medicalOfficer } from '../../../shared/contract/testing.js';
import { createCompanionClient } from './companion-client.js';
import { companionRoute } from './companion.js';

const mind = { name: 'mind', routes: [companionRoute] };
const message = 'I feel worn down today.';

test('companion uses the latest own check-in and clears it on day change and reset', async () => {
  const health = createHealthModule();
  const ctx = makeTestContext();
  const sessions = { 'first-demo-session': crewUser('c1'), 'second-demo-session': crewUser('c4') };
  let token = 'first-demo-session';
  const requests = [];
  const client = createCompanionClient({
    getToken: () => token,
    async fetchImpl(url, { method, headers, body }) {
      requests.push(url);
      const user = sessions[headers.Authorization.slice('Bearer '.length)];
      const mod = url.startsWith('/api/health/') ? health : mind;
      const response = await handleRequest(mod, ctx, {
        method, path: url.slice(`/api/${mod.name}`.length), user, body: body ? JSON.parse(body) : null,
      });
      return Response.json(response.body, { status: response.status });
    },
  });
  async function checkIn(crewId, body) {
    const result = await handleRequest(health, ctx, {
      method: 'POST', path: '/check-ins', user: crewUser(crewId), body,
    });
    assert.equal(result.status, 201);
  }

  const missing = await client.send(message);
  assert.match(missing.reply, /don’t have a check-in from you today/);
  assert.deepEqual(missing.links, [{ screen: 'checkin' }]);
  await checkIn('c1', { sleepHours: 0, stress: 3 });
  await checkIn('c4', { mood: 6, fatigue: 7 });
  const first = await client.send(message);
  assert.match(first.reply, /0 hours of sleep, stress at 3\/10/);
  assert.match(first.reply, /protecting your next sleep block/);

  token = 'second-demo-session';
  const second = await client.send(message);
  assert.match(second.reply, /mood at 6\/10, fatigue at 7\/10/);
  assert.doesNotMatch(second.reply, /hours of sleep|stress at 3\/10|protecting your next sleep block/);

  await health.reset(ctx);
  assert.match((await client.send(message)).reply, /don’t have a check-in/);
  await checkIn('c4', { restingHeartRateBpm: 60 });
  assert.match((await client.send(message)).reply, /no sleep, mood, stress or fatigue entries/);
  ctx.advance(24 * 60);
  assert.match((await client.send(message)).reply, /don’t have a check-in/);

  assert.deepEqual([...new Set(requests)], ['/api/health/today', '/api/mind/companion']);
  assert.ok(ctx.events.every(event => event.type === 'health.check-in-saved'));
});

test('companion refuses wrong roles, another crew member, stale entries and care-only fields', async () => {
  const ctx = makeTestContext();
  const blank = { crewId: 'c1', missionDay: ctx.missionDay(), checkedInToday: false, checkIn: null };
  const call = (user, today = blank, extra = {}) => handleRequest(mind, ctx, {
    method: 'POST', path: '/companion', user, body: { message, context: { today, ...extra } },
  });
  assert.equal((await call(null)).status, 401);
  for (const role of [medicalOfficer(), earthUser(), crewUser('c4')]) {
    assert.equal((await call(role)).status, 403);
  }
  const author = crewUser('c1');
  const entry = { id: 'health_example', crewId: 'c4', missionDay: ctx.missionDay(), recordedAt: ctx.now() };
  assert.equal((await call(author, { ...blank, checkedInToday: true, checkIn: entry })).status, 403);
  assert.equal((await call(author, { ...blank, missionDay: ctx.missionDay() - 1 })).status, 400);
  assert.equal((await call(author, blank, { history: [] })).status, 400);
  assert.equal((await call(author, { ...blank, baseline: [] })).status, 400);
  assert.deepEqual(ctx.events, []);
  assert.equal(ctx.saved(), null);
});

test('the browser discards pending context or replies when the session changes', async () => {
  let token = 'first-demo-session';
  const today = { crewId: 'c1', missionDay: 42, checkedInToday: false, checkIn: null };
  const envelope = data => Response.json({ ok: true, data });
  const client = createCompanionClient({
    getToken: () => token,
    async fetchImpl(url) {
      assert.equal(url, '/api/health/today');
      token = 'second-demo-session';
      return envelope(today);
    },
  });
  await assert.rejects(client.send(message), { code: 'session_changed' });

  const resetClient = createCompanionClient({
    getToken: () => 'first-demo-session',
    async fetchImpl(url) {
      if (url === '/api/health/today') return envelope(today);
      resetClient.clearSession();
      return envelope({ reply: 'A reply from the prior session.', links: [] });
    },
  });
  await assert.rejects(resetClient.send(message), { code: 'session_changed' });
});
