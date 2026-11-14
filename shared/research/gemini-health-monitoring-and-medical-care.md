# Astronaut Health Monitoring and Medical Care in Spaceflight

> **Source:** research report generated with Gemini on 2026-11-14, added by zt.
> Not yet checked by the team. Verify links, numbers and access rules before relying on them.
> Add a source to [sources.md](../sources.md) once we actually use it.

## Summary

Astronaut health monitoring and medical care today happen mainly in low Earth orbit (LEO) on the International Space Station (ISS). There, crews have near-real-time support from Mission Control Center (MCC) flight surgeons, regular cargo resupply, and the option of an emergency return to Earth. Exploration missions remove those safeguards:

- **Artemis (Moon):** about 3-day transits with an approximately 1.3-second one-way signal delay.
- **Mars:** an average distance of 140 million miles and missions of about 3 years, including up to 2 years on the surface at three-eighths of Earth gravity. One-way communication delays reach up to 20 minutes, with no cargo resupply or rapid medical evacuation.

To cover these different constraints, NASA revised NASA-STD-3001. It deleted the legacy "Levels of Care pyramid" and the 14-day cutoff, and replaced them with requirement **[V1 3004]**, which scales in-mission hardware, software, consumables and crew training to mission distance, time to definitive care, and required autonomy.

Five interacting spaceflight hazards drive physiological and behavioral changes: space radiation, isolation and confinement, distance from Earth, gravity fields, and hostile/closed environments. In microgravity, astronauts:

