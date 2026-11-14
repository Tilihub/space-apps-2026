# potest

## Profile

- GitHub: Potest04
- AI tool: Codex (desktop app)
- Operating system: Windows

## Now

- Last updated: 2026-11-14 13:07
- Working on: Environmental replay and incident snapshot handoff
- Branch: potest/environmental-graphs

## Done

- Verified Git, signed in to GitHub CLI, and cloned the team repo.
- Created my status file and personal plan.
- Built and tested the [offline environmental graphs](environmental-graphs/index.html) with ISS, Artemis, Curiosity, ExoMars, Perseverance, and InSight data.
- Documented the archive sources, data transformations, and CO₂ chart handoff in the [graph README](environmental-graphs/README.md).
- Added looping replay, synchronized cabin readings, demo alerts, event history, and incident snapshot export. Verified both high and low alert paths and offline replay in Chrome.

## Blocked / need from others

- The app integrator needs to connect the historical CO₂ series to the incident summary.

## Next steps

<!-- Written so someone else could continue: which branch, what's half-done,
     what to do next, what to watch out for. -->

- Open `people/potest/environmental-graphs/index.html` in a browser. Use the RR-9 cabin dataset first.
- Try **Alert exercise · Synthetic** for a quick demonstration of escalation and recovery. Use **Export snapshot** to hand cabin context to the team’s incident summary.
