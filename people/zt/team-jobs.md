# Team jobs

Who is doing what, worked out from each person's actual work in the repo (status files, folders,
branches and pull requests), not from an agreed split. Updated at each of zt's status checks.
The agreed split goes in "Who does what" in [shared/PLAN.md](../../shared/PLAN.md); this file shows
what is actually happening.

Last checked: 2026-11-14 19:00

## Jobs

Task IDs (ANG-1, DAD-1 and so on) come from Tommy's
[implementation-tasks.md](../tommy/implementation-tasks.md). The pieces each person builds for the
joined app are fixed in the [onboard app contract](../../shared/contract/README.md), section 2.

| Person | Job, from their work | Where | Last activity |
|---|---|---|---|
| angelos | **health module done to the contract and merged:** check-ins, daily summary, the medical officer's analyses, workout records, a page client. Checked petros's corrected data against it and wrote copy-paste tasks for each owner, zt's included (`health/TEAM_NEXT_STEPS.md`). He handed the companion (ANG-2) to potest | `people/angelos/health/` (start at `HANDOFF.md`), PRs #57, #60, #65 merged | 18:53 |
| dadis2 | **meds module wave 1 done and merged:** symptoms, allergies, lockers, dispensing, requests, grants, doses (18 tests). Its differences from the contract's wording are listed for zt in `meds/README.md`, "For zt". Also approvals per person (#62). Next: wave 2 (emergencies, stock) by Sunday 11:00 | `people/dadis2/meds/`, PR #66 merged; prototype in `inventory/` | 18:52 |
| petros | Research and demo data: **PET-1** and the **PET-2** wellbeing form brief merged; a guided workout program with a pulse replay for the workout screen (#63). The data fix that matches the demo cases is in PR #64, approved by zt, for petros to merge | `people/petros_the_space_larper/demo-data/`, PRs #51, #63 merged, #64 open | 18:37 |
| potest | Cabin environment: POT-1 bridge merged. Now a Crew Support chat (OpenAI, with a scripted demo mode) that takes over the companion, in draft PR #55. The contract's `env` module (`people/potest/env/`) isn't started | `people/potest/`, `integration/crew-assistant/` (draft #55) | 17:57 |
| tommy | Product owner and reviewer: reviewed the contract (#54, #56) and dadis2's grant safety (#59), and reproduced two grant replacement bugs. No app code | `people/tommy/` (`dadis-grant-review.md`, `contract-review.md`) | 18:10 |
| zt | Repo setup; the onboard app contract (#49) and the five demo cases (#52), merged; a first UI look on `zt/ui-look`, no PR yet. Approved petros's #64. The core server and pages aren't started | `people/zt/`, `shared/contract/` | 19:00 |

## Not covered by anyone yet

- The core server and pages (`integration/onboard-app/`): zt's, not started. health, meds wave 1
  and the workout controller are ready and waiting for it; nothing can be tested joined until it exists.
- `env` module (potest): owner named, not started.
- Submission and demo (project page, slides, rehearsal): no owner.
- Reports and the Earth link: potest proposed, not confirmed. dadis2's Earth cancellations need it.

## Connections that need agreeing

Crew IDs (`c1`–`c5`), the mission clock (`ctx.now()`) and the 1–10 scales are now settled by the
contract. Older prototypes (dadis2's `c1`–`c4` and device clock) follow it in their new modules.

| What | Where it stands | Raised by |
|---|---|---|
| Emergency scope | The contract releases only the emergency items. dadis2's prototype also lets prescription and controlled medicines out under "Can't wait?". Widening it needs a contract PR | dadis2, tommy |
| One course per medicine | dadis2 wants it in the contract. Tommy found two bugs: a replacement offers an already collected dose again, and a replacement starting later stops the current course now. Needs a rule for when the replacement takes effect | dadis2, tommy |
| Who builds mind | The contract names angelos; he handed it to potest. potest's #55 needs a paid OpenAI key; the contract says fixed replies. Needs an owner change and a choice | angelos, potest, tommy |
| Demo data vs demo cases | Fixed in petros's #64 (checked against `demo-cases.md`, approved by zt). Once merged, start the core with a fresh demo store or reset it | angelos |
| meds → app | dadis2's six differences from the contract's wording (`meds/README.md`, "For zt"): fold into the contract or accept | dadis2 |
| potest → app | Wire the incident view to `environmentMonitor.getSnapshot()` and the replay alerts | potest |
| Home fields, readiness score | Tommy deferred extra Home indicators; readiness is a placeholder | tommy |

## History

One line per status check, newest last.

- 2026-11-14 13:33 · First record. Five people have working pieces in their own folders, nothing is
  joined yet, and `shared/PLAN.md` is still empty (zt and Tommy are writing it).
- 2026-11-14 15:54 · Tommy's task list is now the working split. ANG-1, DAD-1 and POT-1 are built but
  still in open PRs, each waiting for zt to accept its connection format. `shared/PLAN.md`,
  `shared/decisions/` and `integration/` are still empty.
- 2026-11-14 18:28 · The contract and demo cases are merged, and with them crew IDs, clock and scales.
  angelos's health module is done and merged, dadis2's cabinet prototype too. Everyone now waits on
  zt's core server; four contract questions are for the table (Emergency, courses, mind, demo data).
- 2026-11-14 19:00 · meds wave 1 is merged; health and the workout controller were already done. The
  demo data fix (#64) is approved and waits for petros to merge. Still no core server; it now blocks
  the joining of three finished pieces.
