// Tests for the example module. Run every module's tests with `npm test` from the repo root.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest } from '../contract.js';
import { crewUser, earthUser, makeTestContext, medicalOfficer } from '../testing.js';
import example from './index.js';

const call = (ctx, method, path, user, extra = {}) => handleRequest(example, ctx, { method, path, user, ...extra });

const freshContext = async () => {
  const ctx = makeTestContext();
  await example.reset(ctx);
  return ctx;
};

test('a crew member saves a note and reads it back', async () => {
  const ctx = await freshContext();
  const saved = await call(ctx, 'POST', '/notes', crewUser('c4'), { body: { text: 'Slept badly' } });
  assert.equal(saved.status, 201);
  assert.equal(saved.body.data.note.missionDay, 42);
  assert.equal(saved.body.data.note.savedAt, '2026-11-14T07:30:00.000Z');

  const read = await call(ctx, 'GET', '/notes', crewUser('c4'));
  assert.equal(read.status, 200);
  assert.equal(read.body.data.notes.length, 1);
  assert.deepEqual(ctx.events, [{ type: 'example.note-saved', crewId: 'c4' }]);
});

test("a crew member cannot read someone else's notes", async () => {
  const ctx = await freshContext();
  const read = await call(ctx, 'GET', '/notes', crewUser('c4'), { query: { crewId: 'c1' } });
  assert.equal(read.status, 403);
  assert.equal(read.body.error.code, 'not_your_data');
});

test("the medical officer can read any crew member's notes", async () => {
  const ctx = await freshContext();
  await call(ctx, 'POST', '/notes', crewUser('c4'), { body: { text: 'Headache' } });
  const read = await call(ctx, 'GET', '/notes', medicalOfficer(), { query: { crewId: 'c4' } });
  assert.equal(read.status, 200);
  assert.equal(read.body.data.notes[0].text, 'Headache');
});

test('unknown and missing fields are refused', async () => {
  const ctx = await freshContext();
  const unknown = await call(ctx, 'POST', '/notes', crewUser('c4'), { body: { text: 'Hi', mood: 3 } });
  assert.equal(unknown.status, 400);
  assert.equal(unknown.body.error.code, 'invalid_field');
  const missing = await call(ctx, 'POST', '/notes', crewUser('c4'), { body: {} });
  assert.equal(missing.status, 400);
});

test('wrong role and no login are refused', async () => {
  const ctx = await freshContext();
  const earth = await call(ctx, 'POST', '/notes', earthUser(), { body: { text: 'Hi' } });
  assert.equal(earth.status, 403);
  assert.equal(earth.body.error.code, 'wrong_role');
  const nobody = await call(ctx, 'GET', '/notes', null);
  assert.equal(nobody.status, 401);
});

test("path parameters work, and a crew member cannot delete someone else's note", async () => {
  const ctx = await freshContext();
  const saved = await call(ctx, 'POST', '/notes', crewUser('c4'), { body: { text: 'Mine' } });
  const id = saved.body.data.note.id;
  const other = await call(ctx, 'DELETE', `/notes/${id}`, crewUser('c1'));
  assert.equal(other.body.error.code, 'not_your_data');
  const own = await call(ctx, 'DELETE', `/notes/${id}`, crewUser('c4'));
  assert.equal(own.status, 200);
  assert.equal(own.body.data.deleted, id);
});

test('reset puts back the start state, and the clock can move', async () => {
  const ctx = await freshContext();
  await call(ctx, 'POST', '/notes', crewUser('c4'), { body: { text: 'Day 42' } });
  ctx.advance(24 * 60);
  assert.equal(ctx.missionDay(), 43);
  await example.reset(ctx);
  assert.deepEqual(ctx.saved(), { notes: [] });
});
