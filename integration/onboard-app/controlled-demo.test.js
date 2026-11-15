import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { controlledReply } from '../../people/potest/crew-support/controlled-replies.js';
import { createDemoCore } from './controlled-demo.js';
import modules from './modules.js';
import { presentationModules } from './presentation.js';
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

test('standard launch compares the crew histories with the same check-in and scripted prompts', async t => {
  const app = await boot(modules, { makeCore: createDemoCore, realNow: () => 0 });
  t.after(() => app.close());
  const mara = await app.login('c1');
  const chris = await app.login('c3');
  const officer = await app.login('c2', 'medical');
  const earth = await app.login(null, 'earth');
  const prior = dataOf(await app.call('GET', '/api/health/history?crewId=c3', { token: officer }));
  assert.deepEqual(prior.checkIns.slice(-4).map(row => row.sleepHours), [5.6, 5.2, 5, 4.8]);

  for (const token of [mara, chris]) {
    dataOf(await app.call('POST', '/api/health/check-ins', { token, body: checkIn }));
  }
  assert.match(dataOf(await send(app, chris, 'I feel tired.')).reply, /pattern of short sleep/);
  dataOf(await app.call('POST', '/api/pulsars/wellbeing', { token: chris, body: { missionDay: 42, answers } }));

  const reply = dataOf(await send(app, chris, opening)).reply;
  assert.match(reply, /short sleep.*difficulty concentrating.*loneliness/);
  assert.match(reply, /pattern of short sleep.*crew medical officer today/);
  assert.doesNotMatch(dataOf(await send(app, mara, opening)).reply, /difficulty concentrating|loneliness/);
  dataOf(await app.call('POST', '/api/pulsars/wellbeing', { token: mara, body: { missionDay: 42, answers } }));
  assert.match(dataOf(await send(app, mara, opening)).reply, /rough day.*quiet break/);
  assert.match(dataOf(await send(app, chris, next)).reply, /which noncritical duty can move/);
  for (const token of [mara, chris]) {
    assert.match(dataOf(await send(app, token, 'I feel disconnected from the crew.')).reply, /crewmate you trust/);
  }
  assert.match(dataOf(await send(app, chris, 'I miss talking with my family after dinner.')).reply, /crewmate you trust/);
  assert.match(dataOf(await send(app, chris, 'I am short of breath and stressed.')).reply, /medical officer.*now/);

  const today = await getToday(app, chris);
  assert.equal(dataOf(await send(app, chris, opening, {
    ...today, checkIn: { ...today.checkIn, sleepHours: 9 },
  })).reply, reply);
  for (const token of [mara, officer, earth]) assert.equal((await send(app, token, opening, today)).status, 403);
});

test('normal startup upgrades the original synthetic history while keeping saved check-ins, answers and journal', async () => {
  const realNow = () => 0;
  const previous = await boot(modules, { realNow });
  let chris;
  let officer;
  let originalHistory;
  try {
    chris = await previous.login('c3');
    officer = await previous.login('c2', 'medical');
    dataOf(await previous.call('POST', '/api/health/check-ins', { token: chris, body: checkIn }));
    dataOf(await previous.call('POST', '/api/pulsars/wellbeing', { token: chris, body: { missionDay: 42, answers } }));
    dataOf(await previous.call('POST', '/api/mind/journal', { token: chris, body: { text: 'Keep this entry' } }));
    originalHistory = dataOf(await previous.call('GET', '/api/health/history?crewId=c3', { token: officer }));
  } finally {
    await previous.close({ keepData: true });
  }

  const options = { dataDir: previous.dataDir, makeCore: createDemoCore, realNow };
  const getHistory = async app => dataOf(await app.call('GET', '/api/health/history?crewId=c3', { token: officer }));
  const upgraded = await boot(modules, options);
  try {
    assert.equal((await getToday(upgraded, chris)).checkIn.sleepHours, 4.6);
    assert.deepEqual(dataOf(await upgraded.call('GET', '/api/pulsars/me', { token: chris })).wallet.todayAnswers, answers);
    assert.equal(dataOf(await upgraded.call('GET', '/api/mind/journal', { token: chris })).entries[0].text, 'Keep this entry');
    const history = await getHistory(upgraded);
    assert.deepEqual(history.baseline, originalHistory.baseline);
    assert.deepEqual(history.checkIns.filter(row => row.missionDay < 38 || row.missionDay > 41),
      originalHistory.checkIns.filter(row => row.missionDay < 38 || row.missionDay > 41));
    assert.deepEqual(history.checkIns.filter(row => row.missionDay >= 38 && row.missionDay <= 41).map(row => row.sleepHours),
      [5.6, 5.2, 5, 4.8]);
    assert.match(dataOf(await send(upgraded, chris, opening)).reply, /pattern of short sleep/);
  } finally {
    await upgraded.close({ keepData: true });
  }

  const restarted = await boot(modules, options);
  try {
    assert.deepEqual((await getHistory(restarted)).checkIns.filter(row => row.missionDay >= 38 && row.missionDay <= 41)
      .map(row => row.sleepHours), [5.6, 5.2, 5, 4.8]);
    assert.equal((await getToday(restarted, chris)).checkIn.sleepHours, 4.6);
    assert.deepEqual(dataOf(await restarted.call('GET', '/api/pulsars/me', { token: chris })).wallet.todayAnswers, answers);
    assert.match(dataOf(await send(restarted, chris, opening)).reply, /pattern of short sleep/);
  } finally {
    await restarted.close();
  }
});

