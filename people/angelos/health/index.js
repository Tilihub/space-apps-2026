import { readFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import {
  BASELINE_DAYS, COMPARED_MEASURES, CONTRACT_VERSION, CREW, DEMO_START, LAUNCH, MEDICAL_OFFICER_ID,
  MEASUREMENTS, SCALES, apiError, checkFields, missionDayOf, resolveCrewId,
} from '../../../shared/contract/contract.js';
import { dailyFor, todayFor, weeklyFor } from './analysis.js';
import { requestedDays, validateWorkout } from './workouts.js';

const MEASURES = [...new Set([...Object.keys(MEASUREMENTS), ...COMPARED_MEASURES])];
const DEFAULT_FIXTURE = new URL('./fixtures/health.json', import.meta.url);
const PETROS_FIXTURE = new URL('../../petros_the_space_larper/demo-data/health.json', import.meta.url);

function validateValues(body) {
  checkFields(body, MEASURES);
  for (const [measure, value] of Object.entries(body)) {
    if (value === null) continue;
    const range = MEASUREMENTS[measure] ?? SCALES[measure];
    if (typeof value !== 'number' || !Number.isFinite(value)
      || value < range.min || value > range.max || (SCALES[measure] && !Number.isInteger(value))) {
      throw apiError('invalid_field', `${measure} must be ${SCALES[measure] ? 'a whole number' : 'a number'} between ${range.min} and ${range.max}, or null.`);
    }
  }
  return Object.fromEntries(MEASURES.map(measure => [measure, body[measure] ?? null]));
}

function clock(ctx) {
  const at = ctx.now();
  const day = ctx.missionDay();
  if (typeof at !== 'string' || !at.endsWith('Z') || !Number.isFinite(Date.parse(at))
    || !Number.isInteger(day) || missionDayOf(at) !== day) {
    throw apiError('server_error', 'The health module needs one consistent UTC mission clock.');
  }
  return { at, day };
}

function requestedCrew(req) {
  if (req.user.role === 'medical_officer' && req.user.crewId !== MEDICAL_OFFICER_ID) {
    throw apiError('wrong_role', 'Only the configured medical officer may use this role.');
  }
  return resolveCrewId(req.user, req.query.crewId);
}

export function createHealthModule({ fixtureUrl } = {}) {
  // Serialize this module's read/modify/save operations on the single onboard server.
  let pending = Promise.resolve();
  const serial = operation => {
    const result = pending.then(operation);
    pending = result.catch(() => {});
    return result;
  };

  async function resetState(ctx) {
    let rawPacket;
    let fixtureSource = 'explicit-file';
    try {
      rawPacket = await readFile(fixtureUrl ?? PETROS_FIXTURE, 'utf8');
      if (fixtureUrl === undefined) fixtureSource = 'petros-demo-data';
    } catch (error) {
      if (fixtureUrl !== undefined || error.code !== 'ENOENT') throw error;
      rawPacket = await readFile(DEFAULT_FIXTURE, 'utf8');
      fixtureSource = 'bundled-pet1-example';
    }
    const packet = JSON.parse(rawPacket);
    checkFields(packet, ['contractVersion', 'kind', 'crew'], ['contractVersion', 'kind', 'crew']);
    if (packet.contractVersion !== CONTRACT_VERSION || packet.kind !== 'synthetic') {
      throw apiError('invalid_field', 'Use a labelled synthetic fixture for this demo contract version.');
    }
    checkFields(packet.crew, CREW.map(member => member.id), CREW.map(member => member.id));
    const crew = {};
    for (const member of CREW) {
      const raw = checkFields(packet.crew[member.id], ['story', 'checkIns'], ['checkIns']);
      if (!Array.isArray(raw.checkIns)) throw apiError('invalid_field', 'Fixture checkIns must be an array.');
      const days = new Set();
      const rows = raw.checkIns.map(row => {
        checkFields(row, ['missionDay', 'time', ...MEASURES], ['missionDay', 'time']);
        if (!Number.isInteger(row.missionDay) || row.missionDay < BASELINE_DAYS.from
          || row.missionDay >= missionDayOf(DEMO_START) || days.has(row.missionDay)
          || typeof row.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(row.time)) {
          throw apiError('invalid_field', 'Fixture days must be unique reference/recent days before demo start, with HH:MM time.');
        }
        days.add(row.missionDay);
        const fields = Object.fromEntries(MEASURES.filter(key => key in row).map(key => [key, row[key]]));
        const recordedAt = new Date(Date.parse(LAUNCH) + row.missionDay * 86400000
          + Number(row.time.slice(0, 2)) * 3600000 + Number(row.time.slice(3)) * 60000).toISOString();
        return { id: `health_${member.id}_d${row.missionDay}`, crewId: member.id, recordedAt,
          missionDay: row.missionDay, ...validateValues(fields) };
      }).sort((a, b) => a.missionDay - b.missionDay);
      const baseline = rows.filter(row => row.missionDay <= BASELINE_DAYS.to);
      if (!baseline.length) throw apiError('invalid_field', `The fixture needs a personal reference for ${member.id}.`);
      crew[member.id] = { baseline, checkIns: rows.filter(row => row.missionDay > BASELINE_DAYS.to), workouts: [] };
    }
    const state = { contractVersion: CONTRACT_VERSION, scaleVersion: 'self-report-1-10-v1',
      source: { kind: 'synthetic', fixture: fixtureSource,
        sha256: createHash('sha256').update(rawPacket).digest('hex') }, crew };
    await ctx.store.save(state);
    return state;
  }

  async function load(ctx) {
    const saved = await ctx.store.load();
    if (saved === null) return resetState(ctx);
    if (saved.contractVersion !== CONTRACT_VERSION || saved.scaleVersion !== 'self-report-1-10-v1'
      || CREW.some(member => !saved.crew?.[member.id])) {
      throw apiError('server_error', 'Health storage has an incompatible version; do not silently migrate it.');
    }
    const state = structuredClone(saved);
    for (const person of Object.values(state.crew)) {
      // Additive storage field: preserve sessions saved before workouts existed.
      if (person.workouts === undefined) person.workouts = [];
      if (!Array.isArray(person.baseline) || !Array.isArray(person.checkIns) || !Array.isArray(person.workouts)) {
        throw apiError('server_error', 'Health storage has an incompatible history layout.');
      }
    }
    return state;
  }

  const read = handler => (req, ctx) => serial(async () => handler(req, ctx, await load(ctx)));
  return {
    name: 'health', owner: 'angelos',
    reset: ctx => serial(() => resetState(ctx)),
    routes: [
      { method: 'POST', path: '/check-ins', roles: ['crew'], status: 201,
        handler: read(async (req, ctx, state) => {
          checkFields(req.query, []);
          const crewId = requestedCrew(req);
          const fields = validateValues(req.body);
          if (Object.values(fields).every(value => value === null)) {
            throw apiError('invalid_field', 'Provide at least one measured value. Leave other measurements blank if unavailable.');
          }
          const { at, day } = clock(ctx);
          if (day <= BASELINE_DAYS.to) throw apiError('invalid_field', 'New check-ins must follow the fixed reference period.');
          const person = state.crew[crewId];
          if (person.checkIns.some(row => row.missionDay === day)) {
            throw apiError('already_done', 'A check-in is already saved for this mission day.');
          }
          if (person.checkIns.some(row => row.missionDay > day)) {
            throw apiError('invalid_field', 'Reset the demo before submitting on an earlier mission day.');
          }
          const checkIn = { id: `health_${crewId}_d${day}`, crewId, recordedAt: at, missionDay: day, ...fields };
          person.checkIns.push(checkIn);
          await ctx.store.save(state);
          ctx.emit('health.check-in-saved', crewId);
          return { checkIn, today: todayFor(person, crewId, day) };
        }) },
      { method: 'GET', path: '/today', roles: ['crew'],
        handler: read((req, ctx, state) => {
          checkFields(req.query, []);
          const crewId = requestedCrew(req);
          return todayFor(state.crew[crewId], crewId, clock(ctx).day);
        }) },
      { method: 'GET', path: '/daily', roles: ['medical_officer'],
        handler: read((req, ctx, state) => {
          checkFields(req.query, ['crewId']);
          const crewId = requestedCrew(req);
          return dailyFor(state.crew[crewId], crewId, clock(ctx).day);
        }) },
      { method: 'GET', path: '/history', roles: ['medical_officer'],
        handler: read((req, ctx, state) => {
          checkFields(req.query, ['crewId', 'days']);
          const crewId = requestedCrew(req);
          const days = requestedDays(req.query.days, 14);
          const day = clock(ctx).day;
          return { crewId, baseline: state.crew[crewId].baseline,
            checkIns: state.crew[crewId].checkIns.filter(row => row.missionDay >= day - days + 1
              && row.missionDay <= day).sort((a, b) => a.missionDay - b.missionDay) };
        }) },
      { method: 'GET', path: '/crew', roles: ['medical_officer'],
        handler: read((req, ctx, state) => {
          checkFields(req.query, []);
          requestedCrew(req);
          const day = clock(ctx).day;
          return { crew: CREW.map(member => {
            const daily = dailyFor(state.crew[member.id], member.id, day);
            return { crewId: member.id, checkedInToday: daily.checkedInToday, status: daily.status,
              changed: daily.measures.filter(item => item.changed).map(item => item.measure) };
          }) };
        }) },
      { method: 'GET', path: '/weekly', roles: ['medical_officer'],
        handler: read((req, ctx, state) => {
          checkFields(req.query, ['crewId']);
          const crewId = requestedCrew(req);
          return weeklyFor(state.crew[crewId], crewId, clock(ctx).day);
        }) },
      { method: 'POST', path: '/workouts', roles: ['crew'], status: 201,
        handler: read(async (req, ctx, state) => {
          checkFields(req.query, []);
          const crewId = requestedCrew(req);
          const values = validateWorkout(req.body, clock(ctx).at);
          const workouts = state.crew[crewId].workouts;
          if (workouts.some(row => row.kind === values.kind && row.startedAt === values.startedAt
            && row.endedAt === values.endedAt)) {
            throw apiError('already_done', 'This workout is already saved. Reload your workouts before retrying.');
          }
          const workout = { id: `workout_${crewId}_${randomUUID()}`, crewId, ...values };
          workouts.push(workout);
          await ctx.store.save(state);
          ctx.emit('health.workout-saved', crewId);
          return { workout };
        }) },
      { method: 'GET', path: '/workouts', roles: ['crew', 'medical_officer'],
        handler: read((req, ctx, state) => {
          checkFields(req.query, ['crewId', 'days']);
          const crewId = requestedCrew(req);
          const days = requestedDays(req.query.days, 7);
          const { at, day } = clock(ctx);
          return { workouts: state.crew[crewId].workouts.filter(row => row.missionDay >= day - days + 1
            && row.missionDay <= day && Date.parse(row.endedAt) <= Date.parse(at))
            .sort((a, b) => a.endedAt.localeCompare(b.endedAt) || a.id.localeCompare(b.id)) };
        }) },
    ],
  };
}

export default createHealthModule();
