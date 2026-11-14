# Health module handoff: zt and Potest

For ready-to-copy tasks per owner and the joined acceptance checklist, use
[TEAM_NEXT_STEPS.md](TEAM_NEXT_STEPS.md).

**Stage-data update:** Petros's aligned PR #64 at `1b736f5` is independently
verified: c1 no changes, c3 mood/stress streaks 6/3 days, c4 sleep reference 6.8 h
with only sleep changed for 3 days. All 51 current root checks pass, including
his new workout controller checks. Merge that source PR, then initialize a fresh
demo store or explicitly reset at `DEMO_START` to adopt it. Existing sessions
retain their original baseline. The older source-data differences mentioned
below are resolved by this candidate; see DATA_REVIEW.md for verification.

The health component is ready to import into the approved single onboard core.
It implements check-ins, personal comparisons, history, weekly summaries, crew
overview and workout records. Node.js 24, built-ins only, no package installation.
The Python prototype remains available separately for study and Potest's existing
single-profile experiment; it is not the API for the five-crew onboard app.

## zt: mount the module once

From `integration/onboard-app/`, import:

```js
import health from '../../people/angelos/health/index.js';
```

Use the shared contract's `handleRequest(health, ctx, request)` dispatcher and
mount routes at `/api/health`. Supply the authenticated user from the core
session, one UTC mission clock, a durable **health-only** `ctx.store`, and
metadata-only `ctx.emit`. Use one module instance for that store; do not create
a new instance per request. The module serializes its operations within that
single onboard process. Call `health.reset(ctx)` for a new empty store and global
demo reset, with the core's clock set to `DEMO_START`.

Reset loads `people/petros_the_space_larper/demo-data/health.json`, now on main
through PR #51, and records its SHA-256 fingerprint. A bundled earlier PET-1
copy is only a fallback if that path does not exist. Invalid input fails before
saving. References and check-ins are kept separately; editing an input file
does not alter an existing session until an explicit reset.

## Browser adapter for both owners

Serve `people/angelos/health/client.js` as an ES module asset, or import it into
the page's module graph. It contains no Node imports. Example, assuming the
core page stores its current token under `token` (adapt the getter to your
actual session state):

```js
import { createHealthClient } from '/people/angelos/health/client.js';

const healthApi = createHealthClient({
  token: () => sessionStorage.getItem('token'),
});

const { today } = await healthApi.submitCheckIn({
  sleepHours: 4.6, restingHeartRateBpm: 63, mood: 6, stress: 4, fatigue: 4,
});
// Render today's own entry, without analysis.
const reloaded = await healthApi.getToday();
```

The default base URL is `/api/health`. The token getter is evaluated for each
request, and the token travels only in the Authorization header. Every response
is unwrapped from `{ok, data}`; failures throw `HealthApiError` with `status`,
`code` and `message`. Network failures remain errors. Keep unsaved form values
on failure. On a duplicate (`409`, `already_done`), reload the existing entry
or workouts; do not assume a retry added another record. Clear rendered data
and companion context on logout or identity change, and discard outstanding
responses from a previous session.

| Client method | Core route | Authorized session |
| --- | --- | --- |
| `submitCheckIn(body)` | `POST /api/health/check-ins` | Crew, own identity |
| `getToday()` | `GET /api/health/today` | Crew, own identity |
| `getDaily({crewId})` | `GET /api/health/daily` | c2 medical role |
| `getHistory({crewId, days})` | `GET /api/health/history` | c2 medical role |
| `getWeekly({crewId})` | `GET /api/health/weekly` | c2 medical role |
| `getCrew()` | `GET /api/health/crew` | c2 medical role |
| `submitWorkout(body)` | `POST /api/health/workouts` | Crew, own identity |
| `getWorkouts({crewId, days})` | `GET /api/health/workouts` | Crew own; c2 medical role any crew |

