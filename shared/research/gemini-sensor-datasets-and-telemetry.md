# Astronaut Health Monitoring Sensor Datasets and Telemetry Sources

> **Source:** research report generated with Gemini on 2026-11-14, added by zt.
> Not yet checked by the team. Verify links, numbers and access rules before relying on them.
> Add a dataset to [sources.md](../sources.md) once we actually use it.

## Summary

To simulate a full-stack astronaut health monitoring application with real plug-in data, combine two complementary layers of open sources:

1. **Public NASA telemetry and clinical repositories** for spacecraft environments, radiation, and episodic crew biomarkers.
2. **Open terrestrial physiological and space-analog datasets** for continuous, high-frequency wearable waveforms.

NASA provides direct programmatic access to live International Space Station (ISS) life-support streams, time-series radiation dosimetry APIs, habitat comparison tables, bedrest analog archives, and processed commercial astronaut blood and urine assays. However, **no public NASA portal offers open downloads of raw, continuous human wearable telemetry** (such as raw in-flight ECG, photoplethysmography, or continuous pulse oximetry waveforms), because individual astronaut health data are privacy-restricted and require formal Institutional Review Board (IRB) approval.

The fastest way to populate every sensor channel in the app:

- **Environment and dosimetry:** NASA's Lightstreamer feed (ISSLIVE), the Open Science Data Repository (OSDR) RadLab API, the OSDR Environmental Data Application (EDA), and the NASA Radiation Data Portal supply native time series that can drive real-time alerts and circadian clocks.
- **Continuous human biometrics:** PhysioNet's wrist-wearable stress and exercise dataset, PhysioNet's tilt-table cardiovascular dataset, UCI's bioimpedance and ECG activity archive, and the MultiPhysio-HRC multimodal workload archive supply plug-and-play `.csv` files and signal features ready for microgravity calibration.

## Available NASA telemetry, radiation and biomedical data sources

NASA distributes spaceflight telemetry, radiation logs, biomedical study tables, and spacesuit engineering thresholds across eight platforms rather than a single API. Knowing which portals offer immediate downloads or live streams, versus multi-month controlled-access queues or PDF engineering bounds, prevents wasted integration effort.

