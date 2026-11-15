// @ts-check
/**
 * Connection-owned additions to Tommy's Pulsars module (people/tommy/pulsars/), made here so his
 * folder stays unchanged. The store is still his module's store, in his format.
 *
 * 1. Stage push-ups (always on): every completed stage push-up run pays +200 for the exercise and
 *    +100 for a new record, whatever the repetition count, every run, for any crew member.
 *    Team decision for the live stage demo, 15 November.
 * 2. Presentation start (start.js --presentation only), see presentation.js:
 *    - Mara (c1) begins with 700 Pulsars earned on days 38–40 under the module's own reward rules,
 *      so the stage run brings her to 1,000, enough for the round spectacles.
 *    - Ines (c3) gets nine of her ten daily wellbeing answers prefilled on day 42: mood, stress and
 *      fatigue come from her prepared check-in, the six below from here. She answers the tenth,
 *      "mental refreshment", live. Synthetic demo values, not real answers.
 */
import pulsars from '../../../people/tommy/pulsars/index.js';
import { DEFAULT_LOOK } from '../../../people/tommy/pulsars/catalog.js';
import { mainSteps, rewardRate, streakBefore } from '../../../people/tommy/pulsars/rules.js';
import { apiError, checkFields, resolveCrewId, DEMO_START } from '../../../shared/contract/contract.js';

const DAY_MS = 86_400_000;
const PRESENTATION_DAY = 42;
export const STAGE_EXERCISE_REWARD = 200;
export const STAGE_RECORD_REWARD = 100;

/** Ines's prefilled answers: six of the seven extra questions (not mentalRest, the tenth). */
export const INES_PREFILL = Object.freeze({ worry: 6, focus: 4, motivation: 5, loneliness: 7, connection: 5, workload: 6 });

/** An empty wallet, the same shape as blank() in people/tommy/pulsars/index.js. */
const blank = () => ({
  balance: 0, owned: Object.values(DEFAULT_LOOK), equipped: { ...DEFAULT_LOOK },
  exercises: {}, trainingDays: [], wellbeing: {}, records: {}, ledger: [],
});

/**
 * @param {number} day mission day
 * @param {number} hour mission time of day, UTC
 * @returns {string} ISO time on that mission day (DEMO_START is day 42, 07:30)
 */
const at = (day, hour) => new Date(Date.parse(DEMO_START) + (day - PRESENTATION_DAY) * DAY_MS + (hour - 7.5) * 3_600_000).toISOString();

/**
 * Mara's wallet for the presentation: every main exercise of days 38, 39 and 40 completed, paid
 * with the module's own rates (100 each at that streak). Day 41 is a planned rest day.
 * @returns {ReturnType<typeof blank>}
 */
export const preparedMara = () => {
  const p = blank();
  for (const day of [38, 39, 40]) {
    const amount = rewardRate(streakBefore(p.trainingDays, day, true) + 1);
    for (const step of mainSteps(day)) {
      const key = `exercise:${day}:${step.id}`;
      const time = at(day, 18);
      p.exercises[key] = {
        missionDay: day, sessionId: step.sessionId, stepId: step.id,
        sets: step.sets ? Array.from({ length: step.sets }, () => step.repsPerSet) : null, weightKg: null, at: time,
      };
      p.balance += amount;
      p.ledger.push({ id: key, amount, reason: 'For completing daily exercise', at: time, missionDay: day });
    }
    p.trainingDays.push(day);
  }
  return p;
};

const meRoute = pulsars.routes.find((route) => route.method === 'GET' && route.path === '/me');
if (!meRoute) throw new Error('The Pulsars module has no GET /me route.');

/** POST /api/pulsars/stage-exercise: the stage push-up reward. */
const stageRoute = {
  method: 'POST',
  path: '/stage-exercise',
  roles: ['crew'],
  /** @type {(req: any, ctx: any) => Promise<any>} */
  handler: async (req, ctx) => {
    const b = checkFields(req.body, ['missionDay', 'stepId', 'reps'], ['missionDay', 'stepId']);
    const day = ctx.missionDay();
    if (b.missionDay !== day) throw apiError('invalid_field', 'This completion belongs to another mission day.');
    if (b.stepId !== 'push-ups') throw apiError('invalid_field', 'Only the stage push-ups earn the stage reward.');
    if (b.reps !== undefined && b.reps !== null && (!Number.isInteger(b.reps) || b.reps < 0)) {
      throw apiError('invalid_field', 'reps must be a whole number, 0 or more.');
    }
    const crewId = resolveCrewId(req.user);
    const state = (await ctx.store.load()) ?? { crew: {} };
    const p = (state.crew[crewId] ??= blank());
    const run = p.ledger.filter((entry) => String(entry.id).startsWith(`stage:${day}:`) && String(entry.id).endsWith(':exercise')).length + 1;
    /** @type {(amount: number, reason: string, key: string) => any} */
    const credit = (amount, reason, key) => {
      const entry = { id: key, amount, reason, at: ctx.now(), missionDay: day };
      p.balance += amount;
      p.ledger.push(entry);
      return entry;
    };
    const awards = [
      credit(STAGE_EXERCISE_REWARD, 'For completing daily exercise', `stage:${day}:${run}:exercise`),
      credit(STAGE_RECORD_REWARD, 'For a new personal best', `stage:${day}:${run}:record`),
    ];
    await ctx.store.save(state);
    ctx.emit('pulsars.changed', crewId);
    const { wallet } = await meRoute.handler({ ...req, query: {}, body: null }, ctx);
    return { wallet, awards };
  },
};

/** Tommy's module plus the stage push-up reward. Used by modules.js. */
export default { ...pulsars, routes: [...pulsars.routes, stageRoute] };

/**
 * The presentation version: Mara's prepared wallet on every reset, and Ines's prefilled answers.
 * @param {typeof pulsars} mod the module from modules.js
 * @returns {typeof pulsars}
 */
export const presentationPulsars = (mod) => ({
  ...mod,
  reset: (ctx) => ctx.store.save({ crew: { c1: preparedMara() } }),
  routes: mod.routes.map((route) => (route.method !== 'GET' || route.path !== '/me' ? route : {
    ...route,
    /** @type {(req: any, ctx: any) => Promise<any>} */
    handler: async (req, ctx) => {
      const answer = await route.handler(req, ctx);
      if (resolveCrewId(req.user) === 'c3' && ctx.missionDay() === PRESENTATION_DAY && !answer.wallet.wellbeingDone) {
        answer.wallet.prefillAnswers = { ...INES_PREFILL };
      }
      return answer;
    },
  })),
});
