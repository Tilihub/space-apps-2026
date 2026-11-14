# Mission Environment Monitor

Open [index.html](index.html) in Chrome, Edge, or Firefox. The dashboard works directly from the filesystem. It loads the checked-in chart data and needs no server, external fonts, packages, or network connection.

The dashboard automatically replays NASA’s ISS RR‑9 data from the first timestamp and loops after the last timestamp. The chart window controls how much history is visible. Pause, restart, change the playback speed, or scrub through the replay. The timestamp stays on the source clock. The replay advances by recorded timestamps, so long gaps pass quickly and appear as breaks in the chart. Switch to **Archive** for the static graph and CSV export. Pause the replay to inspect an individual point with the pointer or arrow keys.

The ISS cabin cards show CO₂, temperature, and relative humidity at the same replay position. Warning and Danger are illustrative demo states. Two consecutive readings confirm a threshold crossing or recovery. The cards show when they are checking a potential escalation, and a gap clears the previous alert state. The event list shows the latest six transitions at the current replay position and starts over at each loop. Choose **Alert exercise · Synthetic** for a predictable high and low excursion, including recovery.

| Cabin measurement | Warning | Danger |
| --- | --- | --- |
| CO₂ concentration | ≥ 3,500 ppm | ≥ 3,900 ppm |
| Temperature | ≤ 19 °C or ≥ 27 °C | ≤ 16 °C or ≥ 30 °C |
| Relative humidity | ≤ 30% or ≥ 70% | ≤ 20% or ≥ 85% |

