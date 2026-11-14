# Workout handoff

The onboard page imports the program and controller from the existing `/demo-data/` mount. The page owns its buttons, rendering, mission clock and login. The controller supplies the daily plan, current exercise, completion count, timer, pulse with provenance, and the summary sent through Angelos's existing health client. It uses no external packages.

## Weekly program

This is a research-based prototype for a vehicle with ISS-style equipment. Day 1 starts on mission day 0, so the demo's mission day 42 also starts on Day 1. Each resistance day has two separately started and saved sessions. The SPRINT study usually scheduled steady aerobic exercise 4–6 hours after resistance when possible. The page can show this suggested window alongside the second session.

| Cycle day | Resistance session | Aerobic session |
| --- | --- | --- |
| 1 | ARED squat, deadlift, heel raise, bench press · 4 × 12 each | CEVIS cycle · 30 min steady |
| 2 | — | CEVIS cycle · 6 × 2 min with 2 min easy between efforts |
| 3 | ARED single-leg squat, Romanian deadlift, heel raise, cable row · 4 × 8 each | T2 harness treadmill · 30 min steady |
| 4 | — | CEVIS cycle · 8 × 30 sec with 15 sec easy between efforts |
| 5 | ARED sumo squat, sumo deadlift, heel raise, bench press · 4 × 6 each | CEVIS cycle · 30 min steady |
| 6 | — | T2 harness treadmill · 4 × 4 min with 3 min easy between efforts |
| 7 | Rest | Rest |

