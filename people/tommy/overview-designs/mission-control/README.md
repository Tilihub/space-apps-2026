# Mission Control refinements

Tommy selected the original Mission Control direction (study 03): carbon/amber colors and segmented circular instruments. These are eight comparison options within that family: one unchanged reference and seven refinements. Tommy then selected **MC02 Soft Panels**. It is applied to the frontend; the current step is [application-wide typography](../typography/README.md), including Alloy for comparison.

The original team logo, fictional Tomas values, frozen clock, thermal body reference, overview content and visible control inventory are unchanged. Differences concern panel edges/depth, amber intensity, typography, segment width/spacing and one centered arrangement. All active instrument rings remain visibly segmented; the zero-workout instrument retains the existing empty appearance. The marks introduce no new clinical range or score.

[Comparison MC01–MC04](exports/comparison-1.jpg) · [Comparison MC05–MC08](exports/comparison-2.jpg)

| ID | Full-size screenshot | Variation |
|---|---|---|
| MC01 | [Reference](exports/MC01.jpg) | The original Mission Control direction, retained as the comparison anchor. |
| MC02 | [Soft Panels](exports/MC02.jpg) | Softer corners and layered panels, with the original monospaced readings. |
| MC03 | [Blackout](exports/MC03.jpg) | Darker canvas, brighter segmented rings and quiet outlines. |
| MC04 | [Alloy](exports/MC04.jpg) | Lighter gunmetal panels for a more open, readable control-room feel. |
| MC05 | [Bold Console](exports/MC05.jpg) | Large condensed numerals, strong headings and thicker short ring segments. |
| MC06 | [Precision](exports/MC06.jpg) | Fine separated ticks, monospaced labels and technical framing, without extra data. |
| MC07 | [Quiet Amber](exports/MC07.jpg) | Desaturated amber, softer panel separation and wider spaced ring segments. |
| MC08 | [Center Console](exports/MC08.jpg) | The same original palette and segmented rings, arranged around a centered body. |

Use the existing static review server from the repository root:

```sh
python3 -m http.server 8016 --bind 127.0.0.1
```

Open `http://127.0.0.1:8016/people/tommy/overview-designs/index.html?family=mission-control&design=MC01` (MC01–MC08). The contact sheets use `mission-control/exports/sheets.html?group=1` or `group=2`. Screenshots can be viewed offline. `themes.json` records palette/type choices; `variants.css` records the refinements. These static files do not connect to any application API, session or backend. These eight boards are the historical refinement comparison. MC02 has since been transferred to the real frontend as described above; backend and owner modules remain unchanged.

Browser review checked every screenshot, loaded images/fonts, preserved segmented dash styles and card bounds above the footer. The original sixteen studies remain available for comparison.
