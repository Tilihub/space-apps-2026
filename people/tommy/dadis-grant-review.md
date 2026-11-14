# Review of dadis2 grant-safety delivery (#58)

Reviewed 2026-11-14. PR #58 (`dadis2/grant-safety`, head `d1f6f52`) is merged as `75a7377`. This is Tommy's review, not a change to dadis2's files or an adoption of the prototype's new policies.

## Delivered

- New overlapping-course handling: a new grant replaces an overlapping course for the same patient/item.
- Planned ingredient totals across grants and duplicate-class checks, plus existing recent-use/allergy checks during ordinary collection.
- Due-item cards display blocking reasons rather than simply offering collection.
- Controlled requests remain Earth decisions; the doctor cannot grant to themselves.
- A new “Can't wait? Emergency” path releases normally restricted medicines with a required reason, audit flags and later review.

Re-ran all **37 existing pure-logic checks: 37 passed** in an isolated copy of tracked public files using Node 24 and a minimal DOM reporter stub. This checks the supplied logic suite, not browser/camera/hardware integration. Two additional targeted probes found the problems below. No teammate data or source was changed.

## Finding 1 — replacement can offer an already collected slot again

**Priority: high; fix before reusing replacement logic in the joined module.**

Reproduction using existing synthetic data/helpers:

1. Create an Earth grant for `c4`, item `ondansetron-4`, starting 14 Nov, one unit twice daily for five days. At 14 Nov 08:30, collect the due 08 slot through the normal grant log fields.
2. At that same time, add a replacement grant for the same item and same start date with one unit three times daily for five days.
3. `grantDue` on the replacement returns an eligible item for the **same `2026-11-14@08` slot**. Its ordinary `safetyChecks` returns **no blocking checks** for this synthetic example.

Observed output: `dueAgain: 1`, `sameSlot: true`, `blockingChecks: []`.

Cause: `grantItemStatus` counts log entries by the new `grant.id`/item index. The old collection remains attached to the old grant, while `addGrant` replaces the old item without carrying forward the already satisfied dose slot. Ingredient maxima are not equivalent to the prescribed slot allowance and do not reliably stop this example.

Relevant source: `people/dadis2/inventory/logic.js`, `addGrant` around line 779 and `grantItemStatus` around line 807. The app uses these due items and the same ordinary safety checks in `startCollect`.

Needed behavior: an ordinary course replacement must not automatically manufacture another allowance for an already collected patient/item/time slot. Agree an explicit transition rule and preserve/reconcile the collection ledger across the replacement. If an authorized instruction intentionally changes what is due immediately, model that explicitly rather than treating every imported replacement as an unused morning dose. Add a regression for replacement **after** collection, not only several grants imported before collection.

## Finding 2 — a future-start replacement stops the current course immediately

**Priority: medium; fix the effective-time behavior.**

Reproduction:

1. At 14 Nov 08:30, add an active five-day grant for `c4` / `ondansetron-4`, starting 14 Nov. The current grant has one due item.
2. Import a five-day replacement for the same item starting **16 Nov**; its date range overlaps the old course.
3. `addGrant` immediately marks the old item `replacedBy`. The old item is no longer due on 14 Nov, while the new item is not started yet.

Observed output: `oldDueBefore: 1`, `oldDueAfter: 0`, `newDueToday: 0`, `oldStatus: "replaced"`.

Cause: the replacement marker is applied at import time (`addGrant`, line 789); `grantItemStatus` returns `replaced` before considering whether the successor is effective.

Needed behavior: distinguish importing an upcoming instruction from its effective start or an explicit immediate cancellation. Preserve the current valid course until the approved transition, and test before/at/after that transition. Do not silently infer an immediate clinical cancellation from a future start date.

## Product/contract mismatch — widened Emergency access

The adopted shared contract says **only emergency items are released** by the emergency route. #58 also offers prescription/controlled medicines under “Can't wait for approval?”. dadis2 explicitly flags this difference in his status and PR body. It remains a proposed policy extension, not an accepted common rule merely because the personal prototype is merged.

Tommy's Q15 allows exceptional crew access; it does not by itself define a blanket bypass for every waiting request. zt/Tommy/dadis2 need to choose the permitted demo scope and record a teammate-reviewed contract change if broadening it. Keep ordinary allergy/approval blocks distinct from this exceptional route.

The “newest grant replaces the current course” rule also needs agreement in the protected contract; its exact issuer/effective-time rules should be explicit.

## Still pending from Tommy's earlier requirements

- QR and manual code must resolve the same stored grant at later due times. The current contract still documents repeat import as “Already added”; no new repeat-code resolution path was found in #58.
- The prototype still collects through box scanning; it has not implemented the requested per-item simulated-dispenser confirmation.
- `people/dadis2/meds/` is not built yet. The prototype still uses its older four-crew/local-clock/backup-doctor model. The shared module must use five crew, core storage/clock, server-side permissions and the agreed smaller scope.
- Catalogue size remains a proposal; this review does not silently choose the nine-item fixture.

## Suggested next task for dadis2

Fix the two replacement regressions, agree the Emergency/course-transition rules with zt/Tommy, then adapt the necessary existing DAD-1/DAD-2 functions into the contract's `meds` module. Carry forward allergy checks, shared collection counters, QR/code equality and per-item confirmation. Keep the standalone experiment intact and avoid expanding unrelated features before the joined module works.