The aerobic sessions each include a warm-up and cool-down step. One interval block is one checkable exercise, with structured work, recovery and repeat fields for the page's timer. Exercise selections, device assignments and the demo's warm-up and cool-down durations are implementation choices. Loads, resistance set recovery and aerobic intensity require individualized assignment. The steady block in the study used a workload calibrated to 75% of individual peak oxygen uptake, `VO₂peak`. Hardware substitution for a compact vehicle would need its own reviewed exercise plan. [SPRINT flight protocol](https://pmc.ncbi.nlm.nih.gov/articles/PMC7434884/#Sec8), [NASA interval examples, PDF p. 19](https://ntrs.nasa.gov/api/citations/20250007208/downloads/20250007208.pdf#page=19).

## Evidence

- NASA's ISS operations summary describes roughly 2.5 hours scheduled per day on six days per week, including setup and cleanup, with 30–60 minutes of resistance work and roughly 27 minutes of aerobic work. The usual hardware is ARED for resistance, CEVIS for cycling and T2 for harnessed treadmill work. [NASA technical report (2025)](https://ntrs.nasa.gov/citations/20250000273), [NASA exercise overview](https://www.nasa.gov/ochmo-tb-031-exercise-overview-2/).
- NASA publishes a seven-day SPRINT example with three days of resistance plus continuous aerobic exercise, three alternating interval days and one rest day. The in-flight comparison included 9 SPRINT and 17 standard-care participants. The approximately six-hour SPRINT week produced broadly similar outcomes to the comparison in this small study. The investigators individualized loads and monitored heart rate during exercise. [Official weekly example, PDF p. 42](https://ntrs.nasa.gov/api/citations/20170002048/downloads/20170002048.pdf#page=42), [English et al. (2020)](https://doi.org/10.1038/s41526-020-00111-x).
- A 46-astronaut ISS analysis found that approximately 600 minutes per week still left measurable deconditioning. A 2026 retrospective study of 31 astronauts also found losses in aerobic capacity and lower-limb strength after approximately six months, with aerobic exercise volume associated with aerobic fitness. Those findings support offering both training modes, with the limits of observational evidence. [Scott et al. (2023)](https://pmc.ncbi.nlm.nih.gov/articles/PMC9898566/), [Strock et al. (2026)](https://pubmed.ncbi.nlm.nih.gov/42932888/).
- Orion used a compact flywheel aboard the short Artemis II lunar test flight. NASA's Zero T2 study examines replacing treadmill exercise with alternatives during long stays on the ISS. The sources reviewed provide no public, validated weekly prescription for a crewed Mars transit. This schedule applies ISS evidence to the prototype. [Artemis II mission update (2026)](https://www.nasa.gov/news-release/nasas-artemis-ii-mission-leaves-earth-orbit-for-flight-around-moon/), [Orion exercise equipment](https://www.nasa.gov/humans-in-space/life-encapsulated-inside-nasas-orion-for-artemis-ii-moon-mission/), [NASA Zero T2](https://www.nasa.gov/reference/zero-t2/).

## Page integration

Create one controller for the logged-in crew member and mission day. Reuse it while navigating between app screens. After a day boundary, let an active session finish and save before replacing its controller. Replace it on demo reset or session change. Use `GET /api/clock` through the existing core client for `missionDay` and `now`. Keep the latest clock reading current while the screen is open.

```js
import { createWorkoutController } from '/demo-data/workout-session.js';

// clock = the current { missionDay, now } from the onboard core.
// healthClient = Angelos's createHealthClient bound to the current crew login.
const response = await fetch('/demo-data/workout-heart-rate.json');
if (!response.ok) throw new Error('Workout replay is unavailable.');
const replay = await response.json();
const workout = createWorkoutController({
  missionDay: clock.missionDay,
  stage: true, // Scene B push-ups. Omit stage and replay for the weekly screen.
  replay,
  submitWorkout: healthClient.submitWorkout,
});

render(workout.snapshot(clock.now));
// Start button
render(workout.start(clock.now));
// Exercise checkbox. Use the step ID shown at the time the event fired.
render(workout.completeStep('warm-up', clock.now));
// Stage push-ups requires the astronaut's actual rep count.
render(workout.completeStep('push-ups', clock.now, { reps: 25 }));
// When the mission clock shows a full minute since completion:
render(await workout.save(clock.now, { withRecovery: true }));
```

Pass the latest `clock.now` to each action. The snippets represent separate UI events. Call `snapshot(now)` on every mission-clock update so pulse and timers refresh without another checkbox tap.

| UI element or event | Controller fields or action |
| --- | --- |
| Today's program | `day.label` and `day.sessions`. If `status === 'rest'`, show Rest day and hide Start. |
| Start workout | Call `start(now)` to pick `nextSessionId` or pass a session ID explicitly. |
| Current exercise | Render `currentStep.label`, `equipment`, `instruction`, plus `sets × repsPerSet` or `durationSeconds`. Use `completed.length / totalSteps` for progress and `stepElapsedSeconds` for a step timer. The interval block exposes `interval.round`, `phase` (`work`, `recovery`, `done`) and `remainingSeconds`. |
| Mark done | Call `completeStep(step.id, now)`. Pass `{ reps }` for an actual total that differs from a scheduled set count, or for stage push-ups. The last step ends the workout automatically. |
| Stop early | Call `stop(now)`. In the stage demo, check off the push-ups with their rep count before saving a normally finished workout. |
| Pulse | Show `heartRate.bpm` in bpm beside `heartRate.source`. When bpm is `null`, show “Heart rate unavailable.” |
| Save | Call `save(now)` to save immediately, or wait for `recoveryReady` and call `save(now, { withRecovery: true })`. Handle rejected saves; retry the same action or let the crew dismiss it with `skipSave(now)`. |

For a live wearable, replace `replay` with `wearableSource: 'Device or adapter name'`. On each real sample call `recordHeartRate(bpm, missionTimestamp)`; give it a `null` sample on a known signal loss. A reading expires after ten seconds. The controller receives samples from the page's device adapter. This handoff provides the sample input interface and a stage fixture; device pairing and protocol decoding depend on the selected wearable.

The stage replay uses a synthetic 90-second trace and a 60-second recovery trace. It rises from 72 to 145 bpm and reaches 102 bpm one minute after a 90-second workout. The shorter recording suits scene B. After the fixture ends or when a source has a gap, the display shows an unavailable reading. With no usable exercise samples the current health API cannot save the workout summary because it requires numeric average and peak. The screen can still show the checked exercises and indicate that the summary was unavailable. Keep exercise readings out of the resting check-in.

Saved summaries appear in the current crew member's `healthClient.getWorkouts()` results. The existing endpoint stores one record per session, with total repetitions, average, peak, optional recovery and source. Checklist state and early-stop status are held in memory. A full reload clears the in-progress checklist. Session summary records use the plan session ID as `kind`.

```powershell
node --test people/petros_the_space_larper/demo-data/workout.test.js
```
