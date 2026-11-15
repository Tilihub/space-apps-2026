# PULSE Health Monitoring for Mars Transit

## Abstract

PULSE is the May the Pulse Be With You team's prototype for the 2026 Health monitoring software challenge. We brought personal health observations, wellbeing check-ins, exercise, spacecraft conditions, medicine access and delayed clinical reporting into one onboard application. The design addresses a practical question: how can a crew continue its daily health routines and organize useful information for qualified human review when Earth is delayed or unavailable? We developed separate components, agreed shared identities and data formats, and joined them through one Node.js server. The demonstration uses five fictional crew members, 65 synthetic historical check-ins and archived environmental measurements. Personal comparisons use a fixed median and median absolute deviation reference; the conversational companion uses local scripted responses. No new machine learning model was trained. The integrated repository includes persistent health and medicine workflows, simulated Earth delivery, private journals and personal Pulsars rewards. At the documented revision, all 117 root JavaScript tests passed. These results establish software behavior under the tested scenarios; they do not establish clinical effectiveness, sensor accuracy or readiness for operational flight.

## Executive overview

Our central product decision was to connect information that otherwise appears in separate tools. A headache report should be available alongside recent sleep, the person's recorded allergy, medicine collection and the cabin conditions at the relevant time. A crew member also needs a quiet daily interface and private support, while the onboard medical officer needs detailed comparison evidence. We therefore designed different views over shared onboard services, with permissions checked at the server.

The project combines three kinds of material. Published research explains which health domains and operational constraints matter. Historical environmental time series demonstrate real archive data and its gaps. Fictional personal histories create reproducible incidents without publishing anyone's health information. We kept these categories distinct throughout the data model and the demonstration.

Our current software is an integrated demonstration. The medicine and health services perform real local validation and persistence, but identity selection, Earth communications, prescription issuer verification and cabinet hardware are simulated. The 3D thermal map and training plots are synthetic. The psychologist conversation is a scripted local preview. The companion is a contextual rules engine, and the personal comparison is a statistical calculation. These distinctions are part of the technical description of the system.

The report documents the code at commit `b0f968c156927a52cf2607a2d548ce4cd078b862`, after the complete app and Pulsars merges on 15 November 2026. Earlier plans and reviews remain valuable records of why choices changed; their old completion labels do not override the merged implementation. Sources: [R01], [R02], [R03], [R04].

## 1 The challenge and the problem we chose

The team's shared plan identifies the 2026 Health monitoring software challenge. We chose a long-duration Mars-transit setting: a small crew in microgravity, limited resources and delayed or interrupted access to specialists on Earth. This setting shaped the application more directly than an ordinary connected wellness dashboard would. Local collection, a common mission clock, an onboard clinical role and visible communication states became core requirements.

NASA's Five Hazards resource organizes the broader context around radiation, isolation and confinement, distance from Earth, gravity changes and hostile closed environments. We used that context to join physiological observations with wellbeing, exercise and habitat conditions. The application does not attempt to measure every hazard or compute one comprehensive risk score. Its narrower purpose is to make relevant observations and authorized actions available together. [W02]

The research distinguishes human flight observations, terrestrial analogs, robotic spacecraft measurements and proposed Mars operations. No human Mars-flight cohort underlies our demonstration. The app's Mars timeline is fictional, and its 12-minute Earth delay is a selected scenario parameter. Archived ISS or Curiosity data retain their original mission provenance even when mapped onto that timeline.

The team's core idea and product decisions came from the human contributors. AI tools helped research, articulate, implement and check those decisions. The common plan's idea and scope fields are still unfilled in this snapshot; the detailed rationale is preserved mainly in personal plans, reviews, the shared contract and the working integration. This report consolidates that recorded rationale without treating every early proposal as an adopted requirement. Sources: [R01], [R05], [R06], [R07].

## 2 How the concept developed

### 2 1 From separate experiments to one onboard system

We began with complementary components: Angelos's Python personal comparison and history tools, Dadis2's browser inventory and prescription prototype, Potest's offline environment graphs, and Petros's research and demonstration data. Tommy recorded the intended user journeys; zt planned the shared interface and server. The problem was not simply displaying these experiments next to each other. Their identifiers, scales, clocks, storage and permission assumptions had to agree before a single application could rely on them.

The shared contract established one Node.js 24 server, JavaScript modules, five crew IDs, UTC mission time, strict JSON fields and module-owned storage. Existing prototypes stayed available as experiments. The application imports completed owner modules directly and uses connection adapters where a shared-server implementation was missing. This avoided duplicating health or medicine rules in the browser. Sources: [R02], [R08], [R09].

### 2 2 Decisions that narrowed the product

The early Home concept included a readiness score, task score and colored body. Readiness remained undecided; the delivered Overview shows observations and routine completion rather than a validated fitness-for-duty score. A body's symptom marker identifies a reported location, while the synthetic skin map remains separate from physiological measurements.