- lose on average 1–1.5% of weight-bearing bone mineral density per month (NASA's Spinal Health study says about 1% per month)
- experience upward fluid shifts linked to Spaceflight-Associated Neuro-ocular Syndrome (SANS) and stagnant or retrograde internal jugular vein (IJV) blood flow
- undergo spherical cardiac remodeling and sensorimotor disruption across gravity transitions
- develop altered immunity, with latent viral reactivation and microbiome shifts
- face circadian desynchrony from 16 ISS sunrises and sunsets per day

Current ISS monitoring combines onboard point-of-care tools (Ultrasound-2, Optical Coherence Tomography, tonometry, HemoCue® white blood cell counting, radiation dosimeters), biological samples returned to Earth for lab analysis, fitness tracking, and weekly Private Medical Conferences (PMCs) and Private Psychological Conferences (PPCs). Results are compared against each person's pre-flight baselines, such as Spaceflight Standard Measures and the Lifetime Surveillance of Astronaut Health (LSAH).

Big gaps remain before multi-year autonomous care is possible:

- U.S. Food and Drug Administration (FDA) repackaging rules limit medications removed from their original packaging to a 1-year expiration date. As a result, only 16% of ISS kit medications keep at least 2 years of shelf life once packed for flight, and spaceflight storage speeds up chemical degradation compared with Earth controls.
- Beyond LEO, NASA's Exploration Medical Capability (ExMC) is developing autonomous diagnostics, clinical decision support, just-in-time procedure guidance (AMOS), RFID consumables tracking (MCT), and sterile intravenous water generation (IVGEN).
- Public human data include open cellular and omics datasets on NASA's Open Science Data Repository (OSDR) and anonymized individual-level bedrest analog data on the NASA Life Sciences Portal (NLSP). Identifiable astronaut clinical records stay restricted under LSAH.
- **Missing from the primary sources:** routine in-flight blood glucose and body temperature protocols, numeric clinical action cutoffs for many vital signs, Moon and Mars communication bandwidths, and formal Crew Medical Officer (CMO) prescribing authority.

| Parameter | ISS / LEO (today) | Artemis / Moon (near-term) | Mars / deep space (planned) |
|---|---|---|---|
| Distance and duration | ~250 miles altitude; ~6–12 month missions | ~3-day transit | ~140 million miles average; ~3-year mission (up to 2 years on surface) |
| One-way communication delay | Near real-time MCC support | ~1.3 seconds | Up to 20 minutes |
| Resupply and evacuation | Regular cargo resupply; emergency return available | Limited; ~3-day return transit | No resupply; no emergency medical return |
| Care framework ([V1 3004]) | Ground-supported telemedicine and clinical operations | Mission-tailored medical capability; Orion AMCL | Gradual move to space-based autonomous care (EIMO) |
| Radiation context and limits | Partial magnetospheric shielding; <600 mSv career limit | Beyond magnetosphere; shielding plus <250 mSv SPE limit | Full GCR/SPE exposure beyond magnetosphere; shielding plus open medical gaps |

## 1. Hazards and risks

NASA's Human Research Program (HRP) defines five hazards of human spaceflight. They interact and compound physiological and psychological stress across LEO, lunar and Mars missions.

| Hazard | Effects on body and mind | Timescales and mission contexts |
|---|---|---|
| Space radiation | Ionizing galactic cosmic rays (GCRs) and solar particle events (SPEs) cause biological damage: higher cancer risk, degenerative heart, vascular and eye disorders, central nervous system (CNS) injury, cognitive and motor decline, behavioral changes. | Acute (SPEs) and cumulative over months to years; critical beyond Earth's magnetosphere on Artemis and ~3-year Mars missions (ISS/LEO keeps partial magnetospheric shielding). |
| Isolation and confinement | Changed behavior and mental and emotional state in small crews, worsened by sleep loss, circadian desynchronization and work overload, reducing performance. | Chronic across months or years in LEO, Moon and Mars missions; studied in Earth analogs including HERA, CHAPEA (378-day Mars Mission 2) and Antarctica. |
| Distance from Earth | Prevents real-time guidance, resupply and evacuation; requires autonomous emergency care, consumables recycling (such as water recovery), rationing, and long reliance on stored food ("menu fatigue"). | Minimal in LEO; moderate on ~3-day lunar trips (~1.3 s delay); severe on ~3-year Mars missions (~140 million miles, up to 20 min one-way delay). |
| Gravity fields | Microgravity causes headward fluid shifts, SANS vision changes, 1–1.5%/month weight-bearing bone loss, muscle atrophy, and kidney stones (bone calcium plus dehydration). Gravity transitions trigger space motion sickness (SMS), disorientation, fainting, and impaired balance and walking. | Acute at orbital insertion and planetary/Earth landings; progressive across months in LEO and up to 2 years at 3/8 g on Mars. |
| Hostile/closed environments | Poorly controlled cabin temperature, pressure, lighting, noise, crowding, and altered person-to-person microbial transfer raise stress hormones, alter immune function, and increase allergy and illness risk. | Continuous in all closed spacecraft and surface habitats in LEO, Artemis and Mars missions. |

Within these hazards, HRP tracks formal physiological, behavioral and radiation risks. The risks most relevant to ongoing crew health monitoring, where the crew can track signs, symptoms, biomarkers, exposures or function, differ from mainly acute engineering or landing hazards such as Dynamic Load Injury.

| HRP risk | Body and mind effects | Timescale and crew self-monitoring relevance |
|---|---|---|
| Altered Immune System Responses | Radiation, microgravity and poor sleep impair white blood cells and reactivate latent viruses (cold sores, shingles), causing rashes, atypical allergies and infections. | Multi-month LEO and multi-year deep space; crew can monitor symptoms, rapid WBC counts (HemoCue® on ISS), and collect saliva/blood/urine samples. |
| Host-Microorganism Interactions | Altered skin/gut microbiomes and possibly higher microbial virulence or transfer raise infection risk. | Continuous across all missions; crew swab habitat/Veggie surfaces and water, with 5-day ambient slide density checks. |
| Cardiovascular Adaptations | Spherical cardiac remodeling, altered IJV blood flow (clot/VTE risk), arrhythmias, cardiovascular disease, post-landing orthostatic hypotension/fainting. | Progressive across months in LEO and multi-year Mars transit; crew operate Ultrasound-2 and wearables/telemedicine sensors. |
| Spaceflight-Associated Neuro-ocular Syndrome (SANS) | Structural brain and eye remodeling, swelling at the back of the eye, and vision changes from fluid shifts. | Develops over weeks to months in microgravity (ISS, Mars transit); crew run in-flight OCT, eye exams and tonometry. |
| Bone Changes and Reduced Cardiorespiratory/Musculoskeletal Fitness | Weight-bearing bone breakdown (fracture risk), muscle atrophy, spinal fat infiltration, and lower aerobic capacity, impairing EVA and capsule egress. | Progressive across months (unknown trajectory past 6 months in LEO); tracked via exercise performance, IMTP/IBP strength and VO2max tests. |
| Altered Sensorimotor and Vestibular Function | SMS (affects most astronauts regardless of motion-sickness history on Earth), spatial disorientation, impaired gait and hand-eye coordination. | Acute at gravity transitions (launch, Moon/Mars landing, Earth return); crew track symptoms and neuro-vestibular performance. |
| Decompression Sickness (DCS) and Hypoxia | Suit depressurization risks nitrogen bubbles (severe pain, breathing trouble, stroke-like deficits). Planned partial cabin depressurization cuts pre-breathe oxygen demand but raises mild hypoxia risk (headache, confusion, vision/sleep issues). | Acute during EVAs (ISS, Moon, Mars) and continuous in reduced-pressure exploration habitats; crew monitor symptoms and pressure/oxygen status. |
| Inadequate Food and Nutrition | Menu fatigue and stored-diet limits reduce calorie and micronutrient intake, causing body mass loss and performance deficits. | Progressive over multi-month ISS and ~3-year Mars missions; crew log daily intake and weekly food acceptability. |
| Inadequate Sleep and Irregular Schedules | 16 sunrises/day on ISS, work overload and irregular schedules cause sleep loss, cognitive errors, metabolic disturbances and burnout. | Daily and cumulative across all missions; tracked via wrist actigraphy (Artemis II ARCHeR) and work/rest logs. |
| Behavioral Changes, Psychiatric Disorders and Inadequate Teamwork | Mood shifts, psychological distress, interpersonal tension and weaker team recovery under long confinement and latency. | Cumulative over months to years; monitored via surveys, PPCs and self-assessment under communication delays. |
| Inadequate Systems Operations Support and EVA/Dynamic Load Injury | Equipment/medical failures without real-time MCC help, spacesuit CO₂/O₂ or fatigue hazards, landing fracture/egress injury in weakened crews. | Acute at landing/EVA or during anomalies; less suited to continuous vital-sign self-tracking, but relevant to fitness-for-duty readiness and autonomous procedure aids. |
| Radiation-Induced Cancers (plus degenerative and CNS effects) | Higher lifetime cancer mortality, degenerative vascular/cardiac/eye disease, in-mission CNS cognitive/behavioral deficits. | Acute (SPEs) and lifetime cumulative dose across LEO, Artemis and Mars; crew and SRAG track cumulative dosimetry. |

## 2. Health indicators

Most physiological tracking on the ISS combines limited real-time onboard measurements with biological samples returned to Earth. Artemis and Mars missions need autonomous in-flight diagnostics. Several clinical parameters, notably **blood glucose, body temperature, and exact numeric vital-sign action thresholds, are not documented** in the retrieved primary sources.

| Indicator | Hazard / risk, and what measuring detects or prevents | In-flight measurement today (device, frequency, operator) | Typical in-flight change | Published limits, thresholds or action criteria |
|---|---|---|---|---|
| Heart rate | Cardiovascular Adaptations; detects arrhythmias, autonomic stress, exercise strain. | ISS: recorded via Tempus Pro telemedicine trial and Bio-Monitor/Astroskin smart shirt (per Hexoskin vendor blog); integrated vital-signs sensor in ExMC development. Routine clinical frequency not specified. | Not reported. | Not reported. |
| Blood pressure | Cardiovascular Adaptations and Gravity Fields; detects orthostatic hypotension and landing fainting risk. | ISS: vital signs collected in Tempus Pro trial. Routine device, schedule and operator rules not stated. | Higher risk of low blood pressure and fainting on landing / return to gravity; exact mmHg changes not stated. | Not reported. |
| Blood glucose | Sleep/circadian desynchrony (causes metabolic disturbances). | Not documented (ExMC's integrated blood analyzer uses nanostrips for unspecified "other analyte concentrations"). | Not reported. | Not reported. |
| Body temperature | Hostile/closed environments and immune/infection risks. | Not documented for crew clinical monitoring (cabin thermal control is tracked as a habitat requirement). | Not reported. | Not reported. |
| Sleep | Inadequate Sleep and Irregular Schedules; detects circadian desynchrony, cognitive impairment, burnout. | Wrist actigraphy (pre-, in- and post-flight for Artemis II ARCHeR; sleep tracked in ISS Space Physiology study). Routine ISS schedule not reported. | Disrupted sleep-wake cycles from 16 sunrises/day and irregular schedules; sleep aids used 10x more in spaceflight. | Not reported. |
| Mood and behavioral health | Isolation/confinement, behavioral changes and psychiatric disorders, inadequate teamwork. | ISS: confidential PPCs, weekly PMCs, research surveys (Veggie survey 2–3x/month). Artemis II: ARCHeR pre/post surveys. | Altered mental, emotional and behavioral states under long confinement and workload; exact rates not reported. | Not reported. |
| Cognitive performance | Space radiation (CNS), circadian desynchrony (inattention, slow reaction, poor decisions), mild hypoxia. | ISS: CIPHER Spatial Cognition uses in-flight brain function tests, robotic training system interaction and pre/post MRIs; 6-month cognitive performance studied via LSAH. Routine battery name/frequency not reported. | Altered visuospatial cognition, attention, reaction time and decision making; effect sizes not reported. | Not reported. |
| Body mass | Inadequate Food and Nutrition; detects energy deficit and menu fatigue. | ISS: daily Food Physiology intake logs, weekly research team consults, weekly Food Acceptability surveys; body weight used pre-flight for EVA strength scaling. In-flight scale/frequency not reported. | Risk of body mass loss when menu fatigue cuts intake; exact kg or % not reported. | Not reported. |
| Bone and muscle | Gravity fields, bone changes, musculoskeletal fitness, dynamic load injury, renal stones. | Pre/post-flight 3D qCT, MRI, TBone2 high-res imaging and DL/BP strength; in-flight blood/urine calcium isotopes (CIPHER), ISS IMTP/IBP strength and muscle tests. No in-flight bone density scans reported. | Weight-bearing BMD loss averages 1–1.5%/month (Spinal Health: ~1%/month); muscle atrophy and spinal fat infiltration. | Pre-flight DL/BP strength scaled to individual body weight, suit mass and gravity from Fitness for Mission Task (FMT) thresholds (e.g. 1.5 km walk, 30x 10.9 kg bag transfer, 75 kg rescue drag over 50 m). |
| Vision and eye health (SANS) | Gravity fields / fluid shifts, SANS (formerly VIIP). | ISS: eye exams, crew-operated tonometry (eye pressure), OCT cameras during Ocular Health tests, venous ultrasound; pre/post MRIs (CIPHER ISAFE, Artemis II). Routine frequency not specified. | Swelling at the back of the eye, eye/brain structural shifts, altered venous blood flow, vision changes; incidence/diopter shifts not stated. | Not reported. |
| Radiation dose | Space radiation, radiation-induced cancers, CNS and degenerative disease. | ISS instruments including CSA bubble detectors, MOSFET, EVARM, Radi-N, Radi-N2; autonomous continuous CANS neutron spectrometer in development; SRAG tracking. | Neutrons contribute ~30% of total ISS exposure; exposure rises beyond the magnetosphere. | NASA-STD-3001: <600 mSv career effective dose (all ages/sexes; ~3% mean cancer mortality risk); <250 mSv per SPE ([V1 4031]); <20 mSv nuclear tech ([V1 4032], interval truncated in source). |
| Immune biomarkers and WBC count | Altered immune responses, host-microorganism interactions, radiation. | ISS: HemoCue® rapid WBC test; blood, urine and dry/liquid saliva returned to Earth for cytokines, stress hormones and reactivated viruses (Artemis II uses dry-saliva pocket booklets). | Less efficient WBCs, altered cytokines/stress hormones, reactivation of latent viruses (e.g. shingles, cold sores). | Not reported. |
| Cardiac structure and VTE | Cardiovascular Adaptations, venous thromboembolism (VTE). | ISS: crew-operated Ultrasound-2; CIPHER 3D/radiofrequency ultrasound of neck (IJV), legs and spine; pre/post MRI/CT. | More spherical heart; stagnant or retrograde IJV blood flow posing clot risk. | Not reported. |
| Cardiorespiratory fitness / VO2max | Reduced cardiorespiratory and musculoskeletal fitness, EVA/egress readiness. | Direct or indirect in-mission VO2max testing (ISS data 2012–2022) and CIPHER Space Physiology assessments. | 12–21% of ISS crewmembers (2012–2022) showed ≥20% aerobic reduction at in-flight time points. | Microgravity EVA VO2max ≥32.9 ml/(min/kg) ([V1 4001]); ≥20% loss linked to simulated EVA/egress decrements. |
| Microbiome and habitat microbial load | Host-microorganism interactions, Veggie food safety. | Crew fecal/saliva/skin samples; ISS and Veggie exterior swabs plus drinking water slides every ~4 months, incubated 5 days at ambient temperature by crew, returned to Earth. | Skin/gut microbiome shifts; swabs grow common microbes (Penicillium, Staphylococcus epidermidis). | Microbial growth alone triggers no action; isolating known pathogens triggers ground-directed removal and resampling. |
| Atmospheric toxicology / SMACs | Hostile/closed environments, spaceflight toxicology (off-gassing, leaks, pyrolysis, propellants, human metabolism). | Spacecraft atmospheric contaminant monitoring systems. | Possible toxin buildup in closed loops. | Exceeding Spacecraft Maximum Allowable Concentrations (SMACs) triggers PPE, surface cleaning and treatment (exact ppm tables not in excerpts). |
| Sensorimotor and vestibular function | Altered sensorimotor and vestibular function, dynamic load injury. | Pre/post balance, gait, capsule egress and suited walk tests (Artemis II, CIPHER Egress Fitness); in-flight neuro-vestibular head/eye/body tracking (CIPHER). | Most experience SMS; balance, gait and hand-eye decrements after transitions require readaptation. | Post-flight fitness-for-duty egress benchmarks under validation in CIPHER Egress Fitness. |

**Cardiovascular, eye and musculoskeletal indicators** show how ISS monitoring splits between onboard screening and imaging on the ground. Crewmembers trained before flight operate Ultrasound-2 and OCT cameras in orbit to track spherical heart remodeling, IJV stasis or retrograde flow (VTE risk), and changes at the back of the eye. MRIs, CTs and 3D qCT bone scans happen only before and after flight. On monthly bone loss, NASA sources differ slightly: the Gravity Fields brief says 1–1.5% per month in weight-bearing bones, the Spinal Health summary about 1% per month without precautions. Numeric operational thresholds exist mainly for aerobic capacity (≥32.9 ml/(min/kg) microgravity EVA VO2max under [V1 4001], with 12–21% of ISS crew from 2012–2022 showing a ≥20% in-flight drop) and for pre-flight EVA strength from Fitness for Mission Task (FMT) benchmarks.

**Radiation, toxicology and immune indicators** rely on tighter engineering standards plus assays done back on Earth. NASA-STD-3001 caps lifetime spaceflight effective dose at <600 mSv for all ages and sexes (about 3% mean cancer mortality risk), limits design-reference solar particle events ([V1 4031]) to <250 mSv, and limits nuclear technologies ([V1 4032]) to <20 mSv (the time interval after "per" is truncated in the excerpt). Because neutrons are about 30% of ISS exposure, Canadian instruments such as bubble detectors and the upcoming continuous, autonomous CANS spectrometer target neutron dosimetry. Onboard immune testing is mainly HemoCue® white blood cell counts; cytokines, stress hormones and reactivated viruses still require returning blood (within 37 hours at room temperature in one 10-astronaut study), urine, saliva and 5-day incubated Veggie swab slides to Earth.

Primary NASA documentation **does not give routine measurement protocols or numeric intervention cutoffs** for blood glucose, body temperature, heart rate, blood pressure, body mass, sleep hours, mood scores, cognitive batteries, or OCT/tonometry. Continuous wearable vital-sign monitoring via the Bio-Monitor / Astroskin smart shirt is documented in a commercial vendor blog (Hexoskin, featuring CSA astronaut David Saint-Jacques) rather than in agency technical briefs. ExMC's integrated blood analyzer (cytometry, light-level hemoglobin, and nanostrips for unspecified analytes) is still in development for missions beyond LEO.

## 3. Medical hardware and software

On the ISS, medical hardware and software sit in the **Crew Health Care System (CHeCS)** rack, which supports primary, secondary and tertiary care. Under NASA-STD-3001, [V1 3004] replaced the legacy "Levels of Care pyramid" and 14-day mission boundary, tailoring onboard hardware, software, consumables and training to vehicle, distance from Earth, time to definitive care, and required autonomy.

| System category | ISS today (LEO) | Planned for Artemis (Moon) and Mars / deep space | Scope and notes |
|---|---|---|---|
| Medical restraint, airway and emergency packs | Crew Medical Restraint System (CMRS: spinal stabilization, patient transport, electrical isolation for defibrillation); Respiratory Support Pack (RSP); Crew Contamination Protection Kit (CCPK: eyewash); CHeCS airway hardware giving 99% CMO airway success vs. 50% with endotracheal tube; 9 redesigned MKR packs (replacing legacy ALSP, AMP and HASP). | Orion medical system scoped via the Accepted Medical Condition List (AMCL); lunar-like mid-level requirements drafted; medical and exercise accommodations in small pressurized rovers remain an area of "extensive unknowns". | NASA-STD-3001 dropped short- vs. long-duration kit labels in favor of mission-specific condition lists. |
| Diagnostics and imaging | Ultrasound-2 (cardiac, IJV/VTE, neck/leg/spine, eye); OCT cameras and eye tonometry; HemoCue® (tested on ISS for Earth-lab-accurate WBC counts); Tempus Pro telemedicine device (vital signs and medical imaging). | Integrated blood analyzer and vital-signs sensor (cytometry, light-level hemoglobin, nanostrip analytes); IVGEN compact sterile water purifier for IV fluids; Raman spectrometer with automated indexing for drug quality checks. | Moves care away from Earth-returned samples and heavy pre-mixed IV fluid bags. |
| Wearables and continuous monitors | Bio-Monitor / Astroskin smart shirt (Hexoskin vendor blog says available to ISS partners for 5 years once operational). | ARCHeR wrist actigraphy device (Artemis II: activity, motion, sleep patterns and light exposure before, during and after flight). | Primary NASA sources don't give sampling rates or clinical rules for Bio-Monitor. |
| Exercise hardware | Advanced Resistive Exercise Device (ARED) and ISS treadmill (T2). | Compact non-treadmill setups evaluated under Zero T2; pressurized rover combined aerobic/resistive ergometer (disassembly <5 min; HS6032 stages up to 50 W, 75/100 W, or 100/150 W). | Treadmills need too much mass, volume and power for deep-space spacecraft and rovers. |
| Radiation dosimeters | ISS instruments including CSA bubble detectors, MOSFET, EVARM, Radi-N and Radi-N2. | Canadian Active Neutron Spectrometer (CANS): compact, autonomous, continuous neutron detector ($5.5M CSA contract to Bubble Technology Industries). | Automates continuous monitoring of the ~30% neutron fraction. |
| Medical software and decision support | ESA EveryWear app on ISS; Medical Consumables Tracking (MCT) near-field RFID locker system (~500 tags, encrypted anonymized transmission to ground); MCC real-time telemetry. | AMOS (pre-flight/just-in-time training and autonomous guidance, currently kidney and bladder ultrasound modules); Medical Decision Support System / CDSS; systems tools (IMM, MEDPRAT, TSETS, IMPACT 1.0 Evidence Library). | MCT ran on ISS past its design life; an ESA EveryWear image caption calls an unspecified workflow "cumbersome" (context truncated). |

Under NASA-STD-3001 ([V1 3005]), crews must receive medical care training, and all astronauts get basic emergency medical response training. On the ISS, the Crew Medical Officer (CMO) performs interventions such as securing airways (99% success with CHeCS airway hardware vs. 50% with endotracheal intubation in 2009–2011 reports), eye pressure checks and Ultrasound-2 imaging, and forms diagnoses in simulated scenarios using Tempus Pro. NASA's medical operations overview notes that full ISS CMO role definitions and credentialing rules are not published there. Under [V1 3004], medical knowledge and tasks may be spread across crewmembers, medical devices, artificial intelligence and robotic systems.

## 4. Medications and medical supplies

Flight formularies are built around each crewmember's needs, clinical practice guidelines, flight surgeon expertise, historical usage reviews, and probabilistic risk assessment (PRA) tools. The ISS medical kit is described as basic and is restocked before labeled expiration dates; long exploration missions remove resupply and challenge drug stability.

| Aspect | Current ISS / LEO practice and findings | Exploration constraints (Artemis / Mars) and gaps |
|---|---|---|
| Kit structure and formulary | 2011 Medical Kit Redesign grouped 9 packs into: Non-Emergency Medications (Convenience Medications Pack CMP for high-use items, Oral Medications Pack OMP, Topical and Injectable Medications Pack TIMP), Non-Emergency Hardware (MDP, MTP, MSP, ISP, PEP), and Emergency Medication/Hardware, keeping CMRS, RSP and CCPK. JSC Pharmacy counted 107 medications in the ISS formulary (2013–2016). | Orion medical kit scoped via the AMCL process; short- vs. long-duration kit labels removed in NASA-STD-3001. |
| Storage, labeling and inventory | Documented via Task Performance Sheets (TPS) and kit photography; MCT tested near-field RFID locker inventory (~500 tags) sending encrypted, anonymized, time-stamped usage telemetry to ground. | FDA rules cap repackaged drugs at a 1-year expiration; counting pre-flight packing time, only 16% of ISS kit medications have ≥2 years of shelf life left in flight. |
| Authorization and ground consultation | Crew report medication use to flight surgeons in weekly PMCs; the 2017 Dose Tracker study actively logged use. | Formal rules on which medications crew may self-administer vs. which need CMO action or flight-surgeon authorization are not in the sources. |
| Usage and clinical effectiveness | Shuttle (Putcha et al., 1999; 79 missions, 219 reports): 94% of crew used meds, 85% of doses had no side effects, 80–90% perceived effective (day-1 ineffectiveness highest; 13 meds had anecdotal low efficacy, e.g. zolpidem, promethazine, oxymetazoline, aspirin, pseudoephedrine, flurazepam, temazepam). ISS: 20 Expeditions averaged 12.6 documented doses per crewmember per mission vs. Dose Tracker's 453 uses per crewmember (~4/week) over 5–6 months; sleep aids used 10x more in spaceflight. | Underreporting in passive PMC documentation vs. active tracking complicates provisioning. Physiological changes (altered liver blood flow/enzymes, gastric emptying, faster/variable intestinal transit, and renal clearance shifts in head-down bedrest) affect how drugs behave in the body. |
| Stability and shelf life | No poor clinical outcomes in LEO because drugs are restocked before expiration. But Du et al. (2011; 35 meds, checked at 14, 353, 596 and 880 days) found more active-ingredient failures in space than in JSC controls (only 27% of solid formulations kept <10% loss at 880 days, though most lost <20% and met USP dissolution). Wotring (2016; 550 days on ISS) found all tested meds within USP 90–110% active ingredient except melatonin (11 months expired), with impurities in aspirin, ibuprofen, loratadine, modafinil and zolpidem. | The DoD/FDA Shelf Life Extension Program (SLEP) extended 88% of lots (2,650/3,005) by an average of 66 months on Earth, but only 7 SLEP-tested drugs are on the ISS formulary, and ciprofloxacin, phenytoin, promethazine and acetaminophen degraded in flight despite SLEP stability. Liquids/biologics (nitroglycerin, eye drops, liquid antibiotics, insulin) are unstable; NSRL radiation tests caused small active-ingredient and physical changes. |

## 5. Behavioral health

NASA's Human Factors and Behavioral Performance (HFBP) element researches psychological adaptation, team dynamics, sleep and cognitive workload across ISS missions and long ground analogs. Operational conferences are written into NASA-STD-3001, but several routine ISS psychological tools are not detailed in the sources.

| Monitoring mechanism | Current ISS / LEO and Artemis | Changes under deep-space communication delays |
|---|---|---|
| Private Psychological Conferences (PPCs) and Private Medical Conferences (PMCs) | Required by NASA-STD-3001; weekly PMCs connect astronauts with flight surgeons (duration truncated in source); PPCs are scheduled/notified via personal computing devices for confidential psychological check-ins. | Exact PPC schedule/duration not stated. With up to 20 min one-way delay to Mars, real-time therapy with the ground is impossible, so crews depend more on autonomy and private personal time. |
| Questionnaires, journals and cognitive batteries | Artemis II ARCHeR: pre- and post-mission behavioral surveys plus continuous wrist actigraphy. CIPHER Spatial Cognition: in-flight brain function tests, robotic system interaction, pre/post MRIs. LSAH studies track 6-month ISS cognitive performance. Space Gardening: crew mood/engagement surveys 2–3x per month-long crop cycle (7 of 24 target completed; 0 saw the work as meaningless). | Operational ISS questionnaire names, structured psychological journal protocols, and named cognitive test batteries (such as WinSCAT or Cognition) are not in the sources. |
| Ground analog validation | HFBP simulates confinement, delayed communications (HERA tests up to 5-minute delays each way) and team cohesion in HERA (650 sq ft), CHAPEA (1,700 sq ft, 4 crew, 378-day Mars Mission 2) and Antarctic stations. | Tests asynchronous behavioral support, schedule/workload pacing, and set relaxation periods before multi-year Mars missions. |

## 6. Autonomy far from Earth

More distance removes the real-time ground troubleshooting that LEO operations rely on. Even after an average of 300 hours of pre-launch simulator training, ISS astronauts routinely rely on MCC specialists when hardware or medical problems occur.

| Parameter | ISS / LEO | Artemis / Moon | Mars / deep space |
|---|---|---|---|
| Distance and transit time | ~250 miles altitude | ~3-day transit | ~140 million miles average; ~3-year round trip |
| One-way signal delay | Near real-time | ~1.3 seconds | Up to 20 minutes (HERA tests up to 5 min) |
| Communication bandwidth | Not reported | Not reported | Not reported |
| Medical autonomy | Ground-reliant care and telemedicine; resupply and emergency return available | Transitional autonomy; Orion AMCL; autonomous post-landing lunar surface egress | Progressive Earth-independent medical operations (EIMO in NASA AI work); no resupply or evacuation |

ExMC defines autonomous deep-space medical capability as the gradual move of medical care and decision making from Earth to space-based assets, validated step by step across ground analogs, ISS demonstrations, lunar orbit/surface missions and Mars systems. Capabilities in development:

- Medical Decision Support Systems (CDSS) and probabilistic trade/risk tools (IMM, MEDPRAT, TSETS, IMPACT 1.0 Evidence Library)
- AMOS, a modular autonomous procedure-guidance and training platform (currently kidney and urinary bladder ultrasound modules)
- tasks shared across crew, AI and robotics ([V1 3004])
- compact point-of-care diagnostics (Tempus Pro, HemoCue®, integrated cytometry/nanostrip analyzer)
- in-situ IV fluid purification (IVGEN) and Raman drug-potency screening
- enhanced cardiovascular emergency training for Mars crews

## 7. Personal baselines

NASA tracks astronaut health from selection through retirement under OCHMO-STD-100.1A screening (including H. pylori testing at the first annual exam, with 4–6 week confirmatory retesting if positive) and annual medical recertification. Pre-, in- and post-flight clinical records are archived in LSAH, alongside a voluntary Former Astronaut Autopsy Program.

| Baseline framework | Data collected | Comparison method and mission context |
|---|---|---|
| Spaceflight Standard Measures and Artemis II Standard Measures | Blood, saliva and urine (nutrition, cardiovascular, immune); eye/brain MRIs; balance, SMS, vestibular, muscle and microbiome testing; surveys (Artemis II adds capsule egress and suited moonwalk tasks). | Started 2018 (>30 ISS astronauts), extended to Artemis II; minimal standard pre-, in- and post-flight metrics to tell normal adaptation from clinical problems. |
| CIPHER (14 integrated studies) | Eye exams/venous flow/MRIs (ISAFE), 3D bone microarchitecture (TBone2), calcium isotopes (Bone Health), coronary MRI/CT/ultrasound, 3D spine qCT/MRI, telomeres, spatial cognition, muscle/VO2max. | Pre-, in- and post-flight tracking for up to 1 year in LEO to map multi-system trajectories beyond 6 months. |
| Brain Fluid Pressure and Altered Immunity | Brain, eye and neck vein pressures; blood, urine, CSF and saliva cytokines, stress hormones and reactivated viruses. | Compares post-flight pressures to each person's pre-flight baseline (SANS); compares 10 ISS astronauts (~6 months) with 10 age/gender-matched ground controls. |
| Individual genomics, omics and strength scaling | DNA, RNA, proteins and microbiome (Omics Archive); genetic variants (B-Complex, cancer risk); individual body weight plus DL/BP strength. | Pairs genetics with cumulative radiation dose for personal cancer risk; scales EVA strength targets to body weight, suit mass and gravity. |

In-mission trend tracking looks at deviations from each person's pre-flight baseline, for example crewmembers whose in-flight VO2max drops 20% or more below baseline ([V1 4001] analysis). **The statistical thresholds or anomaly rules flight surgeons use to intervene during flight are not in the sources.**

## 8. Countermeasures and self-care

| Domain | ISS / LEO today | Exploration plans and self-tracking tools |
|---|---|---|
| Exercise and orthostatic care | Routine ARED resistive and aerobic (treadmill/cycle) exercise to maintain bone, spine and VO2max ≥32.9 ml/(min/kg) ([V1 4001]); pre-landing fluid loading and lower-body compression garments to prevent fainting. (Daily exercise minutes not specified.) | Zero T2 tests keeping strength, bone and balance without a treadmill; rover ergometer designs meet HS6032 (50–150 W stages); 14-day bedrest tested alternating HIIT and continuous aerobic workouts. |
| Sleep and circadian health | ISS LED lighting mimics Earth light-dark cycles; schedules protect relaxation/self-care periods to prevent burnout; light and caffeine timing studied; sleep aids used 10x more than on the ground. | Artemis II ARCHeR tracks sleep, motion and light exposure via wrist actigraphy. |
| Nutrition and hydration | Pre-flight personal selection from >200 ISS food/drink items; sodium reduction; fresh produce on LEO cargo; hydration to reduce calcium kidney-stone risk. | Food Physiology tests shelf-stable diets rich in bioactives (fruits, vegetables, fish); B-Complex tests daily B vitamins (6 months pre, in flight, 30 days post) for SANS. Crew complete daily intake logs and weekly acceptability surveys. |
| Radiation protection | Partial protection from Earth's magnetosphere; SRAG dose surveillance against <600 mSv career and <250 mSv SPE limits. | Engineered shielding for Artemis, Gateway and Mars; NSRL screening of candidate radiation countermeasures. |
| Infection, EVA and engagement | Two-week pre-flight quarantine (Health Stabilization Program); oxygen pre-breathe protocols for DCS; Veggie gardening for sensory stimulation and psychological engagement. | Partial cabin depressurization and variable-pressure suits under evaluation (tradeoff: heavier, less dexterity/mobility, fatigue). Self-tracking tools include Dose Tracker and ESA's EveryWear app; **crew-facing real-time health feedback dashboards are not documented** in the sources. |

## 9. Data

Public NASA life-sciences repositories separate open anonymized research data from identifiable astronaut health records.

| Repository / program | Contents | Subject and mission scope | Access |
|---|---|---|---|
| NASA Open Science Data Repository (OSDR) | Human cellular, molecular and omics research datasets | Spaceflight and space-biology investigations | Open |
| NASA Life Sciences Portal (NLSP) / LSDA bedrest dataset | Anonymized individual-level human physiological data | Ground-based bedrest spaceflight-analog studies (not flight data; highlighted as the first open individual-level dataset in the Oct 2025 LSAH newsletter) | Open (direct download on NLSP) |
| Lifetime Surveillance of Astronaut Health (LSAH) | Longitudinal astronaut occupational exams, mission health metrics, Former Astronaut Autopsy Program records | Active and retired U.S. astronauts, short and long missions | Restricted; formal approved data requests only |
| HRP Biological Specimen Repository and Tissue Sharing Forum | Archived blood, urine, biosamples and radiation-exposed tissues | ISS crew biospecimens and SRE radiation studies | Restricted; approved investigator request |
| Space Radiation Environment Software | Space radiation environment modeling software | LEO and deep space | Restricted to authorized users |
| Spaceflight Standard Measures and Omics Archive | Multi-system physiological/behavioral baselines; DNA, RNA, protein and microbiome data | >30 ISS astronauts (2018+) and Artemis II crew | Research data banks; public vs. request-gated status not detailed |

Identifiable astronaut medical records, clinical care notes and raw medication usage logs are never publicly released; even operational RFID tracking (MCT) encrypts and anonymizes usage telemetry.

## 10. Gaps

NASA's HRP risk summaries, OCHMO technical briefs and partner reports document these open problems in autonomous health monitoring and deep-space medical care:

| Gap domain | Documented knowledge gaps and open problems |
|---|---|
| Earth-independent medical and rover systems | Deep-space crews lack real-time MCC support, resupply and evacuation; clinical decision-support systems are still in development; exercise and medical hardware requirements in small pressurized lunar/Mars rovers remain "extensive unknowns". |
| Drug shelf life and space pharmacology | Repackaging rules leave only 16% of ISS kit drugs with ≥2 years of shelf life; spaceflight speeds degradation even for drugs stable on Earth under SLEP; liquids and biologics (insulin, nitroglycerin, eye drops, liquid antibiotics) are vulnerable; changes to drug absorption, liver metabolism and kidney clearance in space are poorly understood. |
| SANS mechanisms and prevention | Cause and effect between fluid redistribution, intracranial/venous pressure, genetics and eye/brain remodeling, and validated countermeasures, are unresolved. |
| Multi-year (>6 month) trajectories | Unknown whether bone and muscle loss plateaus or speeds up after 6 months, whether bone calcium loss drives vascular calcification, whether dropping treadmills (Zero T2) hurts bone/balance, and how deconditioned crews manage unaided capsule egress on a planet. |
| Deep-space radiation biology and countermeasures | Beyond the magnetosphere, GCR/SPE/neutron (~30% of ISS exposure) risks to cancer, degenerative heart/eye disease and in-mission cognition remain uncertain, with no approved medical radiation countermeasures yet. |
| Immunity and microbes | Unclear whether higher illness risk comes from microbiome shifts, more virulent microbes, immune dysregulation or their interaction, and whether latent viral reactivation worsens on multi-year flights. |
| EVA, hypoxia and DCS trade-offs | Balancing partial cabin depressurization (mild hypoxia risk), oxygen pre-breathe demand, and heavier, less mobile variable-pressure suits is ongoing. |
| Multi-year food systems | Keeping food palatable, shelf-stable and nutrient-dense over multi-year missions without resupply, while limiting mass and volume, is open. |
| Behavioral health and latency | Long-term effects of isolation, 16 daily sunrises/sunsets and up to 20-minute delays on team cohesion and psychiatric health are not fully understood. |
| Small cohorts and analog limits | Flight studies have small samples; head-down bedrest analogs have small cohorts and can't reproduce radiation, workload, isolation and spaceflight stress at the same time. |

## References

### NASA

- NASA-STD-3001 Technical Brief OCHMO-TB-033: Spaceflight Experience and Medical Care, NASA OCHMO, 2023, https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-033-spaceflight-experience-medical-care.pdf
- NTRS 20240011265 (NASA-STD-3001 Technical Brief: Cognitive Workload and Levels of Care), NASA, 2024, https://ntrs.nasa.gov/api/citations/20240011265/downloads/12-10-24%2020240011265.pdf
- Crew Health Care System (CHeCS) and Medical Kit Redesign (NTRS 20110011351), NASA Space Life Sciences Directorate / Georgia Institute of Technology, 2011, https://ntrs.nasa.gov/api/citations/20110011351/downloads/20110011351.pdf
- CHeCS Airway Management Report (NTRS 20090021477), NASA, 2009, https://ntrs.nasa.gov/api/citations/20090021477/downloads/20090021477.pdf
- CHeCS Airway Management Report (NTRS 20110022379), NASA, 2011, https://ntrs.nasa.gov/api/citations/20110022379/downloads/20110022379.pdf?attachment=true
- Exploration Medical Capability (ExMC) Overview and Autonomous Medical Operations (AsMA), Lemery / NASA, 2023, https://ntrs.nasa.gov/api/citations/20230007860/downloads/AMRAC.final.Lemery.AsMA.pdf?attachment=true
- Using Systems Engineering to Translate Research into Action (ExMC), NASA HRP, 2020, https://ntrs.nasa.gov/api/citations/20200001308/downloads/20200001308.pdf
- Challenges, Considerations, and Opportunities for Exercise and Medical Accommodation Inside a Small Pressurized Rover, NASA, 2021, https://ntrs.nasa.gov/api/citations/20210021306/downloads/Challenges%20Considerations%20and%20Opportunities%20for%20Exercise%20and%20Medical%20Accommodation%20Inside%20a%20Small%20Pressurized%20Rover.pdf?attachment=true
- HRP-48036 Rev B: ExMC Evidence Library Methods, NASA, 2024, https://ntrs.nasa.gov/api/citations/20240004774/downloads/HRP-48036%20RevB_ExMC%20Evidence%20Library%20Methods.pdf
- AI for Medical Diagnosis and Treatment, NASA ExMC, 2024, https://ntrs.nasa.gov/api/citations/20240004315/downloads/AI%20for%20Medical%20Diagnosis%20and%20Treatment-Final.pdf
- NASA-STD-3001 Technical Brief OCHMO-TB-006 / OCHMO-MTB-012 Rev B: Pharmaceutical Care, NASA OCHMO, 2026 (Rev B dated 6 Jan 2026), https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-006-pharmaceuticals.pdf
- ISS Operational Medication Kit Shelf-Life Duration Study and SLEP Analysis (NTRS 20170000795), NASA / JSC Pharmacy (T. Bayuse et al., 2016 data), 2017, https://ntrs.nasa.gov/api/citations/20170000795/downloads/20170000795.pdf
- Spaceflight Pharmaceutical Use and Stability Evaluation (NTRS 20190034025), NASA, 2019, https://ntrs.nasa.gov/api/citations/20190034025/downloads/20190034025.pdf
- Medical Operations and Clinical Care, NASA, 2026, https://www.nasa.gov/reference/medical-operations-and-clinical-care/
- Laboratory of Countermeasures Development, NASA Ames Research Center, n.d., https://www.nasa.gov/ames/space-biosciences/laboratory-of-countermeasures-development/
- Pharmacotherapeutics Evidence Report, NASA, 2023, https://ntrs.nasa.gov/api/citations/20230018496/downloads/Pharm%20evidence%20report_12-20-23_FINAL.pdf?attachment=true
- Private Psychological and Medical Conferences Overview (NTRS 20150016966), NASA, 2015, https://ntrs.nasa.gov/api/citations/20150016966/downloads/20150016966.pdf
- NASA-STD-3001 Volume 1A Change 1 (historical), NASA, n.d., https://standards.nasa.gov/sites/default/files/standards/NASA/B/Historical/NASA-STD-3001-VOL-1A-Chg1-1.pdf
- Human Research Program Risks, NASA HRP, 2025–2026, https://www.nasa.gov/hrp/risks/
  - https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/
  - https://www.nasa.gov/reference/risk-of-altered-sensorimotor-and-vestibular-function/
  - https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/
  - https://www.nasa.gov/reference/risk-of-decompression-sickness/
  - https://www.nasa.gov/reference/risk-of-host-microorganism-interactions/
  - https://www.nasa.gov/reference/risk-of-hypoxia/
  - https://www.nasa.gov/reference/risk-of-inadequate-food-and-nutrition/
  - https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/
  - https://www.nasa.gov/reference/risk-of-inadequate-systems-operations-support/
  - https://www.nasa.gov/reference/risk-of-injury-from-dynamic-loads/
  - https://www.nasa.gov/reference/risk-of-radiation-induced-cancers/
- 5 Hazards of Human Spaceflight, NASA HRP, 2024–2026, https://www.nasa.gov/hrp/hazards/
  - https://www.nasa.gov/hrp/hazard-space-radiation/
  - https://www.nasa.gov/hrp/hazard-isolation-and-confinement/
  - https://www.nasa.gov/hrp/hazard-distance-from-earth/
  - https://www.nasa.gov/hrp/hazard-gravity-fields/
  - https://www.nasa.gov/hrp/hazard-hostile-closed-environments/
- Ongoing HRP Research, NASA HRP, 2023–2026, https://www.nasa.gov/hrp/ongoing-hrp-research/
  - https://www.nasa.gov/hrp/human-factors-and-behavioral-performance/
  - https://www.nasa.gov/hrp/human-health-countermeasures/
  - https://www.nasa.gov/hrp/radiation/
  - https://www.nasa.gov/hrp/research-operations-integration/
  - https://www.nasa.gov/reference/archer/
  - https://www.nasa.gov/reference/immune-biomarkers/
  - https://www.nasa.gov/reference/artemis-ii-standard-measures/
  - https://www.nasa.gov/reference/b-complex/
  - https://www.nasa.gov/reference/brain-fluid-pressure/
  - https://www.nasa.gov/reference/cipher/
  - https://www.nasa.gov/reference/zero-t2/
  - https://www.nasa.gov/missions/station/scientists-probe-how-long-term-spaceflight-alters-immunity/
  - https://www.nasa.gov/humans-in-space/how-does-spaceflight-change-food-appeal/
  - https://www.nasa.gov/missions/station/enhanced-diet-may-help-astronauts-adapt-to-spaceflight/
  - https://www.nasa.gov/reference/omics-archive/
  - https://www.nasa.gov/humans-in-space/can-space-gardening-help-astronauts-cope-with-isolation/
  - https://www.nasa.gov/missions/station/astronauts-spines-under-scrutiny/
  - https://www.nasa.gov/reference/tempus-pro/
  - https://www.nasa.gov/missions/station/researchers-put-space-garden-microbes-under-the-microscope/
- Lunar Latency and Private Psychological Conference Notification (NTRS 20200001341), NASA, 2020, https://ntrs.nasa.gov/api/citations/20200001341/downloads/20200001341.pdf?attachment=true
- Houston We Have a Podcast: Mental Health, NASA, n.d., https://www.nasa.gov/podcasts/houston-we-have-a-podcast/mental-health-with-shinedown/
- NASA Life Sciences Portal (NLSP): Human Research Open-Access Datasets, NASA, n.d., https://www.nasa.gov/hrp/nlsp/
- LSAH Newsletter, Vol. 30, Issue 2, NASA Johnson Space Center, 2025, https://ntrs.nasa.gov/api/citations/20250009985/downloads/LSAH_Newsletter_2025_Vol30_Issue2_FINAL_101725.pdf (bedrest dataset: https://nlsp.nasa.gov/view/lsdapub/lsda_mission/6eaf1654-72d4-5d71-a9dd-a02e674c6473)
- NASA HRP Use of AI Technology to Mitigate Risk, NASA, 2026, https://ntrs.nasa.gov/api/citations/20260001797/downloads/NASA%20HRP%20Use%20of%20AI%20Technology%20to%20Mitigate%20Risk.pdf
- NASA-STD-3001 Technical Brief: Radiation Protection (Rev B), NASA OCHMO, 2022, https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf
- NASA-STD-3001 Technical Brief OCHMO-TB-031: Exercise Overview, NASA OCHMO, 2023, https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-031-exercise-overview.pdf
- NASA-STD-3001 Guidance for Strength and Human Performance for Extraterrestrial EVA, NASA OCHMO, 2026, https://www.nasa.gov/wp-content/uploads/2026/07/guidance-for-strength-and-human-performance-on-extraterrestrial-surface-eva-07222026.pdf?emrc=4e222e
- NASA-STD-3001 Technical Brief OCHMO-TB-020: Radiation Protection, NASA OCHMO, 2025, https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-020-radiation-protection.pdf
- NASA-STD-3001 Technical Brief: Pharmaceuticals and Medications, NASA OCHMO, 2023, https://www.nasa.gov/wp-content/uploads/2023/03/pharmaceuticals-and-medications-tech-brief-ochmo.pdf

### Other space agencies

- Monitoring Radiation and Astronaut Health, Canadian Space Agency (CSA), 2026, https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp
- EveryWear App, European Space Agency (ESA), 2017, https://www.esa.int/ESA_Multimedia/Images/2017/09/EveryWear_app

### Peer-reviewed

No direct peer-reviewed journal links were in the retrieved sources. Studies discussed above (Putcha et al., 1999; Lyon et al., 2006; Du et al., 2011; Wotring, 2016; De Witt et al., 2018; Ryder et al., 2019; English et al., 2020; and 2024–2025 LSAH-linked papers) are cited through the NASA OCHMO technical briefs, NTRS reports and the 2025 LSAH newsletter listed above.

### Other

- Astronaut David Saint-Jacques Explains How the Astroskin Helps Keep an Eye on Astronauts' Vital Signs, Hexoskin (commercial vendor blog), n.d., https://hexoskin.com/blogs/news/astronaut-david-saint-jacques-explains
