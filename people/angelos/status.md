# angelos

## Profile

- GitHub: AngelosAth30
- AI tool: Codex (desktop app)
- Operating system: Windows

## Now

- Last updated: 2026-11-14 18:21 (Asia/Nicosia)
- Working on: Complete health component delivered through PR #57, with workouts, browser adapter and approved companion context ready for zt/Potest; see health/HANDOFF.md.
- Branch: angelos/health-module

## Done

- Installed Git and GitHub CLI; signed in from PowerShell and cloned the repository.
- Configured the repository commit identity with a private GitHub noreply email.
- Synced main and created my status file and personal plan from the templates.
- Confirmed onboarding is merged into main.
- Built people/angelos/health_monitor/: Python comparison core, synthetic scenarios,
  proposed input contract, and VS Code run instructions. No external dependencies.
- Ran all three CLI scenarios and passed 10 automated checks covering missing data,
  persistence, reference isolation, timestamps, and invalid inputs.
- Published and merged the first core in PR #22. The user ran both scenarios and
  changed the synthetic current resting heart rate from 77 to 62; this edit is preserved.
- Added check_in.py: terminal input, retry on invalid values, missing measures,
  and transactional SQLite history in an ignored local_data directory.
- Passed 16 automated checks, including two-day CLI persistence, cancellation,
  duplicate rejection, and an unchanged frozen baseline. Test storage is temporary.
- Published branch angelos/interactive-check-in and opened
  https://github.com/Tilihub/space-apps-2026/pull/25 (only people/angelos/).
- Added weekly_report.py with medians for two adjacent seven-calendar-day windows,
  per-measure coverage, complete-week comparisons, and fixed-baseline differences.
- Kept the original baseline fixed. Partial summaries are labelled and do not
  produce week-to-week claims. New records never replace the reference.
- Added automatic summaries after check-ins and read-only --report / --report --json modes.
- Passed all 31 automated checks. Verified the report against the existing local
  synthetic history and confirmed the database SHA-256 was unchanged afterward.
- Synced origin/main without rebase and retained the user's demo-data edit and saved history.
- Pushed the completed weekly-report version and updated PR #25's title and description
  around the final check-in, storage, fixed-baseline, and reporting behavior.
- Added --reset in check_in.py, with a verified SQLite backup before any history
  removal, an unchanged stored baseline, and retained initial check-in dates/values.
- Passed 38 automated checks, including recoverable backups, repeated resets,
  backup-failure safety, restoration rollback, CLI mode conflicts, and the next date.
- Reset checks use temporary databases only; the user's active session has not been reset.
- Pushed the reset implementation and updated PR #25's title and description with
  the final behavior and all 38 validation checks.
- Read Tommy's product plan and canonical implementation-tasks.md on main at
  05ad81a, plus his latest branch status at 58f7d52. Merged the published handoff
  into this branch; this step changes no application code.
- Identified ANG-1 (app-facing health adapter and separate crew histories) before
  ANG-2 (basic companion and authorized journal context). Existing reports/reset
  are already delivered and should be reused, not rebuilt.
- Confirmed PET-1 requires selected, source-labelled fixtures; the historical CSV
  is not automatically one person's baseline. Synthetic longitudinal data are
  explicitly allowed where suitable person-level records are unavailable.
- User requested ANG-1 implementation. Inspected zt/ui-skeleton: three fake crew
  tabs, no fetch/data bridge, and a Sleep 0–10 placeholder that needs unit agreement.
- Added app_api.py (callable service plus local JSON HTTP server), health_client.mjs,
  API_CONTRACT.md and a versioned api_example.json request/response for zt to review.
- Added three token-bound synthetic demo identities with separate SQLite stores.
  Demo-001 reuses the existing CLI session; the other profiles have distinct
  synthetic references. No app request can select a different crew identity.
- Verified all 51 checks, including the real JavaScript client against the HTTP
  API, persisted reloads, missing values, identity isolation and contract examples.
  Checks use temporary data only; existing CLI/weekly/reset checks still pass.
- Pushed ANG-1 at 8a9ed2e and rewrote PR #25's title/description around the final
  app API, separate crew histories, existing monitoring features and pending owner agreements.
- Confirmed PR #25 is merged. Started angelos/external-baseline for the user's
  requested independent file reader, without waiting for the selected dataset.
- Added personal-history-v1 JSON input, examples/baseline_input.json and
  BASELINE_IMPORT.md. --baseline-file and --import-only initialize a separate
  session from file values, without generating observations or adding demo recent rows.
