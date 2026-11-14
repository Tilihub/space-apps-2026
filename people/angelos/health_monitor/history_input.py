"""Read a versioned external personal-history JSON file; no demo value generation."""

import json
from datetime import timedelta
from pathlib import Path

from monitor import DEMO_FLOORS, baseline_statistics, recorded_time, validate_history


UNITS = {"resting_heart_rate_bpm": "bpm", "sleep_hours": "hours",
         "mood": "points", "stress": "points", "fatigue": "points"}


def validate_self_reports(row, scale):
    if scale == "1-10":
        for metric in ("mood", "stress", "fatigue"):
            value = row.get(metric)
            if value is not None and (isinstance(value, bool) or not isinstance(value, (int, float))
                                      or not 1 <= value <= 10 or value != int(value)):
                raise ValueError(f"{metric} must be a whole number from 1 to 10 for this reference.")


def reject_constant(value):
    raise ValueError("JSON numbers must be finite.")


def load_personal_history(path):
    packet = json.loads(Path(path).read_text(encoding="utf-8-sig"), parse_constant=reject_constant)
    allowed = {"schema_version", "astronaut_id", "source", "units", "baseline", "recent"}
    if not isinstance(packet, dict) or set(packet) - allowed:
        raise ValueError("Use a personal-history-v1 JSON object with only the documented fields.")
    if packet.get("schema_version") != "personal-history-v1":
        raise ValueError("schema_version must be personal-history-v1.")
    subject = packet.get("astronaut_id")
    if not isinstance(subject, str) or not subject.strip():
        raise ValueError("astronaut_id must identify one person.")
    source = packet.get("source")
    if not isinstance(source, dict) or set(source) != {
        "kind", "label", "observation_type", "heart_rate_context", "self_report_scale"
    }:
        raise ValueError("source must contain the five documented provenance fields.")
    if source["kind"] not in ("synthetic", "individual_history"):
        raise ValueError("source.kind must be synthetic or individual_history.")
    if not isinstance(source["label"], str) or not source["label"].strip():
        raise ValueError("source.label must describe the data source.")
    if source["observation_type"] != "individual_daily" or source["heart_rate_context"] != "rest":
        raise ValueError("Use individual daily observations and resting heart rate, not cohort or exercise summaries.")
    if source["self_report_scale"] not in ("0-10", "1-10"):
        raise ValueError("Declare self_report_scale as 0-10 or 1-10; values are never remapped.")
    if packet.get("units") != UNITS:
        raise ValueError("The units must match the documented bpm, hours and points contract.")

    def records(key):
        rows = packet.get(key, [] if key == "recent" else None)
        if not isinstance(rows, list):
            raise ValueError(f"{key} must be an array.")
        normalized = []
        for row in rows:
            if not isinstance(row, dict) or set(row) - {"astronaut_id", "recorded_at", *DEMO_FLOORS}:
                raise ValueError("Every record must use only the documented check-in fields.")
            if row.get("astronaut_id", subject) != subject:
                raise ValueError("All records must belong to the declared astronaut.")
            normalized_row = {"astronaut_id": subject, "recorded_at": row.get("recorded_at"),
                              **{metric: row.get(metric) for metric in DEMO_FLOORS}}
            if recorded_time(normalized_row).utcoffset() != timedelta(0):
                raise ValueError("Imported timestamps must be explicit UTC.")
            validate_self_reports(normalized_row, source["self_report_scale"])
            normalized.append(normalized_row)
        return normalized

    baseline, recent = validate_history(records("baseline"), records("recent"))
    references, _ = baseline_statistics(baseline)
    if not references:
        raise ValueError("At least one measure needs five valid reference days for this demo.")
    return {"schema_version": packet["schema_version"], "source": source,
            "units": dict(UNITS), "baseline": baseline, "recent": recent}
