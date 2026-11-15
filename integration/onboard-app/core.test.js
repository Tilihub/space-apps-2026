// @ts-check
// The core on its own, with the contract's example module. Run: npm test (or node --test) from the repo root.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CREW, DEMO_START } from '../../shared/contract/contract.js';
import example from '../../shared/contract/example/index.js';
import { checkModules, createCore } from './core.js';
import modules from './modules.js';
import { boot, dataOf } from './test-helpers.js';

/** A computer clock the tests move by hand. */
const fakeClock = () => {
  let ms = Date.parse('2026-11-14T16:00:00.000Z');
  return { realNow: () => ms, wait: (/** @type {number} */ minutes) => { ms += minutes * 60_000; } };
};

test('the app\'s module list has the contract\'s shape', () => {
  assert.doesNotThrow(() => checkModules(modules));
});

test('logging in: each platform gives its role, and only Leo (c2) gets the medical officer platform', async () => {
  const app = await boot([example]);
  try {
    const tomas = dataOf(await app.call('POST', '/api/session', { body: { crewId: 'c4', platform: 'astronaut' } }));
    assert.equal(typeof tomas.token, 'string');
    assert.deepEqual(tomas.user, { crewId: 'c4', role: 'crew', name: 'Diamandis' });

    const leo = dataOf(await app.call('POST', '/api/session', { body: { crewId: 'c2', platform: 'medical' } }));
    assert.deepEqual(leo.user, { crewId: 'c2', role: 'medical_officer', name: 'Aggelos' });

    const leoAsCrew = dataOf(await app.call('POST', '/api/session', { body: { crewId: 'c2', platform: 'astronaut' } }));
    assert.equal(leoAsCrew.user.role, 'crew');

    const earth = dataOf(await app.call('POST', '/api/session', { body: { crewId: null, platform: 'earth' } }));
    assert.deepEqual(earth.user, { crewId: null, role: 'earth', name: 'Earth specialist' });

    const refused = await app.call('POST', '/api/session', { body: { crewId: 'c4', platform: 'medical' } });
    assert.equal(refused.status, 403);
    assert.equal(refused.body.error.code, 'wrong_role');

    for (const body of [{ crewId: 'c9', platform: 'astronaut' }, { crewId: 'c4', platform: 'pilot' }, { crewId: 'c4' },
      { crewId: 'c4', platform: 'astronaut', extra: 1 }, { crewId: 'c4', platform: 'earth' }]) {
      const bad = await app.call('POST', '/api/session', { body });
      assert.equal(bad.body.error.code, 'invalid_field', JSON.stringify(body));
    }

    assert.deepEqual(dataOf(await app.call('GET', '/api/session', { token: tomas.token })).user, tomas.user);
    assert.deepEqual(dataOf(await app.call('GET', '/api/crew', { token: tomas.token })).crew, JSON.parse(JSON.stringify(CREW)));

    dataOf(await app.call('DELETE', '/api/session', { token: tomas.token }));
    assert.equal((await app.call('GET', '/api/session', { token: tomas.token })).body.error.code, 'not_logged_in');
  } finally {
    await app.close();
  }
});

test('without a valid token, the core and the modules answer not_logged_in', async () => {
  const app = await boot([example]);
  try {
    for (const token of [undefined, 'made-up-token']) {
      for (const [method, path] of [['GET', '/api/clock'], ['GET', '/api/events'], ['POST', '/api/demo/reset'], ['GET', '/api/example/notes']]) {
        const answer = await app.call(method, path, { token });
        assert.equal(answer.status, 401, `${method} ${path}`);
        assert.deepEqual(answer.body, { ok: false, error: { code: 'not_logged_in', message: 'Log in first.' } });
      }
    }
    const missing = await app.call('GET', '/api/nothing-here');
    assert.equal(missing.status, 404);
    assert.equal(missing.body.error.code, 'not_found');
  } finally {
    await app.close();
  }
});

