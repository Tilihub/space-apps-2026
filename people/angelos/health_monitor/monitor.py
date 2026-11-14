"""Personal comparison demo. No clinical thresholds, diagnosis, or external services."""

import argparse
import json
import math
import statistics
import sys
from datetime import datetime, timedelta
from pathlib import Path


# Arbitrary demonstration settings, in each field's units. Not medical limits.
DEMO_FLOORS = {
    "resting_heart_rate_bpm": 10,
    "sleep_hours": 1.5,
    "mood": 2,
    "stress": 2,
    "fatigue": 2,
}
MIN_REFERENCE_DAYS = 5  # Engineering demo minimum; not a validated baseline duration.


def validate_measurement(metric, value):
    if value is None:
        return
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{metric} must be a number or null.")
    if not math.isfinite(value):
        raise ValueError(f"{metric} must be finite.")
    if metric == "resting_heart_rate_bpm" and value <= 0:
        raise ValueError("resting_heart_rate_bpm must be positive.")
    if metric == "sleep_hours" and not 0 <= value <= 24:
        raise ValueError("sleep_hours must be between 0 and 24.")
    if metric in ("mood", "stress", "fatigue") and not 0 <= value <= 10:
        raise ValueError(f"{metric} must be between 0 and 10.")


def recorded_time(row):
    try:
        stamp = datetime.fromisoformat(row["recorded_at"])
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError("recorded_at must be an ISO 8601 timestamp.") from exc
    if stamp.tzinfo is None:
        raise ValueError("recorded_at must include a timezone offset.")
    return stamp


def validate(payload):
    if not isinstance(payload, dict):
        raise ValueError("Input must be an object.")
    baseline = payload.get("baseline")
    recent = payload.get("recent", [])
    current = payload.get("current")
    if not isinstance(baseline, list) or not isinstance(recent, list):
        raise ValueError("baseline and recent must be arrays.")
    if not isinstance(current, dict):
        raise ValueError("current must be an object.")
    subject = current.get("astronaut_id")
    if not isinstance(subject, str) or not subject.strip():
        raise ValueError("astronaut_id must be a nonempty string.")
    days = set()
    current_time = recorded_time(current)
    current_offset = current_time.utcoffset()
    baseline_times, recent_times = [], []
    for group_name, group in (("baseline", baseline), ("recent", recent),
                              ("current", [current])):
        for row in group:
            if not isinstance(row, dict) or row.get("astronaut_id") != subject:
                raise ValueError("All records must belong to the same astronaut.")
            stamp = recorded_time(row)
            if stamp.utcoffset() != current_offset:
                raise ValueError("Use one fixed mission timezone offset for all records.")
            if stamp.date() in days:
                raise ValueError("Provide only one check-in per mission day.")
            days.add(stamp.date())
            if group_name != "current" and stamp >= current_time:
                raise ValueError("Historical records must precede current.")
            if group_name == "baseline":
                baseline_times.append(stamp)
            elif group_name == "recent":
                recent_times.append(stamp)
            for metric in DEMO_FLOORS:
                validate_measurement(metric, row.get(metric))
    if baseline_times and recent_times and max(baseline_times) >= min(recent_times):
        raise ValueError("The frozen baseline must precede the recent period.")
    return baseline, recent, current


def baseline_statistics(baseline):
    """Calculate the fixed reference using only validated baseline records."""
    references, gaps = {}, []
    for metric, floor in DEMO_FLOORS.items():
        values = [row[metric] for row in baseline if row.get(metric) is not None]
        if len(values) < MIN_REFERENCE_DAYS:
            gaps.append(f"{metric}: fewer than {MIN_REFERENCE_DAYS} reference days.")
            continue
        center = statistics.median(values)
        mad = statistics.median(abs(value - center) for value in values)
        threshold = max(3 * 1.4826 * mad, floor)
        references[metric] = {
            "median": center, "demo_threshold": threshold, "sample_days": len(values)
        }
    return references, gaps


