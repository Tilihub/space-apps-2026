// Connection-owned journal storage; Potest's pending #55 companion stays imported from its owner.
import { apiError, checkFields, resolveCrewId } from '../../../shared/contract/contract.js';
import { contextualCompanionRoute, resetSupportConversation } from './companion-support.js';

const mind = {
  name: 'mind', owner: 'tommy (journal connection), potest (companion route)',
  async reset(ctx) { resetSupportConversation(); await ctx.store.save({ entries: [] }); },
  routes: [contextualCompanionRoute, {
    method: 'POST', path: '/journal', roles: ['crew'], status: 201,
    async handler(req, ctx) {
      checkFields(req.query, []);
      const { text } = checkFields(req.body, ['text'], ['text']);
      if (typeof text !== 'string' || !text.trim() || text.length > 5000) {
        throw apiError('invalid_field', 'Write between 1 and 5,000 characters.');
      }
      const state = await ctx.store.load() ?? { entries: [] };
      const entry = { id: `journal_${crypto.randomUUID()}`, crewId: resolveCrewId(req.user),
        recordedAt: ctx.now(), missionDay: ctx.missionDay(), text: text.trim() };
      state.entries.push(entry);
      await ctx.store.save(state);
      // No events: even journal activity is private.
      return { entry };
    },
  }, {
    method: 'GET', path: '/journal', roles: ['crew'],
    async handler(req, ctx) {
      checkFields(req.query, ['days']);
      const days = Number(req.query.days ?? 14);
      if (!Number.isInteger(days) || days < 1 || days > 60) throw apiError('invalid_field', 'days must be 1–60.');
      const state = await ctx.store.load() ?? { entries: [] };
      return { entries: state.entries.filter(e => e.crewId === resolveCrewId(req.user)
        && e.missionDay >= ctx.missionDay() - days + 1).reverse() };
    },
  }],
};
export default mind;
