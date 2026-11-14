# Medicine grants: contract for the main app (DAD-1)

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
- **The issuer is not verified yet.** The check characters only catch typos. In the app a grant from
  Earth shows "Sender not verified yet (demo)", and its `verification` field is `"simulated"`.
  Grants from the onboard doctor are signed with the doctor's demo PIN (`"onboard doctor PIN"`).
  Real verification is DAD-2.

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
- `acceptGrant`
- `addGrant`
- `grantDue`
- `grantItemStatus`
- `compartmentOf`

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

Open `tests.html` in a browser: 19 checks, all passing (14 Nov 2026). They cover:
- the code format
- who may grant what
- binding to the right person, once
- two bins opening together while an unrelated bin stays closed
- one record per collection
- no double doses
- start and end of a course
- compartment ids
