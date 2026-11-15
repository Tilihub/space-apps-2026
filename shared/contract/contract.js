// @ts-check
/**
 * Onboard app contract, version 1: the names, lists and helpers that every module, the server
 * core and the pages share. The rules around them are in README.md next to this file.
 *
 * Browser-safe: no Node imports, so the pages load this same file.
 * Changing anything here needs a pull request that a teammate approves.
 */

export const CONTRACT_VERSION = 1;

// ---- Mission clock --------------------------------------------------------------------------
// All times are ISO 8601 in UTC, for example "2026-11-14T07:30:00.000Z". On the server,
// mission time comes only from ctx.now(); in the pages, only from GET /api/clock.

/** Mission day 0 starts here. */
export const LAUNCH = '2026-10-03T00:00:00.000Z';

/** A demo reset puts the mission clock here: mission day 42, 07:30. */
export const DEMO_START = '2026-11-14T07:30:00.000Z';

/** Mission days that make up each crew member's frozen "normal" (baseline). */
export const BASELINE_DAYS = Object.freeze({ from: 29, to: 35 });

const DAY_MS = 86_400_000;

/**
 * @param {string} iso
 * @returns {number} whole mission days since LAUNCH
 */
export const missionDayOf = (iso) => Math.floor((Date.parse(iso) - Date.parse(LAUNCH)) / DAY_MS);

/**
 * @param {string} iso
 * @returns {string} mission time of day, "HH:MM"
 */
export const missionTimeOf = (iso) => new Date(iso).toISOString().slice(11, 16);

// ---- Crew and roles -------------------------------------------------------------------------

/** @typedef {'crew' | 'medical_officer' | 'earth'} Role */

/** @type {readonly Role[]} */
export const ROLES = Object.freeze(['crew', 'medical_officer', 'earth']);

/** @typedef {{ id: string, name: string, title: string, medicalOfficer: boolean }} CrewMember */

/**
 * The five crew members (fictional). Only the medical officer uses the medical officer
 * platform; they are also a normal crew member. There is no backup medical officer.
 * @type {readonly CrewMember[]}
 */
export const CREW = Object.freeze(
  [
    { id: 'c1', name: 'Mara Quinn', title: 'Commander', medicalOfficer: false },
    { id: 'c2', name: 'Leo Haddad', title: 'Medical officer', medicalOfficer: true },
    { id: 'c3', name: 'Ines Sato', title: 'Flight engineer', medicalOfficer: false },
    { id: 'c4', name: 'Tomas Reyes', title: 'Mission specialist', medicalOfficer: false },
    { id: 'c5', name: 'Kai Lindqvist', title: 'Pilot', medicalOfficer: false },
  ].map((member) => Object.freeze(member)),
);

export const MEDICAL_OFFICER_ID = 'c2';

/**
 * @param {unknown} id
 * @returns {id is string}
 */
export const isCrewId = (id) => CREW.some((member) => member.id === id);

// ---- Scales and measurements ----------------------------------------------------------------

/** Self-reports, whole numbers (Tommy, Q17). Exact wording of the ends comes with PET-2. */
export const SCALES = Object.freeze({
  mood: { min: 1, max: 10, higherMeans: 'better mood' },
  stress: { min: 1, max: 10, higherMeans: 'more stress' },
  fatigue: { min: 1, max: 10, higherMeans: 'more fatigue' },
  symptomSeverity: { min: 1, max: 10, higherMeans: 'worse' },
});

/**
 * Measured values: field name, unit, and the range the server accepts.
 * The ranges only catch typing mistakes; they are not medical limits.
 */
export const MEASUREMENTS = Object.freeze({
  sleepHours: { label: 'Sleep in the last 24 hours', unit: 'h', min: 0, max: 24 },
  restingHeartRateBpm: { label: 'Resting heart rate', unit: 'bpm', min: 20, max: 250 },
  spo2Pct: { label: 'Blood oxygen', unit: '%', min: 50, max: 100 },
  systolicMmHg: { label: 'Blood pressure, upper', unit: 'mmHg', min: 50, max: 260 },
  diastolicMmHg: { label: 'Blood pressure, lower', unit: 'mmHg', min: 30, max: 160 },
  temperatureC: { label: 'Body temperature', unit: '°C', min: 30, max: 45 },
});

