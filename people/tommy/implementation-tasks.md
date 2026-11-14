# Tommy's implementation handoff to the team

Prepared 2026-11-14 from the published work listed below, including zt's new app overview. Tommy requested publication of this handoff so each teammate and their coding tool can read the corresponding task and know what to deliver. These are Tommy's requested next tasks; acceptance by other owners and changes to shared/PLAN.md remain team coordination. No messages were sent to teammates and no other member's files were changed.

## Latest confirmed inventory answers and contract review

**Current outcome:** Tommy explicitly instructed approval now; PR #49 has an APPROVED review at 76b2e09. The earlier request-changes round below is historical. QR/dispenser wording remains a follow-up, and extra Home indicators are deferred.

Read [contract-review.md](contract-review.md) first for the latest inventory requirements, independently checked #50/#51 deliveries, #52 case/fixture differences and per-owner compatibility review of PR #49. That proposed contract introduces new Node/JS module folders and server-side shared state; the old prototype/API connection tasks below are historical and are not direct plug-in instructions for it. Tommy selected correction before approval and a CHANGES_REQUESTED review is posted on #49. At 76b2e09 the analysis-visibility correction is resolved; the repeated-code/dispenser wording is still pending. Read the latest follow-up at the top of the review rather than treating its initial findings as current. PET-1/PET-2 are now available in #51; reuse/reconcile the package instead of assigning it from scratch. DAD-2 #53 (Earth code/QR/revocation tool) is now merged and browser checks pass 28/28; adapt it rather than rebuilding it. #52 stage cases are also merged as a personal draft, with the fixture differences recorded in the review. Preserve allergy blocking, equal QR/code handling without a 15-minute lifetime, reusable course credentials, batch/per-item confirmation and the prescribed versus permitted self-service quantity distinction.

## Lean inventory scope refresh

Read [inventory-scope-proposal.md](inventory-scope-proposal.md) before expanding DAD-2 or joining Med bay. Tommy/zt want a smaller user flow and configurable demo catalogue while reusing DAD-1. The supplied alternative has single-use/15-minute and single-compartment assumptions that must not override Tommy’s earlier reusable-course/batch decisions. Physical dispenser engineering and extreme misuse cases are outside the app demo. This is a scope proposal awaiting acceptance, not an instruction to rebuild or delete the existing module.

## Ecosystem review refresh — read first

Visibility follow-up: Tommy also excludes detailed personal-history/weekly-analysis views from the astronaut. zt/Angelos must replace the current crew-token report access with an agreed clinical-role contract; hiding UI alone is insufficient. Basic daily Home fields remain a separate decision. A metered pill dispenser is an investigated option in plan.md, not an assigned hardware build or adopted replacement for DAD-1.


See [ecosystem-review.md](ecosystem-review.md) for the latest frozen versions, observed prototypes, actual test results, connection gaps and proposed return-from-break order. ANG-1, DAD-1 and POT-1 are now available for integration review; the historical snapshot below is not a request to rebuild them. The personal weekly-analysis API is distinct from the proposed doctor-only clinical report to Earth.

## Latest requirements update — read before starting a task

Tommy's answers Q13–Q17 supersede the earlier alternatives below. See [the latest requirements section](plan.md).

| Owner | Apply this update |
|---|---|
| zt | Clinical case report content is hidden from the astronaut; manual creation/sending belongs to the onboard doctor. Wire the UI skeleton to real modules, with role enforcement. Readiness score remains a discussion item. New mood/stress/fatigue inputs use 1–10; sleep remains hours. |
| angelos | Coordinate the new 1–10 self-report contract with zt/Petros. Preserve old 0–10 data and fixed references; do not silently shift/relabel them. Version the scale and agree safe comparison/migration handling before implementing ANG-1 inputs. |
| dadis2 | A prescription QR/code is reusable throughout its valid course, but each due dose can be collected only within prescribed quantity/frequency and expiry. Repeated scans cannot multiply allowances. Batch-activate only the eligible prescribed bins. All crew can access the exceptional emergency path under an agreed protocol, not for routine bypass. |
| potest | POT-1 is now published in PR #40: integrate/review the existing bridge rather than rebuild it. Coordinate clock/event IDs with zt. If taking POT-2, preserve doctor-only manual clinical send, approved automatic routing, and report-content permissions. |
| petros | Align the wellbeing brief/fixtures to Tommy's 1–10 decision, explicitly labelling old 0–10 data and keeping instrument-specific scales separate. Retain journal privacy and permitted assistant context. |

