// Browser-facing adapter for the one onboard core. Authentication stays in the core.
export class HealthApiError extends Error {
  constructor(message, { code, status = 0, cause } = {}) {
    super(message, { cause });
    this.name = 'HealthApiError';
    this.code = code;
    this.status = status;
  }
}

export function createHealthClient({ token, baseUrl = '/api/health', fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required.');
  if (typeof baseUrl !== 'string' || !baseUrl.trim() || /[?#]/.test(baseUrl)) {
    throw new TypeError('baseUrl must be a health API path without a query or fragment.');
  }
  const root = baseUrl.replace(/\/+$/, '');
  async function request(path, { body, query = {}, method = 'GET' } = {}) {
    const currentToken = typeof token === 'function' ? token() : token;
    if (typeof currentToken !== 'string' || !currentToken.trim()) {
      throw new HealthApiError('Log in before requesting health data.', { code: 'not_logged_in', status: 401 });
    }
    const parameters = new URLSearchParams(Object.entries(query).filter(([, value]) => value !== undefined));
    const encoded = body === undefined ? undefined : JSON.stringify(body, (key, value) => {
      if (typeof value === 'number' && !Number.isFinite(value)) {
        throw new TypeError('Use finite numbers or explicit null for missing measurements.');
      }
      return value;
    });
    const response = await fetchImpl(`${root}${path}${parameters.size ? `?${parameters}` : ''}`, {
      method, cache: 'no-store',
      headers: { Authorization: `Bearer ${currentToken}`,
        ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}) },
      ...(body === undefined ? {} : { body: encoded }),
    });
    let envelope;
    try {
      envelope = await response.json();
    } catch (cause) {
      throw new HealthApiError('The health service returned an unreadable response.',
        { code: 'invalid_response', status: response.status, cause });
    }
    if (!response.ok) {
      throw new HealthApiError(envelope?.error?.message ?? 'The health request failed.',
        { code: envelope?.error?.code ?? 'invalid_response', status: response.status });
    }
    if (envelope?.ok !== true || !Object.hasOwn(envelope, 'data')) {
      throw new HealthApiError('The health service returned an unexpected response.',
        { code: 'invalid_response', status: response.status });
    }
    return envelope.data;
  }
  const getToday = () => request('/today');
  return Object.freeze({
    submitCheckIn: body => request('/check-ins', { method: 'POST', body }),
    getToday,
    getDaily: ({ crewId } = {}) => request('/daily', { query: { crewId } }),
    getHistory: ({ crewId, days } = {}) => request('/history', { query: { crewId, days } }),
    getWeekly: ({ crewId } = {}) => request('/weekly', { query: { crewId } }),
    getCrew: () => request('/crew'),
    submitWorkout: body => request('/workouts', { method: 'POST', body }),
    getWorkouts: ({ crewId, days } = {}) => request('/workouts', { query: { crewId, days } }),
    // Only the basic current entry is approved as the companion's health context.
    // Do not add clinical analyses, history or journal content here.
    getCompanionContext: async () => ({ today: await getToday() }),
  });
}
