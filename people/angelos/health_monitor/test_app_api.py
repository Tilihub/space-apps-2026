import copy
import http.client
import json
import os
import shutil
import subprocess
import tempfile
import threading
import unittest
from contextlib import closing
from pathlib import Path
from http.server import ThreadingHTTPServer

from app_api import ApiError, HealthService, handler_for
from check_in import CheckInStore


HERE = Path(__file__).resolve().parent


def check_in(subject="demo-001", day="2026-11-14"):
    return {"astronaut_id": subject, "recorded_at": day + "T08:00:00+00:00",
            "resting_heart_rate_bpm": 62, "sleep_hours": 7.8,
            "mood": 7, "stress": 3, "fatigue": 3}


class ServiceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.service = HealthService(self.temp.name)
        self.a = self.service.tokens["demo-001"]
        self.b = self.service.tokens["demo-002"]

    def test_submitting_for_a_retains_a_baseline_and_does_not_change_b(self):
        before_a = self.service.history(self.a)["data"]
        before_b = self.service.history(self.b)
        result = self.service.submit(self.a, check_in())
        self.assertEqual(result["data"]["daily"]["status"], "no_demo_deviation")
        after_a = self.service.history(self.a)["data"]
        self.assertEqual(len(after_a["check_ins"]), 3)
        self.assertEqual(after_a["baseline"], before_a["baseline"])
        self.assertEqual(self.service.history(self.b), before_b)
        self.assertNotEqual(after_a["baseline"][0]["resting_heart_rate_bpm"],
                            before_b["data"]["baseline"][0]["resting_heart_rate_bpm"])

    def test_identity_and_data_isolation_survive_restart(self):
        self.service.submit(self.a, check_in())
        expected = self.service.history(self.a)
        restarted = HealthService(self.temp.name)
        self.assertEqual(restarted.history(restarted.tokens["demo-001"]), expected)
        self.assertEqual(len(restarted.history(restarted.tokens["demo-002"])["data"]["check_ins"]), 2)
        with self.assertRaises(ApiError):
            restarted.history(self.a)

    def test_b_cannot_submit_for_a_or_obtain_a_from_its_own_history(self):
        before_a = self.service.history(self.a)
        before_b = self.service.history(self.b)
        with self.assertRaises(ApiError) as error:
            self.service.submit(self.b, check_in())
        self.assertEqual(error.exception.status, 403)
        self.assertEqual(self.service.history(self.a), before_a)
        self.assertEqual(self.service.history(self.b), before_b)
        rows_b = [*before_b["data"]["baseline"], *before_b["data"]["check_ins"]]
        self.assertTrue(all(row["astronaut_id"] == "demo-002" for row in rows_b))

    def test_missing_measure_stays_null_and_is_reported(self):
        row = check_in()
        del row["sleep_hours"]
        result = self.service.submit(self.a, row)
        self.assertIsNone(result["data"]["saved_check_in"]["sleep_hours"])
        self.assertEqual(result["data"]["daily"]["data_completeness"], "partial")
        self.assertEqual(self.service.report(self.a)["data"]["metrics"]["sleep_hours"]["current"]["valid_days"], 2)

    def test_custom_profile_reset_preserves_its_own_reference(self):
        with closing(CheckInStore(self.service.path_for("demo-002"), existing_only=True,
                                  seed_payload=self.service.seeds["demo-002"])) as store:
            before = copy.deepcopy(store.state())
            store.submit(check_in("demo-002"))
            store.reset()
            self.assertEqual(store.state(), before)

    def test_published_input_output_example_matches_service(self):
        example = json.loads((HERE / "api_example.json").read_text(encoding="utf-8"))
        response = self.service.submit(self.a, example["request"]["body"])
        self.assertEqual(response, example["response"])
        self.assertEqual(response["api_version"], example["api_version"])


class HttpTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.service = HealthService(self.temp.name)
        self.a = self.service.tokens["demo-001"]
        self.b = self.service.tokens["demo-002"]

        class QuietHandler(handler_for(self.service, ["http://localhost:5500"])):
            def log_message(self, *args):
                pass

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), QuietHandler)
        self.thread = threading.Thread(target=lambda: self.server.serve_forever(poll_interval=0.01),
                                       daemon=True)
        self.thread.start()
        self.addCleanup(self.stop_server)

    def stop_server(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)

    def request(self, method, path, token=None, payload=None, headers=None, raw=None):
        sent_headers = {"Authorization": f"Bearer {token}"} if token is not None else {}
        body = raw
        if payload is not None:
            body = json.dumps(payload).encode("utf-8")
        if body is not None:
            sent_headers["Content-Type"] = "application/json"
        sent_headers.update(headers or {})
        with closing(http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=5)) as conn:
            conn.request(method, path, body=body, headers=sent_headers)
            response = conn.getresponse()
            return response.status, dict(response.getheaders()), json.loads(response.read())

    def test_real_http_save_reload_daily_and_report(self):
        status, _, saved = self.request("POST", "/v1/me/check-ins", self.a, check_in())
        self.assertEqual(status, 201)
        self.assertEqual(saved["data"]["daily"]["status"], "no_demo_deviation")
        status, headers, history = self.request("GET", "/v1/me/history", self.a)
        self.assertEqual(status, 200)
        self.assertEqual(headers["Cache-Control"], "no-store")
        self.assertEqual(history["data"]["next_mission_date"], "2026-11-15")
        self.assertEqual(len(history["data"]["check_ins"]), 3)
        for route in ("daily", "report"):
            status, _, body = self.request("GET", f"/v1/me/{route}", self.a)
            self.assertEqual(status, 200)
            self.assertEqual(body["astronaut_id"], "demo-001")
        _, _, other = self.request("GET", "/v1/me/history", self.b)
        self.assertEqual(len(other["data"]["check_ins"]), 2)

    def test_unauthenticated_and_wrong_token_requests_cannot_read_or_write(self):
        for token in (None, self.a + "invalid"):
            with self.subTest(token_present=token is not None):
                for method, route, payload in (("GET", "/v1/me/history", None),
                                               ("POST", "/v1/me/check-ins", check_in())):
                    self.assertEqual(self.request(method, route, token, payload)[0], 401)

    def test_identity_cannot_be_overridden_by_body_query_or_path(self):
        self.assertEqual(self.request("POST", "/v1/me/check-ins", self.b, check_in())[0], 403)
        self.assertEqual(self.request("GET", "/v1/me/history?astronaut_id=demo-001", self.b)[0], 400)
        self.assertEqual(self.request("GET", "/v1/crew/demo-001/history", self.b)[0], 404)
        self.assertEqual(len(self.service.history(self.a)["data"]["check_ins"]), 2)

    def test_duplicate_and_invalid_check_ins_leave_history_unchanged(self):
        self.service.submit(self.a, check_in())
        before = self.service.history(self.a)
        for row in (check_in(), {**check_in(day="2026-11-15"), "stress": 11},
                    {**check_in(day="2026-11-15"), "journal": "private demo note"},
                    {**check_in(day="2026-11-15"), "recorded_at": "2026-11-15T08:00:00+02:00"}):
            self.assertEqual(self.request("POST", "/v1/me/check-ins", self.a, row)[0], 400)
            self.assertEqual(self.service.history(self.a), before)

    def test_body_format_and_size_are_checked(self):
        self.assertEqual(self.request("POST", "/v1/me/check-ins", self.a, raw=b"{")[0], 400)
        self.assertEqual(self.request("POST", "/v1/me/check-ins", self.a, raw=b'{"mood":NaN}')[0], 400)
        self.assertEqual(self.request("POST", "/v1/me/check-ins", self.a, payload=[])[0], 400)
        self.assertEqual(self.request("POST", "/v1/me/check-ins", self.a,
                                      payload={"extra": "x" * 17000})[0], 413)
        self.assertEqual(self.request("POST", "/v1/me/check-ins", self.a, payload=check_in(),
                                      headers={"Content-Type": "text/plain"})[0], 415)

    def test_browser_preflight_and_origin_restrictions(self):
        origin = {"Origin": "http://localhost:5500"}
        status, headers, _ = self.request("OPTIONS", "/v1/me/check-ins", headers=origin)
        self.assertEqual(status, 200)
        self.assertEqual(headers["Access-Control-Allow-Origin"], origin["Origin"])
        status, _, _ = self.request("GET", "/v1/me/history", self.a,
                                    headers={"Origin": "http://unconfigured.invalid"})
        self.assertEqual(status, 403)

    def test_javascript_client_against_running_http_api(self):
        node = shutil.which("node")
        if node is None:
            self.skipTest("Node is optional; Python HTTP integration checks still run.")
        script = """
          import assert from 'node:assert/strict';
          const { createHealthClient } = await import(process.env.HEALTH_TEST_CLIENT);
          const client = createHealthClient({token: process.env.HEALTH_TEST_TOKEN,
                                             baseUrl: process.env.HEALTH_TEST_URL});
          const row = {recorded_at:'2026-11-14T08:00:00+00:00',
                       resting_heart_rate_bpm:62, sleep_hours:7.8, mood:7, stress:3, fatigue:3};
          assert.equal((await client.submitCheckIn(row)).data.daily.status, 'no_demo_deviation');
          assert.equal((await client.getHistory()).data.check_ins.length, 3);
          assert.equal((await client.getDaily()).astronaut_id, 'demo-001');
          assert.equal((await client.getWeeklyReport()).data.statistic, 'median');
          await assert.rejects(client.submitCheckIn({...row, astronaut_id:'demo-002'}),
                               error => error.status === 403);
          await assert.rejects(client.submitCheckIn({...row, stress:Infinity}), TypeError);
          assert.equal((await client.getHistory()).data.check_ins.length, 3);
        """
        result = subprocess.run([node, "--input-type=module", "-e", script], capture_output=True,
                                text=True, timeout=20, check=False,
                                env={**os.environ, "HEALTH_TEST_TOKEN": self.a,
                                     "HEALTH_TEST_CLIENT": (HERE / "health_client.mjs").as_uri(),
                                     "HEALTH_TEST_URL": f"http://127.0.0.1:{self.server.server_port}"})
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
