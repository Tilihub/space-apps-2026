# Onboard app

The joined onboard app from the [app contract](../../shared/contract/README.md): one Node.js server
that holds all data and rules, one module per piece, and pages that draw everything. zt builds this
folder (contract section 2); every teammate's module is imported straight from their own folder.

## What it joins

| Piece | From | In the app yet |
|---|---|---|
| Core: login, crew, mission clock, events, saving, files | zt, this folder | yes |
| example module | `shared/contract/example/` | yes, only to prove the core; health replaces it |
| health | angelos, `people/angelos/health/` | not yet; `alignment.test.js` already runs it in the core |
| meds | dadis2, `people/dadis2/meds/` | not yet; `alignment.test.js` already runs it in the core |
| env | potest, `people/potest/env/` | not built yet |
| mind | to agree (angelos or potest) | wave 2 |
| demo data | petros, `people/petros_the_space_larper/demo-data/` | served read-only at `/demo-data/`; health loads its `health.json` |
| Pages | zt, `pages/` | only `/demo/` (demo controls) so far |

## Run it

Node.js 24, no packages, nothing to install. From the repo root:

```bash
node integration/onboard-app/start.js
```

It prints the addresses: `http://localhost:8000/` on this laptop, and one for other devices on the
same network. Use another port with `PORT=8001 node integration/onboard-app/start.js`. Stop with
Ctrl+C. (`npm start` comes later: it needs a change to the root `package.json`, which is protected.)

Open `/demo/` to log in, move the mission clock, reset the demo and watch the events.

Tests: `npm test` (or `node --test "**/*.test.js"`) from the repo root runs these with everyone else's.

## How it works

- `start.js` starts everything. `modules.js` lists the modules. `core.js` is the core (no HTTP).
  `server.js` puts it on the network: `/api/...` goes to the core, everything else is a file.
- **Saved data** goes to `data/` (not committed): `core.json` for the clock, logins and the event
  counter, and one `<module>.json` per module. A module with no saved data gets its `reset` at
  start. Delete `data/` to start completely fresh; "Reset demo" does the same without a restart.
- **One request at a time per module**, so two requests can never mix their load-and-save steps
  and lose a change. Different modules still run side by side.
- **Mission clock:** starts at day 42, 07:30 (`DEMO_START`), runs at normal speed, and only jumps
  forward. It **pauses while the server is off**: a restart carries on from the last saved time
  (saved every 5 seconds). Reset demo puts it back to day 42, 07:30.
- **Logins** are simulated: pick a crew member and a platform. The medical officer platform is
  Leo (`c2`) only. Tokens survive a restart. Reset demo doesn't log anyone out.
- **Events:** ids keep counting up across restarts. Pages ask `GET /api/events?after=<id>` every
  2 seconds and always carry on from the `lastId` they get back.
- **Files it serves:** `pages/` at `/`, `shared/contract/contract.js`, angelos's
  `people/angelos/health/client.js` at the same paths as in the repo, and petros's `demo-data/`
  at `/demo-data/`. Nothing else in the repo is reachable.

## Does it work yet

Step 1 of 5 works: the core with the example module. 12 tests pass, including health and meds
running inside the core over real HTTP with petros's day-42 data (`alignment.test.js`): Tomas
checks in, Leo sees sleep under his normal 3 days in a row, Tomas is refused the analysis, and a
headache offers acetaminophen with ibuprofen blocked.

Next:

1. Health in the app: add it to `modules.js`, follow angelos's
   `people/angelos/health/TEAM_NEXT_STEPS.md` (zt's part).
2. Meds in the app, with dadis2's "For zt" notes in `people/dadis2/meds/README.md`.
3. A bare astronaut page, then the medical officer page, then env when potest's module exists.
