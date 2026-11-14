import { spawn } from 'node:child_process';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ChatError, DEFAULT_MODEL, getReply, validateMessages } from '../../people/potest/crew-support/chat.mjs';
import { createCrewSupportServer } from '../../people/potest/crew-support/server.mjs';

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

export async function createDemoServer({ apiKey, model = DEFAULT_MODEL, demo = false,
  python = process.env.CREW_ASSISTANT_PYTHON || 'python', fetchOpenAI = globalThis.fetch } = {}) {
  const mode = demo ? 'demo' : apiKey ? 'live' : 'unconfigured';
  const directory = await mkdtemp(join(tmpdir(), 'crew-assistant-'));
  const database = join(directory, 'tomas.sqlite3');
  const cleanup = () => rm(directory, { recursive: true, force: true });
  try {
    await callHealth(python, database, 'read');
  } catch {
    await cleanup();
    throw new Error('The check-in store could not start. Check that Python 3 is available and that the PET-1 fixture is present.');
  }
  let comparing = false;

  const server = createCrewSupportServer({ apiKey, model, demo, fetchOpenAI,
    async handleRequest({ request, response, path, send, readBody }) {
      const asset = assets.get(path);
      if (request.method === 'GET' && asset) {
        response.setHeader('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
        send(200, asset[1], asset[0]);
        return true;
      }
      if (path === '/api/crew-assistant/state' && request.method === 'GET') {
        send(200, { ...await callHealth(python, database, 'read'), example, mode });
        return true;
      }
      if (path === '/api/crew-assistant/check-in' && request.method === 'POST') {
        send(201, await callHealth(python, database, 'save', await readBody()));
        return true;
      }
      if (path !== '/api/crew-assistant/compare' || request.method !== 'POST') return false;
      if (mode === 'unconfigured') throw new ChatError(503, 'Set OPENAI_API_KEY or start the server with --demo.');
      if (comparing) throw new ChatError(429, 'A comparison is already running.');
      comparing = true;
      const disconnected = new AbortController();
      response.once('close', () => disconnected.abort());
      try {
        const body = await readBody();
        const messages = validateMessages([{ role: 'user', content: body?.message }]);
        const state = await callHealth(python, database, 'read');
        if (!state.checkIn) throw new ChatError(409, 'Save the mission-day check-in before comparing replies.');
        const timeout = AbortSignal.timeout(25_000);
        const signal = AbortSignal.any([timeout, disconnected.signal]);
        const comparisons = await Promise.all(cases.map(async ({ id, label, checkIn, health }) => {
          const context = {};
          if (checkIn) context.checkIn = state.checkIn;
          if (health) context.health = state.health;
          try {
            const result = await getReply(messages, { mode, model, apiKey, fetchOpenAI, signal, context });
            return { id, label, ...result };
          } catch (error) {
            const message = error instanceof ChatError ? error.message : 'OpenAI did not respond. Check the connection.';
            return { id, label, error: timeout.aborted ? 'OpenAI took too long.' : message };
          }
        }));
        if (!response.destroyed) send(200, { mode, comparisons });
      } finally {
        comparing = false;
      }
      return true;
    },
  });
  return { server, cleanup };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { server, cleanup } = await createDemoServer({
    apiKey: process.env.OPENAI_API_KEY?.trim(),
    model: process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL,
    demo: process.argv.includes('--demo'),
  });
  const port = Number(process.env.CREW_ASSISTANT_PORT ?? '4171');
  server.listen(port, '127.0.0.1', () => {
    console.log(`Crew Assistant comparison: http://127.0.0.1:${server.address().port}/crew-assistant`);
  });
  const stop = () => server.close(async () => { await cleanup(); });
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}
