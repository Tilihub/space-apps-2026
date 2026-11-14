# App-facing personal health module

ANG-1: receive new daily measurements from zt's onboard app, store them per crew
member, compare them to that person's frozen reference, and return JSON. This is
a Node.js 24 module for the shared module interface, not another server.
It needs no packages. The Python prototype and its SQLite sessions remain separate.

## Current integration status

The target is the approved version-1 [shared contract](../../../shared/contract/README.md),
merged in PR #49 while this work was in progress. Runtime imports and tests use
the canonical `shared/contract/contract.js` and `testing.js` directly. The module
is ready for zt's single onboard core to import; that core and its pages are not
yet present on main. No frontend or teammate's folder was edited here.

The astronaut receives only their own current entry through `/today` and the
POST response. Detailed daily comparisons, history and weekly analysis are
medical-officer-only, enforced on the server. Earth has no access here.

The user assigned companion responses (step 3) to Potest. This module does not
handle chat, journal text, psychological advice or language-model training.

## Run the checks now

From the repository root, with Node.js 24:

```powershell
npm test
```

The root script runs every `*.test.js` with Node's built-in runner. The checks
use the canonical `handleRequest` dispatch, session/role checks, JSON response
envelopes and temporary in-memory storage. No real user databases are opened,
and no server or network is needed. This validates the module boundary; it is
not an end-to-end test of the unfinished app. On this machine npm is unavailable;
the identical root script can be invoked directly:

```powershell
node --test "**/*.test.js"
```

To run only this module:

```powershell
node --test people/angelos/health/index.test.js
```

## Connection for zt

Import the default export of `people/angelos/health/index.js` into the single
onboard core. Mount its routes under `/api/health`. The core supplies the logged-in
user, mission clock, durable **health-module-specific** store, and event emitter
through the shared `req` / `ctx` interface. One exported module instance serves
the single onboard process. Its queue serializes writes and reset operations.
Persistence across process restarts depends on the core implementing its store.

| Method and path | App role | Purpose |
| --- | --- | --- |
| `POST /api/health/check-ins` | Crew | Save my check-in for the current mission day |
| `GET /api/health/today` | Crew | My current entry, without analysis |
| `GET /api/health/daily?crewId=c4` | Medical officer | Personal daily comparison |
| `GET /api/health/history?crewId=c4&days=14` | Medical officer | Fixed reference plus recent check-ins |
| `GET /api/health/weekly?crewId=c4` | Medical officer | Two seven-day summaries with measured-day coverage |
| `GET /api/health/crew` | Medical officer | Five-person daily overview |

The medical officer is c2. An astronaut cannot use `crewId` to access another
person's data or call any analysis route, including their own.
The officer submits their own daily check-in in their separate **crew role**.
Authentication and HTTP routing remain the core's responsibility.

The app submits a JSON object such as:

```json
{
  "sleepHours": 5.5,
  "restingHeartRateBpm": 77,
  "mood": 4,
  "stress": 7,
  "fatigue": 7,
  "spo2Pct": 98,
  "systolicMmHg": 120,
  "diastolicMmHg": 80,
  "temperatureC": 36.7
}
```

Only measurement fields are accepted. Identity comes from the core session;
`recordedAt` and `missionDay` come from its UTC mission clock. Mood, stress and
fatigue are integers **1-10**; sleep is **hours in the preceding 24 hours**.
Omitted or null measures stay missing, never zero or invented values. At least one
actual measured answer is required, following Petros's wellbeing-form handoff.
An entirely unanswered form is rejected without saving a check-in. A measured
zero hours of sleep is valid; it is different from an unanswered field.
The server rejects a second check-in for the same person and mission day with
HTTP 409 (`already_done`). The frontend should retain the form on an error and
refresh the current-entry view only after a successful response.

A successful POST returns HTTP 201 with `ok: true`, `data.checkIn` containing the
saved measurements plus server-assigned `id`, `crewId`, `recordedAt` and
`missionDay`, and `data.today` containing the basic daily summary. For c4 at demo start,
the saved ID is `health_c4_d42` and the UTC timestamp is
`2026-11-14T07:30:00.000Z`.

