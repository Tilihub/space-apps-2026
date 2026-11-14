# AGENTS.md — rules for every AI tool and every person in this repo

This is a 6-person team repo for the 2026 NASA Space Apps Challenge (14–15 November 2026).
People use different AI tools (Claude Code, Codex, ChatGPT). Every coding tool reads this file,
so these rules keep everyone's work safe and in sync.

You may talk to your human in any language. Everything you write in this repo is in English.
Assume everyone has some git experience.

## Space Apps rules (from the official 2026 Project Submission Guide)

- **Ideas are welcome; the team decides.** Space Apps says AI shouldn't come up with the solution
  idea. The team's core idea comes from the team itself, so suggestions, alternatives and honest
  feedback from you are welcome, but the decisions are the team's.
- **No NASA logos or branding** in anything AI-generated.
- **English** for everything in the repo.

## How the repo is organised

Work moves in one direction: `people/` → `integration/` → `final/`, with `shared/` feeding everyone.

| Folder | What goes there | Who edits it |
|---|---|---|
| `people/<name>/` | Each person's own space: experiments, drafts, anything, plus their `status.md` and personal `plan.md` | Only that person |
| `shared/` | Everything for everyone: `PLAN.md`, `decisions/`, `sources.md`, `research/`, data, `submission/` | Anyone adds files; ask before changing someone else's |
| `integration/` | Where pieces get joined: one folder per connection (for example `integration/app-cabinet/`), each a working test | Whoever is doing that connection |
| `final/` | Only the finished product, built from what already works in `integration/` | Changes only with a teammate's approval |

## First time here: onboarding

Do this when your human asks for onboarding, or when they don't have a folder in `people/` yet.

1. Tell your human: this repo is public, so anyone can read what goes in it. They should use a
   first name or nickname, and share only what they're fine with being public.
2. Find out yourself, without asking: their GitHub username (`gh api user --jq .login`),
   their operating system, and which AI tool you are.
3. Ask them one question: what name should we use for you here? (first name or nickname,
   lowercase, no spaces. It names your folder and your branches)
4. Check git's identity in this repo with `git config user.name` and `git config user.email`.
   If the email is missing or is a personal address, offer to use their private GitHub address
   instead, so it isn't published in this public repo. Get their id with `gh api user --jq .id`
   and their login with `gh api user --jq .login`, then, only if they agree, run
   `git config user.email "<id>+<login>@users.noreply.github.com"`.
   If `user.name` is missing, set it to the name from step 3.
5. Create `people/<name>/` from `people/_template/`: `status.md` filled in with their name and
   what you found, and `plan.md` with their name.
6. Publish it on the branch `<name>/onboarding`, following "Saving and sharing work" below,
   and merge the pull request yourself.
7. Tell your human it's done, with the link to their folder on GitHub.

## Every time you start

1. Get the latest: `git switch main`, then `git pull --ff-only`. If that fails, stop and tell your human.
2. Read `shared/PLAN.md` and every `people/*/status.md` to see where things stand.
3. Work on a branch of your own, named `<name>/<task>` (for example `maria/heart-rate-chart`):
   `git switch -c <name>/<task>`, or `git switch <branch>` to continue one you already have.
   Never work directly on main.

## What you may edit

- `people/<name>/`, your human's own folder: anything, including their personal plan, `plan.md`.
- `shared/`: add new files freely. Change a file someone else made only if they agree.
  In `shared/sources.md`, add rows only, at the end of the right table.
  In `shared/decisions/`, add new files only.
  In `shared/reports.md`, add entries only, at the end (zt's and Tommy's tools may also mark
  entries solved).
- `integration/<connection>/`: only a connection your human is working on. To start one, create
  its folder with a short `README.md`: what it joins, which people's work it uses, how to run it,
  and whether it works yet.
- `shared/PLAN.md`, `shared/contract/`, `final/`, `package.json` and the rules files
  (`AGENTS.md`, `CLAUDE.md`, `SETUP.md`, `README.md`, `.github/`): only through a pull request
  that another teammate approves. See "Changes that need approval".

Never edit someone else's `people/` folder. To use their work, copy what you need into your
human's folder or into `integration/`. The one exception is an app module (see "Building a piece
of the app"): the app imports it from its owner's folder without copying it.

## Building a piece of the app

The app is one onboard server (Node.js 24, JavaScript, no npm packages) with one module per
piece, and browser pages that draw everything. [shared/contract/README.md](shared/contract/README.md)
says exactly what each module must provide: its folder, its paths, the data it sends and
receives, and who may call it. If your human builds a piece of the app:

