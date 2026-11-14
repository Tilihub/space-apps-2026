# Proposed next implementation tasks for Tommy to assign

Prepared 2026-11-14 from the published work listed below, including zt's new app overview. This is Tommy's personal handoff proposal, not an agreed team split or an edit to shared/PLAN.md. No messages were sent to teammates and no other member's files were changed.

## Review snapshot and verification

| Owner | Reviewed version | What exists | Relevant gap |
|---|---|---|---|
| angelos | `35a3f60`, PR #25 open at review | Daily comparison, fixed personal baseline, SQLite check-ins, two-window weekly report, JSON report output | Terminal entry point; no application API or conversation model; one synthetic astronaut per database; no journal/psychologist access layer |
| dadis2 | `5a7febb`, PR #34 open at review | Symptom input bridge, medicine/locker screen, CMO approvals, logs, Earth plan import via typed code or QR detector, per-user checks | Prescription import still leads to per-item retrieval; no batch compartment collection, QR image generator, verified issuer, or physical lock controller |
| potest | `abf8435`, environment module present on main | Offline environment replay, alert transitions, CSV download, JSON incident snapshot | Snapshot currently downloads a file; no documented app-facing snapshot/event bridge or transmission queue |
| petros | `f05971a`, PR #36 open at review | Extensive measurement/dataset/evidence notes, published vitals CSV, proposed wellbeing fields and offline Mars workflow | Needs a selected integration-ready data package and final field mapping; journal-to-assistant exclusion in his proposal predates Tommy's Q12 answer |
| zt | `3d2bcec`, overview merged in PR #37 | Draft dashboard, sections, demo format, integration role and open questions | Overview is a proposal; no joined app under integration/ or finished application under final/ at review |

Reviewed current statuses, readmes, proposed interfaces, and relevant source paths. Ran Angelos's existing 31 tests against an isolated temporary copy of his latest branch: all passed. No teammate database was used. Frontend conclusions are from source review; camera QR scanning and real locks were not tested. The research papers were not independently re-audited in this pass.

## First shared action: agree the connection format

Suggested coordinator: zt, with each module owner confirming their own inputs/outputs and Tommy confirming intended behavior. Agree before building adapters:

- One crew list/ID mapping: health currently uses `astronaut_id`; inventory uses `crewId` values such as `c4`.
- One mission clock and explicit source timestamps. Historical 2018/2017/other mission replay clocks must not silently become simultaneous Mars crew observations.
- Field names, units, missing-value handling, and self-report anchors/scale. Existing health inputs use 0–10; adopting or changing that is a team decision.
- Symptom report shape/codes, health report shape, environment snapshot shape, inventory events, and permitted audiences.
- Human journal access: author and psychologist only. The author's assistant can process it, but ordinary medical reports and other crew views must not expose it or private derived details.

Expected output: a small versioned example packet and short connection contract accepted by the relevant owners. Put actual connections in integration/ with their README. Any change to the protected common plan needs a teammate-approved PR. This document does not authorize editing another person's folder.

## Angelos: connect the working health core, then the basic companion

### Do next

Expose the existing history, daily comparison, check-in submission, and weekly report to zt through an agreed callable/API adapter. Reuse the existing functions; do not rebuild weekly medians or change the fixed baseline as a new task. Support at least two demo crew identities without their histories or references mixing; separate stores per demo identity are acceptable if agreed.

Acceptance: zt can save a check-in from the app, reload the same user's history, and request the existing report as structured data. A second demo identity cannot read or change the first one's history/reference. Existing checks still pass. Handle missing values explicitly.

### Then, once that connection works

Prepare the minimum companion behavior using the authorized user's health findings, history, and journal context: explaining available changes, helping enter a symptom, pointing to the right section, and offering the user a path to their psychologist. Preserve context across the agreed local session/history and show unavailable information honestly. It must not issue prescriptions, grant medicine access, or send private journal details to another role.

Add the journal persistence/context interface needed by that behavior, coordinated with zt's Mind UI. Define inputs/outputs and the model/runtime approach with zt; no trained neural model or fully offline conversation currently exists. Do not turn this into an open-ended new model-training project before the app-facing connection works. Respect Angelos's stated wish to understand the code and agree any simplification with him.

## dadis2: finish the prescription-to-compartments flow

### Do next

Extend the current multi-medicine Earth plan into one authorized collection operation: a single code/QR selects and highlights all and only the prescribed compartments together. Return their locker/shelf/bin IDs for the main app and any future hardware bridge. Track collection per compartment/item without confusing retrieval with logging every dose of a multi-day prescription as already taken.

Acceptance: a sample prescription covering two bins activates both in one operation; an unrelated third bin remains unavailable. The correct user can collect the authorized items and each collection is recorded once. A wrong-user/invalid/reimported grant is handled clearly, preserving existing checks. Clarify what counts as collected versus later consumed with Tommy and zt.

### Then, once batch collection works

Provide the ground-side prescription code and QR-image output, plus a short contract zt can use on the Earth clinician screen. Separate the existing typo checksum from verification of an authorized clinician. Define grant identity, recipient, scope, validity/reuse behavior and verification; if issuer verification remains simulated, label it explicitly. Keep test credentials/data synthetic.

