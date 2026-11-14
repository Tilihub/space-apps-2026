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
