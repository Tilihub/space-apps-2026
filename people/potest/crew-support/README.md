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
