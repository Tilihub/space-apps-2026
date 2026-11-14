# dadis2

## Profile

- GitHub: dadis2
- AI tool: Claude Code (desktop app)
- Operating system: Windows 11

## Now

- Last updated: 2026-11-14 14:19
- Working on: medicine lockers and dispensing module. Pull request #34 is open and waiting for the
  project lead to merge it: https://github.com/Tilihub/space-apps-2026/pull/34
- Branch: dadis2/medical-inventory

## Done

- Setup and onboarding
- Medicine lockers and dispensing module in `people/dadis2/inventory/` (spec, README, HTML
  prototype), pushed on `dadis2/medical-inventory`, plus sources in `shared/sources.md`.
  Tested in a browser on desktop and phone:
  - One page on each crew member's own device, with no patient picker: the medicine panel on the
    left, the three lockers seen from the front on the right.
  - Symptoms from the symptom page are suggested automatically when they fit; otherwise
    "Request a medicine" or "Ask the CMO".
  - Lockers: three tall lockers with three shelves each, one colour-coded zone per shelf. "Find it"
    dims the other lockers and pulses the bin (Locker · Shelf · Bin). Pills that need CMO approval
    are tinted red with 🔒.
  - "Import from Earth": a flight surgeon's plan (medicine, dose, times a day, days) as a short
    typed code or QR code, with a check against typos. Test code is in `inventory/README.md`.
  - Emergency: requests are kept, and an active retrieval is paused (Resume). Allergies show per
    person. A clashing medicine gets a red warning and "Give anyway" (two taps), and the override is
    logged for the CMO and ground.
  - Gamification: XP, levels, streaks and badges for safe habits only, never for taking extra medicine.
  - Stock, Approvals and Log are only shown to the CMO and backup CMO.

## Blocked / need from others

- Whoever builds the symptom page: agree the symptom report format and symptom codes
  (`inventory/spec.md`, section 8), then add it to "Agreements between pieces" in `shared/PLAN.md`

## Next steps

<!-- Written so someone else could continue: which branch, what's half-done,
     what to do next, what to watch out for. -->

- Branch `dadis2/medical-inventory` has the working prototype. Open `inventory/index.html`; the
  demo script is in `inventory/README.md`. Pull request #34 is waiting for the project lead to merge it.
- Connect the symptom page: it calls `MedInventory.receiveSymptomReport(report)` with the
  device user's `crewId`.
- Not built yet: QR camera scanning was only tested in its fallback (this Windows browser has no
  barcode detector); there's no QR image generator for the ground side; no restocking in the app.
- Watch out: tiers, dose limits, reserves, XP values and the sample allergies in `data.js`/`app.js`
  are design assumptions with sample data, not medical advice.
