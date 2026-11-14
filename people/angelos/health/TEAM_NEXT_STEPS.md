# Ready-to-use owner instructions: adopt the verified health component

Prepared 14 November 2026 at main `0a3204e`. This is the handoff for connecting
the health component, not a replacement for the shared contract or anyone's
existing work. Before acting, check current branches/PRs and skip completed steps.
Follow AGENTS.md, preserve unfinished work and edit only your authorized folders.

## Current verified state and order

- Health module/client/workouts: on main through Angelos PR #57.
- Aligned source: Petros PR #64, head `1b736f50332423657fb9b5568bb1c1e5e0459f50`,
  independently verified through the actual module; still open at this check.
- Verification and this handoff: Angelos PR #65. All 51 root checks pass,
  including three aligned stage cases, actual localhost client requests and
  Petros's workout controller. No user database or real NASA measurements changed.
- Order: Petros publishes the aligned source to main; zt adopts it in a fresh
  demo store and mounts health; zt/Potest connect their pages/context; then run
  the joined acceptance checks with Angelos. The actual onboard UI is not yet verified.

## Petros: publish the aligned source

Copy this task to your coding tool:

> Read AGENTS.md, shared/PLAN.md, the team statuses, shared/contract/README.md,
> people/zt/demo-cases.md and people/angelos/health/DATA_REVIEW.md. My folder is
> people/petros_the_space_larper/. Inspect my existing align-stage-data branch
> and PR #64 before editing. Angelos verified head 1b736f5: c1 has no changes;
> c3 mood/stress changes persist for 6/3 days with pulse gaps on days 39/41;
> c4 has a computed 6.8 h sleep reference and only sleep flagged for 3 days.
> Preserve these synthetic inputs and their paired scenarios/stories. Confirm
> that PR #64 is still that verified version, or rerun verification if it changed.
> Follow the normal repo workflow to merge my own source PR if conflict-free
> and within the allowed scope. Run the required root checks first and update
> my status in the same push. Keep published real NASA/source measurements
> unchanged. Tell the human which source commit is now on main and point zt to
> initialize/reset the demo; do not reset another person's stored session.

Deliverable: the aligned canonical `demo-data/health.json`, `scenarios.json` and
`stories.md` are on main. Day 42 is reserved for live entry; reference days are
29-35 and recent days 36-41. The removed synthetic cabin snapshot stays removed;
the environment context comes from Potest's separate replay.

## zt: connect the existing component to the onboard core and pages

Copy this task to your coding tool:

> Read AGENTS.md, shared/PLAN.md, the team statuses, shared/contract/README.md,
> people/angelos/health/HANDOFF.md and TEAM_NEXT_STEPS.md. My folder is people/zt/
> and I own the onboard integration. Reuse the delivered health module rather
> than rebuilding its analysis or adding another server. Confirm Petros #64 is
> merged before adopting the final stage data. In the single onboard core import
> people/angelos/health/index.js once, mount it at /api/health through the canonical
> handleRequest dispatcher, and supply session identity, the shared UTC clock,
> durable health-only ctx.store and metadata-only events. Start a fresh demo
> store or explicitly reset at DEMO_START to load the new canonical source.
> Existing stores intentionally keep their previous reference until reset.
>
> Serve/import people/angelos/health/client.js for the pages. Bind its token getter
> to the current core session. Wire the crew form to submitCheckIn/getToday and
> render only Today's own entries. Wire clinical comparisons/history/weekly/crew
> to c2's medical session; server refusals must remain effective. Use the shared
> 1-10 integer self-reports, sleep hours, and null for skipped measurements.
> Retain form values on errors and handle duplicate 409 by reloading the record.
>
> Serve Petros's existing /demo-data/ assets. Wire the workout page using
> demo-data/WORKOUT.md and workout-session.js with the core clock and this health
> client's submitWorkout. Save/list through the existing workout endpoints;
> preserve the synthetic/replayed source label and keep exercise pulse separate
> from resting check-ins. Use null recovery at Stop, or wait a full mission minute
> before saving measured recovery. Connect Potest's companion in coordination
> with its owner using the current-entry context described below.
>
> Run root checks and the real page acceptance checklist below. Update my status
> with the integration branch/PR, run command and results. Stay within ownership
> rules; protected contract changes require the normal reviewed PR.

