# Medical inventory and dispensing module: spec

Owner: dadis2. Status: draft, prototype in this folder (`index.html`).

A module for the team's health monitoring app. It tracks every medicine, consumable and piece of
medical equipment on a long-duration mission, and guides a crew member from "I have a symptom" to
"I'm holding the right item, and it's logged". Safety rules depend on how risky the item is.

**Design principles (from the team):**
- The simplest instructions possible, with as few words as possible.
- As much gamification as possible.
- The app runs on each crew member's own device, so there's no patient picker.
- The medicine page is the home screen.
- Symptoms are entered on another page, outside this module. When they match a self-care item,
  that item is suggested automatically. Otherwise the crew member can request a medicine themselves.

> Prototype with sample data. Not medical advice. Tier rules, thresholds and dose limits are design
> assumptions for a demo and would need review by a flight surgeon. Not affiliated with NASA, and no
> NASA logos or branding are used.

## 1. Scope

**Must have (demo)**

- Inventory dashboard: stock per item and lot, expiry, potency risk, supply forecast, alerts
- Items organised by colour-coded zones, located down to locker → shelf → bin
- Four safety tiers with the right gate for each: self-care, CMO sign-off, two-person sign-off,
  emergency break-glass
- Automatic suggestions from symptom reports, with safety checks and red-flag escalation
- Retrieval: locker front view with the bin highlighted → scan to confirm → log the dose
- Gamification for safe habits (XP, levels, streaks, badges)
- Dose log with follow-up (did it work, side effects), and an approvals / review queue
- Takes symptom reports from the health monitoring module (format in section 8)

**Nice to have**

- 3D view of the medical bay
- Restocking and moving items between slots in the app
- Mass and volume budget per pack
- Potency screening results per lot (for example from an on-board Raman spectrometer)

**Not doing**

- Real diagnosis or treatment decisions
- Real authentication (demo PINs only)

## 2. What it's based on

