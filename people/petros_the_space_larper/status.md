# petros_the_space_larper

## Profile

- GitHub: petrosmpidis
- AI tool: Codex (desktop app)
- Operating system: Windows

## Now

- Last updated: 2026-11-14 14:10
- Working on: In-flight health countermeasure evidence for the prototype
- Branch: petros_the_space_larper/astronaut-health-research

## Done

- Installed GitHub CLI, signed in, and cloned the team repo.
- Documented astronaut measurement methods, dataset access, and radiation exposure in [astronaut-health-research.md](astronaut-health-research.md).
- Verified Inspiration4 CBC and CMP downloads, a PhysioNet vital signs sample, and RadLab queries for ISS and Artemis I.
- Added the [in-flight data inventory and NASA priorities](astronaut-inflight-data.md), including published ISS and historical flight measurements, verified Inspiration4 crew microbiome data, and an Artemis II environment CSV.
- Added the [prototype vital-sign CSV](astronaut-inflight-vitals.csv) with published in-flight human measurements, source references and blank unavailable values.
- Added 13 ISS cardiovascular summaries from CSA, JAXA, IBMP and Danish research. Documented additional international data downloads and archive access in the [in-flight inventory](astronaut-inflight-data.md#international-experiments-and-archives).
- Merged the international inventory and CSV updates into main in [PR #27](https://github.com/Tilihub/space-apps-2026/pull/27) and verified the 47 CSV rows on GitHub.
- Documented [how to capture the five vital signs](astronaut-health-research.md#five-vital-signs-from-a-smart-vest-and-separate-sensors), including sensor placement, units, estimates and missing readings.
- Merged the vest and sensor guide into main in [PR #28](https://github.com/Tilihub/space-apps-2026/pull/28) and verified it on GitHub.
- Documented [current NASA collection practices](astronaut-inflight-data.md#how-nasa-collects-astronaut-data-today) with documented ISS and Artemis II examples, including the Bio-Monitor, Mobil-o-Graph, wrist actigraphy, and personal dosimetry.
- Merged and verified the NASA data collection notes in [PR #29](https://github.com/Tilihub/space-apps-2026/pull/29).
- Added [physical and mental health research notes](astronaut-physical-and-mental-health.md), with proposed check-in fields, evidence from flight, and physical indicators beyond the five vital signs.
- Merged and verified the physical and mental health notes in [PR #31](https://github.com/Tilihub/space-apps-2026/pull/31).
- Added [mission countermeasures](astronaut-physical-and-mental-health.md#countermeasures-during-missions), with operational practice, flight and ground-analog studies, and proposed prototype support.

## Blocked / need from others

- Public direct downloads for continuous astronaut wearable recordings remain unverified. The notes link to published values, test data, and research access routes.

## Next steps

<!-- Written so someone else could continue: which branch, what's half-done,
     what to do next, what to watch out for. -->

- Import the prototype CSV as mission snapshots. Preserve blank values and the distinction between individual summaries, cohort means and cohort medians. PhysioNet and RadLab can provide time-series replay inputs with documented provenance.
- For live input, map the selected recorder's channels to the sensor guide. Capture cuff and temperature readings with their device, measurement site and timestamp.
- Use the NASA collection table for equipment and cadence. Keep periodic clinical measurements, study sessions, and area radiation telemetry tied to their respective sources.
- Review the proposed well-being fields alongside the existing daily check-in. Use synthetic self-reports in the public demo.
- Review where the prototype can support private contact, schedule adjustments, and mission-approved follow-up. Use the countermeasure notes to distinguish operational practice from experimental evidence.
