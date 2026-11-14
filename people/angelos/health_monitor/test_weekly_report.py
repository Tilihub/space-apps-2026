import copy
import io
import json
import unittest
from contextlib import redirect_stdout
from datetime import date, timedelta
from pathlib import Path

from weekly_report import build_weekly_report, print_weekly_report


class WeeklyReportTests(unittest.TestCase):
    def setUp(self):
        seed = json.loads(Path(__file__).with_name("demo_data.json").read_text())
        self.baseline = seed["baseline"]
        self.history = []
        for index in range(14):
            day = date(2026, 11, 8) + timedelta(days=index)
            self.history.append({
                "astronaut_id": "demo-001", "recorded_at": f"{day}T08:00:00+00:00",
                "resting_heart_rate_bpm": 62, "sleep_hours": 7.5 if index < 7 else 6.5,
                "mood": 7, "stress": 3, "fatigue": 3,
            })

    def test_full_weeks_compare_sleep_and_fixed_baseline(self):
        report = build_weekly_report(self.baseline, self.history)
        sleep = report["metrics"]["sleep_hours"]
        self.assertEqual(report["data_completeness"], "complete")
        self.assertEqual(sleep["current"]["median"], 6.5)
        self.assertEqual(sleep["previous"]["median"], 7.5)
        self.assertEqual(sleep["change_from_previous_week"], -1)
        self.assertEqual(sleep["baseline"]["median"], 7.8)
        self.assertEqual(sleep["change_from_baseline"], -1.3)
        output = io.StringIO()
        with redirect_stdout(output):
            print_weekly_report(report)
        self.assertIn("decreased by 1 hour.", output.getvalue())

    def test_windows_have_exact_nonoverlapping_calendar_boundaries(self):
        report = build_weekly_report(self.baseline, self.history)
        self.assertEqual(report["current_period"]["start"], "2026-11-15")
        self.assertEqual(report["current_period"]["end"], "2026-11-21")
        self.assertEqual(report["previous_period"]["start"], "2026-11-08")
        self.assertEqual(report["previous_period"]["end"], "2026-11-14")
        self.assertEqual(report["current_period"]["recorded_days"], 7)
        self.assertEqual(report["previous_period"]["recorded_days"], 7)

    def test_gaps_are_not_filled_with_older_records_or_baseline(self):
        self.history = [row for row in self.history
                        if row["recorded_at"][:10] not in ("2026-11-11", "2026-11-19")]
        report = build_weekly_report(self.baseline, self.history)
        sleep = report["metrics"]["sleep_hours"]
        self.assertEqual(sleep["current"]["valid_days"], 6)
        self.assertEqual(sleep["previous"]["valid_days"], 6)
        self.assertIsNone(sleep["change_from_previous_week"])
        self.assertEqual(sleep["change_from_baseline"], -1.3)
        self.assertEqual(report["data_completeness"], "partial")

    def test_missing_values_affect_only_their_own_comparison(self):
        self.history[-1]["sleep_hours"] = None
        report = build_weekly_report(self.baseline, self.history)
        self.assertEqual(report["current_period"]["recorded_days"], 7)
        self.assertEqual(report["metrics"]["sleep_hours"]["current"]["valid_days"], 6)
        self.assertIsNone(report["metrics"]["sleep_hours"]["change_from_previous_week"])
        self.assertEqual(report["metrics"]["stress"]["change_from_previous_week"], 0)

    def test_all_null_values_are_not_zero_or_complete_coverage(self):
        for row in self.history[-7:]:
            row["sleep_hours"] = None
        report = build_weekly_report(self.baseline, self.history)
        sleep = report["metrics"]["sleep_hours"]
        self.assertEqual(sleep["current"]["valid_days"], 0)
        self.assertIsNone(sleep["current"]["median"])
        self.assertIsNone(sleep["change_from_baseline"])
        self.assertIsNone(sleep["change_from_previous_week"])

    def test_initial_reference_does_not_fill_previous_week(self):
        report = build_weekly_report(self.baseline, self.history[:3])
        self.assertEqual(report["current_period"]["recorded_days"], 3)
        self.assertEqual(report["previous_period"]["recorded_days"], 0)
        self.assertIsNone(report["metrics"]["sleep_hours"]["previous"]["median"])

    def test_single_outlier_does_not_shift_weekly_median(self):
        self.history[-1]["sleep_hours"] = 12
        report = build_weekly_report(self.baseline, self.history)
        self.assertEqual(report["metrics"]["sleep_hours"]["current"]["median"], 6.5)

    def test_explicit_end_date_excludes_future_records(self):
        report = build_weekly_report(self.baseline, self.history, "2026-11-14")
        self.assertEqual(report["metrics"]["sleep_hours"]["current"]["median"], 7.5)
        self.assertEqual(report["previous_period"]["recorded_days"], 0)

    def test_empty_windows_return_unavailable_statistics(self):
        report = build_weekly_report(self.baseline, self.history, "2026-12-31")
        self.assertEqual(report["current_period"]["recorded_days"], 0)
        self.assertIsNone(report["metrics"]["sleep_hours"]["current"]["median"])

    def test_inadequate_baseline_remains_unavailable(self):
        report = build_weekly_report(self.baseline[:2], self.history)
        self.assertIsNone(report["metrics"]["sleep_hours"]["baseline"])
        self.assertIsNone(report["metrics"]["sleep_hours"]["change_from_baseline"])
        self.assertEqual(report["metrics"]["sleep_hours"]["change_from_previous_week"], -1)
        self.assertTrue(report["baseline_gaps"])

    def test_inputs_and_fixed_reference_are_not_modified(self):
        original = copy.deepcopy((self.baseline, self.history))
        build_weekly_report(self.baseline, self.history)
        self.assertEqual((self.baseline, self.history), original)

    def test_duplicate_days_and_mixed_subjects_are_rejected(self):
        for invalid in (self.history[-1], {**self.history[-1], "astronaut_id": "other"}):
            with self.subTest(invalid=invalid):
                with self.assertRaises(ValueError):
                    build_weekly_report(self.baseline, [*self.history, invalid])


if __name__ == "__main__":
    unittest.main()
