# Onboard app contract

Version 1 · kept by zt · **proposed until its pull request is approved**

This file says exactly how the app runs and what each piece must provide. Everyone builds their
piece alone, to this file, so that joining the pieces is only the final link.

- [contract.js](contract.js): the lists and helpers every piece shares (crew, scales, symptom
  codes, events, error codes, request handling). The server and the pages load this same file.
- [testing.js](testing.js): a stand-in for the server, for your module's tests.
- [example/](example/): a complete, tested example module. Copy it to start yours.

Product requirements are Tommy's, in [people/tommy/plan.md](../../people/tommy/plan.md). If this
file and those requirements disagree, ask zt and Tommy.

## 1. How the app runs

```
Ship's main computer (one laptop in the demo), Node.js server
├─ core     login, crew list, mission clock, events, saving    zt
├─ health   /api/health/*   check-ins and health analyses       angelos
├─ meds     /api/meds/*     symptoms, medicines, lockers        dadis2
├─ env      /api/env/*      cabin air and alerts                potest
├─ mind     /api/mind/*     journal and companion (wave 2)      angelos
└─ pages    astronaut app          /          5 crew, tablet or laptop
            medical officer        /medical/  Leo only
            Earth console          /earth/    wave 2, simulated
```

- **One server holds all data and all rules.** Pages only show data and send what people enter.
  Every permission is checked on the server, never only in a page.
- **Language:** JavaScript ES modules (`.js` files, `import`/`export`) on **Node.js 24 LTS**.
  No npm packages, only what Node has built in. Nobody runs `npm install`.
- **Start:** `npm start` from the repo root (added together with the core). The pages are at
  `http://<server laptop's IP>:8000/`.
- **Tests:** `npm test` from the repo root runs every `*.test.js` file with Node's built-in test runner.
- **Network:** devices must be on the same network as the server laptop. Venue Wi-Fi often blocks
  traffic between devices, so bring a phone hotspot, or open all pages on the server laptop.
- All data is synthetic, and the login is simulated. Nothing leaves the laptop.

## 2. Who builds what

