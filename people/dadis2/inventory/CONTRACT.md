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
- **Who may grant what** (dadis2's decision, 14 Nov, evening): Earth has the final say on some
  matters, and **Emergency** is the way out when something truly can't wait, so nothing is ever
  fully locked. This matches `MED_TIERS` in `shared/contract/`.

| Category | Onboard doctor (CMO, or backup when the CMO is the patient or unavailable) | Earth | Can't wait? |
|---|---|---|---|
| Self-care (white, grey) | Yes | Yes | No approval needed |
| Prescription (purple, brown) | Yes | Yes | Emergency: "Can't wait for approval", reason required |
| Controlled (C-II to C-IV, for example zolpidem, modafinil) | **No, Earth decides** | Yes | Emergency: "Can't wait for approval", reason required |
| Emergency (red) | Never by grant | Never by grant | Emergency button, anyone |

- **A doctor never grants to themselves.** When the CMO is the patient, the backup doctor decides
  (prototype) or Earth (the shared contract has no backup).
- **Nobody grants a medicine the person is allergic to** (by class or ingredient). The code is
  refused. In an emergency, only the Emergency screen's two-tap "Give anyway" can release it.
- **Self-care can need the doctor:** when only the reserve is left, or when it isn't safe with the
  person's condition. A grant from the doctor or Earth is then not held back by the reserve or the
  condition. The full table is in `spec.md` §4.
- **Requests:** prescription requests go to the onboard doctor. Controlled requests go to Earth,
  shown as "Waiting for Earth"; a reply takes about 24 minutes. Both show "Can't wait? Emergency".
- **Emergency without approval:**
  - opens the Emergency screen with that medicine ready, under "Can't wait for approval?"
  - a reason is required
  - the dose is logged with `approvalBypassed: true` and the reason
  - the paperwork is due in 2 hours, and Earth reviews it (`groundReview: "pending"`)
  - controlled medicines still get a count check
  - any open request for that medicine is closed as `released-emergency`
- **Standing orders** are treated as grants from Earth issued before launch.

## 1a. Several grants for one person: never a double dose

- **One course per medicine per crew member.** A new grant (from the doctor or Earth) for a medicine
  that already has a running course **replaces** that course: the newest instruction wins. The old
  item is marked `replacedBy: <new grant id>` and never opens again. The import preview and the CMO
  both see "Replaces …", and the crew member's card shows "Replaced".
- **Ingredients are added up across grants.** Different medicines with a shared ingredient (for
  example acetaminophen alone and in oxycodone/acetaminophen) are added up per day. A grant that
  would push the total over the ingredient's daily limit is refused. Two different NSAIDs at the
  same time are refused.
- **At collection time, the 24-hour limits still count every source:** grants, self-care and
  standing orders. A due dose that would break a limit or clash with an allergy shows its reason
  instead of "Due now", and doesn't open. The stock reserve and the person's conditions never hold
  back a granted dose: whoever granted it weighed them.
- **Functions:**
  - `grantConflicts(state, draft, now)` returns `{ replaces, error }`. `acceptGrant` refuses on
    `error`, and `addGrant` applies `replaces`.
  - `grantHold(state, crewId, item, units, now)` returns `{ checks, lot }`: the checks that still
    hold a granted dose back, and the box to take it from.

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
  - a medicine the crew member is allergic to
  - an issuer who isn't allowed that category
  - a grant for another crew member (on this device)
  - a grant already added
  - an expired grant (see section 2a)
  - a grant that would go over an ingredient's daily limit together with other grants, or add a
    second NSAID (section 1a)

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
- **Camera scanning** on the crew device uses the browser's own QR reader where there is one, and
  otherwise jsQR (`vendor/jsQR.js`, Apache-2.0), so it works on Windows laptops too (`MedQR.read`
  in `qr.js`).
  - The camera needs the page on `localhost` or HTTPS: `node people/dadis2/inventory/serve.mjs`.
  - A QR code holding a `#grant=<code>` link works as well.
  - Tested with a simulated camera, not yet with a real webcam. Typing the code always works.
- **Importing a code answers the crew member's waiting requests** for the same medicines (they become
  granted). Same in the `meds` module.
- **For the presentation:** `earth-reply.html` and `earth-reply-qr.svg` hold a ready-made Earth grant
  for Tomas (`RX2-EARTH-C4-261114-ZOL1X1X7-9Z`). See README, "Presentation".

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

Open `tests.html` in a browser: 43 checks, all passing (14 Nov 2026). They cover:
- who may grant what: controlled medicines by Earth only, no self-grants, and an emergency release
  without approval being logged for review
- each person's situation: allergy (no grant), condition and reserve (the doctor decides, and the grant
  isn't held back), daily limit (wait), and no self-care locked by the sample stock
- one course per medicine (replacing), adding up ingredients across grants, and two NSAIDs
- the code format
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
