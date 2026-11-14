import { spawn } from 'node:child_process';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ChatError } from '../../people/potest/crew-support/chat.mjs';
import { createCrewSupportServer } from '../../people/potest/crew-support/server.mjs';
import { getComparisonReply } from './replies.mjs';

const bridge = fileURLToPath(new URL('./health_bridge.py', import.meta.url));
const example = JSON.parse(await readFile(new URL('./tomas-check-in.json', import.meta.url), 'utf8'));
const assets = new Map([
  ['/crew-assistant', ['text/html', await readFile(new URL('./index.html', import.meta.url))]],
  ['/crew-assistant.css', ['text/css', await readFile(new URL('./page.css', import.meta.url))]],
  ['/crew-assistant.mjs', ['text/javascript', await readFile(new URL('./page.mjs', import.meta.url))]],
]);
const cases = [
  { id: 'none', label: 'No context', checkIn: false, health: false },
  { id: 'check-in', label: 'Check-in only', checkIn: true, health: false },
  { id: 'health', label: 'Health data only', checkIn: false, health: true },
  { id: 'both', label: 'Full context', checkIn: true, health: true },
];

function callHealth(python, database, operation, data) {
  return new Promise((resolve, reject) => {
    const child = spawn(python, ['-B', bridge, database, operation], {
      windowsHide: true, timeout: 8_000,
    });
    let stdout = '';
    child.stdout.setEncoding('utf8').on('data', chunk => { stdout += chunk; });
    child.stderr.resume();
    child.on('error', reject);
    child.stdin.on('error', reject);
    child.on('close', code => {
      if (code !== 0) return reject(new Error('Check-in process failed.'));
      try {
        const result = JSON.parse(stdout);
        if (result.error) return reject(new ChatError(400, result.error));
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
    child.stdin.end(data === undefined ? undefined : JSON.stringify(data));
  });
}

export async function createDemoServer({ python = process.env.CREW_ASSISTANT_PYTHON || 'python' } = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'crew-assistant-'));
  const database = join(directory, 'tomas.sqlite3');
  const cleanup = () => rm(directory, { recursive: true, force: true });
  try {
    await callHealth(python, database, 'read');
  } catch {
    await cleanup();
    throw new Error('The check-in store could not start. Check that Python 3 is available and that the PET-1 fixture is present.');
  }
  const server = createCrewSupportServer({
    async handleRequest({ request, response, path, send, readBody }) {
      const asset = assets.get(path);
      if (request.method === 'GET' && asset) {
        response.setHeader('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
        send(200, asset[1], asset[0]);
        return true;
      }
      if (path === '/api/crew-assistant/state' && request.method === 'GET') {
        send(200, { ...await callHealth(python, database, 'read'), example });
        return true;
      }
      if (path === '/api/crew-assistant/check-in' && request.method === 'POST') {
        send(201, await callHealth(python, database, 'save', await readBody()));
        return true;
      }
      if (path !== '/api/crew-assistant/compare' || request.method !== 'GET') return false;
      const state = await callHealth(python, database, 'read');
      if (!state.checkIn) throw new ChatError(409, 'Save the mission-day check-in before comparing replies.');
      const comparisons = cases.map(({ id, label, checkIn, health }) => ({
        id,
        label,
        usesHistory: health,
        reply: getComparisonReply({
          checkIn: checkIn ? state.checkIn : undefined,
          sleepHistory: health ? state.health.sleep_hours : undefined,
          shortSleepDays: health ? state.shortSleepDays : 0,
        }),
      }));
      if (!response.destroyed) send(200, { comparisons });
      return true;
    },
  });
  return { server, cleanup };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { server, cleanup } = await createDemoServer();
  const port = Number(process.env.CREW_ASSISTANT_PORT ?? '4171');
  server.listen(port, '127.0.0.1', () => {
    console.log(`Crew Assistant comparison: http://127.0.0.1:${server.address().port}/crew-assistant`);
  });
  const stop = () => server.close(async () => { await cleanup(); });
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}
