"""Build the offline chart series from the archived NASA responses in data/raw."""

import csv
import json
from argparse import ArgumentParser
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from itertools import groupby
from math import isfinite
from pathlib import Path
from statistics import mean, median


DATA = Path(__file__).resolve().parent / "data"
RAW = DATA / "raw"
EDA = "https://visualization.osdr.nasa.gov/eda/api/missions"
RADLAB = "https://visualization.osdr.nasa.gov/radlab/gui/overview/"
ORION = "https://pds-geosciences.wustl.edu/artemis2/urn-nasa-pds-artemis2_mission/data_orion_environment/"
MEDA = "https://atmos.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda.html"
MSL_CRUISE = "https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/DATA/CRUISE/"
ISS_METRICS = (
    ("co2_iss", "Cabin CO₂", "ppm", 0),
    ("temperature_iss", "Cabin air temperature", "°C", 1),
    ("humidity_iss", "Cabin relative humidity", "%", 1),
)


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def read_csv(path):
    with path.open(encoding="utf-8-sig", newline="") as source:
        yield from csv.DictReader(source)


def epoch(value):
    date = datetime.fromisoformat(value)
    return int(date.replace(tzinfo=date.tzinfo or timezone.utc).timestamp())


def number(value):
    if value is None or not str(value).strip():
        return None
    numeric = float(value)
    return numeric if isfinite(numeric) and abs(numeric) < 999_999 else None


def iss_reading(row, channel):
    value = number(row.get(channel))
    if channel == "humidity_iss" and value is not None and not 0 <= value <= 100:
        return None
    return value


