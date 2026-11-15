// @ts-check
/**
 * Starts the onboard app. From the repo root:  node integration/onboard-app/start.js
 * Another port:  PORT=8001 node integration/onboard-app/start.js
 */
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createCore } from './core.js';
import { startServer } from './server.js';
import modules from './modules.js';

const port = Number(process.env.PORT ?? 8000);
const core = await createCore({ modules, dataDir: process.env.PULSE_DATA_DIR ?? fileURLToPath(new URL('./data/', import.meta.url)) });

/** @type {{ port: number, close: () => Promise<void> }} */
let server;
try {
  server = await startServer({ core, port, host: process.env.PULSE_HOST ?? '0.0.0.0' });
} catch (err) {
  if (/** @type {NodeJS.ErrnoException} */ (err).code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Stop the other server, or start with PORT=8001.`);
    process.exit(1);
  }
  throw err;
}
core.startTicking();

const lanAddresses = Object.values(networkInterfaces())
  .flat()
  .filter((a) => a && a.family === 'IPv4' && !a.internal)
  .map((a) => a?.address);

console.log(`Onboard app is running. On this laptop: http://localhost:${server.port}/`);
if (!process.env.PULSE_HOST || process.env.PULSE_HOST === '0.0.0.0') for (const address of lanAddresses) console.log(`  Other devices on this network: http://${address}:${server.port}/`);
console.log(`Modules: ${modules.map((m) => m.name).join(', ')}. Mission time: ${core.clockView().now}`);
console.log('Stop with Ctrl+C.');

/** @returns {Promise<void>} */
const shutDown = async () => {
  await server.close();
  await core.stop();
  process.exit(0);
};
process.on('SIGINT', () => void shutDown());
process.on('SIGTERM', () => void shutDown());
