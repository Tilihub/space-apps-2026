# zt: my plan

My own planning. Only I edit this. The team's common plan is [shared/PLAN.md](../../shared/PLAN.md).

**Draft, 14 Nov 14:30.** Everything here is open to change. It's written for Tommy and the team to
react to, and nothing in it is a team decision yet.

## My part

- **Integration**, together with Tommy: joining everyone's pieces into one app.
- **Main app and dashboard design**: me, or whoever has time for it first.

## The app: draft overview

### Home: a quiet overview

The first page stays clean and calm. It shows three things:

- **Readiness score.** Tap it to see what's right and what's wrong today: sleep, resting heart rate,
  mood, stress, fatigue and symptoms, each compared with that astronaut's own normal.
- **Task score**: how much of today's routine is done. Tap it to open the task list (check-in,
  workout, measurements, dose follow-ups).
- **Body figure** with measurement points: **blue** is fine, **red** is something to look at. Every
  point is clickable and opens that part's details. Red points invite a tap: they explain what's
  wrong, or ask the astronaut a question. Exactly how is still open.

### Sections behind the home page

| Section | What it does | Builds on |
|---|---|---|
| **Check-in** | Daily check-in (sleep, mood, stress, fatigue), symptom report (body area, symptom, severity), guided measurements with simple instructions | angelos's daily input, dadis2's symptom report format |
| **Habitat** | Cabin CO₂, temperature, humidity and radiation, linked to symptoms (for example high CO₂ as a known headache trigger) | potest's environment monitor |
| **Med bay** | Medicine suggestions after a symptom, dispensing, dose log with "did it help?" follow-up | dadis2's medical inventory |
| **Mind** | Everything psychological: check-in history, journal, support | To be assigned |
| **Crew view** | For the onboard medical officer: the crew's status at a glance, plus approvals | dadis2's approvals |
| **Case summary** | Created automatically when an astronaut reports a problem: the health change, symptom, cabin conditions and doses together. Not visible to the astronaut; for the medical officer and Earth. Where it lives is still open | Everyone's outputs (integration) |
| **Companion** | Points, mascot. Where and how it fits is still open | Tommy's concepts |
| **Login** | Face scan for quick access. Built last | Tommy's entry brief |

### Demo format

A 7-minute live demo. A narrator tells the story while some of us play astronauts in different
situations, each with matching data records. As the narrator moves to each person, we switch to
that astronaut's tab and show it live. The cases are being worked out (draft: one astronaut sleeping
badly with a headache, a healthy one doing a workout, a third still open).

### Open points

- **Hidden case summary and honest reporting.** Research shows astronauts already hold back symptoms
  for fear of being grounded. If reports go somewhere they can't see, they may report less. A line
  such as "Shared with your medical officer" on the report screen could keep their trust.
- **Points from the task score.** Earning points for tasks done rewards doing the routine, not having
  good numbers. The companion could live there too.
- **Face scan.** A real face match in the browser is possible but fiddly. For the demo, a camera view
  with a scan animation that picks the crew member would look the same.
- **Things the pieces still need to agree:** one crew list, the same field names, 0–10 scales,
  and one mission clock.

## Tasks

- [ ] Go through this overview with Tommy
- [ ] Settle the demo cases
- [ ] Plan the integration: how the pieces join, plus the agreements above
- [ ] Design the home page

## Ideas for the team

<!-- To get one adopted, propose it as a change to shared/PLAN.md (a pull request a teammate approves). -->

- The overview above, once Tommy and I have gone through it
