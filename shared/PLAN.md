# Plan

Filled in together on Saturday morning, once the team has chosen the idea.
Changes to this file need one teammate's approval on the pull request (see AGENTS.md).

## Challenge

[Health monitoring software](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/), 2026 NASA Space Apps Challenge.

## The idea, in the team's own words

<!-- Written by the team, not by AI (Space Apps rule). -->

## Scope

### Must have (the demo doesn't work without it)

### Nice to have

### Not doing

## Who does what

Every piece of work has an owner and a backup who can continue if the owner leaves.
Add one row per piece. Personal work lives in the owner's `people/<name>/`;
joined pieces live in `integration/<connection>/`.

| Piece of work | Owner | Backup | Where |
|---|---|---|---|
| Submission and demo | | | `shared/submission/` |

## Agreements between pieces

<!-- Anything two pieces must agree on exactly, decided before either side builds it.
     For example: the format of a message one piece sends to another,
     or where the app reads the health content from. -->

All connections follow the onboard app contract, [contract/README.md](contract/README.md)
(version 1): how the app runs (one Node.js server, one module per piece, pages that draw
everything), the shared formats, and exactly what each piece's module provides.

## Timeline

Starts Saturday 09:00 on site. We plan to leave before 21:00 and not work after leaving.
The official deadline is Sunday 15 November, 23:59 local time. Since nobody plans to work after leaving, we submit before leaving on Sunday.

Proposed times; change them on Saturday morning:

| When | What |
|---|---|
| Sat 09:00 | Choose the idea as a team (without AI), fill in this plan, split the work |
| Sat 13:00 | Check-in: everyone says done / doing / blocked |
| Sat 17:00 | Check-in |
| Sat before leaving | Everyone updates their status file and pushes |
| Sun, start of day | Check-in: read the status files, re-plan the day |
| Sun 14:00 | Feature freeze: only fixes, polish and the demo from here on |
| Sun 14:00–19:00 | Rehearse the 7-minute live demo, make the slides, finish the project page |
| Sun 19:00 | Submit for judging (it can still be updated until 23:59) |

If the Local Event has its own judging or presentation slot, add it here.

The submission checklist is in [submission/project-page.md](submission/project-page.md).
