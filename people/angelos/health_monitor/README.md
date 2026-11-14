# Personal health monitoring core

Personal comparison and weekly reporting prototype, owned by angelos.
Other members provide sensor and self-report inputs; this module compares them
with a frozen personal reference and returns evidence for a future companion UI.
All bundled records are synthetic. No external accounts, API keys or third-party
Python packages are required. The application adapter uses local loopback networking.

## ANG-1 application connection

The core can now be used without terminal measurement entry through a local JSON
API and JavaScript client. See [API_CONTRACT.md](API_CONTRACT.md) for the proposed
interface, exact request/response example, run commands, crew isolation and the
remaining agreements with zt. The API requires local loopback networking; the
original CLI remains available without a server.

```powershell
python people/angelos/health_monitor/app_api.py --allow-origin http://127.0.0.1:5500
```

The API reuses the original CLI database for demo-001 and keeps separate references
and histories for demo-002 and demo-003. Each runtime demo token accesses only its
own profile. The server prints the temporary developer credentials at startup.
zt still needs to wire his UI to `health_client.mjs` and accept the proposed packet,
crew mapping, mission clock and units. This is not a real login implementation.

## Start in VS Code

Open the repository folder and open `check_in.py`. Press **Run Python File**
(the play button) to start the form in VS Code's terminal. Alternatively, choose
**Terminal > New Terminal** (PowerShell) and run from the repository root:

```powershell
python people/angelos/health_monitor/check_in.py
```

Only this entry point needs to be started. It calls the comparison and reporting
functions and saves the completed check-in. Both the daily result and a weekly
summary appear after each successful entry. To try the original JSON scenarios
without reading or changing the saved SQLite history:

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

## Reset the demo session

Run this command from the repository root whenever you want to start over:

```powershell
python people/angelos/health_monitor/check_in.py --reset
```

`--reset` is an action in `check_in.py`. It changes the local SQLite session; it
does not change the Python code or the initial JSON file. It finishes without
asking for a new check-in. Run `check_in.py` normally afterward (or press the
VS Code play button) to enter new values again.

The reset does the following in order:

1. Reads the stored baseline and identifies the initial seed dates from
   `demo_data.json` (`scenarios.changes.recent`, 12 and 13 November in this demo).
2. Creates and verifies a complete database backup in `local_data/backups/`.
   Each completed backup has a timestamp and unique suffix; interrupted copies
   may remain with a `.partial` suffix.
3. Restores only the initial check-in days, retaining their saved values when
   present and using the JSON seed values for any missing initial day. All later
   user-entered check-ins are removed from the active history.
4. Leaves the stored personal baseline untouched and prints the backup path and
   next proposed mission date (14 November for the bundled seed).

A failed backup prevents the reset. A failure while restoring records rolls
back the history change. Resetting again creates another backup. Both the active
database and the default backup folder are ignored by Git.

An existing database is required; a missing database is not created by `--reset`.
Use `--database` to reset a specific existing practice session. `--reset` cannot
be combined with `--report` or `--json`.

## Weekly report

The agreed design keeps the original personal baseline fixed and uses medians
for both the reference and the weekly summaries. The weekly report does not
replace or update the baseline.

After a successful check-in the program displays the report automatically. To
view it without entering or saving another record, run:

```powershell
python people/angelos/health_monitor/check_in.py --report
python people/angelos/health_monitor/check_in.py --report --json
```

Report-only mode opens an existing database read-only. It does not initialize a
new database, insert check-ins, or modify the reference. `--database` can select an
existing practice database. The JSON form is available for future app integration.

The report contains two adjacent, nonoverlapping periods:

- Current period: the latest saved mission date and the preceding six calendar days.
- Previous period: the seven calendar days immediately before the current period.

These are rolling calendar windows, recalculated when a report is requested or a
new check-in is saved. Seven records spread across a longer period do not count
as one complete week. Historical baseline rows never fill gaps in either window.
For example, with a latest check-in on 16 November, the current period is
10–16 November and the previous one is 3–9 November.

For every measure the report shows:

- Each period's median and measured-day coverage out of seven. Missing values
  remain missing; they are not zero-filled. Coverage is specific to each measure.
- Change from the previous week, when both periods have seven measured days.
- Change from the fixed baseline, when the current period has at least one value
  and the baseline meets the existing reference minimum. Partial-period results
  are explicitly labelled as describing available days only.

| Example sleep summary | Median |
|---|---:|
| Previous complete week | 7.5 hours |
| Current complete week | 6.5 hours |
| Fixed original baseline | 7.8 hours |

This example produces a weekly decrease of 1 hour and a difference of -1.3 hours
from the original baseline. The baseline stays at 7.8 hours. Incomplete weeks
show available medians and counts, with the week-to-week change marked unavailable.

The seven-day completeness rule is an engineering choice for the demo, not a
clinically validated sampling requirement. Weekly statistics describe changes;
they do not establish their cause or whether someone is healthy.

## Files and execution order

| File | Role |
|---|---|
| `demo_data.json` | Synthetic initial reference, recent seed records, and standalone scenarios |
| `check_in.py` | Entry point, terminal form, SQLite storage, weekly-report command, and backed-up reset |
| `monitor.py` | Validation, fixed reference statistics, and daily comparisons |
| `weekly_report.py` | Weekly medians, coverage, comparisons, and report formatting |
| `app_api.py` | Token-bound app-facing service and local JSON HTTP endpoints |
| `health_client.mjs` | JavaScript client for zt to connect his app |
| `API_CONTRACT.md` / `api_example.json` | Proposed versioned connection contract and concrete input/output |
| `local_data/check_ins.sqlite3` | Ignored local reference and saved daily records |
| `test_monitor.py` | Daily comparison checks |
| `test_check_in.py` | Input, persistence, read-only reporting, backup, and reset checks |
| `test_weekly_report.py` | Weekly windows, medians, missing-data, and baseline-isolation checks |
| `test_app_api.py` | Crew isolation, persistence, HTTP contract and JavaScript client checks |

Execution: `check_in.py` reads history, collects the new values, calls `monitor.py`,
saves the valid record, and calls `weekly_report.py` to summarize the saved history.
These are function calls inside one process, not parallel scripts. Tests are
separate commands. Existing stored check-ins are retained by this update.

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
2. Agree the proposed API contract and wire the existing adapter into zt's UI.
3. Add a UI with history, evidence, and the companion conversation.
4. Add a language model for phrasing and conversation using structured evidence.
5. Evaluate a learned anomaly detector against a simple comparison approach once suitable data exist.

There is no neural network, language model, live sensor connection, or clinical
evaluation in this first version. The message is deterministic so the full input
to output path can be checked before those pieces are connected.
