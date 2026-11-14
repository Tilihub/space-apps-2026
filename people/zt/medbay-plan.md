# Med bay plan

> **Draft, not yet discussed with zt.** Written 14 Nov 2026 (evening) from what the team has pushed to
> `main` (up to PR #68). Nothing here is decided. The five questions at the end are open. Tommy or
> zt can continue from here.

Goal: the Med bay screen should show what teammates actually built, not invented content.
The screen to improve is `screens.medbay` in `people/zt/ui-look/index.html` (branch `zt/ui-look`).

## Who built what

| Person | What exists | Status |
|---|---|---|
| dadis2 | The `meds` module (`people/dadis2/meds/`, PR #66, merged). It serves symptom reports, suggestions and **blocked** items with a reason, allergy profiles, lockers, collecting, requests and approvals, grants, and the dose log with "Did it help?". The older prototype is in `people/dadis2/inventory/` (`earth.html` makes grant codes and QR images). | Wave 1 done. **Wave 2 due Sunday 11:00:** emergency release, stock list, emergency paperwork |
| Tommy | Rules only (`people/tommy/plan.md` Q13–Q17, `contract-review.md`, `inventory-scope-proposal.md`). One reusable code/QR per course, only the dose due now can be collected. Prescribed amounts are fixed; self-care amounts are the person's choice. Allergies always block. Any crew member may use Emergency. "Did it help?" is separate from collecting. No points, no journal text near medicine. | Decided. His lean 9-item catalogue is not applied: dadis2's catalogue has 21 items |
| angelos | Nothing inside the Med bay. His daily health result is shown to the medical officer next to a request. | Done |
| potest | Nothing inside the Med bay. His cabin CO₂ alert goes on the medical officer's request card. His "send to Earth" queue is only proposed (contract §11). | Owner not confirmed |
| petros | Nothing built for it. His workout is a separate screen. | Idea only |

Contract: `shared/contract/README.md` §8 (meds routes and data shapes). The core server and pages are zt's.

## What the screen should show

**Astronaut** (demo person: Tomas, `c4`, allergic to NSAIDs):
1. Suggestions after a symptom report. Allowed medicines get **Collect**. Blocked ones are greyed with the
   reason ("Allergy: NSAIDs"). A red-flag answer shows "talk to your medical officer" and no suggestions.
2. Ask for a medicine that needs approval, with a status: waiting for medical officer, waiting for Earth,
   approved, denied.
3. My prescriptions: what is due now, when the next dose is, **Collect**. Type or scan a code from Earth,
   and show "Sender not verified" (dadis2 simulates that check).
4. Collecting: say where to go in plain words ("Locker 1, shelf 2, bin 4"), then confirm each box once.
   Allow Cancel.
5. Dose log with "Did it help?", and my allergies (the astronaut may only add a *suspected* one).

The Emergency button belongs on every screen, not in the Med bay. A lockers picture is optional.

**Medical officer** (Leo, `c2`), on the medical officer platform:
1. Approvals: each request with the symptom, today's health result, the cabin CO₂ and the allergies.
   Approve (amount, days) or deny.
2. Grants he issued, with Cancel.
3. Allergies: confirm or remove suspected ones.
4. Stock, with items below their reserve flagged (wave 2).
5. Emergency paperwork, due 2 hours after the emergency (wave 2).

"Send to Earth" belongs in his case summaries, not here.

## Gaps and conflicts

1. **The look page contradicts the demo.** Tomas has an NSAID allergy, yet his fake log has ibuprofen and
   Home asks "Did the ibuprofen help?". The demo case (`people/zt/demo-cases.md`) says acetaminophen.
   Paracetamol is shown as "needs approval", but in the demo acetaminophen is self-care; the approval
   example is the optional sleeping pill. The page says "paracetamol", the contract says "acetaminophen".
2. **The look page lacks most of the above:** blocked items, request status, code entry, due times, confirm
   per box, cancel, allergies, and the medical officer side. Its compartment "B3" is not dadis2's `L1-2-04`.
3. **Emergency rules differ.** dadis2's prototype also lets a prescription or controlled medicine out under
   "Can't wait for approval?" (reason, logging, Earth review). The contract says emergency items only.
   dadis2 is waiting for zt to decide.
4. **"One course per medicine per person"** is in dadis2's code but not in the contract.
5. **Catalogue size:** Tommy wants about 9 items, dadis2 has 21. Not settled.
6. **Untested:** reading a QR with a phone camera. The Earth tool cannot send a cancellation yet.
7. **"Send to Earth"** has no confirmed owner (potest proposed).

Changes to the contract need a pull request that a teammate approves.

## Open questions (my recommendation first)

1. Emergency: keep the contract (emergency items only) and drop the extra "Can't wait" release for the demo?
2. Catalogue: keep all 21 items, and ask dadis2 to name the 4–5 the demo scenes use. Or shrink to Tommy's 9?
3. Lockers: text only for now ("Locker 1, shelf 2, bin 4"), with a lockers picture as a later extra?
4. Layout: tabs *For me* (suggestions, prescriptions, collect), *Log*, *Allergies*, plus a separate medical
   officer platform. Or one scrolling page?
5. Fix the look page's fake data (point 1 above) when the plan is agreed. Not done here: this session did not
   edit `people/zt/ui-look/index.html`.

## Who owns which piece (proposed)

| Piece | Owner |
|---|---|
| Meds routes, rules, stock, emergency | dadis2 |
| Med bay and medical officer pages | zt |
| Today's health result on Leo's request card | angelos (data), zt (page) |
| Cabin CO₂ on Leo's request card | potest (data), zt (page) |
| Send to Earth | potest, to confirm |
| Contract changes (emergency wording, one course per medicine) | zt, with a teammate's approval |
| Demo catalogue choice | zt and Tommy, with dadis2 |
