# PULSE live presentation — initial script idea (v1)

**Team review draft, not a final script.** Published at Tommy's request so every teammate and their coding tool can see the current idea and revise it together. Seven minutes total; Greek spoken delivery; English repository notes. Speaker assignment and exact Greek wording are still open. Do not treat the earlier owner-assigned lineup as agreed.

## Current story

We follow five fictional crew members during a long journey toward Mars. Each story shows a different aspect of the same onboard application. Six real team members can present: five story presenters and an introduction/closing presenter, with the final split decided together.

| Clock | Segment | Initial narrative and live action |
|---|---|---|
| 0:00–0:45 | Introduction | Health information, routines and medical resources must work together during a long mission with delayed Earth support. Introduce PULSE, the challenge, and the common onboard server. Identify historical NASA environmental data and synthetic crew/demo inputs. |
| 0:45–1:50 | Tomas — headache and cabin context | Tomas wakes with a headache after short nights. Show the Overview/body indication and overnight CO2 history. PULSE provides useful context for assessment; it does not diagnose the cause from these two observations. |
| 1:50–2:55 | Mara — exercise and personal progress | Complete a prepared assigned exercise, record a valid higher kilogram PR, show the Pulsars rewards and optionally buy a companion accessory. Personal growth and consistency, with no crew competition. Proposed fixture: 700 earned historical Pulsars +200 exercise +100 PR =1000 for glasses. |
| 2:55–4:00 | Kai — sudden cardiac arrest and AED | In the fictional emergency, a crewmate opens Emergency, selects Kai and the AED, enters the short reason and confirms equipment collection. The story ends with trained crew successfully resuscitating Kai. This is a narrated simulation, not a recovery detected or guaranteed by the app. |
| 4:00–5:05 | Ines — wellbeing and private support | Finish the prepared ten-question daily wellbeing and open the companion with Missing home. Show participation and a private support interface; rewards do not depend on positive answers. The current companion is offline/contextual and the psychologist chat remains a scripted preview. |
| 5:05–6:10 | Leo — clinical picture and Earth | Show Tomas's detailed sleep comparison in the clinician role, then a consistent prepared Earth reply/credential and the patient's currently due collection. Distinguish crew Overview, clinician assessment and controlled access. A pre-arrived simulated reply avoids waiting real mission-delay minutes on stage. |
| 6:10–6:40 | Closing | Connect the five stories: a shared ecosystem supporting daily routines, environmental awareness, privacy and accountable care. State the impact, one concrete next development step, and close. |
| 6:40–7:00 | Reserve | Transitions or a delayed click. Have screenshots ready rather than using this time for another scene. |

## Scenario 4 speaker cues — Crew Assistant

Use these cues inside the existing 4:00–5:05 slot. The comparison screenshots come from a separate controlled rehearsal, so the live Ines scene and the following clinician scene keep their prepared state.

| Time | On screen | Spoken cue for Greek delivery |
|---|---|---|
| 4:00–4:18 | As Ines, finish the prepared daily wellbeing check-in and open **Wellbeing**. | “Ines can check in about how she feels and talk privately to the Crew Assistant onboard.” |
| 4:18–4:30 | Select **Missing home** and show the offline reply. | “The assistant acknowledges how hard it can feel to be far from home and asks what she misses most.” |
| 4:30–4:53 | Show the two prepared replies side by side. Both astronauts entered the same check-in and typed **“I am not feeling very well today.”** | “Mara had been doing well, so she gets a suggestion to take a quiet break and check in again after sleep. Tomas has had several difficult days. The same question prompts him to ask the crew medical officer for help protecting his next sleep block.” |
| 4:53–5:05 | Hand over to Leo’s clinician view. | “The assistant uses scripted replies offline. Leo will now show how a clinician reviews the underlying readings.” |

**Prepare the comparison.** On `potest/controlled-crew-assistant`, start the app with `node integration/onboard-app/start.js --controlled-companion`. For both Mara Quinn and Tomas Reyes, enter 4.6 hours of sleep and the same ten ratings. Use mood 5, stress 7, fatigue 7, worry 5, focus 4, motivation 5, loneliness 7, connection 5, workload 6 and mental rest 5. The overnight history is synthetic. Mara’s recent check-ins are steady. Tomas has four consecutive earlier days of short sleep, high stress and fatigue. Capture each reply with the prompt visible. Prepare a screenshot of Ines’s completed check-in and reply in case the live submission takes too long.

## The reset requirement

Tommy wants the presentation app ready after every reset: correct profiles, symptoms, stock, clinician/request/grant state, wallet/PR history, unfinished live tasks and prepared demo drafts. Clear previous-run emergencies, collections, rewards, messages and local timers. Reset once before the full run, not between speakers.

**The complete automatic presentation initializer is not implemented yet.** The table describes the intended prepared scenarios, not existing automatic reset presets. The AED itself is connected on this branch with one stock unit, emergency-only collection and ordinary reset behavior; preview localhost:8024. Do not adopt unmerged dadis2 policy changes just because they appear in another preview.

## Details for iteration

- [Five scenario candidates](five-scenarios.md): prepared state, live payoff and implementation boundaries.
- [Exact seven-minute run](seven-minute-run.md): timing, emergency cues and presentation framing.
- [Earlier planning discussion](live-demo-plan.md): background only; its speaker order/timing is superseded.
- [Working AED screenshot](review/aed-open.jpg).

Next: agree the final five story actions and speaker split, write/rehearse each Greek cue card, and implement the agreed deterministic presentation initialization. This publication does not change the application or authorize a merge.
