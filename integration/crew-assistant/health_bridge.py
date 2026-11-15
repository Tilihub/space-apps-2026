"""Use Angelos's validated check-in store for the single synthetic Tomas demo."""

import json
import sys
from contextlib import closing
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / "people" / "angelos" / "health_monitor"))

from check_in import CheckInStore
from monitor import analyze, baseline_statistics

CLOCK_START = date(2026, 10, 3)
DEMO_DAY = 42
TODAY = "2026-11-14T07:30:00Z"
FIELDS = ("sleep_hours", "resting_heart_rate_bpm", "mood", "stress", "fatigue")
HISTORY_FIELDS = ("sleep_hours", "resting_heart_rate_bpm")


def mission_day(row):
    return (date.fromisoformat(row["recorded_at"][:10]) - CLOCK_START).days


def demo_state(store):
    baseline, saved = store.state()
    reference, _ = baseline_statistics(baseline)
    past = [row for row in saved if mission_day(row) < DEMO_DAY]
    today = next((row for row in saved if mission_day(row) == DEMO_DAY), None)
    short_sleep_days = 0
    if past and mission_day(past[-1]) == DEMO_DAY - 1:
        history = analyze({"baseline": baseline, "recent": past[:-1], "current": past[-1]})
        short_sleep_days = next(
            (finding["consecutive_flagged_days"] for finding in history["findings"]
             if finding["metric"] == "sleep_hours" and finding["delta"] < 0),
            0,
        )
    return {
        "baselineDays": len(baseline),
        "health": {
            field: {
                "reference": reference.get(field, {}).get("median"),
                "recent": [{"mission_day": mission_day(row), "value": row.get(field)}
                           for row in past[-2:]],
            } for field in HISTORY_FIELDS
        },
        "shortSleepDays": short_sleep_days,
        "checkIn": {field: today.get(field) for field in FIELDS} if today else None,
    }


def main():
    db, operation = sys.argv[1:]
    with closing(CheckInStore(db, baseline_file=HERE / "tomas-history.json")) as store:
        if operation == "save":
            supplied = json.load(sys.stdin)
            if not isinstance(supplied, dict) or set(supplied) - set(FIELDS):
                raise ValueError("Submit only check-in measurements.")
            if all(supplied.get(field) is None for field in FIELDS):
                raise ValueError("Enter at least one measurement.")
            store.submit({
                "astronaut_id": "c4",
                "recorded_at": TODAY,
                **{field: supplied.get(field) for field in FIELDS},
            })
        print(json.dumps(demo_state(store), allow_nan=False))


try:
    main()
except ValueError as error:
    print(json.dumps({"error": str(error)}))
