# Final

Only the finished product: what we demo and submit. It's built from connections that already
work in `integration/`.

- Changes here need one teammate's approval on the pull request (GitHub enforces it).

## PULSE: the finished app

PULSE is one onboard health app for a crew on a long Mars transit: daily check-ins and wellbeing,
symptoms on a 3D body, cabin environment history, guided exercise with personal rewards, a private
companion, a controlled medicine cabinet with emergency access, and a delayed Earth link.

- **Live demo:** https://pulse-crew-health.onrender.com/ (opens on a prepared mission day 42; all
  crew data is synthetic). How it's hosted: [shared/submission/deploy.md](../shared/submission/deploy.md).
- **The code:** the finished app is [integration/onboard-app/](../integration/onboard-app/README.md).
  It loads each teammate's piece straight from their own folder under `people/`, so it always runs
  their latest version. It isn't copied here, so there's only one version of it.

## Run it

From the repo root, with Node.js 24 (no packages to install):

```bash
node integration/onboard-app/start.js --presentation
```

Open the printed address. Without `--presentation` it starts the plain demo instead of the prepared
day 42.

## Check it still works

```bash
npm test
```

All tests must pass before merging anything that touches the app.