| NASA source and URL | Sensor and measurement domains | Data formats and access methods | Access tier and lead time |
|---|---|---|---|
| NASA ISSLive! public feed (http://push.lightstreamer.com, adapter ISSLIVE; demo https://demos.lightstreamer.com/ISSLive/) | Real-time ISS cabin pressure, temperature, ppO₂, ppCO₂, water recovery tanks, O₂ production, airlock pressure, EVA suit supply, orbital position/eclipse | Live push stream (TimeStamp, Value); JS client and open dashboards (https://github.com/ISS-Mimic/Mimic) | Fully open; live streaming, no authentication |
| NASA OSDR RadLab Data API (https://visualization.osdr.nasa.gov/radlab/gui/data-api/) | ISS and partner spacecraft ionizing radiation: Timepix/REM, DosTel, TEPC, Lidal, TriTel absorbed dose rate and particle flux | HTTP GET REST API returning `.tsv`; filterable by spacecraft, module, instrument and ISO 8601 timestamp | Fully open; immediate historical time-series queries |
| NASA OSDR Environmental Data Application (https://visualization.osdr.nasa.gov/eda/) | Flight vs. ground-matched ISS temperature (°C), relative humidity (%), CO₂, and GCR/SAA/total/accumulated radiation | Interactive charts with downloadable raw and summary data via the Data Tables tab | Fully open; direct browser download |
| NASA Radiation Data Portal — ARMAS / NAIRAS (https://data.nas.nasa.gov/helio/portals/rdp/) | High-altitude, balloon and suborbital ARMAS micro-dosimetry fused with NAIRAS and GOES soft X-ray/proton flux (RADIAN cube) | HTTP GET REST API with downloadable API specification and Python query script | Fully open; immediate programmatic download |
| NASA OSDR main repository and AWS Open Data (https://osdr.nasa.gov/bio/repo; https://registry.opendata.aws/nasa-osdr/) | 649 studies (as of Nov 2026): Inspiration4 blood/urine/serum panels, SANS ICP:IOP and ERG models, rodent behavior, Cosmos 2044 CR/T hardware | `.txt`, `.tsv`, `.csv`, `.xlsx`, `.zip`, `.fasta`, `.fastq`; AWS CLI (`aws s3 ls --no-sign-request s3://nasa-osdr/`, us-west-2) | Hybrid: processed clinical/phenotypic data open; raw human sequencing controlled (IRB + DAC review) |
| NASA Life Sciences Portal — NLSP (https://www.nasa.gov/hrp/nlsp/; guidelines https://nlsp.nasa.gov/data-request-guidelines) | UTMB Bedrest Campaigns 1 and 3, UTMB 70-Day Bedrest Exercise and Performance, Standard Measures, LSDA research and LSAH clinical archives | Direct open-access datasets and medical test PDF catalogs; archival data extracts via request form | Tiered: pooled and UTMB open sets immediate; de-identified ~13 months; identifiable ~25 months (IRB + 90-day purge rule) |
| NASA Earthdata ISS tools (https://www.earthdata.nasa.gov/data/platforms/space-based-platforms/iss/data-access-tools) | ISS Earth-observation instruments plus EMIT L1B Corrected Spacecraft Attitude and Ephemeris V001 | NASA Earthdata search/download tools and Python/R prep scripts | Open via Earthdata tools; attitude/ephemeris auxiliary only |
| NASA-STD-3001 Vol 2 and NTRS EVA reports (https://www.nasa.gov/reference/11-0-spacesuits-vol-2/, https://ntrs.nasa.gov/api/citations/20160003500/downloads/20160003500.pdf) | EVA metabolic rate (3,000 Btu/hr test limit), hypercapnia/radiation exposure monitoring, LCVG cooling, suit injury tracking | Open PDF standards and technical papers (benchmark thresholds, not time-series datasets) | Fully open engineering reference benchmarks |

## Real-time habitat, life support and EVA telemetry via NASA ISSLive!

NASA broadcasts a public subset of the more than 100,000 telemetry parameters collected by ISS Mission Control Centers over a live Lightstreamer push endpoint (http://push.lightstreamer.com, stream ISSLIVE), originally developed under the ISSlive! project. Developers can plug into the feed using open client code such as the ISS-Mimic/Mimic GitHub repository (https://github.com/ISS-Mimic/Mimic) and the Node.js Lightstreamer client Gist (https://gist.github.com/connorjak/9f853bb83559976e12c9e38811c3c0af), which subscribe to individual parameter IDs and capture (TimeStamp, Value) updates in real time. Independent public mission consoles, including https://issmonitor.com/, https://iss.stefanmaurer.net/ and https://www.telemetry.space/, expose the live schemas and typical operating bands.

Because cabin environment directly drives human physiology, ISSLive! is a good **environmental context layer** for an astronaut health dashboard. According to independent dashboards reading the public stream, Environmental Control and Life Support System (ECLSS) channels cover:

- US Lab (Destiny) and Node 3 (Tranquility) **cabin pressure**: nominal sea-level ~760 mmHg / 14.7 psi; representative 24-hour range 752.5–759.7 mmHg
- **Cabin temperature**: nominal ~22 °C / 72 °F, crew-adjustable between roughly 18–27 °C / 64–81 °F; representative 24-hour range 22.6–24.5 °C
- **ppO₂** (torr) and **ppCO₂** (torr, reported as station mean, Destiny and Tranquility channels)
- **Oxygen Generator System** status and production rate (lb/day)
- **Water Recovery System** levels (representative 24-hour ranges: urine tank 5.0–60.0%, waste water 18.8–58.2%, clean water 46.7–95.0%)

Under the EVA and ETHOS telemetry disciplines on the Lightstreamer demo (https://demos.lightstreamer.com/ISSLive/) and public viewers, the stream also surfaces AIRLOCK000001 through AIRLOCK000049 (including Crewlock Pressure, configured for unlimited updates per second), plus Mobility 2 suit supply voltage/current and umbilical voltage/current.

**Orbital dynamics** on the same stream provide an external clock for circadian and mechanical disturbances: latitude, longitude, velocity (~7.65 km/s), altitude (~400–420 km nominal; representative 24-hour range 413.6–438.6 km, with slow drag decay and sharp reboost steps), total station mass (~420,000 kg nominal; representative readout 485,727 kg, shifting in steps at dockings and undockings), attitude rates (Rate X/Y/Z in °/s), Control Moment Gyroscope (CMG) speeds and momentum percentage, Solar Beta Angle, and Eclipse Status. Third-party consoles report an orbital period of 92.8 minutes (about 15.5 orbits every 24 hours: 1,440 / 92.8 = 15.52), a realistic driver for orbital light-dark circadian stress. For historical attitude and ephemeris only, NASA Earthdata's ISS tools page also hosts EMIT L1B Corrected Spacecraft Attitude and Ephemeris V001.

## Space radiation dosimetry APIs and environmental feeds

Ionizing radiation telemetry can be integrated through NASA's radiation portals without institutional approvals.

**NASA OSDR RadLab Data API** (https://visualization.osdr.nasa.gov/radlab/gui/data-api/) serves historical dosimetry recorded inside the ISS and companion spacecraft. HTTP GET queries filter by:

- case-sensitive ISO 8601 timestamp
- spacecraft (ISS, TriTel)
- module (Cupola, JPM, plus Node 1 sample sets like REM-NOD1SSC22-pre, https://visualization.osdr.nasa.gov/radlab/kb/REM-NOD1SSC22-pre)
- instrument (REM, DosTel), case-sensitive `instrument_id` (such as REM-Lid), and `instrument_family` (Timepix, TEPC, Lidal|DosTel)

It returns `.tsv` columns including `absorbed_dose_rate` and `flux`.

Data presented by NASA's Radiation Environment Monitor (REM) team at the 23rd Workshop on Radiation Monitoring for the ISS (WRMISS, September 2018; https://wrmiss.org/workshops/twentythird/Zeitlin_S6.pdf) show why a simulator should **model radiation by location and include hardware dropouts**:

- Timepix-based REMs aboard the ISS since October 2012 (frames at 0.1–4 s shutter times via Station Support Computers) recorded different daily silicon absorbed dose rates across modules.
- Detector RADB: 225.91 ± 15.54 µGy/d, split into 121.16 ± 2.08 µGy/d Galactic Cosmic Radiation (GCR, 53.6%) and 104.75 ± 15.89 µGy/d South Atlantic Anomaly (SAA, 46.4%).
- REM5001 J02: 272.52 ± 21.23 µGy/d (112.71 ± 2.54 µGy/d GCR and 159.81 ± 22.74 µGy/d SAA).
- GCR differed by ~7.0% between the two sensors, while SAA dose differed by ~52.6%, reflecting local shielding.
- REM telemetry had frequent weekend and computer-reboot gaps. Uptime rose from ~60% to 98% after task-scheduler updates, and ~99% of missing intervals were backfilled using 3D/2D longitude-latitude-altitude-time histograms. This is a realistic fault pattern for testing sensor-loss alerts.

For higher-altitude or deep-space reference profiles, Timepix is also documented on ESA's Proba-V SATRAM payload at 820 km (300 µm silicon sensor spanning six orders of magnitude in µGy/h, https://pos.sissa.it/194/003/pdf) and on NASA's exploration-class HERA system (https://pubmed.ncbi.nlm.nih.gov/37945090/).

Two more NASA environmental portals:

- **NASA OSDR Environmental Data Application** (https://visualization.osdr.nasa.gov/eda/): matched flight vs. ground-control curves for ISS temperature (°C), relative humidity (%), CO₂, and radiation (GCR, SAA, total, accumulated dose), with raw and summary tables downloadable from the Data Tables tab. Biological experiment radiation datasets for ISS and BION-M1 are indexed via GeneLab (https://genelab-data.ndc.nasa.gov/genelab/search_studies).
- **NASA Radiation Data Portal** at NASA Ames (https://data.nas.nasa.gov/helio/portals/rdp/): atmospheric, balloon and suborbital profiles merging ARMAS micro-dosimeter tracks with the NAIRAS model and GOES soft X-ray and proton flux into the RADIAN radiation weather cube, via an HTTP GET API with documentation and a Python query script.

## Astronaut clinical panels, multi-omics and bedrest analogs in OSDR and NLSP

The **NASA Open Science Data Repository (OSDR)** (https://osdr.nasa.gov/bio/repo), managed at NASA Ames, holds omics datasets (GLDS-XXX) and physiological, phenotypic, behavioral and bioimaging data (LSDS-XXX) across 649 studies as of November 2026. Files can be browsed on the web portal or pulled in bulk without an AWS account from the AWS Open Data Registry (https://registry.opendata.aws/nasa-osdr/) with `aws s3 ls --no-sign-request s3://nasa-osdr/` in region us-west-2.

The commercial **Inspiration4** archive (https://www.nasa.gov/osdr-latest-news-i4-mission-datasets/) is the richest open longitudinal human spaceflight dataset: four civilian crewmembers, a 3-day mission, 2,911 total collections (1,194 processed samples, 22 assays) across pre-flight (L-92, L-44, L-3), in-flight (FD1–FD3) and post-flight (R+1, R+45, R+82, R+194) timepoints. **None of the ten Inspiration4 OSDR studies contain continuous wearable sensor streams.** They hold laboratory blood, serum, urine, tissue and microbiome measurements. Processed tables are open; raw human genetic sequence files need Data Access Committee (DAC) and IRB approval (https://www.nasa.gov/reference/osdr-tutorials-requesting-controlled-access-datasets/).

| OSDR study and URL | Physiological and biospecimen measurements | Instruments / analytical platforms | Downloadable formats and status |
|---|---|---|---|
| OSD-569 (https://osdr.nasa.gov/bio/repo/data/studies/OSD-569) | Whole-blood Complete Blood Count (CBC) across L-92 to R+194, RNA-Seq/m6A, WGS, 9-gene clonal hematopoiesis | Sysmex XN Analyzer (flow cytometry, DC detection, SLS hemoglobin), Oxford Nanopore PromethION, Element AVITI, NovaSeq 6000 | Open tabular `.txt` (`A_OSD-569_complete-blood-count...txt`), MultiQC/pycoQC reports; raw `.fastq`/`.fast5` controlled |
| OSD-575 (https://osdr.nasa.gov/bio/repo/data/studies/OSD-575) | Blood serum Comprehensive Metabolic Panel (CMP), 71 immune cytokines (HD71), 9 cardiovascular biomarkers (HDCVD9), NULISA-seq panel (124 cytokines/chemokines + 80 other immune proteins in NPQ units) | Beckman Coulter AU5800, Eve Technologies Discovery Arrays, Alamar Biosciences NULISA-seq | Open `.txt` sample/assay tables, `.zip` ISA metadata, `.pdf` method references |
| OSD-656 (https://osdr.nasa.gov/bio/repo/data/studies/OSD-656) | Urine: 203 inflammatory, cytokine and chemokine proteins (NPQ units) across L-92 to R+82 | Alamar Biosciences NULISAseq 200plex v1 Inflammation Panel | Open `.csv` (`LSDS-64_Multiplex_urine.immune.AlamarPanel_TRANSFORMED.csv`), `.xlsx`, `.txt`, `.zip` |
| OSD-571 (https://osdr.nasa.gov/bio/repo/data/studies/OSD-571) | Blood plasma proteomics, metabolomics/lipidomics, cfDNA, cfRNA across L-92 to R+82 | Bruker timsTOF Pro / Pro-2, Thermo Q Exactive, Agilent 6550 Q-TOF, Element AVITI, Illumina | Tab-delimited `.txt` protein tables; `.fastq` sequencing (raw human sequences controlled) |
| OSD-570, OSD-574, OSD-687 (https://osdr.nasa.gov/bio/repo/data/studies/OSD-570 etc.) | PBMC snRNA-seq/snATAC-seq and V(D)J immune profiling (OSD-570); deltoid skin spatial transcriptomics + microbiome (OSD-574); T-cell histone modifications at R+194 (OSD-687) | 10X Genomics Chromium, BD Aria, NanoString GeoMx DSP (18,677 genes), Leica Bond, Illumina NovaSeq 6000 | Processed `.xlsx` expression tables (OSD-570), FastQC/MultiQC/README (OSD-574), `.txt`/`.zip` metadata; raw `.fastq` controlled |
| OSD-572, OSD-573, OSD-630 (https://osdr.nasa.gov/bio/repo/data/studies/OSD-572 etc.) | Skin/oral/nasal swabs from 10 body sites (OSD-572), Dragon capsule 9-surface/air swabs (OSD-573), gut stool metagenomics across L-92 to R+82 (OSD-630) | Illumina NovaSeq 6000 and NextSeq 2000, Qubit 4, BioAnalyzer 2100, TapeStation 2200 | `.tsv` pathway/taxonomy/coverage tables, `.txt`, `.zip`, `.fasta`, `.faa`, `.gff`, `.bam`, `.fastq.gz` |

Other specialized OSDR datasets released through 2026:

- **OSD-815 to OSD-818:** Spaceflight-Associated Neuro-ocular Syndrome (SANS) in an ex vivo human translaminar autonomous system, tracking intracranial-to-intraocular pressure (ICP:IOP), optic nerve tilt and electroretinography.
- **OSD-964:** BioSentinel deep-space radiation yeast biosensor measurements.
- **OSD-1018:** rat behavior and motor learning under space radiation and social isolation.
- **OSD-773:** ISS Rodent Habitat video behavior data.
- **OSDR Hardware Record 910** (https://osdr.nasa.gov/bio/repo/data/hardware/910): an eight-channel Circadian Rhythm/Temperature (CR/T) telemetry schema used on animal biosatellite flights (Cosmos 2044), tracking motor activity, heart rate, axillary temperature, and ankle/thigh/head skin and ambient temperatures.

The **NASA Life Sciences Portal** (https://www.nasa.gov/hrp/nlsp/) is the gateway to the Life Sciences Data Archive (LSDA) and Lifetime Surveillance of Astronaut Health (LSAH) for NASA Human Research Program (HRP) analog and clinical records:

- **Open now:** Human Research Open-Access Datasets for UTMB Bedrest Campaign 1, UTMB Bedrest Campaign 3 and UTMB 70-Day Bedrest Exercise and Performance Testing (head-down-tilt bedrest replicates microgravity fluid shifts), Standard Measures (baseline astronaut and analog crew health profiles), and downloadable LSAH medical test catalogs (Summarized List of Medical Tests, Detailed Description of Medical Tests).
- **Impractical for a hackathon:** pooled summary metrics are open, but de-identified individual records take ~13 months with scientific merit justification, and identifiable individual data need full NASA IRB and LSAH Advisory Board review (~25 months) plus erasure of computer-readable extracts within 90 days under OMB M-06-16 (https://nlsp.nasa.gov/data-request-guidelines).

## EVA spacesuit standards and engineering threshold benchmarks

Operational spacesuit biometric logs from ISS EVAs are not published as downloads, so EVA caution-and-warning modules should anchor alert thresholds in NASA-STD-3001 and open NASA Technical Reports Server (NTRS) test data.

**NASA-STD-3001 Volume 2, Section 11.0** (https://www.nasa.gov/reference/11-0-spacesuits-vol-2/) mandates continuous measurement and display of EVA Suited Metabolic Rate ([V2 11037], [V2 11038]), real-time suit radiation monitoring against short-term deterministic exposure limits (referencing Volume 1), hypercapnia (CO₂ retention) symptom monitoring if EVA frequency exceeds baseline experience, and tracking across prebreathe, leak checks and airlock/suitport depressurization.

Open NTRS papers with concrete physiological boundaries and system behaviors:

- **20160003500** (https://ntrs.nasa.gov/api/citations/20160003500/downloads/20160003500.pdf): Portable Life Support System (PLSS 2.0) human-in-the-loop (HITL) and Liquid Cooling and Ventilation Garment (RL-LCVG) testing up to 3,000 Btu/hr metabolic workload.
- **20170005909** (https://ntrs.nasa.gov/api/citations/20170005909/downloads/20170005909.pdf): Advanced Spacesuit caution-and-warning telemetry shared across EVA crewmembers.
- **20090007828** (https://ntrs.nasa.gov/citations/20090007828): Integrated Suit Test Series metabolic and subjective responses.
- **19800016192** (https://ntrs.nasa.gov/citations/19800016192): combined EVA/non-EVA radiation tracking.
- **20230015608** (https://ntrs.nasa.gov/citations/20230015608): EVA suit-related injury surveillance.
- **NASA TechPort Project 34465** (https://techport.nasa.gov/projects/34465): NASA's move from taped ISS ECG electrode setup to Commercial Off-The-Shelf (COTS) wearable biometric sensors.

## Commercial spaceflight, partner agencies and space analog datasets

**CSA Bio-Monitor / Astroskin smart shirt** (Canadian Space Agency, built by Carré Technologies) is the clearest peer-reviewed ISS wearable specification. According to a December 2025 *Aerospace Medicine and Human Performance* case report (https://www.researchgate.net/publication/398493845_Bio-Monitor_Detects_Reduced_Obstructive_Sleep_Apnea_and_Susceptibility_to_Arrhythmia_in_Spaceflight), the garment logged synchronized 48-hour recordings to flash memory at five timepoints during a 6-month ISS mission: continuous ECG, thoracic and abdominal respiratory inductance plethysmography (RIP), oxygen saturation / photoplethysmography (PPG), and activity. Useful edge cases for alerting logic:

- Mild pre-flight obstructive sleep apnea (apnea-hypopnea index 8.3/h) resolved completely in microgravity, then returned right after landing.
- Continuous ECG detected nocturnal supraventricular and ventricular ectopics, bigeminy, complete heart block, and QT prolongation after late-flight daytime modafinil and evening hypnotic medication.

CSA emphasizes open access for atmospheric satellites like SCISAT (https://www.asc-csa.gc.ca/eng/publications/drr-2022-2023.asp), but raw human Bio-Monitor waveforms are not publicly hosted.

**Commercial missions** (Inspiration4, MS-20, Axiom-1 to Axiom-3, Polaris Dawn) used COTS wearables integrated via TrialX's remote collection hub and linked with the Space Omics and Medical Atlas (SOMA, https://soma.weill.cornell.edu/). According to TrialX (https://trialx.com/space-health-research-wearable-devices/), missions used Garmin Fenix 6/7, Forerunner 945 and MARQ smartwatches, BioButton patches, Hexoskin shirts, Oura Ring, Polar H10 chest straps, Empatica E4 wristbands, Dexcom G6 Continuous Glucose Monitors (CGM), Butterfly iQ+ handheld ultrasound, and smart contact lenses. SOMA unifies metadata across NASA Twins, JAXA, Inspiration4, Axiom and Polaris Dawn, but raw wearable files from TrialX/Polaris Dawn are not open; only the Inspiration4 multi-omics and clinical files on OSDR are downloadable.

**Analog missions** (NEEMO, Mars500, AGBRESA, HI-SEAS, NASA's 378-day CHAPEA Mission 2): the main openly indexed physiological dataset is **NASA NEEMO**. Indexed in the National Library of Medicine (NLM) Dataset Catalog (https://datasetcatalog.nlm.nih.gov/searchResults?filters=agent%3ASerrador%252C%2520Jorge%2520M.&sort=rel&page=1&size=10) and hosted on Figshare, the record *Table_1_Human Adaptations to Multiday Saturation on NASA NEEMO* provides physiological signals from multi-day underwater saturation missions. Mars500, AGBRESA and CHAPEA are documented mainly through papers, OSDR publication summaries (https://science.nasa.gov/reference/osdr-publications-archive/) and NASA announcements, not open sensor dumps.

## Open terrestrial wearable and autonomic sensor datasets for continuous biometrics

These archives supply clean, high-frequency cardiac, respiratory, electrodermal, neuromuscular and cognitive-load time series on instruments matching those used in spaceflight research.

| Dataset and source URL | Sensors, channels and formats | Cohort and conditions | Astronaut health app mapping |
|---|---|---|---|
| PhysioNet Wearable Device Dataset v1.0.1 — STRESS (https://physionet.org/content/wearable-device-dataset/1.0.1/Wearable_Dataset/STRESS/; AWS `s3://physionet-open/wearable-device-dataset/1.0.1/`) | `TEMP.csv` (°C), `EDA.csv` (µS), `BVP.csv` (PPG), `ACC.csv` (3-axis, 1/64 g over [-2g, 2g]), `IBI.csv` (s), `HR.csv`, `tags.csv`, `subject-info.csv` | 36 healthy volunteers (18 V1 + 18 V2), acute cognitive stress and physical exercise protocols | Direct surrogate for wrist wearables (Empatica E4 modalities) during EVA exertion, stress and HRV tracking |
| PhysioNet Autonomic Aging Cardiovascular (https://physionet.org/content/autonomic-aging-cardiovascular/) | Tilt-table cardiovascular recordings via surface electrodes and pressure cuffs (physionet CLI / web download) | Supine-to-tilt autonomic assessment across healthy cohorts | Post-flight orthostatic intolerance and tilt-table / LBNP deconditioning simulation |
| UCI Activity Recognition Using Wearable Physiological Measurements (https://archive.ics.uci.edu/ml/datasets/Activity+recognition+using+wearable+physiological+measurements) | 4,480 instances (40 s windows), 533 features: ECG (174), Thoracic Electrical Bioimpedance / TEB (151), arm EDA (104), hand EDA (104) | 4 activity classes: neutral, emotional, mental (280 s), physical stair climbing (280 s) | Pre-computed ML features for thoracic fluid shifts (TEB) and mental vs. physical activity classification |
| MultiPhysio-HRC and StressID (https://arxiv.org/html/2510.00703v1) | MultiPhysio-HRC: EEG (0.5–40 Hz, 49–51 Hz notch), ECG/HRV, finger EDA, right trapezius EMG, chest RESP (0.03–5 Hz), facial/audio. StressID: 65 subjects, ECG, EDA, RESP | Cognitive tests, VR tasks and industrial human-robot collaboration, labeled with NASA-TLX, SAM, STAI-Y1, NARS | Crew cognitive workload, robotics teleoperation fatigue, respiratory rate, NASA-TLX alerting |
| MDPI Cognitive Load and HRV Dataset (https://www.mdpi.com/2076-3417/10/11/3843) | HRV features from RR intervals (mean HR, SDNN, RMSSD, etc.) paired with HEXACO personality facets | Public commercial-wearable cognitive load dataset | Individual HRV stress baselines and psychological resilience modeling |

**PhysioNet wearable-device-dataset (v1.0.1) is the simplest to parse.** Every time-series `.csv` (TEMP, EDA, BVP, ACC, HR) has the UTC session start timestamp in row 1 and the sample rate in Hz in row 2; `IBI.csv` records beat timestamps and durations in seconds. Download the whole 69.7 MB bundle with any of:

```bash
wget -r -N -c -np https://physionet.org/files/wearable-device-dataset/1.0.1/
```

```bash
physionet download wearable-device-dataset --version 1.0.1
```

```bash
aws s3 sync --no-sign-request s3://physionet-open/wearable-device-dataset/1.0.1/ DESTINATION
```

UCI's activity dataset gives 40-second windowed statistical features, not raw waveforms, so it suits a downstream machine-learning classifier better than plotting ECG traces. Newer studies such as OxWEARS (https://pubmed.ncbi.nlm.nih.gov/41461111/, December 2025) so far publish study protocols, not downloadable data.

## Architecture blueprint for combining datasets

Stitching spacecraft, radiation, clinical and terrestrial datasets into one monitoring tool means aligning sampling cadences, physical units and alert logic. Without calibration, terrestrial wearable recordings produce physically impossible artifacts in an orbital dashboard.

| App telemetry module | Recommended plug-in datasets | Calibration and schema alignment rule |
|---|---|---|
| Habitat and life support engine | NASA ISSLive! (ISSLIVE) + OSDR EDA (temperature, RH%, CO₂) | Stream or replay 752.5–759.7 mmHg pressure, ppO₂/ppCO₂, water tanks, and the 92.8 min orbital eclipse clock |
| Ionizing radiation tracker | NASA OSDR RadLab API (REM, DosTel, TEPC) + NASA ARMAS RDP API | Vary SAA dose spikes across modules (e.g. 104.75 vs. 159.81 µGy/d) and keep realistic telemetry dropouts |
| Continuous crew wearables | PhysioNet STRESS (BVP, EDA, TEMP, IBI, HR, ACC) + MultiPhysio-HRC (RESP, EMG, EEG) | Convert `ACC.csv` raw / 64 to g (±128 raw over [-2g, 2g]) and remove the 1 g static Earth gravity baseline |
| EVA and suit telemetry | PhysioNet exercise windows + NASA-STD-3001 Vol 2 + NTRS 20160003500 + AIRLOCK/Mobility 2 | Cap metabolic workload at 3,000 Btu/hr; alert on suit hypercapnia, short-term dose, or depressurization |
| Cardiovascular and fluid shifts | PhysioNet autonomic-aging-cardiovascular + UCI TEB + NLSP UTMB Bedrest + CSA Bio-Monitor findings | Anchor thoracic fluid shifts on bedrest/TEB baselines, suppress OSA frequency in flight, model post-landing orthostatic tilt drops |
| Clinical labs and biomarker panel | NASA OSDR Inspiration4 (OSD-569 CBC, OSD-575 CMP/cytokines, OSD-656 urine) | Ingest as discrete pre-, in- and post-flight lab snapshots, not high-frequency streams |

Three calibration steps make simulated telemetry behave like real orbital monitoring:

1. **Remove Earth's static gravity from terrestrial accelerometer streams.** In PhysioNet's `ACC.csv`, acceleration is in 1/64 g steps across [-2g, 2g] (-128 to +128 raw), so a still subject on the ground reads a constant ~1 g vector (~64 units). On the ISS, resting acceleration is near 0 g, rising only during resistive exercise, crew translation or reboosts. High-pass filter or subtract the static mean vector to avoid false activity or fall-detection alarms.
2. **Drive physiological state changes from NASA environmental telemetry.** Instead of running heart rate and breathing streams in isolation, couple them to station events. Syncing skin temperature (`TEMP.csv`, Hardware 910) to ISSLive!'s 92.8 min orbit and Eclipse Status models orbital circadian disruption; coupling AIRLOCK000001 depressurization or high ppCO₂ to exercise-window HR, chest RESP and 3,000 Btu/hr metabolic thresholds produces realistic EVA caution-and-warning behavior.
3. **Keep real sensor dropouts, artifacts and mixed time scales.** Real hardware drops out: ISS REM computer reboots needing histogram backfill, motion artifacts in wrist PPG, periodic 48-hour flash-memory downloads like CSA Bio-Monitor. Keeping missing-data gaps, mixed sampling rates (multi-Hz wearables next to discrete pre/post-flight panels from OSD-569 and OSD-575), and clinical anomalies such as medication-linked QT prolongation or ectopic beats tests the app's anomaly detection and fault handling properly.