The pending readiness definition, emergency eligibility details, reporting triggers/cadence and historical-scale transition remain open decisions. Current modules are not assumed to implement these new requirements yet.

Publication progress: `potest/environment-bridge` supplies a snapshot/subscription bridge; `zt/ui-skeleton` supplies a clickable fake-data layout; Angelos's latest status acknowledges ANG-1. A subsequent fetch also found `dadis2/prescription-grants`: DAD-1 is now published for review, with RX2 grants, due-dose batch compartments, collection-slot counters, expiry and an event contract. Review that implementation instead of rebuilding DAD-1; its owner reports 19 checks passed (not independently rerun here). Issuer verification remains explicitly simulated, shared clock/crew mapping remains pending, and QR-rescan routing/concurrent-device quotas still need integration checks. These supersede the corresponding older snapshot gaps, not their outstanding integration acceptance checks.

## Start here: teammates and coding tools

1. Read `AGENTS.md`, the current shared plan, everyone's current status, and [Tommy's product requirements](plan.md). Follow the repository's ownership, branch, approval, and publishing rules.
2. Find your folder name in the index below. Inspect your latest branch, working tree, and status before editing. This is a handoff, not an instruction to discard unfinished work.
3. Start with your **first task**. If it is already delivered, cite the branch/PR and check its acceptance conditions against the current requirements before moving to the follow-up task. Do not rebuild completed work from an old review snapshot.
4. Confirm the relevant connection format with zt and the affected module owner. While that is unresolved, provide a concrete input/output example and name the missing decision in your own status; do not silently establish incompatible IDs, units, permission rules or clocks.
5. Deliver the smallest working connection described in your task, a short input/output contract, run/check instructions and the relevant verification result. Stay in your own folder or an integration connection you own. This document grants no permission to edit another person's folder, approve their PR, or bypass protected-file review.
6. Update your own `status.md` after every finished step and include it in the same push. Record the task ID, result, branch/PR, dependencies, and the next action in its existing sections so both teammates and coding tools can follow progress.

### Task index

| Owner folder | First task | Follow-up after the first task is connected | Handoff goes to |
|---|---|---|---|
| `people/zt/` | **ZT-1:** agree minimal module contracts and build one joined demo path | Resolve the explicitly listed product decisions with Tommy while finishing app composition | Tommy and all module owners |
| `people/angelos/` | **ANG-1:** expose check-in/history/comparison/report data to the app, with separate crew histories | **ANG-2:** basic companion and authorized journal context | zt |
| `people/dadis2/` | **DAD-1:** one prescription grant activates all and only its authorized bins together | **DAD-2:** ground-side code/QR output and authorization contract | zt; symptom/report owner |
| `people/potest/` | **POT-1:** programmatic environmental snapshot and new-alert/recovery bridge | **POT-2:** persistent report-delivery queue, if that ownership is accepted and not already covered | zt; report assembler |
| `people/petros_the_space_larper/` | **PET-1:** selected, source-labelled demo fixtures and field mapping | **PET-2:** exact wellbeing-form brief and alignment of the older scope proposal | angelos and zt |

Each task's deliverable and acceptance conditions are in the matching owner section below. The follow-up column is a sequence, not a request to start everything at once. Technical choices listed as open still need agreement; Tommy's requirements are not evidence that a feature has already been built.

### Copy/paste prompt for a teammate's coding tool

Replace `<my-folder-name>` with `zt`, `angelos`, `dadis2`, `potest`, or `petros_the_space_larper`.

> Read AGENTS.md, the current shared/PLAN.md, the team statuses, people/tommy/plan.md, and people/tommy/implementation-tasks.md. My folder is people/<my-folder-name>/. Find my first task in the task index and read my full owner section. Inspect my latest working tree and branch before making changes; preserve my existing work. Work on that first task under AGENTS.md's ownership rules, reusing what is already complete. Provide the documented input/output example, a runnable handoff, appropriate checks and an updated status in the same push. Keep open contract/product decisions explicit and coordinate them with the named owners. Do not start unrelated features or treat this brief as permission to edit other members' files or override their instructions.

## Review snapshot and verification

