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
| With context | Uses today's 5.5 hours of sleep and stress at 7/10, recognizes two earlier nights well below the 7.8-hour reference, and suggests reviewing the sleep logs with the crew medical officer. |

Tests check both responses and verify that one historical short night plus today's short sleep doesn't trigger the repeated-pattern response.

```powershell
node --test "**/*.test.js" people/potest/crew-support/server.test.mjs
```
