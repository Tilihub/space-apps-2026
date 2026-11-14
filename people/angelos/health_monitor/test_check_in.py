import copy
import io
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from contextlib import redirect_stdout

from check_in import CheckInStore, collect_check_in, main


HERE = Path(__file__).resolve().parent


class CheckInTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "check_ins.sqlite3"
        self.store = CheckInStore(self.path)
        self.addCleanup(self.store.close)

    def row(self, day="2026-11-14"):
        return {
            "astronaut_id": "demo-001", "recorded_at": day + "T08:00:00+00:00",
            "resting_heart_rate_bpm": 77, "sleep_hours": 5.5,
            "mood": 4, "stress": 7, "fatigue": 7,
        }

    def test_reopen_retains_history_and_reference(self):
        baseline, _ = self.store.state()
        result = self.store.submit(self.row())
        self.assertEqual(result["findings"][0]["consecutive_flagged_days"], 3)
        other = CheckInStore(self.path)
        self.addCleanup(other.close)
        saved_baseline, saved_recent = other.state()
        self.assertEqual(saved_baseline, baseline)
        self.assertEqual(len(saved_recent), 3)
        self.assertEqual(saved_recent[-1], self.row())
        tomorrow = other.submit(self.row("2026-11-15"))
        self.assertEqual(tomorrow["findings"][0]["consecutive_flagged_days"], 4)

    def test_duplicate_day_is_rejected_without_overwriting(self):
        self.store.submit(self.row())
        previous = copy.deepcopy(self.store.state())
        with self.assertRaises(ValueError):
            self.store.submit({**self.row(), "stress": 0})
        self.assertEqual(self.store.state(), previous)

    def test_invalid_record_cannot_change_storage(self):
        before = copy.deepcopy(self.store.state())
        for change in ({"fatigue": 12}, {"astronaut_id": "another"},
                       {"recorded_at": "2026-11-10T08:00:00+00:00"}):
            with self.subTest(change=change):
                with self.assertRaises(ValueError):
                    self.store.submit({**self.row(), **change})
                self.assertEqual(self.store.state(), before)

    def test_collection_retries_invalid_values_and_keeps_missing(self):
        baseline, recent = self.store.state()
        answers = ["2026-11-12", "bad-date", "", "nan", "62", "7,5", "11", "7", "", "3"]
        with patch("builtins.input", side_effect=answers), patch("builtins.print"):
            row = collect_check_in(baseline, recent)
        self.assertEqual(row["recorded_at"], "2026-11-14T08:00:00+00:00")
        self.assertEqual(row["sleep_hours"], 7.5)
        self.assertIsNone(row["stress"])

    def test_cli_saves_two_days_and_reuses_history(self):
        for day in ("2026-11-14", "2026-11-15"):
            result = subprocess.run(
                [sys.executable, str(HERE / "check_in.py"), "--database", str(self.path)],
                input="\n77\n5.5\n4\n7\n7\n", text=True, capture_output=True, check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn(f"Saved check-in for {day}", result.stdout)
            self.assertIn("WEEKLY SUMMARY", result.stdout)
        self.assertIn("4 consecutive check-in day(s)", result.stdout)
        self.assertEqual(len(self.store.state()[1]), 4)

    def test_cancelled_cli_does_not_save_partial_check_in(self):
        before = self.store.state()
        result = subprocess.run(
            [sys.executable, str(HERE / "check_in.py"), "--database", str(self.path)],
            input="\n62\n", text=True, capture_output=True, check=False,
        )
        self.assertEqual(result.returncode, 130)
        self.assertIn("No new check-in was saved", result.stdout)
        self.assertEqual(self.store.state(), before)

    def test_report_only_cli_is_read_only_and_valid_json(self):
        self.store.submit(self.row())
        before = self.path.read_bytes()
        result = subprocess.run(
            [sys.executable, str(HERE / "check_in.py"), "--database", str(self.path),
             "--report", "--json"], text=True, capture_output=True, check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report["current_period"]["recorded_days"], 3)
        self.assertEqual(report["metrics"]["sleep_hours"]["baseline"]["median"], 7.8)
        self.assertEqual(self.path.read_bytes(), before)

    def test_report_does_not_create_a_missing_database(self):
        missing = Path(self.temp.name) / "absent" / "new.sqlite3"
        result = subprocess.run(
            [sys.executable, str(HERE / "check_in.py"), "--database", str(missing), "--report"],
            text=True, capture_output=True, check=False,
        )
        self.assertEqual(result.returncode, 2)
        self.assertIn("No saved database", result.stderr)
        self.assertFalse(missing.parent.exists())

    def test_interruption_after_commit_reports_that_record_was_saved(self):
        output = io.StringIO()
        with patch("sys.argv", ["check_in.py", "--database", str(self.path)]), \
                patch("builtins.input", side_effect=["", "77", "5.5", "4", "7", "7"]), \
                patch("check_in.CheckInStore.weekly_report", side_effect=KeyboardInterrupt), \
                redirect_stdout(output):
            self.assertEqual(main(), 130)
        self.assertIn("check-in was already saved", output.getvalue())
        self.assertNotIn("No new check-in was saved", output.getvalue())
        self.assertEqual(len(self.store.state()[1]), 3)


if __name__ == "__main__":
    unittest.main()
