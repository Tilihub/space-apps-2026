# Crew Support

Crew Support is a text chat for astronauts who want to talk about isolation, missing home, workload, sleep or crew tension. This prototype links zt’s dashboard skeleton to a Node server that calls the [OpenAI Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create). OpenAI runs the model. The default is [`gpt-5.4-mini`](https://developers.openai.com/api/docs/models/gpt-5.4-mini).

## Run the demo

From the repository root with Node.js 22 or newer:

```powershell
node people/potest/crew-support/server.mjs --demo
```

Open [the mission dashboard](http://127.0.0.1:4170/#mind) and select **Open Crew Support chat**. Try “I miss talking with my family after dinner,” followed by “Evenings are the hardest.” Scripted replies illustrate the demo flow with fictional messages and work without internet access.

For live AI, set `OPENAI_API_KEY` in the server environment using a project key with API billing and model access, then run:

```powershell
node people/potest/crew-support/server.mjs
```

`OPENAI_MODEL` overrides the default model. `CREW_SUPPORT_PORT` overrides port `4170`. The key stays in the server environment. The browser displays the mode and whether it sends messages to OpenAI. Use fictional astronaut details in either mode.

## Handoff

The server adds a link to the existing **Mind → Support** placeholder when it serves the dashboard. `GET /api/crew-support/status` returns a `mode` of `demo`, `live`, or `unconfigured` based on server startup configuration. `live` means the key is present. OpenAI confirms its validity when a message is sent.

`POST /api/crew-support` accepts JSON containing an alternating `messages` array that starts and ends with a `user` message. The UI sends up to five prior user/assistant pairs and the current message. Each entry has a `role` and string `content` of at most 2,000 characters.

```json
{"messages":[{"role":"user","content":"I miss talking with my family after dinner."}]}
```

Success returns `{ "reply": "…" }`, with `"urgent": true` when input moderation flags self-harm intent. Errors return a non-2xx status and `{ "error": "…" }`. The browser keeps the draft on failure. The server runs text moderation before generation and before displaying the model’s reply. **Get human support** displays onboard and ground contact guidance. The actual human messaging and alerting channels still need integration with the mission app.

Run the HTTP tests with:

```powershell
node --test people/potest/crew-support/server.test.mjs
```

The tests use a loopback server and mock OpenAI. They cover dashboard linkage, scripted and multi-turn live request handling, input validation, moderation, missing configuration, quota errors, and timeouts. A live OpenAI call requires a configured project key.

## Limits for mission use

- **Connectivity.** Two moderation checks and one generation call mean up to three external requests per reply. The wrapper is suitable for an Earth-based demo. Mars latency and communications outages make cloud chat unsuitable for immediate onboard support. The demo’s scripted responses are fixed examples. [NASA Behavioral Health](https://www.nasa.gov/directorates/esdmd/hhp/behavioral-health/)
- **Privacy.** History stays in the current page and clears on exit or on request. The app leaves journals, vitals and reports out of chat. Live requests send recent conversation text to OpenAI. The app sets `store: false` for Responses API application state. Under default settings, Responses API abuse-monitoring logs may retain content for up to 30 days, subject to exceptions. Real crew use requires an approved arrangement for external processing and retention. [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data) · [NASA Medical Operations](https://www.nasa.gov/reference/6-0-medical-operations/)
- **Clinical and deployment boundaries.** A mission behavioral health team would need to review conversation behavior, escalation wording, multilingual cases, and outage procedures. Moderation can miss urgent situations or flag benign language. This server binds to loopback for a local demo. Integration with a shared deployment needs authenticated crew access and per-user usage limits. zt and Angelos can use the route contract when wiring the application’s Mind and companion features.
