# Deploying the app

The Local Event needs the app at a public web address; localhost isn't accepted. The plan is
Render's free tier, deploying straight from this public repo. **Not deployed yet:** we deploy once
`final/` holds the finished app.

## Render settings

On zt's Render account: New → Web Service → **Public Git Repository**. These were filled in and
checked on 15 November; only the start command changes once `final/` exists.

| Setting | Value |
|---|---|
| Repository URL | `https://github.com/Tilihub/space-apps-2026` |
| Branch | `main` |
| Name | `pulse-crew-health`, giving `https://pulse-crew-health.onrender.com` (Render adds a suffix if it's taken) |
| Language | Node |
| Region | Frankfurt (EU Central), the closest to Greece. The form defaults to Oregon |
| Build command | `npm install` (there are no packages, so it does nothing) |
| Start command | `node final/onboard-app/start.js`, see below |
| Instance type | **Free, $0/month.** The form pre-selects the $7 plan, so switch it |
| Environment variable | `NODE_VERSION` = `24`, the version our tests run on |

Then press **Deploy web service**. The first build and start take a few minutes.

## What `final/` must keep for this to work

Checked on main at `834d3fe`: with `integration/onboard-app/` copied to `final/onboard-app/` and
`integration/crew-assistant/replies.mjs` copied to `final/crew-assistant/replies.mjs`, all six
modules load (health, meds, mind, env, reports, pulsars).

- **Keep the app two folders below the repo root** (`final/onboard-app/`). It reads teammates' code
  and data from `people/` and `shared/` through `../../` paths, and serves some of those files to
  the browser.
- **Copy `replies.mjs` too.** `adapters/companion-support.js` imports `../../crew-assistant/replies.mjs`,
  so `final/crew-assistant/replies.mjs` must exist next to it (or that import must change).
- **Leave `people/` and `shared/` where they are.** Render deploys the whole repo.
- **Node built-ins only:** no npm packages, and no Python while the app runs.
- **Keep the start script as it is:** it reads the port from the host's `PORT` variable and listens
  on all addresses, which is what Render needs.
- If the team decides instead that `final/` only points to `integration/onboard-app/`, the start
  command is `node integration/onboard-app/start.js` and nothing needs copying.

## Good to know before presenting from it

- **It sleeps after 15 minutes without visitors**, and waking takes about a minute. Open it a few
  minutes before the presentation.
- **Every sleep, restart or deploy wipes saved data**; the demo starts again at mission day 42.
- **New code isn't picked up by itself:** Render offers no automatic deploys for a public repo added
  by address. After merging, press Manual Deploy → Deploy latest commit in the Render dashboard.
  That also wipes the data.
- **Everyone shares one demo.** If a judge presses Reset, it resets for the presenter too.
- **The presentation seeder** (`integration/onboard-app/demo/seed-presentation.mjs`) only accepts a
  localhost address, so as it is it can't fill the public copy with the prepared demo data.
- **Nothing private is exposed:** all data is synthetic and the logins are demo profiles. Render
  serves the app over HTTPS, which the QR camera scan needs.
