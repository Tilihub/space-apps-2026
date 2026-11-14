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
2. Add local storage and an API adapter using this analysis function.
3. Add a UI with history, evidence, and the companion conversation.
4. Add a language model for phrasing and conversation using structured evidence.
5. Evaluate a learned anomaly detector against a simple comparison approach once suitable data exist.

There is no neural network, language model, live sensor connection, or clinical
evaluation in this first version. The message is deterministic so the full input
to output path can be checked before those pieces are connected.
