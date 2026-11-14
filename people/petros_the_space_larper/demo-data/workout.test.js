import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createHealthModule } from '../../angelos/health/index.js';
import { DEMO_START, handleRequest } from '../../../shared/contract/contract.js';
import { crewUser, makeTestContext } from '../../../shared/contract/testing.js';
import { getDailyWorkout } from './workout-program.js';
import { createWorkoutController } from './workout-session.js';

const replay = JSON.parse(readFileSync(new URL('./workout-heart-rate.json', import.meta.url)));
const at = seconds => new Date(Date.parse(DEMO_START) + seconds * 1000).toISOString();

test('the repeating mission week alternates strength and aerobic days and ends with rest', () => {
  const days = Array.from({ length: 7 }, (_, index) => getDailyWorkout(42 + index));
  assert.deepEqual(days.map(day => day.sessions.length), [2, 1, 2, 1, 2, 1, 0]);
  assert.deepEqual(days.filter(day => day.sessions.length === 2).map(day => day.sessions[0].steps[0].repsPerSet), [12, 8, 6]);
  const intervals = days.flatMap(day => day.sessions).flatMap(session => session.steps)
    .filter(step => step.kind === 'intervals');
  assert.deepEqual(intervals.map(step => [step.count, step.workSeconds]), [[6, 120], [8, 30], [4, 240]]);
  assert.equal(getDailyWorkout(49).sessions[0].id, days[0].sessions[0].id);
  const rest = createWorkoutController({ missionDay: 48 });
  assert.equal(rest.snapshot(at(0)).status, 'rest');
  assert.throws(() => rest.start(at(0)), /unfinished session/);
});

test('step completion advances once and keeps resistance and steady work in separate sessions', async () => {
  const controller = createWorkoutController({ missionDay: 42 });
  const first = controller.start(at(0));
  assert.equal(first.currentStep.id, 'squat');
  const next = controller.completeStep('squat', at(1));
  assert.equal(next.currentStep.id, 'deadlift');
  assert.deepEqual(controller.completeStep('squat', at(1)), next);
  assert.equal(controller.completeStep('deadlift', at(2)).currentStep.id, 'heel-raise');
  assert.equal(controller.completeStep('heel-raise', at(3)).currentStep.id, 'bench-press');
  const last = controller.completeStep('bench-press', at(4));
  assert.equal(last.status, 'completed');
  assert.equal(last.currentStep, null);
  assert.equal(last.completed.length, first.totalSteps);
  assert.equal(last.nextSessionId, 'day-1-endurance');
  assert.equal((await controller.save(at(4))).saveStatus, 'unavailable');
  assert.equal(controller.start(at(5)).currentStep.id, 'warm-up');
});

test('interval guidance alternates work and recovery and waits for the last check-off', () => {
  const controller = createWorkoutController({ missionDay: 43 });
  controller.start(at(0));
  assert.deepEqual(controller.completeStep('warm-up', at(300)).interval,
    { round: 1, phase: 'work', remainingSeconds: 120 });
  assert.deepEqual(controller.snapshot(at(420)).interval, { round: 1, phase: 'recovery', remainingSeconds: 120 });
  assert.deepEqual(controller.snapshot(at(540)).interval, { round: 2, phase: 'work', remainingSeconds: 120 });
  assert.deepEqual(controller.snapshot(at(1620)).interval, { round: 6, phase: 'done', remainingSeconds: 0 });
  assert.equal(controller.completeStep('intervals', at(1620)).currentStep.id, 'cool-down');
});

test('stage demo persists the correctly labelled summary in the real health module', async () => {
  const ctx = makeTestContext();
  const health = createHealthModule();
  await health.reset(ctx);
  const request = (method, body) => handleRequest(health, ctx, {
    method, path: '/workouts', query: {}, body, user: crewUser('c1'),
  });
  let posts = 0;
  const controller = createWorkoutController({
    missionDay: 42, stage: true, replay,
    submitWorkout: async body => {
      posts++;
      const result = await request('POST', body);
      assert.equal(result.status, 201);
      return result.body.data;
    },
  });
  assert.equal(controller.start(at(0)).heartRate.bpm, 72);
  assert.equal(controller.completeStep('warm-up', at(10)).currentStep.id, 'push-ups');
  assert.throws(() => controller.completeStep('push-ups', at(90)), /rep count/);
  assert.equal(controller.snapshot(at(90)).heartRate.bpm, 145);
  assert.equal(controller.completeStep('push-ups', at(90), { reps: 25 }).status, 'completed');
  await assert.rejects(controller.save(at(149), { withRecovery: true }), /progress/);
  ctx.advance(2.5);
  const results = await Promise.all([
    controller.save(at(150), { withRecovery: true }),
    controller.save(at(150), { withRecovery: true }),
  ]);
  assert.ok(results.every(result => result.saveStatus === 'saved'));
  assert.equal(posts, 1);
  const { workouts } = (await request('GET')).body.data;
  assert.equal(workouts.length, 1);
  const [record] = workouts;
  assert.equal(record.kind, 'push-ups');
  assert.equal(record.crewId, 'c1');
  assert.equal(record.reps, 25);
  assert.equal(record.peakHeartRateBpm, 145);
  assert.equal(record.recoveryHeartRateBpm, 102);
  assert.match(record.heartRateSource, /^replayed \(synthetic\)/);
  assert.equal(controller.snapshot(at(151)).heartRate.bpm, null);
});

test('live input expires and a retry reuses the same stopped workout summary', async () => {
  const bodies = [];
  const controller = createWorkoutController({
    missionDay: 42, wearableSource: 'Demo chest strap adapter',
    submitWorkout: body => {
      bodies.push(body);
      if (bodies.length === 1) throw new Error('Network disconnected');
      throw Object.assign(new Error('Previously saved'), { code: 'already_done' });
    },
  });
  controller.start(at(0));
  assert.equal(controller.recordHeartRate(130, at(5)), true);
  assert.equal(controller.recordHeartRate(0, at(6)), false);
  assert.equal(controller.snapshot(at(15)).heartRate.bpm, 130);
  assert.equal(controller.snapshot(at(16)).heartRate.bpm, null);
  assert.equal(controller.recordHeartRate(null, at(17)), true);
  assert.equal(controller.stop(at(18)).status, 'stopped');
  await assert.rejects(controller.save(at(18)), /Network disconnected/);
  assert.equal(controller.snapshot(at(18)).saveStatus, 'failed');
  assert.equal((await controller.save(at(19))).saveStatus, 'saved');
  assert.deepEqual(bodies[0], bodies[1]);
  assert.equal(bodies[1].recoveryHeartRateBpm, null);
});
