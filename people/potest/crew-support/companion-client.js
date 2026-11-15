import { createHealthClient, HealthApiError } from '../../angelos/health/client.js';

export function createCompanionClient({ getToken, fetchImpl = globalThis.fetch }) {
  let sessionVersion = 0;
  const health = createHealthClient({ token: getToken, fetchImpl });

  return {
    clearSession() {
      sessionVersion += 1;
    },
    async send(message) {
      const token = getToken();
      const version = sessionVersion;
      const ensureCurrentSession = () => {
        if (version !== sessionVersion || token !== getToken()) {
          throw new HealthApiError('Your demo session changed. Send the message again.', { code: 'session_changed' });
        }
      };
      const context = await health.getCompanionContext();
      ensureCurrentSession();
      const response = await fetchImpl('/api/mind/companion', {
        method: 'POST',
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context }),
      });
      const envelope = await response.json();
      ensureCurrentSession();
      if (!response.ok || envelope?.ok !== true || typeof envelope.data?.reply !== 'string') {
        throw new HealthApiError(envelope?.error?.message ?? 'The companion request failed.', {
          code: envelope?.error?.code, status: response.status,
        });
      }
      return envelope.data;
    },
  };
}
