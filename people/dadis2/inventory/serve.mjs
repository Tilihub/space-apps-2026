// Serves this folder on http://localhost:8080, so the laptop camera can scan QR codes (browsers allow
// the camera on localhost, not on a double-clicked file). Node.js built-ins only, nothing to install.
//
//   node people/dadis2/inventory/serve.mjs          (from the repo root)
//   node people/dadis2/inventory/serve.mjs 9000     (another port)
//
// Only this laptop can open it (127.0.0.1). Stop it with Ctrl+C.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.argv[2]) || 8080;
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.ico': 'image/x-icon',
};

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  const file = normalize(join(root, path.endsWith('/') ? `${path}index.html` : path));
  if (!file.startsWith(root)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file).toLowerCase()] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }).end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Medicine lockers (Tomas):  http://localhost:${port}/index.html?user=c4`);
  console.log(`Earth's reply (QR):        http://localhost:${port}/earth-reply.html`);
  console.log(`Earth tool (any grant):    http://localhost:${port}/earth.html`);
  console.log('Stop with Ctrl+C.');
});
