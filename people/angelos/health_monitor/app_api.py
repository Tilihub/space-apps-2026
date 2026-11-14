"""ANG-1: local JSON adapter for the existing personal monitoring core."""

import argparse
import copy
import hmac
import json
import secrets
import sqlite3
from contextlib import closing, contextmanager
from datetime import timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

from check_in import CheckInStore, HERE
from monitor import DEMO_FLOORS, analyze, recorded_time


API_VERSION = "health-v1"
# Proposed mapping to zt/ui-skeleton's ?crew=1/2/3, pending owner agreement.
PROFILES = {
    "demo-001": {"ui_crew": "1", "label": "Astronaut A", "heart_shift": 0, "sleep_shift": 0},
    "demo-002": {"ui_crew": "2", "label": "Astronaut B", "heart_shift": 8, "sleep_shift": 0.5},
    "demo-003": {"ui_crew": "3", "label": "Astronaut C", "heart_shift": -4, "sleep_shift": -0.5},
}


def reject_nonfinite(value):
    raise ValueError("Nonfinite JSON numbers are unsupported.")


class ApiError(Exception):
    def __init__(self, status, code, message):
        super().__init__(message)
        self.status, self.code = status, code


def profile_seed(subject):
    """Explicitly synthetic copies, not imported astronaut observations."""
    raw = json.loads((HERE / "demo_data.json").read_text(encoding="utf-8"))
    seed = copy.deepcopy({"baseline": raw["baseline"], **raw["scenarios"]["changes"]})
    profile = PROFILES[subject]
    for row in [*seed["baseline"], *seed["recent"], seed["current"]]:
        row["astronaut_id"] = subject
        if row.get("resting_heart_rate_bpm") is not None:
            row["resting_heart_rate_bpm"] += profile["heart_shift"]
        if row.get("sleep_hours") is not None:
            row["sleep_hours"] = round(row["sleep_hours"] + profile["sleep_shift"], 3)
    return seed


class HealthService:
    """Token-bound demo identities, each backed by its own SQLite file."""

    def __init__(self, data_dir=HERE / "local_data", tokens=None):
        self.data_dir = Path(data_dir).resolve()
        self.tokens = (dict(tokens) if tokens is not None else
                       {subject: secrets.token_urlsafe(32) for subject in PROFILES})
        if set(self.tokens) != set(PROFILES) or any(
            not isinstance(token, str) or not token.isascii() or not token for token in self.tokens.values()
        ) or len(set(self.tokens.values())) != len(PROFILES):
            raise ValueError("Each configured demo profile needs a distinct nonempty ASCII token.")
        self.seeds = {subject: profile_seed(subject) for subject in PROFILES}
        for subject in PROFILES:
            with closing(CheckInStore(self.path_for(subject), seed_payload=self.seeds[subject])) as store:
                self._verify_subject(subject, store)

    def path_for(self, subject):
        if subject not in PROFILES:
            raise ApiError(403, "forbidden", "Unknown authenticated crew identity.")
        # Reuse the original CLI session for A; never derive paths from request IDs.
        filename = "check_ins.sqlite3" if subject == "demo-001" else f"{subject}.sqlite3"
        return self.data_dir / filename

    def identify(self, token):
        if isinstance(token, str) and token.isascii():
            for subject, expected in self.tokens.items():
                if hmac.compare_digest(token, expected):
                    return subject
        raise ApiError(401, "unauthorized", "A valid crew-specific bearer token is required.")

    @staticmethod
    def _verify_subject(subject, store):
        baseline, history = store.state()
        if not baseline or any(row.get("astronaut_id") != subject for row in [*baseline, *history]):
            raise ApiError(500, "store_mismatch", "The saved store does not match its crew identity.")
        return baseline, history

    @contextmanager
    def _store(self, token, write=False):
        subject = self.identify(token)
        with closing(CheckInStore(self.path_for(subject), read_only=not write, existing_only=write,
                                  seed_payload=self.seeds[subject])) as store:
            self._verify_subject(subject, store)
            yield subject, store

    @staticmethod
    def envelope(subject, data):
        return {"api_version": API_VERSION, "data_kind": "synthetic",
                "astronaut_id": subject, "data": data}

    def history(self, token):
        with self._store(token) as (subject, store):
            baseline, history = store.state()
            latest = max([*baseline, *history], key=recorded_time)
            next_day = recorded_time(latest).date() + timedelta(days=1)
            return self.envelope(subject, {"baseline": baseline, "check_ins": history,
                                           "next_mission_date": next_day.isoformat()})

    def daily(self, token):
        with self._store(token) as (subject, store):
            baseline, history = store.state()
            if not history:
                raise ApiError(404, "no_check_ins", "No saved check-ins are available.")
            ordered = sorted(history, key=recorded_time)
            return self.envelope(subject, analyze({"baseline": baseline,
                                                  "recent": ordered[:-1], "current": ordered[-1]}))

    def report(self, token):
        with self._store(token) as (subject, store):
            return self.envelope(subject, store.weekly_report())

    def submit(self, token, payload):
        subject = self.identify(token)
        if not isinstance(payload, dict):
            raise ApiError(400, "invalid_input", "The check-in must be a JSON object.")
        if payload.get("astronaut_id", subject) != subject:
            raise ApiError(403, "forbidden", "A check-in must belong to the authenticated crew member.")
        allowed = {"astronaut_id", "recorded_at", *DEMO_FLOORS}
        if set(payload) - allowed:
            raise ApiError(400, "unknown_fields", "The check-in contains unsupported fields.")
        row = {"astronaut_id": subject, "recorded_at": payload.get("recorded_at"),
               **{metric: payload.get(metric) for metric in DEMO_FLOORS}}
        with self._store(token, write=True) as (_, store):
            result = store.submit(row)
        return self.envelope(subject, {"saved_check_in": row, "daily": result})


