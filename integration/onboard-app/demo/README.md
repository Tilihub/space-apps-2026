# Filled presentation demo

Run the unchanged onboard server with a **new empty** local data directory, then populate it:

```sh
PORT=8012 PULSE_DATA_DIR=/tmp/pulse-presentation-demo node integration/onboard-app/start.js
# In another terminal, from the repo root:
node integration/onboard-app/demo/seed-presentation.mjs http://localhost:8012
```

The script uses existing session, health, meds and journal APIs. It refuses to overwrite a current-day check-in. Keep the original demo store separately; no reset is needed. The server must still be on mission day 42.

Health histories come directly from Petros's `demo-data/health.json`. Current entries use `scenarios.json` for c1 (healthy exercise), c3 (mood/stress) and c4 (short sleep/headache/NSAID allergy). Fields omitted by a scenario are copied from that person's last synthetic day; c2 and c5 extend their stable last day. These extensions are invented demonstration inputs, not additional observations in Petros's source. c5 starts before the reaction; trigger Emergency live. Workout summaries are actual saved records, initially empty. Overview now shows two daily tasks (explicit ten-question wellbeing completion and ended/saved training activity), rather than a session counter. The c3 journal is a labelled invented example; clinical roles still cannot read it.

`pages/demo-thermal.js` is a separately labelled synthetic **skin** sensor fixture approved by Tommy. It is interpolated only for the body visualization on day 42. These regional readings are not present in teammates' datasets and are never sent to the health/meds/companion rules. The body-temperature instrument uses the health module's separate `temperatureC`; it is not calculated from the skin map. Outside day 42 no map is shown.

The original supplied team logo is byte-for-byte unchanged in `pages/assets/team-logo.png`. All backend implementation, permissions, thresholds, code/QR handling and owner files remain unchanged.

## Current crew presentation

- Check-in selects a location in one readout below the model; back-facing or overlapping pins are hidden during rotation. Severity uses a filled 1–10 slider.
- Exercise uses Petros's original program and controller, with individual set ticks (for example 4 × 12). Completing the exercise submits the original scheduled total; per-set ticks are temporary UI state and reset on reload. The stage demonstration uses a repetition counter and the original synthetic pulse trace. The weekly demonstration now uses an explicitly synthetic exercise/recovery source; saved summaries retain that source label and are not wearable measurements.
- Crew allergies are read-only, taken from existing profiles. Clinical roles retain their original editing tools. My treatment shows the next due time and remaining scheduled dose opportunities; these counts do not establish ingestion or authorize missed-dose catch-up. Original eligibility/quotas and collection rules remain authoritative.

### Overview appearance review

Tommy removed the historical pulse loop from Overview after visual review. Resting pulse remains the profile's original health value. The 16 isolated appearance studies and comparison screenshots live in `people/tommy/overview-designs/`; Tommy corrected the final selection to MC04 Alloy, now applied to the frontend instead of Soft Panels. Global font comparisons T01–T08 are documented in `people/tommy/overview-designs/typography/`; Tommy selected Clean / Inter (T02), now the shared default throughout the app.

### Overview value colors

Tommy chose a nonclinical demo value scale. `pages/overview-colors.js` interpolates cyan/amber using each existing contract input span as a normalized drawing coordinate (higher pulse/temperature, lower sleep → amber). These spans validate input and are **not medical limits**. No health category, alert, baseline comparison or treatment recommendation is computed. Missing/nonfinite readings use the original gray track; zero sleep is still a value and zero recorded training stays pending/gray. Original workout progress and all backend rules are untouched. The numeric readings remain the authoritative displayed values; Help explains the color meaning. Dark/light themes use separate cyan/amber endpoint colors. Plot lines use a vertical cyan/amber gradient; completed workout progress warms toward amber without changing its fractional arc. Interface accents remain amber.

The shared mascot now uses logo-like cyan for its body and an amber ring, independently of the interface palette. The shared gradient covers every mascot instance. `pages/soft-panels.css` retains its historical filename but now contains the selected Alloy surface tokens; the earlier static review explicitly preserves both comparison palettes.

Alloy panel accents are one muted 2px rule; embedded body frames are frameless to prevent duplicated caps. In Medical bay's Cabinet tab collection confirmation appears only in the selected item panel, while tabs without that panel retain the existing collection strip. The original per-item actions and backend authorization/quotas are unchanged.

Medical bay uses chess-style display labels (for example L1-A-02) over unchanged numeric API IDs. Crew allergies are not a navigation tab; clinical profile management and server allergy blocks remain available. One top Emergency toggle opens the inline emergency-item form within the cabinet, with patient choice and a required reason; it calls the existing emergency and collection APIs. Only emergency-tier items use this flow. The server supplies the default dose, and item confirmation remains explicit. Existing open incidents retain their original reason; the UI reports that reuse. Per-release notes would require separate backend work.

The latest crew presentation has lock-state red bin tint/hover, a dismissible emergency notification, one Start training action and automatic summary/recovery save after one mission minute while the app stays open. Exercise plots explicitly simulate a rolling five-minute sensor window; pre-start display history is excluded from saved summary calculations. Breathing is fictional demo data. The psychologist preview accepts free text but replies locally with a script; no Earth delivery occurs.

AED and load/PR support remain drafts at Tommy's choice: L3 has a noncollectable three-column planned equipment shelf, kilograms have an editable draft input with stacked +/− controls in 5 kg steps, and PR is blank until the data contract is connected. See people/tommy/medical-training-follow-up.md for implementation boundaries and owner handoffs. Existing demo emergencies were closed at Tommy's explicit request; starting a new one still uses the normal flow.

The Training open cue closes as soon as the session ends, before the recovery save. Its visual completion is retained per person/day in session storage; demo reset clears it. It does not fabricate a saved health record. Daily tasks counts explicit ten-question wellbeing completion and today's training activity; a scheduled rest day has no pending workout task.

For the current local presentation, port 8018 was populated with the same agreed day-42 fixtures as port 8012 after its empty QA entries were identified. Existing workouts were preserved. L1 retains all ten items and both pages.

Daily wellbeing remains pending until Finish daily wellbeing validates all ten answers; preset core values alone do not close it. Existing health entries are preserved and the seven extras remain local drafts. Exercise/session/rest/interval displays refresh each second through display-clock.js; actual submissions and recovery saves retain server time.

Overview includes existing Today SpO2 and blood-pressure readings as two additional circular instruments in a six-card grid, aligned with the full body-panel height on desktop. The tenth daily prompt is now mental refreshment (1–10), replacing the support-request item; private support remains on Wellbeing. Cabinet access uses short authority labels and preserves actionable safety messages. The backend doctor-as-patient routing exception remains pending dadis2/zt review; see Tommy's medical-training-follow-up.md.


### AED emergency checkout (current branch)

With dadis2's explicit agreement reported by Tommy, the catalogue includes one AED emergency-equipment unit at L3-4-01. The full-width lower shelf uses the actual API bin: enable Emergency, select the AED/patient, enter the reason, collect and confirm. Stock decreases only at confirmation; another checkout is refused once the unit is gone. Demo reset restores one. Existing saved stores require an intentional reset to initialize the new catalogue unit; do not reset an active shared store silently. It records equipment retrieval, not shock delivery, ingestion or verified resuscitation. The presentation's successful cardiac-arrest recovery is explicitly a fictional narrated outcome; see people/tommy/presentation/seven-minute-run.md.
