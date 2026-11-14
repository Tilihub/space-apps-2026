# PET-1 demo stories

All crew members, health observations, medicine actions, and cabin events below are synthetic. Use the crew IDs and UTC mission clock from the [proposed app contract, sections 4 and 10](https://github.com/Tilihub/space-apps-2026/blob/fb0c20f/shared/contract/README.md). Mission day 42 opens at 07:30 UTC on 14 November 2026.

| Crew | What the joined demo should show |
|---|---|
| `c1` Mara Quinn | Usual values. Use the day-42 input in [scenarios.json](scenarios.json) to show a check-in with no demo changes. |
| `c2` Leo Haddad | Usual personal readings. In the medical officer view, review Tomas's symptoms, measurements and cabin context. |
| `c3` Ines Sato | A complete baseline and missing values in recent history. On day 42 the resting pulse, fatigue answer and SpO₂ are unavailable. Show the gaps while comparing the available values. |
| `c4` Tomas Reyes | Sleep, mood, stress and fatigue change on days 40 and 41. On day 42, enter 5.5 h sleep, mood 4, stress 7 and fatigue 7, plus the spot readings in the fixture. The daily result records a third day of changes. Tomas reports a headache at severity 6. Leo sees a synthetic CO₂ warning that began overnight. The two observations provide context for review. |
| `c5` Kai Lindqvist | Usual readings with a distinct personal baseline. |

The existing proposed meds flow can use Tomas's headache input and the module's demo catalogue. Leo may review a separate prescription request under the meds contract. If the team runs the later outage scenario, Leo creates the clinical report and the authorized queue retains it through reconnection. The demonstration report uses the symptom form, measurements and cabin snapshot. Private journal text and derived details stay within the authorized journal context.
