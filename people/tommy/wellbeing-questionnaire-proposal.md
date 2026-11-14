# Daily wellbeing — ten-question product draft

Tommy requested this revision on 2026-11-15. It follows his earlier plan for roughly ten short daily questions, his later 1–10 decision and the PET-2 prompts. zt's quiet dashboard and separate private-support space remain the design basis. Newer session instructions supersede the older notes about readiness, gamification, guided physical measurements and five-point inputs.

## Evidence and limits

The [official WHO-5 overview](https://www.who.int/publications/m/item/who-ucn-msd-mhe-2024.01) describes a two-week, six-response wellbeing instrument. It informed domain coverage, but these daily 1–10 questions are **not WHO-5** and no WHO-5 score/cutoff is calculated. The team's draft is not a validated diagnostic instrument.

[NASA Behavioral Health & Performance](https://www.nasa.gov/reference/jsc-behavioral-health/) describes psychological support, behavioral assessment and fatigue-management work, including research under isolation and variable workloads. The [Inspiration4 primary study](https://www.nature.com/articles/s41586-024-07648-x) used an alertness/mood survey covering stress, exhaustion, workload and other experiences with 0–10 responses. PULSE's wording, 24-hour recall and 1–10 scale are a custom product choice, not a claim to reproduce that study's instrument.

## Prompts

All scale questions refer to the last 24 hours. Start unanswered. Allow skipping; absence is not zero. Do not combine answers into a readiness or clinical score.

| Field | Prompt | Anchors | Current persistence |
|---|---|---|---|
| mood | How was your mood? | 1 Very low – 10 Very good | Existing health API |
| stress | How stressed did you feel? | 1 Not at all – 10 Extremely | Existing health API |
| fatigue | How fatigued did you feel? | 1 Not at all – 10 Extremely | Existing health API |
| worry | How worried or anxious have you felt? | 1 Not at all – 10 Extremely | Session draft |
| focus | How easy was it to concentrate on your tasks? | 1 Very difficult – 10 Very easy | Session draft |
| motivation | How interested and motivated did you feel? | 1 Not at all – 10 Very much | Session draft |
| loneliness | How lonely or isolated did you feel? | 1 Not at all – 10 Extremely | Session draft |
| connection | How connected and supported did you feel by your crew? | 1 Not at all – 10 Very much | Session draft |
| workload | How demanding did your workload feel? | 1 Very light – 10 Extremely demanding | Session draft |
| supportWanted | Would you like a private conversation with a support professional? | Yes / No | Session draft; no request is transmitted |

The UI uses four small sections: Today, Focus, Crew and Support. The existing three fields keep their meanings and fixed comparison rules. The other seven answers are explicitly labelled drafts, stored only in the current tab/session for the current crew/day. They survive a reload but clear on sign-out/profile switch. They are not sent as journal text, appended to clinical reports, hidden inside existing fields or presented as backend-saved records. Human support remains available independently of a score.

## Next integration decision

The current contract accepts only the first three psychological fields. A full questionnaire record needs an explicitly versioned schema, author/clinician/psychologist visibility decision, retention policy and tests, reviewed through the protected contract process with the module owner. Until that is agreed, do not silently add seven fields to the health request or claim they are saved remotely. Tommy chose to build/review the questionnaire here first; the backend remains unchanged in this UI revision.

## Body interaction revision

The presentation now has 24 front and 26 back points, with anatomical left/right defined from the person's perspective. Each detailed location maps to an existing broad symptom area; the exact point, side and optional note are retained as readable text in the existing symptom note. Symptom codes, severity validation, red-flag/allergy decisions and permissions are unchanged. Overview points reveal a label only after a tap and hide it after three seconds. No new diagnostic logic is introduced.
