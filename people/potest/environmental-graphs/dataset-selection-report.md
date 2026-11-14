# Environmental logging dataset selection

**Selected dataset:** NASA Open Science Data Repository (OSDR), Environmental Data App (EDA), **RR‑23 ISS cabin telemetry**. Use the single `RR-23-telemetry_data.json` file as the source for the final cabin logger. It provides synchronized CO₂, temperature, and relative humidity, and it has the **most timestamps with all three cabin measurements** among the 24 downloaded EDA telemetry responses. RR‑23 flew on the SpaceX‑21 resupply mission. [RR‑23 telemetry endpoint](https://visualization.osdr.nasa.gov/eda/api/missions/RR-23/telemetry_data/) · [NASA mission overview](https://www.nasa.gov/ames/space-biosciences/rodent-research-23-spacex-21/) · [NASA EDA](https://visualization.osdr.nasa.gov/eda/)

## What the file contains

The archive response has **52,599 rows at distinct UTC timestamps**. At least one of the three ISS measurements is available at **48,472 timestamps**, and all three are available together at **43,393 timestamps**. The usual interval is one minute. The first and last complete readings are **December 12, 2020 at 21:53 UTC** and **January 15, 2021 at 00:20 UTC**, a span of just over 33 days. About **91.0%** of the expected one-minute slots across that interval contain all three measurements. The longest interval between successive valid CO₂ readings is **23 minutes**.

| Channel for the app | Unit | Valid UTC timestamps | Observed range |
| --- | --- | ---: | --- |
| `co2_iss` | ppm | 43,508 | 1,226–3,159 |
| `temperature_iss` | °C | 48,357 | 19.5–25.3 |
| `humidity_iss` | % RH | 48,357 | 35–62 |

The file also contains ground-control columns for the same quantities. Use the three `_iss` fields for cabin logging and preserve ground-control data in the source file. Temperature and humidity start before the first valid CO₂ measurement, so the app can exercise missing-channel behavior using the archived readings.

## Why RR‑23 was selected

The selection prioritizes the number of distinct timestamps with real cabin measurements that can appear together in a symptom report. File size, repeated rows, multiple instruments measuring the same quantity, and outdoor conditions do not add cabin measurement coverage.

| Candidate | Distinct timestamps with CO₂, temperature, and RH | What it offers |
| --- | ---: | --- |
| **ISS RR‑23** | **43,393** | Three cabin measurements, mostly at one-minute cadence. |
| ISS RR‑10 | 38,112 | Three cabin measurements. The API response has 86,206 rows, with repeated timestamps, and the CO₂ series contains a gap of over four hours. |
| ISS RR‑7 | 21,948 | Three cabin measurements and a longer calendar span of nearly 80 days. Samples are typically five minutes apart. |
| ISS RR‑9 | 10,079 | Complete triplets at every returned timestamp and a CO₂ range that exercises the prototype's alert thresholds. It has roughly one-quarter as many complete triplets as RR‑23. |
| ISS RR‑18 | 0 | More than 100,000 temperature timestamps, plus humidity. The downloaded file has no ISS CO₂ values. |
| Artemis II Orion | 0 | Temperature, humidity, and dew point in sample storage lockers. [NASA PDS collection](https://pds.nasa.gov/ds-view/pds/viewCollection.jsp?identifier=urn:nasa:pds:artemis2_mission:data_orion_environment) |
| Perseverance MEDA and InSight | 0 | Useful outdoor Mars measurements such as pressure, temperature, and wind. [MEDA archive](https://atmos.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda.html) · [InSight Weather API](https://api.nasa.gov/assets/insight/InSight%20Weather%20API%20Documentation.pdf) |
| RadLab and Curiosity RAD | 0 | Radiation measurements, including detectors aboard spacecraft and on Mars. [NASA RadLab](https://visualization.osdr.nasa.gov/radlab/gui/overview/) · [Curiosity RAD cruise archive](https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/DATA/CRUISE/) |

## Implications for the final logger

- **Keep the native cadence.** Import RR‑23 once and keep its original UTC timestamps, units, and nulls. The dashboard currently bundles RR‑23 as hourly averages. Use the original file for final logging, alert evaluation, and symptom-onset lookup. Any chart aggregation should be for display.
- **Use the same source for incident context.** For each metric, attach the most recent valid reading at or before symptom onset, its source time, and a short look-back window with the sample count. When a reading is too old, store its availability as stale and keep the previous value labeled as the last known reading. Preserve the archive source time when mapping the data to a simulated Mars mission clock.
- **Keep alert tests reproducible.** RR‑23's maximum CO₂ of **3,159 ppm** is below the prototype's **3,500 ppm** demo warning threshold. A labeled synthetic test fixture can exercise warning, danger, and recovery in development. The final logger's historical feed remains RR‑23.
- **Scope the report to available cabin fields.** This telemetry file has no oxygen, total cabin pressure, or radiation channel. NASA EDA has a separate daily RR‑23 radiation product. If the team makes radiation mandatory, that requires a second product or a revised dataset decision. NASA’s nominal habitat CO₂ criterion uses a one-hour average of partial pressure. This file supplies ppm and has no total pressure series for that conversion. [NASA-STD-3001 Volume 2, Natural and Induced Environments](https://www.nasa.gov/reference/6-0-natural-and-induced-environments-vol-2/)

## Audit and attribution

Counts were computed from the local downloads by grouping each EDA telemetry response on the original UTC timestamp, then counting timestamps with numeric, finite readings for all three ISS fields and humidity within 0–100%. The 91.0% figure uses the 47,668 expected minute slots between the first and last complete RR‑23 readings, inclusive. The source file was downloaded on November 14, 2026. Its SHA‑256 is `64e04551797d8b299fe05616e591990fc0bc630f90bb9595abac2a41b8f7032e`.

Suggested attribution for the project page: NASA Open Science Data Repository, Environmental Data App, RR‑23 ISS cabin telemetry, accessed November 14, 2026. The [NASA OSDR terms](https://science.nasa.gov/reference/osdr-help-terms-and-conditions/) explain redistribution and credit. Keep the challenge-listed [NASA HRP 5 Hazards of Human Spaceflight](https://www.nasa.gov/hrp/hazards/) reference in the submission alongside the telemetry attribution.
