# angelos: my plan

My own planning. Only I edit this. The team's common plan is [shared/PLAN.md](../../shared/PLAN.md).

## My part

Prototype the personal comparison and companion logic described by angelos.
Sensor collection and input data are provided by other team members. The common
plan and integration contract still need team agreement.

## Tasks

- [x] Build a runnable Python core with synthetic daily records and frozen personal references.
- [x] Explain deviations, persistence, and missing data in structured output.
- [ ] Agree input fields, units, self-report scales, and daily aggregation with the other members.
- [x] Add a terminal form and local storage without changing the frozen baseline.
- [x] Add weekly medians, measured-day coverage, and comparisons to the previous week and fixed baseline.
- [ ] Add an API adapter for the app.
- [ ] Connect history and structured findings to a companion UI and conversation.
- [ ] Evaluate the analysis with suitable data before making any health-related claims.

## Ideas for the team

<!-- To get one adopted, propose it as a change to shared/PLAN.md (a pull request a teammate approves). -->

- Keep numeric analysis separate from conversational phrasing.
- Provide supportive explanations and transparent uncertainty; no medical diagnosis.
- Keep the original baseline fixed. Weekly summaries describe trends without
  replacing it; compare complete weeks and label partial data explicitly.
