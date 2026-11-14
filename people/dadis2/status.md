# dadis2

## Profile

- GitHub: dadis2
- AI tool: Claude Code (desktop app)
- Operating system: Windows 11

## Now

- Last updated: 2026-11-14 13:46
- Working on: medicine lockers and dispensing module, simple version
- Branch: dadis2/medical-inventory

## Done

- Setup and onboarding
- First version of the medical inventory module in `people/dadis2/inventory/` (spec and HTML
  prototype, pushed on `dadis2/medical-inventory`), plus sources in `shared/sources.md`
- Simple version, tested in a browser on desktop and phone. It's on my computer and not pushed yet.
  - The medicine page is the home screen, on each crew member's own device, with no patient picker.
  - Symptoms from the symptom page are suggested automatically when they fit; otherwise
    "Request a medicine" or "Ask the CMO".
  - Lockers: three tall lockers with three shelves each, one colour-coded zone per shelf. "Find it"
    shows the locker from the front with the bin highlighted (Locker · Shelf · Bin).
  - Gamification: XP, levels, streaks and badges for safe habits only (right box first try, quick
    find, answering "Did it help?"), never for taking medicine.
  - Stock, Approvals and Log are only shown to the CMO and backup CMO.

## Blocked / need from others

- Whoever builds the symptom page: agree the symptom report format and symptom codes
  (`inventory/spec.md`, section 8), then add it to "Agreements between pieces" in `shared/PLAN.md`

## Next steps

<!-- Written so someone else could continue: which branch, what's half-done,
     what to do next, what to watch out for. -->

- Push the simple version to `dadis2/medical-inventory` once I've reviewed it. Until then the branch
  on GitHub has the first version.
- Connect the symptom page: it calls `MedInventory.receiveSymptomReport(report)` with the
  device user's `crewId`.
- Watch out: tiers, dose limits, reserves and XP values in `data.js`/`app.js` are design
  assumptions with sample data, not medical advice.