test('the mission clock starts at day 42, 07:30, runs with real time and jumps forward', async () => {
  const time = fakeClock();
  const app = await boot([example], { realNow: time.realNow });
  try {
    const token = await app.login('c4');
    assert.deepEqual(dataOf(await app.call('GET', '/api/clock', { token })), { now: DEMO_START, missionDay: 42, time: '07:30' });

    time.wait(5);
    assert.equal(dataOf(await app.call('GET', '/api/clock', { token })).time, '07:35');

    const jumped = dataOf(await app.call('POST', '/api/clock/advance', { token, body: { minutes: 720 } }));
    assert.deepEqual(jumped, { now: '2026-11-14T19:35:00.000Z', missionDay: 42, time: '19:35' });
    assert.equal(dataOf(await app.call('POST', '/api/clock/advance', { token, body: { minutes: 300 } })).missionDay, 43);

    for (const minutes of [0, -5, 1.5, '60', 7 * 24 * 60 + 1]) {
      const bad = await app.call('POST', '/api/clock/advance', { token, body: { minutes } });
      assert.equal(bad.body.error.code, 'invalid_field', String(minutes));
    }
    const types = dataOf(await app.call('GET', '/api/events', { token })).events.map((/** @type {any} */ e) => e.type);
    assert.deepEqual(types, ['clock.advanced', 'clock.advanced']);
  } finally {
    await app.close();
  }
});

test('a module runs through the core: crew see their own notes, Leo sees anyone\'s, others are refused', async () => {
  const app = await boot([example]);
  try {
    const tomas = await app.login('c4');
    const mara = await app.login('c1');
    const leo = await app.login('c2', 'medical');
    const earth = await app.login(null, 'earth');

    const created = await app.call('POST', '/api/example/notes', { token: tomas, body: { text: 'Slept badly' } });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.note.crewId, 'c4');
    assert.ok(created.body.data.note.savedAt.startsWith('2026-11-14T07:30'), 'saved at mission time, not the computer\'s');
    assert.equal(created.body.data.note.missionDay, 42);

    assert.equal(dataOf(await app.call('GET', '/api/example/notes', { token: tomas })).notes.length, 1);
    assert.equal(dataOf(await app.call('GET', '/api/example/notes?crewId=c4', { token: leo })).notes.length, 1);
    assert.equal((await app.call('GET', '/api/example/notes?crewId=c4', { token: mara })).body.error.code, 'not_your_data');
    assert.equal((await app.call('GET', '/api/example/notes', { token: earth })).body.error.code, 'wrong_role');
    assert.equal((await app.call('POST', '/api/example/notes', { token: tomas, body: { text: 'x', mood: 3 } })).body.error.code, 'invalid_field');

    await Promise.all([1, 2, 3, 4, 5].map((n) => app.call('POST', '/api/example/notes', { token: tomas, body: { text: `note ${n}` } })));
    assert.equal(dataOf(await app.call('GET', '/api/example/notes', { token: tomas })).notes.length, 6);

    const { events } = dataOf(await app.call('GET', '/api/events', { token: mara }));
    assert.equal(events.length, 6);
    assert.deepEqual(Object.keys(events[0]).sort(), ['at', 'crewId', 'id', 'type']); // never content
    assert.deepEqual(events[0].type, 'example.note-saved');
    assert.deepEqual(events[0].crewId, 'c4');

    const later = dataOf(await app.call('GET', `/api/events?after=${events[3].id}`, { token: mara }));
    assert.deepEqual(later.events.map((/** @type {any} */ e) => e.id), [events[4].id, events[5].id]);
    assert.equal(later.lastId, events[5].id);
    assert.equal((await app.call('GET', '/api/events?after=abc', { token: mara })).body.error.code, 'invalid_field');
  } finally {
    await app.close();
  }
});

test('requests to one module run one at a time, so a change is never lost', async () => {
  // A module that waits between loading and saving, like one that reads a file in between.
  // If two requests ran at once, both would load the same count and one +1 would be lost.
  /** @type {import('../../shared/contract/contract.js').Module} */
  const counter = {
    name: 'counter',
    owner: 'zt',
    reset: async (ctx) => ctx.store.save({ count: 0 }),
    routes: [
      {
        method: 'POST',
        path: '/add',
        roles: ['crew'],
        handler: async (req, ctx) => {
          const state = await ctx.store.load();
          await new Promise((resolve) => setTimeout(resolve, 5));
          state.count += 1;
          await ctx.store.save(state);
          return state;
        },
      },
    ],
  };
  const app = await boot([counter]);
  try {
    const token = await app.login('c4');
    await Promise.all(Array.from({ length: 10 }, () => app.call('POST', '/api/counter/add', { token })));
    assert.equal(dataOf(await app.call('POST', '/api/counter/add', { token })).count, 11);
  } finally {
    await app.close();
  }
});

