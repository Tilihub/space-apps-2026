# Crew Support

Crew Support is a local scripted conversation about missing home. For the check-in and health history comparison, open the [Crew Assistant integration demo](../../../integration/crew-assistant/README.md).

From the repository root with Node.js 24:

```powershell
node people/potest/crew-support/server.mjs
```

Open [Mind in the mission dashboard](http://127.0.0.1:4170/#mind) and select **Open Crew Support chat**. Try “I miss talking with my family after dinner,” followed by “Evenings are the hardest.” The example runs offline and replies follow the scripted sequence. Use fictional details. Chat history stays in the current page and clears when leaving or selecting **Clear chat**. **Get human support** shows guidance for contacting the designated mission roles.

`CREW_SUPPORT_PORT` overrides port `4170`. Run the local HTTP checks with:

```powershell
node --test people/potest/crew-support/server.test.mjs
```

## Onboard integration

Import `companionRoute` from `companion.js` into the onboard **Mind** module's route list. The shared dispatcher provides the authenticated crew user and mission clock. Mount the route as `POST /api/mind/companion` in the single onboard core. Mounting it and serving the browser module graph belong to the app integration.

Use `createCompanionClient` from `companion-client.js` in the crew page:

```js
const companion = createCompanionClient({ getToken: () => currentCrewSession?.token });
const { reply, links } = await companion.send(message);
```

The client reloads `getCompanionContext()` through Angelos's health client before each turn. Update the token, call `companion.clearSession()` and clear rendered replies on logout, crew changes and demo reset. The client discards an in-flight result after a token change or explicit reset. The route accepts the signed-in author's current mission-day entry and returns a scripted reply with navigation links. A missing entry offers the check-in screen, and skipped measurements stay unknown. Clinical history and analysis remain in the health module's care views. [Angelos's handoff](../../angelos/health/TEAM_NEXT_STEPS.md#potest-connect-the-companion-to-the-approved-health-context)

The onboard integration tests run the browser client through the shared dispatcher with Angelos's real health module, covering two crew sessions, missing data, role refusals, mission-day changes and reset. The full onboard app still needs to mount the route and connect its session lifecycle. The standalone history comparison continues to use one synthetic crew profile.