We clarified that mood, stress and fatigue use integer 1–10 inputs, while sleep duration uses hours. Earlier 0–10 Python histories remain on their original scale. We did not relabel old values or turn sleep quality into sleep duration. We also separated the astronaut's basic Today view from the medical officer's detailed history, reference calculations and weekly analysis.

The inventory concept evolved from opening authorized compartments toward simulated quantity-limited dispensing. One reusable prescription credential identifies a course; each eligible dose is collected once. The same typed code and QR payload must resolve to the same authorization. A proposed 15-minute access window was rejected. Physical dispenser mechanics were investigated, then left outside the application-demo scope.

The companion moved from a possible external model integration to a deliberately local contextual tool. Personal rewards, originally deferred, returned as Pulsars with independent routine streaks and cosmetic choices. The final requirements reject competitive rankings and rewards for particular wellbeing answers. Sources: [R05], [R10], [R11], [R12].

### 2 3 Presentation decisions and their purpose

The branded entry uses the team's supplied logo. The selected app appearance is Alloy MC04 with Clean Inter T02 typography, after comparisons of alternative layouts and type systems. Cyan and amber connect the interface with the logo. Overview value tints are illustrative drawing scales, not clinical classifications. The six instruments show resting pulse, temperature, sleep, daily tasks, SpO2 and blood pressure.

The interactive body makes symptom location concrete: 24 front and 26 back points map into the existing broad symptom schema, with the detailed location retained in text. The medical cabinet uses available, restricted and open states, keeps confirmation in the selected item panel and presents one Emergency toggle. These presentation choices simplify the journey while retaining the module's authorization and dose checks. Sources: [R05], [R13], [R14].

## 3 Users and intended journeys

The five fictional identities are Mara Quinn c1, commander; Leo Haddad c2, medical officer; Ines Sato c3, flight engineer; Tomas Reyes c4, mission specialist; and Kai Lindqvist c5, pilot. Leo can use the ordinary crew role for his own routine and the separate medical-officer role for authorized clinical work. The Earth specialist is a simulated third role. Selecting a role in the demo is not production authentication. [R08]

| User | Main actions | Information boundary |
|---|---|---|
| Crew member | Enter own measurements and symptoms, complete wellbeing and training, collect authorized items, use journal and companion | Own basic entries and personal features; no detailed clinical analysis or clinical report contents |
| Medical officer | Review crew health evidence, allergies and medicine requests; approve eligible courses; assemble clinical reports; close emergency paperwork | Clinical access does not include private journal or companion routes |
| Earth specialist | Receive delivered reports, reply and issue simulated course codes | Receives delivered clinical material; no general access to private journals, wallets or questionnaire answers |

The daily journey starts with a calm Overview, then supports measurement entry, the ten-question wellbeing form, symptom reporting and planned exercise. A symptom can lead into a medicine suggestion and an authorization workflow. The medical officer can inspect the larger situation and create a report that combines relevant health, medicine and environmental records.

The seven-minute demonstration was designed as a sequence of five crew stories. Tomas connects short sleep, headache, an NSAID allergy and an overnight cabin event. Mara supplies a normal comparison and a workout. Kai demonstrates an emergency. Ines demonstrates persistent mood and stress changes despite pulse gaps. Leo demonstrates the clinical overview, approvals and stock follow-up. These are designed software scenarios, not clinical cases. Sources: [R15], [R16], [R17].

## 4 Evidence and data strategy

### 4 1 What we collected and what we actually use

We collected source inventories, research summaries, transcribed published vital signs, processed environmental chart data, synthetic crew fixtures, measurement guides, a training program and sample medicine rules. These materials serve different purposes. A paper table can justify a field or illustrate a mission-phase observation without becoming a personal reference. A terrestrial waveform can test a parser without representing an astronaut. A spacecraft area detector can support habitat context without becoming a person's dose measurement.

The implemented health demonstration loads Petros's synthetic `health.json`. The connected environment adapter reads Potest's historical RR-9 cabin series and Curiosity cruise detector B. The standalone environment monitor exposes a larger archive of 33 dataset groups. The medicine module reads its sample catalogue. The companion uses the author's current check-in and a narrow selection from the synthetic history. No biomedical dataset is used to train model weights. Sources: [R02], [R17], [R18], [R19].

### 4 2 Research method and evidence quality

The two Gemini surveys in shared research were discovery material and explicitly marked unverified. Petros followed them with primary-source research, access checks and source-specific limitations. The resulting notes distinguish public PDF tables, processed downloadable files, request-based individual records and unavailable or unverified waveform access. We preserve those distinctions rather than treating every suggested portal as a dataset already integrated.

The research spans periodic vital signs; sleep, mood and cognition; exercise and deconditioning; cardiovascular and ocular measurements; blood and immune markers; microbiome studies; radiation; medicine stability and inventory; and private support under communication delay. The report uses these as design context. It does not convert observational associations into intervention claims or clinical thresholds. The source registry and research-file index at the end retain routes to the full underlying material. Sources: [R06], [R07], [R20], [R21], [R22], [R23].

