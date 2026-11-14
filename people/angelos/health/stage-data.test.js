import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { handleRequest } from '../../../shared/contract/contract.js';
import { crewUser, makeTestContext, medicalOfficer } from '../../../shared/contract/testing.js';
import { createHealthModule } from './index.js';
import { referenceFor } from './analysis.js';

// Unchanged input snapshots from Petros PR #64, commit 1b736f5.
const fixtureUrl = new URL('./fixtures/stage-health.json', import.meta.url);
const scenarios = JSON.parse(await readFile(new URL('./fixtures/stage-scenarios.json', import.meta.url), 'utf8'));

for (const [crewId, scenario] of Object.entries(scenarios.cases)) {
  test(`aligned stage ${crewId}: expected changes, streaks, fixed reference and medical-only analysis`, async () => {
    const ctx = makeTestContext();
    const mod = createHealthModule({ fixtureUrl });
    await mod.reset(ctx);
    const before = structuredClone(ctx.saved());
    assert.equal(Object.values(before.crew).reduce((sum, person) => sum + person.baseline.length + person.checkIns.length, 0), 65);
    if (crewId === 'c4') assert.equal(referenceFor(before.crew.c4.baseline, 'sleepHours').normal, 6.8);
    if (crewId === 'c1') {
      for (const row of [...before.crew.c1.baseline, ...before.crew.c1.checkIns]) {
        assert.ok(row.sleepHours >= 6.6 && row.sleepHours <= 7);
        assert.ok(row.restingHeartRateBpm >= 52 && row.restingHeartRateBpm <= 55);
      }
    }
    if (crewId === 'c3') {
      assert.deepEqual(before.crew.c3.checkIns.filter(row => row.restingHeartRateBpm === null).map(row => row.missionDay), [39, 41]);
      assert.ok(before.crew.c3.checkIns.every(row => row.mood !== null && row.fatigue !== null));
    }
    const submitted = await handleRequest(mod, ctx, { method: 'POST', path: '/check-ins',
      user: crewUser(crewId), body: scenario.checkInBody });
    assert.equal(submitted.status, 201);
    assert.ok(!('daily' in submitted.body.data));
    const response = await handleRequest(mod, ctx, { method: 'GET', path: '/daily',
      user: medicalOfficer(), query: { crewId } });
    assert.equal(response.status, 200);
    const { measures } = response.body.data;
    if (crewId === 'c4') {
      assert.deepEqual(measures.filter(row => row.changed).map(row => row.measure), ['sleepHours']);
      assert.equal(measures.find(row => row.measure === 'sleepHours').daysInARow, 3);
    }
    if (crewId === 'c3') assert.equal(measures.find(row => row.measure === 'mood').daysInARow, 6);
    assert.deepEqual(measures.filter(row => row.changed).map(row => row.measure), scenario.expectedChangedMeasures);
    assert.deepEqual(measures.filter(row => row.today === null).map(row => row.measure), scenario.expectedMissingComparedMeasures);
    for (const row of measures.filter(row => row.changed)) {
      assert.equal(row.daysInARow, scenario.expectedDaysInARowByMeasure?.[row.measure] ?? scenario.expectedDaysInARow);
    }
    assert.equal(response.body.data.status, scenario.expectedChangedMeasures.length ? 'changes_found' : 'no_changes');
    assert.deepEqual(ctx.saved().crew[crewId].baseline, before.crew[crewId].baseline);
    for (const id of Object.keys(before.crew).filter(id => id !== crewId)) assert.deepEqual(ctx.saved().crew[id], before.crew[id]);
    for (const path of ['/daily', '/history', '/weekly']) {
      assert.equal((await handleRequest(mod, ctx, { method: 'GET', path, user: crewUser(crewId) })).status, 403);
    }
    await mod.reset(ctx);
    assert.deepEqual(ctx.saved(), before);
  });
}
