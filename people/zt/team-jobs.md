# Team jobs

Who is doing what, worked out from each person's actual work in the repo (status files, folders,
branches and pull requests), not from an agreed split. Updated at each of zt's status checks.
The agreed split goes in "Who does what" in [shared/PLAN.md](../../shared/PLAN.md); this file shows
what is actually happening.

Last checked: 2026-11-14 13:33

## Jobs

| Person | Job, from their work | Where | Last activity |
|---|---|---|---|
| angelos | Personal health monitoring: compares each astronaut's daily readings with their own baseline, plus daily check-ins saved to a local history (Python, SQLite) | `people/angelos/health_monitor/`, PR #22 merged, PR #25 open | 13:31 |
| dadis2 | Medical inventory and dispensing (the medicine cabinet): stock, dispensing with safety checks, sign-off by risk tier, dose log, 2D bay map (HTML/JS) | `people/dadis2/inventory/` on branch `dadis2/medical-inventory`, no PR yet | 13:07 |
| petros | Research and real data: astronaut health measurements, datasets, radiation, and a CSV of published in-flight vital signs for the prototype | `people/petros_the_space_larper/`, PR #19 merged | 13:15 |
| potest | Cabin environment monitoring: CO₂ and other readings replayed from ISS and Mars missions, alerts, incident snapshot export (HTML/JS) | `people/potest/environmental-graphs/`, PR #21 merged | 13:07 |
| tommy | Product concepts and user journeys, written as briefs for zt; no code | `people/tommy/plan.md`, PR #24 merged | 13:29 |
| zt | Repo setup and rules; writing `shared/PLAN.md` with Tommy. Tommy's plan hands zt the UI (design and building it), not started yet | `people/zt/`, rules PRs #1–#23 | 13:33 |

## Not covered by anyone yet

- Joining the pieces into one app: `integration/` is empty.
- Submission and demo: the only row in `shared/PLAN.md`, no owner.
- From Tommy's concepts, with no work yet: mental wellbeing and professional support
  (angelos expects mood self-reports as an input, but nobody builds them), motivation and points,
  the companion mascot.

## Connections that need agreeing

| Between | What to agree | Raised by |
|---|---|---|
| sensors and mood check-ins → angelos | Daily input fields, units, scales, timezone | angelos |
| angelos → dadis2 | Symptom report format and codes (`spec.md` section 8, `MedInventory.receiveSymptomReport`) | dadis2 |
| potest → app | Historical CO₂ series into the incident summary | potest |
| petros → app | Load the in-flight vitals CSV as mission snapshots, keeping blank values | petros |
| tommy → zt | Entry and account flow: one screen or steps, extra health fields, validation, login backend, first screen after login | tommy |

## History

One line per status check, newest last.

- 2026-11-14 13:33 · First record. Five people have working pieces in their own folders, nothing is
  joined yet, and `shared/PLAN.md` is still empty (zt and Tommy are writing it).