### 4 3 Rules for interpreting the data

Every value needs its unit, source, collection phase and time basis. We distinguish individual observations from means and medians of cohorts; rest from exercise; estimated core temperature from oral or skin temperature; personal dosimeters from area instruments; and preflight or recovery assays from in-flight measurements. Missing data remain null or blank. A true zero hours of sleep is valid, whereas a skipped answer is not zero.

We do not merge different astronauts, studies or sensors into a synthetic claim of one person's continuous recording. Nor do we infer an environmental cause from a coincident symptom. The interface and report can place observations together so a qualified person can review them, while preserving the original context. Sources: [R17], [R20], [R23].

## 5 The health datasets and measurement model

### 5 1 Historical flight observations

The checked-in vital-sign CSV contains 47 records across seven mission labels. It has 26 individual summaries, 16 cohort means, three cohort medians, one approximate cohort summary and one values-unavailable record. The mission labels cover Apollo–Soyuz, Apollo 17, ISS, three grouped Shuttle labels and Inspiration4. These counts are records in the file, not independent participants.

The columns preserve mission, phase, source-relative mission time, subject, observation type, condition, heart and peak heart rate, respiratory rate, SpO2, systolic and diastolic pressure, core temperature, source URL, source locator and notes. Some exercise rows intentionally contain unavailable values. The CSV supplies research snapshots, not the five fictional astronauts' baseline. Appendix B summarizes coverage and missing values directly from the file. Sources: [R20], [R24].

### 5 2 Research downloads and access limits

The research notes record checks of Inspiration4 CBC OSD-569, CMP OSD-575 and urine-panel OSD-656 files, with 28, 28 and 22 rows respectively. Their sample labels were preflight or recovery, including later recovery visits, rather than FD-labelled in-flight records. Serum glucose from a chemistry panel is not a continuous glucose stream.

The OSD-572 processed microbiome TSV was recorded as 2,723 rows and 330 columns and includes flight-day sample labels. It requires sample metadata to interpret body site and phase. Other documented avenues include JAXA Cell-Free Epigenome OSD-530 processed RNA-seq, OSD-174 hair microarrays, CSA Vection data, ESA CIRCA and DOSIS-3D catalogs, published JAXA Chronobiology tables, and CARDIOVECTOR cohort medians. These are research/access findings in the source notes; they are not health-app inputs loaded by the current server.

Continuous public astronaut wearable downloads remained unverified in the team's checks. PhysioNet BIDMC supplies terrestrial HR, pulse, respiration and SpO2 numeric replay with documented dropouts; its original page describes signals derived from MIMIC-II. The wearable-device dataset supplies terrestrial exercise/stress channels with different sampling cadences. We considered these for software replay and future sensor work, while retaining their population and license distinctions. Sources: [R20], [R23], [W04].

### 5 3 Synthetic personal histories

The canonical fixture contains five people with 13 daily records each: seven reference days, mission days 29–35, and six recent days, 36–41. Day 42 is reserved for live entry. The envelope declares contract version 1 and synthetic provenance. The histories total 65 records, and no source paper is presented as their origin.

| Crew | Sleep reference h | Resting pulse bpm | Mood | Stress | Fatigue |
|---|---:|---:|---:|---:|---:|
| c1 Mara | 6.8 | 54 | 8 | 2 | 2 |
| c2 Leo | 7.3 | 67 | 7 | 3 | 4 |
| c3 Ines | 6.8 | 65 | 7 | 3 | 3 |
| c4 Tomas | 6.8 | 58 | 7 | 3 | 3 |
| c5 Kai | 8.0 | 58 | 8 | 2 | 3 |

These are computed medians of the fixture's reference rows, not population targets. The paired scenario file makes three specific checks reproducible: c1 crosses no comparison limit; c3 has a six-day mood and three-day stress change, with pulse unavailable on days 39 and 41; c4's day-42 sleep of 4.6 hours differs from a 6.8-hour reference for three consecutive days and is the only flagged measure. Existing stored references remain fixed until an explicit reset. Sources: [R17], [R25], [R26].

### 5 4 Input fields and collection methods

| Field | Unit and meaning | Collection in this prototype |
|---|---|---|
| sleepHours | Hours in previous 24 hours, accepted 0–24 | Synthetic history and entered daily estimate |
| restingHeartRateBpm | Beats per minute at rest | Synthetic spot value or entered observation; separate from exercise pulse |
| mood | Integer 1–10, higher means better mood | Daily self-report |
| stress and fatigue | Integer 1–10, higher means more | Daily self-report, separate items |
| spo2Pct | Peripheral oxygen saturation percent | Synthetic or entered pulse-oximeter spot value |
| systolicMmHg and diastolicMmHg | Blood pressure in mmHg | Paired synthetic or entered cuff reading |
| temperatureC | Body temperature in degrees Celsius | Synthetic or entered oral spot reading |

