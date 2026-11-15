# Pulsars — personal progress and companion wardrobe

Tommy's 15 November 2026 feature. New owner module and UI in [PR #75](https://github.com/Tilihub/space-apps-2026/pull/75), separately reviewed over `tommy/frontend-polish` (full app PR #74). Read the proposed [contract](../../../shared/contract/pulsars.md) for exact APIs, privacy, thresholds and retry rules. Do not merge protected changes until a teammate approves.

## Run

Node.js 24; no npm install. From the repo root:

```sh
npm test
PULSE_HOST=127.0.0.1 PORT=8020 PULSE_DATA_DIR=/absolute/path/to/a/demo-store node integration/onboard-app/start.js
```

Use a fresh synthetic store and the existing presentation seeder if starting from scratch, or preserve an existing demo store. Pulsars starts at zero without importing old preset health entries as completed questionnaires. The new module initializes independently; it does not reset another module's history.

Open the astronaut app, then the gold cart beside appearance/help/sign-out. Try on items for free. Earn coins by completing assigned main exercises and the entire daily wellbeing form. Prices and purchases are server-owned; current appearance is shared by the floating mascot and chat portraits. Default gear/colors are always free to wear again.

The local review runs on 127.0.0.1:8020 with a separate local copy of the previous demo store. The original 8018 server remains running; the new review is not exposed on the LAN. Browser QA uses explicitly fictional profile answers and completed-set inputs in that copy, not the original store. Only code and review screenshots are committed; session tokens and local stores stay outside Git.

## Included

- Embossed team-logo gold coin, quiet reward popup with X, saved balances, ownership and appearance.
- Seven body colors, five rings, five expressions and seven accessory choices (including the free defaults), with rarer pearl/aurora/fur/crown options. All visuals are code-native SVG/CSS; the supplied logo file is unchanged.
- Independent training/wellbeing streaks, 100/200/300 tiers starting on days 1/4/6, rest-day preservation and no penalties to earned balance.
- Per-exercise positive kilogram PR with the assigned sets/reps; first valid record is a baseline, later higher load is +100. No repetitions-only PR rewards.
- Full private ten-question wellbeing persistence in this new module; health's existing three-field API and medical access stay unchanged.

## Limits

Completion is a validated self-report for the known program, not verified movement sensing. A stage preview earns no coins. PRs do not imply a recommended load. Active workout checklists remain in the original in-memory controller; a reload loses checklist position, but saved main-exercise rewards are deduplicated. A stale outbox completion cannot be claimed as today's work. No leaderboard, daily coin decay, diagnosis-based rewards, money checkout or clinical permission changes are added.

The AED shelf, existing cabinet, private journal, Habitat and clinical/Earth workflows are retained. This feature does not connect the AED hardware or real psychologist transport.

Validation: 117/117 root checks pass, including ten module/schema cases and real-HTTP serialized credits/purchases, restart/role separation and public catalogue-only serving. Browser proof includes wellbeing and per-exercise rewards, close-X, a real 500-Pulsars ring purchase and reload persistence, and free cosmetic try-ons. All five teammates are requested reviewers on #75; no approval or merge was performed.
