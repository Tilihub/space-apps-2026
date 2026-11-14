import copy
import json
import subprocess
import sys
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from unittest.mock import patch

from app_api import ApiError, HealthService
from check_in import CheckInStore
from history_input import load_personal_history
from monitor import baseline_statistics


HERE = Path(__file__).resolve().parent


class HistoryInputTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.folder = Path(self.temp.name)
        self.input = self.folder / "history.json"
        self.database = self.folder / "session.sqlite3"
        self.packet = json.loads((HERE / "examples" / "baseline_input.json").read_text())
        self.write()

    def write(self):
        self.input.write_text(json.dumps(self.packet), encoding="utf-8")

    def test_file_values_control_medians_without_code_changes(self):
        for row in self.packet["baseline"]:
            row["resting_heart_rate_bpm"] += 10
        self.write()
        with closing(CheckInStore(self.database, baseline_file=self.input)) as store:
            baseline, history = store.state()
            self.assertEqual(baseline_statistics(baseline)[0]["resting_heart_rate_bpm"]["median"], 71)
            self.assertEqual(history, [])
            self.assertEqual(store.source_info()["self_report_scale"], "1-10")
            report = store.weekly_report()
            self.assertEqual(report["current_period"]["recorded_days"], 0)
            self.assertIsNone(report["metrics"]["sleep_hours"]["current"]["median"])

    def test_cli_import_then_entry_works_without_original_demo_file(self):
        imported = subprocess.run(
            [sys.executable, str(HERE / "check_in.py"), "--database", str(self.database),
             "--baseline-file", str(self.input), "--import-only"],
            text=True, capture_output=True, check=False,
        )
        self.assertEqual(imported.returncode, 0, imported.stderr)
        self.assertIn("median 61", imported.stdout)
        entered = subprocess.run(
            [sys.executable, str(HERE / "check_in.py"), "--database", str(self.database)],
            input="\n62\n7.8\n7\n3\n3\n", text=True, capture_output=True, check=False,
        )
        self.assertEqual(entered.returncode, 0, entered.stderr)
        self.assertIn("Saved check-in for 2026-11-08", entered.stdout)
        self.assertIn("1-10 whole numbers", entered.stdout)
        with patch("check_in.Path.read_text", side_effect=OSError("source moved")):
            with closing(CheckInStore(self.database)) as store:
                self.assertEqual(len(store.state()[1]), 1)

    def test_fixed_reference_rejects_a_different_input_but_accepts_same_file(self):
        with closing(CheckInStore(self.database, baseline_file=self.input)) as store:
            before = copy.deepcopy(store.state())
        with closing(CheckInStore(self.database, baseline_file=self.input)) as store:
            self.assertEqual(store.state(), before)
        self.packet["baseline"][0]["sleep_hours"] = 9
        self.write()
        with self.assertRaisesRegex(ValueError, "fixed reference"):
            CheckInStore(self.database, baseline_file=self.input)
        with closing(CheckInStore(self.database, read_only=True)) as store:
            self.assertEqual(store.state(), before)

    def test_missing_values_remain_missing_with_metric_specific_reference_counts(self):
        for row in self.packet["baseline"]:
            del row["mood"]
        self.write()
        payload = load_personal_history(self.input)
        refs, gaps = baseline_statistics(payload["baseline"])
        self.assertNotIn("mood", refs)
        self.assertTrue(any("mood" in gap for gap in gaps))
        self.assertTrue(all(row["mood"] is None for row in payload["baseline"]))

    def test_invalid_imports_do_not_create_a_database(self):
        original = copy.deepcopy(self.packet)
        for case in ("mixed_person", "duplicate_day", "wrong_units", "cohort", "exercise",
                     "bad_scale", "zero_in_one_to_ten", "fractional_scale", "non_utc",
                     "all_missing", "too_few", "journal", "overlapping_recent"):
            with self.subTest(case=case):
                self.packet = copy.deepcopy(original)
                if case == "mixed_person": self.packet["baseline"][0]["astronaut_id"] = "other"
                elif case == "duplicate_day": self.packet["baseline"][1]["recorded_at"] = self.packet["baseline"][0]["recorded_at"]
                elif case == "wrong_units": self.packet["units"]["sleep_hours"] = "minutes"
                elif case == "cohort": self.packet["source"]["observation_type"] = "cohort_mean"
                elif case == "exercise": self.packet["source"]["heart_rate_context"] = "exercise"
                elif case == "bad_scale": self.packet["source"]["self_report_scale"] = "1-5"
                elif case == "zero_in_one_to_ten": self.packet["baseline"][0]["mood"] = 0
                elif case == "fractional_scale": self.packet["baseline"][0]["stress"] = 2.5
                elif case == "non_utc": self.packet["baseline"][0]["recorded_at"] = "2026-11-01T08:00:00+02:00"
                elif case == "too_few": self.packet["baseline"] = self.packet["baseline"][:2]
                elif case == "journal": self.packet["baseline"][0]["journal"] = "private"
                elif case == "overlapping_recent": self.packet["recent"] = [copy.deepcopy(self.packet["baseline"][-1])]
                elif case == "all_missing":
                    for row in self.packet["baseline"]:
                        for key in ("resting_heart_rate_bpm", "sleep_hours", "mood", "stress", "fatigue"):
                            row[key] = None
                self.write()
                with self.assertRaises(ValueError):
                    CheckInStore(self.database, baseline_file=self.input)
                self.assertFalse(self.database.exists())

    def test_imported_scale_is_enforced_and_not_remapped_during_submission(self):
        with closing(CheckInStore(self.database, baseline_file=self.input)) as store:
            row = {"astronaut_id": "demo-001", "recorded_at": "2026-11-08T08:00:00Z",
                   "resting_heart_rate_bpm": 62, "sleep_hours": 7.8, "mood": 0}
            with self.assertRaises(ValueError):
                store.submit(row)
            self.assertEqual(store.state()[1], [])
            row["mood"] = 1
            store.submit(row)
            self.assertEqual(store.state()[1][0]["mood"], 1)

    def test_reset_uses_saved_import_snapshot_after_input_file_is_gone(self):
        with closing(CheckInStore(self.database, baseline_file=self.input)) as store:
            original = copy.deepcopy(store.state())
            store.submit({"astronaut_id": "demo-001", "recorded_at": "2026-11-08T08:00:00Z"})
        with patch("check_in.Path.read_text", side_effect=OSError("source moved")):
            with closing(CheckInStore(self.database, existing_only=True)) as store:
                reset = store.reset()
                self.assertEqual(store.state(), original)
                self.assertEqual(reset["initial_days"], 0)
                self.assertEqual(str(reset["next_day"]), "2026-11-08")
                self.assertTrue(reset["backup_path"].is_file())

    def test_api_recognizes_imported_synthetic_source_without_reseeding_it(self):
        target = self.folder / "api" / "check_ins.sqlite3"
        with closing(CheckInStore(target, baseline_file=self.input)) as store:
            baseline = copy.deepcopy(store.state()[0])
        service = HealthService(target.parent)
        response = service.history(service.tokens["demo-001"])
        self.assertEqual(response["data"]["baseline"], baseline)
        self.assertEqual(response["source"]["self_report_scale"], "1-10")
        self.assertEqual(response["data"]["check_ins"], [])

    def test_individual_history_is_not_exposed_by_legacy_demo_http_service(self):
        self.packet["source"]["kind"] = "individual_history"
        self.write()
        target = self.folder / "api" / "check_ins.sqlite3"
        with closing(CheckInStore(target, baseline_file=self.input)) as store:
            self.assertEqual(store.source_info()["kind"], "individual_history")
        with self.assertRaises(ApiError) as error:
            HealthService(target.parent)
        self.assertEqual(error.exception.status, 403)


if __name__ == "__main__":
    unittest.main()