- Stored the original import packet/source/units/scale in SQLite. References stay
  fixed; reset and later entries work without the original file. Different inputs
  cannot overwrite an existing reference. Empty recent histories report explicit gaps.
- Passed 60 checks, including actual CLI import/entry, changed file values,
  per-measure gaps, source/units/identity validation, immutable references and reset.
  Verification uses temporary databases; no existing user session was replaced.
- Read Tommy's new visibility/1–10 updates and zt's pending Node module proposal
  on zt/app-contract (PR #49). Imported 1–10 scales are explicit and enforced;
  legacy 0–10 data are retained without conversion. Personal-history imports are
  local-only and are not exposed by the old synthetic HTTP prototype.
- Pushed angelos/external-baseline and opened
  https://github.com/Tilihub/space-apps-2026/pull/50 after merging the latest main.
  Only personal files differ from main; existing user databases were not replaced.
- Merged the completed external-baseline PR #50 (own folder only), then merged
  current main into angelos/health-module without rebase. PR #49's approved
  shared Node contract arrived during this step; the implementation follows its
  corrected /today and medical-officer-only /daily interface.
- Added people/angelos/health/index.js and analysis.js: app JSON check-ins, five
  isolated personal histories through ctx.store, a frozen median/MAD reference,
  missing-day handling, weekly summaries and a repeatable fixture reset.
- The POST response returns {checkIn, today}, never the analysis. Crew get only
  their own current entry; c2 in the medical_officer role gets the detailed daily,
  history, weekly and crew views. No private journal data enters this module.
- Reset reads Petros's canonical demo-data/health.json when it exists, otherwise
  a labelled bundled copy of his published PET-1 example at 12c840e. Tests pin
  the example explicitly. New data never replaces a stored reference implicitly.
- Added module checks for session isolation, server-owned identity/time, missing
  values, 1-10 scales, permission enforcement, concurrent and duplicate writes,
  reloads, save failures, fixed references, streaks and weekly coverage.
- Passed all 27 root JavaScript checks (20 health + 7 shared example) using the
  exact package test script, node --test "**/*.test.js". npm test itself could
  not start because npm is unavailable. No user SQLite database was opened.
- User assigned companion responses (step 3) to Potest. Recorded that handoff
  here and in my own plan; no teammate's folder or shared owner table was changed.
- Published angelos/health-module and opened
  https://github.com/Tilihub/space-apps-2026/pull/57 with the module interface,
  checks and explicit core/data dependencies. Only people/angelos/ is changed.
- Refreshed main and reviewed Petros's latest fetched package at 12c840e (PR #51),
  zt's newer UI-look branch, Potest's Crew Support handoff and Tommy's latest
  adopted-contract review at d93f684. No newer shared contract revision was found.
  Older branch notes do not override the approved shared 1-10/care-only contract.
- Confirmed the bundled health.json exactly matches Petros's source Git blob.
  Added an unchanged copy of his paired scenarios.json and app-contract checks for
  c1 usual, c3 missing and c4 five-change/three-day inputs. Other crew histories
  and fixed references remain unchanged in every case; crew analysis access fails.
- Added a persisted SHA-256 fingerprint of each newly loaded source file, strict
  HH:MM string validation and rejection of forms with no observed measurement.
  Nulls remain missing and true zero sleep remains valid. Editing the source file
  never replaces the stored reference/fingerprint until an explicit reset.
- Passed all 30 root JavaScript checks (23 health + 7 example) using the exact
  root node test script. No real SQLite/session data or teammate files changed.
- Added health/DATA_REVIEW.md with field/source selection, computed medians and
  concrete PET-1 versus adopted stage-case differences. The historical CSV is
  research context, not a continuous personal baseline. Measurement guides remain
  zt's UI input; journal/chat remains outside this module.
- Refreshed again before publication: main 75a7377 includes dadis2's merged grant
  safety work (#58); Potest's #55 now also has a one-profile Crew Assistant demo
  at afc71dd. These do not change the shared health interface. Preserved the
  Python prototype used by that demo and kept clinical companion-context access
  as an unresolved shared-contract decision, not an authorization bypass here.
- Synced main 11bcc68: Petros's PR #51 is now merged. Confirmed default module
  initialization loads his canonical health.json and records its fingerprint,
  while bundled snapshots pin the earlier PET-1 tests.
- Completed the contract's workout POST/GET routes. Workouts have server-owned
  identity, validated UTC start/end, source labels, optional one-minute recovery,
  duplicate protection, chronological history and crew/medical access rules.
  Their data never enters resting check-ins, daily comparisons or weekly medians.
- Added backward-compatible workout storage, repeatable reset, and checks for
  concurrent retries, failed saves, clock rewinds and midnight completion days.
- Added health/client.js, a browser-safe adapter for the one core's API. It uses
  the current session token, unwraps structured errors and exposes the existing
  routes plus getCompanionContext(), returning only the authorized {today} data.
  No clinical history, analysis, journal or external model call is added there.
- Passed all 43 root JavaScript checks (36 health/client/workout + 7 shared
  examples), including the real adapter over temporary localhost HTTP with two
  crew identities, a medical session, reload, duplicates, workout save/list and
  reset. The sandbox needs elevated localhost test execution; no check is skipped.
  The standalone browser core/pages remain zt's integration responsibility.
- Delivered health/HANDOFF.md with the exact core import, client calls, authorized
  Potest context, workout semantics, verification command and data dependencies.
  Existing Python/SQLite sessions and all teammate files remain unchanged.
- Refreshed main 712b8f0 before publishing and read Tommy's newly merged #59
  grant review. It adds no health-interface change. The medication replacement
  findings and Emergency policy difference remain with their owners; health does
  not call or reimplement medicine/grant logic.

## Blocked / need from others

- No remaining local health feature blocker. zt owns the joined server and pages;
  neither is on main yet. The client/module HTTP boundary is tested; the real
  page save/reload path still needs verification after composition.
- Petros's bundled example predates the approved demo cases (c4 reference sleep
  7.8 h instead of 6.8 h). Petros must publish the updated canonical health.json.
  Do not call the exact live-demo scenario accepted with the old example.
  Also align c3's six-day mood change and pulse gaps, c1's ranges and the separate
  historical cabin replay; see health/DATA_REVIEW.md for the reviewed differences.
- The shared owner table still names angelos for mind. Coordinate the user's
  Potest handoff with zt rather than changing the protected contract implicitly.
- npm is not installed/on PATH here. Run its exact root test script directly with
  node --test "**/*.test.js". Node.js 24 is available; no packages are needed.

## Next steps

<!-- Written so someone else could continue: which branch, what's half-done,
     what to do next, what to watch out for. -->

- Continue from angelos/health-module. Read health/README.md and run npm test
  (or the identical node --test "**/*.test.js" if npm is absent) from repo root.
- zt and Potest should start at health/HANDOFF.md. The default export is the
  complete health module; client.js is the optional page-facing adapter. Import
  the module once per core/store and serve the client asset to the browser.
- zt imports health/index.js as the single health module instance, mounts
  /api/health, and supplies session identity, UTC clock and durable module storage.
  The form POSTs measurements to /check-ins, receives {checkIn, today}, and reloads
  /today. Medical analysis is fetched separately by c2's medical session.
- Verify the joined save/reload path with two users, role refusals and reset after
  the core/pages land. This module does not contain another server or login.
- Wire the workout screen to POST/GET /workouts; keep recovery null at Stop or
  submit the completed record after a full mission minute if recovery is measured.
  Potest's page uses getCompanionContext() with the crew session; do not use a
  medical token to supply clinical analyses under the still-open mind policy.
- When Petros's updated data lands, explicitly reset a fresh demo store, then check
  c4's day-42 input against 6.8 h baseline and three consecutive short nights.
  Run the checks against the paired scenarios for that version; the bundled PET-1
  scenarios deliberately pin the earlier publication and do not redefine the demo.
- The Python CLI, external-baseline reader and old HTTP prototype remain separate
  in health_monitor/ for study. Their SQLite files and 0-10 histories are unchanged;
  they are not silently converted or exposed by the new five-person app module.
- Follow health_monitor/BASELINE_IMPORT.md for an external personal-history file.
  Use a new destination database for a different reference. That local file format
  is not the app's health.json contract.
- Walk through the code slowly with angelos when requested. He wants to understand
  each part and may later rebuild a simpler version himself; avoid unsolicited code changes.
- Do not start ANG-2 here: the user assigned step 3 to Potest. Coordinate that
  handoff with zt, preserving the shared contract's private mind boundaries.
- Demo thresholds and baseline sample count are arbitrary, unvalidated engineering
  settings. Do not describe the output as a diagnosis or medical clearance.
