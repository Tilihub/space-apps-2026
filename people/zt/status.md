# zt

## Profile

- GitHub: Tilihub
- AI tool: Claude Code (desktop app)
- Operating system: Linux (Mint 22.3)

## Now

- Last updated: 2026-11-15 18:17
- Working on: the live demo script. The crew rename (PR #99) is merged and deployed on Render.
- Branch: none open

## Done

- Cut the onboarding from six questions to one (PR #3)
- Onboarding: this status file (PR #4)
- Restructured the repo into `people/`, `shared/`, `integration/` and `final/` (PR #5)
- Repo rules: no AI attribution (PR #6), approval lock for the plan, `final/` and the rules files
  (PR #7), problem reports in `shared/reports.md` (PR #10), no shared drive or video demo (PR #17),
  status update after every finished step (PR #23)
- Added Gemini research reports on astronaut health monitoring (PRs #11, #12)
- Checked everyone's status and started [team-jobs.md](team-jobs.md): who does what, worked out
  from each person's actual work. Last refreshed 2026-11-14 19:00
- Approved petros's demo data fix ([PR #64](https://github.com/Tilihub/space-apps-2026/pull/64))
  after checking every value against the demo cases; all 69 root tests pass
- Wrote a draft app overview in my [plan](plan.md): a quiet home page (readiness score, task score,
  clickable body figure), the sections behind it, the demo format and open points
- Built a clickable UI skeleton from that overview: one plain HTML file, no styling, landscape
  tablet/laptop ([PR #43](https://github.com/Tilihub/space-apps-2026/pull/43)). Every screen from the overview is there as labelled boxes; one tab per astronaut
  with `?crew=1`, `?crew=2`, `?crew=3`; all fake data in one block at the top of the script
- Wrote the onboard app contract in `shared/contract/` (branch `zt/app-contract`): one Node.js
  server on one laptop, one module per piece, pages that draw everything. It fixes 5 crew (`c1`–`c5`,
  Leo `c2` the only medical officer), 1–10 self-reports, sleep in hours, one mission clock, and
  every module's paths and data. Shared code, an example module and 7 passing tests (`npm test`).
  `AGENTS.md`, `CODEOWNERS` and `shared/PLAN.md` point to it
- Wrote the demo cases in [demo-cases.md](demo-cases.md): one narrator and five crew members, the
  medical officer last, one NASA hazard each. Each case has its story, screens, records per piece,
  real versus simulated values and what is still missing. Cabin CO₂ uses a real three-day rise
  from potest's ISS RR-9 replay ([PR #52](https://github.com/Tilihub/space-apps-2026/pull/52))
- Updated the contract (PR #49) for Tommy's PR #47 and the demo cases: health analyses are for the
  medical officer only, enforced by the server; crew stories, values and CO₂ timing match the demo
  cases; new allergies, blocked items, emergency release, stock, workout records and radiation;
  wave 2 is the rest of the live demo. The demo cases now show every comparison in E's scene
- Core server, step 1 ([integration/onboard-app/](../../integration/onboard-app/README.md)): one
  Node.js server with login (Leo only on the medical platform), the mission clock (day 42, 07:30,
  jumps forward, pauses while off), events, saved data per module, reset demo, and a plain demo
  controls page at `/demo/`. Runs the example module; 12 tests pass, and they show angelos's health
  and dadis2's meds already run inside it with petros's day-42 data
- Sunday 12:22 status check: pulled main (the joined app, Pulsars and Angelos's report are merged)
  and refreshed [team-jobs.md](team-jobs.md). 116 of 117 tests pass on Linux; the one failure is
  the crew-assistant demo starting Python as `python`
- Added the Local Event's presentation guide (Greek NewSpace Society) as
  `shared/submission/local-presentation-guide.pdf`, with a text summary next to it and a pointer
  from `project-page.md`: 7 minutes plus Q&A, the five judging criteria, recommended contents, and
  how Tommy's draft demo plan (PR #79) compares
- Checked that everyone's open code combines: #85, #79, potest's presentation branch and the
  live-watch work merge with main without conflicts, and 130 of 130 tests pass
- Wrote the Render deploy recipe in `shared/submission/deploy.md`: settings, what `final/` must keep
  (checked by loading all six modules from a copy in `final/onboard-app/`), and free-plan limits
- Deployed the app on Render's free plan (zt's account, Frankfurt, Node 24) at
  https://pulse-crew-health.onrender.com/, with a free UptimeRobot monitor every 5 minutes so it
  never sleeps. Recorded the link, the pinger and how to switch to `final/` in `deploy.md`
- Made the app demo-ready with the team's decisions: a prepared mission day 42 on every start, Reset
  and end of day 42 (`--presentation` / `PULSE_PRESENTATION=1`, `integration/onboard-app/presentation.js`);
  stage push-ups always pay +200 and +100 for the record; Mara starts at 700 Pulsars; Ines's first
  nine wellbeing answers are prefilled. Checked in a scratch run and in the browser; 131 of 131
  tests pass. Wrote `shared/submission/demo-plan-updates.md` listing what is now out of date in
  Tommy's presentation plan
- Renamed the crew to the presenters for the live demo: Leo → Aggelos, Ines → Chris, Tomas →
  Diamandis (now the Commander), Kai → Petros; Mara stays and becomes the Mission specialist.
  Chris (`c3`) now has the male body. Changed in the contract's crew list, the app's login button,
  Earth's reply card, one error message and one test. 131 of 131 tests pass; checked in the browser
- Crew rename merged ([PR #99](https://github.com/Tilihub/space-apps-2026/pull/99), approved by Tommy):
  Mara has no surname now. Deployed on Render from main at `0a71561`
- Start screen lists the crew in the demo's running order: Diamandis, Petros, Chris, Mara, Aggelos
- Prepared start for the new script: Chris (`c3`) now has the four bad days before demo day (moved
  from `c4`); Chris and Mara log the same hard day (4.6 h sleep, mood 4, stress 7, fatigue 7) with nine
  wellbeing answers prefilled, so the Crew Assistant answers them differently only because of their
  history; Diamandis has no prepared headache, he reports it live. Chris's tests now point at `c3`

## Blocked / need from others

- Nothing blocks zt. The core is no longer waited on: Tommy joined every module into
  `integration/onboard-app/`. Open for the table: who owns the submission, what goes in `final/`,
  and dadis2's console branch (see [team-jobs.md](team-jobs.md), "Connections that need agreeing")

## Next steps

<!-- Written so someone else could continue: which branch, what's half-done,
     what to do next, what to watch out for. -->

- Sunday, before the 14:00 feature freeze: agree an owner for the project page and the slides
  (`shared/submission/project-page.md`, at most 7 slides), and what goes in `final/`. Run the app
  with `node integration/onboard-app/start.js` and follow `people/tommy/current-app-handoff.md`.
- The Saturday notes below are mostly done or replaced by Tommy's join; keep them for history.

- Ask Tommy: may one plain line ("sleep lower than usual") show on the astronaut's Home, and may
  the workout give points? Ask potest to take reports and the Earth link. Record the answers in
  the contract's "Still open".
- Contract (merged, PR #49): settle the open questions above at the table, then change the
  contract in one pull request a teammate approves. Each owner builds their module to it (wave 1
  before leaving Saturday).
- Core (branch `zt/onboard-core`, step 1 done): next add health to `modules.js` and follow zt's
  part of `people/angelos/health/TEAM_NEXT_STEPS.md`, then meds with dadis2's "For zt" notes in
  `people/dadis2/meds/README.md`. Then the astronaut app and the medical officer platform, starting
  from the UI skeleton's layout (5 crew, 1–10, sleep in hours). `npm start` needs a root
  `package.json` change, which needs a teammate's approval; until then run
  `node integration/onboard-app/start.js`.
- Go through the app overview in [plan.md](plan.md) with Tommy. It's a draft, open to change.
- Finish `shared/PLAN.md` with Tommy and open the pull request. Someone other than zt must approve it.
- Keep [team-jobs.md](team-jobs.md) current at each status check: update the tables and add one
  line to History. It records what people actually do; the agreed split goes in `shared/PLAN.md`.
- Tommy's plan hands zt the UI, starting with the entry screen, log in, sign up and a basic health
  profile (`people/tommy/plan.md`, "First brief"). Not started; its open points need answers first.
- Demo cases ([demo-cases.md](demo-cases.md)): go through them with the team and pick new names.
  Then hand petros the records for `demo-data/` and agree who builds the workout screen and the
  emergency alarm (minimum builds are in the file). The workout isn't in the app contract yet.
