# Team jobs

Who is doing what, worked out from each person's actual work in the repo (status files, folders,
branches and pull requests), not from an agreed split. Updated at each of zt's status checks.
The agreed split goes in "Who does what" in [shared/PLAN.md](../../shared/PLAN.md); this file shows
what is actually happening.

Last checked: 2026-11-15 12:22

## Jobs

The pieces each person builds for the joined app are fixed in the
[onboard app contract](../../shared/contract/README.md), section 2. The joined app is
[integration/onboard-app/](../../integration/onboard-app/README.md).

| Person | Job, from their work | Where | Last activity |
|---|---|---|---|
| tommy | **Joined the whole app** on top of zt's core: health, meds, the workout, the offline companion, cabin environment, reports and the Earth link, the 3D body (#73); the Alloy look (#74); **Pulsars** rewards and a companion shop, with a new module and contract section (#75). All merged this morning. Now reviewing dadis2's medical officer console (no PR); two product choices are his to make. His status PR #77 is clean and waiting | `integration/onboard-app/`, `people/tommy/pulsars/`, `people/tommy/current-app-handoff.md`, branch `tommy/review-dadis-demo` | Sun 12:12 |
| angelos | **Wrote the 42-page PULSE technical report** (PDF, editable text, build script, source list), merged as #78. Approved #74 and #75. His review notes PR #76 has a conflict with main, in his own folder | `people/angelos/report/` | Sun 12:14 |
| dadis2 | meds waves 1 and 2 merged Saturday. Today: **Earth's reply as a QR code** read by the laptop camera, and a lean **medical officer console** (Approvals, unlocked cabinet) and Earth console. Pushed, no PR. It edits the joined app's pages and changes three medicine rules (items 10–12 in `meds/README.md`). Approved #74 | branch `dadis2/mo-console` (includes `dadis2/earth-qr`) | Sun 12:13 |
| potest | Cabin environment bridge (#40) and the Crew Support chat (#55), both now merged as part of Tommy's join. The app runs them offline, without an API key. Nothing new since Saturday | `people/potest/`, `integration/crew-assistant/` | Sat 19:00 |
| petros | Research and demo data: PET-1, the wellbeing brief, the guided workout with pulse replay; the stage data fix (#64) merged. The app uses all of it. Nothing new since Saturday | `people/petros_the_space_larper/demo-data/` | Sat 18:57 |
| zt | Repo setup, the contract, the demo cases, core server step 1 (#71), which Tommy's app is built on. Nothing new since Saturday evening | `people/zt/`, `shared/contract/` | Sat 19:12 |

## Not covered by anyone yet

- **Submission:** `shared/submission/project-page.md` is still empty (name, summary, description,
  use of AI, data). No slides yet (at most 7). No owner. The plan says feature freeze 14:00,
  submit 19:00. Angelos's report and `shared/sources.md` hold most of the text and the data list.
- **`final/`** is empty: no finished product and no check command. The working app is
  `integration/onboard-app/`; someone needs to decide whether `final/` copies it or points to it.
- **`shared/PLAN.md`** is still the blank template. The project page needs the idea in the team's
  own words anyway.
- **One test fails on Linux** (116 of 117): `integration/crew-assistant/demo.test.js` starts Python
  as `python`, which Linux Mint doesn't have. It passes with `CREW_ASSISTANT_PYTHON=python3`. It's
  potest's connection; it passed on Windows.

## Connections that need agreeing

Settled since Saturday: crew IDs, clock and scales (contract); demo data (#64 merged, plus
`integration/onboard-app/demo/seed-presentation.mjs`); meds, health, workout, environment and the
companion are joined in the app.

| What | Where it stands | Raised by |
|---|---|---|
| dadis2's medical officer console | Tommy's review (on `tommy/review-dadis-demo`) flags: the medical officer takes any medicine with no dose or reserve limits; an emergency's reason becomes optional and a request's mandatory; Leo as the patient no longer goes to Earth; the camera fallback isn't wired into the app. Waits for Tommy's two choices, then a PR to the app pages and the contract, both protected | dadis2, tommy |
| Emergency scope, one course per medicine | Still in dadis2's status from Saturday; check at the table whether the console work replaces them | dadis2, tommy |
| Reports, Earth link, environment adapters | Tommy built them as connection-owned adapters in `integration/onboard-app/adapters/`. Not adopted in the contract; potest should check the environment time mapping | tommy, potest |
| Who owns mind | The contract still names angelos. The app uses a connection-owned journal and potest's offline helpers (decision 2026-11-14-2235) | angelos, potest, tommy |

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
- 2026-11-15 12:22 · The whole joined app is on main (Tommy's #73–#75: every module, the Alloy look,
  Pulsars), and so is Angelos's technical report (#78). 116 of 117 tests pass on Linux. Left: the
  submission page and slides, `final/`, and dadis2's console branch, which waits on Tommy's choices.
  Feature freeze is 14:00.