Only sleep, resting pulse, mood, stress and fatigue enter the personal comparison. Other accepted vitals remain spot observations. Respiratory-rate acquisition is researched but is not a daily-health payload field in this version. Input acceptance bounds catch invalid entries; they are not clinical normal ranges.

The sensor research explains ECG-derived heart rate, optical pulse and SpO2, respiratory motion bands, cuff pressure and method-specific temperature. Bio-Monitor demonstrates that channel availability depends on the shirt, headband and recorder. A cuffless systolic estimate cannot silently supply a diastolic value; skin, estimated core and oral temperatures cannot be treated as interchangeable. No live wearable is paired in the current application. Sources: [R08], [R23], [R27].

## 6 Environmental data and processing

### 6 1 Archive coverage

The checked-in `series.js` contains 33 historical dataset groups. They include ISS cabin and daily radiation archives; Artemis II storage-locker temperature, humidity and dew point; Artemis I instrument radiation; ISS DosTel; Curiosity cruise and surface radiation; ExoMars cruise radiation; Perseverance MEDA Sol 49; and InSight per-sol weather. Appendix A lists every group, metric, unit, time extent and processed point count. A point count refers to one channel's stored aggregate, not to people or independent experiments. [R18]

The connected habitat uses two selected replays. RR-9 provides cabin CO2, temperature and humidity. Curiosity cruise detector B supplies a radiation example from an uncrewed spacecraft. Other series remain available in the standalone monitor and data catalog. Storage-locker measurements are identified as such; Mars weather is outside a pressurized crew cabin; neither is silently substituted for current cabin telemetry.

### 6 2 Transformation pipeline

Potest's standard-library Python builder reads archived JSON and CSV/TXT products. It parses numeric values, rejects missing/nonfinite values and large sentinels, removes impossible ISS humidity values, groups observations by time and averages the valid values in each bucket. Stored triples are timestamp, value and valid source-sample count. Metrics retain a bucket duration and gap threshold.

RR-9 cabin data retain the fine archive cadence; other ISS cabin series use hourly buckets. Artemis II logger times are converted from CDT UTC−05:00 to UTC, clipped to the flight window and averaged into five-minute buckets. Radiation products retain instrument-specific quantities and units. The MEDA humidity channel for the selected sol is empty, so it does not become a fabricated humidity graph. Empty or all-null archive responses do not produce charts.

The time model is explicit: most archives use UTC Unix seconds; Perseverance uses local mean solar seconds within Sol 49; InSight uses sol numbers. The original raw-download directory is referenced by the research workflow but is not supplied as a complete tracked raw archive in this repo snapshot. Rebuilding requires the matching upstream downloads. Sources: [R18], [R28].

### 6 3 Mission mapping and missing data

The integrated adapter maps 17 September 2018 at 16:48 UTC to mission day 42 at 07:00 UTC, the confirmed recovery point used by the story. Radiation maps the first selected Curiosity sample on 8 December 2011 to day-42 midnight. This creates a demonstration alignment, not simultaneous measurement of the fictional crew and those spacecraft.

Source timestamps remain visible. The connected replay stops providing readings when the selected source ends. It does not invent a loop or radiation storm. The standalone monitor can loop, but marks the boundary and keeps original time labels. Charts break across gaps. A stale snapshot has a null current value and the last measured timestamp, with recovery still unverified when an active alert lacks confirming fresh samples. Sources: [R02], [R18], [R29].

### 6 4 Illustrative alerts

| Channel | Warning example | Danger example |
|---|---|---|
| CO2 | At least 3,500 ppm | At least 3,900 ppm |
| Temperature | At most 19 or at least 27 degrees Celsius | At most 16 or at least 30 degrees Celsius |
| Relative humidity | At most 30 or at least 70 percent | At most 20 or at least 85 percent |

Two successive readings normally confirm a change or recovery. A gap resets confirmation and keeps an active event unresolved until fresh evidence arrives. The implementation also preserves peak severity and handles an increasing excursion across warning and danger candidates. A separate synthetic alert exercise demonstrates high, low, missing and recovered readings.

These limits are engineering settings for the demo. The source notes distinguish them from NASA's CO2 partial-pressure averaging requirement and combined temperature-humidity envelope. A ppm reading alone does not establish the standard's partial-pressure criterion without total pressure and the required averaging. The report does not claim compliance from the illustrative table. Sources: [R18], [R30].

## 7 Personal comparison and weekly analysis

### 7 1 How the calculation works

The current JavaScript comparison is transparent and deterministic. For each of the five compared measures, it selects non-null reference observations from days 29–35. At least five valid reference days are required. The person's normal is the median. Variability is the median absolute deviation, or MAD: the median of the absolute distances from that normal.

