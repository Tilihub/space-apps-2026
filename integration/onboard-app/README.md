# Connected onboard demo

One Node.js 24 server, one mission clock, durable module stores, and zt's UI with the 3D body.
Tommy requested the functional integration on 14 November, before further visual design work.
This connection now runs actual module requests instead of the UI's original fake-data block.

## What it joins

| Piece | Source | Current connection |
|---|---|---|
| Sessions, permissions, mission clock, events, storage, HTTP | zt, this folder | Existing core, unchanged |
| Health, clinical history/weekly comparisons, workout records | `people/angelos/health/` | Imported directly; real API calls from the pages |
| Symptoms, allergies, inventory, grants, dose schedules, dispenser batches, emergencies, stock | `people/dadis2/meds/` | Imported directly; real API calls, including Earth decisions |
| QR rendering | dadis2's `inventory/qr.js` and vendored MIT `vendor/qrcode.js` | Served from the originals, no additional dependencies |
| Daily training and live session controller | `people/petros_the_space_larper/demo-data/` | Imported by the browser; completed stage summaries go to health |
| Companion | Potest's `companion.js` validation, `companion-client.js`, `chat.mjs` and `integration/crew-assistant/replies.mjs` | Original helpers imported unchanged; `adapters/companion-support.js` joins their support replies to Angelos's pure comparison rules and the current author's Petros fixture |
| Private journal | `adapters/mind.js` | Connection-owned implementation of contract section 7, sharing the mind module with the imported companion route |
| Cabin archive and alert rules | Potest's `environmental-graphs/data/series.js` and `alerts.js` | Originals read directly by `adapters/environment.js`; one deterministic server replay for all tabs |
| Reports and Earth transport | `adapters/reports.js` | First connection implementation of section 11's outline; ownership/interface handoff still needs team review |
| UI appearance | `zt/ui-look` at `dace837` | Copied HTML/CSS/icon shell; original fake-data controller replaced with `pages/app.js` |
| Interactive 3D body | `zt/body-3d` at `0e8fbff` | Copied scene with a small same-origin iframe message bridge; original mesh credits retained (Blender Studio Human Base Meshes, CC0) |

The original teammate folders have not been edited by this connection. Owner modules and rules
remain the source of truth. Adapters belong to the connection and can be replaced by the future
owner modules without a second server. PR #55's unchanged files retain their original Git history.
This does not approve that PR or authorize reads of stored clinical history. The narrow offline
fixture-context integration requested by Tommy is described below.

## Run and test

From the repo root, with Node 24 on PATH:

```bash
node integration/onboard-app/start.js
```

Open the printed URL (default `http://localhost:8000/`). No package installation is required.
Use `PORT=8010` for another port. `PULSE_DATA_DIR=/absolute/path` selects a separate demo store;
otherwise ignored `integration/onboard-app/data/` is used. Stop with Ctrl+C. The clock pauses
while the process is stopped. `/demo/` retains zt's plain core controls.

```bash
npm test
```

The root suite includes `connected.test.js`: real HTTP, the production registry, role separation,
private journal and restart persistence, same-credential two-item collection and next dose,
real cabin recovery, offline report queuing/12-minute delivery/reply, and Petros's controller
saving a synthetic workout to health. Potest's older Python comparison experiment also needs
Python 3 on PATH for its own tests. No private database or API key is needed.

## Try the connected flows

1. Log in as Tomas (`c4`). Save today's check-in: 4.6 h sleep, 63 resting bpm, mood 6, stress 4,
   fatigue 4. Other measurements may remain missing. Today's saved values survive reload.
2. Report a headache, severity 5. The module suggests acetaminophen and blocks NSAIDs. In Med bay,
   expand the cabinet, choose an allowed self-care quantity and confirm each dispensed item.
   Stock and the collected-dose log change only at confirmation. Follow-up is separate.
3. Request a prescription item from Locker 2. In a second tab log in as Medical officer Leo,
   review requests and approve/deny the course. Controlled items and Leo's own prescriptions
   require the Earth role. Switch back and refresh; collect only the currently due quantities.
4. In the medical platform select a patient, inspect the real clinical analysis/history and
   create a report. Astronaut sessions cannot fetch these contents. Take the simulated link
   down to queue it, restore the link, then advance 12 mission minutes to deliver to Earth.
5. In a third tab use Earth specialist. Open the delivered report, reply, and optionally generate
   a one- or two-item RX2 credential using the original encoder. A return reply takes another
   12 mission minutes. Give its code/QR to the patient. Entering it again finds the same course;
   collecting again is refused until the next dose. No 15-minute access timer is added.
6. Fitness shows the actual flywheel/rowing week. Choose the labelled synthetic stage demo for
   a complete pulse-recording test. Start, complete warm-up, advance a minute, record push-up reps,
   complete the exercise, advance a minute and save with recovery. Do not wait beyond the finite
   replay if you want a recovery reading. Saved summaries survive reload; active checklists do not.
7. Mind saves a private journal entry. Switch to another crew member or clinical role: the entry
   is inaccessible. The floating companion and full Mind chat share the conversation. The client fetches the current author's own latest check-in on
   each turn; the server may use that author's labelled synthetic history for support suggestions. Medical officer and Earth sessions cannot call the mind routes.
8. Any crew member can raise an emergency for a crewmate and release only emergency-tier items.
   Confirm dispensing, then inspect the patient's dose log/stock and close paperwork as Leo.

