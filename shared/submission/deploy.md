# Deploying the app

The Local Event needs the app at a public web address that works at any time; localhost isn't
accepted.

**Live: https://pulse-crew-health.onrender.com/** (since 15 November, 14:46). It runs on Render's free
plan, deployed straight from this public repo, and a free UptimeRobot monitor opens it every
5 minutes so it never falls asleep. For now it runs today's app from `integration/onboard-app/`
(main at `e14b582`); once `final/` exists, switch it over (see below).

## Switching to `final/`

1. In the Render dashboard (zt's account), open pulse-crew-health → Settings → Start Command, and
   change it to `node final/onboard-app/start.js`.
2. Press Manual Deploy → Deploy latest commit. The link stays the same; the data starts fresh.
3. Open the link and log in once to check it.

## Render settings

On zt's Render account: New → Web Service → **Public Git Repository**. These are the settings the
live service was created with, in case it ever needs rebuilding.

| Setting | Value |
|---|---|
| Repository URL | `https://github.com/Tilihub/space-apps-2026` |
| Branch | `main` |
| Name | `pulse-crew-health`, giving `https://pulse-crew-health.onrender.com` (Render adds a suffix if it's taken) |
| Language | Node |
| Region | Frankfurt (EU Central), the closest to Greece. The form defaults to Oregon |
| Build command | `npm install` (there are no packages, so it does nothing) |
| Start command | now `node integration/onboard-app/start.js`; `node final/onboard-app/start.js` once `final/` exists |
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

## Keeping it awake

The free plan sleeps after 15 minutes without visitors, and the next visitor then waits about a
minute. To prevent that, zt's free UptimeRobot account has an HTTP(s) monitor on
`https://pulse-crew-health.onrender.com/` every 5 minutes. Keep the monitor on the main address:
most other addresses need a login and would be reported as down. One always-on free service fits
in Render's 750 free hours a month, and the pings use about 100 MB a week.

## Good to know before presenting from it

- **The mission clock runs in real time.** About 16 hours after a start or reset it's mission
  day 43, and the parts built for day 42 (skin map, cabin replay, prepared data) go missing. Press
  the app's Reset demo before showing it, or before judges are expected to look.

- **If the pinger ever stops**, the app sleeps after 15 idle minutes and the next visit takes
  about a minute. Render has maintenance on 18 November around 04:00 (Greek time); the app restarts
  by itself afterwards.
- **Every sleep, restart or deploy wipes saved data**; the demo starts again at mission day 42.
- **New code isn't picked up by itself:** Render offers no automatic deploys for a public repo added
  by address. After merging, press Manual Deploy → Deploy latest commit in the Render dashboard.
  That also wipes the data.
- **Everyone shares one demo.** If a judge presses Reset, it resets for the presenter too.
- **The presentation seeder** (`integration/onboard-app/demo/seed-presentation.mjs`) only accepts a
  localhost address, so as it is it can't fill the public copy with the prepared demo data.
- **Nothing private is exposed:** all data is synthetic and the logins are demo profiles. Render
  serves the app over HTTPS, which the QR camera scan needs.
