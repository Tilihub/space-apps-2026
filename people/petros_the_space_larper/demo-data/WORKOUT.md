# Workout handoff

The onboard page imports the program and controller from the existing `/demo-data/` mount. The page owns its buttons, rendering, mission clock and login. The controller supplies the daily plan, current exercise, completion count, timer, pulse with provenance, and the summary sent through Angelos's existing health client. It uses no external packages.

## Weekly Mars transit program

This prototype covers the cruise in microgravity. It assumes one compact, anchored Orion-style flywheel station with foot restraints, a bar and a harness. Crew use that station for both resistance work and rowing. The selected vehicle would need to verify its anchor, restraints and exercise clearances. Surface operations in Mars gravity and reconditioning after landing require a separate plan. [NASA Orion crew systems](https://www.nasa.gov/reference/crew-systems/#flywheel-exercise-device), [NASA gravity-field hazards](https://www.nasa.gov/hrp/hazard-gravity-fields/).

The seven-day cycle begins on mission day 0. Demo day 42 also starts on Day 1. Each resistance day has two separately started and saved sessions. Schedule steady rowing 4–6 hours later when the mission timeline and shared station bookings allow, as in the SPRINT study. [SPRINT flight protocol](https://pmc.ncbi.nlm.nih.gov/articles/PMC7434884/#Sec8).

| Cycle day | Resistance session | Aerobic session |
| --- | --- | --- |
| 1 | Harness squat, deadlift, harness heel raise, bent-over row. 4 × 12 each, 2 min between sets. | 30 min steady at the workload calibrated to ~75% of individual rowing VO₂peak. |
| 2 | — | 6 × 2 min at assigned power or pace, building to 7–8/10 effort. 2 min easy rowing between efforts. |
| 3 | Same four lifts. 4 × 8 each, 2 min between sets. | 30 min steady at the same individualized workload. |
| 4 | — | 8 × 30 sec at assigned short-interval power or pace, 8–9/10 effort. 15 sec easy rowing between efforts. |
| 5 | Same four lifts. 4 × 6 each, 3 min between sets. | 30 min steady at the same individualized workload. |
| 6 | — | 4 × 4 min at assigned power or pace, with 85–95% of measured rowing HR peak as a late-interval reference when available. 3 min easy rowing between efforts. |
| 7 | Rest | Rest |

Rowing sessions include 5 min of warm-up (10 min on Day 4) and 5 min of cool-down. Active recovery is easy rowing at about 2–3/10 perceived effort. Pace, power and perceived effort guide the shorter bouts because pulse takes time to respond. Day 6 uses the personal, measured rowing peak when both that value and live pulse are available. With a missing pulse or peak, follow the assigned power, pace or perceived effort. [SPRINT flight protocol](https://pmc.ncbi.nlm.nih.gov/articles/PMC7434884/#Sec8), [NASA interval examples](https://ntrs.nasa.gov/api/citations/20250007208/downloads/20250007208.pdf#page=19).

For resistance, use the flywheel gear or inertia assigned to each movement and finish working sets with 2–3 clean repetitions in reserve. The gear and effort jointly determine the load, so translating a free-weight percentage of one-repetition maximum would require calibration on the actual hardware. Before flight, crew familiarize themselves with the station and calibrate rowing effort and lift settings under the mission exercise team's supervision. Begin cruise with the assigned acclimatization load, and reassess settings and rowing pace using observed technique, performance and recovery. The weekly volume, inter-set rests, effort bands and reserve target are prototype defaults for the regular cruise phase. [NASA Orion crew systems](https://www.nasa.gov/reference/crew-systems/), [Flywheel training consensus (2024)](https://pmc.ncbi.nlm.nih.gov/articles/PMC10978721/).

## Evidence

- The NASA 70-day head-down bed-rest study tested single-device seated flywheel rowing and resistance under simulated unloading. Its flywheel used leg presses, heel raises and leg curls. Orion hardware supports the harness squats, deadlifts, calf raises and rows chosen for this plan, and was used on the short Artemis II lunar mission. ESA began testing its own compact multi-mode E4D on the ISS in 2026. NASA's Zero T2 study evaluates treadmill alternatives on long flights. These are the closest hardware precedents for the prototype. [70-day bed-rest study](https://pmc.ncbi.nlm.nih.gov/articles/PMC6591716/), [Artemis II flywheel](https://www.nasa.gov/reference/crew-systems/), [ESA E4D](https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/New_European_exercise_device_begins_testing_with_first_rope-pulling_workout_in_space), [NASA Zero T2](https://www.nasa.gov/reference/zero-t2/).
- SPRINT provides the weekly rhythm and the interval formats. Its 9 SPRINT and 17 standard-care astronauts self-selected. SPRINT's fourth set was prescribed to failure, and peak heart rates averaged above 90% of maximum across the interval formats. Across both groups, femoral-neck bone density decreased by about 1.7% and peak aerobic capacity by 6.1%. The app uses reserve-based strength targets and rowing-specific effort as design choices for the proposed vehicle. [English et al. (2020)](https://pmc.ncbi.nlm.nih.gov/articles/PMC7434884/).
- A 46-astronaut ISS analysis found deconditioning despite about 600 min/week of exercise. A 2026 retrospective study of 31 astronauts found lower aerobic capacity and lower-limb strength after roughly six months. Keeping both training modes and loading the lower body supports preparation for landing tasks. The effect of this compact setup on bone and fitness through a Mars mission remains unverified. [Scott et al. (2023)](https://pmc.ncbi.nlm.nih.gov/articles/PMC9898566/), [Strock et al. (2026)](https://pubmed.ncbi.nlm.nih.gov/42932888/).

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

For the weekly screen, omit `stage` and `replay`. Pass `rowingHrPeakBpm` only when the logged-in crew member has an assigned rowing test result. During the long intervals the step can then show `targetHeartRateBpm` next to the measured reading. The target is informational and never changes the timer, completion state or health record. Configure individual station settings and pace through the mission assignment.

| UI element or event | Controller fields or action |
| --- | --- |
| Today's program | `day.program` is `mars-transit`. Show `day.label` and `day.sessions`, including session `preparation` when present. If `status === 'rest'`, show Rest day and hide Start. |
| Start workout | Call `start(now)` to pick `nextSessionId` or pass a session ID explicitly. |
| Current exercise | Render `currentStep.label`, `equipment`, `instruction`, plus `sets × repsPerSet` and `restBetweenSetsSeconds` for strength or `durationSeconds` for rowing. Use `completed.length / totalSteps` for progress and `stepElapsedSeconds` for a step timer. The interval block exposes `interval.round`, `phase` (`work`, `recovery`, `done`) and `remainingSeconds`. Show `workTarget` or `recoveryTarget` for the current phase. |
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
