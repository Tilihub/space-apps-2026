# Filled presentation demo

Run the unchanged onboard server with a **new empty** local data directory, then populate it:

```sh
PORT=8012 PULSE_DATA_DIR=/tmp/pulse-presentation-demo node integration/onboard-app/start.js
# In another terminal, from the repo root:
node integration/onboard-app/demo/seed-presentation.mjs http://localhost:8012
```

The script uses existing session, health, meds and journal APIs. It refuses to overwrite a current-day check-in. Keep the original demo store separately; no reset is needed. The server must still be on mission day 42.

Health histories come directly from Petros's `demo-data/health.json`. Current entries use `scenarios.json` for c1 (healthy exercise), c3 (mood/stress) and c4 (short sleep/headache/NSAID allergy). Fields omitted by a scenario are copied from that person's last synthetic day; c2 and c5 extend their stable last day. These extensions are invented demonstration inputs, not additional observations in Petros's source. c5 starts before the reaction; trigger Emergency live. All training counts are actual saved workouts, initially zero. The c3 journal is a labelled invented example; clinical roles still cannot read it.

`pages/demo-thermal.js` is a separately labelled synthetic **skin** sensor fixture approved by Tommy. It is interpolated only for the body visualization on day 42. These regional readings are not present in teammates' datasets and are never sent to the health/meds/companion rules. The body-temperature instrument uses the health module's separate `temperatureC`; it is not calculated from the skin map. Outside day 42 no map is shown.

The original supplied team logo is byte-for-byte unchanged in `pages/assets/team-logo.png`. All backend implementation, permissions, thresholds, code/QR handling and owner files remain unchanged.

## Current crew presentation

- Check-in selects a location in one readout below the model; back-facing or overlapping pins are hidden during rotation. Severity uses a filled 1–10 slider.
- Exercise uses Petros's original program and controller, with individual set ticks (for example 4 × 12). Completing the exercise submits the original scheduled total; per-set ticks are temporary UI state and reset on reload. The stage demonstration uses a repetition counter and the original synthetic pulse trace. Without a paired sensor the weekly checklist works, but cannot save a numeric pulse summary.
- Crew allergies are read-only, taken from existing profiles. Clinical roles retain their original editing tools. My treatment shows the next due time and remaining scheduled dose opportunities; these counts do not establish ingestion or authorize missed-dose catch-up. Original eligibility/quotas and collection rules remain authoritative.

### Overview appearance review

Tommy removed the historical pulse loop from Overview after visual review. Resting pulse remains the profile's original health value. The 16 isolated appearance studies and comparison screenshots live in `people/tommy/overview-designs/`; no study palette has been applied to the functional app.
