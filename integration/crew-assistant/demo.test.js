import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDemoServer } from './demo.mjs';

const question = 'I feel worn down and out of sorts today. Can you help me make sense of it?';
const entry = { sleep_hours: 5.5, resting_heart_rate_bpm: 77, mood: 4, stress: 7, fatigue: 7 };

async function start(t, options) {
  const { server, cleanup } = await createDemoServer(options);
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

test('Petros history and interactive saves drive all four scripted replies', async t => {
  const request = await start(t, { demo: true, fetchOpenAI: () => assert.fail('Unexpected OpenAI request') });
  const before = await (await request('state')).json();
  assert.equal(before.checkIn, null);
  assert.equal(before.baselineDays, 7);
  assert.equal(before.health.sleep_hours.reference, 7.8);
  assert.deepEqual(before.health.sleep_hours.recent, [{ mission_day: 40, value: 5.9 }, { mission_day: 41, value: 5.6 }]);
  assert.equal((await request('compare', { message: question })).status, 409);
  assert.equal((await request('check-in', { ...entry, stress: 0 })).status, 400);
  assert.equal((await request('check-in', { ...entry, crew_id: 'c1' })).status, 400);
  const saved = await request('check-in', entry);
  assert.equal(saved.status, 201);
  assert.deepEqual((await saved.json()).checkIn, entry);
  assert.equal((await request('check-in', { ...entry, sleep_hours: 8 })).status, 400);
  const latest = await (await request('state')).json();
  assert.deepEqual(latest.health, before.health);
  assert.deepEqual(latest.checkIn, entry);

  const { mode, comparisons } = await (await request('compare', { message: question })).json();
  assert.equal(mode, 'demo');
  const replies = Object.fromEntries(comparisons.map(({ id, reply }) => [id, reply]));
  assert.doesNotMatch(replies.none, /5\.5|7\.8|7\/10/);
  assert.match(replies['check-in'], /5\.5 hours.*7\/10/);
  assert.doesNotMatch(replies['check-in'], /7\.8|day 41/);
  assert.match(replies.health, /5\.9 hours on day 40.*5\.6 hours on day 41.*7\.8 hours/);
  assert.doesNotMatch(replies.health, /5\.5|7\/10/);
  assert.match(replies.both, /5\.5 hours.*7\/10.*7\.8 hours.*2\.3 hours below/);
});

test('live adapter sends the same prompt and exact selected context, with missing values preserved', async t => {
  const generations = [];
  const request = await start(t, { apiKey: 'test-only', fetchOpenAI: async (url, options) => {
    const payload = JSON.parse(options.body);
    if (url.endsWith('/moderations')) return Response.json({ results: [{ categories: {
      'self-harm/intent': false, 'self-harm/instructions': false, 'illicit/violent': false,
    } }] });
    const context = JSON.parse(payload.instructions.split('Crew support context: ').at(-1));
    generations.push({ context, input: payload.input, store: payload.store });
    return Response.json({ status: 'completed', output: [{ type: 'message',
      content: [{ type: 'output_text', text: Object.keys(context).join(', ') || 'No context' }],
    }] });
  } });
  const sparse = { sleep_hours: 0, stress: 6 };
  assert.equal((await request('check-in', sparse)).status, 201);
  const { comparisons, mode } = await (await request('compare', { message: question, context: { injected: true } })).json();
  assert.equal(mode, 'live');
  assert.deepEqual(comparisons.map(item => item.reply), ['No context', 'checkIn', 'health', 'checkIn, health']);
  for (const { context, input, store } of generations) {
    assert.deepEqual(input, [{ role: 'user', content: question }]);
    assert.equal(store, false);
    if (context.checkIn) {
      assert.deepEqual(context.checkIn, { ...sparse, resting_heart_rate_bpm: null, mood: null, fatigue: null });
    }
    if (context.health) assert.deepEqual(Object.keys(context.health), ['sleep_hours', 'resting_heart_rate_bpm']);
    assert.equal(context.injected, undefined);
  }
  assert.equal(generations.length, 4);
});