History defaults to 14 days; workout history to 7. Both accept whole numbers
1-60 and return oldest first. Clinical history includes the fixed reference
separately. The medical officer submits their personal entries in a **crew**
session, not their medical session. Earth cannot read health data here. Events
are only `health.check-in-saved` and `health.workout-saved` with the crew ID.

## Potest: approved companion health context

Use the astronaut's **crew token**, through the page, to request:

```js
const context = await healthApi.getCompanionContext();
// Pass { message, context } to the agreed POST /api/mind/companion route.
```

This returns exactly `{ today }`, where Today contains `crewId`, `missionDay`,
`checkedInToday` and `checkIn` (null before an entry). The check-in has that
person's current submitted measurements and server identity/time metadata.
It contains **no baseline, trend, detailed history, weekly summary or journal**.
The helper reloads the current entry; it does not cache another person's data.
The receiving mind handler must still validate that the supplied crew identity
matches its authenticated author before using client-provided context.

This follows the adopted contract. Permission to give detailed analyses to the
companion is still open. Potest's PR #55 comparison of context modes remains a
synthetic experiment using the separate Python store; it does not grant broader
access to this app module. Modules do not call each other directly, and this
component never sends data to an external model. Potest and zt own adapting
the companion into the one core and any separately agreed model/runtime choice.

## zt: workout screen

Get Start/Stop times from the core's mission clock, not the device clock. Submit
a completed workout with the shared fields:

```js
await healthApi.submitWorkout({
  kind: 'push-ups',
  startedAt: '2026-11-14T07:40:00.000Z',
  endedAt: '2026-11-14T07:41:30.000Z',
  reps: 25,
  avgHeartRateBpm: 128,
  peakHeartRateBpm: 145,
  recoveryHeartRateBpm: null,
  heartRateSource: 'synthetic: example exercise replay, not a live sensor',
});
```

The example requires mission time at or after 07:41:30. Return is `{workout}`
with server-assigned `id`, `crewId` and `missionDay`, derived from the completion
time. UTC times are normalized; the end must follow the start and cannot be in
the future. Reps are non-negative integers. The contract's numeric bpm range
is used only to reject malformed inputs; it is not a clinical limit. Peak must
be at least average. Kind/source must be non-empty text, up to 80/500 characters.

Save at Stop with recovery null, or wait a full mission minute after Stop before
submitting a measured recovery value. Submit once: no workout-update route is
defined in the current contract. An exact same-person/kind/start/end retry is
refused with 409. Multiple distinct workouts per day are allowed. The source
label is required so a synthetic/replayed value is not described as live.

Workouts remain separate from resting check-ins and never change the baseline,
daily comparison, weekly health summary or readiness. Existing stores saved
before this feature retain all health records and gain an empty workout list
on their next successful write. A demo reset clears new entries and workouts
and reloads the selected reference file.

## Verification and remaining team work

From the repository root:

```powershell
npm test
# If npm is absent, the identical package test script is:
node --test "**/*.test.js"
```

All 43 checks pass: 36 health/client/workout checks and 7 shared examples. This
includes the actual browser adapter over temporary localhost HTTP, canonical
dispatcher/session roles, two crew identities, JSON-store reload, check-ins,
workouts, duplicate errors, reset and clinical access refusals. HTTP tests need
localhost networking (the agent sandbox requires elevated test execution).
Temporary stores are used; no personal SQLite database is touched. The onboard
core/pages are not on main yet, so these checks do not claim a joined UI test.

zt can now import the component and wire the form/workout/medical pages. Potest
can use the current-entry context helper with the crew session. Exact stage-case
acceptance still needs Petros's updated source data: c4 currently has a 7.8 h
reference, whereas the accepted stage story requires 6.8 h. See
[DATA_REVIEW.md](DATA_REVIEW.md) for all concrete differences. The component reads
new compatible values on explicit reset; no algorithm change is needed for
that replacement. Demo thresholds remain unvalidated engineering settings.
