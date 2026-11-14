"""Enter daily check-ins or initialize a personal reference from a JSON file."""

import argparse
import copy
import json
import sqlite3
import sys
from contextlib import closing
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from uuid import uuid4

from monitor import (analyze, baseline_statistics, print_result, recorded_time,
                     validate_history, validate_measurement)
from history_input import load_personal_history, validate_self_reports
from weekly_report import build_weekly_report, print_weekly_report


HERE = Path(__file__).resolve().parent
PROMPTS = {
    "resting_heart_rate_bpm": "Resting heart rate (bpm)",
    "sleep_hours": "Sleep in the preceding 24 hours (0-24 hours)",
    "mood": "Mood (0-10, higher = better mood)",
    "stress": "Stress (0-10, higher = more stress)",
    "fatigue": "Fatigue (0-10, higher = more fatigue)",
}


class CheckInStore:
    """One astronaut per database; a frozen reference and daily records."""

    def __init__(self, path, read_only=False, existing_only=False, seed_payload=None, baseline_file=None):
        path = Path(path).resolve()
        self.path = path
        self.seed_payload = copy.deepcopy(seed_payload)
        if baseline_file is not None and (seed_payload is not None or read_only or existing_only):
            raise ValueError("A baseline file is only used for explicit initialization.")
        imported = load_personal_history(baseline_file) if baseline_file is not None else None
        if imported is not None:
            self.seed_payload = imported
        if read_only or existing_only:
            mode = "ro" if read_only else "rw"
            self.connection = sqlite3.connect(path.as_uri() + f"?mode={mode}", uri=True)
            return
        path.parent.mkdir(parents=True, exist_ok=True)
        self.connection = sqlite3.connect(path)
        try:
            with self.connection:
                self.connection.execute("BEGIN IMMEDIATE")
                self.connection.execute(
                    "CREATE TABLE IF NOT EXISTS baseline "
                    "(id INTEGER PRIMARY KEY CHECK (id = 1), records TEXT NOT NULL)"
                )
                self.connection.execute(
                    "CREATE TABLE IF NOT EXISTS check_ins "
                    "(mission_day TEXT PRIMARY KEY, record TEXT NOT NULL)"
                )
                self.connection.execute(
                    "CREATE TABLE IF NOT EXISTS initial_state "
                    "(id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL)"
                )
                if self.connection.execute("SELECT id FROM baseline").fetchone() is None:
                    payload = self._seed()
                    baseline, recent = validate_history(payload["baseline"], payload.get("recent", []))
                    self.connection.execute("INSERT INTO baseline VALUES (1, ?)",
                                            (json.dumps(baseline, allow_nan=False),))
                    for row in recent:
                        self._insert(row)
                    self.connection.execute("INSERT INTO initial_state VALUES (1, ?)",
                                            (json.dumps(payload, allow_nan=False),))
                elif imported is not None and self._initial_state() != imported:
                    raise ValueError("This database already has a fixed reference. Choose a new --database file.")
        except Exception:
            self.connection.close()
            raise

    def close(self):
        self.connection.close()

    def _seed(self):
        saved = self._initial_state()
        if saved is not None:
            return saved
        if self.seed_payload is not None:
            return copy.deepcopy(self.seed_payload)
        seed = json.loads((HERE / "demo_data.json").read_text(encoding="utf-8"))
        return {"baseline": seed["baseline"], **seed["scenarios"]["changes"]}

    def _initial_state(self):
        exists = self.connection.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='initial_state'"
        ).fetchone()
        if not exists:
            return None
        row = self.connection.execute("SELECT payload FROM initial_state WHERE id=1").fetchone()
        return json.loads(row[0]) if row else None

    def source_info(self):
        initial = self._initial_state()
        return initial.get("source") if initial else None

    def state(self):
        baseline_row = self.connection.execute("SELECT records FROM baseline WHERE id=1").fetchone()
        if baseline_row is None:
            raise ValueError("The database has no personal reference.")
        baseline = json.loads(baseline_row[0])
        recent = [json.loads(row[0]) for row in self.connection.execute(
            "SELECT record FROM check_ins ORDER BY mission_day"
        )]
        return baseline, recent

    def _insert(self, row):
        self.connection.execute("INSERT INTO check_ins VALUES (?, ?)", (
            recorded_time(row).date().isoformat(), json.dumps(row, allow_nan=False)
        ))

    def weekly_report(self):
        baseline, history = self.state()
        return build_weekly_report(baseline, history)

    def _backup(self):
        backup_dir = self.path.parent / "backups"
        backup_dir.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
        backup_path = backup_dir / f"{self.path.stem}-before-reset-{stamp}-{uuid4().hex[:8]}.sqlite3"
        partial_path = backup_path.with_suffix(".sqlite3.partial")
        # Incomplete copies keep a .partial suffix; completed names are unique.
        with partial_path.open("xb"):
            pass
        # A separate reader can copy the committed database while this store holds
        # the write reservation. Backing up the writing connection itself would wait.
        with closing(sqlite3.connect(self.path.as_uri() + "?mode=ro", uri=True)) as source:
            with closing(sqlite3.connect(partial_path)) as destination:
                source.backup(destination)
                if destination.execute("PRAGMA quick_check").fetchone()[0] != "ok":
                    raise sqlite3.DatabaseError("Backup verification failed; reset was not applied.")
        partial_path.rename(backup_path)
        return backup_path

    def reset(self):
        """Back up the session, retain the frozen baseline and restore seed days."""
        with self.connection:
            self.connection.execute("BEGIN IMMEDIATE")
            baseline, history = self.state()
            seed_rows = self._seed()["recent"]
            if not isinstance(seed_rows, list):
                raise ValueError("The initial check-ins must be an array.")
            saved_by_day = {recorded_time(row).date(): row for row in history}
            # Preserve stored original values when a seed date is already present.
            initial = [saved_by_day.get(recorded_time(row).date(), row) for row in seed_rows]
            _, initial = validate_history(baseline, initial)
            latest = max([*baseline, *initial], key=recorded_time)
            next_day = recorded_time(latest).date() + timedelta(days=1)
            backup_path = self._backup()
            self.connection.execute("DELETE FROM check_ins")
            for row in initial:
                self._insert(row)
        return {"backup_path": backup_path, "initial_days": len(initial), "next_day": next_day}

    def submit(self, row):
        # Lock before reading history so concurrent writers cannot lose a check-in.
        with self.connection:
            self.connection.execute("BEGIN IMMEDIATE")
            baseline, recent = self.state()
            source = self.source_info()
            if source is not None:
                validate_self_reports(row, source["self_report_scale"])
            result = analyze({"baseline": baseline, "recent": recent, "current": row})
            self._insert(row)
        return result


