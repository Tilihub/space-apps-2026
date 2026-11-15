// @ts-check
/**
 * Starts the onboard app. From the repo root:  node integration/onboard-app/start.js
 * Another port:  PORT=8001 node integration/onboard-app/start.js
 * The old --controlled-companion flag is accepted as an alias for the normal launch.
 * Prepared presentation (the public demo):  node integration/onboard-app/start.js --presentation
 *   or PULSE_PRESENTATION=1. Every start, Reset and the end of day 42 load the prepared day 42,
 *   replacing whatever that data folder held. See presentation.js.
 */
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createDemoCore } from './controlled-demo.js';
import { startServer } from './server.js';
import modules from './modules.js';
import { presentationModules, withPresentation } from './presentation.js';

const port = Number(process.env.PORT ?? 8000);
const dataDir = process.env.PULSE_DATA_DIR;
const presentation = process.argv.includes('--presentation') || process.env.PULSE_PRESENTATION === '1';
const demoCore = await createDemoCore({
  modules: presentation ? presentationModules(modules) : modules,
  dataDir: dataDir ?? fileURLToPath(new URL('./data/', import.meta.url)),
});
const core = presentation ? withPresentation(demoCore) : demoCore;
if (presentation) {
  await core.resetPrepared();
  core.watchDay();
}

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

let stopping = false;
/** @returns {Promise<void>} */
const shutDown = async () => {
  if (stopping) return;
  stopping = true;
  await server.close();
  await core.stop();
  process.exit(0);
};
process.on('SIGINT', () => void shutDown());
process.on('SIGTERM', () => void shutDown());