The implementation sets `limit = max(3 × 1.4826 × MAD, floor)` and flags `abs(current - normal) >= limit`. The floor is 1.5 hours for sleep, 10 bpm for resting pulse and two scale points for mood, stress and fatigue. The factor scales MAD in a familiar robust-statistics convention; in this application the complete rule and floors are unvalidated engineering choices. They were not fitted or calibrated on clinical outcomes. [R31]

Both higher and lower changes can be flagged. The direction and consecutive-day count are returned separately. A streak extends only while that same measure stays beyond its limit in the same direction on successive calendar mission days. A missing observation, missing day, direction reversal or return below the limit stops that streak. A missing pulse does not erase an independently observed mood sequence.

For Tomas, 4.6 hours is 2.2 hours below the 6.8-hour fixture median, exceeding the 1.5-hour floor used in that scenario. The demonstration therefore reports a sleep change. This is a comparison with his synthetic reference, not a diagnosis of insomnia or a clinical danger boundary. The baseline never adapts silently as new entries arrive. Sources: [R25], [R26], [R31].

### 7 2 Status and uncertainty

The response distinguishes no check-in today, changes found, insufficient data and no changes. It records gaps per measure. Having no detected changes does not establish that a person is healthy, and missing measurements do not count as normal. The crew-facing save returns the saved check-in and Today view, while the medical officer obtains detailed daily analysis through separate authorized routes. Sources: [R08], [R09], [R31].

### 7 3 Weekly summaries and provenance

Weekly analysis compares the latest seven calendar days with the preceding seven and reports each measure's median, valid-day count and missing-day count. A week-to-week difference is returned only when both windows contain seven valid values for that measure. Available current-week data can still be described against the frozen reference, with completeness disclosed. Baseline observations never fill missing recent days.

The health module persists a SHA-256 fingerprint of its loaded fixture source. An updated file does not overwrite a running store's reference. The earlier Python tool also supports a separately versioned personal-history JSON importer, preserves source, units and scales in SQLite, and provides a backup before reset. That importer and the app's `health.json` are different formats; neither silently migrates the other's history. Sources: [R09], [R32], [R33].

## 8 AI use

Our team designed and built PULSE's application pipeline, including data ingestion, personal baseline comparisons, module integration and role-based workflows. We used AI tools to assist research, coding, testing and documentation. The team defined the concept, selected the sources and methods, made the design decisions and reviewed the results. Sources: [R02], [R05], [R09].

The companion runs locally with topic rules and prepared responses, using the signed-in user's current check-in and limited synthetic history as context. It does not use a newly trained model or make external model calls. Private journal text is excluded from its context and ordinary clinical reports. Sources: [R19], [R34], [R37].

## 9 Software architecture and persistence

The server laptop hosts one Node.js 24 ES-module application. The production registry mounts health, meds, mind, env, reports and pulsars. The core supplies sessions, role enforcement, mission clock, events, HTTP routing, static assets and durable JSON stores. Backend modules use Node built-ins, with no npm package installation. The earlier Python experiments remain available separately. [R02], [R38]

:::architecture

Each owner module exports routes and optional reset/tick behavior. The core passes authenticated identity and a context with mission time, module storage and metadata events. Input validation rejects unknown fields rather than silently ignoring mismatches. Module writes are serialized; handlers return success after saving. Pages compose multiple services without reimplementing their clinical or access rules.

The clock starts at fictional mission day 42, 07:30 UTC on 14 November 2026; mission day zero is 3 October. Test controls can advance it. A stopped server pauses the mission clock. This shared time drives check-ins, dose eligibility, replay, report transit and rewards. A visual per-second clock projection smooths timers while saved timestamps continue to come from the server.

The health and medicine modules are imported directly from their owners' folders. Connection-owned adapters implement journal, environment mapping and reports, and join the original companion helpers. Each module has its own persisted state. Events contain change metadata rather than journal text or private questionnaire answers. The demo reset affects all modules and requires deliberate use; it is not a per-person reset.

Local APIs, storage, QR rendering and scripted support run without an external service key. Full first-load visual independence is incomplete because Three.js and fonts retain remote dependencies. Production identity, transport security, encrypted storage and deployment hardening are outside this demo implementation. Sources: [R02], [R08], [R38], [R39].

## 10 Medical inventory and authorization

### 10 1 Catalogue and the information it represents

The sample catalogue contains 21 entries: ten self-care medicines, four prescription medicines, two controlled medicines, three emergency medicines and two supplies. It also includes fictional patient allergies, ingredient limits, red-flag examples, stock/reserve/expiry fields and seeded symptom/dose history. Appendix C lists the actual item IDs and tiers. The optional L3 defibrillator shelf is planned equipment and is not a collectable catalogue entry.

NASA medical-kit, pharmaceutical-stability and inventory-tracking resources informed organization, limited resupply, expiry awareness and scan-to-confirm ideas. The medication names, strengths, dose limits, allergy cases and schedules in the code are sample demonstration rules. They do not constitute a mission formulary, prescribing guideline or medical recommendation. Sources: [R22], [R40], [R41].

### 10 2 Normal collection path

