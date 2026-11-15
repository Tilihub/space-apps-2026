# dadis2

## Profile

- GitHub: dadis2
- AI tool: Claude Code (desktop app)
- Operating system: Windows 11

## Now

- Last updated: 2026-11-15 12:02
- Working on: a lean medical officer console and Earth console in Tommy's complete demo (PR #74,
  approved by me), on `dadis2/mo-console` (pushed, not in main, no PR). It includes `dadis2/earth-qr`.
  `npm test` 111 of 111.
- Branch: dadis2/mo-console

### Medical officer and Earth consoles (`dadis2/mo-console`, based on Tommy's `tommy/frontend-polish`)

- **Medical officer console** (login → "Medical officer"): four tabs instead of every panel at once.
  - **Approvals:** approve or deny everything waiting for the medical officer, each with a compact
    course. Earth's requests are shown read-only.
  - **Inventory:** take any medicine or supply for any crew member, with no further approval (an
    allergy asks "give anyway"); stock folded away.
  - **Patients:** the clinical summary, latest symptoms and allergies.
  - **Reports to Earth.**
- **The medical officer's Medical bay cabinet** is fully open: a bin → "Take (no approval needed)".
- **Earth console:** pills waiting for Earth with Approve and Deny, and Earth's reply QR for Tomas
  (`RX2-EARTH-C4-261114-ZOL1X1X7-9Z`, the same as `inventory/earth-reply-qr.svg`). The code generator
  and demo controls are folded away.
- **`meds` module:** the medical officer route (`source: "medical-officer"`, logged), and two approval
  routes only (no Earth exception when Leo is the patient, as Tommy asked). Both are listed for zt in
  `meds/README.md`, items 10 and 11; the contract text needs a change.
- **Reasons:** a request (not an emergency) needs a reason: "Why do you need it? (required)", checked
  on the server too. In an emergency the reason is optional ("What happened? (optional)").
  - After a request, the message says who decides: "Sent to Earth" for controlled medicines
    (zolpidem, modafinil), otherwise "Sent to the medical officer".
  - Listed for zt as item 12.
