# tommy

## Profile

- GitHub: tommy2002t
- AI tool: Codex (desktop app)
- Operating system: macOS

## Now

- Last updated: 2026-11-14 15:15
- Working on: Publishing Q13–Q17 and notifying module owners through the handoff PR; reviewing integration progress. Planning only.
- Branch: tommy/concepts-plan

## Done

- Opened PR #42 for the post-notification DAD-1 progress refresh.
- After publishing/notifying Q13–Q17, fetched again and reviewed the newly published dadis2/prescription-grants status, contract and dose-slot source. DAD-1 is now available for integration review; owner reports 19 checks passed. Updated the brief to avoid duplicate implementation.
- Published Q13–Q17 through merged PR #41; notified zt, angelos, dadis2, potest and petros via GitHub mentions in the PR comment (read/acceptance not assumed).
- Recorded Q13–Q17: doctor-only manual clinical reports with hidden astronaut content, reusable per-dose prescription QR with expiry/quotas, exceptional all-crew emergency access, readiness deferred, and 1–10 self-reports.
- Refreshed owner handoffs for the new requirements and reviewed the published Potest bridge (PR #40), zt UI skeleton, and Angelos handoff acknowledgement. No module implementation was changed here.
- Rechecked the latest published plans/statuses and inventory emergency path for conflicts. Prepared Q13–Q17; no new answer or change to the existing requirements is assumed.
- Published and merged the explicit teammate/coding-tool handoff in PR #39; verified the main file matches the prepared task brief.
- Tommy requested publication for the team and their coding tools. Added a start-here workflow, owner/task index (ZT-1, ANG-1/2, DAD-1/2, POT-1/2, PET-1/2), delivery expectations, and a copy/paste coding-tool prompt to [implementation-tasks.md](implementation-tasks.md).
- Refreshed the handoff against Angelos's newly published reset/backup status at 80d86db without reassigning work already delivered.
- Published and merged clarified requirements and proposed contributor tasks in PR #38; the handoff is available on main.
- Published the personal concept briefs through PRs #24, #30, and #33. Withdrew UI PR #20 and its remote branch; this chat produces no UI/application code.
- Recorded Q10: one code/QR grants only the prescribed compartments together; Q11: human private-journal readers are the author and psychologist; Q12: the author's chatbot can process those thoughts for contextual support without leaking them to other roles.
- Reviewed latest published statuses, module readmes/interfaces/source paths, and PRs #25/#34/#36 plus zt's merged app overview in PR #37.
- Re-ran Angelos's 31 existing checks against an isolated temporary copy at 35a3f60: all passed. No teammate database was used. Frontend/camera/hardware behavior was not independently browser-tested in this review.
- Verified that dadis2's published 5a7febb now imports multi-medicine Earth plans via code/QR, but retrieval starts one plan item at a time. Updated the earlier unpublished-version note.
- Added proposed tasks, dependencies, acceptance checks, and ownership boundaries in `people/tommy/implementation-tasks.md`; no task was sent to a teammate or entered as a team decision.
- Reviewed zt's new draft for report visibility, companion/gamification priority, entry flow and readiness-score meaning; also noted Petros's older proposal excludes journal context from the assistant, which needs alignment with Tommy's new answer.

## Blocked / need from others

- No blocker to documenting or proposing tasks. Tommy and the owners still need to agree the assignments and connection contracts.
- Agree shared crew IDs, clock, field names/scales and packet formats; keep historical source time/provenance explicit.
- Resolve report visibility/preview, score meaning and first-demo identity flow with zt. Confirm approval categories, reporting interval/triggers/window, and the permission implementation.
- Integrating modules, journal/companion behavior, report delivery and submission material still need the proposed work; existing stand-alone prototypes do not establish a joined application.

## Next steps

- Continue from `tommy/concepts-plan`; use `plan.md` for requirements and `implementation-tasks.md` for the task proposals Tommy can relay.
- The canonical teammate/coding-tool brief is published on main at `people/tommy/implementation-tasks.md`. Give this link to the team; requested tasks remain distinct from owner acceptance and common-plan decisions.
- Q13–Q17 are recorded; readiness remains open. Coordinate 1–10 versus old 0–10 history, due-dose/QR enforcement, emergency protocol, and doctor-only report routing with the owners. Publish the updated brief and notify the team in its PR.
- Later clarify entry/biometric flow, report contents/triggers/window and the remaining permission/integration details; common-plan changes require the normal teammate review.
- Update Now, Done and Next steps after each finished step and include this status in the same push; commit/push before a break.
- Do not implement UI/application code or edit another member's personal files from this chat unless the authorization and ownership rules allow it.
