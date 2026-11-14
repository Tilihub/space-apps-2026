# PET-1 demo stories

All crew members, health observations, medicine actions, and cabin events below are synthetic. Use the crew IDs and UTC mission clock from the [proposed app contract, sections 4 and 10](https://github.com/Tilihub/space-apps-2026/blob/fb0c20f/shared/contract/README.md). Mission day 42 opens at 07:30 UTC on 14 November 2026.

| Crew | What the joined demo should show |
|---|---|
| `c1` Mara Quinn | Healthy workout case. Days 29–41 stay within 52–55 bpm resting pulse, 6.6–7.0 h sleep and steady self-reports. The day-42 input produces no demo changes. |
| `c2` Leo Haddad | Usual personal readings. In the medical officer view, review Tomas's short sleep and headache, Ines's mood trend and the other stage events. |
| `c3` Ines Sato | Mood moves from a reference of 7 to 6, 5, 5, 5, 4 and 4 on days 36–41. Resting pulse alone is missing on days 39 and 41. Day 42 mood 4 completes six consecutive changed days; stress 5 completes three. Journal and companion content stay private. |
| `c4` Tomas Reyes | Sleep falls from a 6.8 h reference to 5.0, 4.8 and live 4.6 h on days 40–42. Resting pulse and self-reports remain close enough to reference that only sleep is flagged for three days. Tomas reports a headache at severity 5. The joined case uses Potest's separate historical ISS RR-9 CO₂ replay, recovered by 07:00. |
| `c5` Kai Lindqvist | Usual readings with a distinct personal baseline. |

The existing meds flow can use Tomas's headache input and the module's demo catalogue. Leo may review a separate prescription request under the meds contract. If the team runs the later outage scenario, Leo creates the clinical report and the authorized queue retains it through reconnection. The demonstration report combines health and symptom records with the environment module's independently sourced replay. Private journal text and derived details stay within the authorized journal context.