The `today` object contains only `crewId`, `missionDay`, `checkedInToday` and
`checkIn` (null before today's entry). It contains no comparison or trend.
The medical officer separately requests `/daily?crewId=c4` for an object with
`crewId`, `missionDay`, `checkedInToday`, `status`,
`measures`, `gaps`, `message` and `limitations`. Each compared measure contains `measure`, `today`,
`normal`, `limit`, `changed`, `direction` and `daysInARow`. See `index.test.js`
for executable request/response assertions. The core wraps errors as
`{ "ok": false, "error": { "code": "...", "message": "..." } }`.

After saving, the module emits `health.check-in-saved` with the crew ID only.
No values, findings, or journal content travel in events. Missing today's entry
produces `no_check_in_today`; yesterday's reading is never presented as today's.

## Reference and weekly comparisons

The external fixture supplies reference days (mission 29-35) and recent days
(36-41) for each of c1-c5. Day 42 is entered live by the app.
`reset(ctx)` re-reads Petros's canonical `demo-data/health.json` when present.
Only if that file does not exist, it uses the bundled example file; invalid or
unreadable files fail rather than triggering fallback. No replacement observations
are generated. The chosen source and a SHA-256 fingerprint of the loaded file
are recorded in the module state on initialization/reset. Later check-ins retain
that fingerprint and the fixed baseline. Old stored references without a
fingerprint are preserved; the code does not invent provenance for them.
The store separates `baseline` from `checkIns`. Saving new readings never changes
the original reference. A fresh store is seeded once on its first request.

For each of the five compared measures, the reference is the median of at least
five available reference days. A change satisfies
`abs(today - median) >= max(3 * 1.4826 * MAD, floor)`. Floors are 1.5 sleep hours,
10 resting bpm, and 2 points for each self-report. These are arbitrary engineering
demo settings, not validated medical limits. Consecutive days require an actual
entry on each adjacent mission day with a change in the same direction.

SpO2, blood pressure and temperature are stored but have **no comparison rules**
in this module. The weekly report uses medians for two adjacent seven-day windows
and per-measure coverage. It reports a week-to-week change only with seven
measured days in both windows. Baseline rows never fill recent gaps.

The weekly result contains `crewId`, `missionDay`, `statistic: "median"`,
`currentPeriod` / `previousPeriod` (`from`, `to`, `recordedDays`), `completeness`,
`measures` and `limitations`. Each measure has its name/unit, `current` /
`previous` (`median`, `validDays`, `missingDays`), `baseline` (`normal`, `limit`,
`days`), `changeFromPreviousWeek` and `changeFromBaseline`. Unavailable changes
are null. This documents the existing optional weekly endpoint for zt; adding
the shape to the protected shared contract requires its normal reviewed PR.

## Data and version boundaries

`fixtures/health.json` is an unchanged copy of Petros's published synthetic PET-1
file; see its [provenance](fixtures/README.md). The copy predates the accepted
contract's demo cases: c4's reference is 7.8 h here, versus 6.8 h required by
the live-demo case. Petros owns the updated canonical fixture. The module will
use it on the next explicit reset or fresh store. This example is not evidence
that the exact live-demo story has passed acceptance. No teammate's records
are silently rewritten here.

The [data review](DATA_REVIEW.md) records which of Petros's files this module
uses, the verified baseline medians and the remaining live-demo differences.
All three inputs from his paired `scenarios.json` pass through the real shared
request dispatcher in our tests. They validate PET-1's published example, which
predates the newer stage cases; they do not redefine the adopted demo story.

`createHealthModule({ fixtureUrl })` lets the core choose another compatible,
labelled synthetic file before initializing a fresh demo store or explicitly
resetting the demo. Persisted references remain fixed until an explicit reset.
There is no upload-file HTTP endpoint. Real personal-history
imports remain in the separate Python reader described in
`../health_monitor/BASELINE_IMPORT.md`; they are not automatically exposed here.

The old Python `demo-001` / 0-10 histories are not migrated or silently converted
to this new five-person / 1-10 contract. Existing SQLite files stay untouched.
An incompatible stored module version fails explicitly rather than overwriting
its history. The app core owns the global reset clock and confirmation flow;
this module's reset replaces only its own demo state from the fixture.