| Owner | Reviewed version | What exists | Relevant gap |
|---|---|---|---|
| angelos | `35a3f60`, PR #25 open at review | Daily comparison, fixed personal baseline, SQLite check-ins, two-window weekly report, JSON report output | Terminal entry point; no application API or conversation model; one synthetic astronaut per database; no journal/psychologist access layer |
| dadis2 | `5a7febb`, PR #34 open at review | Symptom input bridge, medicine/locker screen, CMO approvals, logs, Earth plan import via typed code or QR detector, per-user checks | Prescription import still leads to per-item retrieval; no batch compartment collection, QR image generator, verified issuer, or physical lock controller |
| potest | `abf8435`, environment module present on main | Offline environment replay, alert transitions, CSV download, JSON incident snapshot | Snapshot currently downloads a file; no documented app-facing snapshot/event bridge or transmission queue |
| petros | `f05971a`, PR #36 open at review | Extensive measurement/dataset/evidence notes, published vitals CSV, proposed wellbeing fields and offline Mars workflow | Needs a selected integration-ready data package and final field mapping; journal-to-assistant exclusion in his proposal predates Tommy's Q12 answer |
| zt | `3d2bcec`, overview merged in PR #37 | Draft dashboard, sections, demo format, integration role and open questions | Overview is a proposal; no joined app under integration/ or finished application under final/ at review |

Reviewed current statuses, readmes, proposed interfaces, and relevant source paths. Ran Angelos's existing 31 tests against an isolated temporary copy at `35a3f60`: all passed. No teammate database was used. Frontend conclusions are from source review; camera QR scanning and real locks were not tested. The research papers were not independently re-audited in this pass.

Publication refresh: Angelos subsequently published reset/backup behavior at `80d86db`. His latest status reports 38 passing checks; those newer checks were not re-run in this handoff pass. Reset is existing work, not a new task here. Owners must compare this snapshot with their newest work before acting.

## First shared action: agree the connection format

Suggested coordinator: zt, with each module owner confirming their own inputs/outputs and Tommy confirming intended behavior. Agree before building adapters:

- One crew list/ID mapping: health currently uses `astronaut_id`; inventory uses `crewId` values such as `c4`.
- One mission clock and explicit source timestamps. Historical 2018/2017/other mission replay clocks must not silently become simultaneous Mars crew observations.
- Field names, units, missing-value handling, and self-report anchors/scale. Q17 sets new mood/stress/fatigue inputs to 1–10; existing health inputs/history use 0–10 and need an explicit transition strategy without silent remapping.
- Symptom report shape/codes, health report shape, environment snapshot shape, inventory events, and permitted audiences.
- Human journal access: author and psychologist only. The author's assistant can process it, but ordinary medical reports and other crew views must not expose it or private derived details.

Expected output: a small versioned example packet and short connection contract accepted by the relevant owners. Put actual connections in integration/ with their README. Any change to the protected common plan needs a teammate-approved PR. This document does not authorize editing another person's folder.

## Angelos: connect the working health core, then the basic companion

### ANG-1 — Do next

Expose the existing history, daily comparison, check-in submission, and weekly report to zt through an agreed callable/API adapter. Reuse the existing functions; do not rebuild weekly medians or change the fixed baseline as a new task. Support at least two demo crew identities without their histories or references mixing; separate stores per demo identity are acceptable if agreed.

Acceptance: zt can save a check-in from the app, reload the same user's history, and request the existing report as structured data. A second demo identity cannot read or change the first one's history/reference. Existing checks still pass. Handle missing values explicitly.

### ANG-2 — After ANG-1 is connected

Prepare the minimum companion behavior using the authorized user's health findings, history, and journal context: explaining available changes, helping enter a symptom, pointing to the right section, and offering the user a path to their psychologist. Preserve context across the agreed local session/history and show unavailable information honestly. It must not issue prescriptions, grant medicine access, or send private journal details to another role.

Add the journal persistence/context interface needed by that behavior, coordinated with zt's Mind UI. Define inputs/outputs and the model/runtime approach with zt; no trained neural model or fully offline conversation currently exists. Do not turn this into an open-ended new model-training project before the app-facing connection works. Respect Angelos's stated wish to understand the code and agree any simplification with him.

## dadis2: finish the prescription-to-compartments flow

### DAD-1 — Do next

Extend the current multi-medicine Earth plan into one authorized collection operation: a single code/QR selects and highlights all and only the prescribed compartments together. Return their locker/shelf/bin IDs for the main app and any future hardware bridge. Track collection per compartment/item without confusing retrieval with logging every dose of a multi-day prescription as already taken.

