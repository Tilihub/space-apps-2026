# meds module (dadis2)

The onboard app's medicine module: symptom reports and suggestions, allergies, lockers, dispensing,
requests and approvals, grants and the dose log. It is built to the onboard app contract,
[shared/contract/README.md](../../../shared/contract/README.md) section 8, and serves `/api/meds/*`.

> Proof of concept with sample medicines and limits. Not medical advice. Not affiliated with NASA.

**Status (14 Nov 2026):** wave 1 is done, and `npm test` passes (18 meds tests). Wave 2
(emergencies, stock) and `POST /grants/code` are not built yet.

## Files

| File | What it is |
|---|---|
| `index.js` | The module: routes, saved state, the shapes sent to the pages |
| `rules.js` | Pure rules ported from the prototype (`../inventory/logic.js`): safety checks, who approves, suggestions, grant codes, dose times, one course per medicine |
| `catalogue.json` | Sample medicines, lockers, limits, the crew's allergy profiles and the demo history (Tomas's headaches on days 40 and 41, acetaminophen on day 41) |
| `index.test.js` | Tests through `handleRequest`, starting with the contract's wave 1 walk-through |

Run the tests from the repo root with `npm test`, or only these with `node --test people/dadis2/meds/`.

## How it works

- **Dispensary style** (the team's model; Tommy's decisions in `people/tommy/contract-review.md`):
  - `POST /collections` opens one batch with everything the person may take now: a self-care
    medicine, or every medicine of a grant that is due now.
  - The cabinet dispenses each item (simulated). The crew member confirms each one once with
    `POST /collections/:id/scan` (`compartmentId`).
  - Stock and the dose log change only on that confirmation. Collecting is the dose; "Did it help?"
    is a separate follow-up.
- **Who approves:**

| Category | Approval |
|---|---|
| Self-care | None |
| Prescription | The medical officer (Earth when Leo is the patient) |
| Controlled | Earth |
| Emergency | The Emergency button (wave 2) |

- **Self-care can change with the person:**
  - only the reserve is left, or a condition makes it unsafe → the medical officer decides
  - daily limit reached → `not_due`
  - allergy → blocked, and nobody can grant it
- **Allergies always block**, even with a valid grant. Crew can add a suspected allergy; only the
  medical officer confirms or removes one.
- **Dose times** run every 24/times-a-day hours from the grant's start. The medical officer's grants
  start when approved, so the first dose is due straight away.
  - An Earth code starts at 08:00 on its date, or straight away when it's imported before 08:00 that day.
  - Missed dose times are not added up.
- **Never a double dose:**
  - one course per medicine per person: a newer grant replaces the running one from its own start
  - a dose already collected at or after a dose time counts for it, whichever grant it came from
  - a dose waits until half an interval has passed since the last dose of that medicine
  - ingredients are added up across courses, and two NSAIDs at once are refused
- **Grant codes** use the prototype's format (`RX2-…`), so codes from `../inventory/earth.html` work.
  The same code typed or scanned again finds the same grant, ready for its next dose.

## For zt: where this differs from the contract's wording

None of these change a contract field; some add one. To agree or fold into the contract:

1. **Entering a grant code again** returns the existing grant with `alreadyImported: true`, not
   `already_done` (Tommy's reusable-credential decision). `already_done` stays for a dose that was
   already collected.
2. **Extra fields:**
   - `why` on each locker bin (the reason it's locked) and `zone` on each shelf
   - `code`, `status`, and per item `name`, `status` and `nextDue` on grants
   - `name`, `decisionNote` and `grantId` on requests
   - `redFlag` on stored reports
3. **The medical officer leaving `crewId` out** of `GET /requests`, `/grants`, `/doses` or
   `/symptom-reports` gets every crew member's.
4. **Opening a new collection cancels the open one.** Asking again for the same grant returns the
   open one.
5. **Error codes:** a reached daily limit is `not_due`; an allergy or a needed approval is
   `needs_approval`.
6. **One course per medicine** and its timing rule (above) aren't in the contract yet.
