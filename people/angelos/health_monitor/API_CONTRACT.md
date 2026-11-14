# ANG-1: health application adapter

Status: runnable proposed `health-v1` interface for zt to review. Owner: angelos.
This is the health-side handoff, not an accepted team-wide ID/authentication/clock
contract or a claim that zt's UI has already been connected. ANG-2 is separate.

## Run and check

From the repository root, start the health API:

```powershell
python people/angelos/health_monitor/app_api.py --allow-origin http://127.0.0.1:5500
```

It listens only on `127.0.0.1:8765` and prints three runtime-generated demo bearer
tokens, one per crew identity. Keep it running while the app uses it. Ctrl+C stops
the server; history persists. Tokens change after restart. No tokens are committed.

Serve the repository's static files in a separate terminal if using zt's HTML
prototype, because browsers need HTTP to import JavaScript modules:

```powershell
python -m http.server 5500 --bind 127.0.0.1
```

When zt's branch is checked out or integrated, its HTML can be served at
`http://127.0.0.1:5500/people/zt/ui-skeleton/index.html?crew=1`.
The backend does not serve or change that HTML. The current skeleton still needs
its Save action and output fields wired to the client below by its owner.
The origin must match the configured scheme, host and port exactly. For a different
frontend origin, pass its exact value with `--allow-origin`. No wildcard is enabled.

For a separate practice backend, add `--data-dir` pointing to a new directory under
`people/angelos/health_monitor/local_data/`. The default reuses the original CLI
history for demo-001 and initializes separate stores for the other two profiles.

Checks:

```powershell
python -m unittest discover -s people/angelos/health_monitor -v
node --check people/angelos/health_monitor/health_client.mjs
```

Tests use temporary databases and a temporary local HTTP port. Node, when present,
also runs the actual JavaScript client against the API. Python tests do not require
Node; that client check is marked skipped when Node is absent. Restricted runners
must allow loopback socket traffic for the HTTP checks.

## Identities and scope

| zt skeleton query (proposed mapping) | Health identity | Default store |
|---|---|---|
| `crew=1` / Astronaut A | `demo-001` | `local_data/check_ins.sqlite3` (existing CLI history) |
| `crew=2` / Astronaut B | `demo-002` | `local_data/demo-002.sqlite3` |
| `crew=3` / Astronaut C | `demo-003` | `local_data/demo-003.sqlite3` |

The backend takes identity from a distinct bearer token. A URL query, body ID, or
UI tab selection grants no access. Each token reads/writes only its own store;
cross-identity submissions are rejected. Paths never come from request IDs.

For developer demonstration, configure the matching token in each tab's in-memory
session. Do not put tokens in URLs or committed files. Printing the demo identities'
tokens to the developer console is a simulated login setup, not real account,
clinical-role, or biometric authentication. zt owns the final session boundary.
This standard-library HTTP server is a local synthetic demo, not an internet service.

Every profile is explicitly synthetic. A uses the existing demo reference. For
distinct technical fixtures, B shifts the template's heart-rate values by +8 bpm
and sleep by +0.5 hours; C shifts them by -4 bpm and -0.5 hours. Other template
values are reused. These transforms are not physiological models or approved demo
stories. Petros's selected package and the crew/clock agreement will replace this
fixture setup later. Existing saved baselines are never recomputed from new inputs.

## Endpoints

All `/v1/me/` requests require `Authorization: Bearer <that crew's runtime token>`.

| Method | Path | Result |
|---|---|---|
| GET | `/v1/health` | API version and synthetic demo mode; no personal data |
| POST | `/v1/me/check-ins` | Save one check-in and return its daily comparison; HTTP 201 |
| GET | `/v1/me/history` | Fixed reference rows, saved check-ins, next proposed mission date |
| GET | `/v1/me/daily` | Daily analysis of the latest saved check-in |
| GET | `/v1/me/report` | Existing two-window weekly report as structured data |

Successful personal responses have this envelope:

```json
{
  "api_version": "health-v1",
  "data_kind": "synthetic",
  "astronaut_id": "demo-001",
  "data": {}
}
```