def collect_check_in(baseline, recent, source=None):
    latest = max([*baseline, *recent], key=recorded_time)
    latest_stamp = recorded_time(latest)
    next_day = latest_stamp.date() + timedelta(days=1)
    print(f"Astronaut: {latest['astronaut_id']}")
    if source is not None:
        print(f"Reference source: {source['label']} ({source['kind']}); self-reports: {source['self_report_scale']}.")
    print("Press Enter for a missing measure. Ctrl+C cancels. Demo inputs must stay synthetic.")
    print("The proposed date is the next simulated mission day, not your computer's date.")
    while True:
        raw = input(f"Mission date YYYY-MM-DD [{next_day.isoformat()}]: ").strip()
        try:
            chosen = date.fromisoformat(raw) if raw else next_day
            if chosen <= latest_stamp.date():
                raise ValueError("Choose a day after the latest saved check-in.")
            break
        except ValueError as exc:
            print(f"Invalid date: {exc}")
    row = {
        "astronaut_id": latest["astronaut_id"],
        "recorded_at": datetime.combine(chosen, time(8), tzinfo=latest_stamp.tzinfo).isoformat(),
    }
    for metric, label in PROMPTS.items():
        if source is not None and source["self_report_scale"] == "1-10":
            label = label.replace("0-10", "1-10 whole numbers")
        while True:
            raw = input(f"{label}: ").strip()
            try:
                value = float(raw.replace(",", ".")) if raw else None
                validate_measurement(metric, value)
                if source is not None:
                    validate_self_reports({metric: value}, source["self_report_scale"])
                row[metric] = value
                break
            except ValueError as exc:
                print(f"Invalid value: {exc}. Try again or press Enter to leave missing.")
    return row


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", type=Path,
                        help="Local SQLite file; external-file sessions default to local_data/imported.sqlite3")
    parser.add_argument("--baseline-file", type=Path, help="Initialize from a personal-history-v1 JSON file")
    parser.add_argument("--import-only", action="store_true", help="Import the baseline, print its summary and exit")
    actions = parser.add_mutually_exclusive_group()
    actions.add_argument("--report", action="store_true",
                         help="Read the weekly report without adding a check-in")
    actions.add_argument("--reset", action="store_true",
                         help="Back up the session and restore only its initial check-ins")
    parser.add_argument("--json", action="store_true",
                        help="Print structured output (requires --report)")
    args = parser.parse_args()
    if args.json and not args.report:
        parser.error("--json requires --report")
    if args.import_only and args.baseline_file is None:
        parser.error("--import-only requires --baseline-file")
    if args.baseline_file is not None and (args.reset or args.report):
        parser.error("--baseline-file cannot be combined with --reset or --report")
    if args.database is None:
        name = "imported.sqlite3" if args.baseline_file is not None else "check_ins.sqlite3"
        args.database = HERE / "local_data" / name
    store = None
    saved = False
    try:
        if (args.report or args.reset) and not args.database.is_file():
            raise ValueError("No saved database found. Enter a check-in first.")
        store = CheckInStore(args.database, read_only=args.report, existing_only=args.reset,
                             baseline_file=args.baseline_file)
        if args.import_only:
            baseline, recent = store.state()
            reference, gaps = baseline_statistics(baseline)
            print(f"Imported reference for {baseline[0]['astronaut_id']}: {len(baseline)} reference days, "
                  f"{len(recent)} initial recent days.")
            print(f"Source: {store.source_info()}")
            for metric, item in reference.items():
                print(f"- {metric}: median {item['median']:g} ({item['sample_days']} days)")
            for gap in gaps:
                print(f"- Data gap: {gap}")
            print(f"Database: {args.database.resolve()}")
            return 0
        if args.reset:
            reset_result = store.reset()
        elif args.report:
            report = store.weekly_report()
        else:
            baseline, recent = store.state()
            row = collect_check_in(baseline, recent, store.source_info())
            result = store.submit(row)
            saved = True
            report = store.weekly_report()
    except (EOFError, KeyboardInterrupt):
        if args.reset:
            print("\nReset interrupted. Inspect the session before retrying.")
        elif saved:
            print("\nThe check-in was already saved. Run --report to view its weekly summary.")
        else:
            print("\nCancelled. No new check-in was saved.")
        return 130
    except (OSError, ValueError, TypeError, KeyError, sqlite3.Error) as exc:
        print(f"Check-in error: {exc}", file=sys.stderr)
        if saved:
            print("The check-in was saved, but its weekly summary could not be completed.",
                  file=sys.stderr)
        return 2
    finally:
        if store is not None:
            store.close()
    if args.reset:
        print("Reset complete. The original personal baseline is unchanged.")
        print(f"Restored {reset_result['initial_days']} initial demo check-in days.")
        print(f"Backup saved to {reset_result['backup_path']}")
        print(f"Next proposed mission date: {reset_result['next_day']}")
        return 0
    if args.json:
        print(json.dumps(report, indent=2, allow_nan=False))
    else:
        if not args.report:
            print()
            print_result(result)
            print(f"Saved check-in for {row['recorded_at'][:10]} to {args.database.resolve()}")
            print()
        print_weekly_report(report)
    return 0


if __name__ == "__main__":
    sys.exit(main())