test('startup leaves a customized synthetic record alone even when the original source matches', async () => {
  const realNow = () => 0;
  const previous = await boot(modules, { realNow });
  const officer = await previous.login('c2', 'medical');
  const chris = await previous.login('c3');
  dataOf(await previous.call('POST', '/api/health/check-ins', { token: chris, body: checkIn }));
  await previous.close({ keepData: true });

  const healthFile = join(previous.dataDir, 'health.json');
  const customized = JSON.parse(await readFile(healthFile, 'utf8'));
  customized.crew.c3.checkIns.find(row => row.missionDay === 38).sleepHours = 8;
  await writeFile(healthFile, JSON.stringify(customized), 'utf8');

  const app = await boot(modules, { makeCore: createDemoCore, dataDir: previous.dataDir, realNow });
  try {
    const history = dataOf(await app.call('GET', '/api/health/history?crewId=c3', { token: officer }));
    assert.equal(history.checkIns.find(row => row.missionDay === 38).sleepHours, 8);
    assert.equal(history.checkIns.find(row => row.missionDay === 39).sleepHours, 6.9);
    assert.doesNotMatch(dataOf(await send(app, chris, opening)).reply, /pattern of short sleep/);
  } finally {
    await app.close();
  }
});

test('the onboard companion joins identical current answers to different crew histories', async t => {
  const app = await boot(modules, { makeCore: createDemoCore, realNow: () => 0 });
  t.after(() => app.close());
  const mara = await app.login('c1');
  const chris = await app.login('c3');
  const officer = await app.login('c2', 'medical');
  const earth = await app.login(null, 'earth');
  const history = async crewId => dataOf(await app.call('GET', '/api/health/history?crewId=' + crewId, { token: officer })).checkIns;
  assert.ok((await history('c1')).slice(-4).every(row => row.sleepHours >= 6 && row.stress < 7 && row.fatigue < 7));
  assert.deepEqual((await history('c3')).slice(-4).map(row => row.sleepHours), [5.6, 5.2, 5, 4.8]);
  assert.equal((await app.call('GET', '/controlled-demo.js')).status, 404);
  assert.equal((await app.call('GET', '/people/potest/crew-support/controlled-replies.js')).status, 404);
  assert.equal((await app.call('GET', '/controlled-health-fixture.json')).status, 404);

  for (const token of [mara, chris]) {
    assert.equal((await getToday(app, token)).checkedInToday, false);
    assert.match(dataOf(await send(app, token, opening)).reply, /complete today’s check-in/);
    dataOf(await app.call('POST', '/api/health/check-ins', { token, body: checkIn }));
    assert.doesNotMatch(dataOf(await send(app, token, opening)).reply, /loneliness/);
    dataOf(await app.call('POST', '/api/pulsars/wellbeing', { token, body: { missionDay: 42, answers } }));
  }

  const firstMara = dataOf(await send(app, mara, opening)).reply;
  const firstChris = dataOf(await send(app, chris, opening)).reply;
  assert.match(firstMara, /short sleep.*high stress.*fatigue.*difficulty concentrating.*loneliness/);
  assert.match(firstMara, /rough day.*quiet break/);
  assert.match(firstChris, /pattern of short sleep, high stress, and fatigue.*crew medical officer today/);
  assert.doesNotMatch(firstMara, /pattern|medical officer/);
  assert.doesNotMatch(firstChris, /4\.8|5\.6|reference|days in a row|baseline/);
  assert.match(dataOf(await send(app, mara, next)).reply, /log it in your next check-in/);
  assert.match(dataOf(await send(app, chris, next)).reply, /which noncritical duty can move/);
  assert.match(dataOf(await send(app, chris, 'I feel disconnected from the crew.')).reply, /crewmate you trust/);
  assert.equal(dataOf(await send(app, chris, opening)).reply, firstChris);

  const today = await getToday(app, chris);
  for (const token of [mara, officer, earth]) assert.equal((await send(app, token, opening, today)).status, 403);
  const fabricated = { ...today, checkIn: { ...today.checkIn, sleepHours: 9 } };
  assert.equal(dataOf(await send(app, chris, opening, fabricated)).reply, firstChris);
  assert.equal((await send(app, chris, opening, { ...today, missionDay: 41 })).status, 400);
  assert.match(dataOf(await send(app, chris, 'I am short of breath and stressed.')).reply, /medical officer.*now/);

  dataOf(await app.call('POST', '/api/demo/reset', { token: chris, body: {} }));
  assert.equal((await getToday(app, chris)).checkedInToday, false);
  assert.match(dataOf(await send(app, chris, opening)).reply, /complete today’s check-in/);
  assert.deepEqual((await history('c3')).slice(-4).map(row => row.sleepHours), [5.6, 5.2, 5, 4.8]);
});

test('standard and presentation registries give identical companion replies with identical saved context', async t => {
  const collect = async registry => {
    const app = await boot(registry, { makeCore: createDemoCore, realNow: () => 0 });
    t.after(() => app.close());
    const results = [];
    for (const crewId of ['c1', 'c3']) {
      const token = await app.login(crewId);
      results.push(dataOf(await send(app, token, opening)));
      dataOf(await app.call('POST', '/api/health/check-ins', { token, body: checkIn }));
      dataOf(await app.call('POST', '/api/pulsars/wellbeing', { token, body: { missionDay: 42, answers } }));
      for (const prompt of [opening, next, 'I feel disconnected from the crew.',
        'I miss talking with my family after dinner.', 'Can you help with medication?',
        'I am short of breath.', 'Thanks, that helps.']) {
        results.push(dataOf(await send(app, token, prompt)));
      }
    }
    return results;
  };
  const [standard, presentation] = await Promise.all([collect(modules), collect(presentationModules(modules))]);
  assert.deepEqual(standard, presentation);
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
