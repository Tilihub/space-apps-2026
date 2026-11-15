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

## Pulsars addition under review

Tommy authorized the separate personal-progress/shop module on 15 November 2026. Its additive API, owner folder, private ten-answer persistence, load PRs, reward rules and event are proposed in [pulsars.md](pulsars.md). Existing medicine/health interfaces remain unchanged; the addition requires teammate review before merge.

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
            Earth console          /earth/    later, simulated
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

The live demo is in [people/zt/demo-cases.md](../../people/zt/demo-cases.md): five crew members,
one scene each, the medical officer last. Wave 1 is the core path (section 12). Wave 2 is
everything else the live demo needs.

| Piece | Owner | Folder | Wave 1: the core path | Wave 2: the rest of the demo | Later |
|---|---|---|---|---|---|
| Core and every page | zt | `integration/onboard-app/` | server, login, clock, events; astronaut app; medical officer platform | emergency alarm on every screen, workout screen, case summaries, final look | Earth console |
| health | angelos | `people/angelos/health/` | check-ins and the astronaut's daily summary; for the medical officer: today vs normal, history, crew overview | workout records | weekly report |
| mind | angelos | `people/angelos/mind/` | | journal, companion with fixed replies | |
| meds | dadis2 | `people/dadis2/meds/` | symptom reports, suggestions and blocked items, allergies, lockers, collecting, requests and approvals, grants, dose log | emergency release, stock | Earth codes |
| env | potest | `people/potest/env/` | current readings, history, alerts, snapshot, with the real CO₂ rise | radiation: one real cruise reading | |
| demo data | petros | `people/petros_the_space_larper/demo-data/` | health history per crew member (values in the demo cases), measurement guides, stories | workout heart-rate replay, wellbeing form wording (PET-2) | |
| Reports and Earth link | potest, **proposed** (Tommy's POT-2), to confirm at the table | to be named | | report queue, 12-minute link delay, send to Earth | Earth replies |
| Pulsars (proposed addition) | tommy | `people/tommy/pulsars/` | | private coins, streaks, PRs and cosmetic shop; see [pulsars.md](pulsars.md) | |
| Readiness and task scores | Tommy and zt decide (Q16) | | a placeholder in the pages | | |

Your existing prototype (`health_monitor/`, `inventory/`, `environmental-graphs/`) stays as it is.
The module is new work in a new folder: reuse your own logic and tests from the prototype.

Proposed timing: wave 1 modules pushed, with `npm test` passing, before we leave on Saturday;
wave 2 by Sunday 11:00. zt links each piece as it arrives.

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

| id | Name | Title | Demo story (from the demo cases) |
|---|---|---|---|
| `c1` | Mara Quinn | Commander | B: healthy, does a workout |
| `c2` | Leo Haddad | Medical officer | E: the only medical officer, and also a normal crew member |
| `c3` | Ines Sato | Flight engineer | D: mood below normal for 6 days; resting heart rate missing on days 39 and 41 |
| `c4` | Tomas Reyes | Mission specialist | A: known NSAID allergy, headache, three short nights, CO₂ high overnight, says "I'm fine" |
| `c5` | Kai Lindqvist | Pilot | C: allergic reaction to a new food, an emergency |

The names are placeholders until the team picks new ones (four come from dadis2's prototype, and
Kai is new). There is no backup medical officer.

| Role | Who | Page | Can see |
|---|---|---|---|
| `crew` | every crew member, Leo included | astronaut app | only their own entries, their basic daily summary, their medicines, cabin conditions, and who has an open emergency. **Not** the detailed health analyses |
| `medical_officer` | Leo (`c2`) only | medical officer platform | every crew member's health analyses and medicine data, and approvals. **Never** the journal or the companion |
| `earth` | the specialist on Earth (simulated) | Earth console | cabin conditions, requests waiting for Earth, and (wave 2) reports sent to Earth |

Leo approves his own requests too: there are two approval routes, the medical officer, or Earth for
controlled medicines (agreed terms, 15 Nov). The medical officer can also take any medicine from the
cabinet (section 8).

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
committed), calls `tick` every 5 seconds, and serves the pages, `shared/contract/contract.js`, and
petros's `demo-data/` folder at `/demo-data/` (read-only: the measurement guides and the workout
heart-rate replay). At start, a module whose store is empty gets `reset`.

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

