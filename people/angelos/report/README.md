# PULSE project report

Independent version-1.2 audit: [REVIEW.md](REVIEW.md), including reproduced test
and data/hash checks, PDF rendering observations and remaining submission actions.

The consolidated English technical report explains the team's recorded rationale, design
choices, research, datasets, processing, personal comparison rules, companion behavior,
architecture, medicine workflows, exercise, Pulsars, privacy, tests and remaining work.

- [Read the PDF](PULSE_Project_Report.pdf).
- [Edit the main narrative](report.md).
- [Inspect the pinned evidence manifest](evidence-manifest.json).
- [Read the reproduced test log](validation.txt).

The report describes application commit `b0f968c156927a52cf2607a2d548ce4cd078b862`, after
PRs #74 and #75 merged on 15 November 2026. It resolves stale planning labels against
the merged code and GitHub PR state. It does not claim that scripts are a trained model,
synthetic crew observations are real astronaut records, or the prototype is clinically validated.

The 41-page PDF was visually checked throughout, with embedded fonts, working reference
links, a clickable table of contents and no clipped text or unsupported glyphs.

The document organization follows the public
[NASA Publications Guide for Authors](https://ntrs.nasa.gov/citations/20150013303).
The existing team logo is reproduced unchanged; no agency logo or agency publication
identifier is used. Section 8 briefly discloses AI assistance and identifies the application
pipeline as the team's own design and implementation, without listing tools per contributor.

Version 1.1 shortens section 8 to two paragraphs and retains the original application snapshot.
Version 1.2 adds the team organization paragraph, uses the confirmed first names and explains
the purpose of each member's main component. GitHub profiles and Git commit author names were
cross-checked; the team-confirmed roster supplies names absent from public profiles. The
contributor table retains the exact GitHub handles for traceability.

## Rebuild

Use Python with `reportlab`, `Pillow` and `pypdf` available. The builder uses the repository's
pinned Git blobs, so later changes on main do not silently change this report's evidence.
It embeds Arial and Consolas from Windows Fonts.

```powershell
python people/angelos/report/build_report.py
```

The output is `people/angelos/report/PULSE_Project_Report.pdf`. Appendices are generated from
the pinned source registry, environmental series, historical vital-sign CSV, medicine
catalogue and documentation index. The evidence manifest includes SHA-256 hashes.

The root application command `node --test "**/*.test.js"` reproduced **117 passed, zero failed
and zero skipped** with Python available and localhost HTTP permitted. This is the exact
test script behind `npm test`; no application code was changed for the report.

The final PDF was rendered for visual review. Page images and intermediate checks stay
in ignored `.qa/`; they are not published with the report.