test('saved data, logins, event ids and the clock survive a restart; the clock pauses while off', async () => {
  const time = fakeClock();
  const first = await boot([example], { realNow: time.realNow });
  const token = await first.login('c4');
  dataOf(await first.call('POST', '/api/example/notes', { token, body: { text: 'before restart' } }));
  dataOf(await first.call('POST', '/api/clock/advance', { token, body: { minutes: 60 } }));
  const before = dataOf(await first.call('GET', '/api/events', { token })).lastId;
  await first.close({ keepData: true });

  const saved = JSON.parse(await readFile(join(first.dataDir, 'example.json'), 'utf8'));
  assert.equal(saved.notes[0].text, 'before restart');

  time.wait(600); // the server is off for 10 hours
  const second = await boot([example], { dataDir: first.dataDir, realNow: time.realNow });
  try {
    assert.equal(dataOf(await second.call('GET', '/api/example/notes', { token })).notes[0].text, 'before restart');
    assert.equal(dataOf(await second.call('GET', '/api/clock', { token })).time, '08:30');
    dataOf(await second.call('POST', '/api/example/notes', { token, body: { text: 'after restart' } }));
    assert.equal(dataOf(await second.call('GET', `/api/events?after=${before}`, { token })).events[0].id, before + 1);
  } finally {
    await second.close();
  }
});

test('reset demo puts back every module\'s start state and the clock, and tells the pages', async () => {
  const time = fakeClock();
  const app = await boot([example], { realNow: time.realNow });
  try {
    const token = await app.login('c4');
    dataOf(await app.call('POST', '/api/example/notes', { token, body: { text: 'gone after reset' } }));
    dataOf(await app.call('POST', '/api/clock/advance', { token, body: { minutes: 720 } }));

    assert.deepEqual(dataOf(await app.call('POST', '/api/demo/reset', { token })), { now: DEMO_START, missionDay: 42, time: '07:30' });
    assert.deepEqual(dataOf(await app.call('GET', '/api/example/notes', { token })).notes, []);
    assert.equal(dataOf(await app.call('GET', '/api/events', { token })).events.at(-1).type, 'demo.reset');
    assert.equal(dataOf(await app.call('GET', '/api/session', { token })).user.crewId, 'c4'); // still logged in
  } finally {
    await app.close();
  }
});

test('bad JSON and oversized bodies are refused in the contract\'s answer shape', async () => {
  const app = await boot([example]);
  try {
    const token = await app.login('c4');
    const broken = await app.call('POST', '/api/example/notes', { token, raw: '{"text": ' });
    assert.equal(broken.status, 400);
    assert.deepEqual(broken.body, { ok: false, error: { code: 'invalid_field', message: 'Send valid JSON.' } });
    const huge = await app.call('POST', '/api/example/notes', { token, raw: JSON.stringify({ text: 'x'.repeat(1_100_000) }) });
    assert.equal(huge.body.error.code, 'invalid_field');
  } finally {
    await app.close();
  }
});

test('files: the pages, the contract, angelos\'s health client and petros\'s demo data; nothing outside', async () => {
  const app = await boot([example]);
  try {
    const home = await app.call('GET', '/');
    assert.equal(home.status, 200);
    assert.match(String(home.type), /text\/html/);
    assert.equal((await app.call('GET', '/demo/')).status, 200);
    const folder = await app.call('GET', '/demo');
    assert.equal(folder.status, 301);

    const contract = await app.call('GET', '/shared/contract/contract.js');
    assert.match(String(contract.type), /text\/javascript/);
    assert.match(contract.body, /export const CONTRACT_VERSION = 1/);
    assert.match(String((await app.call('GET', '/people/angelos/health/client.js')).type), /text\/javascript/);
    assert.equal((await app.call('GET', '/demo-data/measurement-guides.json')).status, 200);
    assert.match(String((await app.call('GET', '/demo-data/workout-session.js')).type), /text\/javascript/);

    for (const path of ['/demo-data/../../../AGENTS.md', '/demo-data/%2e%2e/%2e%2e/%2e%2e/AGENTS.md', '/../core.js',
      '/%2e%2e/core.js', '/shared/contract/testing.js', '/people/angelos/health/index.js', '/data/core.json']) {
      assert.equal((await app.call('GET', path)).status, 404, path);
    }
    assert.equal((await app.call('POST', '/')).status, 405);
  } finally {
    await app.close();
  }
});

test('the core refuses a module that breaks the contract, saying why', async () => {
  const dataDir = '/nonexistent-never-created';
  const broken = [
    [{ ...example, name: 'clock' }, /used by the core/],
    [{ ...example, name: 'Health' }, /invalid name/],
    [{ ...example, reset: undefined }, /no reset/],
    [{ ...example, routes: undefined }, /no routes/],
  ];
  for (const [mod, message] of broken) {
    await assert.rejects(createCore({ modules: [/** @type {any} */ (mod)], dataDir }), message);
  }
  await assert.rejects(createCore({ modules: [example, example], dataDir }), /both called "example"/);
});
