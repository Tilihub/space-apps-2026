# dadis2 medical-console review — 15 November 2026

Status: **review only; no adoption, source change, approval or merge.** Tommy asked to try dadis2's work before deciding whether to retain it in main.

## Snapshot and preview

- Exact source: `origin/dadis2/mo-console` at `2dc9a6e`, including `dadis2/earth-qr` at `08ef68d`.
- Based on Tommy's earlier frontend commit `823874a`, before Pulsars. Its missing gold shop/wallet does not mean they are removed from the adopted app; current main and localhost:8020 retain the complete Pulsars version.
- The review is an unchanged git archive in a temporary directory. A separate local runner mounts its original core/modules/pages on **127.0.0.1:8022**, with a fresh synthetic store populated by its original presentation seeder. No original store/server is reset or stopped. No teammate's personal source is edited.
- Open localhost:8022, choose Medical officer. Four tabs: Approvals, Inventory, Patients, Reports to Earth. The Earth console is available from Sign out → Earth console.
- Three synthetic requests were added only to this review: Ines/ondansetron and Leo/ondansetron waiting for the onboard officer; Tomas/zolpidem waiting for Earth. None was approved or dispensed during visual review. All symptoms/health profiles are synthetic fixtures.

## Observed changes and adoption choices

| Change | Review finding |
|---|---|
| Four-section medical console | Easier to inspect one workflow at a time; actual panels render in the browser |
| Lean Earth screen and fixed QR | Pending Earth request, approval/denial and a Tomas presentation QR render; generator/report tools are folded away |
| Leo as a patient | His ordinary prescription request now goes to the onboard doctor, matching Tommy's recent desired removal of the old Earth exception |
| Direct medical-officer collection | Takes any medicine for any patient, including controlled medicines, without another approval. `officerCollection` checks patient/quantity, allergies with explicit override, and usable stock. It does not call ordinary daily-limit/reserve/grant eligibility rules; confirmation also selects stock directly. This is a substantive policy change, not only UI |
| Emergency reason | Becomes optional in both API and UI, contrary to Tommy's last mandatory-note decision. Needs an explicit product choice |
| Ordinary request reason | Becomes mandatory, enforced on server and shown in the form. This differs from current shared-contract optional note |
| Imported Earth code | Marks matching waiting requests approved; matches the intended code-to-request workflow |
| QR laptop fallback | `jsQR` is added to the standalone inventory prototype. The joined app still invokes BarcodeDetector directly and does not load the fallback; GET `/people/dadis2/inventory/vendor/jsQR.js` returns 404. Do not claim the fallback is already connected in the joined app |

The Earth reply QR is a fixed, explicitly simulated presentation credential for Tomas, not dynamically created by approving the visible pending request. Camera permission/hardware capture was not exercised. Code entry and existing source tests remain separate from a real camera scan.

## Validation

All **111/111** tests pass on the exact branch archive, no skips. This is that branch's suite, not current main's 117-test Pulsars suite. Browser verified the populated approvals, direct-collection Inventory form and Earth pending-request/QR screen. Review screenshots: approvals.jpg, inventory.jpg, earth-qr.jpg. No UI approval, actual collection or camera action was submitted during review.

## Before adoption

1. Tommy chooses the medical-officer controlled-medicine/dose policy and mandatory versus optional emergency reason; questions were presented explicitly.
2. Keep the chosen console/QR improvements while preserving the complete main app, including Pulsars and the planned AED.
3. Have dadis2 reconcile medicine rules/tests and zt review required shared-contract changes. His branch explicitly lists these as unadopted deviations. Do not edit his personal folder on Tommy's behalf.
4. Integrate chosen page changes in Tommy's connection branch, resolve any cross-owner conflicts with the owners, run the combined suite and use the protected-file PR/approval process before merge.
