# petros_the_space_larper

## Profile

- GitHub: petrosmpidis
- AI tool: Codex (desktop app)
- Operating system: Windows

## Now

- Last updated: 2026-11-14 18:41 (Europe/Athens)
- Working on: Aligning PET-1 source fixtures with the accepted stage cases and Angelos's data review.
- Branch: petros_the_space_larper/align-stage-data

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
- Merged and verified the general countermeasure notes in [PR #32](https://github.com/Tilihub/space-apps-2026/pull/32).
- Added [deep-space countermeasure notes](astronaut-deep-space-countermeasures.md) covering lunar flight evidence, Mars analogs, robotic radiation measurements, and proposed Mars-transit app workflows.
- Added a [Mars-transit prototype proposal](mars-transit-prototype.md) with mental and physical health fields, offline procedures, report delivery states, and demo checks.
- PET-1: Published a [data package and field mapping](demo-data/README.md) aligned with the proposed ZT contract (PR #49). It contains 65 synthetic observations for c1–c5, four measurement guides, and day-42 inputs for usual values, missing data, and the Tomas incident.
- PET-1: Checked the fixture against the ZT contract constants and ran all five exports through Angelos's external baseline reader (PR #50). Verified the three expected scenario results, including five changes for three consecutive days and preservation of missing values. Imported Tomas into a fresh temporary SQLite store.
- PET-2: Drafted the [exact wellbeing prompts and anchors](demo-data/wellbeing-form.md) and aligned the Mars scope with Tommy's 1–10 scale, journal permissions and doctor-only clinical report access.
- PET-1 and PET-2 handoff merged in [PR #51](https://github.com/Tilihub/space-apps-2026/pull/51).
- Added the [workout handoff](demo-data/WORKOUT.md), including the published SPRINT week, an ISS-style seven-day plan, a controller for step-by-step workouts and a synthetic stage pulse replay. Verified the controller against Angelos's workout endpoint.
- Read Angelos's [PET-1 data review](../angelos/health/DATA_REVIEW.md) and aligned the canonical source fixture with zt's stage cases: c1 workout ranges, c3 six-day mood trend with pulse-only gaps, and c4's 6.8 h sleep reference with sleep as the only day-42 flag. Removed the duplicate synthetic cabin snapshot so the joined case uses Potest's separate ISS RR-9 replay.

## Blocked / need from others

- Public direct downloads for continuous astronaut wearable recordings remain unverified. The notes link to published values, test data, and research access routes.
- zt and Angelos should confirm adoption of the proposed crew IDs, clock and new scale before joining the fixture. Environment event mapping, visible Home fields, and app enforcement of the journal and clinical permissions remain integration decisions.
- The final workout screen must import the controller. Live workout pulse needs a device adapter for the wearable chosen by the team.

## Next steps

<!-- Written so someone else could continue: which branch, what's half-done,
     what to do next, what to watch out for. -->

- Import the prototype CSV as mission snapshots. Preserve blank values and the distinction between individual summaries, cohort means and cohort medians. PhysioNet and RadLab can provide time-series replay inputs with documented provenance.
- For live input, map the selected recorder's channels to the sensor guide. Capture cuff and temperature readings with their device, measurement site and timestamp.
- Use the NASA collection table for equipment and cadence. Keep periodic clinical measurements, study sessions, and area radiation telemetry tied to their respective sources.
- Review the proposed well-being fields alongside the existing daily check-in. Use synthetic self-reports in the public demo.
- Review where the prototype can support private contact, schedule adjustments, and mission-approved follow-up. Use the countermeasure notes to distinguish operational practice from experimental evidence.
- Use the deep-space notes to review private onboard support, delayed Earth contact, and offline access to mission procedures for the Mars-transit scenario.
- Review the proposed offline demo with the check-in, environment, and inventory owners. Confirm the authorization categories and recipients before implementing report routing.
- Use `demo-data/health.json` at reset. Replay the [stage-aligned day-42 cases](demo-data/scenarios.json) from fresh resets after the health module is connected, then check c1 no-change, c3 mood/stress persistence, c4 sleep-only persistence, and the clinical and journal role boundaries.
- In the workout screen, import `/demo-data/workout-session.js`, pass the mission clock and the logged-in health client, then map the buttons and current step as shown in [WORKOUT.md](demo-data/WORKOUT.md). Run the scene B push-up replay to confirm the saved summary and the synthetic source label.