def validate_history(baseline, history):
    """Validate reference and optional later records without inventing a new day."""
    if not isinstance(baseline, list) or not baseline or not isinstance(history, list):
        raise ValueError("A nonempty baseline array and a history array are required.")
    baseline = sorted(baseline, key=recorded_time)
    history = sorted(history, key=recorded_time)
    if history:
        validate({"baseline": baseline, "recent": history[:-1], "current": history[-1]})
    else:
        validate({"baseline": baseline[:-1], "recent": [], "current": baseline[-1]})
    return baseline, history


def analyze(payload):
    """Return structured evidence; never change the supplied frozen reference."""
    baseline, recent, current = validate(payload)
    references, gaps = baseline_statistics(baseline)
    findings = []
    ordered = sorted([*recent, current], key=recorded_time, reverse=True)
    for metric, reference in references.items():
        center = reference["median"]
        threshold = reference["demo_threshold"]
        value = current.get(metric)
        if value is None:
            gaps.append(f"{metric}: current measurement is missing.")
            continue
        if abs(value - center) < threshold:
            continue
        run = 0
        expected_day = recorded_time(current).date()
        for row in ordered:
            if recorded_time(row).date() != expected_day:
                break
            historical_value = row.get(metric)
            if historical_value is None or abs(historical_value - center) < threshold:
                break
            # Opposite-direction deviations are separate runs.
            if (historical_value - center) * (value - center) <= 0:
                break
            run += 1
            expected_day -= timedelta(days=1)
        findings.append({
            "metric": metric,
            "current": value,
            "reference_median": center,
            "delta": round(value - center, 3),
            "demo_threshold": round(threshold, 3),
            "consecutive_flagged_days": run,
        })

    status = ("review_suggested" if findings else
              "insufficient_data" if gaps else "no_demo_deviation")
    if findings:
        message = (f"The demo comparison found changes in {len(findings)} measure(s). "
                   "The evidence is listed below. This does not establish a cause. "
                   "Would you like to describe how you feel today?")
    elif gaps:
        message = "There is not enough information for a complete comparison."
    else:
        message = ("No changes crossed the demo thresholds in the available measures. "
                   "This does not establish that you are healthy. How do you feel today?")
    return {
        "astronaut_id": current["astronaut_id"],
        "recorded_at": current["recorded_at"],
        "status": status,
        "data_completeness": "partial" if gaps else "complete",
        "findings": findings,
        "data_gaps": gaps,
        "reference": references,
        "assistant_message": message,
        "limitations": [
            "Demonstration with unvalidated comparison rules; not a diagnosis.",
            "No detected deviation does not rule out a health concern.",
            "Self-reports do not establish a mental health diagnosis.",
        ],
    }


def print_result(result):
    print("PERSONAL MONITORING DEMO - NOT A MEDICAL ASSESSMENT")
    print(f"Status: {result['status']} | Data: {result['data_completeness']}")
    print(result["assistant_message"])
    for finding in result["findings"]:
        print(f"- {finding['metric']}: {finding['current']} vs reference "
              f"{finding['reference_median']}; delta {finding['delta']:+g}; "
              f"{finding['consecutive_flagged_days']} consecutive check-in day(s)")
    for gap in result["data_gaps"]:
        print(f"- Data gap: {gap}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--scenario", choices=["usual", "changes", "missing"],
                        default="changes", help="Bundled synthetic scenario")
    parser.add_argument("--input", type=Path, help="Read one payload instead of a demo")
    parser.add_argument("--json", action="store_true", help="Print structured output")
    args = parser.parse_args()
    try:
        path = args.input or Path(__file__).with_name("demo_data.json")
        payload = json.loads(path.read_text(encoding="utf-8"))
        if args.input is None:
            payload = {"baseline": payload["baseline"], **payload["scenarios"][args.scenario]}
        result = analyze(payload)
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print(f"Input error: {exc}", file=sys.stderr)
        return 2
    if args.json:
        print(json.dumps(result, indent=2, allow_nan=False))
    else:
        print_result(result)
    return 0


if __name__ == "__main__":
    sys.exit(main())
