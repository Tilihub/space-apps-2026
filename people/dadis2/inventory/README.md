# Medicine lockers and dispensing (prototype)

Owner: dadis2. Part of the team's health monitoring app for a long-duration mission.

One page per crew member's own device:
- **Left: the medicine panel.**
  - Suggestions from the symptom page (not part of this module).
  - Plans sent from Earth.
  - Request status and "Did it help?".
  - **Request a medicine** and **Import from Earth** buttons.
- **Right: the three real lockers from the front.**
  - Red bins with 🔒 need CMO approval.
  - Tap a bin to pick that medicine.
  - "Find it" dims the other lockers and pulses the bin, and a scan confirms the right box.
- **Rewards:** XP, streaks and badges for safe habits.

The design and the reasons behind it are in [spec.md](spec.md).

> Prototype with sample data. Not medical advice. Not affiliated with NASA.

## Run it

No install or build. Open `index.html` in a browser (double-click it).

- The device belongs to Tomas (`c4`) by default.
- Add `?user=c1`, `c2`, `c3` or `c4` to the address to see another crew member's device, for example
  `index.html?user=c2` for the CMO, who also gets the Stock, Approvals and Log tabs.
- Demo state is saved in your own browser only. "Reset demo" at the bottom puts everything back.

## Test code from Earth

For Tomas (`c4`), starting 14 Nov 2026:

```
RX1-C4-261114-OND1X2X3.CAL2X3X5-BA
```

It means:
- ondansetron 4 mg, 1 tablet twice a day for 3 days
- calcium carbonate, 2 tablets 3 times a day for 5 days

Paste it into **Import from Earth**. The footer button **🌍 Test code from Earth** makes the same kind of
code for whichever user is open, dated today. To make other codes, use the browser console:
`MedInventory.makePlanCode("c4", new Date(), [{ itemId: "melatonin-3", units: 1, perDay: 1, days: 3 }])`.

Scanning a QR code with the camera works where the browser has a built-in barcode detector (for example
Chrome on Android or macOS). Elsewhere the app says so, and you type the code.

## Files

| File | What it is |
|---|---|
| `index.html`, `styles.css` | Page and styles (light and dark, phone and desktop) |
| `app.js` | The one-page medicine and lockers screen, import, emergency, and for the CMO: stock, approvals, log |
| `logic.js` | Rules with no UI: expiry, forecast, safety checks, suggestions, sign-off, dispensing, plan codes (`window.MedLogic`) |
| `data.js` | Sample mission, crew, lockers, shelves, placement, items, lots, plan codes, dose log, requests, XP |
| `spec.md` | Spec: principles, tiers, locker layout, plan codes, gamification, data model, flows, screens, sources |

## Demo script (about 3 minutes)

1. **Tomas's page.** Point at the lockers: the red 🔒 bins need the CMO. Answer "Did Docusate help?" (+10 XP, 🔥).
2. **Headache + stuffy nose** (footer) → "Acetaminophen · 2 tablets" → **Get it** → locker 1 lights up,
   the other two dim, bin 1 pulses → **Demo: scan the wrong box** (it shakes) → **Scan** → Done, +XP.
3. **Import from Earth** → paste the test code → Check → **Add to my plan** → the plan card shows today's
   doses → **Take now** → locker 2 · top shelf · bin 7 → Scan → "On schedule" XP. The next dose shows its time.
4. Tap a red bin (for example Zolpidem) → **Ask the CMO**. Open `?user=c2` → Approvals → sign with PIN `2222`
   (a controlled medicine also needs a witness: Ines, `3333`). Back on `?user=c4`: "Approved · Get it".
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

Works: everything in the demo script, on desktop and phone. Not done yet: restocking in the app, mass
and volume budgets, a QR image generator for the ground side. The symptom codes and report format
still need to be agreed with whoever builds the symptom page.
