# dadis2

## Profile

- GitHub: dadis2
- AI tool: Claude Code (desktop app)
- Operating system: Windows 11

## Now

- Last updated: 2026-11-14 17:26
- Working on: DAD-2 (Tommy's handoff) is done and pushed on `dadis2/ground-grants`, no pull request yet.
  PRs #34 and #44 are waiting for the project lead to merge them.
- Branch: dadis2/ground-grants (started from `dadis2/prescription-grants`, PR #44)

## Done

- Setup and onboarding
- Medicine lockers and dispensing module in `people/dadis2/inventory/`. PR #34 is waiting for the
  project lead to merge it: https://github.com/Tilihub/space-apps-2026/pull/34
  - One page per crew member's device: medicine panel plus the three lockers from the front.
  - Automatic suggestions from symptoms, red 🔒 tint for medicines that need approval.
  - Emergency flow with allergy warnings and a logged two-tap override.
- **DAD-1: prescription grants**, PR #44 waiting for the project lead:
  https://github.com/Tilihub/space-apps-2026/pull/44
  - One grant format for the onboard doctor and Earth (code `RX2-<issuer>-<crew>-<date>-<items>-<check>`).
  - Self-care and prescription → onboard doctor or Earth; controlled → Earth only; emergency → never.
  - Dose by dose: all of a grant's due compartments open together, each box recorded once, no double doses.
- **DAD-2: ground side** (branch `dadis2/ground-grants`), with my decision of 14 Nov to keep sender
  verification simulated for now:
  - `earth.html`: the Earth flight surgeon's tool. Pick a crew member and medicines → grant code and QR
    image → copy, or open it on the crew member's device (demo link `index.html?user=c4#grant=<code>`).
  - `ground.js` (`MedGround.makeGrant`) for zt's Earth clinician screen; `qr.js` (`MedQR.svg`) using the
    QR library qrcode-generator 1.4.4 (MIT, in `inventory/vendor/`, listed in `shared/sources.md`).
  - Validity: a grant can be imported until the last day of its course, then it's "expired".
  - Cancelling: the CMO taps "Cancel grant" twice on Approvals (also "Show QR" there). A cancelled grant
    opens nothing and shows "Cancelled". Cancelling from Earth: logic ready, delivery not built.
  - Typo check and sender verification are separate: every grant says `senderVerified: false`,
    `verification: "simulated"`, and the app and Earth tool say "Sender not verified".
  - Contract updated: `inventory/CONTRACT.md` (sections 2a and 2b). Checks: `inventory/tests.html`,
    28 of 28 pass. Tested end to end in a browser.

## Blocked / need from others

- zt: confirm the grant contract (`inventory/CONTRACT.md`) and the placeholders it uses for now:
  crew ids `c1`–`c4`, device local time as mission time, symptom report format (`spec.md` §8).
  Also: delivering a cancellation from Earth needs the report link (zt or potest).
- Whoever builds the symptom page (probably angelos): agree the symptom report format and codes.
- Tommy: gamification is on hold as he asked. The XP code is still there, untouched; nothing new added.

## Next steps

<!-- Written so someone else could continue: which branch, what's half-done,
     what to do next, what to watch out for. -->

- Open a pull request for `dadis2/ground-grants`. It contains #34's and #44's commits until those are
  merged; ideally they're merged in order #34, #44, then this one.
- Test QR camera scanning on an Android phone (Chrome, page over HTTPS). Quick check without the app:
  point a phone camera at the QR in `earth.html`; it should show exactly the code.
- Optional later: real sender verification (Earth signs, devices check with Earth's public key), see
  `inventory/CONTRACT.md` §2a.
- Watch out: tiers, dose limits, reserves, the sample allergies and dose times (08/14/20) are design
  assumptions with sample data, not medical advice.
