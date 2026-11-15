import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { ChatError, getScriptedReply, validateMessages } from './chat.mjs';

const MAX_BODY_BYTES = 160_000;
const SUPPORT_PLACEHOLDER = '<div class="box">Support</div>';
const dashboard = readFileSync(new URL('../../zt/ui-skeleton/index.html', import.meta.url), 'utf8');
if (!dashboard.includes(SUPPORT_PLACEHOLDER)) {
  throw new Error('The dashboard Support placeholder moved. Update the Crew Support demo link in server.mjs.');
}
const pages = new Map([
  ['/support', ['text/html', readFileSync(new URL('./index.html', import.meta.url))]],
  ['/support.css', ['text/css', readFileSync(new URL('./support.css', import.meta.url))]],
  ['/support.mjs', ['text/javascript', readFileSync(new URL('./support.mjs', import.meta.url))]],
]);

function send(response, status, body, type = 'application/json') {
  response.writeHead(status, { 'Content-Type': `${type}; charset=utf-8` });
  response.end(type === 'application/json' ? JSON.stringify(body) : body);
}

async function readBody(request) {
  if (!/^application\/json(?:;|$)/i.test(request.headers['content-type'] ?? '')) {
    throw new ChatError(415, 'Send JSON using Content-Type: application/json.');
  }
  if (Number(request.headers['content-length']) > MAX_BODY_BYTES) {
    throw new ChatError(413, 'The conversation is too large.');
  }
  const chunks = [];
  let length = 0;
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    length += chunk.length;
    if (length > MAX_BODY_BYTES) throw new ChatError(413, 'The conversation is too large.');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new ChatError(400, 'The request contains invalid JSON.');
  }
}

export function createCrewSupportServer({ handleRequest } = {}) {
  let activeRequests = 0;
  return createServer({ requestTimeout: 30_000, headersTimeout: 10_000 }, async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    const host = request.headers.host ?? '';
    if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host) ||
        (request.headers.origin && request.headers.origin !== `http://${host}`)) {
      return send(response, 403, { error: 'Use the local Crew Support address.' });
    }
    const path = request.url.split('?')[0];
    if (handleRequest) {
      try {
        if (await handleRequest({
          request, response, path, readBody: () => readBody(request),
          send: (status, body, type) => send(response, status, body, type),
        })) return;
      } catch (error) {
        if (response.destroyed) return;
        if (error instanceof ChatError) return send(response, error.status, { error: error.message });
        return send(response, 502, { error: 'The demo could not complete this request. Try again.' });
      }
    }
    if (request.method === 'GET') {
      if (path === '/') {
        const crew = new URLSearchParams(request.url.split('?')[1]).get('crew');
        const query = /^[123]$/.test(crew) ? `?crew=${crew}` : '';
        return send(response, 200, dashboard.replace(SUPPORT_PLACEHOLDER,
          `<a class="box" href="/support${query}">Open Crew Support chat</a>`), 'text/html');
      }
      const page = pages.get(path);
      if (page) {
        if (path === '/support') {
          response.setHeader('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
        }
        return send(response, 200, page[1], page[0]);
      }
    }
    if (path !== '/api/crew-support' || request.method !== 'POST') {
      return send(response, 404, { error: 'Page not found.' });
    }
    if (activeRequests >= 4) return send(response, 429, { error: 'Crew Support is busy. Try again shortly.' });

    activeRequests += 1;
    try {
      const body = await readBody(request);
      const messages = validateMessages(body?.messages);
      if (!response.destroyed) send(response, 200, { reply: getScriptedReply(messages) });
    } catch (error) {
      if (response.destroyed) return;
      if (error instanceof ChatError) return send(response, error.status, { error: error.message });
      return send(response, 500, { error: 'Crew Support could not reply. Try again.' });
    } finally {
      activeRequests -= 1;
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.CREW_SUPPORT_PORT ?? '4170');
  createCrewSupportServer()
    .listen(port, '127.0.0.1', function () {
      console.log(`Mission dashboard: http://127.0.0.1:${this.address().port}/#mind`);
    });
}
