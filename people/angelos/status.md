# angelos

## Profile

- GitHub: AngelosAth30
- AI tool: Codex (desktop app)
- Operating system: Windows

## Now

- Last updated: 2026-11-14 15:24 (Asia/Nicosia)
- Working on: ANG-1 adapter/client published in PR #25; zt contract acceptance and UI wiring pending.
- Branch: angelos/interactive-check-in

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

## Blocked / need from others

- No local implementation blocker. The input contract still needs agreement with
  the members providing sensor summaries and psychological self-reports.
- Align the existing 0–10 self-report scales with Tommy's proposed app fields before integration.
- ANG-1 handoff still needs zt's acceptance: health-v1 packet, crew ID mapping,
  per-crew store choice, mission clock, browser origin and session integration.
  In particular, the skeleton's Sleep 0–10 is not sleep duration in hours.
- GitHub CLI works at C:/Program Files/GitHub CLI/gh.exe with network permission.

## Next steps

<!-- Written so someone else could continue: which branch, what's half-done,
     what to do next, what to watch out for. -->

- Continue from angelos/interactive-check-in. From the repository root run
  python people/angelos/health_monitor/check_in.py and use synthetic values.
- The first proposed mission date is 2026-11-14; later runs advance from saved
  history. The ignored SQLite database uses a frozen reference copied on first run.
- Use python people/angelos/health_monitor/check_in.py --reset when a fresh demo
  session is wanted. It creates a backup under local_data/backups and restores the
  two initial check-in days without changing the baseline, then exits.
- Use python people/angelos/health_monitor/check_in.py --report to inspect the
  latest weekly summary without adding data. Complete week-to-week comparisons
  require seven measured days in each period; the current history is partial.
- Walk through the code slowly with angelos when requested. He wants to understand
  each part and may later rebuild a simpler version himself; avoid unsolicited code changes.
- Hand API_CONTRACT.md, api_example.json and health_client.mjs to zt for review.
  The adapter runs with python people/angelos/health_monitor/app_api.py and an
  explicit --allow-origin matching the HTTP-served frontend. Tokens are generated
  at startup for a developer demo, not a production login or role system.
- ANG-1 UI wiring belongs to zt: save a check-in, reload that person's history,
  display daily/weekly data and verify a second identity stays isolated. The UI
  itself has not been edited or connected here. Do not rebuild completed analysis.
  Shared decisions remain team coordination; proposed IDs/units are not silently adopted.
- Start ANG-2 after ANG-1 is connected. Keep journal context restricted to the
  author, their psychologist and their authorized assistant; exclude it and private
  derived details from ordinary reports to other roles.
- Agree the daily input fields, units, scales, and timezone with the app/sensor owners.
- Add an API adapter, then connect the structured findings to a UI
  and companion conversation. No language model or live sensor integration exists yet.
- Demo thresholds and baseline sample count are arbitrary, unvalidated engineering
  settings. Do not describe the output as a diagnosis or medical clearance.