/** The five measures the health module compares with each crew member's normal, in display order. */
export const COMPARED_MEASURES = Object.freeze([
  'sleepHours',
  'restingHeartRateBpm',
  'mood',
  'stress',
  'fatigue',
]);

// ---- Symptoms and body areas ----------------------------------------------------------------

/** Points on the body figure. */
export const BODY_AREAS = Object.freeze([
  { id: 'head', label: 'Head' },
  { id: 'eyes', label: 'Eyes' },
  { id: 'nose-throat', label: 'Nose and throat' },
  { id: 'heart', label: 'Heart' },
  { id: 'lungs', label: 'Lungs' },
  { id: 'gut', label: 'Stomach and gut' },
  { id: 'skin', label: 'Skin' },
  { id: 'muscles', label: 'Muscles and bones' },
  { id: 'whole-body', label: 'Whole body' },
]);

/**
 * Symptom codes, from dadis2's list. redFlag: the app tells the crew member to call the
 * medical officer straight away.
 * @type {readonly { code: string, label: string, area: string, redFlag: boolean }[]}
 */
export const SYMPTOMS = Object.freeze([
  { code: 'headache', label: 'Headache', area: 'head', redFlag: false },
  { code: 'muscle-pain', label: 'Muscle or back pain', area: 'muscles', redFlag: false },
  { code: 'fever', label: 'Fever or chills', area: 'whole-body', redFlag: false },
  { code: 'sore-throat', label: 'Sore throat', area: 'nose-throat', redFlag: false },
  { code: 'nasal-congestion', label: 'Nasal congestion', area: 'nose-throat', redFlag: false },
  { code: 'runny-nose', label: 'Runny nose or sneezing', area: 'nose-throat', redFlag: false },
  { code: 'cough', label: 'Cough', area: 'lungs', redFlag: false },
  { code: 'insomnia', label: 'Trouble sleeping', area: 'whole-body', redFlag: false },
  { code: 'fatigue', label: 'Fatigue (shift work)', area: 'whole-body', redFlag: false },
  { code: 'motion-sickness', label: 'Space motion sickness', area: 'gut', redFlag: false },
  { code: 'nausea', label: 'Nausea', area: 'gut', redFlag: false },
  { code: 'diarrhea', label: 'Diarrhea', area: 'gut', redFlag: false },
  { code: 'constipation', label: 'Constipation', area: 'gut', redFlag: false },
  { code: 'heartburn', label: 'Heartburn or reflux', area: 'gut', redFlag: false },
  { code: 'dry-eyes', label: 'Dry or irritated eyes', area: 'eyes', redFlag: false },
  { code: 'itch-rash', label: 'Itchy skin or rash', area: 'skin', redFlag: false },
  { code: 'fungal-skin', label: 'Fungal skin infection', area: 'skin', redFlag: false },
  { code: 'minor-cut', label: 'Minor cut or abrasion', area: 'skin', redFlag: false },
  { code: 'chest-pain', label: 'Chest pain or pressure', area: 'heart', redFlag: true },
  { code: 'breathing', label: 'Shortness of breath', area: 'lungs', redFlag: true },
  {
    code: 'neuro-headache',
    label: 'Severe headache with vision change, weakness or confusion',
    area: 'head',
    redFlag: true,
  },
  { code: 'eye-injury', label: 'Eye injury or foreign body in eye', area: 'eyes', redFlag: true },
  { code: 'unconscious', label: 'Fainting or loss of consciousness', area: 'whole-body', redFlag: true },
  { code: 'throat-swelling', label: 'Throat, lip or face swelling', area: 'nose-throat', redFlag: true },
  { code: 'heavy-bleeding', label: 'Heavy bleeding', area: 'whole-body', redFlag: true },
  { code: 'severe-abdominal', label: 'Severe abdominal pain', area: 'gut', redFlag: true },
].map((symptom) => Object.freeze(symptom)));

// ---- Medicines ------------------------------------------------------------------------------

/**
 * Medicine tiers and who approves them (dadis2's rules, team decision 14 Nov).
 * Earth may also approve anything the medical officer can. The medical officer approves their own
 * requests too (agreed terms, 15 Nov), and can take any medicine from the cabinet. Emergency items
 * open only through the emergency button.
 */
export const MED_TIERS = Object.freeze({
  supply: { label: 'Supplies', approval: 'none' },
  'self-care': { label: 'Self-care', approval: 'none' },
  prescription: { label: 'Prescription', approval: 'medical_officer' },
  controlled: { label: 'Controlled', approval: 'earth' },
  emergency: { label: 'Emergency', approval: 'emergency' },
});

