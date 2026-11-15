import { createHabitatView, loadHabitat } from './habitat-view.js';

const view = createHabitatView(document.querySelector('#habitat-preview'));
const connection = document.querySelector('#connection');
const clock = document.querySelector('#mission-clock');
const sessionKey = 'pulse-habitat-preview-token';
let token = sessionStorage.getItem(sessionKey);
let replay = null;

async function api(path, session = token, body) {
  const response = await fetch(`/api${path}`, {
    method: body ? 'POST' : 'GET',
    cache: 'no-store',
    headers: {
      ...(session ? { Authorization: `Bearer ${session}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw Object.assign(new Error(payload.error?.message), { status: response.status });
  return payload.data;
}

async function loadReplay() {
  if (!token) {
    const session = await api('/session', null, { crewId: 'c1', platform: 'astronaut' });
    token = session.token;
    sessionStorage.setItem(sessionKey, token);
  }

  return loadHabitat(api);
}

function setConnection(state, label) {
  connection.dataset.state = state;
  const text = connection.querySelector('span');
  if (text.textContent !== label) text.textContent = label;
}

async function refresh() {
  try {
    try {
      replay = await loadReplay();
    } catch (error) {
      if (error.status !== 401 || !token) throw error;
      token = null;
      sessionStorage.removeItem(sessionKey);
      replay = await loadReplay();
    }
    view.update(replay);
    clock.dateTime = replay.now.at;
    clock.textContent = replay.now.at.slice(11, 19) + ' UTC';
    setConnection('connected', 'Historical replay');
  } catch {
    setConnection('offline', replay ? 'Replay disconnected · last known data' : 'Replay unavailable · reconnecting');
  } finally {
    setTimeout(refresh, 3000);
  }
}

void refresh();
