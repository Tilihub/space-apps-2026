// @ts-check
/**
 * Example module: the shape every module follows. Copy this folder to start yours.
 * It keeps short notes per crew member. It is not part of the app.
 *
 * Your module imports from '../../../shared/contract/contract.js' instead of '../contract.js'.
 */
import { apiError, checkFields, resolveCrewId } from '../contract.js';

/** @typedef {{ id: string, crewId: string, text: string, savedAt: string, missionDay: number }} Note */
/** @typedef {{ notes: Note[] }} State */

/**
 * @param {import('../contract.js').Context} ctx
 * @returns {Promise<State>}
 */
const load = async (ctx) => (await ctx.store.load()) ?? { notes: [] };

/** @type {import('../contract.js').Module} */
export default {
  name: 'example',
  owner: 'zt',

  reset: async (ctx) => {
    await ctx.store.save({ notes: [] });
  },

  routes: [
    {
      method: 'POST',
      path: '/notes',
      roles: ['crew'],
      status: 201,
      handler: async (req, ctx) => {
        const body = checkFields(req.body, ['text'], ['text']);
        if (typeof body.text !== 'string' || body.text.length > 500) {
          throw apiError('invalid_field', 'text must be words, up to 500 characters.');
        }
        const crewId = resolveCrewId(req.user); // a crew member writes only their own
        const state = await load(ctx);
        /** @type {Note} */
        const note = {
          id: `note_${crypto.randomUUID()}`,
          crewId,
          text: body.text,
          savedAt: ctx.now(),
          missionDay: ctx.missionDay(),
        };
        state.notes.push(note);
        await ctx.store.save(state);
        ctx.emit('example.note-saved', crewId);
        return { note };
      },
    },
    {
      method: 'GET',
      path: '/notes',
      roles: ['crew', 'medical_officer'],
      handler: async (req, ctx) => {
        const crewId = resolveCrewId(req.user, req.query.crewId);
        const state = await load(ctx);
        return { notes: state.notes.filter((note) => note.crewId === crewId) };
      },
    },
    {
      method: 'DELETE',
      path: '/notes/:id',
      roles: ['crew'],
      handler: async (req, ctx) => {
        const state = await load(ctx);
        const note = state.notes.find((n) => n.id === req.params.id);
        if (!note) throw apiError('not_found', 'That note does not exist.');
        resolveCrewId(req.user, note.crewId); // refuses someone else's note
        state.notes = state.notes.filter((n) => n.id !== note.id);
        await ctx.store.save(state);
        return { deleted: note.id };
      },
    },
  ],
};