Paths are after `/api/health`. The astronaut gets only their own check-ins, `GET /today` and
their own workouts; every analysis is for the medical officer (see "Crew and roles"). A crew
member, Leo included, who calls an analysis path as `crew` gets `wrong_role`.

| Method and path | Who | Send | Get back |
|---|---|---|---|
| `POST /check-ins` | crew | the check-in below | 201 `{ checkIn, today }`; `already_done` if this mission day already has one |
| `GET /today` | crew (own) | | `Today`, below: the basic daily summary for the astronaut's Home |
| `GET /daily?crewId=c4` | medical_officer | | `Daily`, below |
| `GET /history?crewId=c4&days=14` | medical_officer | | `{ crewId, baseline: [CheckIn], checkIns: [CheckIn] }`, oldest first. `days` is 1–60 |
| `GET /crew` | medical_officer | | `{ crew: [{ crewId, checkedInToday, status, changed: ["sleepHours"] }] }` for all five |
| `POST /workouts` | crew | the workout below | wave 2. 201 `{ workout }` |
| `GET /workouts?crewId=&days=7` | crew (own), medical_officer | | wave 2. `{ workouts: [...] }`, oldest first |
| `GET /weekly?crewId=c4` | medical_officer | | later: this week against last week, per measure. angelos adds the exact shape here |

A check-in sends any of these fields (at least one, nothing else):

```json
{ "sleepHours": 4.6, "restingHeartRateBpm": 63, "mood": 6, "stress": 4, "fatigue": 4,
  "spo2Pct": 98, "systolicMmHg": 118, "diastolicMmHg": 76, "temperatureC": 36.8 }
```

The server adds `id`, `crewId`, `recordedAt` (from `ctx.now()`) and `missionDay`; that is a
`CheckIn`. Only the five `COMPARED_MEASURES` are compared. The others are stored and shown.

`Today`, for the astronaut:

```json
{ "crewId": "c4", "missionDay": 42, "checkedInToday": true, "checkIn": { "id": "chk_…", "sleepHours": 4.6 } }
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
    { "measure": "sleepHours", "today": 4.6, "normal": 6.8, "limit": 1.5,
      "changed": true, "direction": "lower", "daysInARow": 3 }
  ],
  "gaps": [],
  "message": "1 measure differs from this crew member's normal. This is not a diagnosis.",
  "limitations": ["Demo comparison rules, not medical limits."]
}
```

- `measures` always has the five `COMPARED_MEASURES`, in that order. When `today` or `normal` is
  `null`, `changed` is `false` and `gaps` says why.
- `direction` is `higher`, `lower` or `null`. `daysInARow` counts mission days in a row changed
  the same way, ending today.
- `status` is `changes_found`, `no_changes`, `not_enough_data`, or `no_check_in_today` (then every
  `today` is `null`).
- Events: `health.check-in-saved`, `health.workout-saved`.
- `reset` loads petros's `demo-data/health.json`. Until it exists, use your own file in the same shape.

A workout (wave 2) is a record of the crew member's own activity, saved by the workout screen when
they press Stop. It is never compared with the resting normal, and workout heart rates never go
into `restingHeartRateBpm`.

```json
{ "kind": "push-ups", "startedAt": "2026-11-14T07:40:00.000Z", "endedAt": "2026-11-14T07:41:30.000Z",
  "reps": 25, "avgHeartRateBpm": 128, "peakHeartRateBpm": 145, "recoveryHeartRateBpm": 102,
  "heartRateSource": "replayed: PhysioNet Wearable Device Dataset (recorded on Earth)" }
```