A crew member reports symptoms with an area, code, severity and optional note/vitals. The medicine rules return suggestions and restrictions. Normal-flow allergy checks can block an item despite an otherwise valid grant. Self-care may be available without approval, while reserves, conditions, daily limits and ingredient checks can restrict it. Prescription medicines require the medical officer; controlled medicines require Earth. The current code also routes the medical officer's own prescription needs to Earth. Tommy later requested a change to that exception, but it remains the implemented rule at this revision.

An eligible prescription generates a reusable course credential. Typed and scanned RX2 payloads resolve to the same grant. A collection batch includes the items currently due; each compartment is confirmed once. Stock and the collected-dose log change at confirmation. Collection is not proof of swallowing, and a later effectiveness follow-up is separate.

The medicine service prevents duplicate collection, considers recent doses across replacement courses, aggregates relevant ingredients and permits only one effective course per medicine/person at a time. Missed slots do not accumulate into extra doses. Entering a credential again retrieves its existing course rather than creating a new allowance. Codes include demo validity/checking behavior but do not cryptographically authenticate a clinician. Sources: [R10], [R40], [R41].

### 10 3 Emergency and hardware boundaries

Any crew member can raise an emergency for a person with a required reason. The implemented module releases emergency-tier items through the exceptional collection path, logs patient and collector, supports explicit logged allergy override and can skip a scan. Medical-officer paperwork closes the incident; the demonstration tracks a two-hour paperwork deadline. These are sample operational rules.

The emergency scope of the older browser prototype was broader than the shared-server medicine module. The integrated report describes the module actually mounted, rather than carrying that older behavior forward. Physical cabinet release, dose metering, fault detection and verified issuer signatures are simulations or future engineering. Mechanical dispenser research remains documented but is not claimed as delivered hardware. Sources: [R40], [R41], [R42].

## 11 Exercise and personal progress

### 11 1 Why this program

The exercise design assumes a compact, anchored flywheel station with resistance and rowing capability during Mars transit. Petros used Orion hardware context, bed-rest flywheel work and SPRINT study formats to assemble a prototype weekly rhythm. The source notes distinguish those precedents from proof that this proposed setup preserves fitness throughout a Mars mission. Equipment anchoring, clearance, individualized settings and the actual mission prescription remain matters for the mission exercise team. [R43]

| Cycle day | Resistance | Aerobic work |
|---|---|---|
| 1 | Four lifts, 4 sets of 12 | 30 minutes steady rowing |
| 2 | None | 6 intervals of 2 minutes with 2-minute easy recovery |
| 3 | Four lifts, 4 sets of 8 | 30 minutes steady rowing |
| 4 | None | 8 intervals of 30 seconds with 15-second easy recovery |
| 5 | Four lifts, 4 sets of 6 | 30 minutes steady rowing |
| 6 | None | 4 intervals of 4 minutes with 3-minute easy recovery |
| 7 | Rest | Rest |

The lifts are harness squat, deadlift, harness heel raise and bent-over row. The published handoff gives warm-up, cool-down, rest, effort and individualized target details. Resistance and steady rowing are separate sessions, with spacing when schedules permit. Kilograms in the progress feature remain a self-reported demonstration quantity; they are not an established conversion from flywheel inertia to physical load. Sources: [R13], [R43], [R44].

### 11 2 Controller, sensor replay and saved summaries

The browser imports Petros's controller and program. It supplies mission time, crew-bound health client and either a labelled replay or future device samples. The stage demonstration has a synthetic 90-second exercise trace rising from 72 to 145 bpm and a one-minute recovery value of 102 bpm. Pulse expires after ten seconds without usable input; the display becomes unavailable rather than fabricating continuity.

Saved workout summaries include session identity, start/end, repetitions, average and peak pulse, optional one-minute recovery and source. They remain separate from resting health measurements and reference calculations. The UI automates the recovery/save sequence and retries failed saves, but in-progress checklist state remains in memory and is lost on reload. Without usable pulse, the current health schema cannot store a numeric workout summary; the separate validated self-report reward flow should not be mistaken for measured exercise sensing.

The presentation's rolling heart-rate and breathing plots are explicitly simulated. Extended fictional exercise and pre-start visual samples do not become historical astronaut telemetry. Sources: [R09], [R13], [R43].

### 11 3 Pulsars and private questionnaire persistence

Pulsars rewards routine completion and self-expression. Each assigned main exercise and a completed daily wellbeing form earns 100 on streak days 1–3, 200 on days 4–5 and 300 from day 6 onward. Exercise and wellbeing streaks are separate. All main exercises across assigned sessions must be complete for the exercise day to extend the streak. Planned rest preserves that streak without increasing it or paying a reward. Warm-up, cool-down and the stage demonstration earn none.

A first positive resistance-load record sets a personal baseline without a bonus. A later eligible higher load with all prescribed sets/repetitions adds 100. Additional repetitions alone do not qualify. The server validates program identities, current mission day and completions, deduplicates awards and serializes wallet changes. There is no leaderboard, monetary checkout or reward for a particular health answer.

