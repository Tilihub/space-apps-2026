# Habitat preview

Run `node integration/onboard-app/start.js` from the repository root with Node.js 24, then open [the Habitat preview](http://localhost:8000/demo-data/habitat/). It uses the onboard server's existing `/demo-data/` route and signs in with a separate demo session. To compare the original Habitat screen, use **Open PULSE**.

Hover or focus a sensor to see its last 24 mission hours. Click or tap to keep that sensor selected. The page refreshes from the onboard environment API every three seconds. The current readings, graph points and alerts come from the historical replay on the shared mission clock. The marked locations illustrate where each measurement belongs on the ship. Gaps in the archive appear as breaks in the chart.

| Reading | Location | Color |
| --- | --- | --- |
| CO₂ | Crew cockpit | Mint |
| Humidity | Water recycler | Cyan |
| Temperature | Aft engineering | Continuous blue-to-red scale, 16–30 °C |
| Radiation | Forward hull | Violet |

The blue silhouette pulses while the interior stays soft. Browsers set to reduced motion show a steady outline. The temperature scale colors the current reading, map marker and each height of the chart. Values at or outside 16–30 °C use the nearest endpoint color. The API's alert state stays separate from the reading color.

Pending Petros's review before integration into the main Habitat screen.
