# Demo cases for the 7-minute live demo

Owner: zt. **Draft, 14 Nov 2026.** zt is happy with this lineup; the team decides the rest.
Everything here is open to change.

The format: one narrator tells the story while five teammates play crew members, each with their
own data records. We show each one's view of the app as the narrator moves to them. The medical
officer goes last and sees everything the other four caused.

It fits the proposed app contract ([PR #49](https://github.com/Tilihub/space-apps-2026/pull/49),
`shared/contract/README.md`): crew `c1`–`c5`, `c2` the only medical officer, 1–10 scales, mission
day 42 from 07:30, normal (baseline) on mission days 29–35. The order on stage doesn't have to
follow the ids.

## The lineup

Proposal: one of NASA's five hazards of human spaceflight per crew member
([NASA HRP](https://www.nasa.gov/hrp/hazards/), a challenge resource). It gives the narrator a
structure and shows judges the whole challenge.

| On stage | Crew | Story | Hazard | Screens shown | Time |
|---|---|---|---|---|---|
| Intro | Narrator | Five crew on the way to Mars, mission day 42. Messages take 12 minutes each way to Earth | Radiation: a real cruise reading on Habitat | – | 0:30 |
| 1 | A (`c4`) | Known allergy, headache, three short nights, high CO₂ overnight | Closed environment | Login, Home, body point, symptom report, Habitat, Med bay | 1:30 |
| 2 | B (`c1`) | Healthy, does push-ups | Gravity: exercise keeps muscle and bone | Today's tasks, guided measurement, Workout, points | 1:00 |
| 3 | C (`c5`) | Allergic reaction to a new food | Distance from Earth: no time to wait for an answer | Emergency, emergency release from the lockers | 1:00 |
| 4 | D (`c3`) | Mood sliding slowly for a week | Isolation and confinement | Check-in, Mind, Companion | 1:00 |
| 5 | E (`c2`), medical officer | Sees what A–D caused, decides, sends to Earth | All | Crew view, case summaries, approvals, stock, send to Earth | 1:30 |
| Close | Narrator | The core idea in one sentence | – | – | 0:30 |

**Names:** we make new ones (zt, 14 Nov). The contract's names stand until the team picks others.

**Said on stage:** the crew and their health records are invented. The cabin readings are real
ISS data, replayed.

## Shared setup

### Cabin air: a real ISS CO₂ rise (potest)

potest's ISS RR-9 replay (NASA OSDR Environmental Data App) has a real three-day CO₂ rise that
fits the headache case. The contract asks for a real excursion if the archive has one; this is it.

| Source time (2018) | CO₂ | Mission time if 17 Sep 16:45 = day 42, 07:00 |
|---|---|---|
| 6–14 Sep | daily average 2,100–2,280 ppm | days 31–39: low, the normal stretch |
| 15 Sep | average 2,630 ppm | day 40 |
| 16 Sep | average 3,150 ppm | day 41 |
| 17 Sep, 05:08–16:38 | at or above 3,500 ppm (Warning) the whole time; 3,900+ (Danger) 08:18–10:38, peak 3,913 at 10:13 | day 41 19:20 to day 42 06:55: Warning through the night, Danger about 22:30–00:50 |
| 17 Sep, after 16:38 | about 3,400 ppm and falling | day 42 from 07:00: recovered |

- **The mapping is potest's choice** (contract section 9). The table is only a suggestion. With
  it, days 29–30 map to 4–5 Sep, the end of an earlier high stretch (4 Sep touches 3,500 ppm).
- **Don't replay** 14–17 Aug or anything after 18 Sep 00:00: the flat values there (2,915 and
  3,215 ppm) look like fill values.
- **Temperature and humidity** stay flat over these days (about 23.5 °C and 40%).
- **In mmHg:** the rise is about 1 mmHg (about 1.6 to 2.6 mmHg as daily averages). That assumes a
  760 mmHg cabin, which the data doesn't include. On the ISS, each extra 1 mmHg of CO₂ almost
  doubled the odds of a reported headache (Law et al. 2014).
- **Radiation** (contract wave 2): one real reading on Habitat from Curiosity's cruise to Mars,
  14–18 µGy/h on cruise day 12 (December 2011). There is no radiation storm in the demo.

### Shared rules for the data

- **Baselines:** angelos's health module needs at least 5 baseline days per measure, and it flags
  a change of at least 10 bpm, 1.5 h of sleep or 2 points (or 3 scaled MADs, if larger). A day
  with a missing value stops the "days in a row" count for that measure.
- **What the medical officer sees:** crew see only their own data. The medical officer sees
  everyone's health and medicine data, but never the journal or the companion (contract,
  section 4).

## 1. A (`c4`): known allergy, headache, short sleep

**What it shows:** the app sees what A doesn't feel, links it to the cabin, and remembers the allergy.

1. **Login → Home.** The readiness score is amber and the head point on the body figure is red.
2. **Head point.** "Headache since waking. Slept 4.6 h; your normal is 6.8 h. Third short night."
   Before any pill, it asks: "Any blurred vision, weakness or confusion?" A says no. A yes would be
   a red flag: straight to the medical officer, no suggestions.
3. **Check-in and symptom report.** A rates mood 6, stress 4, fatigue 4, close to normal, and
   says "I'm fine". Head → headache → 5, marked "Shared with your medical officer". People
   underrate their own impairment after weeks of short sleep (Van Dongen et al. 2003).
4. **Habitat.** CO₂ was above Warning all night and has just recovered. The note: high CO₂ is a
   known headache trigger.
5. **Med bay.** Acetaminophen is allowed. Ibuprofen and aspirin are blocked: allergy (NSAIDs) in
   A's profile. A collects the dose: locker, bin, scan, logged.
6. **Optional:** A asks for a sleeping pill tonight, before tomorrow's spacewalk. It needs the
   medical officer's approval, which gives E something to decide.

| Piece | Records | Real or simulated |
|---|---|---|
| health (angelos), demo data (petros) | Days 29–39: sleep 6.5–7.1 h, resting heart rate 56–60, mood 7, stress 3, fatigue 3. Days 40, 41: sleep 5.0, 4.8; heart rate 61, 62; mood 6, stress 4, fatigue 4. Day 42 (live): sleep 4.6, heart rate 63, the same self-reports. Only sleep is flagged, 3 days in a row | Simulated. The normal of 6.8 h matches ISS crews, who slept just over 6 h of 8.5 scheduled (Barger et al. 2014) |
| meds (dadis2) | Allergy: NSAIDs. Headache reports on days 40 (3) and 41 (4), live on day 42 (5). Vital signs today: heart rate 63, blood oxygen 98%, 36.8 °C. Acetaminophen 2 × 325 mg on day 41. Optional: a spacewalk on day 43 | Simulated |
| env (potest) | CO₂ as in the shared table | Real (ISS) |

**Note:** the contract's wave-1 test uses sleep 5.5 h, mood 4, stress 7 and fatigue 7. That works
too, as long as sleep is at least 1.5 h under the normal. The "I'm fine" version above is the
better story for the stage.

**Missing:**
- an NSAID allergy for `c4` in the meds data
- the red-flag question on the body point
- the readiness score rule (Tommy and zt, Q16)
- symptom history across days in the case summary

## 2. B (`c1`): healthy, push-ups

**What it shows:** the app doesn't raise false alarms, and the daily routine has its own rewards.
B breathes the same cabin air as A and feels fine, because each person is compared with their own
normal.

1. **Login → Home.** The readiness score is green, every body point is blue, and the task score is 1 of 4.
2. **Today's tasks → Measurements.** A guided resting heart rate measurement ("sit still for a
   minute", shortened for the stage) comes out within normal.
3. **Workout.** Start: B does push-ups on stage. The timer runs, the heart rate climbs to about 145
   and the rep counter goes up.
4. **Stop.** A summary card appears: time, reps, average and peak heart rate, and the heart rate
   one minute later. A line says "Workout heart rate isn't compared with your resting normal."
   The task is ticked, and the task score and points go up.

**Narrator line:** "ISS crews exercise about 2 hours a day to protect muscle and bone. On the ship
it's a resistance machine; on stage, push-ups." Push-ups don't work in weightlessness, so we say
so before a judge does.

| Piece | Records | Real or simulated |
|---|---|---|
| health, demo data | Days 29–41: resting heart rate 52–55, sleep 6.6–7.0 h, mood 7–8, stress 2–3, fatigue 2–3. Day 42 (live): all within normal | Simulated |
| Workout heart rate | Replayed from a file: rest, then a climb during the push-ups, then recovery after Stop | Best: a real exercise recording from the PhysioNet Wearable Device Dataset (made on Earth, labelled so; petros listed it, not downloaded). Fallback: a simulated curve shaped by real in-flight exercise on Apollo-Soyuz (average 66–94, peaks 90–140 bpm, in petros's vitals CSV) |
| Measurement guide | Resting heart rate steps | petros's `measurement-guides.json` |

**Minimum workout build** (not in the contract yet, no owner):
- **The screen:** opened from Today's tasks. Start, a big timer, the heart rate as a number and a
  line, and a rep counter.
- **Heart rate:** replayed from the file. It climbs while the workout runs and falls after Stop.
- **Rep counter:** the presenter presses a key for each push-up. As a stretch goal, the laptop
  camera could count them itself (pose detection in the browser). That looks great but can fail
  under stage lighting, so only do it with the key as a backup.
- **Stop:** the summary card, the task tick, and points.
- **Size:** one screen, a few hours. It can live in the pages alone, or the health module can take
  a "workout done" record. The contract needs one line on this.

## 3. C (`c5`): allergic reaction, an emergency

**What it shows:** Earth is too far to wait for, so the crew acts on board, and everything is
recorded for the medical officer and Earth.

1. The narrator: C tries a new food item. Lips swell and the throat tightens.
2. **Nice to have:** the sensors catch it first (heart rate 125, blood oxygen 91%, past dadis2's
   red-flag limits of 120 bpm and 92%). The app asks "Are you OK?" with a 10-second countdown, and
   with no answer it raises the alarm. **Minimum:** C or a crewmate presses Emergency.
3. **Alarm:** a full red screen and a sound: "Medical officer alerted". It shows on every screen
   that is open.
4. **Emergency release:** who needs help → C. The epinephrine auto-injector is released now,
   with no sign-off. Find it: the locker by the hatch. The scan is skipped, and the dose is logged.
5. "Sent to Earth, arrives in 12 min. Earliest reply in 24 min." The paperwork is due within 2 hours.
6. The new allergy goes on C's profile as suspected, waiting for E to confirm. Next time the
   lockers block it. On stage, A has "a known allergy the app remembers" and C has "a new one
   nobody knew", so the two allergy stories don't blur.

| Piece | Records | Real or simulated |
|---|---|---|
| health, demo data | Days 29–41: normal. Nothing unusual before the reaction | Simulated |
| meds | Epinephrine in the emergency stock, no known allergies before today | Simulated |
| Vital signs during the reaction | Heart rate 125, blood oxygen 91% | Simulated |

**Minimum emergency build** (contract: dadis2's `POST /emergency` in wave 2, details still open, Q15):
- **Already in dadis2's prototype:**
  - the emergency screen: who needs help, with allergies shown
  - the emergency medicines, with no sign-off
  - a red warning plus "give anyway" (two taps), logged for the medical officer and ground
  - "find it" and "skip scan"
- **To build:**
  1. a red Emergency button on every screen of the astronaut app
  2. the alarm screen and its sound
  3. an emergency event that the medical officer platform shows at the top, with what was given,
     when and the vital signs, and a 2-hour countdown for the paperwork
  4. the "Sent to Earth" label with a countdown; nothing is really sent
- **Nice to have:** the "Are you OK?" countdown, driven by a short fake stream of vital signs.

## 4. D (`c3`): mood sliding for a week

**What it shows:** a slow, lasting change that no single day would flag. Plus the private side of
the app, kept apart from what the medical officer sees.

1. **Login → Home.** The readiness score is a little lower. Nothing is red on the body figure.
2. **Check-in.** Mood 4, stress 5. The mascot pops up: "Your mood has been below your normal for
   6 days. Want to write about it, or talk to someone?"
3. **Mind.** The check-in history graph shows the week sliding out of D's normal band.
4. **Journal.** D writes one line, marked "Private: never shared".
5. **Support.** D asks for a session with the psychologist on Earth. With 24 minutes there and
   back it can't be live, so it's video letters or messages.
6. **What E sees:** D's mood trend, which is health data. Never the journal or the companion.
   Whether E sees the support request is open (Q11).

| Piece | Records | Real or simulated |
|---|---|---|
| health, demo data | Days 29–35: mood 7, stress 3, fatigue 3, sleep about 6.8 h. Days 36–41: mood 6, 5, 5, 5, 4, 4 and stress 3 → 5. Day 42 (live): mood 4. Mood is flagged 6 days in a row (days 37–42). Contract: `c3` has some readings missing. Put the gaps in resting heart rate (sensor not worn on days 39 and 41), not in mood, or the count breaks | Simulated |
| mind (angelos, wave 2) | One journal line, written live. Companion replies from a fixed script | Simulated |

**Missing:**
- the Mind screens and the mascot with preset replies (angelos, wave 2)
- the support request and the psychologist role (Q11)

## 5. E (`c2`): the medical officer

**What it shows:** one place where everything from A–D comes together, so a human decides with all
of it in front of them, and Earth gets the same picture.

1. **Login on the astronaut app.** E's own home for 5 seconds: E is crew too, and green.
2. **Medical officer platform → Crew view,** sorted by urgency: C red (emergency, epinephrine given,
   paperwork due), A amber (headache, short sleep, CO₂, acetaminophen, ibuprofen blocked), D (mood
   below normal for 6 days), B green (workout done, tasks 3 of 4).
3. **C's case summary.** E writes the paperwork and confirms the new allergy.
4. **A's case summary** on one card: health change, symptom, cabin, doses. E decides, for example
   to move A's spacewalk and ask the crew to check the CO₂ scrubber, and answers the sleeping-pill
   request in Approvals.
5. **Stock.** Epinephrine is now below its reserve (dadis2 already flags this).
6. **Send to Earth.** The reports queue and arrive in 12 minutes. Optional: Earth's reply comes back
   as a grant code.

| Piece | Records | Real or simulated |
|---|---|---|
| health, demo data | E's own normal, days 29–41 | Simulated |
| Everything else | Comes live from A–D during the demo | – |

**Missing:**
- **Wave 1:** the crew overview (angelos), approvals (dadis2), the platform pages (zt)
- **Wave 2:**
  - stock (dadis2)
  - the emergency event (dadis2)
  - reports and the Earth link, which have no owner yet

## Every screen appears

| Skeleton section | Shown by | In the contract |
|---|---|---|
| Login | every crew member | wave 1, core (zt) |
| Home: readiness, task score, body figure | A, B, C, D, E | wave 1 pages; the scores are placeholders (Q16) |
| Body point that asks a question | A | pages |
| Check-in | A, D | wave 1, health |
| Symptom report | A | wave 1, meds |
| Guided measurements | B | petros's guides |
| Today's tasks, points | B | placeholder (Q16) |
| Workout | B | **not in the contract** |
| Habitat | A (radiation in the intro) | wave 1, env; radiation in wave 2 |
| Med bay: allowed or blocked, locker, scan | A | wave 1, meds |
| Emergency | C | wave 2, meds (Q15) |
| Mind: history, journal, support | D | wave 2, mind; support later (Q11) |
| Companion | D | wave 2, mind |
| Crew view, approvals | E | wave 1, health and meds |
| Case summary, send to Earth | E | wave 2, no owner yet |
| Stock | E | wave 2, meds |

## Still open

- **Switching between crew members:** each player steps to the laptop and logs in (the face scan
  on the skeleton), or we keep one tab per crew member. Both work with the contract's server.
- **Medical officer on a second device:** the emergency alarm reaching E's own tablet or phone
  would look great on stage. It needs the phone hotspot the contract mentions.
- **The hazard frame** and the new names.
- **Spacewalk:** there's no field for it in the contract. The narrator can just say it.
- **Timing:** about one minute per crew member, so 2–3 screens per scene. Rehearse with a timer.

## Sources

- Law J, et al. (2014). Relationship between carbon dioxide levels and reported headaches on the
  International Space Station. *Journal of Occupational and Environmental Medicine*.
- Barger LK, et al. (2014). Prevalence of sleep deficiency and use of hypnotic drugs in astronauts
  before, during, and after spaceflight. *The Lancet Neurology*.
- Van Dongen HPA, et al. (2003). The cumulative cost of additional wakefulness. *Sleep*.
- NASA Human Research Program, five hazards of human spaceflight: https://www.nasa.gov/hrp/hazards/
- ISS RR-9 cabin telemetry, NASA OSDR Environmental Data App:
  https://visualization.osdr.nasa.gov/eda/api/missions/RR-9/telemetry_data/ (via potest's replay)
- PhysioNet Wearable Device Dataset v1.0.1: https://physionet.org/content/wearable-device-dataset/1.0.1/
- Apollo-Soyuz exercise heart rates: petros's `astronaut-inflight-vitals.csv`