Acceptance: a sample prescription covering two bins activates both in one operation; an unrelated third bin remains unavailable. The correct user can collect the authorized items and each collection is recorded once. Wrong-user, invalid, expired and already-redeemed-dose attempts are rejected; a legitimate later dose from the same prescription remains eligible. A multi-day prescription is not an allowance to collect the whole course at once. Keep dose counters persistent and coordinate concurrent-tab/device handling. Record collection separately from consumption/follow-up.

### DAD-2 — After DAD-1 works

Provide the ground-side prescription code and QR-image output, plus a short contract zt can use on the Earth clinician screen. Separate the existing typo checksum from verification of an authorized clinician. Define grant identity, recipient, scope, validity/reuse behavior and verification; if issuer verification remains simulated, label it explicitly. Keep test credentials/data synthetic.

Publish regression checks for batch scope and patient binding. Camera scanning needs verification on a supported target device, with the typed-code fallback retained. Real locks are a later hardware connection unless the team explicitly supplies them. Freeze cosmetic/game additions for now; Tommy deferred gamification.

## Potest: make environment context usable by the app

### POT-1 — Do next

Expose the existing snapshot as a callable/event/message output rather than only downloading JSON. Provide a new-alert/recovery signal for the report assembler, not a repeated report on every render or replay tick. Agree the event identity and clock with zt.

Acceptance: a parent app can obtain source, data type, source time, mission/replay time mapping, values, units, availability and alert state. Two readings confirming an excursion produce one logical event; recovery, stale readings and replay restarts have explicit behavior. Historical and synthetic data remain distinguishable.

### POT-2 — If POT-1 is covered and transport ownership is accepted

Take the otherwise unowned report-delivery queue, coordinated with zt: persist an authorized report while the simulated Earth link is down, send it after reconnection, track receipt, and avoid duplicate delivery using a stable report ID. This component transports reports; it does not define clinical content or choose who may see journals.

Acceptance: offline -> queued -> sent -> receipt confirmed are distinct states; an app restart preserves the queue, and retry does not create a second logical report. A clinical reply is a separate linked event. Earth transmission/receipt may be simulated and must be labelled as such.

## Petros: turn the existing research into a bounded demo package

### PET-1 — Do next

Select the fields and data the first demo actually uses, with a short mapping file/table: field name, unit or response anchors, collection method, timestamp/cadence, missing-value meaning, source, and real/historical/synthetic status. Include concrete scenario fixtures using the agreed crew IDs and mission clock for the cases Tommy and zt choose.

Reuse the research and offline proposal already written. Do not add another broad literature survey as the default next task. Keep individual records, cohort summaries, exercise readings, resting readings and spacecraft instruments distinct; the 47-row historical CSV is not automatically a single astronaut's continuous baseline. Use labelled synthetic longitudinal records where the needed real person-level series is unavailable.

Acceptance: Angelos and zt can load the selected package and identify every field's meaning/provenance; no missing readings become zeros, and no historical group mean is presented as a live individual reading.

### PET-2 — After PET-1, where support is still unowned

Turn the existing wellbeing-field proposals into an implementation brief for the daily form: exact wording, recall period, anchors/direction, required versus optional, and a private note field. Confirm scales with Tommy and Angelos. This is a product check-in, not a newly validated psychometric test. If an established questionnaire is chosen, preserve its stated wording/scoring/recall constraints and source it.

Update the PR #36 proposal to reflect Tommy's Q11–Q12 clarification: the author and psychologist are the human journal readers, and the author's chatbot is allowed to process those thoughts. Ordinary medical reports must still omit them for other audiences. Do not silently share them with the onboard support role.

## Zisis (zt): build one joined path from the new overview

### ZT-1 — Do next

Use the overview already written to choose the implementation boundary and agree the small module contracts above. Start a working integration connection with its README, compose existing modules, and build the daily home summary plus persistent clickable companion. This chat supplies concepts only; it is not a second UI implementation.

First acceptance path: select/sign in as a demo crew member -> submit a check-in and symptom -> show that person's health result plus timestamped cabin context -> the onboard doctor creates/sends the clinical report (content hidden from the astronaut) -> queue/send it -> show a clinician reply -> import the prescribed code -> indicate only its authorized bins. Add a private journal example proving that other human roles and the ordinary report cannot see it. The live-demo story and detailed cases remain Tommy/zt decisions.

### Decide these differences with Tommy before treating the overview as final

- Q13 resolved: clinical report content is hidden from the astronaut and only the onboard doctor can manually create/send it. Automatic routing remains separate; doctor-side preview and simple recipient/status feedback still need detail.
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
