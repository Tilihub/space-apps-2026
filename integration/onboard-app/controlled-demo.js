import { mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { createHealthModule } from '../../people/angelos/health/index.js';
import { companionRoute } from '../../people/potest/crew-support/companion.js';
import { createCore } from './core.js';
import { connectQuestionnaireCompanion, syntheticHealthFixture } from './adapters/companion-support.js';

// Mara keeps Petros's steady history. Tomas's contrasting stretch ends the day before launch.
const tomasDays = new Map([
  [38, { sleepHours: 5.6, mood: 4, stress: 7, fatigue: 7 }],
  [39, { sleepHours: 5.2, mood: 4, stress: 8, fatigue: 8 }],
  [40, { sleepHours: 5, mood: 3, stress: 8, fatigue: 8 }],
  [41, { sleepHours: 4.8, mood: 3, stress: 9, fatigue: 9 }],
]);

export async function createControlledRun({ dataDir = tmpdir(), ...options }) {
  await mkdir(dataDir, { recursive: true });
  const parent = await realpath(dataDir);
  const prefix = 'pulse-controlled-';
  const runDir = await mkdtemp(join(parent, prefix));
  async function removeRun() {
    const target = await realpath(runDir);
    if (dirname(target) !== parent || !basename(target).startsWith(prefix)) {
      throw new Error('Refusing to remove anything outside the controlled rehearsal directory.');
    }
    await rm(target, { recursive: true, force: true, maxRetries: 3 });
  }

  try {
    const core = await createDemoCore({ ...options, dataDir: runDir, rehearsal: true });
    return {
      ...core,
      async stop() {
        await core.stop();
        await removeRun();
      },
    };
  } catch (error) {
    await removeRun();
    throw error;
  }
}

export async function createDemoCore({ modules, dataDir, rehearsal = false, ...options }) {
  const fixture = structuredClone(syntheticHealthFixture);
  const tomas = fixture.crew.c4;
  tomas.story = 'Four recent days of short sleep, high stress and high fatigue for the controlled rehearsal.';
  tomas.checkIns = tomas.checkIns.map(row => ({ ...row, ...tomasDays.get(row.missionDay) }));

  // Record which synthetic history was installed. An older store keeps its existing history
  // until the operator explicitly resets the demo.
  const installedFixture = join(dataDir, 'controlled-health-fixture.json');
  let activeHistory = syntheticHealthFixture;
  try {
    activeHistory = JSON.parse(await readFile(installedFixture, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const pendingFixture = join(dataDir, 'controlled-health-fixture.pending.json');
  const health = createHealthModule({ fixtureUrl: pendingFixture });
  const demoHealth = {
    ...health,
    async reset(ctx) {
      await writeFile(pendingFixture, JSON.stringify(fixture), 'utf8');
      await health.reset(ctx);
      await rename(pendingFixture, installedFixture);
      activeHistory = fixture;
    },
  };
  const demoModules = modules.map(mod => {
    if (mod.name === 'health') return demoHealth;
    if (rehearsal && mod.name === 'mind') return {
      ...mod,
      routes: mod.routes.map(route => route.path === companionRoute.path ? companionRoute : route),
    };
    return mod;
  });
  const core = await createCore({ modules: demoModules, dataDir, ...options });
  return connectQuestionnaireCompanion(core, {
    historyFor: crewId => activeHistory.crew[crewId]?.checkIns ?? [],
    rehearsal,
  });
}
