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

**Checks:** open `tests.html`. All 19 checks should say PASS.

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
Chrome on Android or macOS). Elsewhere the app says so, and you type the code.

## Files

| File | What it is |
|---|---|
| `index.html`, `styles.css` | Page and styles (light and dark, phone and desktop) |
| `app.js` | The one-page medicine and lockers screen, grants and collection, import, emergency, and for the CMO: stock, approvals, log |
| `logic.js` | Rules with no UI: expiry, forecast, safety checks, suggestions, grants, dispensing (`window.MedLogic`) |
| `data.js` | Sample mission, crew, lockers, shelves, placement, items, lots, medicine codes, dose log, requests |
| `CONTRACT.md` | Grants: code, who grants what, functions, compartment ids, events |
| `tests.html`, `tests.js` | Regression checks for grants and collection |
| `spec.md` | Spec: principles, tiers, locker layout, grants, data model, flows, screens, sources |

## Demo script (about 3 minutes)

1. **Tomas's page.** Point at the lockers: the red 🔒 bins need approval.
2. **Headache + stuffy nose** (footer) → "Acetaminophen · 2 tablets" → **Get it** → locker 1 lights up and
   bin 1 pulses → **Demo: scan the wrong box** (it shakes) → **Scan** → Done.
3. **Import from Earth** → paste the test code → Check → **Add** → the grant card says "Due now" →
   **Collect now (2 bins)** → locker 2 · top · bin 7 and locker 1 · middle · bin 4 light up together,
   locker 3 stays dim → **Demo: scan a box not in this grant** (refused) → **Scan** twice → Collected.
   The card now shows the next dose time.
4. Tap Promethazine (red) → **Ask the CMO**. Tap Zolpidem → **Ask Earth** (controlled).
   Open `?user=c2` → Approvals:
   - promethazine: choose a course, sign with PIN `2222` → **Grant**
   - zolpidem: under "Waiting for Earth" → **Demo: Earth grants it**

   Back on `?user=c4`: two grant cards → **Collect now** (zolpidem asks for a count).
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

Works: everything in the demo script and all checks in `tests.html`.

Not done yet (DAD-2):
- a QR image generator and screen for the ground side
- real verification of who issued a grant (simulated now)
- QR camera scanning tested on a phone

The crew ids, mission clock and symptom format are placeholders until the team agrees them
(`CONTRACT.md`, section 6).
