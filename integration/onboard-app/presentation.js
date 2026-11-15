// @ts-check
/**
 * The prepared presentation start: `node integration/onboard-app/start.js --presentation`
 * (or PULSE_PRESENTATION=1). The public demo on Render runs this way.
 *
 * Every start, every Reset, and the moment the mission clock leaves day 42 bring the whole demo
 * back to this state, so the public link always opens on a ready day 42:
 * - today's check-in for all five crew: Petros's last synthetic day plus the stage cases in
 *   demo-data/scenarios.json, as Tommy's demo/seed-presentation.mjs does on a laptop;
 * - Tomas (c4): the headache report, and a waiting sleeping-pill request that only Earth can
 *   answer (the Earth console's demo QR code answers it);
 * - Ines (c3): her synthetic journal entry, and nine of ten wellbeing answers (adapters/pulsars-demo.js);
 * - Mara (c1): 700 Pulsars from days 38–40 (adapters/pulsars-demo.js).
 * Everything goes through the same API the pages use, so every module's own rules still apply.
 * Without the flag nothing here runs, and the laptop demo behaves as before.
 */
import { readFile } from 'node:fs/promises';
import { presentationPulsars } from './adapters/pulsars-demo.js';

const PRESENTATION_DAY = 42;
const WATCH_MS = 60_000;

/** @type {(path: string) => Promise<any>} */
const read = (path) => readFile(new URL(path, import.meta.url), 'utf8').then(JSON.parse);

/**
 * @param {any[]} modules the production registry from modules.js
 * @returns {any[]} the same list, with the presentation version of Pulsars
 */
export const presentationModules = (modules) => modules.map((mod) => (mod.name === 'pulsars' ? presentationPulsars(mod) : mod));

/**
 * One API call through the core, as a page would make it.
 * @param {any} core
 * @param {string} method
 * @param {string} path without /api
 * @param {string | null} token
 * @param {unknown} [body]
 * @returns {Promise<any>} the answer's data
 */
const call = async (core, method, path, token, body = null) => {
  const { body: answer } = await core.api({ method, path, token, query: {}, body });
  if (!answer.ok) throw new Error(`${method} ${path}: ${answer.error?.message}`);
  return answer.data;
};

/**
 * Loads today's prepared entries into a freshly reset demo (mission day 42).
 * @param {any} core
 * @returns {Promise<void>}
 */
export const prepareDay42 = async (core) => {
  const health = await read('../../people/petros_the_space_larper/demo-data/health.json');
  const scenarios = await read('../../people/petros_the_space_larper/demo-data/scenarios.json');
  /** @type {string[]} */
  const tokens = [];
  try {
    for (const crewId of Object.keys(health.crew)) {
      const { token } = await call(core, 'POST', '/session', null, { crewId, platform: 'astronaut' });
      tokens.push(token);
      const { missionDay, time, ...previous } = health.crew[crewId].checkIns.at(-1);
      await call(core, 'POST', '/health/check-ins', token, { ...previous, ...scenarios.cases[crewId]?.checkInBody });
      const symptom = scenarios.cases[crewId]?.symptomReportBody;
      if (symptom) await call(core, 'POST', '/meds/symptom-reports', token, { ...symptom, note: `${symptom.note} Body area: head.` });
      if (crewId === 'c3') {
        await call(core, 'POST', '/mind/journal', token, { text: 'Synthetic stage journal: I miss home and would like a quiet conversation today.' });
      }
      if (crewId === 'c4') {
        await call(core, 'POST', '/meds/requests', token, { itemId: 'zolpidem-5', note: 'Several short nights in a row; I cannot fall asleep before my next shift.' });
      }
    }
  } finally {
    for (const token of tokens) await core.api({ method: 'DELETE', path: '/session', token, query: {}, body: null });
  }
};

/**
 * Wraps a core so Reset, every start and the end of day 42 return to the prepared start.
 * @param {any} core from createDemoCore()
 * @param {{ log?: (...args: unknown[]) => void }} [options]
 * @returns {any} the core, plus resetPrepared() and watchDay()
 */
export const withPresentation = (core, { log = console.log } = {}) => {
  /** @type {Promise<unknown>} */
  let queue = Promise.resolve();
  /** @type {<T>(task: () => Promise<T>) => Promise<T>} */
  const inOrder = (task) => {
    const run = queue.then(task, task);
    queue = run.catch(() => {});
    return run;
  };

  /** Reset every module (Mara's wallet comes back with Pulsars' reset), then load today's entries. */
  const resetPrepared = () => inOrder(async () => {
    const { token } = await call(core, 'POST', '/session', null, { crewId: 'c1', platform: 'astronaut' });
    try {
      await call(core, 'POST', '/demo/reset', token, {});
    } finally {
      await core.api({ method: 'DELETE', path: '/session', token, query: {}, body: null });
    }
    await prepareDay42(core);
    log('[presentation] prepared day-42 start loaded');
  });

  /** @param {any} request */
  const api = async (request) => {
    const isReset = request.method === 'POST' && `/${String(request.path).split('/').filter(Boolean).join('/')}` === '/demo/reset';
    if (!isReset) return core.api(request);
    return inOrder(async () => {
      const answer = await core.api(request);
      if (!answer.body.ok) return answer;
      await prepareDay42(core);
      log('[presentation] Reset: prepared day-42 start loaded');
      return { ...answer, body: { ok: true, data: core.clockView() } };
    });
  };

  /** @returns {() => void} stops watching */
  const watchDay = () => {
    let busy = false;
    const timer = setInterval(() => {
      if (busy || core.clockView().missionDay === PRESENTATION_DAY) return;
      busy = true;
      log('[presentation] mission day 42 ended: going back to the prepared start');
      resetPrepared()
        .catch((err) => log('[presentation] could not reset', err))
        .finally(() => { busy = false; });
    }, WATCH_MS);
    timer.unref?.();
    return () => clearInterval(timer);
  };

  return { ...core, api, resetPrepared, watchDay };
};
