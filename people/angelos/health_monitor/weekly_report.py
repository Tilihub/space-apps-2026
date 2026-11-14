"""Descriptive weekly medians; the original personal baseline stays fixed."""

import statistics
from datetime import date, timedelta

from monitor import DEMO_FLOORS, baseline_statistics, recorded_time, validate_history


LABELS = {
    "resting_heart_rate_bpm": ("Resting heart rate", "bpm"),
    "sleep_hours": ("Sleep", "hours"),
    "mood": ("Mood", "points"),
    "stress": ("Stress", "points"),
    "fatigue": ("Fatigue", "points"),
}


def period_summary(records, start, end):
    return {"start": start.isoformat(), "end": end.isoformat(),
            "recorded_days": len(records), "expected_days": 7}


def metric_summary(records, metric):
    values = [row[metric] for row in records if row.get(metric) is not None]
    return {
        "median": statistics.median(values) if values else None,
        "valid_days": len(values),
        "missing_days": 7 - len(values),
    }


def build_weekly_report(baseline, history, end_date=None):
    """Compare two nonoverlapping calendar windows, excluding reference records.

    The current window ends on the latest saved check-in unless a mission date is
    supplied. Week-to-week changes require seven measured days in each window.
    Partial medians and their baseline differences remain descriptive estimates.
    """
    baseline, ordered = validate_history(baseline, history)
    if end_date is None:
        end = (recorded_time(ordered[-1]).date() if ordered else
               recorded_time(baseline[-1]).date() + timedelta(days=1))
    elif isinstance(end_date, str):
        end = date.fromisoformat(end_date)
    elif type(end_date) is date:
        end = end_date
    else:
        raise ValueError("Report end_date must be a mission date.")
    start = end - timedelta(days=6)
    previous_end = start - timedelta(days=1)
    previous_start = start - timedelta(days=7)
    current_rows = [row for row in ordered if start <= recorded_time(row).date() <= end]
    previous_rows = [row for row in ordered
                     if previous_start <= recorded_time(row).date() <= previous_end]
    references, baseline_gaps = baseline_statistics(baseline)
    metrics = {}
    for metric in DEMO_FLOORS:
        current = metric_summary(current_rows, metric)
        previous = metric_summary(previous_rows, metric)
        reference = references.get(metric)
        weeks_complete = current["valid_days"] == previous["valid_days"] == 7
        metrics[metric] = {
            "unit": LABELS[metric][1],
            "current": current,
            "previous": previous,
            "baseline": reference,
            "change_from_previous_week": (
                round(current["median"] - previous["median"], 3) if weeks_complete else None
            ),
            "change_from_baseline": (
                round(current["median"] - reference["median"], 3)
                if current["median"] is not None and reference is not None else None
            ),
            "weekly_comparison": "complete" if weeks_complete else "insufficient_data",
        }
    return {
        "astronaut_id": baseline[-1]["astronaut_id"],
        "statistic": "median",
        "current_period": period_summary(current_rows, start, end),
        "previous_period": period_summary(previous_rows, previous_start, previous_end),
        "data_completeness": (
            "complete" if not baseline_gaps and all(
                metric["weekly_comparison"] == "complete" for metric in metrics.values()
            ) else "partial"
        ),
        "metrics": metrics,
        "baseline_gaps": baseline_gaps,
        "limitations": [
            "Descriptive demo statistics, not a medical assessment.",
            "Partial-week medians and baseline differences describe available days only.",
            "Week-to-week changes require seven measured days in each period.",
            "The frozen baseline is never updated or used to fill missing report days.",
        ],
    }


def print_weekly_report(report):
    print("WEEKLY SUMMARY - DESCRIPTIVE DEMO")
    for key, label in (("current_period", "Current"), ("previous_period", "Previous")):
        period = report[key]
        print(f"{label}: {period['start']} to {period['end']} "
              f"({period['recorded_days']}/7 check-in days)")
    print("All values below are medians. The original baseline stays fixed.")
    if report["data_completeness"] == "partial":
        print("Incomplete data: partial medians describe available days only. "
              "Week-to-week changes need 7 measured days in both periods.")
    for metric, item in report["metrics"].items():
        label, unit = LABELS[metric]
        current, previous = item["current"], item["previous"]
        current_text = f"{current['median']:g}" if current["median"] is not None else "unavailable"
        previous_text = f"{previous['median']:g}" if previous["median"] is not None else "unavailable"
        print(f"- {label}: current {current_text} {unit} ({current['valid_days']}/7 days); "
              f"previous {previous_text} {unit} ({previous['valid_days']}/7 days)")
        weekly_delta = item["change_from_previous_week"]
        if weekly_delta is None:
            print("  Change vs previous week: unavailable (incomplete measured days).")
        else:
            if weekly_delta == 0:
                print("  Compared with the previous week, the median was unchanged.")
            else:
                direction = "increased" if weekly_delta > 0 else "decreased"
                delta_unit = unit[:-1] if abs(weekly_delta) == 1 and unit in ("hours", "points") else unit
                print(f"  Compared with the previous week, the median {direction} "
                      f"by {abs(weekly_delta):g} {delta_unit}.")
        baseline_delta = item["change_from_baseline"]
        if baseline_delta is None:
            print("  Change vs fixed baseline: unavailable (insufficient data).")
        else:
            qualifier = " (partial current period)" if current["valid_days"] < 7 else ""
            print(f"  Change vs fixed baseline: {baseline_delta:+g} {unit}{qualifier}.")
