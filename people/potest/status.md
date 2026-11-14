# potest

## Profile

- GitHub: Potest04
- AI tool: Codex (desktop app)
- Operating system: Windows

## Now

- Last updated: 2026-11-14 18:51 (Europe/Athens)
- Working on: Dataset recommendation for final environmental logging
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
- Kept chart history visible across automatic replay loops. Verified rollover on the ISS and Mars-sol plots, plus original snapshot and CSV timestamps, in Chrome.
- Published the POT-1 bridge in [PR #40](https://github.com/Tilihub/space-apps-2026/pull/40).
- Audited 24 ISS telemetry exports and documented the [RR-23 selection](environmental-graphs/dataset-selection-report.md). It has 43,393 timestamps with all three cabin readings.

## Blocked / need from others

- zt and the report assembler still need to agree on the shared mission-clock mapping and adopt the proposed snapshot and event IDs. The bridge preserves the source clock and leaves mission time unset unless the parent supplies an offset.

## Next steps

<!-- Written so someone else could continue: which branch, what's half-done,
     what to do next, what to watch out for. -->

- Have zt wire the incident view to `environmentMonitor.getSnapshot()` and subscribe to replay alerts using the handoff example.
- Review RR-23 against the app contract's real CO₂ rise demo before switching the logger. RR-23 has no readings above the current demo warning threshold.
- POT-2 report transport remains conditional on ownership agreement and confirmation that the queue is uncovered.