// ---- Events ---------------------------------------------------------------------------------

/**
 * Everything ctx.emit() may send. An event says only what changed and for whom, never content,
 * so pages know what to reload. The mind module sends none.
 */
export const EVENTS = Object.freeze([
  'pulsars.changed', // own wallet/appearance changed; no answers or balance in event
  'health.check-in-saved',
  'health.workout-saved',
  'meds.symptom-reported',
  'meds.request-created',
  'meds.request-decided',
  'meds.grant-added',
  'meds.collection-opened',
  'meds.dose-collected',
  'meds.collection-closed',
  'meds.allergy-changed',
  'meds.emergency-raised', // every open page shows the alarm
  'meds.emergency-updated',
  'env.alert-opened',
  'env.alert-recovered',
  'clock.advanced',
  'demo.reset',
  'example.note-saved', // only the example module uses this
]);

/**
 * @param {string} type
 * @returns {void}
 */
export const checkEvent = (type) => {
  if (!EVENTS.includes(type)) {
    throw new Error(`Unknown event "${type}". Use one from EVENTS in shared/contract/contract.js.`);
  }
};

// ---- Errors ---------------------------------------------------------------------------------

/** Error codes and their HTTP status. */
/** @type {Readonly<Record<string, number>>} */
export const ERRORS = Object.freeze({
  invalid_field: 400, // a field is unknown, missing, or out of range
  invalid_code: 400, // a grant code that doesn't check out
  not_logged_in: 401,
  wrong_role: 403, // this role may not call this at all
  not_your_data: 403, // a crew member asked for someone else's data
  needs_approval: 403, // this medicine needs approval first
  needs_earth: 403, // only Earth may approve this
  not_found: 404,
  already_done: 409, // for example, already checked in today, or this dose was already collected
  not_due: 409, // nothing is due right now
  server_error: 500,
});

/** @typedef {Error & { status: number, code: string, apiError: true }} ApiError */

/**
 * Make an error to throw from a handler. The message is shown to the person, so write it plainly.
 * @param {string} code one of ERRORS
 * @param {string} message
 * @returns {ApiError}
 */
export const apiError = (code, message) => {
  const status = ERRORS[code];
  if (status === undefined) {
    throw new Error(`Unknown error code "${code}". Use one from ERRORS in shared/contract/contract.js.`);
  }
  return Object.assign(new Error(message), { status, code, apiError: /** @type {const} */ (true) });
};

/**
 * @param {unknown} err
 * @returns {err is ApiError}
 */
const isApiError = (err) => err instanceof Error && /** @type {Partial<ApiError>} */ (err).apiError === true;

// ---- Checks every module uses ---------------------------------------------------------------

/**
 * Refuse a body with unknown or missing fields, so a mismatch fails loudly instead of silently.
 * A field that is null counts as missing for `required`.
 * @param {unknown} body
 * @param {readonly string[]} allowed
 * @param {readonly string[]} [required]
 * @returns {Record<string, any>} the same body
 */
export const checkFields = (body, allowed, required = []) => {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw apiError('invalid_field', 'Send a JSON object.');
  }
  const record = /** @type {Record<string, any>} */ (body);
  const unknown = Object.keys(record).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) throw apiError('invalid_field', `Unknown field(s): ${unknown.join(', ')}.`);
  const missing = required.filter((key) => record[key] === undefined || record[key] === null);
  if (missing.length > 0) throw apiError('invalid_field', `Missing field(s): ${missing.join(', ')}.`);
  return record;
};

/**
 * Whose data a request may touch. Crew get only their own; the medical officer gets anyone's;
 * Earth gets no crew data this way. Leaving `requested` out means "my own".
 * @param {User} user
 * @param {unknown} [requested] usually req.query.crewId
 * @returns {string} the crew id to use
 */
export const resolveCrewId = (user, requested) => {
  if (user.role === 'earth') throw apiError('wrong_role', 'The Earth console cannot see crew data here.');
  const wanted = requested === undefined || requested === null || requested === '' ? user.crewId : requested;
  if (!isCrewId(wanted)) throw apiError('invalid_field', `Unknown crew member: ${String(wanted)}.`);
  if (user.role === 'medical_officer') return wanted;
  if (wanted !== user.crewId) throw apiError('not_your_data', 'Crew members can only see their own data.');
  return wanted;
};

