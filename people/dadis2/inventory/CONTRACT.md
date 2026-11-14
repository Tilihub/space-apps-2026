# Medicine grants: contract for the main app (DAD-1 and DAD-2)

Owner: dadis2. For zt (app composition) and anyone joining this module. Everything here is a
**working proposal**. The shared items in section 6 are placeholders until the team agrees them.

## 1. What a grant is

A grant is one authorisation to collect medicines. It has the **same format** whether it comes from
the **onboard doctor** or from a **flight surgeon on Earth**.

- **Scope:** it names the medicines and doses for one crew member. Only those compartments open,
  never the whole cabinet.
- **Collection is dose by dose.** At each dose time, every compartment of the grant that has a dose
  due opens **together**. The crew member scans each box, and each one is recorded once. Missed
  dose times are not added up, so there's never a double dose.
- **Who may grant what** (team decision, 14 Nov):

| Category | Onboard doctor (CMO, or backup when the CMO is the patient or unavailable) | Earth |
|---|---|---|
| Self-care (white, grey) | Yes | Yes |
| Prescription (purple, brown) | Yes | Yes |
| Controlled (C-II to C-IV, for example zolpidem, modafinil) | **No** | Yes |
| Emergency (red) | Never by grant: Emergency button (break-glass) | Never by grant |

Standing orders are treated as grants from Earth issued before launch.

## 2. The code

```
RX2-EARTH-C4-261114-OND1X2X3.CAL2X3X5-LW
│   │     │  │      │                   └ 2 check characters: catch typing errors only
│   │     │  │      └ medicine code, units per dose X times a day X days, joined by "."
│   │     │  └ start date, YYMMDD (mission local date)
│   │     └ crew member (c4)
│   └ issuer: EARTH, or the onboard doctor's crew id (C2)
└ format version (RX1 codes without an issuer still work and are read as EARTH)
```

- **Medicine codes:** three letters, listed in `data.js` → `rxCodes`, for example OND = ondansetron 4 mg.
- **Limits:**
  - 1 to 9 units per dose
  - 1 to 4 times a day (dose times 08 · 08/20 · 08/14/20 · 08/12/16/20)
  - 1 to 30 days
- **Rejected:**
  - a wrong check (typo)
  - an unknown crew member, issuer or medicine
  - the same medicine listed twice
  - a dose over the daily limit
  - someone else's personal medicine
  - an issuer who isn't allowed that category
  - a grant for another crew member (on this device)
  - a grant already added
  - an expired grant (see section 2a)

## 2a. Identity, validity, reuse, cancelling and verification

| Question | Answer |
|---|---|
| **Identity** | The code itself is the grant's global identity. On a device it also gets a local id (`G41`). |
| **Who it's for** | One crew member, named in the code. Another crew member's device refuses it. |
| **Scope** | Only the medicines in the code, at their dose times. |
| **Valid from / until** | From the start date until the last day of its longest medicine. After that it can't be imported ("expired"). |
| **Reuse** | Added once per device (same code again: "Already added"). Each dose time is collected once. |
| **Cancelling** | The onboard doctor taps "Cancel grant" twice on Approvals. Earth's cancellation would arrive with a report; the logic (`revokeGrant(state, id, "EARTH", now)`) is ready, the transport is zt's or potest's. A cancelled grant opens nothing and shows "Cancelled" to the crew member. |
| **Typo check** | The last 2 characters. They only prove the code was typed correctly. |
| **Sender verification** | **Simulated** (team decision, 14 Nov). It is kept separate from the typo check: every grant has `senderVerified: false` and `verification: "simulated"`, and the app and the Earth tool say "Sender not verified". Grants from the onboard doctor are signed with the doctor's demo PIN on the device (`verification: "onboard doctor PIN"`). |

A real signature is an option for later: Earth signs, devices check with Earth's public key, using
the browser's built-in crypto. Not built.

## 2b. Ground side (Earth)

- **`earth.html`** is the Earth flight surgeon's tool:
  1. choose a crew member, a start date and medicines (units, times a day, days)
  2. get the code and its **QR image**
  3. copy the code, or open it on that crew member's device (demo link)
- **`ground.js`** has the same function without UI, for zt's Earth clinician screen:

```js
// Load data.js, logic.js, vendor/qrcode.js, qr.js and ground.js first
const state = MedLogic.buildState(INVENTORY_DATA, new Date());
MedGround.makeGrant(state, { patientId: "c4", start: "2026-11-14",
  items: [{ itemId: "ondansetron-4", units: 1, perDay: 2, days: 3 }] });
// → { ok: true, code: "RX2-EARTH-C4-261114-OND1X2X3-LI", grant: {…}, validUntil: "2026-11-16",
//     qrSvg: "<svg …>", senderVerified: false, verification: "simulated" }
// → { ok: false, error: "Epinephrine is an emergency medicine: use the Emergency button." }
```

