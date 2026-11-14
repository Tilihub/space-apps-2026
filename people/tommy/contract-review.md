# PR #49 compatibility review and latest inventory decisions

Reviewed 2026-11-14 against `zt/app-contract` at `fb0c20f` and Tommy's latest answers. Tommy explicitly asked for review/approval, then chose **correction before approval** after the history-access conflict was explained. This file is Tommy's review/handoff, not a change to zt's protected contract or another member's implementation.

## Review result

The proposed architecture supplies useful common instructions: one onboard Node.js 24 server, JavaScript modules in owner folders, server-side permissions/storage, five canonical crew IDs, one mission clock, new synthetic 1–10 histories, explicit measurement units/nulls, routes and an example test context. These address earlier connection gaps.

**Approval is pending corrections.** The health route table currently permits `crew` to read `/history` and `/weekly` (contract README lines 219 and 221). Tommy excluded detailed history/weekly analysis from astronaut views. Restrict those routes to relevant clinical roles and enforce it on the server; keep the basic daily Home/check-in result separate. Update the general role wording and demo instructions consistently. Earth receives authorized reports, not blanket access to raw private histories; journal permissions do not change.

Validation: ran the PR's actual `npm test` in an isolated public-source copy on checksum-verified official Node **v24.22.3**. **7 tests passed, 0 failed, 0 skipped.** These exercise the example/shared helper flow, not implemented health/meds/env modules or the joined app. No permanent Node install, npm install or teammate data was used.

## Published-work refresh after Tommy asked to check again

