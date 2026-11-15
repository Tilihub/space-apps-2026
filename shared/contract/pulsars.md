# Pulsars — additive contract proposal

**Pending teammate approval.** Tommy requested this feature on 15 November 2026 and explicitly authorized a separate backend/contract PR. The complete earlier app is PR #74; this addition is reviewed independently. Existing health, medicine, companion, environment and workout-controller contracts are unchanged. This is an additive module/event/static-catalogue extension; existing consumers keep contract version 1.

## Ownership and source

- Module: `people/tommy/pulsars/index.js`, owner Tommy. Mounted by the existing single core as `/api/pulsars` and saved in its own `pulsars.json` store.
- Catalogue: `people/tommy/pulsars/catalog.js`, the shared authoritative prices and allowed appearance values. The server exposes only that public file at `/pulsars/catalog.js`; rules, state and other personal files are not publicly served.
- The module imports Petros's **pure** `getDailyWorkout` to validate the assigned exercise IDs, sets and repetitions. It does not call another module or change Petros's files. The frontend composes the existing health check-in/workout flows with these new routes.
- New event: `pulsars.changed`, standard `{type, crewId, id, at}` metadata only. No answers, weights, balance or purchase details enter the event.

## Product rules confirmed by Tommy

- Personal progress only. No rankings, competitive crew totals, purchases with money, lost coins, clinical score or rewards for particular wellbeing answers.
- One reward for **each main assigned exercise per mission day**, excluding warm-up/cool-down; one for daily wellbeing completion. Every first eligible day pays 100 Pulsars per activity; the fourth and fifth consecutive completed days pay 200; the sixth onward pays 300. Exercise and wellbeing streaks are independent.
- An exercise day counts toward the exercise streak only when **every main exercise in every assigned session** is complete. A partly completed day retains its earned coins but does not extend tomorrow's streak. A planned rest day neither increments nor breaks the training streak and pays nothing. Completing a resistance session while rowing remains pending is not full daily completion.
- Exercise eligibility and the day's reward rate are computed from server mission time and the assigned program, not a submitted price, balance, streak or timestamp. Retries cannot repeat an exercise or daily reward. Stage-demo push-ups are outside the assigned daily program and do not mint coins.
- Load PRs are per named resistance exercise, retaining equipment context through Petros's exercise ID. All prescribed sets must report exactly the prescribed repetitions. The first positive load establishes the record and pays no PR bonus; a later eligible completion with higher kilograms pays +100. Equal/lower load, more repetitions alone, zero/absent load or an incomplete exercise earns no PR bonus. One eligible completion per exercise/day prevents farming repeats. Loads are self-reported; the demo does not verify movement or physical technique.
- Shop prices: basic body colors 800, rings 500, expressions 900, basic accessories 1000; catalogue-defined premium items cost more. Defaults are owned at zero cost. Preview is free and does not equip. Purchase checks the **server** price, debits once, adds ownership and equips that item in one saved transaction. Owned items can be equipped freely. Other equipped slots are preserved. No starting bonus balance is invented.

## API

All routes are `crew` only, including Leo while using the astronaut role. Medical-officer and Earth roles cannot fetch the wallet, PRs or wellbeing answers. No caller can select another crew ID; query parameters and unknown body fields are refused. Crew identity, timestamps and actual mission day belong to the core. All successful routes return status 200.

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/me` | none | `{wallet}` |
| POST | `/exercise` | `{missionDay, sessionId, stepId, sets?, weightKg?}` | `{wallet, awards}` |
| POST | `/wellbeing` | `{missionDay, answers}` | `{wallet, awards}` |
| POST | `/purchase` | `{itemId}` | `{wallet, awards:[]}` |
| POST | `/equip` | `{itemId}` | `{wallet, awards:[]}` |

`missionDay` must exactly equal `ctx.missionDay()`; stale completions are not reassigned to a new day. `sessionId` and `stepId` must identify a main exercise in the day's original Mars-transit program. For a prescribed resistance exercise, `sets` contains one integer repetition count per prescribed set and every count must match the program. `weightKg` is null or a finite number 0–1000, explicitly a demo input bound, not a recommended load. Missing/zero load can complete an exercise but establishes no load PR. Timed/interval rowing accepts neither sets nor kilograms.

`answers` contains exactly ten integer scales, 1–10: mood, stress, fatigue, worry, focus, motivation, loneliness, connection, workload, mentalRest. They persist privately in this module; the original three fields continue to save through health's unchanged endpoint as well. No answers are appended to a journal or clinical report. Completing a second time is an idempotent no-op: it neither changes the first answers nor adds points. This feature adds no psychologist role or clinical interpretation.

`wallet` includes integer balance; owned item IDs; equipped `{body,ring,expression,accessory}` IDs; PR records; current training/wellbeing streaks; next eligible reward values; today's completion flags and main-exercise IDs; own today's saved answers; and up to 30 recent own ledger entries. The module retains full internal award/ownership state for deduplication and streaks, with no public crew leaderboard. A full demo reset clears this module just like the others.

Each award is `{id, amount, reason, at, missionDay}`. The frontend shows a small dismissible +amount Pulsars popup, with an X and one short reason. Server state remains authoritative after reload/re-login; popup visibility does not mint or remove coins.

## Failures, concurrency and privacy

The existing core serializes writes within this module. A wallet update is returned only after store save succeeds. Invalid items, unowned equip, insufficient funds, missing/wrong answers or repetitions, unsupported fields and a mismatching day use existing `invalid_field`; role checks use existing contract errors. Duplicate completion/purchase retries are safe. Concurrent purchases cannot overspend. No new external package, key, service or extra production server is required.

The UI retains a per-tab, per-author outbox for a completed main exercise if its reward request fails; it retries for that same mission day only. It does not backdate a completion after midnight, fabricate an offline reward or use a stopped/incomplete session as proof of a complete day. Active training checklist recovery after a browser reload remains the original controller's limitation; saved rewards and PRs are unaffected and cannot be earned twice.

Review requested from zt for the contract/core composition, Angelos for the three-field health boundary/private ten-answer persistence, and Petros for assigned-plan/load-record interpretation. The default production launch still supports the team's network demo; optional `PULSE_HOST=127.0.0.1` binds a local review preview strictly to loopback.
