# angelos: my plan

My own planning. Only I edit this. The team's common plan is [shared/PLAN.md](../../shared/PLAN.md).

## My part

Build the personal comparison and app-facing health module. Sensor collection
and input data are provided by other team members. Follow the approved shared
Node.js module contract. Angelos assigned step 3 (companion responses) to Potest
in this chat; this is a user handoff to reconcile with zt's older owner table,
not an edit to the protected team contract.

## Tasks

- [x] Build a runnable Python core with synthetic daily records and frozen personal references.
- [x] Explain deviations, persistence, and missing data in structured output.
- [ ] Agree input fields, units, self-report scales, and daily aggregation with the other members.
- [x] Add a terminal form and local storage without changing the frozen baseline.
- [x] Add weekly medians, measured-day coverage, and comparisons to the previous week and fixed baseline.
- [x] Add an explicit session reset with automatic backup and a retained personal baseline.
- [x] ANG-1: build an app-facing API adapter and JavaScript client with isolated demo crew stores.
- [x] Read external personal-history JSON and persist its fixed baseline/source/scale with a runnable synthetic example.
- [x] ANG-1: port the comparison into the shared Node module interface, using c1-c5, UTC mission time and 1-10 integer self-reports.
- [x] Receive app check-ins and enforce own-entry versus medical-analysis access on the server.
- [ ] ANG-1: zt imports the module into the core and connects the form; verify the joined save/reload path.
- [ ] Petros publishes the updated canonical fixture matching the accepted demo cases; reset a fresh demo and verify the exact scenario.
- [ ] Coordinate the user's Potest companion handoff with zt; keep companion work out of this health module.
- [ ] Evaluate the analysis with suitable data before making any health-related claims.

## Ideas for the team

<!-- To get one adopted, propose it as a change to shared/PLAN.md (a pull request a teammate approves). -->

- Keep numeric analysis separate from conversational phrasing.
- Provide supportive explanations and transparent uncertainty; no medical diagnosis.
- Keep the original baseline fixed. Weekly summaries describe trends without
  replacing it; compare complete weeks and label partial data explicitly.