- **Not mine to merge alone:** the page changes are in `integration/onboard-app/pages/` (zt's and
  Tommy's). Bring them into PR #74, or open a PR they approve.

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
- **Approval review** (PR #62, merged), my decisions of 14 Nov, evening:
  - Pseudoephedrine was locked for everyone: 10 in stock, reserve 12. Added a sample lot (now 50).
  - Per person, for self-care:
    - reserve or a condition → the CMO decides, and the grant isn't held back by it (before, it was
      a dead end: granted but never collectable)
    - daily limit → wait
    - allergy → nobody grants it (any tier); only Emergency's "Give anyway"
  - Bins: 🔒 red = needs approval, with who and why on hover. Dimmed = not for you now.
  - Emergency screen: "Also used in emergencies" (aspirin for chest pain, diphenhydramine tablets,
    gauze, gloves, splint), for whoever needs help, no reason needed, warnings with "Give anyway".
    Every override now goes to Earth's review.
  - Checks: 43 of 43 pass. Tested in the browser. Demo steps 7 and 8 in `inventory/README.md`.
- **meds module, wave 1** (`people/dadis2/meds/`, PR #66, merged), built to
  `shared/contract/` section 8:
  - All 14 wave 1 routes: symptom reports and suggestions, profile and allergies, lockers,
    collections, requests and decisions, grants and import, doses and "Did it help?".
  - Dispensary style, as the team agreed: one batch of everything due now. The cabinet dispenses each
    item (simulated) and the crew member confirms it once; stock and the dose log change only then.
  - Tommy's decisions: the same grant code entered again finds the same grant (reusable
    credential); prescribed amounts are fixed; self-care amounts are the crew member's choice within
    the limits; allergies always block, even with a valid grant.
  - Both bugs Tommy found in #58 are fixed here: a replacement no longer offers a dose already
    collected, and a replacement starting later doesn't stop the current course early.
  - Contract data: crew `c1`–`c5`, Tomas (`c4`) with the NSAID allergy, Leo the only medical officer
    (his own requests go to Earth), UTC mission time from `ctx.now()`, severity 1–10.
  - Codes from the prototype's `earth.html` work in the module.
  - Tests: 18, starting with the contract's wave 1 walk-through (§12 steps 3–6). `npm test` with
    main merged in: 69 of 69 pass.
- **meds module, wave 2** (PR #70, merged), to the contract (emergency items only):
  - `POST /emergencies` (any crew member, for anyone), `GET /emergencies` (crew see only who and
    when; Leo sees everything), `POST /emergencies/:id/paperwork` (Leo only, due in 2 hours).
  - Emergency release through `POST /collections` (`emergencyId`, `itemId`, `overrideAllergy`):
    no approval, no reserve check, scan may be skipped, logged on the emergency and as Kai's dose.
    An allergy blocks unless "give anyway" (`overrideAllergy: true`), which is logged.
  - `GET /stock` (Leo only): epinephrine goes below its reserve after scene C's release.
  - Tests follow scenes C and E. `npm test` with main merged in: 78 of 78 pass (26 are meds).

- **Earth's reply as a QR code** (branch `dadis2/earth-qr`), for the presentation:
  - The laptop camera now reads QR codes in any browser, Windows included: the browser's own
    reader if it has one, otherwise jsQR 1.4.0 (Apache-2.0), committed in `inventory/vendor/` and
    listed in `shared/sources.md`.
  - `earth-reply.html` and `earth-reply-qr.svg`: Earth's answer to Tomas's sleeping-pill request,
    zolpidem 5 mg once a day for 7 days (`RX2-EARTH-C4-261114-ZOL1X1X7-9Z`).
  - Scanning shows the recipe exactly like typing the code. Add answers the waiting request (both in
    the prototype and in the `meds` module).
  - `serve.mjs`: a local server (Node.js only) so the camera works on localhost.
  - Tested in the browser with a simulated camera (tilted, blurred QR). Checks: prototype 43 of 43,
    `npm test` 91 of 91.

## Blocked / need from others

- **zt (contract owner):** the grant rules now match `shared/contract/` (controlled → Earth, Leo as
  the patient → Earth). Two things to agree at the table:
  - The contract says "Only the emergency items are released" in an emergency. My prototype also
    lets a prescription or controlled medicine out under "Can't wait for approval?", with a reason,
    logging and Earth's review.
  - Add "one course per medicine per crew member" (a newer grant replaces the running course,
    ingredient totals across grants) to the contract.

  Either change to the contract needs a pull request a teammate approves.
- **zt:** `meds` waves 1 and 2 are ready to link into the core. Where it differs from the
  contract's wording (code re-entry returns the grant, a few extra fields, error codes, the
  `emergency` source) is listed in `meds/README.md`, "For zt". Nothing can be tried joined until
  the core server exists.
- **zt and Tommy:** scene E has Leo "answer the sleeping-pill request". If that's zolpidem, it's
  controlled, so the contract sends it to Earth and Leo can't approve it. Pick a prescription
  medicine for the scene, or show it waiting for Earth.

- zt: confirm the grant contract (`inventory/CONTRACT.md`) and the placeholders it uses for now:
  crew ids `c1`–`c4`, device local time as mission time, symptom report format (`spec.md` §8).
  Also: delivering a cancellation from Earth needs the report link (zt or potest).
- Whoever builds the symptom page (probably angelos): agree the symptom report format and codes.
- Tommy: gamification is on hold as he asked. The XP code is still there, untouched; nothing new added.

## Next steps

<!-- Written so someone else could continue: which branch, what's half-done,
     what to do next, what to watch out for. -->

- **Presentation QR** (branch `dadis2/earth-qr`, then main): the steps for the presentation laptop are in
  `inventory/README.md`, "Presentation: Earth's reply as a QR code". In short:
  - `git pull`
  - `node people/dadis2/inventory/serve.mjs`
  - open `http://localhost:8080/index.html?user=c4`
  - Import from Earth → 📷 Scan QR
  - hold up `inventory/earth-reply-qr.svg` (on a phone or printed)

  The QR reader (jsQR) is committed, so nothing to download. Try it once with the real webcam
  before presenting; it's only been tested with a simulated camera.

- Everything is on main: open `people/dadis2/inventory/index.html` (crew app), `earth.html` (Earth
  tool) and `tests.html` (43 checks). The demo script is in `inventory/README.md`. The save key is now `medInventory.v5`,
  so the demo starts fresh once.
- "Also used in emergencies" is a proof-of-concept sample (`emergencyUse` in `inventory/data.js`);
  medical accuracy isn't the point.
- `meds` module: waves 1 and 2 are on main (PRs #66, #70). Left: `POST /grants/code` for the Earth
  console ("later"; port
  `inventory/ground.js`), and joining with zt's core once it exists. Run `npm test` from the repo
  root before every push (Node.js v26 is installed).
- Test QR camera scanning on an Android phone (Chrome, page over HTTPS). Quick check without the app:
  point a phone camera at the QR in `earth.html`; it should show exactly the code.
- Optional later: real sender verification (Earth signs, devices check with Earth's public key), see
  `inventory/CONTRACT.md` §2a.
- Watch out: tiers, dose limits, reserves, the sample allergies and dose times (08/14/20) are design
  assumptions with sample data, not medical advice.