The server adds `id`, `crewId` and `missionDay`. `recoveryHeartRateBpm` is one minute after Stop,
and may be `null`. `heartRateSource` says where the numbers came from, so a replay is never shown
as a live reading.

## 7. mind (angelos, wave 2)

Journal and companion. **Private:** only the author can call these, as `crew`. Not the medical
officer, not Earth, never in a report or an event. Psychologist access (Tommy, Q11) comes later,
with its own role.

| Method and path | Who | Send | Get back |
|---|---|---|---|
| `POST /journal` | crew | `{ "text": "…" }`, up to 5,000 characters | 201 `{ entry }` |
| `GET /journal?days=14` | crew | | `{ entries: [...] }`, own only |
| `POST /companion` | crew | `{ "message": "…", "context": { "today": {} } }` | `{ reply, links: [{ "screen": "checkin" }] }` |

Modules don't call each other, so the page sends only the current author’s `today` result as `context`. For the offline support demo,
Tommy has chosen Potest’s health-context tool: the Mind connection may read the current author’s
labelled canonical Petros fixture and use Angelos’s pure comparison functions to choose support
suggestions. It must not return historical values, baseline numbers, comparison results or streak
counts to the astronaut. This is synthetic demo context, not a read of the medical platform’s
stored clinical history. Journal content is not read by this route. Broader access to actual
clinical history, journal context, external models and the final module owner remain to be agreed.
The connection implementation and this clarification need teammate review before merging.

For the demo, fixed replies from a script are enough (scene D: an offer to write about it, or to
talk to someone). Support requests to the psychologist on Earth come later, with the psychologist role.
How the companion answers (fixed rules or a language model) is angelos's choice. An online model
needs internet at the venue and a key that is never committed.

## 8. meds (dadis2)

Reuse the rules and tests from `people/dadis2/inventory/` (tiers, safety checks, suggestions,
grants, due doses). What changes from the prototype:

- No screens: the pages draw the lockers from `GET /lockers`.
- State lives in `ctx.store`, not `localStorage`. Time comes from `ctx.now()`, not the device clock.
- Crew are `c1`–`c5`. `c2` is the only medical officer, with no backup, and approves their own
  requests too; only controlled medicines go to Earth.
- Symptom severity is 1–10, and symptom codes come from `SYMPTOMS`. Tiers are `MED_TIERS`.
- Each crew member has a medical profile with their allergies. Demo start: `c4` is allergic to
  NSAIDs; nobody else has a known allergy (see the demo cases).
- Points, XP and badges stay out (Tommy deferred them).
- Before suggesting anything, a page may ask about a related red-flag symptom (for a headache:
  `neuro-headache`). A yes is reported as that code, so the report comes back with `redFlag: true`
  and no suggestions.

Paths are after `/api/meds`.

