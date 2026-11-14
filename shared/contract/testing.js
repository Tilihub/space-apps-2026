// @ts-check
/**
 * A stand-in for the server core, for module tests. It has the same shape as the real context,
 * plus advance(), events and saved() so tests can move the clock and check what happened.
 */
import { DEMO_START, MEDICAL_OFFICER_ID, checkEvent, missionDayOf } from './contract.js';

/**
 * @typedef {import('./contract.js').Context & {
 *   advance: (minutes: number) => void,
 *   events: { type: string, crewId: string | null }[],
 *   saved: () => unknown,
 * }} TestContext
 */

/**
 * @param {{ now?: string, state?: unknown }} [options] start time and saved state (default: demo start, nothing saved)
 * @returns {TestContext}
 */
export const makeTestContext = ({ now = DEMO_START, state = null } = {}) => {
  let clock = Date.parse(now);
  /** @type {unknown} */
  let saved = state === null ? null : structuredClone(state);
  /** @type {{ type: string, crewId: string | null }[]} */
  const events = [];
  return {
    now: () => new Date(clock).toISOString(),
    missionDay: () => missionDayOf(new Date(clock).toISOString()),
    store: {
      load: async () => (saved === null ? null : structuredClone(saved)),
      save: async (next) => {
        saved = JSON.parse(JSON.stringify(next));
      },
    },
    emit: (type, crewId = null) => {
      checkEvent(type);
      events.push({ type, crewId });
    },
    log: (...args) => console.error(...args),
    advance: (minutes) => {
      clock += minutes * 60_000;
    },
    events,
    saved: () => saved,
  };
};

/**
 * @param {string} crewId
 * @returns {import('./contract.js').User}
 */
export const crewUser = (crewId) => ({ crewId, role: 'crew' });

/** @returns {import('./contract.js').User} */
export const medicalOfficer = () => ({ crewId: MEDICAL_OFFICER_ID, role: 'medical_officer' });

/** @returns {import('./contract.js').User} */
export const earthUser = () => ({ crewId: null, role: 'earth' });
