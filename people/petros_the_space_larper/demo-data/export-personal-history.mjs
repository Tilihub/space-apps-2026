import { readFile, writeFile } from 'node:fs/promises';

const [crewId, outputPath, ...extraArgs] = process.argv.slice(2);
if (!crewId || !outputPath || extraArgs.length) {
  console.error('Usage: node export-personal-history.mjs <crewId> <output.json>');
  process.exit(1);
}

const { crew } = JSON.parse(await readFile(new URL('./health.json', import.meta.url), 'utf8'));
if (!Object.hasOwn(crew, crewId)) {
  console.error(`Unknown crew ID: ${crewId}. Choose ${Object.keys(crew).join(', ')}.`);
  process.exit(1);
}

const launch = Date.parse('2026-10-03T00:00:00.000Z');
const dayMs = 86_400_000;
const baselineEndDay = 35;
const baseline = [];
const recent = [];

for (const row of crew[crewId].checkIns) {
  const date = new Date(launch + row.missionDay * dayMs).toISOString().slice(0, 10);
  const exported = {
    recorded_at: `${date}T${row.time}:00Z`,
    resting_heart_rate_bpm: row.restingHeartRateBpm,
    sleep_hours: row.sleepHours,
    mood: row.mood,
    stress: row.stress,
    fatigue: row.fatigue,
  };
  const destination = row.missionDay <= baselineEndDay ? baseline : recent;
  destination.push(exported);
}

const packet = {
  schema_version: 'personal-history-v1',
  astronaut_id: crewId,
  source: {
    kind: 'synthetic',
    label: 'PET-1 simulated Mars-transit individual check-ins',
    observation_type: 'individual_daily',
    heart_rate_context: 'rest',
    self_report_scale: '1-10',
  },
  units: {
    resting_heart_rate_bpm: 'bpm',
    sleep_hours: 'hours',
    mood: 'points',
    stress: 'points',
    fatigue: 'points',
  },
  baseline,
  recent,
};

try {
  await writeFile(outputPath, `${JSON.stringify(packet, null, 2)}\n`, { flag: 'wx' });
  console.log(`Wrote ${baseline.length} baseline and ${recent.length} recent rows for ${crewId} to ${outputPath}.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
