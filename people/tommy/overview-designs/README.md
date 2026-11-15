# Overview appearance studies

Sixteen **static visual concepts** for Tommy to choose from. No theme is selected or applied to the functional application. The only functional-app presentation change in this review is removal of the historical BPM panel from Overview; its original resting-pulse instrument remains.

Every study uses the same fictional Tomas profile and frozen comparison values: resting pulse 63 bpm, body temperature 36.8 °C, sleep 4.6 hours and zero saved workouts. They reuse a screenshot of the existing male thermal model, including its original controls/pedestal; the thermal readings remain the previously approved visual-only simulation. The clock is frozen for comparison. The original team logo is referenced without editing it, and remains on a dark header in light studies. Safety/thermal colors are not reinterpreted as new clinical states.

These pages have no session, API calls, health writes, login, model interaction or backend connection. Their navigation/controls are drawn only for visual comparison. A selected design must later be implemented in the real components while preserving their actual actions, role boundaries, accessible controls, animation and live state. The static body reference and simplified companion are not replacements for their functional versions.

## Screenshots

Four comparison sheets: [01–04](exports/comparison-1.jpg), [05–08](exports/comparison-2.jpg), [09–12](exports/comparison-3.jpg), [13–16](exports/comparison-4.jpg). Each individual screenshot below is full size. Images are small JPEG browser captures; no generated logos or photos are included.

| ID | Full-size screenshot | Palette | Typography | Direction |
|---|---|---|---|---|
| 01 | [Pulse Signature](exports/01.jpg) | Navy · cyan · gold | DM Sans | The closest to the current PULSE identity: crisp cyan, restrained gold, readable rounded forms. |
| 02 | [Orbital White](exports/02.jpg) | White · ice blue | Manrope | A light clinical workspace with soft depth and spacious typography. The body retains a dark viewing stage. |
| 03 | [Mission Control](exports/03.jpg) | Carbon · amber | IBM Plex Sans + IBM Plex Mono | Instrument-panel styling: compact square edges, amber accents and monospaced numerals. |
| 04 | [Lunar Graphite](exports/04.jpg) | Black · silver | Inter | Quiet monochrome surfaces and strong numeric hierarchy; the thermal model supplies the color. |
| 05 | [Aurora Glass](exports/05.jpg) | Deep teal · mint | Manrope | Translucent-looking teal panels with a soft atmospheric glow and mint accents. |
| 06 | [Cobalt Studio](exports/06.jpg) | Cobalt · frost | Space Grotesk | A bold blue navigation rail with clean white instrument cards and confident geometric type. |
| 07 | [Mars Habitat](exports/07.jpg) | Basalt · copper | Archivo | Warm mineral colors and precise edges: a more human, habitat-oriented industrial direction. |
| 08 | [Titanium Lab](exports/08.jpg) | Alloy · signal yellow | IBM Plex Sans + Barlow Condensed | A flat laboratory aesthetic: condensed headings, technical rules and sharp alloy-gray panels. |
| 09 | [Deep Violet](exports/09.jpg) | Obsidian · lavender | Sora | A softer futuristic palette with rounded layered cards and restrained violet illumination. |
| 10 | [Medical Sage](exports/10.jpg) | Porcelain · sage | Outfit | Calm and approachable: warm white, green accents, soft corners and generous type. |
| 11 | [Orbital Blueprint](exports/11.jpg) | Ink · electric cyan | IBM Plex Sans + JetBrains Mono | Technical blueprint lines and mono headings, without adding extra information or controls. |
| 12 | [Solar Sand](exports/12.jpg) | Ivory · bronze | DM Sans + Manrope | A warm minimal alternative: ivory surfaces, bronze instruments and gentle shadows. |
| 13 | [Command Split](exports/13.jpg) | Slate · glacier | Inter | Four horizontal instrument cards beside a large body stage; same metrics and actions. |
| 14 | [Orbit Focus](exports/14.jpg) | Midnight · platinum | DM Sans + Space Grotesk | Centered anatomy flanked by two instruments on each side; lighter visual framing. |
| 15 | [Clinical Editorial](exports/15.jpg) | Paper · ink blue | Manrope | Large left-aligned numerals with fine separators, and the body stage on the right. |
| 16 | [Signal Deck](exports/16.jpg) | Graphite · signal yellow | IBM Plex Sans + Barlow Condensed | A strong industrial alternative: yellow navigation, graphite instruments and condensed numerals. |

## Reproduce locally

From the repository root:

```sh
python3 -m http.server 8016 --bind 127.0.0.1
```

Open `http://127.0.0.1:8016/people/tommy/overview-designs/index.html?design=01` (IDs 01–16). This serves static review files only; it is not a second application backend. Google Fonts is used for the type study, with system fallbacks. The captured JPEGs need no server or fonts to view. `exports/sheets.html?group=1` renders the first comparison sheet; groups 1–4 contain four concepts each.

Recipes are recorded in `themes.json` and `studies.css`. The common markup stays in `index.html`; `studies.js` only chooses a visual recipe and loads the local JSON. Styles 13–15 explore alternate visual arrangement with the same information. No responsive behavior or clinical accessibility certification is claimed for these desktop-only screenshots.

Visual references checked: [SpaceX human spaceflight](https://www.spacex.com/humanspaceflight) for restrained space presentation; [Linear's interface refresh](https://linear.app/now/behind-the-latest-design-refresh) for softer hierarchy, navigation and borders. These are broad references, not copied screens, assets or affiliation claims. The other recipes explore clinical, industrial, warm and atmospheric alternatives within the team's existing content.
