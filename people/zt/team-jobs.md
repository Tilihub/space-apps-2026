# Team jobs

Who is doing what, worked out from each person's actual work in the repo (status files, folders,
branches and pull requests), not from an agreed split. Updated at each of zt's status checks.
The agreed split goes in "Who does what" in [shared/PLAN.md](../../shared/PLAN.md); this file shows
what is actually happening.

Last checked: 2026-11-14 15:54

## Jobs

Task IDs (ANG-1, DAD-1 and so on) come from Tommy's
[implementation-tasks.md](../tommy/implementation-tasks.md), which people are now working from.

| Person | Job, from their work | Where | Last activity |
|---|---|---|---|
| angelos | Personal health monitoring: compares daily readings with each astronaut's own baseline, check-ins, weekly report (Python, SQLite). **ANG-1 built:** an API and JavaScript client so the app can save check-ins and read history and reports. Next: ANG-2, the basic companion | `people/angelos/health_monitor/`, PR #22 merged, PR #25 open | 15:24 |
| dadis2 | Medicine cabinet: inventory, dispensing with safety checks, approvals, dose log, bay map (HTML/JS). **DAD-1 built:** one prescription code opens all and only its prescribed bins, one dose at a time. Next: DAD-2, the ground-side QR code | `people/dadis2/inventory/`, PRs #34 and #44 open (#44 includes #34) | 15:28 |
| petros | Research and real data: measurements, datasets, countermeasures, deep-space evidence, a 47-row vitals CSV, and a proposed offline Mars-transit scope. **PET-1** (the demo data package and field mapping) not started yet | `people/petros_the_space_larper/`, PRs #19 and #27–#35 merged, PR #36 open | 14:30 |
| potest | Cabin environment monitoring: replay of ISS and Mars mission data, alerts, snapshots (HTML/JS). **POT-1 built:** a bridge the app can call for the current snapshot and alert events. POT-2 (the report delivery queue) only if potest takes it | `people/potest/environmental-graphs/`, PR #21 merged, PR #40 open | 15:30 |
| tommy | Product owner and coordinator: writes the requirements (questions Q1–Q17 answered), reviewed every module and re-ran their tests, and wrote everyone's next tasks. No app code | `people/tommy/` (plan, implementation tasks, ecosystem review), PRs #24–#45 | 15:49 |
| zt | Repo setup and rules; app overview and a clickable UI skeleton; writing `shared/PLAN.md` with Tommy. Tommy's tasks name zt as the integrator (**ZT-1:** agree the connection formats and build the first joined demo path), not started yet | `people/zt/` (plan, `ui-skeleton/`), PRs #37 and #43 merged | 15:16 |

## Not covered by anyone yet

- Joining the pieces: assigned to zt as ZT-1, but `integration/` is still empty.
- Submission and demo (project page, slides, rehearsal): no owner. Tommy's tasks flag this too.
- Report delivery queue: POT-2, unless potest takes it.
- Wellbeing form (PET-2) and companion (ANG-2): planned after the first tasks. Gamification is on hold
  at Tommy's request.

## Connections that need agreeing

Every one of these is waiting on zt as integrator.

| What | Where it stands | Raised by |
|---|---|---|
| Crew IDs | angelos uses `astronaut_id`, dadis2 uses `c1`–`c4`, zt's skeleton uses `?crew=1`–`3` | angelos, dadis2, tommy |
| Mission clock | potest leaves mission time unset, dadis2 uses the device's local time, angelos starts at 2026-11-14 | potest, dadis2, angelos |
| Self-report scale | Tommy (Q17) wants 1–10 for mood, stress and fatigue; angelos's history and zt's skeleton and plan use 0–10. The skeleton's sleep on 0–10 should be hours | tommy, angelos |
| angelos → app | `health-v1` packet in angelos's `API_CONTRACT.md` (on PR #25) | angelos |
| dadis2 → app | Grant contract in dadis2's `inventory/CONTRACT.md` (on PR #44) | dadis2 |
| angelos ↔ dadis2 | Symptom report format and codes (dadis2's `spec.md` section 8) | dadis2 |
| potest → app | Snapshot and event IDs, `environmentMonitor.getSnapshot()` (on PR #40) | potest |
| petros → angelos, zt | Field mapping for the demo data (PET-1), not written yet | tommy |

## History

One line per status check, newest last.

- 2026-11-14 13:33 · First record. Five people have working pieces in their own folders, nothing is
  joined yet, and `shared/PLAN.md` is still empty (zt and Tommy are writing it).
- 2026-11-14 15:54 · Tommy's task list is now the working split. ANG-1, DAD-1 and POT-1 are built but
  still in open PRs, each waiting for zt to accept its connection format. `shared/PLAN.md`,
  `shared/decisions/` and `integration/` are still empty.