The catalogue has 24 appearance choices including four free defaults: seven body colors, five rings, five expressions and seven accessories. Standard paid colors cost 800, rings 500, expressions 900 and basic accessories 1000, with premium prices in the authoritative catalogue. Preview is free; purchase checks the server price, ownership and balance and saves equip state atomically.

The merged Pulsars module also persists all ten wellbeing answers privately: mood, stress, fatigue, worry, focus, motivation, loneliness, connection, workload and mental refreshment. The original health API still stores only its existing three psychological fields. Earlier UI-only notes calling the extra seven answers session drafts describe the pre-Pulsars state. The current questionnaire is a custom daily 1–10 form, not WHO-5 or a validated psychological score. Medical-officer and Earth roles cannot read the wallet, private answers or PRs through the Pulsars API. Sources: [R11], [R14], [R44], [R45].

## 12 Clinical reports and interrupted Earth communication

The medical officer can assemble a clinical case from daily analysis, recent history, optional weekly summaries and workouts, symptoms, medicine collection/allergy profile and a time-stamped cabin snapshot. The connection also includes 48 hours of CO2 history and cabin alert context. An astronaut session cannot fetch the report content. The reports adapter rejects journal/companion fields and never reads the mind store. [R02], [R46]

Reports move through queued, sent and received states against the shared mission clock. Turning the simulated link off retains reports onboard. Restoring it permits transit; the configured delay is 12 mission minutes each way. Earth sees delivered reports, can reply and can generate a simulated one- or two-item RX2 code through the connection endpoint. The return reply has its own delivery event. Stored IDs and states prevent retries from presenting repeated transmission as independent cases.

This is local transport simulation: no actual spacecraft or external clinician receives the report. The current adapter does not implement automatic clinical-report triggers, although periodic and incident reporting appear in earlier requirements. Report ownership and exact contract wording still have handoff notes; the working implementation is identified by its mounted adapter.

NASA's medical-operations material supports private medical/psychological communication and delayed store-and-forward concepts. PULSE translates that context into a demonstrable interface, without claiming that the demo's fixed delay or chosen report contents are an approved mission protocol. Private psychologist transport remains separate future work. Sources: [R07], [R37], [R46], [W03].

## 13 Privacy and role enforcement

Server-side role checks, crew ownership and strict input fields define the demo boundary. Selecting another crew ID in a request does not authorize access. Clinical analyses, journals and Pulsars state have different audiences. A medical role is not a universal bypass, and Earth receives only delivered clinical material through its report workflow.

The journal is author-only in this implementation. The intended author/assigned-psychologist relationship is a future role and private-transport requirement. The companion does not read the journal, and questionnaire answers stored in Pulsars are not appended to it or to clinical reports. Change events carry metadata, not private content.

These are tested application behaviors under simulated identities. They are not a production security certification. Before real health data could be used, the team would need real identity proof, secure transport and storage, access lifecycle and audit design, retention/consent decisions, specialist review and a deployment threat assessment. The public repository and public demonstration should continue to use fictional people and synthetic private content. Sources: [R08], [R19], [R37], [R44], [R46].

## 14 Verification and results

### 14 1 Reproduced automated result

On 15 November 2026, the report preparation reran the root package's exact JavaScript test command against the pinned application snapshot: `node --test "**/*.test.js"`. The result was 117 tests passed, zero failed, zero skipped and zero cancelled. The run used the bundled Node runtime with Python available for the older bridge tests and localhost access for real-HTTP checks. An initial restricted run could not complete the environment-dependent checks; the complete rerun is the result reported here. The log is retained with the report as reproducibility evidence. [R47]

| Test area | Behavior exercised by the repository tests |
|---|---|
| Health and client | Own identity, strict fields, scales, immutable references, missing data, streaks, scenario fixtures, weekly coverage and workouts |
| Core and HTTP | Routing, roles, module persistence, serialized operations, clock, resets and actual client/server composition |
| Medicine | Allergy restrictions, grants and replacement, due slots, same credential, batch collection, duplicate refusal, emergencies and stock |
| Environment and reports | Historical recovery, gaps, clinical-only report access, offline queue, delayed receipt/reply and journal exclusion |
| Companion and journal | Author/day/role validation, topic replies, private-store separation, context restrictions and reset/session behavior |
| Pulsars | Validated exercises/answers, deduplicated rewards, prices and purchases, concurrency, restart persistence and private access |

The report also computed dataset counts and personal medians directly from the tracked source files. Appendix A is generated from `series.js`; Appendix B from the historical vital-sign CSV; Appendix C from the medicine catalogue. Evidence file hashes and the source commit are stored in the report manifest so later updates can be distinguished.

### 14 2 What the result does and does not establish

