# Deploying the app

The Local Event needs the app at a public web address that works at any time; localhost isn't
accepted.

**Live: https://pulse-crew-health.onrender.com/** (since 15 November, 14:46). It runs on Render's free
plan, deployed straight from this public repo, and a free UptimeRobot monitor opens it every
5 minutes so it never falls asleep. It runs the app from `integration/onboard-app/` in
**presentation mode** (`PULSE_PRESENTATION=1`): it always opens on a prepared mission day 42, ready
for the five demo stories. See "The prepared start" below.

## Switching to `final/`

1. In the Render dashboard (zt's account), open pulse-crew-health → Settings → Start Command, and
   change it to `node final/onboard-app/start.js`. Keep the `PULSE_PRESENTATION=1` variable.
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
| Environment variables | `NODE_VERSION` = `24`, the version our tests run on; `PULSE_PRESENTATION` = `1`, the prepared start |

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

## The prepared start

With `PULSE_PRESENTATION=1` (or `node integration/onboard-app/start.js --presentation` on a laptop),
`integration/onboard-app/presentation.js` loads the prepared mission day 42 **on every start, on
every Reset, and whenever the mission clock leaves day 42** (it checks every minute). So the link
always opens ready, and pressing Reset gives a clean prepared demo. It holds:

- today's check-in for all five crew (Petros's synthetic data and stage cases, as Tommy's seeder does);
- **Tomas:** the headache report and a sleeping-pill request waiting for Earth. The Earth console's
  QR code answers it;
- **Ines:** her journal entry, and nine of her ten wellbeing answers. The presenter answers the
  tenth, "mental refreshment", and presses Finish;
- **Mara:** 700 Pulsars earned on days 38–40.

**Stage push-ups** (Exercise → Program → Stage demo) always pay +200 for the exercise and +100 for
a new personal best, whatever the count, every run, for anyone. Mara goes from 700 to 1,000 and can
buy the round spectacles. This works with or without presentation mode.

All values are synthetic demo data. A laptop started without the flag behaves as before.

## Good to know before presenting from it

- **If the pinger ever stops**, the app sleeps after 15 idle minutes and the next visit takes
  about a minute. Render has maintenance on 18 November around 04:00 (Greek time); the app restarts
  by itself afterwards.
- **Every restart or deploy goes back to the prepared start**, wiping whatever visitors did.
- **New code isn't picked up by itself:** Render offers no automatic deploys for a public repo added
  by address. After merging, press Manual Deploy → Deploy latest commit in the Render dashboard.
  That also goes back to the prepared start.
- **Everyone shares one demo.** If a judge presses Reset, it resets for the presenter too. Press
  Reset once before the full run, not between speakers.
- **Nothing private is exposed:** all data is synthetic and the logins are demo profiles. Render
  serves the app over HTTPS, which the QR camera scan needs.