Details and references: [Sources](#12-sources) below and the team's
[`shared/research/gemini-health-monitoring-and-medical-care.md`](../../../shared/research/gemini-health-monitoring-and-medical-care.md).

- **Packs:** the ISS medical kit is organised in colour-coded packs: Convenience Medication
  (white), Oral Medication (purple), Topical & Injectable Medication (brown), Emergency Medical
  Treatment (red), Medical Diagnostic (blue) and Medical Supply (green). Each crew member also has
  a crew-specific kit.
- **Tracking:** ISS medical inventory is still mostly manual. RFID covers lockers and kits, not
  individual items. Item-level tracking is what NASA's planned AMIS system is meant to add.
- **Usage:** sleep aids, pain relievers and congestion/allergy medicines are used most. Sleep aid use
  is about 10× higher than on Earth. Over-the-counter use is rarely recorded unless crew are
  actively prompted (the Dose Tracker study).
- **Who decides:** crew take common medicines without asking first. Flight surgeons are on the
  ground, and the crew has a Crew Medical Officer (CMO), who is usually not a physician. Towards Mars the
  one-way signal delay is up to about 20 minutes, so the crew must decide on board.
- **Shelf life:** about 60–98% of ISS medicines would expire before a Mars mission ends, and there's no
  resupply. Liquids and some drugs (for example melatonin, promethazine, nitroglycerin, eye drops)
  degrade faster.

There is no public NASA severity scale for medicines. **The tiers below are our own design.**

## 3. Physical storage model

`Medical bay → Locker → Pack → Slot → Lot`

| Pack | Colour | Contents | Source |
|---|---|---|---|
| Emergency Medical Treatment | Red | Emergency medicines, AED, airway | NASA ISS checklist |
| Convenience Medication | White | High-use over-the-counter medicines | NASA ISS checklist |
| Oral Medication | Purple | Prescription and controlled tablets | NASA ISS checklist |
| Topical & Injectable Medication | Brown | Creams, ointments, injectables | NASA ISS checklist |
| Medical Diagnostic | Blue | Thermometer, BP monitor, oximeter, test strips | NASA ISS checklist |
| Medical Supply | Green | Dressings, gloves, syringes, splints | NASA ISS checklist |
| Crew-specific | Grey | Each person's own prescriptions | Our colour choice |

Our locker layout (design, not NASA's): three tall lockers side by side, with three shelves each.
Each shelf is one colour-coded medicine zone holding numbered bins (left to right, top row first).
Directions are always just **Locker · Shelf · Bin**, for example "Locker 1 · Top shelf · Bin 1".

| Locker | Top shelf | Middle shelf | Bottom shelf |
|---|---|---|---|
| 1 Everyday | White: pain, fever, colds | White: stomach, sleep, eyes | Grey: personal |
| 2 Prescription | Purple: prescription tablets | Brown: creams and injections | Blue: check-up tools |
| 3 Emergency (red top) | Red: emergency medicines | Red: emergency equipment | Green: supplies |

Placement is one table in `data.js` (`placement`), so it's easy to change. Every lot has a tag
(barcode or RFID), so a scan confirms the right box came out. Bins have retention straps for
microgravity, and the last instruction is always to close the bin and the locker.

## 4. Safety tiers (our design)

| Tier | Typical items | Who can release it | Ground review |
|---|---|---|---|
| **S: Supply** | Bandages, gloves, alcohol pads | Anyone | No |
| **1: Self-care** | Over-the-counter: acetaminophen, loratadine, meclizine | The crew member, after automatic safety checks | No |
| **2: Prescription** | Antibiotics, ondansetron, injectables | A grant from the onboard doctor (CMO, or backup if the patient is the CMO) or from Earth | No |
| **3: Controlled** | Zolpidem, modafinil, opioids, benzodiazepines | A grant from Earth (final say). If it can't wait: Emergency, with a reason, logged. The crew member confirms the count left in the bin | Yes, asynchronous |
| **4: Emergency** | Epinephrine, atropine, naloxone, AED | Anyone, immediately (break-glass) | Yes, plus documentation within 2 hours |

Rules:

- **Standing orders.** A crew member can have a medicine pre-approved before launch, for example
  zolpidem 1 per night. Within its limits they release it themselves with their own PIN. The count
  check and ground review still apply. This keeps the most-used controlled medicine (sleep aids)
  from needing a CMO every night.
- **CMO as patient.** The approver must never be the patient. If the CMO is the patient, the backup CMO signs.
- **Grants (team decision, 14 Nov).** The onboard doctor and Earth authorise with the same grant
  format, collected dose by dose. Details are in [CONTRACT.md](CONTRACT.md).
- **Reserve.** Every item has a reserve kept for the conditions it's carried for. A self-care
  dispense that would dip into the reserve becomes a CMO decision.
- **Crew-specific items.** Only their owner can self-release them.
- **Requests** (dadis2, 14 Nov, evening):
  - Prescription requests go to the CMO's Approvals screen, on the CMO's own device. The doctor
    picks a course (times a day, days), signs with their PIN and issues a grant.
  - Controlled medicines go to Earth, which has the final say. A doctor never grants to themselves.
  - The crew member sees "Waiting for the CMO" or "Waiting for Earth", always with "Can't wait?
    Emergency", then a grant card with "Collect now".
  - Emergency without approval needs a reason and is logged and reviewed. Nothing is ever fully
    locked.
- **One course per medicine.** A newer grant for the same medicine replaces the running course, and
  ingredients are added up across grants. See [CONTRACT.md](CONTRACT.md) §1a.
- **Break-glass.** It is never blocked. The reason is required, the event goes to the approvals page as
  "documentation due", and the scan can be skipped.

## 5. Symptom suggestions (tier S and 1 only)

1. **Red flags first.** Escalate to the CMO with no suggestions if any of these is true:
   - the symptom is itself a red flag (chest pain, shortness of breath, severe headache with
     neurological signs, eye injury, loss of consciousness, throat swelling, heavy bleeding, severe
     abdominal pain)
   - a symptom's severity is 8/10 or more
   - temperature ≥ 39.0 °C
   - SpO₂ < 92%
   - heart rate > 120 or < 45
   - systolic BP ≥ 180 or < 90
2. **Candidates.** Self-care and supply items whose indications match a symptom, plus the patient's
   own standing orders and crew-specific items.
3. **Checks per candidate.** Each check gives *pass*, *warn* or *block*:

| Check | Block when | Warn when |
|---|---|---|
| Allergy | Item class matches a crew allergy (for example NSAID, penicillin) | – |
| Contraindication | Item conflicts with a crew condition (for example NSAID with GI bleeding risk) | – |
| Daily maximum | This dose would exceed the ingredient's 24-hour limit | – |
| Same class | Another NSAID in the last 24 h | Another sedating medicine in the last 12 h |
| Duplicate ingredient | – | Same ingredient taken from a different product in the last 24 h |
| EVA | – | Sedating, and the crew member has an EVA within 24 h |
| Stock and reserve | No usable lot, or the dose would dip into the reserve | – |
| Expiry | Only expired lots left | Only lots past the planning expiry (potency at risk) |

4. **Ranking.** Blocked items are shown greyed out with the reason. The rest are sorted by how many
   symptoms they match, then by fewest warnings.

Suggestions are advice. The crew member chooses, and can always ask the CMO instead.

## 6. Expiry, potency and supply forecast

- **Labelled expiry.** The date on the lot.
- **Planning expiry.** The labelled expiry minus a margin for the space environment: stable solids
  0 months, moderate 3 months, sensitive (liquids, injectables, known in-flight degraders) 6
  months. *Assumption for the demo, not a NASA figure.*
- **Lot status.** Expired > potency at risk (past planning expiry) > expires before mission end > OK.
- **Use rate.** Units used in the last 30 days ÷ 30. With no recent use, the planned rate from the
  formulary is used. Emergency items always use the planned rate, because one recent event says
  little about future use.
- **Coverage.** Simulate using lots first-expiry-first-out at the use rate. Each lot is usable until
  its planning expiry. Coverage = days until stock runs out or every remaining lot has expired.
  If coverage is shorter than the days left in the mission, the item is either:
  - *short*: there aren't enough units even if nothing expired, so the crew will run out, or
  - *expiry-limited*: there are enough units, but they expire first.

  *Waste* means units that expire before they can be used.
- **Alerts.**
  - expired lots
  - lots at potency risk
  - lots that expire before mission end
  - shortfall
  - below reserve
  - pending approvals
  - documentation due
  - ground reviews pending
  - count discrepancies

## 7. Data model

All ids are strings. Dates are ISO 8601.

- **Mission:** `name, startDate, durationDays, commDelayMin`
- **CrewMember:** `id, name, role, isCMO, isBackupCMO, allergies[], conditions[], standingOrders[{itemId, maxPerDay}], nextEVA, pin` (demo only)
- **Locker:** `id, label, zone, x, y, w, h` (position on the bay map)
- **Pack:** `id, name, colour, lockerId, rows, cols`
- **Item:** `id, name, form, strength, packId, kind (medication | supply | equipment), tier (S|1|2|3|4), controlled (C-II…C-IV | null), ingredients[{name, mg}], doseUnits, classes[], indications[], contraindications[], sedating, stability (stable | moderate | sensitive), reserve, plannedUsePer30d, ownerCrewId`
- **Lot:** `id, itemId, lotNumber, qty, expiry, slot, tag`
- **Symptom:** `code, label, redFlag`
- **ApprovalRequest:** `id, time, patientId, itemId, qty, reason, tier, status (pending | approved | denied | dispensed), signatures[{crewId, role, time}]`
- **DoseLogEntry:** `id, time, patientId, itemId, lotId, qty, reason, auth {type: self | standing-order | cmo | cmo+witness | break-glass, signedBy[]}, groundReview (n/a | pending | done), docsDue, documentation, countCheck {expected, counted}, followUp {effective, sideEffects}`

Shared reference tables (sample values): `ingredientLimits` (max mg per 24 h) and `redFlagVitals`.

## 8. Interface with the health monitoring module (proposal)

To be agreed with whoever builds health monitoring, and then recorded under "Agreements between
pieces" in `shared/PLAN.md`.

```json
{
  "type": "symptom-report",
  "version": 1,
  "crewId": "c3",
  "time": "2026-11-14T08:10:00Z",
  "symptoms": [{ "code": "nasal-congestion", "severity": 4 }],
  "vitals": { "heartRate": 72, "spo2": 98, "tempC": 36.9, "systolic": 118, "diastolic": 76 }
}
```

- `severity` 0–10. `vitals` and each vital are optional.
- Symptom codes come from the shared list in `data.js` (`symptoms`).
- `crewId` must be the device's user. Reports for anyone else are rejected.
- Delivery: call `MedInventory.receiveSymptomReport(report)`, or `postMessage(report)` if the
  module runs in an iframe. The home screen then shows the suggestion straight away.

## 8a. Grants (onboard doctor and Earth)

The full contract is in [CONTRACT.md](CONTRACT.md). In short:

- **Same format for both.** One grant names the medicines, units, times a day and days for one crew
  member. The same format is used by the onboard doctor (issued on the Approvals screen) and by Earth
  (typed code or QR, for example `RX2-EARTH-C4-261114-OND1X2X3.CAL2X3X5-LW`).
- **Dose by dose, together.** At each dose time all of the grant's due compartments open together,
  and nothing else does. Each scanned box is recorded once. Missed dose times are not added up.
- **Who grants what.** Controlled medicines need Earth. Emergency items are never granted.
- **Not verified yet.** The check characters only catch typos. Who issued a grant is not verified
  yet (simulated, DAD-2).
- **Output for the main app and hardware.** Compartment ids such as `L2-1-07`, plus `medinventory`
  events (`compartments-open`, `compartment-collected`, `collection-complete`, `compartments-closed`).
- **QR scanning** uses the browser's built-in barcode detector where available. Elsewhere, type the code.
- **Checks:** `tests.html`.

## 9. User flows

**Symptoms match a self-care item:** a report arrives from the symptom page → a card on the home
screen: "For your headache · Acetaminophen · 2 tablets · Get it" → find it (locker front view with
the bin highlighted) → Scan → Done (+XP) → later: "Did it help?" 👍/👎 (+XP).

**Symptoms need approval:** card "Ask the CMO" → Ask → "Waiting for the CMO" (or "Waiting for
Earth" if controlled) → a grant is issued → a grant card with "Collect now" → all due bins light up
together → scan each box → (count check if controlled) → Collected.

**Grant from Earth:** "Import from Earth" → scan the QR code or type the code → Check → Add → grant
card → "Collect now" at each dose time.

**Red flags:** card "Call the CMO now" with an Emergency button. The report also appears as
"Urgent symptoms" on the CMO's Approvals screen.

**Own choice:** "Request a medicine" → tiles grouped "You can take" and "Ask the CMO" → item →
"Get it" or "Ask the CMO".

**Emergency:** Emergency button → who needs help (defaults to me) → item → Release now → find it →
Scan or Skip → logged. The CMO writes the note within 2 hours. No points are given in emergencies.

- **Nothing is lost.** Requests and plans are kept; the screen says so. A retrieval in progress is
  paused and shows as "⏸ Paused · Resume" afterwards.
- **Allergies and conditions** show on each "Who needs help?" button (🚫 penicillin, ⚠ bleeding risk).
- **Never a hard block.** In an emergency the medicine may be the only option, so nothing is
  blocked outright.
- **Warnings instead.** If the chosen medicine matches the patient's allergy or condition, goes over
  the daily limit, or clashes with a recent dose, the tile shows ⚠ and a red warning box explains
  it in plain words.
- **"Give anyway".** "Release now" becomes "Give anyway" and needs a second deliberate tap ("Tap
  again to give anyway").
- **Overrides are logged.** The release records which warnings were overridden. They show on the done
  screen, on the CMO's emergency note and ground review cards, and in the dose log.

## 10. Screens

Everyone sees one page (the CMO also has tabs):

1. **Left: the medicine panel.**
   - Cards: the suggestion from symptoms, the plan from Earth with today's dose dots, request
     status and "Did it help?".
   - Buttons: **Request a medicine** and **Import from Earth**.
   - Badges.
   - The left panel also shows Request, Import, Emergency and Find it. On Find it it shows
     "Locker · Shelf · Bin" in large type, a timer and a Scan button.
2. **Right: the three lockers from the front.**
   - **Red tint and 🔒:** the medicine needs CMO approval for this user (prescription, controlled
     without a standing order, or blocked by a safety check).
   - **Tap a bin** to pick that medicine.
   - **Picking an item** outlines its bin.
   - **Finding an item:** the other lockers dim, the target shelf is outlined and the bin pulses yellow.
3. **Phone:** the panels stack. While finding, only the target locker is shown, under a strip of the
   three lockers, and the Scan bar is fixed at the bottom.
4. **Header:** name, level, XP bar, 🔥 streak, Emergency button.

CMO and backup CMO only: **Stock** (alerts and the inventory table), **Approvals** (urgent symptoms,
requests to sign with PIN and witness, emergency notes, count mismatches, ground review) and **Log**
(every dose, JSON export).

Colour is never the only cue: every zone, chip and badge also has text.

## 10a. Gamification

The points reward safe habits only, never taking extra medicine. The only dose points are for
following a doctor's plan on time, and you can't earn them twice for the same dose time.

| Action | XP |
|---|---|
| Right box on the first scan | +10 |
| Found it (retrieval completed) | +5 |
| Found within 30 s | +5 |
| Answered "Did it help?" | +10, and the 🔥 streak grows |
| Took a dose from the Earth plan when it was due | +5 |

- **Levels:** every 100 XP.
- **Badges:** First find, Sharp eye (5 right boxes first try), Good reporter (5 answers), Speedy
  (found in under 20 s), Plan complete.
- **Personal best** find time.
- **No points in emergencies.**

## 11. Open questions

- Agree the symptom codes and report format with the health monitoring piece.
- Which mission profile does the team demo (Moon, Mars transit, Mars surface)? This sets the mission
  length and signal delay in `data.js`.
- Would the team rather have the 3D view or restocking as the next feature?

## 12. Sources

| Topic | Source |
|---|---|
| Pack colours and names | [NASA ISS medical kit checklist](https://www.nasa.gov/wp-content/uploads/2015/03/medical_kit_checklist_-_full_release.pdf) |
| ISS medicines in packs | [WikEM: common medication list on board ISS](https://wikem.org/wiki/Common_medication_list_onboard_ISS) |
| Item-level tracking gap, AMIS, RFID | [NASA AMIS briefing, AsMA 2024](https://ntrs.nasa.gov/api/citations/20240004505/downloads/AMIS_AsMA_2024_final.pdf) |
| Expiry before mission end | [Expiration analysis of the ISS formulary (npj Microgravity, 2024)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11266549/) |
| Stability in flight | [NASA OCHMO technical brief: pharmaceuticals](https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-006-pharmaceuticals.pdf) |
| Medication use on ISS | [Wotring, 2015, via ScienceDaily](https://www.sciencedaily.com/releases/2015/11/151102131511.htm) |
| Dose Tracker, reporting gap | [Aerospace Medicine and Human Performance, 2023](https://meridian-asma-published.prime-prod-local.pubfactory.com/view/journals/amhp/94/8/article-p645.xml) |
| Formulary selection | [NASA Human Research Roadmap: ineffective or toxic medications](https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=177) |
| Mars medical operations | [Medical system concept of operations for Mars](https://ntrs.nasa.gov/api/citations/20200001715/downloads/20200001715.pdf) |
| Orion kit | [Orion spacecraft medical kit, AsMA 2022](https://ntrs.nasa.gov/api/citations/20220006714/downloads/MPCV-AsMA-2022-Orion_Spacecraft_Medical_Kit.pptx.pdf) |
