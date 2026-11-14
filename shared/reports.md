# Reports

Problems with git, GitHub or the repo's organisation, and changes to how the repo is organised.
zt and Tommy look after these. Whoever adds an entry also tells zt or Tommy in person.

Add new entries at the end. On a conflict in this file, keep both sides.

<!-- Copy this block for each new entry:

## YYYY-MM-DD HH:MM · <name> · <short title>

- Type: problem / structure change
- Status: open
- What happened:
- Branch or pull request:
- Error message, if any:
- What was tried:

-->

## 2026-11-14 16:36 · zt · App contract and module folders

- Type: structure change
- Status: open
- What happened: added `shared/contract/` (the onboard app contract, shared code, an example
  module) and a root `package.json` (Node.js 24, no packages, `npm test`). Both are protected in
  `.github/CODEOWNERS`. The contract gives each piece a new module folder in its owner's
  `people/` folder, and the app imports modules from there without copying them; `AGENTS.md` now
  says so.
- Branch or pull request: `zt/app-contract`
- Error message, if any: none
- What was tried: nothing needed; this entry is for Tommy's awareness.

## 2026-11-14 17:57 · potest · Crew Assistant integration demo

- Type: structure change
- Status: open
- What happened: added `integration/crew-assistant/` for a single-profile synthetic demo joining the PET-1 fixture, Angelos's check-in engine, and the Crew Support adapter.
- Branch or pull request: `potest/crew-support-chat`, PR #55
- Error message, if any: none
- What was tried: verified the four context cases in Chrome and checked the mocked OpenAI requests. The demo README records the remaining app permission and live verification work.
