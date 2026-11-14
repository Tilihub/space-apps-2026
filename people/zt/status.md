# zt

## Profile

- GitHub: Tilihub
- AI tool: Claude Code (desktop app)
- Operating system: Linux (Mint 22.3)

## Now

- Last updated: 2026-11-14, end of day
- Working on: zt's first round of notes on the UI look ([ui-look/index.html](ui-look/index.html)).
  Side chats running: home page ideas (`zt/home-ideas`), med bay content (`zt/medbay-plan`),
  3D body view/report modes (`zt/body-3d`).
- Branch: zt/ui-look

## Done

- Cut the onboarding from six questions to one (PR #3)
- Onboarding: this status file (PR #4)
- Restructured the repo into `people/`, `shared/`, `integration/` and `final/` (PR #5)
- Repo rules: no AI attribution (PR #6), approval lock for the plan, `final/` and the rules files
  (PR #7), problem reports in `shared/reports.md` (PR #10), no shared drive or video demo (PR #17),
  status update after every finished step (PR #23)
- Added Gemini research reports on astronaut health monitoring (PRs #11, #12)
- Checked everyone's status and started [team-jobs.md](team-jobs.md): who does what, worked out
  from each person's actual work. Last refreshed 2026-11-14 18:28
- Wrote a draft app overview in my [plan](plan.md): a quiet home page (readiness score, task score,
  clickable body figure), the sections behind it, the demo format and open points
- Built a clickable UI skeleton from that overview: one plain HTML file, no styling, landscape
  tablet/laptop ([PR #43](https://github.com/Tilihub/space-apps-2026/pull/43)). Every screen from the overview is there as labelled boxes; one tab per astronaut
  with `?crew=1`, `?crew=2`, `?crew=3`; all fake data in one block at the top of the script
- Made a first look suggestion ([ui-look/index.html](ui-look/index.html)): night look (default)
  and day look, body figure with blue/red points, floating companion in the corner, 1–10 scales
  and sleep in hours as Tommy's notes ask. The skeleton stays unstyled for comparison
- Applied round 1 of notes to the look: body on the left of home (shows only reported symptoms,
  not clickable); check-in with 1–10 boxes (sleep is a feeling) and a symptom report on the body
  (area, symptom type, severity, notes, "all good"); no guided measurements (wearables do it);
  Habitat with potest's four readings and CO₂ + radiation graphs with notes, rocket icon; Mind
  with the companion, a delayed-message chat with the psychologist and the journal (no own mood);
  new Fitness section from Petros's program; Companion section removed (it floats in the corner)
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

## Blocked / need from others

- Nothing blocks zt. Teammates are waiting on zt for: the core server and pages (angelos's health
  module is ready for it), and four contract questions for the table (dadis2's Emergency scope and
  one course per medicine, who builds mind, petros's demo data vs the demo cases). See
  [team-jobs.md](team-jobs.md), "Connections that need agreeing"

## Next steps

<!-- Written so someone else could continue: which branch, what's half-done,
     what to do next, what to watch out for. -->

- **UI work in progress, for Tommy to continue (zt stopped 14 Nov evening).** None of it is on main
  yet. Get a branch with `git fetch origin`, then `git switch -c <you>/<task> origin/<branch>`:
  - `zt/ui-look`: the look ([ui-look/index.html](ui-look/index.html)) with round 1 of zt's notes
    (body left on home, check-in report on the body, Habitat graphs, Mind, Fitness). Open the file
    in a browser; `?crew=1|2|3` picks the astronaut. No pull request yet.
  - `zt/body-3d`: the 3D body (`people/zt/body-3d/index.html`) with a view mode for home and a
    report mode for check-in (eight areas). Next: copy it into the look's home and check-in. That
    makes the look file about 700 KB; zt hasn't said yes yet.
  - `zt/home-ideas`: four rough home page options (`people/zt/home-ideas/index.html`). zt hasn't
    picked one; none uses the 0–100 readiness score.
  - `zt/medbay-plan`: draft of what the team built for the med bay, with open questions for zt.
  - Open from zt's notes: check-in sleep is now a feeling (1–10) while the contract says hours
    (the wearable gives the hours); is the companion the psychological support chatbot?; body
    areas have no left/right; the readiness score stays a placeholder until the home page is chosen.
- Ask Tommy: may one plain line ("sleep lower than usual") show on the astronaut's Home, and may
  the workout give points? Ask potest to take reports and the Earth link. Record the answers in
  the contract's "Still open".
- Contract (merged, PR #49): settle the four open questions above at the table, then change the
  contract in one pull request a teammate approves. Each owner builds their module to it (wave 1
  before leaving Saturday).
- Build the core and the pages in `integration/onboard-app/` to the contract (section 5): server,
  login, clock, events, then the astronaut app and the medical officer platform, starting from
  the UI skeleton's layout. The skeleton's 3 crew, 0–10 sliders and sleep slider must follow the
  contract (5 crew, 1–10, sleep in hours).
- Go through the app overview in [plan.md](plan.md) with Tommy. It's a draft, open to change.
- Finish `shared/PLAN.md` with Tommy and open the pull request. Someone other than zt must approve it.
- Keep [team-jobs.md](team-jobs.md) current at each status check: update the tables and add one
  line to History. It records what people actually do; the agreed split goes in `shared/PLAN.md`.
- Tommy's plan hands zt the UI, starting with the entry screen, log in, sign up and a basic health
  profile (`people/tommy/plan.md`, "First brief"). Not started; its open points need answers first.
- Demo cases ([demo-cases.md](demo-cases.md)): go through them with the team and pick new names.
  Then hand petros the records for `demo-data/` and agree who builds the workout screen and the
  emergency alarm (minimum builds are in the file). The workout isn't in the app contract yet.
