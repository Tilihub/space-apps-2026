# Medical inventory and dispensing module: spec

Owner: dadis2. Status: draft, prototype in this folder (`index.html`).

A module for the team's health monitoring app. It tracks every medicine, consumable and piece of
medical equipment on a long-duration mission, and guides a crew member from "I have a symptom" to
"I'm holding the right item, and it's logged". Safety rules depend on how risky the item is.

> Prototype with sample data. Not medical advice. Tier rules, thresholds and dose limits are design
> assumptions for a demo and would need review by a flight surgeon. Not affiliated with NASA, and no
> NASA logos or branding are used.

## 1. Scope

**Must have (demo)**

- Inventory dashboard: stock per item and lot, expiry, potency risk, supply forecast, alerts
- Items organised by colour-coded packs, located down to locker → pack → slot
- Four safety tiers with the right gate for each: self-care, CMO sign-off, two-person sign-off,
  emergency break-glass
- Symptom-based suggestions for self-care items, with safety checks and red-flag escalation
- Dispensing flow: choose → authorise → locate on a 2D map → scan to confirm → log the dose
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

Our locker layout (design, not NASA's):

| Locker | Packs | Why there |
|---|---|---|
| M1 | Red | Next to the hatch: fastest to reach in an emergency |
| M2 | White, Grey | High-use items at eye level |
| M3 | Purple, Brown | Prescription items together, under CMO control |
| M4 | Blue, Green | Exam and treatment supplies next to the restraint area |

Each pack is a grid of slots (rows A–D, columns 1–6). Every lot has a tag (barcode or RFID) so a
scan confirms the right item came out. In microgravity everything is strapped: retrieval
instructions always say which locker to open, which strap to release, which pack to pull and which
slot to open, and remind the crew member to re-stow.

## 4. Safety tiers (our design)

| Tier | Typical items | Who can release it | Ground review |
|---|---|---|---|
| **S: Supply** | Bandages, gloves, alcohol pads | Anyone | No |
| **1: Self-care** | Over-the-counter: acetaminophen, loratadine, meclizine | The crew member, after automatic safety checks | No |
| **2: Prescription** | Antibiotics, ondansetron, injectables | CMO signs (backup CMO if the patient is the CMO) | No |
| **3: Controlled** | Zolpidem, modafinil, opioids, benzodiazepines | CMO signs **and** a second crew member witnesses. The witness also confirms the count left in the slot | Yes, asynchronous |
| **4: Emergency** | Epinephrine, atropine, naloxone, AED | Anyone, immediately (break-glass) | Yes, plus documentation within 2 hours |

Rules:

- **Standing orders.** A crew member can have a medicine pre-approved before launch, for example
  zolpidem 1 per night. Within its limits they release it themselves with their own PIN. The count
  check and ground review still apply. This keeps the most-used controlled medicine (sleep aids)
  from needing a CMO every night.
- **CMO as patient.** The approver must never be the patient. If the CMO is the patient, the backup CMO signs.
- **Witness.** Must be different from the approver and from the patient.
- **Reserve.** Every item has a reserve kept for the conditions it's carried for. A self-care
  dispense that would dip into the reserve becomes a CMO decision.
- **Crew-specific items.** Only their owner can self-release them.
- **Not now.** A tier 2 or 3 request can be sent to the approvals queue when the CMO isn't present.
  Once signed, the patient continues from retrieval.
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
  formulary is used.
- **Coverage.** Simulate using lots first-expiry-first-out at the use rate. Each lot is usable until
  its planning expiry. Coverage = days until stock runs out or every remaining lot has expired.
  *Shortfall* means coverage is shorter than the days left in the mission. *Waste* means units that
  expire before they can be used.
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
- Delivery: call `MedInventory.receiveSymptomReport(report)`, or `postMessage(report)` if the
  module runs in an iframe. The module opens the dispense flow with the report pre-filled.

## 9. User flows

**Self-care (tier 1):** Dispense → patient → symptoms (or report from health monitoring) →
red-flag check → suggestions with checks → choose → confirm → map: locker, pack, slot →
scan tag → logged → follow-up later in the dose log.

**Prescription (tier 2):** choose item → "CMO signs now" (approver + PIN) *or* "Send to CMO" → map → scan → logged.

**Controlled (tier 3):** choose item → CMO signs + witness signs (or a standing order with the
patient's PIN) → map → scan → witness enters the count left in the slot → logged, ground review pending.
A count mismatch is flagged.

**Emergency (tier 4):** "Emergency" button on every screen → item → reason → hold to release →
map → scan (or skip) → logged. Documentation is due within 2 hours, and ground review is pending.

## 10. Screens

1. **Header:** mission day X of Y, days left, signal delay, Emergency button.
2. **Dashboard:** alert cards, pack cards (colour, items, units, issues), and an inventory table
   (item, pack, tier, on hand vs reserve, coverage vs days left, next expiry, status). Search and
   filters by pack, tier and status. A row opens the item detail (lots, location, 30-day use,
   Locate, Dispense).
3. **Dispense:** a step-by-step flow (patient → need → item → authorise → locate → scan → done).
4. **Approvals:** pending requests, documentation due, ground reviews, count discrepancies.
5. **Dose log:** every dispense, follow-up buttons, JSON export (for downlink to ground).
6. **Bay map:** 2D plan of the medical bay. Click a locker → its packs. Click a pack → slot grid. When
   locating, the target locker, pack and slot are highlighted.

Colour is never the only cue: every pack chip and tier badge has text, too.

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
