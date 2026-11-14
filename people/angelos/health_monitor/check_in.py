"""Enter and save a daily synthetic check-in using Python's standard library."""

import argparse
import copy
import json
import sqlite3
import sys
from contextlib import closing
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from uuid import uuid4

from monitor import analyze, print_result, recorded_time, validate, validate_measurement
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
    """One synthetic astronaut per database; a frozen reference and daily records."""

    def __init__(self, path, read_only=False, existing_only=False, seed_payload=None):
        path = Path(path).resolve()
        self.path = path
        self.seed_payload = copy.deepcopy(seed_payload)
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
                if self.connection.execute("SELECT id FROM baseline").fetchone() is None:
                    payload = self._seed()
                    baseline, recent, _ = validate(payload)
                    self.connection.execute("INSERT INTO baseline VALUES (1, ?)",
                                            (json.dumps(baseline, allow_nan=False),))
                    for row in recent:
                        self._insert(row)
        except Exception:
            self.connection.close()
            raise

    def close(self):
        self.connection.close()

    def _seed(self):
        if self.seed_payload is not None:
            return copy.deepcopy(self.seed_payload)
        seed = json.loads((HERE / "demo_data.json").read_text(encoding="utf-8"))
        return {"baseline": seed["baseline"], **seed["scenarios"]["changes"]}

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
            if not isinstance(seed_rows, list) or not seed_rows:
                raise ValueError("The initial demo check-ins must be a nonempty array.")
            saved_by_day = {recorded_time(row).date(): row for row in history}
            # Preserve stored original values when a seed date is already present.
            initial = [saved_by_day.get(recorded_time(row).date(), row) for row in seed_rows]
            initial.sort(key=recorded_time)
            validate({"baseline": baseline, "recent": initial[:-1], "current": initial[-1]})
            next_day = recorded_time(initial[-1]).date() + timedelta(days=1)
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
            result = analyze({"baseline": baseline, "recent": recent, "current": row})
            self._insert(row)
        return result


def collect_check_in(baseline, recent):
    latest = max([*baseline, *recent], key=recorded_time)
    latest_stamp = recorded_time(latest)
    next_day = latest_stamp.date() + timedelta(days=1)
    print(f"Synthetic astronaut: {latest['astronaut_id']}")
    print("Enter demo values only. Press Enter for a missing measure. Ctrl+C cancels.")
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
        while True:
            raw = input(f"{label}: ").strip()
            try:
                value = float(raw.replace(",", ".")) if raw else None
                validate_measurement(metric, value)
                row[metric] = value
                break
            except ValueError as exc:
                print(f"Invalid value: {exc}. Try again or press Enter to leave missing.")
    return row


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", type=Path,
                        default=HERE / "local_data" / "check_ins.sqlite3",
                        help="Local SQLite file (default: ignored local_data directory)")
    actions = parser.add_mutually_exclusive_group()
    actions.add_argument("--report", action="store_true",
                         help="Read the weekly report without adding a check-in")
    actions.add_argument("--reset", action="store_true",
                         help="Back up the session and restore only the initial demo check-ins")
    parser.add_argument("--json", action="store_true",
                        help="Print structured output (requires --report)")
    args = parser.parse_args()
    if args.json and not args.report:
        parser.error("--json requires --report")
    store = None
    saved = False
    try:
        if (args.report or args.reset) and not args.database.is_file():
            raise ValueError("No saved database found. Enter a check-in first.")
        store = CheckInStore(args.database, read_only=args.report, existing_only=args.reset)
        if args.reset:
            reset_result = store.reset()
        elif args.report:
            report = store.weekly_report()
        else:
            baseline, recent = store.state()
            row = collect_check_in(baseline, recent)
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