def handler_for(service, allowed_origins=()):
    allowed_origins = frozenset(allowed_origins)

    class Handler(BaseHTTPRequestHandler):
        def _reply(self, status, body):
            content = json.dumps(body, allow_nan=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(content)))
            self.send_header("Cache-Control", "no-store")
            origin = self.headers.get("Origin")
            if origin in allowed_origins:
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Vary", "Origin")
                self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
                self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
            self.end_headers()
            self.wfile.write(content)

        def _dispatch(self, method):
            try:
                body = None
                if method == "POST":
                    self.connection.settimeout(5)
                    try:
                        length = int(self.headers.get("Content-Length", "0"))
                    except ValueError:
                        raise ApiError(400, "invalid_length", "A valid Content-Length is required.") from None
                    # Consume bounded small requests before an early rejection.
                    # Closing with unread bytes can discard the error response on Windows.
                    if 0 < length <= 65536:
                        body = self.rfile.read(length)
                    if not 0 < length <= 16384:
                        raise ApiError(413, "invalid_size", "The JSON body must be 1 to 16384 bytes.")
                    if len(body) != length:
                        raise ApiError(400, "incomplete_body", "The JSON request body is incomplete.")
                origin = self.headers.get("Origin")
                if origin is not None and origin not in allowed_origins:
                    raise ApiError(403, "origin_not_allowed", "This browser origin is not configured.")
                route = urlsplit(self.path)
                if route.query:
                    raise ApiError(400, "unexpected_query", "Identity is token-bound; query parameters are unsupported.")
                reads = {"/v1/me/history": service.history, "/v1/me/daily": service.daily,
                         "/v1/me/report": service.report}
                if method == "OPTIONS":
                    if route.path not in {*reads, "/v1/me/check-ins"}:
                        raise ApiError(404, "not_found", "Unknown endpoint.")
                    self._reply(200, {"api_version": API_VERSION})
                    return
                if method == "GET" and route.path == "/v1/health":
                    self._reply(200, {"api_version": API_VERSION, "mode": "local_synthetic_demo"})
                    return
                header = self.headers.get("Authorization", "")
                token = header[7:] if header.startswith("Bearer ") else None
                service.identify(token)
                if method == "GET" and route.path in reads:
                    self._reply(200, reads[route.path](token))
                elif method == "POST" and route.path == "/v1/me/check-ins":
                    if self.headers.get("Content-Type", "").split(";")[0].strip().lower() != "application/json":
                        raise ApiError(415, "unsupported_media_type", "Use application/json.")
                    payload = json.loads(body.decode("utf-8"), parse_constant=reject_nonfinite)
                    self._reply(201, service.submit(token, payload))
                else:
                    raise ApiError(404, "not_found", "Unknown endpoint or method.")
            except ApiError as exc:
                self._reply(exc.status, {"api_version": API_VERSION,
                                        "error": {"code": exc.code, "message": str(exc)}})
            except (ValueError, TypeError, OverflowError) as exc:
                self._reply(400, {"api_version": API_VERSION,
                                  "error": {"code": "invalid_input", "message": str(exc)}})
            except (OSError, sqlite3.Error):
                self._reply(500, {"api_version": API_VERSION,
                                  "error": {"code": "storage_error", "message": "Local storage is unavailable."}})

        def do_GET(self):
            self._dispatch("GET")

        def do_POST(self):
            self._dispatch("POST")

        def do_OPTIONS(self):
            self._dispatch("OPTIONS")

    return Handler


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--data-dir", type=Path, default=HERE / "local_data")
    parser.add_argument("--allow-origin", action="append", default=[],
                        help="Allowed browser origin, e.g. http://127.0.0.1:5500; repeat as needed")
    args = parser.parse_args()
    if not 0 <= args.port <= 65535:
        parser.error("--port must be between 0 and 65535")
    service = HealthService(args.data_dir)
    with ThreadingHTTPServer(("127.0.0.1", args.port), handler_for(service, args.allow_origin)) as server:
        print(f"Local synthetic health API: http://127.0.0.1:{server.server_port}", flush=True)
        print("Developer demo credentials (not production login):", flush=True)
        for subject, token in service.tokens.items():
            print(f"  UI crew {PROFILES[subject]['ui_crew']} -> {subject}: {token}", flush=True)
        print("Ctrl+C stops the server. Existing check-ins stay saved.", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