| Method and path | Who | Send | Get back |
|---|---|---|---|
| `POST /symptom-reports` | crew | `{ symptoms: [{ code, severity }], note, vitals }` | 201 `{ report, redFlag, advice, suggestions, blocked }` |
| `GET /symptom-reports?crewId=&days=7` | crew (own), medical_officer | | `{ reports: [...] }` |
| `GET /profile?crewId=` | crew (own), medical_officer | | `{ profile }` |
| `POST /allergies` | crew (own, `suspected` only), medical_officer (anyone) | `{ crewId, substance, status, note }`, `status` is `suspected`, `confirmed` or `removed` | `{ profile }` |
| `GET /lockers` | crew, medical_officer | | `{ lockers: [...] }`, as seen by this person; for the medical officer every bin is open |
| `POST /collections` | crew; medical_officer | crew: `{ itemId, units, reportId }` for self-care; `{ grantId }` for a grant's due dose; or, wave 2, `{ emergencyId, itemId, units, overrideAllergy }` for an emergency release. medical_officer: `{ itemId, units, patientId, overrideAllergy }`, any medicine or supply for any crew member, with no further approval | 201 `{ collection }`; `needs_approval`, `not_due`, `already_done` |
| `POST /collections/:id/scan` | crew (own), medical_officer (own) | `{ compartmentId, skipScan }`; `skipScan: true` only in an emergency | `{ collection }`; `status` is `complete` once every box is scanned |
| `DELETE /collections/:id` | crew (own), medical_officer (own) | | `{ collection }` with `status: "cancelled"` |
| `POST /requests` | crew | `{ itemId, reportId, note }`; `note` is the reason, required unless the medicine is self-care | 201 `{ request }`; `invalid_field` without a reason |
| `GET /requests?crewId=&status=` | crew (own), medical_officer, earth (`waiting_earth` only) | | `{ requests: [...] }` |
| `POST /requests/:id/decision` | medical_officer; earth for `waiting_earth` | `{ decision, units, perDay, days, note }`, `decision` is `approve` or `deny` | `{ request, grant }`; `needs_earth` |
| `GET /grants?crewId=` | crew (own), medical_officer | | `{ grants: [...] }` |
| `POST /grants/import` | crew | `{ code }`, typed or scanned from Earth | 201 `{ grant }`; `invalid_code`, `not_your_data`, `already_done` |
| `GET /doses?crewId=&days=7` | crew (own), medical_officer | | `{ doses: [...] }` |
| `POST /doses/:id/follow-up` | crew (own) | `{ helped: true }` | `{ dose }` |
| `POST /emergencies` | crew (for **any** crew member) | `{ patientId, reason, vitals }`; `reason` is optional | wave 2. 201 `{ emergency }` |
| `GET /emergencies?status=open` | crew, medical_officer | | wave 2. `{ emergencies: [...] }`; crew get only `id`, `patientId`, `raisedAt` and `status` |
| `POST /emergencies/:id/paperwork` | medical_officer | `{ note }` | wave 2. `{ emergency }` with `status: "closed"` |
| `GET /stock` | medical_officer | | wave 2. `{ items: [{ itemId, name, tier, units, reserve, belowReserve, nextExpiry }] }` |
| `POST /grants/code` | earth | `{ crewId, items }` | later. `{ code }` |

`note`, `vitals`, `reportId`, `units` and `overrideAllergy` may be `null`, except a request's `note`
(its reason), which is required unless the medicine is self-care. An emergency's `reason` may be
`null` too. `vitals` uses the `MEASUREMENTS` field names.