Publish regression checks for batch scope and patient binding. Camera scanning needs verification on a supported target device, with the typed-code fallback retained. Real locks are a later hardware connection unless the team explicitly supplies them. Freeze cosmetic/game additions for now; Tommy deferred gamification.

## Potest: make environment context usable by the app

### Do next

Expose the existing snapshot as a callable/event/message output rather than only downloading JSON. Provide a new-alert/recovery signal for the report assembler, not a repeated report on every render or replay tick. Agree the event identity and clock with zt.

Acceptance: a parent app can obtain source, data type, source time, mission/replay time mapping, values, units, availability and alert state. Two readings confirming an excursion produce one logical event; recovery, stale readings and replay restarts have explicit behavior. Historical and synthetic data remain distinguishable.

### If the environment bridge is covered

Take the otherwise unowned report-delivery queue, coordinated with zt: persist an authorized report while the simulated Earth link is down, send it after reconnection, track receipt, and avoid duplicate delivery using a stable report ID. This component transports reports; it does not define clinical content or choose who may see journals.

Acceptance: offline -> queued -> sent -> receipt confirmed are distinct states; an app restart preserves the queue, and retry does not create a second logical report. A clinical reply is a separate linked event. Earth transmission/receipt may be simulated and must be labelled as such.

## Petros: turn the existing research into a bounded demo package

### Do next

Select the fields and data the first demo actually uses, with a short mapping file/table: field name, unit or response anchors, collection method, timestamp/cadence, missing-value meaning, source, and real/historical/synthetic status. Include concrete scenario fixtures using the agreed crew IDs and mission clock for the cases Tommy and zt choose.

Reuse the research and offline proposal already written. Do not add another broad literature survey as the default next task. Keep individual records, cohort summaries, exercise readings, resting readings and spacecraft instruments distinct; the 47-row historical CSV is not automatically a single astronaut's continuous baseline. Use labelled synthetic longitudinal records where the needed real person-level series is unavailable.

Acceptance: Angelos and zt can load the selected package and identify every field's meaning/provenance; no missing readings become zeros, and no historical group mean is presented as a live individual reading.

### Then, where support is still unowned

Turn the existing wellbeing-field proposals into an implementation brief for the daily form: exact wording, recall period, anchors/direction, required versus optional, and a private note field. Confirm scales with Tommy and Angelos. This is a product check-in, not a newly validated psychometric test. If an established questionnaire is chosen, preserve its stated wording/scoring/recall constraints and source it.

Update the PR #36 proposal to reflect Tommy's Q11–Q12 clarification: the author and psychologist are the human journal readers, and the author's chatbot is allowed to process those thoughts. Ordinary medical reports must still omit them for other audiences. Do not silently share them with the onboard support role.

## Zisis (zt): build one joined path from the new overview

### Do next

Use the overview already written to choose the implementation boundary and agree the small module contracts above. Start a working integration connection with its README, compose existing modules, and build the daily home summary plus persistent clickable companion. This chat supplies concepts only; it is not a second UI implementation.

First acceptance path: select/sign in as a demo crew member -> submit a check-in and symptom -> show that person's health result plus timestamped cabin context -> create a medical report -> queue/send it -> show a clinician reply -> import the prescribed code -> indicate only its authorized bins. Add a private journal example proving that other human roles and the ordinary report cannot see it. The live-demo story and detailed cases remain Tommy/zt decisions.

### Decide these differences with Tommy before treating the overview as final

- Tommy wants a Create report action and manual sending; the overview proposes a case summary hidden from the astronaut. Agree the user's visibility/preview and recipient feedback.
- Tommy requires a basic companion in the first demo and defers points/customization. Do not defer the companion together with the game system.
- The entry brief currently requests username/password and registration; the overview proposes face scanning built last. Agree the first-demo access flow. A staged scan/demo identity picker must not be presented as working biometric authentication.
- A readiness score and red/blue body figure need a transparent definition. Angelos's existing unvalidated trend comparisons do not already provide a validated readiness score or medical clearance. Decide the display/meaning with Tommy and the relevant owner rather than silently inventing a score.

ZT owns composition, app navigation, report recipient/views, and permission enforcement at the joined boundary. Angelos supplies health/history/report data and companion context; Potest supplies environment context and, if accepted, transport; dadis2 supplies the prescription/compartment contract; Petros supplies data and form definitions. This is the proposed division to confirm, not a team decision.

## Tommy: decisions and handoff still needed

- Review zt's overview differences above and agree the smallest end-to-end demo case.
- Confirm the task owners and backups before entering the agreed split in shared/PLAN.md through the required review process.
- Agree report cadence/window/triggers, approval category rules, summary fields and check-in scales. Do not pick clinical thresholds from these task notes.
- Assign the project page/slides/live-demo rehearsal owner. The submission checklist exists but its content and ownership are still incomplete; allocating this is part of the project work, not a reason to start extra UI features.

## Suggested work order

1. Agree IDs, clock, minimal packets and visibility decisions; let zt start the shell in parallel with owner adapters.
2. Angelos: health adapter; dadis2: batch prescription collection; Potest: snapshot/event bridge; Petros: selected fixtures/field mapping.
3. Join that single path in integration/ and demonstrate it using the same fixture identities and clock.
4. Add the basic journal/companion and report-delivery queue from the secondary tasks, with their access boundaries.
5. Rehearse the live demo and complete submission material before adding gamification, 3D inventory, advanced biometrics or more data sources.
