# Crew Assistant integration demo

This joins Petros's synthetic health data, Angelos's interactive check-in storage and validation, and Crew Assistant's scripted replies on one page. The demo runs locally with no API key or internet connection.

## Run it

From the repository root with Node.js 24 and Python 3.11+ available:

```powershell
node integration/crew-assistant/demo.mjs
```

Open [Crew Assistant comparison](http://127.0.0.1:4171/crew-assistant). Select **Fill Tomas’s example**, adjust any fields, then **Save check-in**. Select **Compare replies** and switch between **No context** and **With context** for the displayed prompt. The synthetic check-in survives a page reload. Stop and restart the server for a fresh check-in. Set `CREW_ASSISTANT_PYTHON` if the Python executable has a different name or path, or `CREW_ASSISTANT_PORT` to choose a different port.

## Context and permissions

- `tomas-history.json` is the `c4` export of Petros's [PET-1 fixtures at 12c840e](https://github.com/Tilihub/space-apps-2026/tree/12c840ee2ab9ced49b01a12efb5e5063487de594/people/petros_the_space_larper/demo-data). `tomas-check-in.json` retains the five supported fields from the day-42 scenario. The profile is synthetic, including its personal reference.
- The form saves day 42 through Angelos's `CheckInStore`. It uses a temporary, dedicated SQLite file, Petros's 1–10 scales, explicit missing values and the mission clock from the fixture. Angelos's `baseline_statistics` calculates the reference from days 29–35. The health context includes only that reference and days 40–41 sleep and resting heart rate. Saving today leaves the reference and earlier observations intact.
- **With context** uses the current check-in and the synthetic health history. Angelos's demo comparison identifies at least two consecutive earlier days with sleep below the personal reference by the engine's demonstration threshold. The current check-in adds detail about today. This rule is for the demonstration.

## Observed response comparison

Prompt: “I feel worn down and out of sorts today. Can you help me make sense of it?”

| Case | What the scripted reply did |
| --- | --- |
| No context | Acknowledges a hard day and asks what has been hardest today. |
| With context | Uses today's check-in and the repeated sleep shortfall to suggest protecting the next sleep block, reviewing workload with the crew medical officer, and following up at the next check-in. It offers a short wind-down and private behavioral health support if stress continues. |

Tests check both responses and verify that one historical short night plus today's short sleep doesn't trigger the repeated-pattern response.

## Research behind Tomas’s plan

- **Sleep and workload.** Protect the next planned sleep block and discuss moving a noncritical task with the crew medical officer. Petros proposes reviewing duty periods and revisiting any crew-approved schedule change at the next check-in. NASA includes work/rest schedules and task loading in fatigue management. [Deep-space countermeasures](../../people/petros_the_space_larper/astronaut-deep-space-countermeasures.md#mental-health-and-crew-performance) · [NASA Medical Operations §6.1](https://www.nasa.gov/reference/6-0-medical-operations/#h-6-1-circadian-shifting-operations-and-fatigue-management)
- **Coping and professional support.** Offer comfortable breathing as an optional wind-down. The HI-SEAS study in Petros's review tested acceptance of an offline stress-management resource in a small analog crew. If stress continues, suggest a private conversation through the designated mission channel. [HI-SEAS study](https://drpst.dartmouth.edu/user_resources/publications/pdf/Anderson%20AMHP%202016-1.pdf) · [NASA Medical Operations §6.3](https://www.nasa.gov/reference/6-0-medical-operations/)
- **Follow-up.** Record sleep, fatigue and stress again to help Tomas and the medical officer review the effect of an agreed change. The two-night trigger is a demo rule. The sleep records describe duration, and the check-in describes how Tomas feels. [Physical and mental health research](../../people/petros_the_space_larper/astronaut-physical-and-mental-health.md) · [Mars-transit prototype](../../people/petros_the_space_larper/mars-transit-prototype.md)

## Run the checks

```powershell
node --test "**/*.test.js" people/potest/crew-support/server.test.mjs
```
