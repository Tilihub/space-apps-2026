# PULSE live presentation — initial script idea (v2)

**Team review draft, not a final script.** Published at Tommy's request so every teammate and their coding tool can see the current idea and revise it together. Seven minutes total; Greek spoken delivery; English repository notes. Speaker assignment and exact Greek wording are still open. Do not treat the earlier owner-assigned lineup as agreed.

## Current story

We follow five fictional crew members during a long journey toward Mars. Each story shows a different aspect of the same onboard application. Six real team members can present: five story presenters and an introduction/closing presenter, with the final split decided together.

| Clock | Segment | Initial narrative and live action |
|---|---|---|
| 0:00–0:45 | Introduction | Health information, routines and medical resources must work together during a long mission with delayed Earth support. Introduce PULSE, the challenge, and the common onboard server. Identify historical NASA environmental data and synthetic crew/demo inputs. |
| 0:45–1:50 | Tomas — headache and cabin context | Tomas wakes with a headache after short nights. Show the Overview/body indication and overnight CO2 history. PULSE provides useful context for assessment; it does not diagnose the cause from these two observations. |
| 1:50–2:55 | Mara — exercise and personal progress | Open Exercise → Program → Stage demo and finish the stage push-ups. The stage adapter gives fixed +200 exercise and +100 record rewards, taking the prepared 700 Pulsars to 1000 for glasses. Explain that this is a scripted stage reward; it does not demonstrate a validated kilogram PR. Ordinary assigned workouts retain their own rules. |
| 2:55–4:00 | Kai — sudden cardiac arrest and AED | In the fictional emergency, a crewmate opens Emergency, selects Kai and the AED, enters the short reason and confirms equipment collection. The story ends with trained crew successfully resuscitating Kai. This is a narrated simulation, not a recovery detected or guaranteed by the app. |
| 4:00–5:05 | Ines — wellbeing and private support | Finish the prepared ten-question daily wellbeing and open the companion with Missing home. Show participation and a private support interface; rewards do not depend on positive answers. The current companion is offline/contextual and the psychologist chat remains a scripted preview. |
| 5:05–6:10 | Leo — clinical picture and Earth | Show Tomas's prepared sleeping-pill request waiting for Earth, approve it in the simulated Earth console, then scan/type the returned credential in Tomas's Medical bay → My treatment and collect the due dose. The medical-officer console now contains Approvals and Inventory, without the earlier clinical-analysis screen. Earth transport is simulated. |
| 6:10–6:40 | Closing | Connect the five stories: a shared ecosystem supporting daily routines, environmental awareness, privacy and accountable care. State the impact, one concrete next development step, and close. |
| 6:40–7:00 | Reserve | Transitions or a delayed click. Have screenshots ready rather than using this time for another scene. |

## The reset requirement

Tommy wants the presentation app ready after every reset: correct profiles, symptoms, stock, clinician/request/grant state, wallet/PR history, unfinished live tasks and prepared demo drafts. Clear previous-run emergencies, collections, rewards, messages and local timers. Reset once before the full run, not between speakers.

**Implemented on main:** `node integration/onboard-app/start.js --presentation` (or `PULSE_PRESENTATION=1`) prepares day 42 on startup, Reset and leaving day 42. It initializes today's check-ins, Tomas's head symptom and pending Earth request, Ines's journal/nine sample wellbeing answers, Mara's earned 700-Pulsars history and reset cabinet stock, including the AED. This mode resets its data folder: use a dedicated demo store. Public demo: https://pulse-crew-health.onrender.com/. Hosting/deploy details: [deploy guide](../../../shared/submission/deploy.md).

The public app shares one store across visitors; reset once before the full run, not between speakers. Rehearse all role tabs and verify the deployed revision before presenting. Stage push-up rewards are fixed +300 on every run, even without presentation mode; do not describe them as the normal validated-load PR system. The existing normal workout reward rules remain separate.

## Details for iteration

- [Five scenario candidates](five-scenarios.md): prepared state, live payoff and implementation boundaries.
- [Exact seven-minute run](seven-minute-run.md): timing, emergency cues and presentation framing.
- [Earlier planning discussion](live-demo-plan.md): background only; its speaker order/timing is superseded.
- [Working AED screenshot](review/aed-open.jpg).

Next: agree the final five story actions and speaker split, write/rehearse each Greek cue card, and rehearse the implemented presentation reset and all five flows. This documentation update does not change the application or authorize a merge.
