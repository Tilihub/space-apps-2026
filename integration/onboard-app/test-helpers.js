// @ts-check
/**
 * Starts a real core and server on a free port with a temporary data folder, for the tests.
 * Requests go over real HTTP, exactly as the pages will send them.
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCore } from './core.js';
import { startServer } from './server.js';

/** @typedef {{ status: number, body: any, type: string | null }} TestAnswer */

/**
 * @param {readonly import('../../shared/contract/contract.js').Module[]} modules
 * @param {{ dataDir?: string, realNow?: () => number }} [options] reuse dataDir to test a restart
 */
export const boot = async (modules, { dataDir, realNow } = {}) => {
  const dir = dataDir ?? (await mkdtemp(join(tmpdir(), 'onboard-core-')));
  /** @type {string[]} */
  const logs = [];
  const core = await createCore({ modules, dataDir: dir, realNow, log: (...args) => logs.push(args.map(String).join(' ')) });
  const server = await startServer({ core, port: 0, host: '127.0.0.1' });
  const base = `http://127.0.0.1:${server.port}`;

  /**
   * @param {string} method
   * @param {string} path the full path, for example "/api/clock"
   * @param {{ token?: string, body?: unknown, raw?: string }} [options]
   * @returns {Promise<TestAnswer>}
   */
  const call = async (method, path, { token, body, raw } = {}) => {
    /** @type {Record<string, string>} */
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
      redirect: 'manual',
    });
    const text = await res.text();
    const type = res.headers.get('content-type');
    return { status: res.status, body: type?.startsWith('application/json') ? JSON.parse(text) : text, type };
  };

  /**
   * @param {string | null} crewId
   * @param {'astronaut' | 'medical' | 'earth'} [platform]
   * @returns {Promise<string>} the token
   */
  const login = async (crewId, platform = 'astronaut') => {
    const answer = await call('POST', '/api/session', { body: { crewId, platform } });
    if (answer.status !== 201) throw new Error(`login failed: ${JSON.stringify(answer.body)}`);
    return answer.body.data.token;
  };

  /**
   * @param {{ keepData?: boolean }} [options]
   * @returns {Promise<void>}
   */
  const close = async ({ keepData = false } = {}) => {
    await server.close();
    await core.stop();
    if (!keepData) await rm(dir, { recursive: true, force: true });
  };

  return { core, call, login, close, dataDir: dir, logs };
};

/**
 * @param {TestAnswer} answer
 * @returns {any} the data of an ok answer
 */
export const dataOf = (answer) => {
  if (!answer.body?.ok) throw new Error(`expected ok, got ${answer.status} ${JSON.stringify(answer.body)}`);
  return answer.body.data;
};
