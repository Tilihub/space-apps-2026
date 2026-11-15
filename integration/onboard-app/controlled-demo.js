import { createHash } from 'node:crypto';
import { readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHealthModule } from '../../people/angelos/health/index.js';
import { companionRoute } from '../../people/potest/crew-support/companion.js';
import { createCore } from './core.js';
import { connectQuestionnaireCompanion, syntheticHealthFixture, syntheticHealthSource } from './adapters/companion-support.js';

// Profile c1 (Mara) keeps Petros's steady history. Profile c3 (Chris) gets the contrasting stretch
// that ends the day before the demo day, so the Crew Assistant sees a recurring pattern for Chris only.
const recurringCrewId = 'c3';
const recurringDays = new Map([
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

  const rows = state.crew?.[recurringCrewId]?.checkIns;
  if (!Array.isArray(rows)) return null;
  const originals = syntheticHealthFixture.crew[recurringCrewId].checkIns;
  const toUpdate = new Map();
  for (const [day, fields] of recurringDays) {
    const matches = rows.filter(row => row.missionDay === day);
    const [row] = matches;
    const original = originals.find(row => row.missionDay === day);
    if (!original || matches.length !== 1 || row.id !== `health_${recurringCrewId}_d${day}` || row.crewId !== recurringCrewId ||
        Object.keys(fields).some(key => row[key] !== original[key])) return null;
    toUpdate.set(row, fields);
  }
  for (const [row, fields] of toUpdate) Object.assign(row, fields);
  state.source = { ...state.source, fixture: 'explicit-file', sha256: fixtureDigest };
  return state;
}

export async function createDemoCore({ modules, dataDir, ...options }) {
  const fixture = structuredClone(syntheticHealthFixture);
  const recurringCrew = fixture.crew[recurringCrewId];
  recurringCrew.story = 'Four recent days of short sleep, high stress and high fatigue for the controlled rehearsal.';
  recurringCrew.checkIns = recurringCrew.checkIns.map(row => ({ ...row, ...recurringDays.get(row.missionDay) }));

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
