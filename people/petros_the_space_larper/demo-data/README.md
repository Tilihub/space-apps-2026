# PET-1 synthetic demo fixtures

Read `health.json` on reset of the onboard health module. It follows the [proposed ZT contract, sections 4, 6 and 10](https://github.com/Tilihub/space-apps-2026/blob/fb0c20f/shared/contract/README.md). The envelope declares contract version 1 and synthetic data. Each `crew` key is an ID from `c1` to `c5`. Each member has a story and 13 daily records. The module can use `measurement-guides.json` for entry guidance. [stories.md](stories.md) ties the five histories to the demo script.

| Key | Unit or anchors | Input and cadence | Null and provenance |
|---|---|---|---|
| `crew` key | ZT crew ID | Demo account mapping | Required. Fictional crew. IDs do not authorize access. |
| `missionDay`, `time` | Day since 2026-10-03 UTC, HH:MM UTC | One record per person per mission day at 07:30 | Required. Synthetic mission time. Days 29–35 are fixed baseline, 36–41 recent history, 42 reserved for live entry. |
| `sleepHours` | Hours, previous 24 h, 0–24 | Daily estimate or sleep diary | `null` when unavailable. Synthetic sleep duration. A recorded zero is valid. |
| `mood` | Integer 1–10, higher is better | Daily self-report | `null` if skipped. Synthetic. |
| `stress`, `fatigue` | Integer 1–10, higher is more | Daily self-report | `null` if skipped. Synthetic. |
| `restingHeartRateBpm` | bpm at rest | Daily resting pulse spot reading | `null` for missing or unusable readings. Synthetic resting values. |
| `spo2Pct` | Percent | Daily fingertip pulse oximeter spot reading | `null` for missing or unstable readings. Synthetic. |
| `systolicMmHg`, `diastolicMmHg` | mmHg | Daily upper-arm cuff spot readings from one cycle | `null` if the measurement is missing. Synthetic. |
| `temperatureC` | °C, oral | Daily digital oral thermometer spot reading | `null` if unavailable. Synthetic oral readings. |
| `symptoms[].code`, `symptoms[].severity`, `note`, `vitals` | ZT symptom code, separate integer 1–10 severity, text, named spot values | Entered when reporting the symptom. The meds module assigns event time. | Optional note and unavailable readings may be `null`. Synthetic narrative and spot readings. |
| `cabinSnapshot` | CO₂ in ppm, ZT environment snapshot fields | Simulated sample at a time before the day-42 check-in. Alert began overnight. | `sourceTime: null` because this is synthetic. The environment reading has its own time and source. |

The health module compares only sleep hours, resting heart rate, mood, stress, and fatigue. Keep the other vitals as spot values. Respiratory rate is documented in the [sensor guide](../astronaut-health-research.md#five-vital-signs-from-a-smart-vest-and-separate-sensors) and is outside the proposed ZT wave 1 payload. The [historical CSV](../astronaut-inflight-vitals.csv) contains individual observations, exercise results, and cohort summaries. It is a reference and supplies none of these crew histories. Cabin replay from an archive carries a source timestamp and provenance independent of these synthetic events.

## Load and check the package

On the onboard app path, use the reset input from `health.json` and ZT's test clock at `2026-11-14T07:30:00.000Z`. [scenarios.json](scenarios.json) is a test harness input. Send only `checkInBody` to `POST /api/health/check-ins` as that crew member. On separate resets, c1 has no changes, c3 has two missing compared measures, and c4 has five changes for three consecutive days. For c4 use `symptomReportBody` with `POST /api/meds/symptom-reports` and `cabinSnapshot` as the expected synthetic environment context in the demo. The snapshot is a fixture for the integrator. Potest owns supplying the actual environment stream.

For [Angelos's external baseline importer](https://github.com/Tilihub/space-apps-2026/blob/928dc4e/people/angelos/health_monitor/BASELINE_IMPORT.md) on `angelos/external-baseline` or when that importer is available in the checkout, run from the repository root with fresh output paths:

```powershell
node people/petros_the_space_larper/demo-data/export-personal-history.mjs c4 "$env:TEMP/pet1-c4.json"
python people/angelos/health_monitor/check_in.py --baseline-file "$env:TEMP/pet1-c4.json" --database "$env:TEMP/pet1-c4.sqlite3" --import-only
```

Expected output is seven baseline and six recent records for c4, with the next unsaved day being 14 November. Sleep baseline median is 7.8 h. The export maps `crewId` (fixture key) to `astronaut_id`, `missionDay` and `time` to `recorded_at`, `sleepHours` to `sleep_hours`, and `restingHeartRateBpm` to `resting_heart_rate_bpm`. The three self-report values are copied as declared `1-10`. The importer accepts only those five measures and keeps this reference separate from legacy data. The earlier `health-v1` 0–10 fixtures retain that scale, including valid zero answers. The export is for the external file importer, with no implicit mapping to legacy `demo-001` identities or legacy archive conversion.

Verified against ZT's published contract constants and Angelos's external-baseline reader: 65 history rows, five separate imports, three matched day-42 comparison outcomes, and four measurement guides mapped to contract fields. The CLI also imported Tomas into a fresh temporary SQLite database. ZT's contract and the importer were open for review at handoff. The joined app still needs to adopt the fixture, agree the environment event mapping, and enforce the clinical-role visibility rules.
