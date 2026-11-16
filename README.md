# Space Apps 2026 — team repo

Team repository for the 2026 NASA Space Apps Challenge (14–15 November 2026).

At the end of the hackathon this README becomes the project's public page.
Until then, it explains how the team works.

## New here?

1. Follow [SETUP.md](SETUP.md) to install the tools and get access.
2. Open your AI coding tool in this folder and say: **"Read AGENTS.md and do the onboarding."**

## How the repo is organised

Work moves in one direction: `people/` → `integration/` → `final/`, with `shared/` feeding everyone.

| Folder | What goes there | Who edits it |
|---|---|---|
| [`people/`](people/) | One folder per person: experiments, drafts, anything, plus their `status.md` and personal `plan.md` | Only that person |
| [`shared/`](shared/) | Everything for everyone: the [plan](shared/PLAN.md), [decisions](shared/decisions/), [sources](shared/sources.md), research, data, the submission draft | Anyone adds files; ask before changing someone else's |
| [`integration/`](integration/) | Where pieces get joined, one folder per connection | Whoever is doing that connection |
| [`final/`](final/) | Only the finished product | Changes only with a teammate's approval |

Changes to the common plan, `final/` and the rules files need one teammate's approval on the
pull request; GitHub enforces this. The rules every person and every AI tool follows are in
[AGENTS.md](AGENTS.md).
Keep each file under 50 MB; GitHub refuses anything over 100 MB.