These limits demonstrate the app’s behavior. NASA-STD-3001 Rev. F, V2 6004, specifies a one-hour average CO₂ partial pressure of at most 3 mmHg for nominal habitat conditions. Computing it from concentration requires total cabin pressure. V2 6012 specifies a combined temperature and humidity operating envelope. The replay uses independent limits in the source units. [NASA-STD-3001 Volume 2 Rev. F](https://standards.nasa.gov/standard/NASA/NASA-STD-3001_VOL_2)

## Data files

`data/series.js` contains the processed series loaded by the dashboard. The original downloads are in `environmental-graphs/data/raw/` at the workspace root. The team repository copy includes the chart data. To regenerate it with Python 3.9 or later, run `python build_data.py --raw-dir <path-to-raw-downloads>` from this directory. The script uses the standard library.

Each dataset has a stable `id`, source URL, time mode, and metrics. Each metric has an `id`, unit, aggregation interval in seconds, gap threshold, and `points` triples of `[time, value, sampleCount]`. A UTC time is expressed in Unix seconds. Perseverance time represents seconds within Sol 49 on the local mean solar time clock. InSight time is the sol number. **Export snapshot** packages the selected cabin context for an incident. The JSON contains the dataset, source URL, historical or synthetic provenance, replay timestamp, and each channel’s value, unit, measurement timestamp, and alert state. Stale readings carry a null value and the last recorded timestamp.

The window statistics describe the displayed series, with counts reporting original valid samples. The dashboard omits missing or invalid values and breaks the line across gaps. Each graph discloses aggregation when applied. NASA’s RR‑9 cabin archive timestamps are in 2018 and its radiation timestamps are in 2017. Both retain the published dates. Spacecraft exposures, Mars weather, and a simulated health incident each have their own clock. Use the CO₂ graph as context for a report of symptoms and crew follow-up.

## Sources and reuse

Downloads were collected on November 14, 2026. Keep the source and applicable terms with any shared copy. The [NASA science data policy](https://science.data.nasa.gov/about/license) applies CC0 to unmarked NASA-led mission data and calls for checking collection-specific notices, especially for partner data. The [NASA OSDR terms](https://science.nasa.gov/reference/osdr-help-terms-and-conditions/) provide open access under the Science Mission Directorate policy and request citation. Preserve instrument-team credits and verify any partner-specific redistribution terms when publishing a mirror.

| Local files | Source and coverage |
| --- | --- |
| `data/raw/iss-eda/` | NASA OSDR Environmental Data App. The mission catalog and available telemetry and daily dosimetry API responses. Empty or all-null responses are retained as archive responses and do not produce charts. The ISS charts use the ISS measurement channels. [EDA](https://visualization.osdr.nasa.gov/eda/) · [API documentation](https://visualization.osdr.nasa.gov/eda/api_reference) · [RR‑9 cabin API](https://visualization.osdr.nasa.gov/eda/api/missions/RR-9/telemetry_data/) · [NASA OSDR citation guidance](https://science.nasa.gov/reference/osdr-faq/) |
| `data/raw/artemis-ii/` | Artemis II Lunar Science Team, Orion Environment Data Collection, version 1.0. CSVs and XML labels for two loggers in storage lockers D and E. The graph uses the flight window only, converts CDT to UTC and averages each five-minute interval. [PDS collection, DOI 10.17189/36fx-pd80](https://pds.nasa.gov/ds-view/pds/viewCollection.jsp?identifier=urn:nasa:pds:artemis2_mission:data_orion_environment) · [CSV and XML archive](https://pds-geosciences.wustl.edu/artemis2/urn-nasa-pds-artemis2_mission/data_orion_environment/) |
| `data/raw/curiosity-cruise/` | Hassler and the MSL RAD team, NASA PDS MSL-M-RAD-3-RDR-V1.0. Original TXT and LBL for cruise day C012. The chart extracts the archived B and E detector dose rates in µGy/h. [PDS files](https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/DATA/CRUISE/) · [RAD format and units](https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/DOCUMENT/RAD_RDR_SIS.PDF) |
| `data/raw/radlab/artemis-i-orion.csv` | NASA OSDR RadLab, Orion Artemis I, November 16 to December 12, 2022 (end exclusive), HERA HSU1/HSU2, M‑42 SN127, and EAD MU01. [NASA release](https://science.data.nasa.gov/features-events/data-software-highlights-may-2026) · [Mission instrument-team publication](https://doi.org/10.1038/s41586-024-07927-7) |
| `data/raw/radlab/iss-dostel.csv` | OSDR RadLab, DOSTEL 1 and 2, April 1 23:00 through April 2 01:05 UTC, 2022. Measurements supplied through the Italian Space Agency DORELI project. [NASA instrument credit](https://www.nasa.gov/osdr-latest-news-new-visualization-apps-released/) · [RadLab API](https://visualization.osdr.nasa.gov/radlab/gui/data-api/) |
| `data/raw/radlab/curiosity*.csv` | OSDR RadLab, MSL RAD on the surface of Mars. September 2017, plus a smaller September 9–14 export. [NASA mission product](https://data.nasa.gov/dataset/mars-science-laboratory-radiation-assessment-detector-rad-level-2-observation-dosimetr) · [RadLab API](https://visualization.osdr.nasa.gov/radlab/gui/data-api/) |
| `data/raw/radlab/exomars-cruise*.csv` | OSDR RadLab, ExoMars Trace Gas Orbiter Liulin‑MO AB and CD cruise channels, 2016. Credit the Liulin‑MO instrument team and Bulgarian Academy of Sciences. [Instrument and team](https://esa-pro.space.bas.bg/liulin-mo) · [RadLab API](https://visualization.osdr.nasa.gov/radlab/gui/data-api/) |
| `data/raw/perseverance/` | Rodríguez-Manfredi et al., NASA PDS MEDA, Sol 49, Jezero Crater. Original CSVs and XML labels for air temperature, pressure, humidity, thermal irradiance, and wind. The local relative-humidity field is empty in this sol; the file still contains sensor temperature. [MEDA archive, DOI 10.17189/1522849](https://atmos.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda.html) |
| `data/raw/insight/` | NASA InSight weather summary, Elysium Planitia. NASA’s published per-sol averages. [API reference](https://api.nasa.gov/assets/insight/InSight%20Weather%20API%20Documentation.pdf) |

## Space Apps submission

The dashboard uses the challenge-listed NASA Human Research Program **5 Hazards of Human Spaceflight** to explain why the crew reviews closed-environment conditions along with symptoms. List that resource and every used dataset under the appropriate NASA data and references fields. [Challenge resources](https://hackathlone.com/challenges/health-monitoring-software) · [NASA HRP](https://www.nasa.gov/hrp/hazards/) · [NASA Space Apps organizer guidance](https://github.com/nasa/spaceapps/discussions/1827)

Original dashboard code is provided under [Apache 2.0](LICENSE). Public mission data retains the terms of its publisher. The dashboard, data processing script, documentation, and labeled synthetic exercise were generated with assistance from OpenAI Codex during the hackathon. Historical readings came from the cited archives. Include this AI usage in the submission disclosure. [2026 AI guidance](https://github.com/nasa/spaceapps/discussions/1849) · [Participant terms](https://www.spaceappschallenge.org/legal/)