Clock controls affect every tab. Reset is explicitly confirmed in the UI and resets all module
stores to the same day-42 fixture; it is not a per-user action. Do not reset someone else's demo
store while they are using it. Initial stores load Petros's synthetic historical data; no today
check-in is fabricated. Forms keep unsaved inputs on request failures; old-session responses are
discarded. A pending collection is remembered only in that tab and every confirmation is checked
again by the backend. Polling updates metadata; private journal text never enters events.

## Environment mapping

Cabin data is the original RR-9 historical series, using Potest's unchanged two-reading rules.
The adapter maps **17 September 2018 16:48 UTC to mission day 42 07:00 UTC**, the actual confirmed
recovery sample (the earlier 16:45 suggestion puts confirmation three minutes late). It starts
alert analysis on 15 September, avoiding the early flat-fill interval. Historical alert output
retains both the latest level and `peakLevel`; the overnight event reaches Danger. This mapping
is connection-owned and ready for Potest's review, not a modification of the archive.

Radiation uses the original Curiosity cruise detector B on 8 December 2011, mapping its first
sample to mission day 42 midnight. Both sources are labelled historical replay, with original
source timestamps. Once a source ends, readings become unavailable; no artificial loop or storm
is introduced. Graphs retain gaps. No live sensor is claimed.

## Reports connection API

The contract currently specifies the workflow, not exact report fields. These routes are the
working proposal in this connection; agree the final owner/interface with zt and Potest before
promoting it to the protected shared contract.

| Route | Roles | Shape |
|---|---|---|
| `GET /api/reports` | medical officer, Earth | `{ reports }`; Earth sees delivered reports only; medical officer sees only delivered replies |
| `POST /api/reports` | medical officer | `{ crewId, note, health: { daily, history, weekly?, workouts? }, meds: { reports, doses, profile }, environment }` → `{ report }` |
| `GET /api/reports/link` | medical officer, Earth | `{ linkUp, delayMinutes: 12, simulated: true }` |
| `POST /api/reports/link` | medical officer, Earth | `{ linkUp: boolean }` |
| `POST /api/reports/:id/replies` | Earth | `{ note, code }`, at least one nonempty → `{ reply }` |
| `GET /api/reports/catalogue` | Earth | Public demo medicine labels/IDs only, no patient profile |
| `POST /api/reports/grants-code` | Earth | `{ crewId, items: [{ itemId, units, perDay, days }] }` → `{ code, verification: 'simulated', note }` |

Reports contain clinical history, symptoms, collected medicines/allergies, a cabin snapshot,
48-hour CO₂ history and cabin alerts. Journal/companion fields are rejected, and the reports
module never reads the mind store. Patient IDs in clinical rows are checked. Reports/replies
move queued → sent → received once per record, use the shared clock, and persist across restart.
No real network transmission or automatic clinical-report trigger is implemented. The generator
is a connection endpoint, not an unannounced addition to dadis2's `/api/meds` module.

## Remaining limits and handoff

- The companion is an offline context-aware support tool, not a trained LLM. It restores zt’s
  animated planet mascot and full Mind conversation. Sleep, stress/mood, missing home and
  follow-up use different responses; repeated turns progress through the source suggestions.
  Potest's Python comparison remains preserved. His pure reply helpers use the current author's
  canonical synthetic fixture and Angelos's pure comparison functions; historical values,
  reference numbers and streaks stay server-side. The current check-in is refreshed each turn.
  No stored clinical history or journal is fetched. The contract clarification awaits review.
- Psychologist login/private messaging is not built. Journal access is author-only until its
  separate role is agreed. Journal text is not sent to the current companion route.
- No live wearable is paired. Weekly sessions can be checked off, but without pulse samples
  the existing controller cannot save a numeric summary. The synthetic stage mode proves the
  full recording pipeline. Petros's adapter accepts a future real device source.
- Camera QR uses the browser's BarcodeDetector where available. Without it, paste the exact QR
  payload or type the equivalent code. QR rendering itself is local/offline via dadis2's library.
- The 3D viewer still loads Three.js from zt's original CDN import map and fonts from Google.
  Its first load needs network access; health/inventory/storage APIs have no external dependency.
- Hardware dispensing, signed Earth credentials, account registration and production security
  are not implemented. Demo identity/approval selection is intentionally simulated.
- Readiness scoring, crew-visible clinical trends, gamification and visual redesign are deferred.

## Companion and body review update

Tommy selected the offline health-context tool for now, after the older OpenAI-backed source was
found in history and no server API key was configured. No external model calls were added.
The original route still validates role, author, day, fields and scales. The adapter then uses
Potest’s original comparison/support templates, Angelos’s `dailyFor`/`referenceFor` and Petros’s
current canonical fixture. Only the current author’s fixture is selected, and historical clinical
numbers never appear in the reply. Fixture history is frozen demo seed data, not later saved
health history; it is not presented as a live clinical feed. Missing days stop the history signal.
Topic counters and the last reply are bounded in memory and reset with the demo; conversation
text is not written to disk and the journal is never read. This remains a limited offline tool.

The UI restores zt’s original animated planet artwork and chat bubbles in the floating companion
and Mind screen. Both views share replies and keep input on failed requests.
The female mesh’s torso is softened into smooth mannequin sections, with reduced surface sheen.
Reported symptoms affect only red pins/lines/labels; skin no longer turns red. Blue selection and
3D body-area picking remain available. Original source meshes and credits remain unchanged.
