# Independent review of report version 1.2

Reviewed 15 November 2026, report on main `fcc17e7`, application snapshot
`b0f968c156927a52cf2607a2d548ce4cd078b862`.

## Outcome

No blocking content error, missing core technical section or rendering defect
was found in the reviewed report. The PDF/narrative were not rewritten during
this audit. It is a technical supporting report, not confirmation of a completed
Space Apps submission, a presentation deck or clinical validation.

## Coverage checked

- Challenge, intended users, rationale and the recorded development choices.
- Architecture, one core, owner imports/adapters, mission time and persistence.
- Research versus integrated sources; real archives versus fictional crew data.
- Rest/exercise, person/cohort, measurement methods, units and missing data.
- Median/MAD reference, thresholds, streaks, weekly coverage and source fingerprints.
- Actual offline companion behavior, limited synthetic context and brief AI use.
- Private journal, ten-answer storage, clinical roles and simulated identities.
- Medicines, allergy/authorization/dose checks, emergency and hardware boundaries.
- Exercise controller, replay provenance, load-record limits and Pulsars rules.
- Clinical reports, local delayed Earth transport and exclusion of private material.
- Results, limitations, next work, named team contributions and source appendices.
- Appendix F contains startup, isolated-store, stage and reproduction instructions.

## Reproduced evidence

- All **117 root JavaScript tests pass**, no failures/skips/cancellations.
  Ran `node --test "**/*.test.js"`, the exact package script, with Python and
  localhost permitted. Relevant app code on main is unchanged from the pinned
  snapshot; this rerun supports the report's stated revision.
- All **101 manifest file hashes** match their pinned Git blobs.
- Independently recomputed 33 environmental groups, 93 channels and 126,782
  processed points; 47 historical CSV records; 65 synthetic crew observations;
  all five sets of reference medians; and 21 catalogue items with the stated tiers.
- PDF: **41 pages**, 466 link annotations, no replacement glyphs, no text outside
  page bounds and no unresolved TODO/TBD markers. Rendered every page to images,
  inspected the full contact sheet and selected full-size pages including the
  architecture/AI section, contributors and medicine catalogue. No obvious
  clipping, overlap or missing section was found.
- Checked report-artifact links separately: evidence manifest and validation log
  correctly target main, while application references target the pinned revision.
- Spot-checked the four additional primary references: NASA publications guide,
  five hazards, medical operations and PhysioNet BIDMC. Their scope supports the
  associated statements. This was not a fresh download of every raw archive, a
  check of every external URL or an independent clinical literature review.

Rendered review images remain in ignored `.qa/review-20261115/`; no personal
database or source PDF was modified.

## Submission follow-through, outside the technical report

1. Complete the official project page and checklist in
   `shared/submission/project-page.md` with the team: summary, detailed description,
   data/source links, AI disclosure and actual public project/demo links.
2. Prepare the short presentation/demo and Q&A to the local organisers' guide.
   The 41-page report is supporting evidence, not the short demo-link deck.
3. Resolve the organiser's public-deployment expectation and confirm public-link
   access. This audit did not establish a deployed public application or a final
   platform submission confirmation.
4. If later code changes (for example pending AED work) are adopted, either keep
   this report explicitly tied to its existing snapshot or update its narrative,
   manifest, validation and PDF together. Do not silently describe later features
   as present in version 1.2.

These are release/submission actions, not required corrections to the reviewed
technical explanation. Report section 15 already identifies governance and
submission as remaining team work.
