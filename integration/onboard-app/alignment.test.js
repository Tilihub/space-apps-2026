// @ts-check
// Checks that teammates' finished modules run inside this core unchanged, over real HTTP:
// angelos's health and dadis2's meds, with petros's day-42 data. This is wave 1, steps 2 and 3
// of the contract (section 12), without the pages. If a teammate changes their module and
// this fails, the core and that module no longer fit together.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import health from '../../people/angelos/health/index.js';
import meds from '../../people/dadis2/meds/index.js';
import { boot, dataOf } from './test-helpers.js';

const scenarios = JSON.parse(
  await readFile(new URL('../../people/petros_the_space_larper/demo-data/scenarios.json', import.meta.url), 'utf8'),
);

test('health and meds run in the core: Tomas checks in and reports a headache, Leo sees his analysis', async () => {
  const app = await boot([health, meds]);
  try {
    const tomas = await app.login('c4');
    const leo = await app.login('c2', 'medical');

    // Step 2: Tomas checks in with petros's day-42 values ("I'm fine": slept 4.6 h, mood 6).
    const checkIn = await app.call('POST', '/api/health/check-ins', { token: tomas, body: scenarios.cases.c4.checkInBody });
    assert.equal(checkIn.status, 201, JSON.stringify(checkIn.body));
    assert.equal(checkIn.body.data.checkIn.missionDay, 42);
    assert.equal((await app.call('POST', '/api/health/check-ins', { token: tomas, body: scenarios.cases.c4.checkInBody })).body.error.code, 'already_done');

    // Leo sees sleep under Tomas's normal, 3 days in a row. Tomas himself is refused.
    const daily = dataOf(await app.call('GET', '/api/health/daily?crewId=c4', { token: leo }));
    assert.deepEqual(daily.measures.filter((/** @type {any} */ m) => m.changed).map((/** @type {any} */ m) => m.measure), ['sleepHours']);
    assert.equal(daily.measures.find((/** @type {any} */ m) => m.measure === 'sleepHours').daysInARow, 3);
    assert.equal((await app.call('GET', '/api/health/daily', { token: tomas })).body.error.code, 'wrong_role');
    const today = dataOf(await app.call('GET', '/api/health/today', { token: tomas }));
    assert.equal(today.checkedInToday, true); // his Home shows today's check-in as done
    assert.ok(!('measures' in today), 'the astronaut never gets the detailed analysis');

    // Step 3: a headache offers acetaminophen; ibuprofen and aspirin are blocked by his NSAID allergy.
    const report = dataOf(await app.call('POST', '/api/meds/symptom-reports', {
      token: tomas,
      body: { symptoms: [{ code: 'headache', severity: 5 }], note: null, vitals: { temperatureC: 36.8, spo2Pct: 98 } },
    }));
    assert.equal(report.suggestions[0].itemId, 'acetaminophen-325');
    assert.deepEqual(report.blocked.map((/** @type {any} */ b) => b.itemId).sort(), ['aspirin-325', 'ibuprofen-400']);

    // Both modules' events reach the pages through the core, with no content in them.
    const { events } = dataOf(await app.call('GET', '/api/events', { token: leo }));
    assert.deepEqual(
      events.map((/** @type {any} */ e) => [e.type, e.crewId]),
      [['health.check-in-saved', 'c4'], ['meds.symptom-reported', 'c4']],
    );

    // Reset demo resets both: Tomas can check in for day 42 again.
    dataOf(await app.call('POST', '/api/demo/reset', { token: leo }));
    assert.equal((await app.call('POST', '/api/health/check-ins', { token: tomas, body: scenarios.cases.c4.checkInBody })).status, 201);
  } finally {
    await app.close();
  }
});
