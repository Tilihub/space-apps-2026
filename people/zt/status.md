# zt

## Profile

- GitHub: Tilihub
- AI tool: Claude Code (desktop app)
- Operating system: Linux (Mint 22.3)

## Now

- Last updated: 2026-11-14
- Working on: a clickable UI skeleton ([ui-skeleton/index.html](ui-skeleton/index.html)) so the
  team can agree what goes where before any styling or real data
- Branch: zt/ui-skeleton

## Done

- Cut the onboarding from six questions to one (PR #3)
- Onboarding: this status file (PR #4)
- Restructured the repo into `people/`, `shared/`, `integration/` and `final/` (PR #5)
- Repo rules: no AI attribution (PR #6), approval lock for the plan, `final/` and the rules files
  (PR #7), problem reports in `shared/reports.md` (PR #10), no shared drive or video demo (PR #17),
  status update after every finished step (PR #23)
- Added Gemini research reports on astronaut health monitoring (PRs #11, #12)
- Checked everyone's status and started [team-jobs.md](team-jobs.md): who does what, worked out
  from each person's actual work
- Wrote a draft app overview in my [plan](plan.md): a quiet home page (readiness score, task score,
  clickable body figure), the sections behind it, the demo format and open points
- Built a clickable UI skeleton from that overview: one plain HTML file, no styling, landscape
  tablet/laptop. Every screen from the overview is there as labelled boxes; one tab per astronaut
  with `?crew=1`, `?crew=2`, `?crew=3`; all fake data in one block at the top of the script

## Blocked / need from others

-

## Next steps

<!-- Written so someone else could continue: which branch, what's half-done,
     what to do next, what to watch out for. -->

- UI skeleton (branch `zt/ui-skeleton`): agree with the team what goes where, then move boxes
  around in [ui-skeleton/index.html](ui-skeleton/index.html). Keep it unstyled until the layout
  is agreed. Astronaut C as medical officer and readiness on 0–100 are placeholders, not decisions.
- Go through the app overview in [plan.md](plan.md) with Tommy. It's a draft, open to change.
- Integration (with Tommy): plan how the pieces join, starting with one crew list, the same field
  names, 0–10 scales and one mission clock.
- Finish `shared/PLAN.md` with Tommy and open the pull request. Someone other than zt must approve it.
- Keep [team-jobs.md](team-jobs.md) current at each status check: update the tables and add one
  line to History. It records what people actually do; the agreed split goes in `shared/PLAN.md`.
- Tommy's plan hands zt the UI, starting with the entry screen, log in, sign up and a basic health
  profile (`people/tommy/plan.md`, "First brief"). Not started; its open points need answers first.
