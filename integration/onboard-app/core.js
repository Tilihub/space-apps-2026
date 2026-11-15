// @ts-check
/**
 * The onboard app core (shared/contract/README.md, section 5): login, crew list, mission clock,
 * events, saving, and running every module's requests through the contract's handleRequest().
 * It knows nothing about HTTP; server.js puts it on the network.
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  CREW,
  DEMO_START,
  MEDICAL_OFFICER_ID,
  apiError,
  checkEvent,
  checkFields,
  handleRequest,
  isCrewId,
  missionDayOf,
  missionTimeOf,
} from '../../shared/contract/contract.js';

/** @typedef {import('../../shared/contract/contract.js').Module} Module */
/** @typedef {import('../../shared/contract/contract.js').Context} Context */
/** @typedef {import('../../shared/contract/contract.js').User} User */
/** @typedef {import('../../shared/contract/contract.js').Role} Role */
/** @typedef {import('../../shared/contract/contract.js').Envelope} Envelope */
/** @typedef {{ id: number, type: string, crewId: string | null, at: string }} CoreEvent */
/** @typedef {{ status: number, body: Envelope }} Answer */
/** @typedef {{ now: string, missionDay: number, time: string }} ClockView */
/**
 * @typedef {object} ApiRequest one request to /api/..., already parsed by server.js
 * @property {string} method
 * @property {string} path the part after /api, for example "/health/check-ins"
 * @property {string | null} token from the Authorization header
 * @property {Record<string, string>} [query]
 * @property {any} [body]
 */
/**
 * @typedef {object} CoreRouteRequest
 * @property {User | null} user
 * @property {string | null} token
 * @property {Record<string, string>} query
 * @property {any} body
 */
/**
 * @typedef {object} CoreRoute
 * @property {string} method
 * @property {string} path
 * @property {boolean} [open] true: no login needed
 * @property {number} [status]
 * @property {(req: CoreRouteRequest) => Promise<unknown>} handler
 */

/** First path parts the core answers itself, so no module may be named like them. */
const CORE_PATHS = Object.freeze(['session', 'crew', 'clock', 'demo', 'events']);

/** Which role each platform logs in as (contract section 5). */
/** @type {Readonly<Record<string, Role>>} */
const PLATFORMS = Object.freeze({ astronaut: 'crew', medical: 'medical_officer', earth: 'earth' });

const TICK_MS = 5_000;
const MAX_ADVANCE_MINUTES = 7 * 24 * 60;
const KEPT_EVENTS = 1_000;
const KEPT_SESSIONS = 500;
const EARTH_NAME = 'Earth specialist';

// ---- Small helpers ---------------------------------------------------------------------------

/**
 * Runs tasks one after another. Each module gets one, so two requests to the same module never
 * mix their load-and-save steps (otherwise one request could overwrite the other's change).
 * @returns {<T>(task: () => Promise<T>) => Promise<T>}
 */
const makeQueue = () => {
  /** @type {Promise<unknown>} */
  let last = Promise.resolve();
  return (task) => {
    const run = last.then(task);
    last = run.catch(() => undefined);
    return run;
  };
};

/**
 * @param {string} file
 * @returns {Promise<any>} the parsed file, or null if it doesn't exist yet
 */
