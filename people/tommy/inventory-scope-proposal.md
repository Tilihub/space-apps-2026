# Proposed lean inventory and cabinet scope

Tommy's planning brief, 2026-11-14. This combines his newly supplied inventory specification with existing DAD-1 and the published zt UI inputs. It is a reviewable proposal for Tommy/zt/dadis2, not an implementation request embedded in the supplied document, an adopted interface, or permission to edit another person's files.

## Latest confirmed clarification

See [contract-review.md](contract-review.md) for Tommy’s subsequent answers and PR #49 alignment. QR and manual code are identical; remove the 15-minute session proposal entirely. Same course credential works at later due times. Parallel batch stays, with per-item app confirmation for simulated dispensers. Permitted self-service quantities are user-selected; prescribed quantities/times are fixed. Keep individual allergy profiles and normal-flow blocks. Catalogue size remains proposed.

## Latest scope direction

Tommy and zt want a smaller inventory scope than the broad standalone prototype. Preserve useful working logic and reduce the demo catalogue and exposed complexity. Do not rebuild DAD-1 from scratch or discard its source.

For pills, use the concept of a dispenser that supplies only the currently permitted quantity while the remaining stock stays inaccessible. The demo simulates dispensing. Mechanical construction, microgravity transfer, extreme misuse scenarios and flight hardware qualification are outside application-demo scope. This supersedes treating detailed hardware/fault investigation as a prerequisite. Keep ordinary software correctness: valid patient/authorization, due-dose limit, available/unexpired stock, one stock update per confirmed collection, and simple collection/cancel states. No claim of absolute prevention of misuse is made.

## Proposed smallest common product

- A concise inventory view inside the app's Med bay, plus a cabinet/location view selected by zt.
- Three practical policies: general crew supplies, individual approved-plan items, specifically authorized controlled items. Emergency access remains a distinct exceptional route available to crew under the agreed protocol.
- A prescription/plan card with the currently due quantity and one Collect action; no routine astronaut entry of a larger medicine quantity than the approved dose.
- Item details on demand: name, location, available stock/unit, expiry if relevant, access requirement and availability. Ingredients/descriptions can be optional detail metadata, not mandatory astronaut form fields.
- Simple confirmation/cancellation and a recent activity history. Reusable items use checkout/return rather than consumption.
- An onboard-doctor/Earth grant flow, code/QR input and manual-code fallback. The actor/category policy remains configurable; do not replace already required Earth approval with generic login or a checkbox.

### Small configurable catalogue from Tommy's supplied brief

| Location label | Item | Initial stock | Proposed demo handling |
|---|---|---|---|
| A1 | Adhesive dressings | 18 packs | General supply |
| A2 | Sterile gauze | 12 packs | General supply |
| A3 | Digital thermometer | 2 devices | Reusable checkout/return |
| B1 | Paracetamol | 20 inventory units | Approved individual plan; metered quantity |
| B2 | Mission supplements | 24 inventory units | Approved individual mission plan; metered quantity if applicable |
| B3 | Hydration supplies | 8 packs | General supply |
| C1 | Controlled demonstration item M-04 | 6 sealed units | Scoped authorization |
| C2 | Controlled demonstration item M-07 | 4 sealed units | Scoped authorization |
| C3 | Emergency response kit | 1 kit | Exceptional emergency route |

These quantities are demo stock, not treatment instructions. Fix each stock unit's meaning in the catalogue so that prescribed units and stock subtraction agree. Item ID and compartment ID stay separate. A1–C3 are proposed display labels, not a demand to replace existing `L2-1-07` identifiers: agree a mapping with dadis2/zt. One item per location is sufficient for this demo. Do not delete the larger catalogue to achieve this; use a small configurable demo subset/fixture.

## Keep, simplify and defer

| Keep from dadis2 | Simplify for the joined demo | Defer from the visible MVP |
|---|---|---|
| Grant patient/issuer/item scope, validity and per-dose course schedule | Small catalogue and three user-facing policy groups; backend policy may remain richer | Large medicine catalogue, drug-class education and unrelated inventory screens |
| All currently due prescribed items authorized together | One active collection transaction, which may contain multiple due items | Multiple independent simultaneous collection sessions |
| Location mapping, relevant events and persisted collection records | Compact stock/expiry display and a recent activity view | Potency degradation estimates, mission-end coverage forecasts, reserves/lot analytics unless needed by the chosen case |
| Existing approval/code handling, individual allergy checks and follow-up hooks | Approved-plan links from symptoms; no new autonomous treatment-selection engine | XP, streaks, timed retrieval rewards, badges, 3D cabinet and restocking tools |
| Correct-patient and no-repeat-dose checks | Simulated controller with understandable requested/open-or-dispensed/confirmed/closed states | Detailed physical controller transport, engineering diagnostics and rare hardware failure scenarios |

Some deferred features can remain in the standalone code. The scope decision concerns what the joined demo exposes and relies on, not deleting another person's work. Existing medical assumptions do not become agreed clinical policy through this brief.

## Resolve the differences between the supplied brief and prior answers