- Read the contract first, and build to it exactly, so joining the pieces is only the final link.
  Start from the example module in `shared/contract/example/`.
- Your module lives in the folder the contract names for your human. Only your human edits it.
- Run `npm test` from the repo root before every push. It must pass.
- If the contract doesn't fit what you need, don't work around it: tell your human to ask zt, and
  change the contract through a pull request a teammate approves.

## Saving and sharing work

- Commit small and often, with a clear message. Leave AI attribution out of commits and pull
  requests (no `Co-Authored-By` or "Generated with" lines); the team discloses AI use itself.
- After every finished step (something that works, a pull request opened or merged, or a switch
  to a new task), update `people/<name>/status.md` (Now, Done, Next steps) and include it in the
  same push.
- Push at least every hour, and always before your human stops: `git push -u origin <branch>`.
- To bring other people's work into your branch, merge main into it:
  `git fetch origin`, then `git merge origin/main`. Don't rebase.
- When the work is ready to share, open a pull request: `gh pr create --fill`
  (or on the GitHub website).
- Once `final/README.md` lists a command that checks the product still works, run it before
  merging anything that touches `final/`.
- You may merge your own pull request when it has no conflicts with main and it only touches
  your human's folder, new files in `shared/`, rows in `shared/sources.md`, entries in
  `shared/reports.md`, or an `integration/` connection your human is working on:
  `gh pr merge --merge`. Anything else needs agreement first:
  from the author, for someone else's file in `shared/`, or a teammate's approval for protected
  files (see "Changes that need approval").

## Changes that need approval

`shared/PLAN.md`, `shared/contract/`, `final/`, `package.json` and the rules files are protected:
GitHub merges a change to them only after someone other than its author approves it. The owners are listed in `.github/CODEOWNERS`.

1. Make the change on your branch and open a pull request. GitHub asks the rest of the team
   to review it.
2. Tell your human to say it out loud at the table, so a teammate looks at it.
3. Once a teammate has approved it, merge it: `gh pr merge --merge`.

Never approve a pull request unless your human explicitly tells you to. When they do:
`gh pr review <number> --approve`.

Ideas for the common plan start in your human's own `plan.md`. When they want the team to adopt
one, propose it as a change to `shared/PLAN.md`.

## Conflicts

- In your human's own files: fix them.
- In `shared/sources.md` and `shared/reports.md`: keep both sides.
- Anywhere else: stop and tell your human. They sort it out with that file's owner.

## Reporting problems and structure changes

zt (GitHub `Tilihub`) and Tommy (GitHub `tommy2002t`) look after the repo's setup. Report to them
when something goes wrong with git, GitHub or the repo's organisation that you can't fix within
these rules, or when you change how the repo is organised (for example a new folder outside your
human's own, or a shared file moved or renamed):

1. Add an entry at the end of `shared/reports.md`, using the template at the top of that file,
   and publish it like any other work.
2. Tell your human to tell zt or Tommy in person.

If the problem stops you from publishing (for example, a push fails), skip step 1: tell your human
to show zt or Tommy the error in person.

A pull request waiting for a teammate's approval is normal, not a problem.

**If your human is zt or Tommy:** when they ask you to check the reports, read `shared/reports.md`,
explain each open entry and help fix it. When one is solved, change its status to `solved`
with a line on how.

## Never

- Push to main directly, force-push, or rebase a branch that is already pushed
- Push to someone else's branch, or delete or rename someone else's files or branches
- Commit passwords, API keys, tokens or `.env` files
- Commit files over 50 MB: GitHub refuses anything over 100 MB, so compress big videos and photos first
- Put private links in this repo (it's public)

## Recording a decision

When the team decides something that affects more than one person (the idea, the split,
a data format, a tool), create `shared/decisions/YYYY-MM-DD-HHMM-short-title.md` from
`shared/decisions/TEMPLATE.md` and share it like any other work.

## Before your human stops, even for a short break

1. Update `people/<name>/status.md`: Done, Now, Blocked, and Next steps. If they're leaving for
   a while, write Next steps so someone else could continue: which branch, what's half-done,
   what to do next, what to watch out for.
2. Commit and push. Open a pull request if the work is ready.

## Taking over someone's work

1. Read their `people/<their-name>/status.md`, especially Next steps.
2. If their latest work is on a branch that isn't merged yet, start your own branch from it:
   `git fetch origin`, then `git switch -c <your-name>/<task> origin/<their-branch>`.
3. Continue in your human's own folder or in `integration/`, copying what you need from theirs.
   Don't edit their folder.
4. Note in your human's status file whose work they continued, and from which branch.

## If you're unsure

Ask your human. Never guess with anything that deletes, overwrites or publishes.
