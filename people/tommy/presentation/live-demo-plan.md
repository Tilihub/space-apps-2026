# Six speakers, one minute each — live presentation proposal

Status: earlier planning draft for Tommy, 15 November 2026. Tommy subsequently requested five candidate stories before assigning speakers; see five-scenarios.md. The owner lineup below is not adopted. Spoken presentation: **Greek**, confirmed by Tommy. Repository notes remain English. No app, reset behavior, teammate file or medical policy has changed in this step.

This replaces the old single-narrator format only if the team adopts it. It preserves the five-person Mars-transit setting from zt's demo-cases.md while assigning one clear aspect to each of the six real presenters. Use the currently merged app/Pulsars as the baseline. dadis2's unmerged console revision remains under separate review.

## Proposed running order

| Time | Speaker (proposed) | Aspect | Prepared state | Live action and visible payoff |
|---|---|---|---|---|
| 0:00–1:00 | zt | Mission and personal Overview | Tomas c4, day 42, populated readings and head symptom | Show the 3D symptom indication and today's simple values; introduce Mars transit and the separate care role |
| 1:00–2:00 | Potest | Habitat and environmental context | Same shared clock; RR-9 history with the overnight excursion and current recovery | Open the CO2 history; explain that past exposure provides context, not proof of what caused a symptom |
| 2:00–3:00 | Angelos | Personal baseline and clinician view | Separate logged-in medical-officer tab, Tomas selected | Show the known 4.6 h versus 6.8 h sleep example and three-day pattern; detailed comparison belongs to care roles |
| 3:00–4:00 | dadis2 | Medication access | Medical path is an open product choice, below | Either reusable Earth credential/due-dose collection with the existing allergy block, or Kai's emergency with required reason and L3 access |
| 4:00–5:00 | Petros | Exercise, load PR and Pulsars | Mara c1; historical earned wallet/streak/PR proposed below; today's squat not yet rewarded | Confirm the prescribed sets and 25 kg once; show exercise and PR awards; optionally unlock one accessory |
| 5:00–6:00 | Tommy | Daily wellbeing and companion; closing | Ines c3; today's full questionnaire unfinished; companion ready | Finish one remaining demo question, then use Missing home to show the offline companion. Close on support/privacy and the common ecosystem |

Target roughly 90–105 Greek spoken words per person, leaving 15–20 seconds for clicks and a short handover. The first speaker includes the introduction; the final speaker includes the closing. Rehearse the actual spoken Greek before claiming a one-minute fit. The local event's recorded slot is seven minutes: reserve the remaining minute for transitions or a failure, rather than automatically adding another scene.

## Presentation reset: desired behavior, not implemented

Use a dedicated presentation store/mode. In that mode the existing Reset demo should restore a **versioned complete scenario**, not require an operator to run an extra seeder or manually prepare five profiles. Preserve ordinary development/user data separately. A reset affects all open presentation tabs on the shared server, never only the current presenter.

Restore all of these together, then signal that the presentation is ready:

- Day 42, 07:30 UTC; Petros's fixed historical references and agreed current synthetic readings.
- The selected stored symptom for Tomas, known NSAID allergy and original stock/expiry fixtures.
- Exact medical request/grant/due-dose states for the chosen scene. No pre-collected live dose and no open emergency banner before it is intentionally triggered.
- Per-person Pulsars ledger, ownership, equipped default mascot and load records; today's live completion/reward must remain unclaimed.
- Questionnaire demo drafts clearly distinguished from completed submissions; nine displayed example answers may be prepared, with the tenth submitted live. No claim that these are real astronaut answers or a validated diagnostic score.
- Clear previous run's pending collections, reports/replies, incident flags, training ticks/timers, duplicate-reward markers, outbox entries, chat previews and local form drafts. Re-initialize the intended scenario drafts after clearing them.
- Keep the ordinary role boundaries. Prepared tabs use normal simulated logins; do not hand a clinical token to an astronaut view.

Repeated resets must produce the same medical/workout/wallet starting state, without accumulated stock loss, purchases, coins, messages or old emergency banners. Every browser tab should converge on that same state after the reset. Do not reset again between speakers: scenes share the same run.

Today the standard module reset restores historical fixtures but the populated current-day presentation uses a separate seeder. The complete automatic presentation reset needs implementation and tests after this plan is agreed; it is not already available.

## A reproducible exercise payoff

A proposed consistent ledger can make the one-minute scene visually strong without gifting fake coins:

1. Initialize Mara's completed training history on mission days 38, 39 and 40 through the actual reward rules: one main interval exercise (100), five main exercises (500 total), one main interval exercise (100). Starting earned balance: **700 Pulsars**. Day 41 is scheduled rest and preserves the three-day streak.
2. Retain a valid previous squat record of **20 kg**, with the prescribed sets/reps from that historical program. It is the baseline, not an already-earned PR bonus.
3. On day 42, the presenter records the assigned **4 × 12 at 25 kg** as an explicitly fictional stage input. The fourth consecutive eligible training day pays **200**, and the higher valid load adds **100**. Wallet: **1,000**.
4. A 1,000-Pulsars accessory can then be unlocked and worn. The first record alone, repetitions alone, repeat clicks or repeating the same exercise/day must not pay again.

This is a proposed demo fixture and self-report, not an exercise prescription or a live sensor measurement. Marking one exercise complete does not falsely close the entire daily training task: other assigned main exercises remain pending. If any set ticks are prefilled, that preparation must be explicitly described as already performed demo sets; do not imply a full real workout happened in one minute. Stage-demo push-ups currently earn no Pulsars, so they cannot substitute for this reward scene without a separately agreed change.

## Medical-minute decision pending

Choose one primary path to fit sixty seconds:

- **Prescription path:** show Tomas's normal-flow allergy restriction, then a prepared simulated Earth credential and the currently due collection. Keep QR/manual-code equivalence, patient binding and repeat-dose protection. A physical camera scan should have the same-code fallback. Do not wait twelve real minutes for a reply; establish that the shown reply is a prepared earlier demo message.
- **Emergency path:** begin with no open incident. Choose Kai and enter the short required reason, release an emergency-tier item and show the shared alert. The doctor and paperwork are mentioned briefly. The planned AED remains unconnected and is not collected live.

Tommy was asked which of these should be the primary minute. The unmerged dadis2 changes to doctor access and optional emergency reason are not adopted by writing this script.

## Rehearsal and fallback

Use one operator/laptop and prepared role tabs by default, with a fixed transition order. The speakers can concentrate on their sixty-second story while the operator clicks. Multiple devices are optional after the same-server reset is verified. Preload the 3D model/fonts before going on stage.

For every scene prepare one current screenshot and one spoken fallback sentence. If a screen does not respond promptly, show that scene's screenshot and continue; do not debug on stage or claim that the failed live step succeeded. Do not request camera permissions for the first time on stage.

After agreement, produce six separate Greek cue cards: exact speech, timed click cues, visible payoff, next-speaker handover and fallback. Keep an English source version in this public repo and Greek delivery artifacts outside it, following the repository language rule.

## Claims to keep accurate

Synthetic crew/health histories; historical Habitat replay; simulated skin map and workout sensors; offline contextual companion rather than a trained external LLM; scripted psychologist preview rather than delivered Earth chat; simulated cabinet hardware, credentials and link delay; planned/noncollectable AED; no readiness diagnosis from the colored Overview instruments. Explain the common demo boundary briefly rather than repeating a long disclaimer in every minute.