- Main at `b5f98a5` now includes the health adapter (#25), environment bridge (#40), inventory/grants (#34/#44) and Mars proposal (#36). These are merged prototypes, not yet the new joined Node app.
- Angelos added external fixed-baseline import at `928dc4e`, PR #50. Re-ran its latest Python/HTTP/JS-client suite using temporary stores and the temporary Node runtime: **60 passed, 0 failed, 0 skipped**. Existing reference/session data were not used or changed.
- Petros delivered PET-1/PET-2 at `12c840e`, PR #51: **65 synthetic records**, five crew histories, four guides, day-42 scenarios, an export to the external importer, and exact wellbeing prompts/anchors. Independently exported/imported all five crew into fresh temporary SQLite stores and matched c1/c3/c4 expected changes/missing inputs, including c4 five changes for three days. PET-1 is available for review; do not tell Petros to start that package from nothing.
- zt added five stage cases at `2ec9cd5`, PR #52. These are a new narrative proposal, not a matching replacement for PET-1 yet.
- PR #49 remains at `fb0c20f`. Submitted **CHANGES_REQUESTED** at Tommy’s instruction, with the visibility correction and explicit latest inventory requirements. No approval or merge was issued.

### Later refresh during the same review

Main advanced to `854c361` while the review was running: #52 stage cases and **DAD-2 #53** are now merged. DAD-2 provides `earth.html`, `MedGround.makeGrant`, offline QR SVG generation, course-end import expiry, revocation logic and clear simulated-sender labels. Opened the actual Earth screen and the existing browser regression page from isolated public-source copies: **28/28 checks passed**. The QR contains the same code text; phone-camera decoding and real issuer verification were not tested/implemented. Do not assign ground-side QR generation from scratch again.

The next dadis2 work is adapting delivered DAD-1/DAD-2 to the agreed shared module/profile/clock and current product semantics. Its documented “Already added” behavior still needs a repeat-code path to the existing due grant, and its four-crew/backup-CMO prototype needs alignment with the proposed five-crew/one-CMO contract. The case conflicts below remain relevant even though #52's personal draft is merged.

### New case/fixture differences to settle

| Topic | PET-1 #51 | zt stage proposal #52 | Required coordination |
|---|---|---|---|
| c3 | Missing resting pulse/fatigue/SpO2 on day 42; no changed compared measures | Mood below normal for six days; gaps deliberately only in resting pulse | Select the story, then change fixtures and expected results together |
| c4 | Sleep 5.5 h and five changed measures for three days; baseline sleep median 7.8 h | Sleep 4.6 h, normal 6.8 h; only sleep changed; self-report close to normal | One agreed case/normal/input set for health, narrative and tests |
| Cabin | Synthetic 3620 ppm warning active at 07:30 | Archival overnight rise recovered by 07:00 | Use one deterministic time/source mapping and the matching expected snapshot |
| Mind history | PET-2 explicitly distinguishes clinician-only detailed history from basic Home | Crew-facing weekly mood graph; “Private: never shared” journal label | Remove crew detailed-history graph or obtain a changed product decision; name actual author/psychologist audience accurately |
| Workout/points | No workout fixture/module in this package | Workout/rep counter and rewards, currently without owner/contract | Keep points deferred; treat workout as proposed extra until scope and owner accepted |

The stage proposal also needs c4’s known-allergy fixture and a consistent emergency/allergy-profile update policy. A suspected food reaction must not silently generate an unrelated medication-allergy mapping; record the suspected trigger for the appropriate professional to review. The seven-minute script does not by itself implement these features or approve treatment/protocol assumptions.

## Tommy's latest inventory decisions — apply together

1. **QR and manual code are identical input methods for the same authorization.** They must use the same patient/item/time/quantity/allergy checks and the same stored grant, not separate allowances or validity rules.
2. **No 15-minute lifetime.** A prescription remains valid for its prescribed course. At a due time the astronaut scans the QR or types the same code and collects the current dose. On later legitimate dose times the same credential still works. Already imported credentials should resolve the existing grant; they must not create a new course or dead-end the user before an eligible collection. An already collected dose remains rejected.
3. **Parallel collection stays.** One collection batch contains all and only the currently eligible prescribed items. With simulated dispensers, confirm/check the items one at a time in the app while retaining that one batch; no requirement to scan a full medicine package or expose bulk stock.
4. **Prescribed quantities and times come from the prescription.** The astronaut cannot increase them. For permitted self-service items without a prescription, the user chooses a positive quantity within availability and the existing access/safety rules. Choosing a quantity is not permission to bypass an item's approval requirement.
5. **Keep individual allergy profiles and relevant medicine history/checks.** Simplification must not remove this part of dadis2's prototype. Configured allergies must block incompatible ordinary suggestions/access and collection on the server, including when a QR/code is valid; a valid grant does not erase an allergy restriction. Show a short reason in the UI. The separate emergency protocol is still to be agreed, not silently inherited as an unrestricted bypass.
6. **Keep scope small.** Simulated quantity-limited dispensing is in scope; physical/microgravity mechanism design and extreme misuse scenarios are not app-demo requirements. Retain ordinary dose/stock consistency and the distinction between collected and actually used.

The proposed nine-item catalogue remains a proposal; Tommy has not explicitly accepted the catalogue size yet. Preserve the larger standalone experiment while agreeing the joined-demo subset.

## Concrete contract alignment requested from zt

- **Health visibility:** correct `/history`, `/weekly`, role descriptions and associated checks so crew cannot read detailed analysis. Do not substitute hiding page links for route enforcement.
- **Medication profile ownership:** name where the five crew's synthetic allergy/medicine profiles live, who supplies them and how meds reads them. The public `CREW` table currently contains identity/title only. Do not add private allergy data to an all-crew public listing. Proposed owner: dadis2's module-local profile fixtures keyed by shared crew IDs, with Petros coordinating the shared synthetic story if needed; zt/dadis2 confirm this.
- **Allergy acceptance:** a profile with a known incompatible item remains blocked during ordinary direct collection and grant collection. Reuse configured checks rather than inventing a clinical rules engine. Include one synthetic demonstration/check for this.
- **Reusable credential:** `/grants/import` currently lists `already_done`; specify repeat scan/type resolution to an existing grant and how it proceeds to the next due batch. Keep duplicate dose rejection distinct from duplicate grant import.
- **Per-item dispenser confirmation:** let the existing collection/scan interface represent an app confirmation of the dispensed item. State that all due items belong to the batch and are confirmed once each; stock/allowance updates follow those confirmations. This is not a requirement to build physical sensors or redesign the whole API.
- **Self-service quantity:** state the user-entered quantity versus the prescription-fixed quantity explicitly in the request/UI instructions.
- **Visibility and priority:** make the corrected contract the common implementation reference after approval; keep Tommy's latest product decisions linked. The older standalone specs and Tommy task snapshots must not override it by accident.

## Are there usable instructions for everyone?

| Owner | Instructions the proposed contract gives | What still needs explicit alignment |
|---|---|---|
| zt | `integration/onboard-app/`: server, pages, sessions, mission clock, storage/events and permissions | Apply review corrections, confirm module handoffs; separate basic Home from restricted analysis; final layout remains his |
| angelos | `people/angelos/health/` and later `mind/`; JS routes, comparison rules, check-in shape, new synthetic 1–10 inputs | Existing Python service is not directly plug-compatible: port logic and carry over meaningful existing checks. Add the newly listed vitals, enforce clinical-only history/weekly access, and preserve private mind context. Old stores/references remain unchanged in the prototype |
| dadis2 | `people/dadis2/meds/`; reuse grant/due-dose engine with shared store/clock; no standalone HTML in module | Preserve allergy profiles, QR/code equality and reusable resolution; batch/per-item dispenser confirmation; user quantity only for allowed self-service. Agree lean catalogue rather than copying every prototype feature |
| potest | `people/potest/env/`; server-clock replay, now/history/snapshot/alerts and provenance | Port the existing bridge/replay logic to the module, keep synthetic insertions/source time labelled; accept queue work only if separately assigned |
| petros | `people/petros_the_space_larper/demo-data/`; per-crew days 29–41, baseline days 29–35, day 42 empty, measurement guides/stories | PET-1/PET-2 are now delivered in #51; reconcile them with the new #52 cases and coordinate profile/story IDs. Never turn mixed cohort historical rows into one person's baseline |
| Tommy | Product review, scope and unresolved choices with zt | Confirm lean catalogue, report/transport owner and remaining role/emergency/readiness choices; no app/UI implementation from this chat |

There are substantial usable instructions, but they are proposed until the contract PR is approved. The owner's older prototype folder stays intact; work in the new module folder reuses its logic. It is not just a renamed file or a visual iframe embed. The Python-to-JS port is a real task and needs validation.

## Remaining gaps, not silently assigned

- Reports and Earth delivery still have no accepted owner and only an outline, so their API and queue are not implementation-ready yet.
- Psychologist role, emergency protocol and companion implementation remain wave 2/open. This staging does not remove them from Tommy's requested whole demo.
- Readiness and scale-end wording remain open. A placeholder score is not a new medical formula.
- One medical officer with no backup and Earth approval when that officer is the patient is a new explicit contract choice to keep visible; it does not cancel the separate exceptional all-crew emergency path.
- Profile data, fixture delivery and the new review corrections must be settled before claiming every owner can finish independently with no further coordination.

## Next action

A request-changes review has been posted on PR #49 asking zt for these corrections. Re-read the actual updated head and re-run relevant checks before approval. Tommy's latest instruction is to correct first, so no approval or merge should be represented as completed yet.
