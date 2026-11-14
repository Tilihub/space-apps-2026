import copy
import json
import unittest
from pathlib import Path

from monitor import analyze


class MonitorTests(unittest.TestCase):
    def setUp(self):
        self.data = json.loads(Path(__file__).with_name("demo_data.json").read_text())

    def payload(self, name="changes"):
        payload = copy.deepcopy({"baseline": self.data["baseline"],
                                 **self.data["scenarios"][name]})
        # Keep this test case stable while the user experiments with the demo file.
        if name == "changes":
            payload["current"]["resting_heart_rate_bpm"] = 77
        return payload

    def test_usual_is_not_a_health_clearance(self):
        result = analyze(self.payload("usual"))
        self.assertEqual(result["status"], "no_demo_deviation")
        self.assertIn("does not establish", result["assistant_message"])

    def test_persistent_changes_include_evidence(self):
        result = analyze(self.payload())
        heart = next(f for f in result["findings"] if f["metric"] == "resting_heart_rate_bpm")
        self.assertEqual(result["status"], "review_suggested")
        self.assertEqual(heart["delta"], 16)
        self.assertEqual(heart["consecutive_flagged_days"], 3)

    def test_missing_is_not_replaced_by_zero(self):
        result = analyze(self.payload("missing"))
        self.assertEqual(result["status"], "insufficient_data")
        self.assertEqual(len(result["data_gaps"]), 3)
        self.assertEqual(result["findings"], [])

    def test_changes_and_missing_data_are_both_reported(self):
        payload = self.payload()
        payload["current"]["sleep_hours"] = None
        result = analyze(payload)
        self.assertEqual(result["status"], "review_suggested")
        self.assertEqual(result["data_completeness"], "partial")

    def test_recent_changes_do_not_redefine_baseline(self):
        payload = self.payload()
        original = copy.deepcopy(payload)
        payload["recent"][0]["resting_heart_rate_bpm"] = 200
        result = analyze(payload)
        self.assertEqual(result["reference"]["resting_heart_rate_bpm"]["median"], 61)
        payload["recent"][0]["resting_heart_rate_bpm"] = 74
        self.assertEqual(payload, original)

    def test_sparse_baseline_cannot_produce_complete_comparison(self):
        payload = self.payload("usual")
        payload["baseline"] = payload["baseline"][:2]
        self.assertEqual(analyze(payload)["status"], "insufficient_data")

    def test_calendar_gap_breaks_persistence(self):
        payload = self.payload()
        payload["recent"][-1]["recorded_at"] = "2026-11-11T08:00:00+00:00"
        result = analyze(payload)
        self.assertTrue(all(f["consecutive_flagged_days"] == 1 for f in result["findings"]))

    def test_opposite_direction_breaks_persistence(self):
        payload = self.payload()
        payload["recent"][-1]["resting_heart_rate_bpm"] = 45
        result = analyze(payload)
        heart = next(f for f in result["findings"] if f["metric"] == "resting_heart_rate_bpm")
        self.assertEqual(heart["consecutive_flagged_days"], 1)

    def test_invalid_measurements_are_rejected(self):
        for field, value in [("mood", 11), ("stress", True), ("sleep_hours", -1),
                             ("resting_heart_rate_bpm", float("nan")), ("fatigue", "7")]:
            with self.subTest(field=field, value=value):
                payload = self.payload()
                payload["current"][field] = value
                with self.assertRaises(ValueError):
                    analyze(payload)

    def test_subject_time_and_reference_contamination_are_rejected(self):
        cases = [("astronaut_id", "someone-else"),
                 ("recorded_at", "2026-11-14T08:00:00+00:00"),
                 ("recorded_at", "2026-11-01T08:00:00"),
                 ("recorded_at", "2026-11-12T09:00:00+00:00"),
                 ("recorded_at", "2026-11-01T08:00:00+02:00")]
        for field, value in cases:
            with self.subTest(field=field, value=value):
                payload = self.payload()
                payload["baseline"][0][field] = value
                with self.assertRaises(ValueError):
                    analyze(payload)


if __name__ == "__main__":
    unittest.main()