Passing tests supports consistency of the implemented cases and access boundaries. Existing visual-review exports provide evidence of the team's interface iteration, but are not a clinical usability trial. The repository contains no sensitivity/specificity study for health alerts, model accuracy benchmark, sensor calibration study, astronaut user evaluation or controlled outcome trial of the companion or rewards.

The current demonstration establishes that the selected inputs can be collected, stored, compared, combined and reviewed under its rules. The personal thresholds, questionnaire, medicine examples and environmental warning settings remain unvalidated for care. Neither a quiet Overview nor an absent comparison flag is medical clearance. Sources: [R09], [R18], [R31], [R44], [R47].

## 15 Limitations and next development work

| Area | Current limitation | Concrete next work |
|---|---|---|
| Clinical comparison | Small synthetic reference and engineering thresholds | Agree intended use with clinicians; obtain suitable consented longitudinal data and evaluate missingness and false alerts |
| Sensors | No paired wearable; synthetic training/thermal display | Select hardware, implement quality-aware adapters and verify units, time, method and rest/exercise context |
| Companion | Keyword/templates and frozen synthetic history | Review response coverage and escalation with specialists; define private context before any model integration |
| Earth and identity | Local role/transport/issuer simulation | Implement authenticated identities, signed credentials and explicit receipt/retry behavior with deployment security |
| Psychologist | Scripted UI preview, no specialist role | Agree private recipients, retention and author access, then implement separate private transport |
| Equipment | Cabinet release and AED shelf are simulations/drafts | Define reusable-equipment schema and hardware verification rather than treating equipment as medicine doses |
| Exercise records | Active checklist lost on reload; kilograms are self-reported | Agree durable exercise-level records and equipment calibration without altering resting measurements |
| Offline visuals | First load needs external 3D/font assets | Package approved assets locally and verify complete cold-start offline behavior |
| Governance and submission | Common-plan and project-page templates are incomplete | Have the team confirm scope, sources, AI disclosure and submission fields before final publication |

The next iteration should preserve what already works: frozen per-person references, explicit gaps, one clock, server-owned identity, separately protected private information, and reusable course credentials with dose deduplication. New clinical, hardware or model capabilities need their own evidence and tests. The team's repository workflow remains personal work to integration to final, with teammate review for protected material. This report is documentation in Angelos's own area; it does not move the application into `final/` or claim final submission. Sources: [R01], [R02], [R08], [R13], [R48].

## 16 Conclusion

PULSE demonstrates an onboard way to organize health routines and clinical context during Mars transit. Its contribution is the connection between personal observations, wellbeing, exercise, habitat data, medicine authorization and delayed human review. The work progressed from independent experiments to a shared contract and an integrated, tested application, with explicit corrections to scales, permissions, prescription reuse and data provenance.

Our collected research and archives informed field selection and scenario design. Synthetic histories made the public demo reproducible. The statistical comparison remains inspectable, the companion remains a local scripted support tool, and the human medical roles retain the care decisions. The software tests support the implemented prototype; clinical evaluation, live sensing, real communications and operational qualification remain future work.

## 17 Contributors and development record

| Contributor | GitHub identity | Documented contribution |
|---|---|---|
| Angelos | AngelosAth30 | Personal comparison, Python prototypes/import, Node health service, client and integration verification; this consolidated report |
| Dadis2 | dadis2 | Medical inventory, catalogue, allergies, prescriptions, reusable grants, dispensing, emergencies and stock |
| Petros | petrosmpidis | Primary-source research, historical vital-sign transcription, fictional histories, measurement guides and exercise program/controller |
| Potest | Potest04 | Environmental archives, processing, alert/replay bridge and Crew Support response helpers |
| Tommy | tommy2002t | Product requirements and reviews, integration and visual refinement after handoff, wellbeing form and Pulsars |
| zt | Tilihub | Repository coordination, shared contract, core server, initial interface and 3D body work |

The names above use the public contributor identities recorded in the repository. The public GitHub record provides the chronology: early prototypes and requirement reviews; contract #49; external import #50; data #51 and alignment #64; health module #57; workout #63/#67; medicine #66/#70; core #71; and connected application #73/#74 with Pulsars #75. PR titles describe their historical scope and may retain earlier terminology, such as the OpenAI-backed companion prototype. The actual delivered behavior is described in the relevant implementation sections. [R03], [R04]

## 18 References and document conventions

Repository references R01 onward point to the exact source revision. The full project source registry follows, including NASA resources and partner/other references. Additional research links remain available in the indexed research documents; their access findings and limitations belong with those sources. Counts in generated appendices describe checked-in processed files rather than an assertion that all upstream products were downloaded again for this report.

The report organization is adapted from the NASA Publications Guide for Authors, NASA/SP-2015-7602 Revision 2, especially its separation of front matter, technical body, references and appendices. We use an abstract, rationale, methods, results, discussion and supporting catalogs. The cover uses our team's existing logo and a team report identifier. This is a team project report, not an agency publication or a claim of agency approval. [W01]

:::references

:::appendices