| Piece | Owner | Folder | Wave 1: the first joined demo | Wave 2 |
|---|---|---|---|---|
| Core and every page | zt | `integration/onboard-app/` | server, login, clock, events; astronaut app; medical officer platform | Earth console, final look |
| health | angelos | `people/angelos/health/` | check-ins and the astronaut's daily summary; for the medical officer: today vs normal, history, crew overview | weekly report |
| mind | angelos | `people/angelos/mind/` | | journal, companion |
| meds | dadis2 | `people/dadis2/meds/` | symptom reports, suggestions, lockers, collecting, requests and approvals, grants, dose log | stock, emergency button, Earth codes |
| env | potest | `people/potest/env/` | current readings, history, alerts, snapshot | radiation |
| demo data | petros | `people/petros_the_space_larper/demo-data/` | health history per crew member, measurement guides, demo stories | wellbeing form wording (PET-2) |
| Reports and Earth link | **no owner yet** (Tommy's POT-2 suggests potest) | | | report queue, link up or down, Earth replies |
| Readiness and task scores | Tommy and zt decide (Q16) | | a placeholder in the pages | |

Your existing prototype (`health_monitor/`, `inventory/`, `environmental-graphs/`) stays as it is.
The module is new work in a new folder: reuse your own logic and tests from the prototype.

Proposed timing: wave 1 modules pushed, with `npm test` passing, before we leave on Saturday;
zt links them on Sunday morning.

## 3. What a module is

A module is a folder whose `index.js` default-exports one object. It has no web server, no login
and no HTML. [example/index.js](example/index.js) is a complete one.

```js
import { apiError, checkFields, resolveCrewId } from '../../../shared/contract/contract.js';

export default {
  name: 'health',   // serves /api/health/...
  owner: 'angelos',
  reset: async (ctx) => { /* save the demo start data with ctx.store.save(...) */ },
  tick: async (ctx) => { /* optional: the core calls it every 5 seconds */ },
  routes: [
    { method: 'POST', path: '/check-ins', roles: ['crew'], status: 201,
      handler: async (req, ctx) => { /* return data, or throw apiError(code, message) */ } },
  ],
};
```

What a handler gets:

| | What it is |
|---|---|
| `req.user` | `{ crewId, role }` of whoever is logged in. `crewId` is `null` for the Earth console |
| `req.params` | the `:name` parts of the path: `/doses/:id` gives `req.params.id` |
| `req.query` | the URL query, as strings |
| `req.body` | the JSON body, or `null` |
| `ctx.now()` | mission time, ISO 8601 UTC. **Always use this, never `new Date()`**, so the demo clock can jump |
| `ctx.missionDay()` | today's mission day number |
| `ctx.store.load()`, `ctx.store.save(state)` | your module's saved data, one JSON object. `load()` gives `null` before the first save. The core writes it to disk |
| `ctx.emit(type, crewId)` | tells open pages that something changed, so they reload it. Only types from `EVENTS`, never content |
| `ctx.log(...)` | prints to the server console |

Rules for every module:

1. **Stay inside your folder.** Never write files, read the device clock, call another module or
   use npm packages. The pages combine data from several modules, not the modules.
2. **Check every input.** `checkFields(body, allowed, required)` refuses unknown and missing fields
   with `invalid_field`, so a mismatch fails loudly instead of silently. Check ranges too.
   Missing values are `null`, never `0`.
3. **Check who's asking.** Every route lists its `roles`. For crew data, use
   `resolveCrewId(req.user, req.query.crewId)`: crew get only their own, the medical officer gets
   anyone's, everyone else is refused.
4. **Return plain JSON data:** strings, numbers, booleans, `null`, arrays, objects. Times are ISO
   strings from `ctx.now()`.
5. **Refuse with `throw apiError(code, message)`**, using a code from `ERRORS`. The message is shown
   to the person, so write it plainly.
6. **`reset(ctx)` puts back the demo start state**, the same every time. The core calls it for
   "Reset demo" and at the first start.
7. **Data files:** read them with `readFile(new URL('./file.json', import.meta.url), 'utf8')` from
   `node:fs/promises`.
8. **Tests:** `*.test.js` files in your folder, using `makeTestContext()` from
   [testing.js](testing.js) and `handleRequest()` from contract.js, which runs a request exactly
   as the server will. `npm test` must pass before you push.

The app imports your module straight from your folder, without copying it. Only you edit it.

## 4. Shared formats

### Crew and roles

| id | Name | Title | Demo story (proposed) |
|---|---|---|---|
| `c1` | Mara Quinn | Commander | healthy |
| `c2` | Leo Haddad | Medical officer | the only medical officer, and also a normal crew member |
| `c3` | Ines Sato | Flight engineer | some readings missing |
| `c4` | Tomas Reyes | Mission specialist | slept badly 3 nights, headache, CO₂ high overnight |
| `c5` | Kai Lindqvist | Pilot | usual |

The names are fictional: four come from dadis2's prototype, and Kai is new. There is no backup
medical officer.

| Role | Who | Page | Can see |
|---|---|---|---|
| `crew` | every crew member, Leo included | astronaut app | only their own entries, their basic daily summary, their medicines, and cabin conditions. **Not** the detailed health analyses |
| `medical_officer` | Leo (`c2`) only | medical officer platform | every crew member's health analyses and medicine data, and approvals. **Never** the journal or the companion |
| `earth` | the specialist on Earth (simulated) | Earth console | cabin conditions, requests waiting for Earth, and (wave 2) reports sent to Earth |

When Leo is the patient, anything that needs the medical officer's approval goes to Earth instead.

The detailed health analyses (today against the crew member's normal, their history, the weekly
report) are for care roles only, not for the astronaut (Tommy, PR #47). Hiding them in a page is
not enough: the server refuses them to every other role. For now the only care role in the app is
the medical officer; a psychologist role may come later.

### Fields, units and scales

- JSON field names are camelCase: `crewId`, `sleepHours`.
- **Mood, stress, fatigue: whole numbers 1–10** (Tommy, Q17). Higher mood is better; higher stress
  or fatigue is more. Symptom severity is 1–10 too, higher is worse.
- There is no 0–10 data anywhere. All demo history is new synthetic data on 1–10; nothing is
  converted from the old scale.
- Sleep is in hours (`sleepHours`), never a 1–10 score.
- Every other measurement, with its unit: `MEASUREMENTS` in contract.js.
- **Missing is `null`.** A value that wasn't measured is never `0`.
- Times are ISO 8601 UTC with `Z`, for example `2026-11-14T07:30:00.000Z`.

### Mission clock

- Mission day 0 began at `LAUNCH` (3 October 2026). A demo reset sets the clock to `DEMO_START`:
  mission day 42, 07:30. From there it runs at normal speed and can jump forward for the demo.
- Each crew member's normal (baseline) is mission days 29–35 (`BASELINE_DAYS`).
- Mission time is UTC. There are no other time zones.

### Symptoms and body areas

`SYMPTOMS` in contract.js lists every symptom code (from dadis2's list) with its body area from
`BODY_AREAS`, for the body figure. `redFlag: true` means the app tells the crew member to call the
medical officer straight away.

### Answers and errors

Every API answer is JSON in one of two shapes:

```json
{ "ok": true, "data": {} }
{ "ok": false, "error": { "code": "not_your_data", "message": "Crew members can only see their own data." } }
```

The error codes and their HTTP status are in `ERRORS` in contract.js.

### Events

Pages ask the core for new events every 2 seconds and reload whatever changed. An event says only
what changed and for whom: `{ "id": 17, "type": "meds.request-created", "crewId": "c4", "at": "…" }`.
The types are in `EVENTS` in contract.js.

## 5. Core (zt)

The core is the only part that speaks HTTP. It checks the login token, runs each request through
`handleRequest()`, saves each module's store to `integration/onboard-app/data/<module>.json` (not
committed), calls `tick` every 5 seconds, and serves the pages and `shared/contract/contract.js`.
At start, a module whose store is empty gets `reset`.

| Method and path | Who | Send | Get back |
|---|---|---|---|
| `POST /api/session` | anyone | `{ "crewId": "c4", "platform": "astronaut" }`. Platform `medical` works only for `c2`; `earth` takes `crewId: null` | `{ token, user: { crewId, role, name } }` |
| `GET /api/session` | logged in | | `{ user }` |
| `DELETE /api/session` | logged in | | `{}` |
| `GET /api/crew` | logged in | | `{ crew: CREW }` |
| `GET /api/clock` | logged in | | `{ now, missionDay, time }` |
| `POST /api/clock/advance` | logged in (demo control) | `{ "minutes": 720 }` | the new clock |
| `POST /api/demo/reset` | logged in (demo control) | | every module's `reset`, and the clock back to `DEMO_START` |
| `GET /api/events?after=<id>` | logged in | | `{ events: [...], lastId }` |

A page keeps its token in `sessionStorage`, so each browser tab has its own login (the astronaut
and the medical officer can be two tabs of one browser). It sends the token as
`Authorization: Bearer <token>`. A token never goes in a URL. Logging in is simulated: you pick a
crew member.

## 6. health (angelos)

Reuse the comparison from `people/angelos/health_monitor/`, ported to JavaScript, with your
existing tests as the checklist: the median of the baseline days, a limit that is the larger of
3 scaled MADs and the demo floor (10 bpm, 1.5 h, 2 points), at least 5 baseline days, and days in
a row. These stay demo values, not medical limits, and the message never diagnoses.

Paths are after `/api/health`. The astronaut gets only `POST /check-ins` and `GET /today`; every
analysis is for the medical officer (see "Crew and roles"). A crew member, Leo included, who calls
an analysis path as `crew` gets `wrong_role`.

| Method and path | Who | Send | Get back |
|---|---|---|---|
| `POST /check-ins` | crew | the check-in below | 201 `{ checkIn, today }`; `already_done` if this mission day already has one |
| `GET /today` | crew (own) | | `Today`, below: the basic daily summary for the astronaut's Home |
| `GET /daily?crewId=c4` | medical_officer | | `Daily`, below |
| `GET /history?crewId=c4&days=14` | medical_officer | | `{ crewId, baseline: [CheckIn], checkIns: [CheckIn] }`, oldest first. `days` is 1–60 |
| `GET /crew` | medical_officer | | `{ crew: [{ crewId, checkedInToday, status, changed: ["sleepHours"] }] }` for all five |
| `GET /weekly?crewId=c4` | medical_officer | | wave 2: this week against last week, per measure. angelos adds the exact shape here |

A check-in sends any of these fields (at least one, nothing else):

```json
{ "sleepHours": 5.5, "restingHeartRateBpm": 77, "mood": 4, "stress": 7, "fatigue": 7,
  "spo2Pct": 97, "systolicMmHg": 121, "diastolicMmHg": 79, "temperatureC": 36.8 }
```

The server adds `id`, `crewId`, `recordedAt` (from `ctx.now()`) and `missionDay`; that is a
`CheckIn`. Only the five `COMPARED_MEASURES` are compared. The others are stored and shown.

`Today`, for the astronaut:

```json
{ "crewId": "c4", "missionDay": 42, "checkedInToday": true, "checkIn": { "id": "chk_…", "sleepHours": 5.5 } }
```

`checkIn` is today's own entries as sent (`null` before checking in), with no comparison. Which
other fields the astronaut sees on Home is still open (Tommy and zt). Until it is agreed, nothing
else goes in `Today`.

`Daily`, for the medical officer:

```json
{
  "crewId": "c4", "missionDay": 42, "checkedInToday": true,
  "status": "changes_found",
  "measures": [
    { "measure": "sleepHours", "today": 5.5, "normal": 7.8, "limit": 1.5,
      "changed": true, "direction": "lower", "daysInARow": 3 }
  ],
  "gaps": ["restingHeartRateBpm: not measured today"],
  "message": "3 measures differ from this crew member's normal. This is not a diagnosis.",
  "limitations": ["Demo comparison rules, not medical limits."]
}
```

- `measures` always has the five `COMPARED_MEASURES`, in that order. When `today` or `normal` is
  `null`, `changed` is `false` and `gaps` says why.
- `direction` is `higher`, `lower` or `null`. `daysInARow` counts mission days in a row changed
  the same way, ending today.
- `status` is `changes_found`, `no_changes`, `not_enough_data`, or `no_check_in_today` (then every
  `today` is `null`).
- Events: `health.check-in-saved`.
- `reset` loads petros's `demo-data/health.json`. Until it exists, use your own file in the same shape.

## 7. mind (angelos, wave 2)

Journal and companion. **Private:** only the author can call these, as `crew`. Not the medical
officer, not Earth, never in a report or an event. Psychologist access (Tommy, Q11) comes later,
with its own role.

| Method and path | Who | Send | Get back |
|---|---|---|---|
| `POST /journal` | crew | `{ "text": "…" }`, up to 5,000 characters | 201 `{ entry }` |
| `GET /journal?days=14` | crew | | `{ entries: [...] }`, own only |
| `POST /companion` | crew | `{ "message": "…", "context": { "today": {} } }` | `{ reply, links: [{ "screen": "checkin" }] }` |

Modules don't call each other, so the page sends the crew member's own `today` result as `context`.
Whether the companion may also use the detailed analyses, without showing them to the astronaut,
is still open.
How the companion answers (fixed rules or a language model) is angelos's choice. An online model
needs internet at the venue and a key that is never committed.

## 8. meds (dadis2)

Reuse the rules and tests from `people/dadis2/inventory/` (tiers, safety checks, suggestions,
grants, due doses). What changes from the prototype:

- No screens: the pages draw the lockers from `GET /lockers`.
- State lives in `ctx.store`, not `localStorage`. Time comes from `ctx.now()`, not the device clock.
- Crew are `c1`–`c5`. `c2` is the only medical officer, with no backup; when `c2` is the patient,
  approvals go to Earth.
- Symptom severity is 1–10, and symptom codes come from `SYMPTOMS`. Tiers are `MED_TIERS`.
- Points, XP and badges stay out (Tommy deferred them).

Paths are after `/api/meds`.

| Method and path | Who | Send | Get back |
|---|---|---|---|
| `POST /symptom-reports` | crew | `{ symptoms: [{ code, severity }], note, vitals }` | 201 `{ report, redFlag, advice, suggestions }` |
| `GET /symptom-reports?crewId=&days=7` | crew (own), medical_officer | | `{ reports: [...] }` |
| `GET /lockers` | crew, medical_officer | | `{ lockers: [...] }`, as seen by this person |
| `POST /collections` | crew | `{ itemId, units, reportId }` for self-care, or `{ grantId }` for a grant's due dose | 201 `{ collection }`; `needs_approval`, `not_due`, `already_done` |
| `POST /collections/:id/scan` | crew (own) | `{ compartmentId }` | `{ collection }`; `status` is `complete` once every box is scanned |
| `DELETE /collections/:id` | crew (own) | | `{ collection }` with `status: "cancelled"` |
| `POST /requests` | crew | `{ itemId, reportId, note }` | 201 `{ request }` |
| `GET /requests?crewId=&status=` | crew (own), medical_officer, earth (`waiting_earth` only) | | `{ requests: [...] }` |
| `POST /requests/:id/decision` | medical_officer; earth for `waiting_earth` | `{ decision, units, perDay, days, note }`, `decision` is `approve` or `deny` | `{ request, grant }`; `needs_earth` |
| `GET /grants?crewId=` | crew (own), medical_officer | | `{ grants: [...] }` |
| `POST /grants/import` | crew | `{ code }`, typed or scanned from Earth | 201 `{ grant }`; `invalid_code`, `not_your_data`, `already_done` |
| `GET /doses?crewId=&days=7` | crew (own), medical_officer | | `{ doses: [...] }` |
| `POST /doses/:id/follow-up` | crew (own) | `{ helped: true }` | `{ dose }` |
| Wave 2: `GET /stock` (medical_officer), `POST /emergency` (crew), `POST /grants/code` (earth) | | | |

`note`, `vitals`, `reportId` and `units` may be `null`. `vitals` uses the `MEASUREMENTS` field names.

```json
"report":     { "id": "sym_…", "crewId": "c4", "reportedAt": "…", "missionDay": 42,
                "symptoms": [{ "code": "headache", "severity": 6 }], "note": null,
                "vitals": { "temperatureC": 36.9, "spo2Pct": 98 } }
"suggestion": { "itemId": "acetaminophen-325", "name": "Acetaminophen 325 mg", "units": 2,
                "approval": "none", "why": "For your headache" }
"lockers":    [{ "id": "L1", "name": "Locker 1", "shelves": [{ "id": "L1-2", "level": 2,
                 "bins": [{ "compartmentId": "L1-2-04", "bin": 4, "itemId": "…", "label": "…",
                            "tier": "self-care", "units": 40, "locked": false, "open": false }] }] }]
"collection": { "id": "col_…", "crewId": "c4", "source": "self-care", "grantId": null, "slot": null,
                "status": "open", "compartments": [{ "compartmentId": "L1-2-04", "itemId": "…",
                                                     "units": 2, "scanned": false }] }
"request":    { "id": "req_…", "crewId": "c4", "itemId": "…", "reportId": "sym_…", "note": null,
                "status": "waiting_medical_officer", "createdAt": "…", "decidedAt": null }
"grant":      { "id": "G41", "crewId": "c4", "issuer": "c2", "verification": "onboard-officer",
                "items": [{ "itemId": "ondansetron-4", "units": 1, "perDay": 2, "days": 3 }],
                "start": "…", "end": "…", "dueNow": true, "nextDue": "…" }
"dose":       { "id": "dose_…", "crewId": "c4", "itemId": "…", "name": "…", "units": 2,
                "collectedAt": "…", "source": "grant", "grantId": "G41", "slot": "2026-11-14@08",
                "helped": null }
```

- `suggestion.approval` and `request.status` follow `MED_TIERS`. `request.status` is
  `waiting_medical_officer`, `waiting_earth`, `approved` or `denied`.
- `collection.status` is `open`, `complete` or `cancelled`. `collection.source` and `dose.source`
  are `self-care` or `grant`.
- `grant.issuer` is `c2` or `EARTH`. `grant.verification` is `onboard-officer` (approved by Leo on
  the medical officer platform) or `simulated` (a code from Earth; the sender isn't verified yet).
- In `lockers`, `locked` means this person can't take it without approval, and `open` means it is
  part of their open collection right now.
- Collecting is the dose (dadis2's rule): one scanned box is one dose, recorded once. A grant
  never releases more than the dose that is due now.
- Events: `meds.symptom-reported`, `meds.request-created`, `meds.request-decided`,
  `meds.grant-added`, `meds.collection-opened`, `meds.dose-collected`, `meds.collection-closed`.

## 9. env (potest)

Reuse `people/potest/environmental-graphs/`: its data, its alert rules (two readings confirm a
change) and its source labels. The replay runs on the server, driven by the mission clock, so every
page sees the same cabin.

Paths are after `/api/env`. Everyone logged in may call them.

| Method and path | Get back |
|---|---|
| `GET /now` | the readings at `ctx.now()` |
| `GET /snapshot?at=<ISO>` | the same shape at an earlier mission time (for a case report: the cabin when a symptom started) |
| `GET /history?metric=co2&hours=24` | points for the graph |
| `GET /alerts?hours=24` | `{ alerts: [...] }`, opened or recovered in that time |

```json
"now": {
  "at": "2026-11-14T07:30:00.000Z",
  "source": { "dataset": "RR-9-telemetry", "label": "ISS cabin, RR-9 mission (2018), replayed",
              "kind": "historical", "sourceTime": "2018-…" },
  "readings": [{ "metric": "co2", "value": 3620, "unit": "ppm", "state": "warning",
                 "measuredAt": "2026-11-14T07:25:00.000Z" }],
  "openAlerts": [{ "id": "alr_…", "metric": "co2", "level": "warning", "openedAt": "…" }]
}
"history": { "metric": "co2", "unit": "ppm",
  "limits": { "warningLow": null, "warningHigh": 3500, "dangerLow": null, "dangerHigh": 3900 },
  "points": [["2026-11-13T07:30:00.000Z", 812], ["2026-11-13T07:35:00.000Z", null]],
  "source": {} }
"alert": { "id": "alr_…", "metric": "co2", "level": "warning", "openedAt": "…",
           "recoveredAt": null, "peak": 3720 }
```

- Wave 1 metrics: `co2` (ppm), `temperature` (°C), `humidity` (%). Wave 2: `radiation`, with its
  own source label.
- `state` is `normal`, `warning`, `danger` or `no-reading` (then `value` is `null`). A `null` in
  `points` is a gap: the graph draws a break.
- `kind` is `historical` or `synthetic`. Always say which, and never present a replay as live.
- How mission time maps to source time is your choice, but it must depend only on mission time,
  so a clock jump or a restart gives the same readings.
- Demo story: CO₂ above the warning level during the night before day 42 (about 01:00–06:00),
  recovered by 07:00. Use a real excursion if the archive has one; otherwise insert it and label
  that stretch synthetic.
- `tick` emits `env.alert-opened` and `env.alert-recovered`, once each, as mission time passes them.

## 10. demo data (petros)

Synthetic, labelled, and in this contract's formats, so modules can load them on reset.

- `health.json`: per crew member, one check-in per mission day for days 29–41 (29–35 are the
  baseline, 36–41 the recent days). Day 42 stays empty: it happens live in the demo.

  ```json
  { "contractVersion": 1, "kind": "synthetic",
    "crew": { "c4": { "story": "Slept badly the last 3 nights, headache this morning.",
      "checkIns": [{ "missionDay": 29, "time": "07:30", "sleepHours": 7.8,
                     "restingHeartRateBpm": 60, "mood": 7, "stress": 3, "fatigue": 3,
                     "spo2Pct": 98, "systolicMmHg": 118, "diastolicMmHg": 76,
                     "temperatureC": 36.7 }] } } }
  ```

  A missing value is `null`. c3 has some, to show data gaps.
- `measurement-guides.json`: the check-in's step-by-step instructions for resting heart rate,
  blood pressure, blood oxygen and temperature.

  ```json
  [{ "id": "blood-pressure", "title": "Blood pressure", "measures": ["systolicMmHg", "diastolicMmHg"],
     "steps": ["Sit still for 5 minutes.", "…"], "sources": ["https://…"] }]
  ```
- `stories.md`: the demo story per crew member (health pattern, symptoms, cabin events,
  medicines), so health, meds and env all tell the same story.

## 11. Reports and the Earth link (wave 2, needs an owner)

An outline. Whoever takes it writes the exact paths and shapes here.

- The medical officer creates a case report on the medical officer platform. The page puts it
  together from health, meds and env (modules don't call each other) and sends it to `/api/reports`.
- The astronaut never sees a report's content (Tommy, Q13), and the journal is never in it.
- The Earth link is a demo switch, up or down. While it is down, reports wait as `queued`, then go
  `sent` and `received`. Each report is delivered once.
- Earth replies on the Earth console: a note, a grant code for `POST /api/meds/grants/import`, or both.

## 12. Wave 1 is done when this works

1. Tomas (`c4`) logs in on the astronaut app. Home shows his body figure and the readiness placeholder.
2. He checks in: slept 5.5 h, mood 4, stress 7, fatigue 7. His Home shows today's check-in as
   done. On the medical officer platform, Leo sees Tomas's analysis: today against his normal,
   changed 3 days in a row. Tomas calling `GET /api/health/daily` himself gets `wrong_role`.
3. He reports a headache, severity 6, and is offered acetaminophen. He opens the locker and scans
   the box. The dose log shows it, and later asks "Did it help?".
4. He asks for a prescription medicine. Within a few seconds Leo (`c2`), on the medical officer
   platform in another tab, sees the request, together with Tomas's daily result, his symptom and
   the overnight CO₂ alert. Leo approves.
5. Tomas sees the grant and collects only the dose that is due. Trying again gives `already_done`.
6. "Reset demo" puts everything back.

## 13. Still open

- Readiness and task scores: Tommy and zt (Q16). A placeholder until then.
- Which health fields the astronaut sees on Home (`Today`): Tommy and zt.
- Crew names, Kai, and each crew member's demo story: change them here if the team prefers others.
- Psychologist role and journal access (Q11): wave 2.
- Emergency access details (Q15): with dadis2, wave 2.
- An owner for reports and the Earth link.
- Wording of the ends of the 1–10 scales (petros, PET-2).

## 14. Changing this contract

`shared/contract/` is protected like `shared/PLAN.md`: change it only through a pull request that
a teammate approves, and tell the owners of the pieces it touches. A change that breaks existing
modules raises `CONTRACT_VERSION`. Don't work around the contract inside your module. If it doesn't
fit, ask zt.
