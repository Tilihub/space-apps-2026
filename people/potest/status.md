# potest

## Profile

- GitHub: Potest04
- AI tool: Codex (desktop app)
- Operating system: Windows

## Now

- Last updated: 2026-11-14 15:24 (Europe/Athens)
- Working on: POT-1 handoff for integration review in [PR #40](https://github.com/Tilihub/space-apps-2026/pull/40)
- Branch: potest/environment-bridge

## Done

- Verified Git, signed in to GitHub CLI, and cloned the team repo.
- Created my status file and personal plan.
- Built and tested the [offline environmental graphs](environmental-graphs/index.html) with ISS, Artemis, Curiosity, ExoMars, Perseverance, and InSight data.
- Documented the archive sources, data transformations, and CO₂ chart handoff in the [graph README](environmental-graphs/README.md).
- Added looping replay, synchronized cabin readings, demo alerts, event history, and incident snapshot export. Verified both high and low alert paths and offline replay in Chrome.
- POT-1: Added a callable snapshot and a subscription for alert transitions, feed gaps, recovery, and replay reset. Documented the versioned contract and a synthetic input/output example in the [bridge README](environmental-graphs/README.md#pot-1-integration-handoff).
- POT-1: Verified a same-origin parent iframe can read the snapshot, distinguish archival and synthetic data, and receive one event per forward transition. Tested stale status, recovery, event deduplication, and loop reset in Chrome and checked packet mapping in Node.
- Clarified the source-time chart window and playback speed labels. Verified in Chrome that a one-second playback step advances five recorded minutes for RR-9, and that hourly and sol-based series display their actual next source-time interval.

## Blocked / need from others

- zt and the report assembler still need to agree on the shared mission-clock mapping and adopt the proposed snapshot and event IDs. The bridge preserves the source clock and leaves mission time unset unless the parent supplies an offset.

## Next steps

<!-- Written so someone else could continue: which branch, what's half-done,
     what to do next, what to watch out for. -->

- Have zt wire the incident view to `environmentMonitor.getSnapshot()` and subscribe to replay alerts using the handoff example.
- POT-2 report transport remains conditional on ownership agreement and confirmation that the queue is uncovered.
