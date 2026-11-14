# UI continuation and backend acceptance review

Reviewed 2026-11-14 after Tommy requested opening zt's latest UI, checking the backend against his decisions, then continuing frontend work. Tommy selected **the 3D body first**. This records the current evidence; it is not a claim that the visual prototype is an integrated app.

## Versions and handoff

- Main/backend: `43a4dad`, including core step 1 (#71), health, stage-aligned data and meds waves 1/2 (#66/#70).
- UI look: `zt/ui-look` at `dace837`, `people/zt/ui-look/index.html` (not merged).
- 3D body: `zt/body-3d` at `0e8fbff`, `people/zt/body-3d/index.html` (not merged).
- zt explicitly handed the unmerged UI work to Tommy in the UI branch's status. Its other drafts are `zt/home-ideas` and `zt/medbay-plan`.
- Companion adaptation remains on potest's pending #55 (`f4bac9d` at this review), not main.

Opened the original UI and 3D files from isolated tracked-source copies. No teammate code or active data was changed. The 3D model rendered; switched to Report, selected Chest through its chip, then clicked the canvas: the component selected Stomach and visibly emitted `onSelect('stomach')`. This proves the component callback, not persistence of a symptom.

## Verified backend behavior

Ran the actual root `npm test` against an isolated current-main copy on Node 24: **90 passed, 0 failed, 0 skipped**. Includes core/storage/HTTP alignment, health/client/stage/workout, meds and shared examples.

Also ran one additional real-HTTP flow with the actual core plus health/meds mounted in temporary stores:

- crew cannot read clinical health history;
- the known incompatible ordinary medicine is blocked;
- another patient cannot import the grant;
- a two-item grant produces a two-item collection batch;
- each item is confirmed once and the batch completes;
- collecting that dose again is refused;
- after advancing mission time 12 hours, the same code (including case normalization) resolves the same stored grant and permits the next eligible two-item batch.

This diagnostic explicitly mounted health/meds through the existing test helper; it did not change the shipped module registry or connect the UI.

The earlier #58 replacement bugs are covered by passing regressions in the new meds module: a collected slot is not offered again by a replacement, and a later-starting replacement does not stop the current course prematurely. Do not keep describing those as unresolved blockers in the new module based only on the historical prototype review.

## What is ready and what is still missing

| Area | Evidence now | Remaining work |
|---|---|---|
| Core | Session/role identity, mission clock, event feed, persistent module storage and serialized requests tested | The shipped `modules.js` still mounts only `example`; production-path health/meds mounting and real pages remain |
| Health | Correct stage fixtures, personal references, check-ins, basic Today response, clinical-role analyses and workouts tested | Connect the UI; retain sleep duration in hours and restricted detailed analyses |
| Meds | Approvals, allergies, user-selected allowed self-care quantities, prescribed due quantities, reusable codes, batch/per-item confirmations, emergency/stock tested | Connect UI, use canonical item/location IDs; Earth grant-code endpoint remains later work |
| Environment | Existing replay/bridge exists in the standalone prototype | No `people/potest/env/` shared-server module on main yet; UI graphs remain fake |
| Companion/Mind | Pending #55 has an adapted companion route/client; visual UI has seeded chat/journal | Accepted ownership, mount/merge adaptation, persistent journal and psychologist workflow are not a joined implementation |
| Clinical reporting/Earth | Contract outline and role requirements | Report assembly/queue/delivery/replies are not built into the app; transport ownership still needs acceptance |
| Entry/profile | Simulated crew selection/token sessions | Username/password registration and profile editing from the original entry concept are not implemented by the demo login |
| Readiness/Home | Prototype values only | No approved readiness calculation; extra Home indicators remain deferred by Tommy |

Conclusion: the verified health/meds/core pieces support the key agreed behaviors, but **the complete backend and its connection to this UI cannot yet be accepted as finished**. Passing component/HTTP checks does not make placeholder pages a working application.

## UI-to-backend differences to resolve before binding fields

1. **No API wiring:** the UI look has hardcoded records and local rendering; it does not fetch the shared APIs. “Send daily report” is currently navigation, not saved check-in/clinical transmission. The 3D file is still a standalone component.
2. **Identity/clock:** UI uses three fake crew tabs and its own times; core uses `c1`–`c5` and the shared UTC mission clock. Use server identity and roles, not a guessed positional mapping.
3. **Sleep:** UI asks sleep quality on 1–10. Backend accepts actual duration as `sleepHours` (0–24 h). Never send quality as duration or claim wearables supply it before an adapter exists. If quality is retained, agree a separate field/contract change.
4. **Symptom location/codes:** 3D keys are head, eyes, neck, chest, arms, back, stomach, legs. The contract's body areas and symptom codes differ. The selection needs a deliberate UI-to-symptom/context mapping; it is not a diagnosis. Optional note/context must obey the existing input schema.
5. **Severity:** the visual symptom control still includes 0; the adopted symptom-entry contract is 1–10. “No symptoms” should remain a distinct absence/input choice, not an invalid symptom severity.
6. **Medication cards:** hardcoded names, strengths, locations and approval flags are not the actual catalogue/profile state. Render the backend's item IDs, units, compartment IDs and reasons; do not infer equivalence by a display name.
7. **Permissions:** visual readiness/detail pages and trends include analyses visible to the astronaut. The real backend correctly refuses detailed analyses to crew. Preserve that boundary when connecting the frontend; Home's extra indicators remain undecided.
8. **Private communication:** seeded Earth psychology messages and the journal do not prove delivery/persistence. Keep actual role/audience labels truthful when those services are implemented.

## Frontend continuation boundary

Tommy's new request authorizes continuing the frontend after this review, superseding the earlier planning-only intent for that next phase. It does not authorize editing another person's personal folder. Use the unmerged handoff according to AGENTS.md, keep zt's original experiments intact, and do actual joined work in Tommy's own space or a connection he is working on.

The 3D component can become the Home view (reported symptoms only) and the Check-in selector. Tommy chose to inspect this component first; embedding it into the full UI still follows the acceptance discussion. Do not invent new backend fields, medical rules, privacy permissions or readiness formulas as visual implementation choices.

Next useful sequence: agree the acceptance boundary with Tommy; connect core/health/meds and the first save/reload/collection flow to the selected UI; map identity, clock, sleep and symptom codes correctly; then refine layout/components while the remaining module owners complete env, mind/journal and reporting. Backend completion and visual iteration should be tracked as separate actual outcomes.
