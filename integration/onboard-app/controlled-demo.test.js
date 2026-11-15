import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import test from 'node:test';
import { controlledReply } from '../../people/potest/crew-support/controlled-replies.js';
import { createControlledCore, createControlledRun } from './controlled-demo.js';
import modules from './modules.js';
import { boot, dataOf } from './test-helpers.js';

const opening = 'I am not feeling very well today.';
const next = 'What should I do next?';
const checkIn = { sleepHours: 4.6, mood: 5, stress: 7, fatigue: 7 };
const answers = { mood: 5, stress: 7, fatigue: 7, worry: 5, focus: 4, motivation: 5,
  loneliness: 7, connection: 5, workload: 6, mentalRest: 5 };

async function getToday(app, token) {
  return dataOf(await app.call('GET', '/api/health/today', { token }));
}

async function send(app, token, message, today) {
  return app.call('POST', '/api/mind/companion', {
    token, body: { message, context: { today: today ?? await getToday(app, token) } },
  });
}

test('controlled rehearsal joins the same current answers to different crew histories through HTTP', async t => {
  const app = await boot(modules, { makeCore: createControlledCore, realNow: () => 0 });
  t.after(() => app.close());
  const mara = await app.login('c1');
  const tomas = await app.login('c4');
  const officer = await app.login('c2', 'medical');
  const earth = await app.login(null, 'earth');
  const history = async crewId => dataOf(await app.call('GET', '/api/health/history?crewId=' + crewId, { token: officer })).checkIns;
  assert.ok((await history('c1')).slice(-4).every(row => row.sleepHours >= 6 && row.stress < 7 && row.fatigue < 7));
  assert.deepEqual((await history('c4')).slice(-4).map(row => row.sleepHours), [5.6, 5.2, 5, 4.8]);
  assert.equal((await app.call('GET', '/controlled-demo.js')).status, 404);
  assert.equal((await app.call('GET', '/people/potest/crew-support/controlled-replies.js')).status, 404);
  assert.equal((await app.call('GET', '/controlled-health-fixture.json')).status, 404);

  for (const token of [mara, tomas]) {
    assert.equal((await getToday(app, token)).checkedInToday, false);
    assert.match(dataOf(await send(app, token, opening)).reply, /complete today’s check-in/);
    dataOf(await app.call('POST', '/api/health/check-ins', { token, body: checkIn }));
    assert.doesNotMatch(dataOf(await send(app, token, opening)).reply, /loneliness/);
    dataOf(await app.call('POST', '/api/pulsars/wellbeing', { token, body: { missionDay: 42, answers } }));
  }

  const firstMara = dataOf(await send(app, mara, opening)).reply;
  const firstTomas = dataOf(await send(app, tomas, opening)).reply;
  assert.match(firstMara, /short sleep.*high stress.*fatigue.*difficulty concentrating.*loneliness/);
  assert.match(firstMara, /rough day.*quiet break/);
  assert.match(firstTomas, /pattern of short sleep, high stress, and fatigue.*crew medical officer today/);
  assert.doesNotMatch(firstMara, /pattern|medical officer/);
  assert.doesNotMatch(firstTomas, /4\.8|5\.6|reference|days in a row|baseline/);
  assert.match(dataOf(await send(app, mara, next)).reply, /log it in your next check-in/);
  assert.match(dataOf(await send(app, tomas, next)).reply, /which noncritical duty can move/);
  assert.match(dataOf(await send(app, tomas, 'I feel disconnected from the crew.')).reply, /crewmate you trust/);
  assert.equal(dataOf(await send(app, tomas, opening)).reply, firstTomas);

  const today = await getToday(app, tomas);
  for (const token of [mara, officer, earth]) assert.equal((await send(app, token, opening, today)).status, 403);
  const fabricated = { ...today, checkIn: { ...today.checkIn, sleepHours: 9 } };
  assert.equal(dataOf(await send(app, tomas, opening, fabricated)).reply, firstTomas);
  assert.equal((await send(app, tomas, opening, { ...today, missionDay: 41 })).status, 400);
  assert.match(dataOf(await send(app, tomas, 'I am short of breath and stressed.')).reply, /medical officer.*now/);

  dataOf(await app.call('POST', '/api/demo/reset', { token: tomas, body: {} }));
  assert.equal((await getToday(app, tomas)).checkedInToday, false);
  assert.match(dataOf(await send(app, tomas, opening)).reply, /complete today’s check-in/);
  assert.deepEqual((await history('c4')).slice(-4).map(row => row.sleepHours), [5.6, 5.2, 5, 4.8]);
});

