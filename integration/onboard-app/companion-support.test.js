import test from 'node:test';
import assert from 'node:assert/strict';
import modules from './modules.js';
import { boot, dataOf } from './test-helpers.js';
import { supportContextFor } from './adapters/companion-support.js';

async function send(app, token, message, context) {
  const today = context ?? dataOf(await app.call('GET', '/api/health/today', { token }));
  return app.call('POST', '/api/mind/companion', { token, body: { message, context: { today } } });
}

test('offline tool joins own current check-in, Petros history and Angelos rules without disclosing clinical comparisons', async () => {
  const app = await boot(modules, { realNow: () => 0 });
  try {
    const c4 = await app.login('c4'), c1 = await app.login('c1');
    for (const [token, sleepHours] of [[c4, 4.6], [c1, 7.2]]) dataOf(await app.call('POST', '/api/health/check-ins', {
      token, body: { sleepHours, mood: 6, stress: 4, fatigue: 4 },
    }));
    const today = dataOf(await app.call('GET', '/api/health/today', { token: c4 }));
    const context = supportContextFor(today);
    assert.equal(context.sleepHistory.reference, 6.8);
    assert.equal(context.shortSleepDays, 2);
    const first = dataOf(await send(app, c4, 'I feel worn down and tired today.'));
    assert.match(first.reply, /4.6 hours of sleep/);
    assert.match(first.reply, /protect your next sleep block/);
    assert.doesNotMatch(first.reply, /6\.8|day 40|day 41|reference|nights in a row|baseline/);
    const second = dataOf(await send(app, c4, 'I still feel tired.'));
    assert.notEqual(first.reply, second.reply);
    assert.match(second.reply, /breathing/);
    const third = dataOf(await send(app, c4, 'What should I do about my sleep?'));
    assert.notEqual(second.reply, third.reply);
    assert.match(third.reply, /next check-in/);
    const usual = dataOf(await send(app, c1, 'I feel tired.'));
    assert.doesNotMatch(usual.reply, /4.6|protect your next sleep block|nights in a row/);
    assert.match(usual.reply, /7.2/);
    assert.equal((await app.call('GET', '/api/health/history', { token: c4 })).status, 403);
  } finally { await app.close(); }
});

test('topic changes use Potest support replies, Greek keywords and distinct next turns; journal is never read', async () => {
  const app = await boot(modules, { realNow: () => 0 });
  try {
    const token = await app.login('c4');
    dataOf(await app.call('POST', '/api/mind/journal', { token, body: { text: 'PRIVATE SENTINEL NOT FOR THE COMPANION' } }));
    const first = dataOf(await send(app, token, 'I miss talking with my family after dinner.'));
    const next = dataOf(await send(app, token, 'Evenings are the hardest.'));
    assert.match(first.reply, /far from home/);
    assert.match(next.reply, /connection/);
    assert.notEqual(first.reply, next.reply);
    const stress = dataOf(await send(app, token, 'I feel stressed and cannot switch off.'));
    assert.match(stress.reply, /breathing/);
    assert.doesNotMatch(stress.reply, /PRIVATE SENTINEL|far from home/);
    const greek = dataOf(await send(app, token, '\u03bc\u03bf\u03c5 \u03bb\u03b5\u03b9\u03c0\u03b5\u03b9 \u03b7 \u03bf\u03b9\u03ba\u03bf\u03b3\u03b5\u03bd\u03b5\u03b9\u03b1 \u03bc\u03bf\u03c5'));
    assert.match(greek.reply, /put this into words/);
    const urgent = dataOf(await send(app, token, 'I have chest pain.'));
    assert.match(urgent.reply, /medical officer.*now/);
    assert.ok(!JSON.stringify(dataOf(await app.call('GET', '/api/events', { token }))).includes('PRIVATE SENTINEL'));
  } finally { await app.close(); }
});

test('contextual route keeps original author/day/role guards and forgets turn counters on reset', async () => {
  const app = await boot(modules, { realNow: () => 0 });
  try {
    const own = await app.login('c4'), other = await app.login('c1'), medical = await app.login('c2', 'medical'), earth = await app.login(null, 'earth');
    const today = dataOf(await app.call('GET', '/api/health/today', { token: own }));
    for (const token of [other, medical, earth]) assert.equal((await send(app, token, 'I feel tired.', today)).status, 403);
    assert.equal((await send(app, own, 'I feel tired.', { ...today, missionDay: 41 })).status, 400);
    const first = dataOf(await send(app, own, 'I miss home.')).reply;
    assert.notEqual(dataOf(await send(app, own, 'I miss home.')).reply, first);
    dataOf(await app.call('POST', '/api/demo/reset', { token: own, body: {} }));
    assert.equal(dataOf(await send(app, own, 'I miss home.')).reply, first);
    dataOf(await app.call('POST', '/api/clock/advance', { token: own, body: { minutes: 1440 } }));
    const nextDay = dataOf(await app.call('GET', '/api/health/today', { token: own }));
    assert.equal(supportContextFor(nextDay).shortSleepDays, 0);
  } finally { await app.close(); }
});
