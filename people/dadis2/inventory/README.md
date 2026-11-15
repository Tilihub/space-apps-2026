# Medicine lockers and dispensing (prototype)

Owner: dadis2. Part of the team's health monitoring app for a long-duration mission.

One page per crew member's own device:
- **Left: the medicine panel.**
  - Suggestions from the symptom page (not part of this module).
  - Grants from the onboard doctor or Earth, with "Collect now" at each dose time.
  - Request status and "Did it help?".
  - **Request a medicine** and **Import from Earth** buttons.
- **Right: the three real lockers from the front.**
  - Red bins with 🔒 need approval (from the CMO, or Earth). Dimmed bins aren't for you right now
    (allergy ⚠, daily limit, none left, someone else's). Hover a bin to see why.
  - Tap a bin to pick that medicine.
  - "Collect now" lights up all the bins of that dose time together, and a scan confirms each box.
- **Rewards:** XP, streaks and badges for safe habits (on hold: gamification is deferred by the team).

The design is in [spec.md](spec.md). The contract for the main app (grants, compartment ids,
events) is in [CONTRACT.md](CONTRACT.md).

> Prototype with sample data. Not medical advice. Not affiliated with NASA.

## Run it

No install or build. Open `index.html` in a browser (double-click it).

For the **camera** (scanning Earth's QR code), open it from the small local server instead, because
browsers allow the camera on `localhost`. It needs Node.js 24 or newer, and nothing else:

```bash
node people/dadis2/inventory/serve.mjs
```

Then open `http://localhost:8080/index.html?user=c4` in Chrome or Edge. Stop the server with Ctrl+C.

- The device belongs to Tomas (`c4`) by default.
- Add `?user=c1`, `c2`, `c3` or `c4` to the address to see another crew member's device, for example
  `index.html?user=c2` for Leo, the CMO, who also gets the Stock, Approvals and Log tabs.
- Demo state is saved in your own browser only. "Reset demo" at the bottom puts everything back.

**Checks:** open `tests.html`. All 43 checks should say PASS.

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

Scanning a QR code with the camera works in every browser, Windows laptops included. It uses the browser's
own QR reader where there is one, and otherwise jsQR (`vendor/jsQR.js`). Typing the code always works.

## Presentation: Earth's reply as a QR code

The story: Tomas asked for a sleeping pill, which only Earth may approve. Earth's reply arrives as a QR
code, and the laptop's camera reads it into the app, exactly like typing the code.

**The QR code** (Tomas, zolpidem 5 mg, once a day for 7 days, from 14 Nov):
- **On a phone:** open [`earth-reply-qr.svg`](earth-reply-qr.svg) on GitHub, and turn the brightness up.
- **On paper:** open `earth-reply-qr.svg` or `earth-reply.html` and print it.
- **On a second laptop:** open `http://localhost:8080/earth-reply.html` (it shows the recipe too).

Its code, if the camera won't cooperate: `RX2-EARTH-C4-261114-ZOL1X1X7-9Z`. It's valid until 20 Nov.
After that, open `earth-reply.html?start=today` for one dated today.

**On the presentation laptop:**
1. Get the latest with `git switch main`, then `git pull`. The QR reader is in the repo, so there's
   nothing to download.
2. Start the server: `node people/dadis2/inventory/serve.mjs`.
3. Open `http://localhost:8080/index.html?user=c4` and press **Reset demo** at the bottom.
4. Optional: tap **Zolpidem** → **Ask Earth**. The card says "Waiting for Earth".
5. **Import from Earth** → **📷 Scan QR**, and allow the camera when the browser asks.
6. Hold the QR code up to the camera, about 30 cm away, filling about a third of the picture. The recipe
   appears.
7. **Add**. The app answers "It answers your request", and the grant card offers **Collect now**.

**If `vendor/jsQR.js` is missing** (for example, only some files were copied), download it again from the
repo root. It's jsQR 1.4.0, 256,885 bytes:

```bash
curl.exe -L -o people/dadis2/inventory/vendor/jsQR.js https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js
```

On macOS or Linux, use `curl` instead of `curl.exe`.

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
| `qr.js`, `vendor/jsQR.js` | QR reading from the camera (`MedQR.read`), using jsQR 1.4.0 (Apache-2.0, licence in `vendor/`) where the browser has no reader of its own |
| `earth-reply.html`, `earth-reply-qr.svg` | Earth's reply for the presentation: the QR code of a ready-made grant for Tomas |
| `serve.mjs` | A small local server (Node.js only), so the camera works: `node people/dadis2/inventory/serve.mjs` |
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
7. **Who decides, per person.** On `?user=c4` (Tomas, bleeding risk), ibuprofen and aspirin are red: "Not safe
   for you: the CMO decides". On `?user=c3` (Ines, NSAID allergy) they're dimmed with ⚠: nobody grants them.
   Pseudoephedrine is plain self-care for both.
8. **Also used in emergencies:** Emergency → choose Ines → **Aspirin** (chest pain) → ⚠ Allergy → **Give anyway**
   twice, no reason needed → logged and sent to Earth's review. **Gauze** → **Show me** lights its bin.

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
- **QR camera scanning** is tested in the browser with a simulated camera (a tilted, blurred QR code),
  but not yet with a real laptop webcam. Try it before the presentation.
- **Cancelling from Earth** has its logic ready, but nothing delivers it yet (that needs the report
  link from zt or potest).

The crew ids, mission clock and symptom format are placeholders until the team agrees them
(`CONTRACT.md`, section 6).
