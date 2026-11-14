# Medicine lockers and dispensing (prototype)

Owner: dadis2. Part of the team's health monitoring app for a long-duration mission.

One page per crew member's own device:
- **Left: the medicine panel.**
  - Suggestions from the symptom page (not part of this module).
  - Grants from the onboard doctor or Earth, with "Collect now" at each dose time.
  - Request status and "Did it help?".
  - **Request a medicine** and **Import from Earth** buttons.
- **Right: the three real lockers from the front.**
  - Red bins with 🔒 need approval.
  - Tap a bin to pick that medicine.
  - "Collect now" lights up all the bins of that dose time together, and a scan confirms each box.
- **Rewards:** XP, streaks and badges for safe habits (on hold: gamification is deferred by the team).

The design is in [spec.md](spec.md). The contract for the main app (grants, compartment ids,
events) is in [CONTRACT.md](CONTRACT.md).

> Prototype with sample data. Not medical advice. Not affiliated with NASA.

## Run it

No install or build. Open `index.html` in a browser (double-click it).

- The device belongs to Tomas (`c4`) by default.
- Add `?user=c1`, `c2`, `c3` or `c4` to the address to see another crew member's device, for example
  `index.html?user=c2` for Leo, the CMO, who also gets the Stock, Approvals and Log tabs.
- Demo state is saved in your own browser only. "Reset demo" at the bottom puts everything back.

**Checks:** open `tests.html`. All 37 checks should say PASS.

**Earth side:** open `earth.html`, the flight surgeon's tool. Choose a crew member and medicines to
get the grant code and its QR image. "Open on …'s device (demo)" opens it in the crew app, ready to add.
Who sent a grant is not verified yet (simulated, labelled as such).

## Test code from Earth

For Tomas (`c4`), starting 14 Nov 2026:

```
RX2-EARTH-C4-261114-OND1X2X3.CAL2X3X5-LW
```

It means:
- ondansetron 4 mg, 1 tablet twice a day for 3 days
- calcium carbonate, 2 tablets 3 times a day for 5 days

Paste it into **Import from Earth**. The footer button **🌍 Test code from Earth** makes the same
grant for whichever user is open, dated today. To make other codes, use the browser console:

```js
MedInventory.makeGrantCode({ issuerId: "EARTH", patientId: "c4", start: new Date(), items: [{ itemId: "melatonin-3", units: 1, perDay: 1, days: 3 }] })
```

Scanning a QR code with the camera works where the browser has a built-in barcode detector (for example
Chrome on Android or macOS). Elsewhere the app says so, and you type the code. A quick check: point
your phone's camera at the QR in `earth.html`. It should show exactly the code underneath it.

## Files

| File | What it is |
|---|---|
| `index.html`, `styles.css` | Page and styles (light and dark, phone and desktop) |
| `app.js` | The one-page medicine and lockers screen, grants and collection, import, emergency, and for the CMO: stock, approvals, log |
| `logic.js` | Rules with no UI: expiry, forecast, safety checks, suggestions, grants, dispensing (`window.MedLogic`) |
| `data.js` | Sample mission, crew, lockers, shelves, placement, items, lots, medicine codes, dose log, requests |
| `earth.html`, `earth.js` | Earth flight surgeon's tool: makes a grant code and its QR image |
| `ground.js` | `MedGround.makeGrant`: the ground side without UI, for zt's Earth clinician screen |
| `qr.js`, `vendor/qrcode.js` | QR image drawing (`MedQR.svg`), using qrcode-generator 1.4.4 (MIT, licence in `vendor/`) |
| `CONTRACT.md` | Grants: code, who grants what, validity, cancelling, verification, ground side, functions, compartment ids, events |
| `tests.html`, `tests.js` | Regression checks for grants, collection, validity, cancelling, ground tool and QR |
| `spec.md` | Spec: principles, tiers, locker layout, grants, data model, flows, screens, sources |

## Demo script (about 3 minutes)

1. **Tomas's page.** Point at the lockers: the red 🔒 bins need approval.
2. **Headache + stuffy nose** (footer) → "Acetaminophen · 2 tablets" → **Get it** → locker 1 lights up and
   bin 1 pulses → **Demo: scan the wrong box** (it shakes) → **Scan** → Done.
3. **Import from Earth** → paste the test code → Check → **Add** → the grant card says "Due now" →
   **Collect now (2 bins)** → locker 2 · top · bin 7 and locker 1 · middle · bin 4 light up together,
   locker 3 stays dim → **Demo: scan a box not in this grant** (refused) → **Scan** twice → Collected.
   The card now shows the next dose time.
4. Tap Promethazine (red) → **Ask the CMO**. Tap Zolpidem (controlled) → **Ask Earth**: Earth has the final
   say. Open `?user=c2` → Approvals:
   - promethazine: choose a course, sign as Leo with PIN `2222` → **Grant**
   - zolpidem: under "Waiting for Earth" → **Demo: Earth grants it**

   Back on `?user=c4`: two grant cards → **Collect now** (zolpidem asks for a count).
4a. **No double doses:** grant ondansetron to Tomas again (from Leo, or a new code from `earth.html`).
   The preview says "Replaces Ondansetron …", the older card shows "Replaced", and only one
   ondansetron dose is ever due.
   On `?user=c2` → Approvals → Active grants: **Show QR** and **Cancel grant** (two taps). Tomas then
   sees "Cancelled".
4b. **Earth side:** open `earth.html` → pick Tomas and medicines → the code and QR appear →
   **Open on Tomas's device** → Import with the code filled in → **Add**.
4c. **Can't wait:** ask for zolpidem again, then press **Can't wait? Emergency** on its "Waiting for Earth"
   card. Emergency opens with the medicine ready. A reason is required, then **Release now**. It's logged
   as "released without approval", the paperwork is due in 2 hours, and Earth reviews it.
5. **Chest pain** → "Call the CMO now". **Emergency** → Epinephrine → Release now → locker 3.
6. **Emergency for Mara** (sample allergy: ketamine) → the Ketamine tile shows ⚠ Allergy → a red warning →
   "Give anyway" needs a second tap → the override shows on the CMO's Approvals and Log.

Demo PINs (CMO screens only): Mara 1111, Leo 2222, Ines 3333, Tomas 4444.

## Connecting the symptom page

Send a symptom report for the device's user (format in [spec.md](spec.md), section 8):

```js
MedInventory.receiveSymptomReport({
  type: "symptom-report", version: 1, crewId: MedInventory.currentUser(),
  symptoms: [{ code: "headache", severity: 3 }],
  vitals: { heartRate: 72, spo2: 98, tempC: 36.9 }
});
```

If this page runs in an iframe, `postMessage` the same object to it.

## Status

Works: everything in the demo script and all checks in `tests.html`, including DAD-2's ground tool,
QR image, validity and cancelling.

Not done yet:
- **Who issued a grant isn't verified.** It's simulated by team decision and labelled everywhere. A real
  signature is described in `CONTRACT.md`, section 2a.
- **QR camera scanning** hasn't been tested on a phone yet. It needs Android Chrome and the page served
  over HTTPS.
- **Cancelling from Earth** has its logic ready, but nothing delivers it yet (that needs the report
  link from zt or potest).

The crew ids, mission clock and symptom format are placeholders until the team agrees them
(`CONTRACT.md`, section 6).
