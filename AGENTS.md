# AGENTS.md — rules for every AI tool and every person in this repo

This is a 6-person team repo for the 2026 NASA Space Apps Challenge (14–15 November 2026).
People use different AI tools (Claude Code, Codex, ChatGPT). Every coding tool reads this file,
so these rules keep everyone's work safe and in sync.

You may talk to your human in any language. Everything you write in this repo is in English.

## Space Apps rules (from the official 2026 Project Submission Guide)

- **Ideas are welcome; the team decides.** Space Apps says AI shouldn't come up with the solution
  idea. The team's core idea comes from the team itself, so suggestions, alternatives and honest
  feedback from you are welcome, but the decisions are the team's.
- **No NASA logos or branding** in anything AI-generated.
- **English** for everything in the repo.

## Where things are

| Path | What it is |
|---|---|
| `docs/PLAN.md` | The idea, scope, who does what, timeline |
| `docs/status/<name>.md` | One file per person: profile, current work, next steps, AI use |
| `docs/decisions/` | One file per team decision |
| `docs/sources.md` | Every source used (NASA data, other references, code libraries, images) |
| `app/`, `hardware/`, `research/`, `submission/` | The work areas |

## First time here: onboarding

Do this when your human asks for onboarding, or when they don't have a file in `docs/status/` yet.

1. Tell your human: this repo is public, so anyone can read what goes in it. They should use a
   first name or nickname, and share only what they're fine with being public.
2. Find out yourself, without asking: their GitHub username (`gh api user --jq .login`),
   their operating system, and which AI tool you are.
3. Ask them these questions, all in one message:
   1. What name should we use for you here? (first name or nickname, lowercase, no spaces.
      It names your status file and your branches)
   2. Git experience: none, some, or comfortable?
   3. Coding experience: which languages (Arduino, C, Python, MATLAB… all count), or none?
   4. What would you like to work on: app, hardware, research, submission, or anything?
   5. Any hardware you can bring (boards, sensors, tools), or none?
   6. When will you be at the event? (Saturday from–to, Sunday from–to)
4. Check git's identity in this repo with `git config user.name` and `git config user.email`.
   If the email is missing or is a personal address, offer to use their private GitHub address
   instead, so it isn't published in this public repo. Get their id with `gh api user --jq .id`
   and their login with `gh api user --jq .login`, then, only if they agree, run
   `git config user.email "<id>+<login>@users.noreply.github.com"`.
   If `user.name` is missing, set it to the name from question 1.
5. Create `docs/status/<name>.md` from `docs/status/TEMPLATE.md`, filled in with what you
   found and their answers.
6. Publish it on the branch `<name>/onboarding`, following "Saving and sharing work" below,
   and merge the pull request yourself.
7. Tell your human it's done, with the link to their file on GitHub.

## Every time you start

1. Get the latest: `git switch main`, then `git pull --ff-only`. If that fails, stop and tell your human.
2. Read `docs/PLAN.md` and the files in `docs/status/` to see where things stand.
3. Work on a branch of your own, named `<name>/<task>` (for example `maria/heart-rate-chart`):
   `git switch -c <name>/<task>`, or `git switch <branch>` to continue one you already have.
   Never work directly on main.

## What you may edit

- Your human's own area, as listed under "Who does what" in `docs/PLAN.md`.
  Until that table is filled in, only their status file.
- Your human's status file, `docs/status/<name>.md`.
- New files in `docs/decisions/` (see "Recording a decision").
- `docs/sources.md`: add rows only, at the end of the right table.

Ask your human before touching anything else. The shared files (`docs/PLAN.md`, `AGENTS.md`,
`SETUP.md`, `README.md`) change only after the team has agreed; ask your human to confirm it has.

## Saving and sharing work

- Commit small and often, with a clear message ending in the `AI-assisted:` line.
- Push at least every hour, and always before your human stops: `git push -u origin <branch>`.
- To bring other people's work into your branch, merge main into it:
  `git fetch origin`, then `git merge origin/main`. Don't rebase.
- When the work is ready to share, open a pull request: `gh pr create --fill`
  (or on the GitHub website).
- Once `app/README.md` lists a command that checks the app still works, run it before merging
  anything that touches `app/`.
- You may merge your own pull request when it has no conflicts with main and it only touches
  your human's area, their status file, `docs/decisions/` and `docs/sources.md`:
  `gh pr merge --merge`. Otherwise ask the owner of the other area to look at it first.

## Conflicts

- In your human's own files: fix them.
- In `docs/sources.md`: keep both sides.
- Anywhere else: stop and tell your human. They sort it out with that file's owner.

## Never

- Push to main directly, force-push, or rebase a branch that is already pushed
- Push to someone else's branch, or delete or rename someone else's files or branches
- Commit passwords, API keys, tokens or `.env` files
- Commit large files: videos, audio and big photo sets go in the team's shared drive
- Put links to the shared drive or any private link in this repo (it's public)

## Recording a decision

When the team decides something that affects more than one person (the idea, the split,
a data format, a tool), create `docs/decisions/YYYY-MM-DD-HHMM-short-title.md` from
`docs/decisions/TEMPLATE.md` and share it like any other work.

## Before your human stops, even for a short break

1. Update their status file: Done, Now, Blocked, and Next steps. If they're leaving for a while,
   write Next steps so someone else could continue: which branch, what's half-done,
   what to do next, what to watch out for.
2. Commit and push. Open a pull request if the work is ready.

## Taking over someone's work

1. Read their status file, especially Next steps.
2. Start your own branch from theirs: `git fetch origin`, then
   `git switch -c <your-name>/<task> origin/<their-branch>`.
3. Note in your human's status file whose work they continued, and from which branch.

## If you're unsure

Ask your human. Never guess with anything that deletes, overwrites or publishes.
