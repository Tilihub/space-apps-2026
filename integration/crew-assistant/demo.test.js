import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDemoServer } from './demo.mjs';
import { getComparisonReply } from './replies.mjs';

const entry = { sleep_hours: 5.5, resting_heart_rate_bpm: 77, mood: 4, stress: 7, fatigue: 7 };

async function start(t) {
  const { server, cleanup } = await createDemoServer();
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    await cleanup();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  return (path, data) => fetch(`${base}/api/crew-assistant/${path}`, data === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
}

test('only the reply with context uses today’s check-in and earlier sleep history', async t => {
  const request = await start(t);
  const before = await (await request('state')).json();
  assert.equal(before.checkIn, null);
  assert.equal(before.baselineDays, 7);
  assert.equal(before.health.sleep_hours.reference, 7.8);
  assert.deepEqual(before.health.sleep_hours.recent, [{ mission_day: 40, value: 5.9 }, { mission_day: 41, value: 5.6 }]);
  assert.equal(before.shortSleepDays, 2);
  assert.equal((await request('compare')).status, 409);
  assert.equal((await request('check-in', { ...entry, stress: 0 })).status, 400);
  assert.equal((await request('check-in', { ...entry, crew_id: 'c1' })).status, 400);
  const saved = await request('check-in', entry);
  assert.equal(saved.status, 201);
  assert.deepEqual((await saved.json()).checkIn, entry);
  assert.equal((await request('check-in', { ...entry, sleep_hours: 8 })).status, 400);
  const latest = await (await request('state')).json();
  assert.deepEqual(latest.health, before.health);
  assert.equal(latest.shortSleepDays, before.shortSleepDays);
  assert.deepEqual(latest.checkIn, entry);

  const replies = await (await request('compare')).json();
  assert.deepEqual(Object.keys(replies), ['noContext', 'withContext']);
  assert.match(replies.noContext, /hardest to get through today/);
  assert.doesNotMatch(replies.noContext, /5\.5|7\.8|7\/10|in a row|medical officer/);
  assert.match(replies.withContext, /5\.5 hours.*7\/10/);
  assert.match(replies.withContext, /7\.8 hours for 2 nights in a row.*5\.9 hours on day 40.*5\.6 hours on day 41/);
  assert.match(replies.withContext, /crew medical officer/);
});

test('one short historical night and a current short night do not trigger the repeated sleep pattern', () => {
  const reply = getComparisonReply({
    checkIn: { sleep_hours: 0, stress: null },
    sleepHistory: { reference: 7.8, recent: [{ mission_day: 41, value: 5.6 }] },
    shortSleepDays: 1,
  });
  assert.match(reply, /0 hours of sleep/);
  assert.doesNotMatch(reply, /stress|7\.8|in a row|medical officer/);
  assert.match(reply, /hardest to get through today/);
});