Deliverable: one runnable onboard app with save/reload, role-limited medical
views and workout save/list. Include startup instructions and a working README
in the integration connection as AGENTS.md requires. Use the canonical source;
Angelos's bundled historical snapshots are regression-test inputs.

## Potest: connect the companion to the approved health context

Copy this task to your coding tool:

> Read AGENTS.md, shared/PLAN.md, the team statuses, shared/contract/README.md,
> people/angelos/health/HANDOFF.md and TEAM_NEXT_STEPS.md. My folder is people/potest/.
> Angelos assigned companion step 3 to me. Reuse my latest offline/scripted
> companion work and agree its placement with zt in the single onboard core;
> the standalone comparison is a prototype, not the five-crew app server.
>
> In the crew page use Angelos's createHealthClient bound to the current crew
> session and call getCompanionContext(). Pass the resulting {today} as context
> to the agreed /api/mind/companion handler. Today contains only crewId,
> missionDay, checkedInToday and that person's current checkIn, or null before
> checking in. Refresh per turn and clear context on logout, identity change
> and reset. The receiving handler must validate the supplied identity against
> the authenticated author. Handle missing values and no check-in explicitly.
>
> Preserve the current permission boundary: detailed baselines, trends, history
> and weekly analyses are care-only; their use by the companion is still open.
> Do not use a medical token or the single-profile experiment to bypass that
> boundary. If broader context is needed, give zt/Tommy the exact requested
> fields and obtain the normal contract decision before enabling it. Journal
> persistence/context belongs to the private mind flow and never to health,
> ordinary reports or metadata events. No new model training is required for
> this health connection. Test two crew identities, no entry, missing fields,
> session changes and role refusals; publish my status and the integration handoff.

Deliverable: the companion can use its authenticated author's current entry
without exposing another crew member's information or care-only analysis.
For any separately agreed journal/model/runtime work, preserve the shared private
mind boundary and update its own owner handoff. That broader work is not supplied
by the health API.

## zt and Tommy: decisions that remain separate from the working connection

- Reconcile the shared mind owner table with the user's Potest assignment through
  the normal reviewed contract workflow. This document does not edit that table.
- Additional Home indicators and companion access to clinical analyses remain
  open. The current Today-only connection can be completed with the existing
  conservative behavior; do not infer wider permission from the synthetic demo.
- This handoff assigns no new medicine/environment/report features. Those owners
  retain their own contract tasks; pages combine their outputs with health.

## Joined acceptance: zt runs it with Angelos and Potest

After the aligned source is on main and a fresh demo starts at day 42:

| Check | Required result |
| --- | --- |
| c1 submits the canonical scenario body | No compared measure flagged in the medical view |
| c3 submits its canonical body | Mood changed for 6 days; stress for 3; pulse gaps on 39/41 do not break the mood count |
| c4 submits its canonical body | Sleep reference 6.8 h; today 4.6 h; only sleep flagged, 3 days in a row |
| Crew submits/reads Today | Entry saved and restored after reload, without clinical analysis |
| Crew requests daily/history/weekly analysis | HTTP 403, including for their own data |
| c2 uses the medical platform | Can select the correct crew's analyses; journal/companion remain private |
| Two crew sessions and a server restart | Entries/workouts persist without histories or references mixing |
| Duplicate daily entry or exact workout retry | 409; no duplicate saved and no extra success event |
| Workout controller saves and lists a summary | Correct crew/time/source; resting reference and health summaries unchanged |
| Companion has no entry or missing measures | Honest unavailable state; no invented values or another user's context |
| Logout, identity change and demo reset | Old rendered/context data cleared; source reference reloaded only on explicit reset |

Use `checkInBody` from Petros's canonical scenarios, not the whole scenario
wrapper containing symptoms/expected results. Use separate resets for independent
scenario rehearsals. Run `npm test` from root (or its identical
`node --test "**/*.test.js"` script if npm is absent; HTTP tests need localhost).
Record the actual browser/core results in owner statuses. The 51 passing module
checks establish the data/API boundary; they do not establish that these pages
have already been joined and tested.
