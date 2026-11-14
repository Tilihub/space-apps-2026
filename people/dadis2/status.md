# dadis2

## Profile

- GitHub: dadis2
- AI tool: Claude Code (desktop app)
- Operating system: Windows 11

## Now

- Last updated: 2026-11-14 15:11
- Working on: DAD-1 (Tommy's handoff): one grant opens all and only its prescribed compartments
  together. Done and pushed on `dadis2/prescription-grants`, no pull request yet.
- Branch: dadis2/prescription-grants (started from `dadis2/medical-inventory`, PR #34, plus latest main)

## Done

- Setup and onboarding
- Medicine lockers and dispensing module in `people/dadis2/inventory/`. PR #34 is waiting for the
  project lead to merge it: https://github.com/Tilihub/space-apps-2026/pull/34
  - One page per crew member's device: medicine panel plus the three lockers from the front.
  - Automatic suggestions from symptoms, red 🔒 tint for medicines that need approval.
  - Emergency flow with allergy warnings and a logged two-tap override.
- **DAD-1: prescription grants** (branch `dadis2/prescription-grants`), with decisions agreed with my
  team-mate's tool on 14 Nov:
  - One grant format for the onboard doctor and Earth (code `RX2-<issuer>-<crew>-<date>-<items>-<check>`,
    typed or QR). Older RX1 codes still work.
  - Who grants what: self-care and prescription → onboard doctor or Earth; controlled → Earth only;
    emergency → never by grant (break-glass).
  - Collection is dose by dose: at each dose time all of the grant's due compartments open together,
    and nothing else does. Each scanned box is recorded once, and missed doses aren't added up.
  - The CMO's Approvals screen issues grants (course + PIN). Controlled requests wait for Earth (demo
    button simulates Earth's reply).
  - Output for zt and a future lock bridge: compartment ids (`L2-1-07`), `MedInventory.importGrant`,
    `grants`, `dueCompartments`, and `medinventory` events (`compartments-open`,
    `compartment-collected`, `collection-complete`, `compartments-closed`).
  - Contract: `inventory/CONTRACT.md`. Checks: `inventory/tests.html`, 19 of 19 pass. Also tested
    end to end in a browser.

## Blocked / need from others

- zt: confirm the grant contract (`inventory/CONTRACT.md`) and the placeholders it uses for now:
  crew ids `c1`–`c4`, device local time as mission time, symptom report format (`spec.md` §8).
- Whoever builds the symptom page (probably angelos): agree the symptom report format and codes.
- Tommy: gamification is on hold as he asked. The XP code is still there, untouched; nothing new added.

## Next steps

<!-- Written so someone else could continue: which branch, what's half-done,
     what to do next, what to watch out for. -->

- Open a pull request for `dadis2/prescription-grants` (it also contains PR #34's commits until #34
  is merged).
- DAD-2: ground-side screen with a QR image generator, a short contract for zt's Earth clinician
  screen, and real (or clearly labelled simulated) verification of who issued a grant. Keep the
  typed-code fallback; test camera scanning on a phone.
- Watch out: tiers, dose limits, reserves, the sample allergies and dose times (08/14/20) are design
  assumptions with sample data, not medical advice.