- **The QR image:**
  - holds exactly the code text, so scanning it is the same as typing it
  - uses the QR "alphanumeric" mode, medium error correction
  - is drawn by `vendor/qrcode.js` (qrcode-generator 1.4.4, MIT licence), through `qr.js` (`MedQR.svg(text)`)
  - works offline
- **Link format** for opening a grant on a device: `index.html?user=c4#grant=<code>`. It opens Import
  with the code filled in, and nothing is added until the crew member presses Add.
- **Camera scanning** on the crew device uses the browser's built-in barcode detector. It isn't
  available on Windows desktop browsers, so it's **not tested yet**. Test on Android Chrome; the camera
  needs the page served over HTTPS (or localhost). Typing the code always works.

## 3. Functions

In the page (`window.MedInventory`), for the device's own user:

| Call | Returns |
|---|---|
| `MedInventory.importGrant(code)` | `{ ok: true, grantId }` or `{ ok: false, error }` |
| `MedInventory.grants()` | This user's grants |
| `MedInventory.dueCompartments(grantId)` | Compartments to open now (see below) |
| `MedInventory.makeGrantCode({ issuerId, patientId, start, items })` | A code, for tests or a ground tool |
| `MedInventory.currentUser()` | The device user's crew id |

Pure logic, with no UI (`window.MedLogic`), for tests or another screen:
- `decodeGrant`
- `encodeGrant`
- `canGrant`
- `acceptGrant(state, draft, crewId, now)`
- `addGrant`
- `revokeGrant`
- `grantLastDay`
- `grantDue`
- `grantItemStatus`
- `compartmentOf`

The ground side is `MedGround.makeGrant` (section 2b), and the QR image is `MedQR.svg`.

`dueCompartments` example (14 Nov, 08:30):

```json
[
  { "grantId": "G41", "grantIdx": 0, "itemId": "ondansetron-4", "units": 1, "slot": "2026-11-14@08",
    "compartmentId": "L2-1-07", "lockerId": "L2", "shelfId": "L2-1", "bin": 7 },
  { "grantId": "G41", "grantIdx": 1, "itemId": "calcium-carbonate-500", "units": 2, "slot": "2026-11-14@08",
    "compartmentId": "L1-2-04", "lockerId": "L1", "shelfId": "L1-2", "bin": 4 }
]
```

Compartment id = `<locker>-<shelf level>-<bin, 2 digits>`. Shelf levels: 1 top, 2 middle, 3 bottom.

## 4. Events (for the main app and a future lock or LED bridge)

The page fires `window` events named `medinventory`, and also `postMessage`s them to a parent page
when embedded:

```js
window.addEventListener("medinventory", (e) => console.log(e.detail));
```

| `type` | When | Main fields |
|---|---|---|
| `compartments-open` | "Collect now" pressed | `grantId`, `crewId`, `compartments[]` (id, locker, shelf, bin, item, units, slot) |
| `compartment-collected` | A box scanned and recorded | `grantId`, `crewId`, `compartmentId`, `itemId`, `units`, `slot` |
| `collection-complete` | All boxes of that dose time collected | `grantId`, `crewId`, `slot` |
| `compartments-closed` | Collection cancelled | `grantId`, `crewId`, `compartments[]` (the ids not collected) |
| `grant-cancelled` | The doctor cancelled a grant | `grantId`, `crewId` (whose grant), `by` |

Every event has `at` (ISO 8601 time).

## 5. Collected vs taken

Collecting **is** the dose: one collection = one dose time. Each collection is recorded once in the
dose log, the moment its box is scanned. The record holds:
- `grantId`, `grantIdx` and `slot`
- `auth.type: "grant"` and `auth.signedBy: [issuer]`
- the lot it came from

For controlled medicines, the remaining count is checked and added to that record. Stock goes down
when the box is scanned.

## 6. Shared agreements: placeholders until the team decides

| Thing | Used here for now |
|---|---|
| Crew ids | `c1` to `c4`. A mapping to `astronaut_id` (Angelos) still needs agreeing |
| Clock | Device local time = mission local time. Times in ISO 8601 with offset. Dose times are local hours |
| Symptom reports | `spec.md`, section 8 (`MedInventory.receiveSymptomReport`) |

## 7. Checks

Open `tests.html` in a browser: 28 checks, all passing (14 Nov 2026). They cover:
- the code format
- who may grant what
- binding to the right person, once
- two bins opening together while an unrelated bin stays closed
- one record per collection
- no double doses
- start and end of a course
- compartment ids
- validity, expiry and cancelling
- the ground tool's output and refusals
- the QR image being made from the exact code

Not covered by the checks: reading a QR image back with a camera (see section 2b).
