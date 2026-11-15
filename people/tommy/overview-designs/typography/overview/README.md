# Typography on the complete Overview

Tommy asked to judge the font choices on Overview rather than only isolated components. This review shows the same T01–T08 recipes in full Soft Panels and Alloy Overview screenshots: sixteen individual captures and four comparison sheets. Soft Panels remains the selected base, and Tommy has since selected Clean / Inter (T02) as the global default.

[Compare T01–T02](comparison-1.jpg) · [Compare T03–T04](comparison-2.jpg) · [Compare T05–T06](comparison-3.jpg) · [Compare T07–T08](comparison-4.jpg)

Every comparison keeps the same frozen fictional profile, values, logo, body image, composition and segmented instruments. Only the font recipe changes within each surface. The four sheets show Soft Panels left and Alloy right, with two font options per sheet. Review-strip labels use a constant system font so they do not affect the comparison.

| ID | Font system | Full Overview | Full Overview |
|---|---|---|---|
| T01 | IBM Plex Sans + IBM Plex Mono | [Soft Panels](soft-T01.jpg) | [Alloy](alloy-T01.jpg) |
| T02 | Inter | [Soft Panels](soft-T02.jpg) | [Alloy](alloy-T02.jpg) |
| T03 | Manrope | [Soft Panels](soft-T03.jpg) | [Alloy](alloy-T03.jpg) |
| T04 | DM Sans | [Soft Panels](soft-T04.jpg) | [Alloy](alloy-T04.jpg) |
| T05 | DM Sans + Space Grotesk | [Soft Panels](soft-T05.jpg) | [Alloy](alloy-T05.jpg) |
| T06 | Outfit | [Soft Panels](soft-T06.jpg) | [Alloy](alloy-T06.jpg) |
| T07 | Archivo + IBM Plex Mono | [Soft Panels](soft-T07.jpg) | [Alloy](alloy-T07.jpg) |
| T08 | IBM Plex Sans + Barlow Condensed | [Soft Panels](soft-T08.jpg) | [Alloy](alloy-T08.jpg) |

The common static Overview now accepts the optional whitelisted `typeface` from the existing review metadata. Heading, interface, labels and numeric families match the application-wide recipe. Baked Front/Back text in the reference image is covered and redrawn as font-aware static labels; the reference body's geometry/image is not edited. This does not change the actual application or its body controls.

Reproduce using the existing static server on port 8016:

- `/people/tommy/overview-designs/index.html?family=mission-control&design=MC02&typeface=T03`
- Use `design=MC04` for Alloy, and T01–T08 for typography.
- `/people/tommy/overview-designs/typography/overview/sheets.html?group=1` (groups 1–4).

The source, screenshots and metadata are in Tommy's own folder. No app, backend, controller, owner-module, contract or stored-data change is part of this follow-up. Font families/image loading were inspected for all sixteen captures, and all four comparison sheets were reviewed visually.
