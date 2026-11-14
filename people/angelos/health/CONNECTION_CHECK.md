# Connection readiness check — 14 November 2026

Checked main `050422b` and Potest's pending PR #55 at `f4bac9d`.

## Independently verified

- Petros's corrected source PR #64 is merged. The default health module now reads
  the aligned canonical file from main on fresh initialization or explicit reset.
- All **70 main root checks pass**, including health/client/workout, stage-data,
  medicine wave 1, Petros workout-controller and shared-example checks. Ran the
  exact root package script with Node because npm is unavailable in this environment.
  Localhost client requests were exercised; no check was skipped.
- The earlier stage outcomes remain verified: c1 no changes, c3 six-day mood and
  three-day stress streaks with pulse-only gaps, c4 sleep reference 6.8 h and a
  three-day sleep-only change. Existing stored references require explicit reset
  to adopt the corrected source; no user session was reset during this check.
- Independently ran Potest's **3 companion integration checks** in a temporary
  detached checkout of his actual pending branch. They pass: latest own entry,
  missing/day/reset behavior, wrong-role/other-person/clinical-field refusals,
  and discarded in-flight replies after a session change. His consumed health
  module/client code matches main. Removed the temporary checkout afterwards.

## Still required for the joined app

1. Potest publishes/merges the companion work in PR #55 through his workflow.
   Its new crew-only route and browser adapter are present and tested on that
   branch, but are not yet on main. This is no longer just an unadapted prototype.
2. zt builds the common core and pages and mounts health, meds and companion
   with their shared session, UTC clock, durable per-module stores and reset.
   No `integration/onboard-app/` server or pages exist on main at this snapshot.
   zt's current UI-look branch still provides a visual prototype rather than
   evidence of completed API wiring.
3. Run the joined browser acceptance checklist in TEAM_NEXT_STEPS.md with zt,
   Potest and Angelos: save/reload/restart, two users, roles, reset, workout save
   and current-entry companion context. Passing component tests does not replace
   that page-level verification.

## Field mapping to retain during UI integration

zt's UI-look prototype now asks a separate 1-10 **sleep quality** question and
comments that sleep duration will come from wearables. Health accepts
`sleepHours` as the actual previous-24-hour duration (0-24 hours). Do not send
the quality score under that field. Wire a duration source or explicit synthetic
duration for the demo, and agree any additional quality field through the shared
contract if retained. This is an integration requirement, not an observed bad
request: the prototype has not been connected to health yet.

No health algorithm change was needed. Clinical history remains medical-only;
companion access to broader analysis still needs the existing shared decision.
No real sensor connection, completed onboard UI, or clinical validity is claimed.