// ---- Module shape ---------------------------------------------------------------------------

/**
 * @typedef {object} User who is calling, set by the core from the login
 * @property {string | null} crewId null for the Earth console
 * @property {Role} role
 */

/**
 * @typedef {object} Request
 * @property {User} user
 * @property {Record<string, string>} params from the ":name" parts of the route path
 * @property {Record<string, string>} query the URL query, as strings
 * @property {any} body the parsed JSON body, or null
 */

/**
 * @typedef {object} Store this module's saved data, kept and written to disk by the core
 * @property {() => Promise<any>} load the state last saved, or null before the first save
 * @property {(state: any) => Promise<void>} save replace the state; must be plain JSON data
 */

/**
 * @typedef {object} Context what the core gives every module
 * @property {() => string} now mission time, ISO 8601 UTC. Never use new Date() for mission time
 * @property {() => number} missionDay today's mission day number
 * @property {Store} store
 * @property {(type: string, crewId?: string | null) => void} emit tell open pages something changed
 * @property {(...args: unknown[]) => void} log print to the server console
 */

/**
 * @typedef {object} Route
 * @property {'GET' | 'POST' | 'PUT' | 'DELETE'} method
 * @property {string} path after the module's prefix, for example "/check-ins" or "/doses/:id/follow-up"
 * @property {readonly Role[]} roles who may call it; anyone else gets wrong_role
 * @property {number} [status] the success status, 200 if left out (use 201 when something is created)
 * @property {(req: Request, ctx: Context) => Promise<unknown>} handler returns the data, or throws apiError()
 */

/**
 * @typedef {object} Module what a module's index.js default-exports
 * @property {string} name the URL prefix: "health" serves /api/health/...
 * @property {string} owner
 * @property {readonly Route[]} routes
 * @property {(ctx: Context) => Promise<void>} reset save the demo start data, the same every time
 * @property {(ctx: Context) => Promise<void>} [tick] optional; the core calls it every 5 seconds
 */

/**
 * @typedef {{ ok: true, data: unknown } | { ok: false, error: { code: string, message: string } }} Envelope
 */

/**
 * Find the route for a path (the part after /api/<module>).
 * @param {readonly Route[]} routes
 * @param {string} method
 * @param {string} path
 * @returns {{ route: Route, params: Record<string, string> } | null}
 */
export const matchRoute = (routes, method, path) => {
  const parts = path.split('/').filter(Boolean);
  for (const route of routes) {
    if (route.method !== method) continue;
    const pattern = route.path.split('/').filter(Boolean);
    if (pattern.length !== parts.length) continue;
    /** @type {Record<string, string>} */
    const params = {};
    const matches = pattern.every((piece, i) => {
      if (piece.startsWith(':')) {
        params[piece.slice(1)] = decodeURIComponent(parts[i]);
        return true;
      }
      return piece === parts[i];
    });
    if (matches) return { route, params };
  }
  return null;
};

/**
 * Run one request through a module exactly as the server does. The core and every module's
 * tests both use this, so a module that passes its tests behaves the same in the app.
 * @param {Module} mod
 * @param {Context} ctx
 * @param {{ method: string, path: string, user: User | null, query?: Record<string, string>, body?: any }} request
 * @returns {Promise<{ status: number, body: Envelope }>}
 */
export const handleRequest = async (mod, ctx, { method, path, user, query = {}, body = null }) => {
  try {
    const found = matchRoute(mod.routes, method, path);
    if (!found) throw apiError('not_found', `There is no ${method} /api/${mod.name}${path}.`);
    if (!user) throw apiError('not_logged_in', 'Log in first.');
    if (!found.route.roles.includes(user.role)) {
      throw apiError('wrong_role', `The ${user.role} role cannot do this.`);
    }
    const data = await found.route.handler({ user, params: found.params, query, body }, ctx);
    // Round-trip through JSON so tests see exactly what the pages will get.
    return { status: found.route.status ?? 200, body: { ok: true, data: JSON.parse(JSON.stringify(data ?? null)) } };
  } catch (err) {
    if (isApiError(err)) {
      return { status: err.status, body: { ok: false, error: { code: err.code, message: err.message } } };
    }
    ctx.log(`[${mod.name}]`, err);
    return {
      status: 500,
      body: { ok: false, error: { code: 'server_error', message: `Something went wrong in the ${mod.name} module.` } },
    };
  }
};