```json
"report":     { "id": "sym_…", "crewId": "c4", "reportedAt": "…", "missionDay": 42,
                "symptoms": [{ "code": "headache", "severity": 6 }], "note": null,
                "vitals": { "temperatureC": 36.9, "spo2Pct": 98 } }
"suggestion": { "itemId": "acetaminophen-325", "name": "Acetaminophen 325 mg", "units": 2,
                "approval": "none", "why": "For your headache" }
"blocked":    [{ "itemId": "ibuprofen-400", "name": "Ibuprofen 400 mg", "why": "Allergy: NSAIDs" }]
"profile":    { "crewId": "c4", "conditions": [],
                "allergies": [{ "substance": "NSAID", "status": "confirmed", "since": "…", "note": null }] }
"emergency":  { "id": "emg_…", "patientId": "c5", "raisedBy": "c5", "raisedAt": "…",
                "reason": "Lips swelling after a new food", "vitals": { "restingHeartRateBpm": 125, "spo2Pct": 91 },
                "status": "open", "paperworkDueAt": "…", "paperworkNote": null,
                "released": [{ "itemId": "…", "units": 1, "at": "…", "scanSkipped": true,
                               "allergyOverridden": false }] }
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
  are `self-care`, `grant`, `emergency` or `medical-officer`. A collection also has `patientId`:
  the person it's for, who may differ from the one collecting (`crewId`). The dose is logged for
  the patient.
- `grant.issuer` is `c2` or `EARTH`. `grant.verification` is `onboard-officer` (approved by Leo on
  the medical officer platform) or `simulated` (a code from Earth; the sender isn't verified yet).
- In `lockers`, `locked` means this person can't take it without approval, and `open` means it is
  part of their open collection right now. For the medical officer nothing is locked, except an
  empty bin.
- The medical officer's route (agreed terms, 15 Nov): from the medical officer platform, the medical
  officer takes any medicine or supply for any crew member, with no further approval. It's logged as
  `source: "medical-officer"`, with the patient and the medical officer as the collector.
- Collecting is the dose (dadis2's rule): one scanned box is one dose, recorded once. A grant
  never releases more than the dose that is due now.
- `blocked` lists items the person may not take, with the reason, so the page can show "blocked"
  instead of hiding them. Items matching a `suspected` or `confirmed` allergy are always blocked,
  except in an emergency, or when the medical officer takes them, with `overrideAllergy: true` (the
  "give anyway" step), which is logged.
- `substance` uses dadis2's ingredient or class names (`NSAID`, `penicillin`). Anything else is
  stored and shown but blocks nothing.
- Emergency (Tommy, Q15): any crew member can raise one, for anyone, without approval. Only the
  emergency items are released, a scan may be skipped, and every release is logged. The reason is
  optional, because there may be no time to type. Paperwork is due 2 hours after `raisedAt`, and
  only the medical officer closes it. Exact rules beyond the demo are still open.
- Events: `meds.symptom-reported`, `meds.request-created`, `meds.request-decided`,
  `meds.grant-added`, `meds.collection-opened`, `meds.dose-collected`, `meds.collection-closed`,
  `meds.allergy-changed`, `meds.emergency-raised` (every open page shows the alarm),
  `meds.emergency-updated`.

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

- Wave 1 metrics: `co2` (ppm), `temperature` (°C), `humidity` (%). Wave 2: `radiation` (µGy/h),
  one real reading from Curiosity's cruise to Mars (cruise day 12, 14–18 µGy/h), with its own
  source label and `kind: "historical"`. There is no radiation storm in the demo.
- `state` is `normal`, `warning`, `danger` or `no-reading` (then `value` is `null`). A `null` in
  `points` is a gap: the graph draws a break.
- `kind` is `historical` or `synthetic`. Always say which, and never present a replay as live.
- How mission time maps to source time is your choice, but it must depend only on mission time,
  so a clock jump or a restart gives the same readings.
- Demo story: the real RR-9 CO₂ rise of 15–17 September 2018. CO₂ climbs on days 40 and 41, is
  above Warning from the evening of day 41 through the night (Danger for about two hours), and has
  recovered by 07:00 on day 42. [The demo cases](../../people/zt/demo-cases.md) suggest a mapping
  (17 Sep 16:45 = day 42, 07:00) and list the stretches not to replay (flat fill values). The final
  mapping is potest's choice.
- `tick` emits `env.alert-opened` and `env.alert-recovered`, once each, as mission time passes them.

## 10. demo data (petros)

Synthetic, labelled, and in this contract's formats, so modules can load them on reset. **The
values to use are in [the demo cases](../../people/zt/demo-cases.md)**, one table per crew member.

- `health.json`: per crew member, one check-in per mission day for days 29–41 (29–35 are the
  baseline, 36–41 the recent days). Day 42 stays empty: it happens live in the demo.

  ```json
  { "contractVersion": 1, "kind": "synthetic",
    "crew": { "c4": { "story": "Known NSAID allergy. Three short nights and a headache, says he's fine.",
      "checkIns": [{ "missionDay": 29, "time": "07:30", "sleepHours": 6.9,
                     "restingHeartRateBpm": 58, "mood": 7, "stress": 3, "fatigue": 3,
                     "spo2Pct": 98, "systolicMmHg": 118, "diastolicMmHg": 76,
                     "temperatureC": 36.7 }] } } }
  ```

  A missing value is `null`. `c3` has gaps in resting heart rate (days 39 and 41), not in mood, so
  the mood count isn't broken.
- `workout-heart-rate.json` (wave 2): the heart rate the workout screen replays.

  ```json
  { "kind": "historical", "source": "PhysioNet Wearable Device Dataset v1.0.1, recorded on Earth",
    "points": [[0, 72], [5, 80], [10, 95]] }
  ```

  `points` are `[seconds from Start, bpm]`. If no real recording is used, `kind` is `synthetic` and
  `source` says what it was shaped on (for example the Apollo-Soyuz exercise rates in the vitals CSV).
- `measurement-guides.json`: the check-in's step-by-step instructions for resting heart rate,
  blood pressure, blood oxygen and temperature.

  ```json
  [{ "id": "blood-pressure", "title": "Blood pressure", "measures": ["systolicMmHg", "diastolicMmHg"],
     "steps": ["Sit still for 5 minutes.", "…"], "sources": ["https://…"] }]
  ```
- `stories.md`: the demo story per crew member (health pattern, symptoms, cabin events,
  medicines), so health, meds and env all tell the same story.

## 11. Reports and the Earth link (wave 2, potest proposed)

An outline. potest is the proposed owner (Tommy's POT-2), to confirm at the table. Whoever takes it
writes the exact paths and shapes here, as a module like the others.

- The medical officer creates a case report on the medical officer platform. The page puts it
  together from health, meds and env (modules don't call each other) and sends it to `/api/reports`.
- The astronaut never sees a report's content (Tommy, Q13), and the journal is never in it.
- The Earth link is a demo switch, up or down. While it is down, reports wait as `queued`, then go
  `sent` and `received`. Each report is delivered once.
- A message takes 12 minutes each way, in mission time (the demo can jump the clock). The
  emergency's "Sent to Earth, arrives in 12 min" label uses the same delay.
- Earth replies on the Earth console: a note, a grant code for `POST /api/meds/grants/import`, or both.

## 12. Wave 1 is done when this works

1. Tomas (`c4`) logs in on the astronaut app. Home shows his body figure and the readiness placeholder.
2. He checks in: slept 4.6 h, mood 6, stress 4, fatigue 4 ("I'm fine"). His Home shows today's
   check-in as done. On the medical officer platform, Leo sees Tomas's analysis: sleep under his
   normal of 6.8 h, 3 days in a row. Tomas calling `GET /api/health/daily` himself gets `wrong_role`.
3. He reports a headache, severity 5. Acetaminophen is offered; ibuprofen shows as blocked
   (allergy: NSAIDs). He opens the locker and scans the box. The dose log shows it, and later asks
   "Did it help?".
4. He asks for a prescription medicine. Within a few seconds Leo (`c2`), on the medical officer
   platform in another tab, sees the request, together with Tomas's daily result, his symptom and
   the overnight CO₂ alert. Leo approves.
5. Tomas sees the grant and collects only the dose that is due. Trying again gives `already_done`.
6. "Reset demo" puts everything back.

**Wave 2 is done when** the whole 7-minute demo in [the demo cases](../../people/zt/demo-cases.md)
runs end to end, scenes A to E.

## 13. Still open

- Readiness and task scores: Tommy and zt (Q16). A placeholder until then.
- Which health fields the astronaut sees on Home (`Today`): Tommy and zt. Ask Tommy whether one
  plain line (for example "sleep lower than usual") counts as a basic Home field.
- Tommy authorized Pulsars on 15 November; see the separately reviewed [pulsars.md](pulsars.md) proposal. Readiness/clinical scores remain separate and unapproved.
- New crew names: the team picks them; the contract's names stand until then.
- Psychologist role, journal access and support requests (Q11): later.
- Emergency rules beyond the demo (Q15): with dadis2.
- Confirming potest as the owner of reports and the Earth link.
- Wording of the ends of the 1–10 scales (petros, PET-2).

## 14. Changing this contract

`shared/contract/` is protected like `shared/PLAN.md`: change it only through a pull request that
a teammate approves, and tell the owners of the pieces it touches. A change that breaks existing
modules raises `CONTRACT_VERSION`. Don't work around the contract inside your module. If it doesn't
fit, ask zt.
