# Complete current PULSE demo — team handoff

Tommy asked on 2026-11-15 to publish the exact current app for everyone, retaining every feature, including the planned defibrillator. The reviewed visual snapshot is commit `5990f26` on `tommy/frontend-polish`. PR #74 now targets main directly and contains both the functional integration from #73 and the entire subsequent UI. No merge has been performed. Do not cherry-pick isolated screens or replace the module registry with main's older example registry.

## Get the complete version

After PR #74 merges, use the updated main. While its teammate review is pending, create your own review branch from the complete published app branch:

```sh
git fetch origin
git switch -c YOURNAME/review-complete-demo origin/tommy/frontend-polish
```

Use your own name and a fresh branch name. Preserve existing local work before switching. Node.js 24 and Python 3 must be on PATH for all repository tests; the app itself uses Node and no npm packages.

```sh
npm test
PORT=8000 PULSE_DATA_DIR=/absolute/path/to/a/new-demo-store node integration/onboard-app/start.js
```

In a second terminal, from the same checkout:

```sh
node integration/onboard-app/demo/seed-presentation.mjs http://localhost:8000
```

Open http://localhost:8000/. Use a genuinely new store on mission day 42 for these populated presentation profiles. The seeder refuses to overwrite today's existing check-ins. For an existing populated demo, start the server with its existing data directory and skip seeding; never reset someone else's active demo. Every computer has its own local store unless everyone connects to the same running server. Tommy's local tokens, notes, incident history and temporary stores are not published. Reproducible synthetic profile inputs are tracked in the existing seeder and Petros's fixtures.

## Included app surfaces and connections

| Surface | Current delivered version |
|---|---|
| Entry and navigation | Original blended team logo; Alloy / Clean Inter styling across the app; crew, medical officer and Earth demo roles |
| Overview | Gender-matched interactive 3D body, simulated skin-temperature map and temporary pulsing symptom labels; six equally sized segmented instruments: resting pulse, temperature, sleep, daily tasks, SpO2 and blood pressure; pending wellbeing/training cues |
| Daily check-in | Ten 1–10 psychological prompts, including mental refreshment instead of a support-request item; 50 front/back anatomical symptom locations, area-specific options, severity slider and short note |
| Exercise | Petros's program/controller, one Start training, individual set ticks, per-exercise/session timing, automatic supported summary/recovery saves, clearly simulated rolling heart-rate/breathing plots; manual kilograms and 5 kg stepper remain unsaved drafts; PR awaits its schema |
| Habitat | Original historical environmental datasets and alert rules through the connection adapter; timestamps/replay labels and missing-data behavior retained |
| Medical bay | Both L1 pages and all ten catalogue items; restricted/open/available states, per-profile allergy blocking, onboard/Earth approvals, equivalent reusable code/QR, due-dose limits, parallel dispensing and individual collection confirmation; single top Emergency toggle and required reason; dismissible notifications |
| Defibrillator | Included at the bottom of L3 as the full-width, three-compartment planned AED shelf, with its device illustration and draft detail panel. Not omitted. Collection is disabled until the team adds the catalogue/backend connection, as Tommy chose |
| Wellbeing | Cyan planet mascot/amber ring, context-aware offline companion and author-only journal; separate free-text psychologist preview with scripted local replies |
| Clinical / Earth | Existing clinical analyses, medicine approvals, reports, simulated offline queue/delivery/replies and code/QR generation; astronaut sessions do not gain clinical-report access |

## Honest boundaries to retain

- The backend/owner modules are unchanged by the visual pass. Health, medicine, controller and original companion helpers remain imported from their owners. PR #73 includes Potest's original PR #55 commits; Potest/zt must agree that dependency and review the connection handoffs.
- Only mood/stress/fatigue currently persist through the health questionnaire schema. Seven extra answers are explicitly session drafts. Do not claim they are saved to the server.
- AED, durable kilograms/PR and real psychologist transport remain pending integrations; keep their visible drafts/preview and all current features. Do not invent a backend capability or silently remove the UI.
- The existing doctor-as-patient Earth-routing exception still runs in the medicine module. Tommy's requested policy correction is recorded in medical-training-follow-up.md for dadis2/zt; no approval bypass is introduced here.
- Companion replies are offline contextual templates, not an externally trained LLM. Earth transport, credentials, cabinet hardware and identity selection are simulations. Training sensors and the regional thermal map are labelled synthetic. Physiological values remain separate from the simulated skin map.
- Three.js and Google Fonts retain the existing remote dependencies; the initial visual load needs Internet. APIs, storage, QR generation and the offline support adapter do not need an API key.

## Review and validation

The full root suite passes 106 tests, none skipped. The existing real-HTTP coverage exercises module composition, role/privacy boundaries, code reuse, parallel dispensing, next doses, reports and workout persistence. Visual review screenshots, including the final six-instrument Overview, are under overview-designs/typography/exports/.

PR #74 is the complete review into main, superseding the smaller functional-only review in #73. It changes the protected shared/contract/README.md and includes Potest's source dependency, so it must wait for another teammate's approval and owner agreement. zt (Tilihub) and Potest04 are the key reviewers. This handoff requests review; it is not an approval. Automatic approval review rejected the attempted #74-to-functional merge because of a prior no-merge instruction. No shared branch was merged; explicit user authorization is also needed before any merge.