| Difference | Proposed resolution consistent with Tommy's prior decisions |
|---|---|
| Supplied brief: 15-minute, single-use code. Earlier answer: reusable multi-day prescription QR | Keep the reusable course authorization. Each due collection has a unique transaction/dose-slot record that can be confirmed once. Tommy subsequently removed the 15-minute lifetime/session requirement entirely. |
| Supplied brief: one open compartment at a time. Earlier answer: all due prescribed bins together | Allow one active collection **batch**, containing all and only the currently eligible items. For pills, simulate metered outputs, not access to the full stock package. |
| Supplied brief: user enters requested quantity | For permitted self-service items, allow a positive available quantity under existing policy/safety checks. For prescribed items, display/freeze the authorized due quantity; the user cannot increase it by typing. |
| Supplied brief: user ticks that a plan exists | Link to a stored approved plan/grant. A clearly labelled demo fixture may simulate approval; the checkbox alone does not create one. |
| Existing DAD contract: collection is recorded as the dose. Supplied brief: collection differs from administration | Store confirmed dispensing/collection once. Keep an optional later use/effectiveness follow-up separate; do not require proof of swallowing. |
| Existing red tint means approval needed. Supplied brief: red locked, green open | Treat access requirement and physical/demo state as separate labels. zt chooses the final visual language; selecting highlights a location and does not unlock it. |
| Existing automatic symptom-to-drug suggestions versus supplied approved-care workflow | Navigate from the symptom/case to a relevant already approved instruction or supply. Do not invent a prescription from symptom text. Any broader suggestion feature remains outside this lean proposal unless separately agreed. |

## zt inputs reviewed and their inventory relevance

Reviewed published `people/zt/plan.md` and `ui-skeleton/index.html`; latest input-screen change found: `ef10b7f` (14 Nov 15:03 local), included in reviewed branch snapshot `b760d8f`. The subsequent zt update refreshed status/team-jobs, not the input implementation. No newer published input revision was found in this pass.

| Input in zt's skeleton | Intended owner/flow | Inventory needs |
|---|---|---|
| Sleep, mood, stress, fatigue | Check-in / health; skeleton controls are placeholders | A relevant approved-plan link if needed, not duplicated questionnaires in inventory |
| Body area: head, eyes, heart, lungs, gut, muscles/bones | Symptom entry | Preserve the originating observation/case reference |
| Free-text symptom and severity | Symptom entry | Agree structured symptom code mapping if an existing API requires codes; free text is not automatically a valid dadis2 code |
| Resting heart rate, blood pressure, blood oxygen, temperature | Guided measurements are labelled placeholders, not working sensor/input integration | Health/doctor context as authorized; these do not all need to become fields on an inventory card |
| Did it help? Yes/No | Dose/use follow-up | Link to the collected item/transaction and record separately from the original symptom |
| Journal | Mind / privacy boundary | Do not pass private journal text to inventory, clinical reports or other crew |

Apply already agreed mood/stress/fatigue **1–10**, sleep **hours**; the skeleton still displays 0–10 for all four. Symptom severity remains a separately agreed scale. Angelos currently accepts resting heart rate, sleep and three self-report fields; BP/SpO2/temperature and symptoms need their own agreed connection rather than being assumed implemented in that API.

The zt draft also proposes a body figure, task completion, readiness, a hidden case summary, and a face-scan entry. These are not additional inventory responsibilities. Readiness and entry details remain open, gamification deferred, detailed history/weekly analyses hidden from astronaut views as clarified by Tommy. The persistent companion remains cross-app work.

## Minimal connection information — for owner agreement

Use existing interfaces where possible rather than inventing a replacement protocol here. Agree only the missing pieces:

- Who: the canonical authenticated crew ID and actor role.
- Why: a health observation/case reference plus an approved plan/grant reference when needed; no journal text.
- What/where: stable item and compartment IDs with agreed display labels.
- How much/when: approved units, dose-slot/time window and remaining available quantity.
- Result: unique collection transaction ID, confirmed quantity, timestamp and outcome; existing inventory events adapted as necessary.

## Suggested return task for dadis2 and zt

> Read Tommy's latest plan and inventory-scope-proposal.md. Inspect existing DAD-1 before changing it. Propose a lean configuration using the nine-item fixture and retain the grant/due-dose engine. Preserve reusable multi-day QR and one active batch of due items. Represent pills as simulated metered doses, keep confirmed collection separate from optional use/follow-up, and avoid adding clinical selection rules. Agree crew/location mappings and symptom/care-plan context with zt. Show how the joined Med bay can use the existing interface without duplicating the whole standalone application. Keep richer experiments in your own folder; do not delete them for this simplification. Work starts after your human accepts this scope, under AGENTS.md ownership rules.

## Small demonstration checklist

1. Locate a general supply, select without opening, collect once and reduce stock once.
2. Cancel without confirmed collection; stock unchanged.
3. Request a controlled item without approval; show a clear pending/denied state.
4. Import a correct-patient multi-item plan; expose only currently due doses and simulate quantity-limited dispensing.
5. Repeat the same due collection: no extra allowance. Reuse the course code at the next valid dose time: allow it.
6. Show a basic wrong-patient/expired authorization or unavailable-stock rejection.
7. Check out and return the reusable thermometer.
8. Emergency route: explicit reason and traceable event, under the agreed crew-access rule.
9. Link a follow-up answer to the original collection, without claiming collection proves administration.

## First decision for Tommy

Is the proposed nine-item fixture the agreed first demo catalogue, with the larger catalogue kept in dadis2's experiment? The treatment of reusable prescriptions and batches above follows earlier answers; it does not ask Tommy to re-decide them. Once scope is accepted, dadis2/zt can confirm the concrete interface and what can be reused unchanged.
