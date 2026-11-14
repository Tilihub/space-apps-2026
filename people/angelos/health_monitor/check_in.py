"""Enter and save a daily synthetic check-in using Python's standard library."""

import argparse
import json
import sqlite3
import sys
from datetime import date, datetime, time, timedelta
from pathlib import Path

from monitor import analyze, print_result, recorded_time, validate, validate_measurement


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

    def __init__(self, path):
        path = Path(path)
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
                    seed = json.loads((HERE / "demo_data.json").read_text(encoding="utf-8"))
                    payload = {"baseline": seed["baseline"], **seed["scenarios"]["changes"]}
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
    args = parser.parse_args()
    store = None
    try:
        store = CheckInStore(args.database)
        baseline, recent = store.state()
        row = collect_check_in(baseline, recent)
        result = store.submit(row)
    except (EOFError, KeyboardInterrupt):
        print("\nCancelled. No new check-in was saved.")
        return 130
    except (OSError, ValueError, TypeError, KeyError, sqlite3.Error) as exc:
        print(f"Check-in error: {exc}", file=sys.stderr)
        return 2
    finally:
        if store is not None:
            store.close()
    print()
    print_result(result)
    print(f"Saved check-in for {row['recorded_at'][:10]} to {args.database.resolve()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
