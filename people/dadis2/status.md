# dadis2

## Profile

- GitHub: dadis2
- AI tool: Claude Code (desktop app)
- Operating system: Windows 11

## Now

- Last updated: 2026-11-14 17:57
- Working on: grant safety fixes merged into main (PR #58). DAD-1 and DAD-2 are merged too
  (#34, #44, #53). Next: the `meds` module.
- Branch: dadis2/grant-safety

## Done

- Setup and onboarding
- Medicine lockers and dispensing module in `people/dadis2/inventory/` (PR #34, merged):
  - One page per crew member's device: medicine panel plus the three lockers from the front.
  - Automatic suggestions from symptoms, red 🔒 tint for medicines that need approval.
  - Emergency flow with allergy warnings and a logged two-tap override.
- **DAD-1: prescription grants** (PR #44, merged):
  - One grant format for the onboard doctor and Earth (code `RX2-<issuer>-<crew>-<date>-<items>-<check>`).
  - Self-care and prescription → onboard doctor or Earth; controlled → Earth only; emergency → never.
  - Dose by dose: all of a grant's due compartments open together, each box recorded once, no double doses.
- **DAD-2: ground side** (PR #53), with my decision of 14 Nov to keep sender verification simulated for now:
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

- **Grant safety fixes** (PR #58, merged), my decisions of 14 Nov, evening:
  - No double doses: one course per medicine per crew member. A newer grant (doctor or Earth)
    replaces the running course, ingredients are added up across grants (daily limits), and two
    NSAIDs at once are refused. A due dose that a safety check holds back shows why on the card.
  - Earth has the final say on controlled medicines, and on the doctor's own medicines (a doctor
    never grants to themselves; the backup doctor or Earth does). Controlled requests show
    "Waiting for Earth".
  - Nothing is fully locked: every waiting request has "Can't wait? Emergency". Emergency's
    "Can't wait for approval?" section releases a prescription or controlled medicine without
    approval. It needs a reason, is logged (`approvalBypassed: true`), has paperwork due in 2 hours
    and goes to Earth's review. It closes the open request.
  - Checks: `inventory/tests.html`, 37 of 37 pass. Tested in the browser.

## Blocked / need from others

- **zt (contract owner):** the grant rules now match `shared/contract/` (controlled → Earth, Leo as
  the patient → Earth). Two things to agree at the table:
  - The contract says "Only the emergency items are released" in an emergency. My prototype also
    lets a prescription or controlled medicine out under "Can't wait for approval?", with a reason,
    logging and Earth's review.
  - Add "one course per medicine per crew member" (a newer grant replaces the running course,
    ingredient totals across grants) to the contract.

  Either change to the contract needs a pull request a teammate approves.
- **zt:** the contract gives me wave 1 of the `meds` module (`people/dadis2/meds/`, Node.js, no
  screens, `npm test`), planned before we leave Saturday. Not started yet.

- zt: confirm the grant contract (`inventory/CONTRACT.md`) and the placeholders it uses for now:
  crew ids `c1`–`c4`, device local time as mission time, symptom report format (`spec.md` §8).
  Also: delivering a cancellation from Earth needs the report link (zt or potest).
- Whoever builds the symptom page (probably angelos): agree the symptom report format and codes.
- Tommy: gamification is on hold as he asked. The XP code is still there, untouched; nothing new added.

## Next steps

<!-- Written so someone else could continue: which branch, what's half-done,
     what to do next, what to watch out for. -->

- Everything is on main: open `people/dadis2/inventory/index.html` (crew app), `earth.html` (Earth
  tool) and `tests.html` (37 checks). The demo script is in `inventory/README.md`.
- Start the `meds` module (`people/dadis2/meds/`, Node.js) from `shared/contract/example/`, wave 1,
  before we leave Saturday. Reuse the rules in `inventory/logic.js`.
- Test QR camera scanning on an Android phone (Chrome, page over HTTPS). Quick check without the app:
  point a phone camera at the QR in `earth.html`; it should show exactly the code.
- Optional later: real sender verification (Earth signs, devices check with Earth's public key), see
  `inventory/CONTRACT.md` §2a.
- Watch out: tiers, dose limits, reserves, the sample allergies and dose times (08/14/20) are design
  assumptions with sample data, not medical advice.