def metric(key, title, unit, decimals, observations, bucket=0, gap=None, shift=0):
    by_time = defaultdict(list)
    for timestamp, value in observations:
        if value is not None:
            by_time[timestamp // bucket * bucket if bucket else timestamp].append(value + shift)
    if not by_time:
        return None
    if gap is None:
        times = sorted(by_time)
        steps = [end - start for start, end in zip(times, times[1:])]
        gap = max(1, int(median(steps) * 1.8)) if steps else 1
    points = [[timestamp, round(mean(values), 5), len(values)] for timestamp, values in sorted(by_time.items())]
    return {"id": key, "title": title, "unit": unit, "decimals": decimals,
            "points": points, "gap": gap, "bucket": bucket}


def dataset(key, title, context, source, url, series, notes, time_mode="utc"):
    metrics = [entry for entry in series if entry is not None]
    if metrics:
        return {"id": key, "title": title, "context": context, "source": source, "url": url,
                "metrics": metrics, "notes": notes, "timeMode": time_mode}
    return None


def eda_datasets(raw_directory):
    paths = sorted((raw_directory / "iss-eda").glob("*_data.json"), key=lambda path: (
        not path.name.startswith("RR-9-telemetry"), "radiation_data" in path.name, path.name
    ))
    for path in paths:
        mission, measurement = path.stem.rsplit("-", 1)
        rows = read_json(path)
        if not rows:
            continue
        times = [epoch(row["time"]) for row in rows]
        url = f"{EDA}/{mission}/{measurement}/"
        if measurement == "telemetry_data":
            bucket = 0 if mission == "RR-9" else 3600
            series = [metric(*spec, ((t, iss_reading(row, spec[0])) for t, row in zip(times, rows)),
                             bucket=bucket, gap=5400 if bucket else 450) for spec in ISS_METRICS]
            notes = "Uses the archive’s ISS channels. Humidity readings outside 0–100% are omitted. Review cabin readings alongside the crew’s symptom report."
            if mission == "RR-9":
                notes += " NASA’s RR‑9 telemetry feed is dated 2018. Its separate radiation feed is dated 2017."
            yield dataset(f"{mission}-telemetry", f"ISS {mission} · Cabin",
                          "International Space Station · Historical environmental telemetry", "NASA OSDR · EDA",
                          url, series, notes)
        else:
            channels = (("total", "Total daily absorbed dose"), ("gcr", "Galactic cosmic rays"),
                        ("saa", "South Atlantic Anomaly"))
            series = [metric(key, title, "mGy/day", 3, ((t, number(row.get(key))) for t, row in zip(times, rows)),
                             gap=86400) for key, title in channels]
            yield dataset(f"{mission}-radiation", f"ISS {mission} · Radiation",
                          "International Space Station · Historical radiation", "NASA OSDR · EDA", url, series,
                          "Daily detector data from the archive. The mission’s cabin feed may use a different date range.")


def orion_dataset(raw_directory):
    launch = epoch("2026-04-01T22:35:00Z")
    splashdown = epoch("2026-04-11T00:07:00Z")
    cdt = timezone(timedelta(hours=-5))
    series = []
    for path in sorted((raw_directory / "artemis-ii").glob("*.csv")):
        logger = path.stem.split("_")[3].removeprefix("hobo")
        rows = []
        for row in read_csv(path):
            time = datetime.strptime(row["Date-Time (CDT)"], "%m/%d/%Y %H:%M:%S").replace(tzinfo=cdt)
            stamp = int(time.timestamp())
            if launch <= stamp <= splashdown:
                rows.append((stamp, row))
        for column, title, unit in (("Temperature , deg C", "Temperature", "°C"), ("RH , %", "Relative humidity", "%"),
                                    ("Dew Point , deg C", "Dew point", "°C")):
            series.append(metric(f"{column.split()[0].lower()}-{logger}", f"{title} · logger {logger}", unit, 1,
                                 ((time, number(row[column])) for time, row in rows), bucket=300, gap=450))
    return dataset("artemis-ii", "Artemis II · Orion environment", "Orion · Storage lockers D and E",
                   "NASA PDS · DOI 10.17189/36fx-pd80", ORION, series,
                   "Storage-locker measurements during flight. The full raw CSVs include ground measurements. Times are converted from CDT to UTC.")


def radlab_datasets(raw_directory):
    configs = (
        (("artemis-i-orion.csv",), "artemis-i", "Artemis I · Orion radiation",
         "Orion · Uncrewed lunar flight", 300, 1800),
        (("iss-dostel.csv",), "iss-dostel", "ISS · DosTel radiation", "International Space Station · Two detectors", 0, 600),
        (("curiosity-surface-sep-2017.csv",), "curiosity-rad", "Curiosity · Mars surface radiation",
         "Gale Crater · September 2017", 0, 2400),
        (("exomars-cruise.csv", "exomars-cruise-cd.csv"), "exomars-cruise", "ExoMars TGO · Cruise radiation",
         "Liulin-MO dosimetry · Earth-to-Mars transit", 0, 5500),
    )
    for files, key, title, context, bucket, gap in configs:
        paths = [raw_directory / "radlab" / file for file in files]
        rows = sorted((row for path in paths if path.exists() for row in read_csv(path)),
                      key=lambda row: row["instrument_id"])
        series = [metric(detector, detector, "µGy/h", 2,
                         ((epoch(row["timestamp"]), number(row["absorbed_dose_rate"])) for row in records),
                         bucket=bucket, gap=gap)
                  for detector, records in groupby(rows, key=lambda row: row["instrument_id"])]
        yield dataset(key, title, context, "NASA OSDR · RadLab", RADLAB, series,
                      "Absorbed dose rate recorded by the selected detector. Detector readings depend on location and shielding.")


def msl_cruise_dataset(raw_directory):
    doses = {"B": [], "E": []}
    for path in sorted((raw_directory / "curiosity-cruise").glob("*.TXT")):
        timestamp = None
        detector = None
        with path.open(encoding="ascii") as source:
            for line in source:
                if line.startswith("START_OBS_UTC="):
                    utc_time = line.split('"')[1]
                    timestamp = int(datetime.strptime(utc_time, "%Y-%j %H:%M:%S")
                                    .replace(tzinfo=timezone.utc).timestamp())
                elif line.startswith("[DOSIMETRY_TOTAL_DOSE_"):
                    detector = line.split(":")[0][-1]
                elif detector and line.strip():
                    value = number(line.strip())
                    if timestamp is not None and value is not None and value >= 0:
                        doses[detector].append((timestamp, value))
                    detector = None
    series = [metric(key, f"Absorbed dose rate · detector {key}", "µGy/h", 2, values, gap=2000)
              for key, values in doses.items()]
    return dataset("curiosity-cruise", "Curiosity · Earth-to-Mars radiation",
                   "Mars Science Laboratory · Interplanetary cruise day C012", "NASA PDS · MSL RAD RDR",
                   MSL_CRUISE, series, "One cruise day, December 8, 2011. Uses detectors B and E from the reduced data record.")


def mars_seconds(value):
    _, time = value.split("M")
    hour, minute, second = time.split(":")
    return int(hour) * 3600 + int(minute) * 60 + int(float(second))


def meda_dataset(raw_directory):
    configs = (
        ("CAL_ATS", "ATS_LOCAL_TEMP1", "Air temperature · ATS 1", "°C", 1, -273.15),
        ("DER_PS", "PRESSURE", "Atmospheric pressure", "Pa", 1, 0),
        ("DER_WS", "HORIZONTAL_WIND_SPEED", "Horizontal wind speed", "m/s", 1, 0),
        ("DER_RHS", "LOCAL_RELATIVE_HUMIDITY", "Local relative humidity", "%", 1, 0),
        ("DER_TIRS", "DOWNWARD_LW_IRRADIANCE", "Downward thermal irradiance", "W/m²", 1, 0),
        ("DER_TIRS", "UPWARD_LW_IRRADIANCE", "Upward thermal irradiance", "W/m²", 1, 0),
    )
    series = []
    for sensor, column, title, unit, decimals, shift in configs:
        path = next((raw_directory / "perseverance").glob(f"*{sensor}*.CSV"), None)
        if path:
            series.append(metric(column, title, unit, decimals,
                                 ((mars_seconds(row["LMST"]), number(row[column])) for row in read_csv(path)),
                                 bucket=60, gap=90, shift=shift))
    return dataset("perseverance", "Perseverance · Surface weather", "Jezero Crater · Sol 49",
                   "NASA PDS · MEDA · DOI 10.17189/1522849", MEDA, series,
                   "Outdoor readings on Mars. ATS 1 was converted from kelvin. Thermal irradiance measures infrared energy. The Sol 49 humidity file has no local relative humidity values.",
                   time_mode="lmst")


def insight_dataset(raw_directory):
    path = raw_directory / "insight" / "insight-weather.json"
    if not path.exists():
        return None
    data = read_json(path)
    sols = data.get("sol_keys", [])
    series = [metric(key, title, unit, 1, ((int(sol), number(data[sol].get(key, {}).get("av"))) for sol in sols),
                     gap=1)
              for key, title, unit in (("AT", "Mean air temperature", "°C"), ("PRE", "Mean atmospheric pressure", "Pa"),
                                       ("HWS", "Mean horizontal wind speed", "m/s"))]
    return dataset("insight", "InSight · Surface weather", "Elysium Planitia · Archived daily summaries",
                   "NASA · InSight Mars Weather Service", "https://api.nasa.gov/#insight", series,
                   "Each point is NASA’s published average for one sol. Gaps indicate unavailable daily values.",
                   time_mode="sol")


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--raw-dir", type=Path, default=RAW, help="Path to the downloaded NASA files")
    args = parser.parse_args()
    build(args.raw_dir.resolve())


def build(raw_directory):
    primary, *additional_iss = eda_datasets(raw_directory)
    datasets = [primary, orion_dataset(raw_directory), msl_cruise_dataset(raw_directory),
                *radlab_datasets(raw_directory), meda_dataset(raw_directory),
                insight_dataset(raw_directory), *additional_iss]
    datasets = [entry for entry in datasets if entry]
    if not datasets or datasets[0]["id"] != "RR-9-telemetry":
        raise ValueError("The primary ISS RR-9 cabin dataset is missing.")
    (DATA / "series.js").write_text("window.missionEnvironment = " +
                                  json.dumps(datasets, ensure_ascii=False, separators=(",", ":"), allow_nan=False) +
                                  ";\n", encoding="utf-8")
    for entry in datasets:
        print(f"{entry['id']}: {len(entry['metrics'])} measurements")


if __name__ == "__main__":
    main()
