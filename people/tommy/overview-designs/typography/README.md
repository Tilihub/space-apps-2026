# Application-wide typography: Soft Panels and Alloy

**Latest review:** [the same font choices on the complete Overview](overview/README.md), as Tommy requested.

Tommy initially selected MC02 Soft Panels, then corrected the final base to **MC04 Alloy** and clarified that fonts must be considered throughout the application, not just Overview. He also requested the same font comparison in Alloy. Both original designs used IBM Plex Sans with IBM Plex Mono; their surface styling made them feel different.

The real application now loads the selected Alloy presentation and a shared font-recipe layer. Tommy selected Clean / Inter (T02), now the global default; T01 remains a comparison reference. Use `?typeface=T01` through `?typeface=T08` before the hash to preview a recipe across the full application. A hash navigation retains the choice; the body-frame URL carries the same whitelisted ID. Unknown values fall back to the selected T02. No font preference, data, authorization or controller state is written by this layer.

**Alloy is now the actual app base**, with Clean / Inter (T02). The boards below preserve the earlier Soft Panels/Alloy comparison. The paired sheets keep text/sizes identical in both palettes. The component boards include navigation, overview readings, Check-in questions/fields, Exercise sets, Medical bay labels/dose text, Wellbeing chat and Habitat labels. Their illustrative values and chat lines are static fictional specimens, not actual prescriptions or generated support replies.

[Paired comparison T01–T04](exports/paired-1.jpg) · [Paired comparison T05–T08](exports/paired-2.jpg)

| ID | Font system | Full component board | Full component board |
|---|---|---|---|
| T01 | IBM Plex Sans + IBM Plex Mono | [Soft Panels](exports/T01.jpg) | [Alloy](exports/alloy-T01.jpg) |
| T02 | Inter | [Soft Panels](exports/T02.jpg) | [Alloy](exports/alloy-T02.jpg) |
| T03 | Manrope | [Soft Panels](exports/T03.jpg) | [Alloy](exports/alloy-T03.jpg) |
| T04 | DM Sans | [Soft Panels](exports/T04.jpg) | [Alloy](exports/alloy-T04.jpg) |
| T05 | DM Sans + Space Grotesk | [Soft Panels](exports/T05.jpg) | [Alloy](exports/alloy-T05.jpg) |
| T06 | Outfit | [Soft Panels](exports/T06.jpg) | [Alloy](exports/alloy-T06.jpg) |
| T07 | Archivo + IBM Plex Mono | [Soft Panels](exports/T07.jpg) | [Alloy](exports/alloy-T07.jpg) |
| T08 | IBM Plex Sans + Barlow Condensed | [Soft Panels](exports/T08.jpg) | [Alloy](exports/alloy-T08.jpg) |

## Implementation and review

- Shared frontend recipes: `integration/onboard-app/pages/typography.js`; fonts, weights and selected surface styling: `pages/soft-panels.css`.
- The layer covers entry/profile picker, shell, crew sections, clinical tables and Earth console. Code/credential text retains its original monospace formatting.
- Dashed rings are scoped to Overview. Workout progress retains its original fractional arc, and body geometry, thermal scale, symptom colors and picking logic are unchanged.
- Light/dark selection remains available. The original logo is unchanged and blends into the dark header; the light profile picker gives its logo the same dark identity surface.
- Google Fonts provides the typefaces with system fallbacks, as in the existing frontend. Open the demo online once to cache resources for offline presentation.
- Browser checks verified T03 through every crew section, body-frame controls, clinical tables and Earth controls, plus light theme. Each of the eight static font recipes was checked on headings, buttons, inputs and numeric readings; component-card overflow was absent at desktop size. `actual-T03-*.jpg` files are captures of the isolated connected app on port 8018, distinct from the static boards.

## Static reproduction

From the repo root run `python3 -m http.server 8016 --bind 127.0.0.1`, then open:

- `http://127.0.0.1:8016/people/tommy/overview-designs/typography/index.html?typeface=T03`
- Add `&surface=alloy` for the comparison surface.
- `exports/paired.html?group=1` or `group=2` renders the paired comparison sheets.

The real demo still uses the existing server command in the integration README. No new server or package is part of the product, and backend implementation/owner modules/contracts remain unchanged.
