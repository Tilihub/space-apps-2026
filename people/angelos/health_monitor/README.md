# Personal health monitoring core

First prototype of the team's proposed astronaut companion, owned by angelos.
Other members provide sensor and self-report inputs; this module compares them
with a frozen personal reference and returns evidence for a future companion UI.
All bundled records are synthetic. No accounts, API keys, network, or packages required.

## Start in VS Code

Open the repository folder, then choose **Terminal > New Terminal** (PowerShell).
From the repository root run:

```powershell
python people/angelos/health_monitor/monitor.py
python people/angelos/health_monitor/monitor.py --scenario usual
python people/angelos/health_monitor/monitor.py --scenario missing
python people/angelos/health_monitor/monitor.py --scenario changes --json
```

Requires Python 3.10 or later. Tested with the installed Python 3.15.2.
The default scenario shows three consecutive days of changes. `usual` shows no
demo threshold crossings; `missing` shows an incomplete comparison.

## Enter a new check-in

Run this command from the repository root:

```powershell
python people/angelos/health_monitor/check_in.py
```

The form asks for a mission date and the five measurements. Press Enter to accept
the proposed date. For a missing measurement, leave its answer blank. Both `7.5`
and `7,5` are accepted as numeric input. Invalid values prompt a retry; Ctrl+C
cancels without saving a new check-in. Use synthetic values only.

For a first trial, accept the date and enter `62`, `7.8`, `7`, `3`, and `3` in
order. This should produce `no_demo_deviation` with the bundled reference.
The comparison uses unvalidated demo rules as described below.

On the first run, a SQLite database is initialized from the bundled baseline and
the two recent synthetic days (12 and 13 November 2026). The bundled `current`
record is not saved: the form supplies that day's values. The proposed first date
is 14 November 2026; subsequent runs propose the day after the latest saved record.
These are simulated mission dates, not the computer's current date. Each check-in
uses 08:00 in the seed's fixed mission timezone.

The database is `local_data/check_ins.sqlite3` beside the scripts. It is excluded
from Git by this folder's `.gitignore`. It is local plaintext storage, not an
encrypted or production medical record system. Do not enter real health data.
The baseline is copied once when the database is created and is never updated by
new check-ins. Editing `demo_data.json` later does not change an existing database.

Previously saved entries are used in subsequent comparisons. Duplicate dates,
backdated entries, and different astronaut IDs are rejected without overwriting
history. This demo supports one synthetic astronaut per database. To start a
separate practice session without changing the existing one, use a new filename:

```powershell
python people/angelos/health_monitor/check_in.py --database people/angelos/health_monitor/local_data/practice.sqlite3
```

The entry form and result message are not a chatbot; open-ended conversation is
a later step.

## Checks

Run checks from the repository root:

```powershell
python -m unittest discover -s people/angelos/health_monitor -v
```

## Proposed input contract (to agree with the other members)

One JSON object contains `baseline` (array), `recent` (array, optional), and `current`
(one object). The bundled file stores several scenarios for convenience; a custom
input file must contain the single payload described above. Example record:

```json
{
  "astronaut_id": "demo-001",
  "recorded_at": "2026-11-14T08:00:00+00:00",
  "resting_heart_rate_bpm": 62,
  "sleep_hours": 7.9,
  "mood": 7,
  "stress": 3,
  "fatigue": 3
}
```

| Field | Meaning |
|---|---|
| `astronaut_id` | Same pseudonymous ID throughout one payload |
| `recorded_at` | ISO 8601 timestamp with one fixed mission timezone offset |
| `resting_heart_rate_bpm` | Heart rate measured at rest, in beats per minute; never raw exercise readings |
| `sleep_hours` | Estimated total sleep in the preceding 24 hours, 0–24 |
| `mood` | Self-report 0–10; higher means better mood |
| `stress` | Self-report 0–10; higher means more stress |
| `fatigue` | Self-report 0–10; higher means more fatigue |

Missing measures may be absent or `null`; they are never filled with zero.
Only one check-in per mission day is supported. All baseline records precede
recent records, and all historical records precede the current record. Upstream
members must summarize raw sensor streams into this daily check-in contract.
Activity/context and sensor quality metadata will need an agreed extension.

For a custom payload:

```powershell
python people/angelos/health_monitor/monitor.py --input path/to/payload.json --json
```

Do not commit real health information: the repository is public.

## Comparison and output

Each measure uses the median of the supplied frozen reference. The demonstration
threshold is the larger of three scaled median absolute deviations (MAD) and a
fixed demo floor. Floors are 10 bpm, 1.5 hours, and 2 points for each self-report.
Crossings in either direction, including equality, are reported. Five valid
reference days per measure are required by this demo. **Neither the thresholds
nor the sample minimum are clinically validated or suitable for deployment.**

Recent readings never update the baseline. Persistence counts consecutive mission
dates with same-direction crossings, ending today; missing days or measures stop
the count. Counts describe supplied check-ins, not continuous sensor observations.

Structured output includes `status`, `data_completeness`, `findings`, `data_gaps`,
`reference`, and a template-based `assistant_message`. Possible statuses:

- `review_suggested`: at least one demo comparison crossed its threshold; this is not a severity rating.
- `insufficient_data`: no crossing found, but at least one measure cannot be compared.
- `no_demo_deviation`: all five measures were compared without a demo threshold crossing.

Findings and data gaps can coexist. No status is a medical clearance. These rules
cannot identify emergencies or diagnose physical or mental health conditions.
The helper text makes no diagnosis, causal claim, or treatment recommendation.

## Next pieces

1. Agree the input fields and scales with the sensor/app owners.
2. Add an API adapter using the analysis function and the local storage prototype.
3. Add a UI with history, evidence, and the companion conversation.
4. Add a language model for phrasing and conversation using structured evidence.
5. Evaluate a learned anomaly detector against a simple comparison approach once suitable data exist.

There is no neural network, language model, live sensor connection, or clinical
evaluation in this first version. The message is deterministic so the full input
to output path can be checked before those pieces are connected.
