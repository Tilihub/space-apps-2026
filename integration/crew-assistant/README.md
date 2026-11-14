# Crew Assistant integration demo

This joins Petros's synthetic health data, Angelos's interactive check-in storage and validation, and Potest's OpenAI-backed Crew Support adapter on one page. Tomas is the only crew member in this demo.

## Run it

From the repository root with Node.js 24 and Python 3.11+ available:

```powershell
node integration/crew-assistant/demo.mjs --demo
```

Open [Crew Assistant comparison](http://127.0.0.1:4171/crew-assistant). Select **Fill Tomas’s example**, adjust any fields, then **Save check-in**. Select **Compare replies** to send the same prompt into four fresh conversations. The synthetic check-in survives a page reload. Stop and restart the server to start another run with a fresh database. Set `CREW_ASSISTANT_PYTHON` if the Python executable has a different name or path, or `CREW_ASSISTANT_PORT` to choose a different port.

For a live comparison, configure `OPENAI_API_KEY` in the server environment for a billed API project and run the same command without `--demo`. The default model is `gpt-5.4-mini`, and `OPENAI_MODEL` can override it. Use fictional details. Live mode sends the prompt and the selected synthetic context to OpenAI. Each case can make up to three API calls for input moderation, generation and output moderation.

## Context and permissions

- `tomas-history.json` is the `c4` export of Petros's [PET-1 fixtures at 12c840e](https://github.com/Tilihub/space-apps-2026/tree/12c840ee2ab9ced49b01a12efb5e5063487de594/people/petros_the_space_larper/demo-data). `tomas-check-in.json` retains the five supported fields from the day-42 scenario. The profile is synthetic, including its personal reference.
- The form saves day 42 through Angelos's `CheckInStore`. It uses a temporary, dedicated SQLite file, Petros's 1–10 scales, explicit missing values and the mission clock from the fixture. Angelos's `baseline_statistics` calculates the reference from days 29–35. The health context includes only that reference and days 40–41 sleep and resting heart rate. Saving today leaves the reference and earlier observations intact.
- The server constructs the four context packets. Each request gets the same user prompt and only the selected sources. Journal entries, health reports, other crew data and arbitrary client-supplied context are outside the demo. The team contract still leaves the companion's access to detailed analysis open. This local single-profile experiment uses synthetic measurements to evaluate the comparison and needs an agreed permission boundary before integration with the crew app.

## Observed response comparison

Prompt: “I feel worn down and out of sorts today. Can you help me make sense of it?”

| Case | What the scripted reply did |
| --- | --- |
| No context | Acknowledged the concern and asked when it started. |
| Check-in only | Used today's 5.5 hours of sleep and stress of 7/10. Asked how today felt compared with earlier days. |
| Health data only | Cited 5.9 and 5.6 hours on days 40–41 against a 7.8-hour personal reference. Asked about last night. |
| Full context | Connected today's entry and the earlier records, calculated 2.3 hours below the reference, and asked what felt useful to raise with the crew. |

The scripted replies demonstrate how supplying different data changes the information the assistant can use. Automated tests verify the exact source selection sent to the mocked OpenAI API and preservation of missing fields. Chrome verification covered the form, save, reload, side-by-side replies and mobile width. Live model adherence, quality, and consistency remain unverified because the workspace has no OpenAI key.

```powershell
node --test "**/*.test.js" people/potest/crew-support/server.test.mjs
```