`history.data` contains `baseline`, `check_ins`, `next_mission_date`.
`daily.data` is the existing `monitor.analyze()` result, including findings, data
gaps, the reference medians and limitations. `report.data` is the existing weekly
report with per-measure counts and nullable comparisons. A POST returns
`data.saved_check_in` and `data.daily`. Ask for the report separately after saving.

The complete versioned request/response example is in [api_example.json](api_example.json).
It describes a fresh synthetic A session; a date already saved in an existing
session will be rejected. Read `next_mission_date` from history for a new entry.

## Check-in input

Use JSON with these fields only:

```json
{
  "recorded_at": "2026-11-14T08:00:00+00:00",
  "resting_heart_rate_bpm": 62,
  "sleep_hours": 7.8,
  "mood": 7,
  "stress": 3,
  "fatigue": 3
}
```

- `astronaut_id` is optional; if supplied it must match the token's identity.
- `recorded_at` is required and must include the fixed mission timezone offset.
  The temporary fixtures use UTC (`+00:00`) and simulated November 2026 dates.
  The client supplies the timestamp explicitly; the server does not use wall-clock
  time or silently remap historical source timestamps.
- `resting_heart_rate_bpm`: resting bpm, a positive finite number. Exercise heart
  rates must not be supplied under this field.
- `sleep_hours`: estimated total sleep in the preceding 24 hours, 0–24 hours.
- `mood`: 0–10, higher = better mood. `stress` and `fatigue`: 0–10, higher = more.
- A missing metric may be omitted or `null`; the saved record normalizes it to
  `null`, never zero. Strings, booleans and nonfinite numbers are rejected.
- One check-in per mission day, in forward order. Duplicate/backdated entries do
  not overwrite history. The stored baseline is never changed by submission.
- Unknown fields are rejected. In particular, do not place a private journal,
  symptoms, prescriptions or an inventory grant inside a health check-in packet.

Errors have `{ "api_version": "health-v1", "error": { "code": "...", "message": "..." } }`.
Expect 400 for invalid fields, missing timestamps, incompatible timezones or dates;
401 for absent/invalid credentials; 403 for a different body identity or an
unconfigured browser origin; 404 for an unknown route; 413 for a body outside
1–16384 bytes; 415 for a non-JSON content type; 500 for unavailable storage.
Responses use `Cache-Control: no-store`. Query parameters are rejected.
There is no HTTP reset/delete endpoint; local `check_in.py --reset` remains explicit.

## Browser handoff

Import the module from the shared HTTP-served repository. The application's session
setup supplies `sessionToken`; do not calculate it from the `crew` query parameter.

```javascript
import { createHealthClient } from "/people/angelos/health_monitor/health_client.mjs";

const health = createHealthClient({ token: sessionToken });
const history = await health.getHistory();
const saved = await health.submitCheckIn({
  recorded_at: `${history.data.next_mission_date}T08:00:00+00:00`,
  resting_heart_rate_bpm: 62,
  sleep_hours: 7.8,
  mood: 7,
  stress: 3,
  fatigue: 3,
});
const latest = await health.getDaily();
const weekly = await health.getWeeklyReport();
// Render saved.data.daily / latest.data / weekly.data in zt's own components.
```

The methods return the full envelope and throw an Error with `.status` for HTTP
failures. Handle the error in the UI; keep a user's inputs available for correction.

## Decisions still needed from zt and the affected owners

- Accept or map the proposed crew IDs to the final crew/authentication system and
  inventory IDs. Agree whether one SQLite file per crew member remains suitable.
- Agree the mission clock and the explicit mapping for historical replay inputs.
- Confirm units, field names and self-report scale. The current UI's “Sleep 0–10”
  slider is not interchangeable with `sleep_hours`: agree hours versus a separate
  quality question before wiring it. Do not silently convert 1–5 answers to 0–10.
- Accept the proposed `health-v1` packet or specify a translation at the joined
  boundary. Browser origin/port and authenticated session handling need agreement.
- Review PET-1 fixtures and the exact wellbeing form before replacing the synthetic
  technical profiles. This adapter does not invent a readiness or task score.

No external messages were sent, no teammate's source was edited, and no clinical
threshold, journal permission or shared-plan decision is established by this file.
