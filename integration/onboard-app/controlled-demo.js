import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { createHealthModule } from '../../people/angelos/health/index.js';
import { companionRoute } from '../../people/potest/crew-support/companion.js';
import { createCore } from './core.js';
import { connectQuestionnaireCompanion, syntheticHealthFixture, syntheticHealthSource } from './adapters/companion-support.js';

// Mara keeps Petros's steady history. Tomas's contrasting stretch ends the day before launch.
const tomasDays = new Map([
  [38, { sleepHours: 5.6, mood: 4, stress: 7, fatigue: 7 }],
  [39, { sleepHours: 5.2, mood: 4, stress: 8, fatigue: 8 }],
  [40, { sleepHours: 5, mood: 3, stress: 8, fatigue: 8 }],
  [41, { sleepHours: 4.8, mood: 3, stress: 9, fatigue: 9 }],
]);

const digest = text => createHash('sha256').update(text).digest('hex');
const canonicalText = syntheticHealthSource.replace(/\r\n/g, '\n');
const canonicalDigests = new Set([digest(canonicalText), digest(canonicalText.replace(/\n/g, '\r\n'))]);

function upgradeCanonicalHistory(state, fixture, fixtureDigest) {
  if (state?.contractVersion !== fixture.contractVersion || state.scaleVersion !== 'self-report-1-10-v1' ||
      !canonicalDigests.has(state.source?.sha256) || state.source.kind !== 'synthetic') return null;

  const rows = state.crew?.c4?.checkIns;
  if (!Array.isArray(rows)) return null;
  const originals = syntheticHealthFixture.crew.c4.checkIns;
  const toUpdate = new Map();
  for (const [day, fields] of tomasDays) {
    const matches = rows.filter(row => row.missionDay === day);
    const [row] = matches;
    const original = originals.find(row => row.missionDay === day);
    if (!original || matches.length !== 1 || row.id !== `health_c4_d${day}` || row.crewId !== 'c4' ||
        Object.keys(fields).some(key => row[key] !== original[key])) return null;
    toUpdate.set(row, fields);
  }
  for (const [row, fields] of toUpdate) Object.assign(row, fields);
  state.source = { ...state.source, fixture: 'explicit-file', sha256: fixtureDigest };
  return state;
}

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
    const core = await createDemoCore({ ...options, dataDir: runDir });
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

export async function createDemoCore({ modules, dataDir, ...options }) {
  const fixture = structuredClone(syntheticHealthFixture);
  const tomas = fixture.crew.c4;
  tomas.story = 'Four recent days of short sleep, high stress and high fatigue for the controlled rehearsal.';
  tomas.checkIns = tomas.checkIns.map(row => ({ ...row, ...tomasDays.get(row.missionDay) }));

  const fixtureText = JSON.stringify(fixture);
  const fixtureDigest = digest(fixtureText);
  const installedFixture = join(dataDir, 'controlled-health-fixture.json');
  let installedText;
  try {
    installedText = await readFile(installedFixture, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const installedDigest = installedText === undefined ? null : digest(installedText);
  let activeHistory;
  let historyChecked = false;
  const pendingFixture = join(dataDir, 'controlled-health-fixture.pending.json');
  const health = createHealthModule({ fixtureUrl: pendingFixture });

  async function installFixture(install) {
    await writeFile(pendingFixture, fixtureText, 'utf8');
    await install();
    await rename(pendingFixture, installedFixture);
    activeHistory = fixture;
  }

  async function checkInstalledHistory(ctx) {
    const state = await ctx.store.load();
    if (state?.source?.kind !== 'synthetic') return;
    if (state.source.sha256 === fixtureDigest) {
      activeHistory = fixture;
    } else if (installedDigest && state.source.sha256 === installedDigest) {
      activeHistory = JSON.parse(installedText);
    } else {
      // The health module owns its store. Only refresh the four verified demo rows.
      const updated = upgradeCanonicalHistory(state, fixture, fixtureDigest);
      if (updated) await installFixture(() => ctx.store.save(updated));
    }
  }

  const demoHealth = {
    ...health,
    async reset(ctx) {
      await installFixture(() => health.reset(ctx));
      historyChecked = true;
    },
    routes: health.routes.map(route => ({
      ...route,
      async handler(req, ctx) {
        if (!historyChecked) {
          await checkInstalledHistory(ctx);
          historyChecked = true;
        }
        return route.handler(req, ctx);
      },
    })),
  };
  const demoModules = modules.map(mod => {
    if (mod.name === 'health') return demoHealth;
    if (mod.name === 'mind') return {
      ...mod,
      routes: mod.routes.map(route => route.path === companionRoute.path ? companionRoute : route),
    };
    return mod;
  });
  const core = await createCore({ modules: demoModules, dataDir, ...options });
  return connectQuestionnaireCompanion(core, {
    historyFor: crewId => activeHistory?.crew[crewId]?.checkIns ?? [],
  });
}
