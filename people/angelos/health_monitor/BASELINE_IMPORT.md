# External personal-history input

The baseline reader is ready without the final data. The caller selects a JSON
file; Python reads its observations, validates them and calculates the same fixed
median reference. This path does not generate observations or use the hardcoded
demo profile shifts. The included file is explicitly synthetic practice data.

## Try it now

Run from the repository root:

```powershell
python people/angelos/health_monitor/check_in.py --baseline-file people/angelos/health_monitor/examples/baseline_input.json --import-only
```

This creates `people/angelos/health_monitor/local_data/imported.sqlite3`, prints
the medians, counts and source, and exits without requesting new measurements.
It leaves the original `local_data/check_ins.sqlite3` session in place.

To enter a new check-in using the imported reference:

```powershell
python people/angelos/health_monitor/check_in.py --database people/angelos/health_monitor/local_data/imported.sqlite3
```

Alternatively, omit `--import-only` from the first command to import and open the
form in one run. The example has reference days 1–7 November and no recent records,
so the first proposed check-in date is 8 November 2026. No 12/13 November demo rows
are added to imported sessions unless they are explicitly present in the file.

The usual `--report` and backed-up `--reset` actions work with `--database` pointing
to this imported session. Reset retains its reference and restores its own initial
recent rows (none in the example), not the original demo_data.json rows.

## When the selected data arrives

Have the data owner export the same `personal-history-v1` structure as
[examples/baseline_input.json](examples/baseline_input.json). Then supply its path
with `--baseline-file` and choose a **new** `--database` for that initial history:

```powershell
python people/angelos/health_monitor/check_in.py --baseline-file people/angelos/health_monitor/local_data/incoming/history.json --database people/angelos/health_monitor/local_data/selected-history.sqlite3 --import-only
```

The incoming path in this second example is a placeholder for the supplied file.
No code changes are needed when the replacement file follows the documented format.
Keep actual personal information in ignored local storage, never in the public repo.

Reopening the same file/database is supported. A different initial packet is
rejected for an existing database, even if the crew ID matches. This protects the
fixed reference; choose a different database filename for a different reference.
Import does not overwrite another session or silently replace its baseline.

## JSON format: personal-history-v1

Required root fields: `schema_version`, `astronaut_id`, `source`, `units`, `baseline`.
`recent` is optional and defaults to an empty list. Unknown root/record fields fail.

- `schema_version`: exactly `personal-history-v1`.
- `astronaut_id`: one nonempty personal identity. A record can omit this field;
  if included, it must match the root ID. People are never merged or relabelled.
- `source.kind`: `synthetic` or `individual_history`.
- `source.label`: a nonempty source description.
- `source.observation_type`: exactly `individual_daily`; cohort summaries are not
  accepted by this input contract.
- `source.heart_rate_context`: exactly `rest`.
- `source.self_report_scale`: `1-10` (whole-number mood/stress/fatigue) or explicitly
  labelled legacy `0-10`. Values are never converted, offset or clamped. Imported
  1–10 sessions enforce that same scale on later check-ins.
- `units`: exactly the mapping in the example: heart rate in `bpm`, sleep in `hours`,
  and each self-report in `points`.
- `baseline`: daily records, with the existing five measure names and an explicit
  UTC `recorded_at`. At least one measure needs five valid days for this engineering
  demo to have a computable reference. Seven is not a required count.
- `recent`: optional later records in the same format/scale, after all baseline
  dates. These are initial history only and do not enter the reference calculation.

Every record can contain `recorded_at`, `astronaut_id`, `resting_heart_rate_bpm`,
`sleep_hours`, `mood`, `stress` and `fatigue` only. Missing metrics may be omitted or
`null`; they stay missing. Duplicated mission dates, mixed people, invalid values,
nonfinite numbers, non-UTC times and overlapping baseline/recent dates are rejected.
References with too few values for a particular metric are explicitly unavailable;
other available measures can still be compared. Entirely unusable references fail.

These checks validate structure and declared context. They cannot prove that a
dataset is representative or clinically suitable. Reference selection, permissions
and source verification remain the data owner's responsibility; the thresholds
and minimum sample count remain unvalidated demo settings.

## Persistence and compatibility

SQLite stores the original normalized packet in `initial_state`, alongside the
reference and recent records. It includes source, units and scale. Later runs and
reset use this saved packet; the input file need not remain at its original path.
The baseline never incorporates subsequent check-ins. Existing legacy databases
remain supported without changing their stored reference or self-report values.

`history_input.py` is the standalone reader/validator. `CheckInStore` also accepts
`baseline_file=Path(...)` for initialization by trusted local application code.
It rejects invalid files before creating the destination database.

The old `health-v1` HTTP adapter can use imported **synthetic** stores for its known
demo IDs and includes their source declaration in responses. It refuses
`individual_history` stores: the old demo tokens are not an agreed clinical-role
authorization layer. Local import/check-in/report commands can process the declared
personal history without publishing it through that HTTP prototype.

zt's new proposed Node.js app contract (`zt/app-contract`, PR #49) uses camelCase,
`c1`–`c5`, one mission clock and a different module boundary. This importer does not
claim conformance to that pending contract or silently convert its `health.json`.
The selected PET-1 package needs a documented mapping/export for this reader, or
the eventual new health module needs a reader for the approved shared format.
The new role/analysis-visibility requirements likewise remain integration work;
adding this local import does not decide them or change another member's files.

## Verification

Run the existing unittest command in the README. Import checks use temporary files
and databases. They cover changed file values, actual CLI import/entry, fixed
references, invalid-file rejection, source/scale labels, gaps, reset after moving
the source file, synthetic API compatibility and local-only personal history.
