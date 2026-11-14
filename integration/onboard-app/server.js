// @ts-check
/**
 * Puts the core on the network. /api/... goes to the core; everything else is a file:
 * the pages in pages/, plus the few files from other folders that the pages load
 * (contract section 5 and angelos's health/HANDOFF.md).
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { errorAnswer } from './core.js';

/** @typedef {Awaited<ReturnType<typeof import('./core.js').createCore>>} Core */

const REPO = normalize(fileURLToPath(new URL('../../', import.meta.url)));
const PAGES = normalize(fileURLToPath(new URL('./pages/', import.meta.url)));

/** Single files from other folders, at the same path as in the repo, so relative imports work. */
/** @type {Readonly<Record<string, string>>} */
const FILES = Object.freeze({
  '/shared/contract/contract.js': 'shared/contract/contract.js',
  '/people/angelos/health/client.js': 'people/angelos/health/client.js',
});

/** Whole folders, read-only. */
/** @type {Readonly<Record<string, string>>} */
const FOLDERS = Object.freeze({
  '/demo-data/': 'people/petros_the_space_larper/demo-data/',
});

/** @type {Readonly<Record<string, string>>} */
const TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.glb': 'model/gltf-binary',
  '.woff2': 'font/woff2',
});

const MAX_BODY_BYTES = 1_000_000;

/**
 * @param {string} root a folder, normalized
 * @param {string} relative
 * @returns {string | null} the file, or null if the path would leave the folder
 */
const inside = (root, relative) => {
  const full = normalize(join(root, relative));
  return full.startsWith(root) ? full : null;
};

/**
 * Which file on disk a page path means. Never anything outside the allowed folders.
 * @param {string} pathname from the URL, still encoded
 * @returns {string | null}
 */
export const fileFor = (pathname) => {
  let path;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (path.includes('\0') || path.split(/[\\/]/).includes('..')) return null;
  if (path.endsWith('/')) path += 'index.html';
  const single = FILES[path];
  if (single) return join(REPO, single);
  for (const [prefix, folder] of Object.entries(FOLDERS)) {
    if (path.startsWith(prefix)) return inside(normalize(join(REPO, folder)), path.slice(prefix.length));
  }
  return inside(PAGES, path.slice(1));
};

/**
 * @param {import('node:http').ServerResponse} res
 * @param {number} status
 * @param {string | Buffer} body
 * @param {string} type
 * @param {boolean} [head] true for HEAD: headers only
 * @returns {void}
 */
const send = (res, status, body, type, head = false) => {
  const bytes = typeof body === 'string' ? Buffer.from(body) : body;
  res.writeHead(status, { 'Content-Type': type, 'Content-Length': bytes.length, 'Cache-Control': 'no-store' });
  res.end(head ? undefined : bytes);
};

/**
 * @param {import('node:http').IncomingMessage} req
 * @returns {Promise<string | null>} the body, or null if it is too large
 */
const readBody = (req) =>
  new Promise((resolve, reject) => {
    /** @type {Buffer[]} */
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size <= MAX_BODY_BYTES) chunks.push(chunk);
    });
    req.on('end', () => resolve(size > MAX_BODY_BYTES ? null : Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });

/**
 * @param {Core} core
 * @param {import('node:http').IncomingMessage} req
 * @param {URL} url
 * @returns {Promise<import('./core.js').Answer>}
 */
const apiAnswer = async (core, req, url) => {
  const method = req.method ?? 'GET';
  // The token only ever travels in this header, never in a URL (contract section 5).
  const match = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization ?? '');
  /** @type {any} */
  let body = null;
  if (method !== 'GET' && method !== 'HEAD') {
    const raw = await readBody(req);
    if (raw === null) return errorAnswer('invalid_field', 'The request is too large.');
    if (raw.trim() !== '') {
      try {
        body = JSON.parse(raw);
      } catch {
        return errorAnswer('invalid_field', 'Send valid JSON.');
      }
    }
  }
  return core.api({
    method,
    path: url.pathname.slice('/api'.length) || '/',
    token: match ? match[1] : null,
    query: Object.fromEntries(url.searchParams),
    body,
  });
};

/**
 * @param {Core} core
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @returns {Promise<void>}
 */
const handle = async (core, req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
    const { status, body } = await apiAnswer(core, req, url);
    send(res, status, JSON.stringify(body), TYPES['.json']);
    return;
  }
  const head = req.method === 'HEAD';
  if (req.method !== 'GET' && !head) {
    send(res, 405, 'Only GET works here.', TYPES['.txt']);
    return;
  }
  const file = fileFor(url.pathname);
  const info = file ? await stat(file).catch(() => null) : null;
  if (!file || !info) {
    send(res, 404, 'Not found.', TYPES['.txt'], head);
    return;
  }
  if (info.isDirectory()) {
    res.writeHead(301, { Location: `${url.pathname}/${url.search}` });
    res.end();
    return;
  }
  send(res, 200, await readFile(file), TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream', head);
};

/**
 * @param {object} options
 * @param {Core} options.core
 * @param {number} [options.port] 0 picks a free port (tests)
 * @param {string} [options.host] 0.0.0.0 so other devices on the network can connect
 * @returns {Promise<{ port: number, close: () => Promise<void> }>}
 */
export const startServer = ({ core, port = 8000, host = '0.0.0.0' }) =>
  new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      handle(core, req, res).catch((err) => {
        console.error('[server]', err);
        if (!res.headersSent) send(res, 500, 'Server error.', TYPES['.txt']);
        else res.end();
      });
    });
    server.once('error', reject);
    server.listen(port, host, () => {
      const address = server.address();
      resolve({
        port: typeof address === 'object' && address ? address.port : port,
        close: () =>
          new Promise((done) => {
            server.close(() => done());
            server.closeAllConnections();
          }),
      });
    });
  });