const readJson = async (file) => {
  let text;
  try {
    text = await readFile(file, 'utf8');
  } catch (err) {
    if (/** @type {NodeJS.ErrnoException} */ (err).code === 'ENOENT') return null;
    throw err;
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${file} is not valid JSON. Delete it and that part starts fresh from its demo data.`);
  }
};

/**
 * Writes a temporary file and then swaps it in, so a crash mid-write never leaves half a file.
 * @param {string} file
 * @param {unknown} data
 * @returns {Promise<void>}
 */
const writeJson = async (file, data) => {
  const temp = `${file}.${process.pid}.tmp`;
  await writeFile(temp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await rename(temp, file);
};

/**
 * @param {unknown} err
 * @returns {err is Error & { status: number, code: string }}
 */
const isApiError = (err) => err instanceof Error && /** @type {any} */ (err).apiError === true;

/**
 * An error answer in the contract's shape, for server.js (bad JSON, too large).
 * @param {string} code one of ERRORS
 * @param {string} message
 * @returns {Answer}
 */
export const errorAnswer = (code, message) => {
  const err = apiError(code, message);
  return { status: err.status, body: { ok: false, error: { code: err.code, message: err.message } } };
};

/**
 * Runs a core handler and wraps the result exactly like handleRequest() does for modules.
 * @param {() => Promise<unknown>} work
 * @param {number} status the success status
 * @param {(...args: unknown[]) => void} log
 * @returns {Promise<Answer>}
 */
const answer = async (work, status, log) => {
  try {
    const data = await work();
    return { status, body: { ok: true, data: JSON.parse(JSON.stringify(data ?? null)) } };
  } catch (err) {
    if (isApiError(err)) return errorAnswer(err.code, err.message);
    log('[core]', err);
    return { status: 500, body: { ok: false, error: { code: 'server_error', message: 'Something went wrong in the core.' } } };
  }
};

/**
 * Refuses a module that doesn't have the contract's shape, saying what to fix.
 * @param {readonly Module[]} modules
 * @returns {void}
 */
export const checkModules = (modules) => {
  const seen = new Set();
  for (const mod of modules) {
    const name = mod?.name;
    if (typeof name !== 'string' || !/^[a-z][a-z0-9-]*$/.test(name)) {
      throw new Error(`A module has a missing or invalid name: ${String(name)}. Use lowercase letters, like "health".`);
    }
    if (CORE_PATHS.includes(name)) throw new Error(`The name "${name}" is used by the core. Pick another module name.`);
    if (seen.has(name)) throw new Error(`Two modules are both called "${name}".`);
    seen.add(name);
    if (typeof mod.reset !== 'function') throw new Error(`Module "${name}" has no reset(ctx).`);
    if (!Array.isArray(mod.routes)) throw new Error(`Module "${name}" has no routes list.`);
    if (mod.tick !== undefined && typeof mod.tick !== 'function') throw new Error(`Module "${name}": tick must be a function.`);
  }
};

// ---- The core --------------------------------------------------------------------------------

/**
 * @param {object} options
 * @param {readonly Module[]} options.modules the modules to run, from modules.js
 * @param {string} options.dataDir where saved data goes: core.json plus one <module>.json each
 * @param {() => number} [options.realNow] the computer's clock in ms; tests replace it
 * @param {(...args: unknown[]) => void} [options.log]
 * @returns {Promise<{
 *   api: (request: ApiRequest) => Promise<Answer>,
 *   clockView: () => ClockView,
 *   tickAll: () => Promise<void>,
 *   startTicking: () => void,
 *   stop: () => Promise<void>,
 * }>}
 */
export const createCore = async ({ modules, dataDir, realNow = Date.now, log = console.log }) => {
  checkModules(modules);
  await mkdir(dataDir, { recursive: true });
  const coreFile = join(dataDir, 'core.json');
  const saved = (await readJson(coreFile)) ?? {};

  // Mission time = clock.missionAt + (the computer's time now - clock.realAt).
  // At start it carries on from the last saved mission time, so the clock pauses while the
  // server is off instead of jumping ahead by however long it was off.
  const savedAt = Date.parse(saved.clock?.missionAt ?? '');
  let clock = { missionAt: Number.isNaN(savedAt) ? DEMO_START : new Date(savedAt).toISOString(), realAt: realNow() };

  /** @type {Map<string, User>} token -> who is logged in */
  const sessions = new Map(Object.entries(saved.sessions ?? {}));
  let nextEventId = Number.isInteger(saved.nextEventId) && saved.nextEventId > 0 ? saved.nextEventId : 1;
  /** @type {CoreEvent[]} kept in memory only; the ids carry on after a restart */
  let events = [];
  const coreQueue = makeQueue();

  /** @returns {string} mission time now, ISO 8601 UTC */
  const now = () => new Date(Date.parse(clock.missionAt) + (realNow() - clock.realAt)).toISOString();

  /** @returns {ClockView} */
  const clockView = () => {
    const at = now();
    return { now: at, missionDay: missionDayOf(at), time: missionTimeOf(at) };
  };

  /** @returns {Promise<void>} */
  const saveCore = () =>
    coreQueue(async () => {
      clock = { missionAt: now(), realAt: realNow() };
      await writeJson(coreFile, { clock, sessions: Object.fromEntries(sessions), nextEventId });
    });

  /**
   * ctx.emit for every module, and the core's own events. Only types from EVENTS, never content.
   * @param {string} type
   * @param {string | null} [crewId]
   * @returns {void}
   */
  const emit = (type, crewId = null) => {
    checkEvent(type);
    events.push({ id: nextEventId, type, crewId: crewId ?? null, at: now() });
    nextEventId += 1;
    if (events.length > KEPT_EVENTS) events = events.slice(-KEPT_EVENTS);
    saveCore().catch((err) => log('[core] could not save core.json', err));
  };

  // ---- one store, one queue and one ctx per module ----
  /** @type {Map<string, Module>} */
  const byName = new Map();
  /** @type {Map<string, <T>(task: () => Promise<T>) => Promise<T>>} */
  const queues = new Map();
  /** @type {Map<string, Context>} */
  const contexts = new Map();
  /** @type {Map<string, unknown>} */
  const stores = new Map();

  for (const mod of modules) {
    const file = join(dataDir, `${mod.name}.json`);
    const writeQueue = makeQueue();
    byName.set(mod.name, mod);
    queues.set(mod.name, makeQueue());
    stores.set(mod.name, await readJson(file));
    contexts.set(mod.name, {
      now,
      missionDay: () => missionDayOf(now()),
      store: {
        load: async () => {
          const state = stores.get(mod.name);
          return state === null || state === undefined ? null : structuredClone(state);
        },
        save: async (state) => {
          if (state === undefined) throw new Error(`[${mod.name}] store.save() needs a value.`);
          const plain = JSON.parse(JSON.stringify(state));
          stores.set(mod.name, plain);
          await writeQueue(() => writeJson(file, plain));
        },
      },
      emit,
      log: (...args) => log(`[${mod.name}]`, ...args),
    });
  }

  /**
   * @template T
   * @param {Module} mod
   * @param {(ctx: Context) => Promise<T>} task
   * @returns {Promise<T>}
   */
  const inQueue = (mod, task) => {
    const queue = /** @type {<U>(t: () => Promise<U>) => Promise<U>} */ (queues.get(mod.name));
    const ctx = /** @type {Context} */ (contexts.get(mod.name));
    return queue(() => task(ctx));
  };

  // Contract: "At start, a module whose store is empty gets reset."
  for (const mod of modules) {
    if (stores.get(mod.name) === null) {
      log(`[core] ${mod.name}: no saved data yet, loading its demo start data`);
      await inQueue(mod, (ctx) => mod.reset(ctx));
    }
  }
  await saveCore();

  // ---- core routes ----

  /**
   * @param {User} user
   * @returns {{ crewId: string | null, role: Role, name: string }}
   */
  const describe = (user) => ({
    crewId: user.crewId,
    role: user.role,
    name: user.crewId === null ? EARTH_NAME : CREW.find((member) => member.id === user.crewId)?.name ?? user.crewId,
  });

  /**
   * @param {any} body
   * @returns {Promise<{ token: string, user: ReturnType<typeof describe> }>}
   */
  const login = async (body) => {
    const fields = checkFields(body, ['crewId', 'platform'], ['platform']);
    const role = PLATFORMS[fields.platform];
    if (!role) throw apiError('invalid_field', 'platform must be "astronaut", "medical" or "earth".');
    const crewId = fields.crewId ?? null;
    if (role === 'earth') {
      if (crewId !== null) throw apiError('invalid_field', 'The Earth console logs in without a crew member (crewId: null).');
    } else {
      if (!isCrewId(crewId)) throw apiError('invalid_field', 'Pick a crew member, c1 to c5.');
      if (role === 'medical_officer' && crewId !== MEDICAL_OFFICER_ID) {
        throw apiError('wrong_role', 'Only the medical officer, Aggelos (c2), can use the medical officer platform.');
      }
    }
    /** @type {User} */
    const user = { crewId, role };
    const token = randomUUID();
    sessions.set(token, user);
    while (sessions.size > KEPT_SESSIONS) sessions.delete(/** @type {string} */ (sessions.keys().next().value));
    await saveCore();
    return { token, user: describe(user) };
  };

  /**
   * @param {any} body
   * @returns {Promise<ClockView>}
   */
  const advanceClock = async (body) => {
    const { minutes } = checkFields(body, ['minutes'], ['minutes']);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_ADVANCE_MINUTES) {
      throw apiError('invalid_field', `minutes must be a whole number from 1 to ${MAX_ADVANCE_MINUTES} (one week).`);
    }
    clock = { missionAt: new Date(Date.parse(now()) + minutes * 60_000).toISOString(), realAt: realNow() };
    emit('clock.advanced');
    await saveCore();
    void tickAll(); // modules that follow the clock (env's replay) catch up straight away
    return clockView();
  };

  /** @returns {Promise<ClockView>} */
  const resetDemo = async () => {
    // The clock goes back first, so every module's reset sees DEMO_START (angelos's HANDOFF.md).
    clock = { missionAt: DEMO_START, realAt: realNow() };
    await saveCore();
    for (const mod of modules) await inQueue(mod, (ctx) => mod.reset(ctx));
    emit('demo.reset');
    await saveCore();
    return clockView();
  };

  /**
   * @param {Record<string, string>} query
   * @returns {{ events: CoreEvent[], lastId: number }}
   */
  const listEvents = (query) => {
    const { after = '0' } = checkFields(query, ['after']);
    if (!/^\d+$/.test(after)) throw apiError('invalid_field', 'after must be an event id (a whole number).');
    const lastId = nextEventId - 1;
    // A page that remembers an id this server never gave (its data folder was deleted) gets
    // everything kept, then carries on from lastId.
    const newer = Number(after) > lastId ? events : events.filter((event) => event.id > Number(after));
    return { events: newer, lastId };
  };

  /** @type {readonly CoreRoute[]} */
  const coreRoutes = [
    { method: 'POST', path: '/session', open: true, status: 201, handler: async (req) => login(req.body) },
    { method: 'GET', path: '/session', handler: async (req) => ({ user: describe(/** @type {User} */ (req.user)) }) },
    {
      method: 'DELETE',
      path: '/session',
      handler: async (req) => {
        sessions.delete(/** @type {string} */ (req.token));
        await saveCore();
        return {};
      },
    },
    { method: 'GET', path: '/crew', handler: async () => ({ crew: CREW }) },
    { method: 'GET', path: '/clock', handler: async () => clockView() },
    { method: 'POST', path: '/clock/advance', handler: async (req) => advanceClock(req.body) },
    { method: 'POST', path: '/demo/reset', handler: async () => resetDemo() },
    { method: 'GET', path: '/events', handler: async (req) => listEvents(req.query) },
  ];

  // ---- ticking ----
  const ticking = new Set();

  /** @returns {Promise<void>} */
  const tickAll = async () => {
    await Promise.all(
      modules
        .filter((mod) => typeof mod.tick === 'function')
        .map(async (mod) => {
          if (ticking.has(mod.name)) return; // the last tick is still running
          ticking.add(mod.name);
          try {
            await inQueue(mod, (ctx) => /** @type {NonNullable<Module['tick']>} */ (mod.tick)(ctx));
          } catch (err) {
            log(`[${mod.name}] tick failed`, err);
          } finally {
            ticking.delete(mod.name);
          }
        }),
    );
  };

  /** @type {ReturnType<typeof setInterval> | null} */
  let timer = null;

  /** @returns {void} */
  const startTicking = () => {
    if (timer) return;
    timer = setInterval(() => {
      void tickAll();
      saveCore().catch((err) => log('[core] could not save core.json', err)); // remembers the clock
    }, TICK_MS);
  };

  /** @returns {Promise<void>} */
  const stop = async () => {
    if (timer) clearInterval(timer);
    timer = null;
    // Finish queued module writes before a controlled run removes its store.
    await Promise.all(modules.map(mod => inQueue(mod, async () => {})));
    await saveCore();
  };

  // ---- every /api request ----

  /**
   * @param {ApiRequest} request
   * @returns {Promise<Answer>}
   */
  const api = async ({ method, path, token, query = {}, body = null }) => {
    const found = token ? sessions.get(token) : undefined;
    const user = found ? { ...found } : null; // a copy, so a module can't change the login
    const parts = path.split('/').filter(Boolean);
    const mod = byName.get(parts[0] ?? '');
    if (mod) {
      const rest = `/${parts.slice(1).join('/')}`;
      return inQueue(mod, (ctx) => handleRequest(mod, ctx, { method, path: rest, user, query, body }));
    }
    const cleanPath = `/${parts.join('/')}`;
    const route = coreRoutes.find((r) => r.method === method && r.path === cleanPath);
    return answer(
      async () => {
        if (!route) throw apiError('not_found', `There is no ${method} /api${cleanPath}.`);
        if (!route.open && !user) throw apiError('not_logged_in', 'Log in first.');
        return route.handler({ user, token, query, body });
      },
      route?.status ?? 200,
      log,
    );
  };

  return { api, clockView, tickAll, startTicking, stop };
};
