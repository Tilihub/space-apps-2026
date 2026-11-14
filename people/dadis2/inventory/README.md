# Medical inventory and dispensing (prototype)

Owner: dadis2. Part of the team's health monitoring app for a long-duration mission.

It tracks every medicine, consumable and piece of medical equipment, and walks a crew member from a
symptom to the right item in their hand, with safety checks, sign-off by risk tier, a 2D map of the
medical bay, scan-to-confirm and a dose log. The design and the reasons behind it are in [spec.md](spec.md).

> Prototype with sample data. Not medical advice. Not affiliated with NASA.

## Run it

No install or build. Open `index.html` in a browser (double-click it), or serve the folder:

```
cd people/dadis2/inventory
python -m http.server 8000
```

then open http://localhost:8000. Your changes in the demo are saved in your own browser only.
"Reset demo data" at the bottom puts everything back.

## Files

| File | What it is |
|---|---|
| `index.html`, `styles.css` | Page and styles (light and dark) |
| `app.js` | The screens: dashboard, dispense flow, approvals, dose log, bay map |
| `logic.js` | Rules with no UI: expiry, forecast, safety checks, suggestions, sign-off, dispensing (`window.MedLogic`) |
| `data.js` | Sample mission, crew, lockers, packs, items, lots, dose log, requests and symptom reports |
| `spec.md` | Spec: tiers, data model, flows, screens, sources |

## Demo script (about 3 minutes)

1. **Dashboard.** Point at the alerts: sleep aids run out before the mission ends, lots expired or
   at potency risk, and 33 items with lots that expire before the end. Click a row to see its lots and planning expiry.
2. **Dispense → Reports from health monitoring → Ines Sato (congestion, headache).** Acetaminophen
   passes. Ibuprofen and aspirin are blocked (NSAID allergy). Pseudoephedrine is blocked (would dip
   into the reserve). Choose acetaminophen, PIN `3333`, see locker M2 → White pack → slot A1 on the map,
   then *Simulate wrong item* (rejected) and *Simulate correct scan*.
3. **Approvals.** Modafinil for Mara needs a witness: sign as Ines (`3333`). Then *retrieve now*,
   scan, and enter a count that doesn't match to show the discrepancy flag.
4. **Report from Leo (chest pain).** No suggestions: "Get the CMO now". Leo is the CMO, so it names
   the backup CMO.
5. **Emergency button.** Epinephrine for Tomas, no sign-off, skip the scan, then documentation is due within 2 hours.

Demo PINs: Mara 1111, Leo 2222, Ines 3333, Tomas 4444.

## Connecting the health monitoring module

Send a symptom report (format in [spec.md](spec.md), section 8):

```js
MedInventory.receiveSymptomReport({
  type: "symptom-report", version: 1, crewId: "c3",
  symptoms: [{ code: "nasal-congestion", severity: 4 }],
  vitals: { heartRate: 72, spo2: 98, tempC: 36.9 }
});
```

If this page runs in an iframe, `postMessage` the same object to it. You can also paste a report as JSON
on the Dispense screen.

## Status

Works: everything in the demo script. Not done yet: 3D view, restocking in the app, mass and volume
budgets. The symptom codes and report format still need to be agreed with the health monitoring piece.
