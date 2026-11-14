# dadis2

## Profile

- GitHub: dadis2
- AI tool: Claude Code (desktop app)
- Operating system: Windows 11

## Now

- Last updated: 2026-11-14 13:07
- Working on: medical inventory and dispensing module (prototype)
- Branch: dadis2/medical-inventory

## Done

- Setup: git, GitHub CLI (logged in), Claude Code, repo cloned
- Onboarding: this status file and plan.md
- Medical inventory module in `people/dadis2/inventory/`: spec (`spec.md`) and a working HTML/JS
  prototype (dashboard, dispense flow with safety checks and sign-off tiers, approvals, dose log,
  2D bay map). Open `index.html` to run it. Tested in a browser.
- Sources for it added to `shared/sources.md`

## Blocked / need from others

- Agree with whoever builds health monitoring on the symptom report format and symptom codes
  (`spec.md`, section 8), then add it to "Agreements between pieces" in `shared/PLAN.md`

## Next steps

<!-- Written so someone else could continue: which branch, what's half-done,
     what to do next, what to watch out for. -->

- Branch `dadis2/medical-inventory`: the prototype works end to end. The demo script is in `inventory/README.md`.
- Next: connect to the health monitoring piece (`MedInventory.receiveSymptomReport`), then pick
  either restocking in the app or a 3D bay view.
- Watch out: tiers, dose limits and reserves in `data.js` are design assumptions with sample data,
  not medical advice.
