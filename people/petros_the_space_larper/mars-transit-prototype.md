# Mars-transit health prototype scope

Proposal for the team, 2026-11-14. The first demo shows a crew member completing a health check-in during a loss of Earth communications, requesting human support onboard, and following an authorized report through reconnection. The [deep-space research notes](astronaut-deep-space-countermeasures.md) and [physical and mental health notes](astronaut-physical-and-mental-health.md) explain the evidence behind this scope.

## What to put on the daily health screen

| Area | First-demo fields and actions |
|---|---|
| Mental health | One daily check-in in mission time. Capture mood, stress and fatigue using the existing 0–10 input directions, and sleep over the previous 24 hours in hours. Use the existing personal baseline and history. Add optional perceived workload, feeling isolated or supported, and impact on duties. Show a persistent **Request private support** action, available even without a completed check-in. |
| Sleep and workload | Show planned sleep alongside estimated or reported sleep. Mark the source and keep sleep quality as an optional self-report. Allow the crew member to record an agreed change to their schedule or workload and revisit it at the next check-in. A short offline relaxation exercise is an optional addition when content is already available. |
| Physical health | Show resting heart rate in bpm, respiratory rate in breaths/min, SpO₂ in percent, systolic and diastolic blood pressure in mmHg, and temperature in °C with the method or measurement site. Each reading has a timestamp, source and quality or availability. Support manual symptom entry with severity, onset and impact on duties. Start with headache, nausea, dizziness and a new change in vision. Log exercise duration and perceived effort, and fluid intake in mL when available. |
| Cabin context | Show CO₂, temperature and humidity in a separate panel. Show an optional radiation replay with its instrument, units and mission label. A case report can include a time-stamped cabin snapshot. For the demo, use synthetic Mars-transit crew observations and cabin events. Label historical replays explicitly. |

Reuse the existing comparison engine for `resting_heart_rate_bpm`, `sleep_hours`, `mood`, `stress` and `fatigue`. Higher mood means better mood, and higher stress and fatigue mean more of each. Keep the baseline fixed during the demo and preserve absent or unusable measurements as missing. Show changes with the underlying values and dates. The additional optional fields can be displayed and attached to reports without adding them to the scoring logic. The current comparison thresholds are demo values. Include a **Call the crew medical officer** action for a crew-reported urgent concern, independently of the trend comparison. [Existing health core](../angelos/health_monitor/README.md) · [NASA Medical Operations, §§6.1–6.3](https://www.nasa.gov/reference/6-0-medical-operations/)

## When Earth communications are unavailable

| Step | Expected behavior |
|---|---|
| Show connection state | Display **Earth link unavailable** and the last successful contact in mission time. Show **Earth link available with delay** separately. Mark stale sensor readings with their time, even if the Earth link is available. |
| Continue normal use | Save check-ins, vitals, symptoms and notes onboard. Keep personal history, baseline comparisons, onboard procedures, and local inventory available. The assistant can show fixed local guidance links and summarize permitted measurements. |
| Provide human support onboard | For mental health, let the astronaut request private contact with the designated onboard person and select what to share. For a physical incident, the crew medical officer can review symptoms, recent readings and cabin context, open an approved onboard procedure, and record action and follow-up. Use the mission's onboard path for urgent concerns. |
| Respect the existing authorization proposal | Keep onboard-authorized supply requests within the approved onboard workflow. Show a request that requires Earth authorization as **Awaiting Earth approval**. The communications outage does not confer a new access grant. The team still needs to decide the exact permissions and categories. |
| Prepare Earth reports | Allow authorized users to preview a compact report with recipient, case ID, event time, symptom onset and severity, recent relevant values and changes, selected cabin context, actions taken, and the question for Earth. Keep private journal text outside the ordinary report and assistant inputs. The crew member selects the check-in details for the private support request. Distinguish a saved draft from an authorized report waiting to transmit. |
| Restore and confirm | When communication returns, send authorized queued reports. Keep a unique report ID across retries, with multiple reports able to reference the same case ID. Show **Queued**, **Sent**, and **Receipt confirmed** separately. Display a later clinical reply as its own event linked to the report. For demo tests, reconnection and receipt can be simulated locally. |

NASA's standard describes private medical and psychological communication, including delayed store-and-forward options. Exploration medical operations put time-sensitive decisions onboard with trained crew and mission procedures. The data-sharing design above is a prototype proposal, with journal visibility and Earth authorization aligned with the team's current planning brief. [NASA Medical Operations](https://www.nasa.gov/reference/6-0-medical-operations/) · [Earth Independent Medical Operations](https://journals.sagepub.com/doi/10.1177/10806032241310386) · [Team reporting and privacy brief](https://github.com/Tilihub/space-apps-2026/blob/993bc45/people/tommy/plan.md)

## Demo checks

1. Turn off the simulated Earth link. Submit a synthetic daily check-in with poor sleep, increased stress and one missing reading. Restart the app and check that the entry and the data gap reappear without Earth access.
2. Request private onboard support, then log an agreed follow-up. Add a synthetic physical symptom and open the onboard procedure and inventory for the crew medical officer. Verify that the ordinary report preview omits the test journal entry and that an Earth-gated request remains pending.
3. Queue an authorized report, restore the simulated link, and show that a retry keeps the same report ID and produces one logical report. Confirm that the queued, sent and receipt states require distinct events.

## Components to reuse

- Angelos's published [interactive check-in and weekly summary](https://github.com/Tilihub/space-apps-2026/blob/35a3f60/people/angelos/health_monitor/README.md) already store synthetic check-ins in local SQLite. Access control and protected storage would be integration work for any real records.
- Potest's [environment monitor](../potest/environmental-graphs/README.md) already runs offline and exports a snapshot. Curiosity cruise is a robotic radiation source. Orion's Artemis II temperature and humidity come from storage lockers. Use the source labels when replaying either.
- Dadis2's [inventory prototype](https://github.com/Tilihub/space-apps-2026/blob/5a7febb/people/dadis2/inventory/README.md) demonstrates browser-local inventory and approval flows. Apply the team's agreed permissions when integrating it.
- The [vital-sign CSV](astronaut-inflight-vitals.csv) provides historical crew snapshots with units and provenance. Use synthetic people, check-ins and incidents for the Mars-transit demo. Leave continuous wearable integration, advanced tests such as OCT and ultrasound, and live Earth communications for later integration.
