# Team jobs

Who is doing what, worked out from each person's actual work in the repo (status files, folders,
branches and pull requests), not from an agreed split. Updated at each of zt's status checks.
The agreed split goes in "Who does what" in [shared/PLAN.md](../../shared/PLAN.md); this file shows
what is actually happening.

Last checked: 2026-11-14 18:28

## Jobs

Task IDs (ANG-1, DAD-1 and so on) come from Tommy's
[implementation-tasks.md](../tommy/implementation-tasks.md). The pieces each person builds for the
joined app are fixed in the [onboard app contract](../../shared/contract/README.md), section 2.

| Person | Job, from their work | Where | Last activity |
|---|---|---|---|
| angelos | **health module done to the contract and merged:** check-ins, daily summary, the medical officer's analyses, workout records, a page client and a handoff for zt. The Python monitor stays for study. He handed the companion (ANG-2) to potest | `people/angelos/health/` (start at `HANDOFF.md`), PRs #50, #57, #60 merged | 18:23 |
| dadis2 | Medicine cabinet prototype, all merged: prescription codes (DAD-1), the Earth grant tool with QR codes (DAD-2), grant safety (one course per medicine, ingredient totals, Earth decides controlled medicines, a "Can't wait? Emergency" path). Next: the contract's `meds` module, not started | `people/dadis2/inventory/`, PRs #34, #44, #53, #58 merged | 17:57 |
| petros | Research and demo data: **PET-1** (`demo-data/health.json`, day-42 scenarios, measurement guides) and the **PET-2** wellbeing form brief, merged. angelos found the data predates the demo cases (c4's usual sleep is 7.8 h, the cases say 6.8 h) | `people/petros_the_space_larper/demo-data/`, PR #51 merged | 17:20 |
| potest | Cabin environment: POT-1 bridge merged. Now a Crew Support chat (OpenAI, with a scripted demo mode) that takes over the companion, in draft PR #55. The contract's `env` module (`people/potest/env/`) isn't started | `people/potest/`, `integration/crew-assistant/` (draft #55) | 17:57 |
| tommy | Product owner and reviewer: reviewed the contract (#54, #56) and dadis2's grant safety (#59), and reproduced two grant replacement bugs. No app code | `people/tommy/` (`dadis-grant-review.md`, `contract-review.md`) | 18:10 |
| zt | Repo setup; the onboard app contract (#49) and the five demo cases (#52), merged; a first UI look on `zt/ui-look`, no PR yet. The core server and pages aren't started | `people/zt/`, `shared/contract/` | 17:52 |

## Not covered by anyone yet

- The core server and pages (`integration/onboard-app/`): zt's, not started. health is ready and
  waiting for it; nothing can be tested joined until it exists.
- `meds` (dadis2) and `env` (potest) modules: owners named, not started.
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
| Demo data vs demo cases | petros's `health.json` differs from `demo-cases.md` (c4 sleep, c3 mood, c1 ranges); see angelos's `health/DATA_REVIEW.md` | angelos |
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