test('each of the ten ratings can independently change the reply and respects its scale direction', () => {
  const cases = {
    mood: [4, 5, 'low mood'], stress: [7, 6, 'high stress'], fatigue: [7, 6, 'fatigue'],
    worry: [7, 6, 'worry'], focus: [4, 5, 'difficulty concentrating'],
    motivation: [4, 5, 'low motivation'], loneliness: [7, 6, 'loneliness'],
    connection: [4, 5, 'feeling less supported by the crew'], workload: [7, 6, 'a demanding workload'],
    mentalRest: [4, 5, 'feeling mentally worn out'],
  };
  const today = { missionDay: 42, checkedInToday: true, checkIn: {} };
  for (const [key, [flagged, usual, label]] of Object.entries(cases)) {
    const sample = value => controlledReply({ message: opening, today, history: [], answers: { [key]: value } }).reply;
    assert.ok(sample(flagged).includes(label), key);
    assert.ok(!sample(usual).includes(label), key);
    assert.ok(!sample(null).includes(label), key);
  }
});

test('relaunching the controlled demo clears sessions, clock, check-ins, rewards and journal', async () => {
  const realNow = () => 0;
  const ordinary = await boot(modules, { realNow });
  try {
    const ordinaryToken = await ordinary.login('c4');
    dataOf(await ordinary.call('POST', '/api/health/check-ins', { token: ordinaryToken, body: checkIn }));
    const options = { makeCore: createControlledRun, dataDir: ordinary.dataDir, realNow };
    const first = await boot(modules, options);
    let oldToken;
    try {
      oldToken = await first.login('c4');
      dataOf(await first.call('POST', '/api/health/check-ins', { token: oldToken, body: checkIn }));
      const award = dataOf(await first.call('POST', '/api/pulsars/wellbeing', { token: oldToken, body: { missionDay: 42, answers } }));
      assert.equal(award.wallet.balance, 100);
      dataOf(await first.call('POST', '/api/mind/journal', { token: oldToken, body: { text: 'Previous rehearsal' } }));
      dataOf(await first.call('POST', '/api/clock/advance', { token: oldToken, body: { minutes: 1440 } }));
    } finally {
      await first.close({ keepData: true });
    }
    assert.ok(!(await readdir(ordinary.dataDir)).some(file => file.startsWith('pulse-controlled-')));

    const second = await boot(modules, options);
    try {
      assert.equal((await second.call('GET', '/api/session', { token: oldToken })).status, 401);
      const token = await second.login('c4');
      assert.equal(dataOf(await second.call('GET', '/api/clock', { token })).missionDay, 42);
      assert.match(dataOf(await second.call('GET', '/api/clock', { token })).now, /T07:30:00\.000Z$/);
      assert.equal((await getToday(second, token)).checkIn, null);
      assert.equal(dataOf(await second.call('GET', '/api/pulsars/me', { token })).wallet.balance, 0);
      assert.deepEqual(dataOf(await second.call('GET', '/api/mind/journal', { token })).entries, []);
      assert.equal((await getToday(ordinary, ordinaryToken)).checkIn.sleepHours, 4.6);
    } finally {
      await second.close({ keepData: true });
    }
  } finally {
    await ordinary.close();
  }
});

test('repeated short sleep needs four consecutive earlier nights and a short night today', () => {
  const row = (missionDay, sleepHours = 5) => ({ missionDay, sleepHours });
  const four = [38, 39, 40, 41].map(day => row(day));
  const reply = (history, sleepHours) => controlledReply({
    message: opening, today: { missionDay: 42, checkedInToday: true, checkIn: { sleepHours } }, history, answers: null,
  }).reply;
  const recurrence = /pattern of short sleep/;
  assert.match(reply(four, 4.6), recurrence);
  assert.doesNotMatch(reply([...four.slice(1), row(42)], 4.6), recurrence);
  assert.doesNotMatch(reply([row(37), row(38), row(40), row(41)], 4.6), recurrence);
  assert.doesNotMatch(reply([...four.slice(0, -1), row(41, null)], 4.6), recurrence);
  assert.doesNotMatch(reply([...four.slice(0, -1), row(41, 6)], 4.6), recurrence);
  assert.doesNotMatch(reply(four, 6), recurrence);
  assert.doesNotMatch(reply(four, null), recurrence);
});
