# tommy: my plan

My personal concept notes and requirements for May the Pulse Be With You. Only Tommy edits this file. The team's common plan is [shared/PLAN.md](../../shared/PLAN.md).

## My part and working agreement

- Tommy supplies the concepts, intended user journeys, and feature requirements.
- Tommy's assistant helps capture, clarify, and organize those thoughts in this plan, then commits and pushes the notes for zt to use.
- zt (Zisis, GitHub `Tilihub`) owns visual design, layout, styling, and UI implementation, as clarified by Tommy on 2026-11-14.
- Do not create or publish UI prototypes, screens, styling, or application code from this chat unless Tommy explicitly changes this agreement. A new concept is a note to refine, not an instruction to implement it.
- zt uses this published plan as an implementation brief, following the repository's ownership rules. This file stays in Tommy's own folder.
- These are Tommy's proposals. They do not amend the common plan or represent team approval of every feature. The team decides the final scope and interfaces.

## Current state

- The earlier UI prototype PR #20 was closed without merging, and its remote branch `tommy/crew-access-ui` was deleted.
- This handoff contains planning documents only. There is no active UI implementation from Tommy for zt to integrate.
- First brief for zt: branded entry screen, login, registration, and a basic health profile.

## First brief: entry and account flow

### Purpose

Give each crew member a personal entry point into the application and establish a basic health profile.

### Requested journey

1. Show an introductory screen with the team's May the Pulse Be With You logo and a Start button.
2. Blend the logo's background into the screen; avoid a visible rectangular image block. zt chooses the visual implementation.
3. Start opens account access with Log in and Sign up options. "Sign up" means new-account registration.
4. Log in asks for the crew member's username and password.
5. Sign up asks for first name, last name, username, password, and password confirmation.
6. Registration also collects age, weight, and height to form a basic health profile. Additional health fields are still to be agreed; do not treat previously prototyped fields as requirements.
7. Successful account access takes the crew member into their personal application space; its next screen is still to be defined.

### Open points for zt and the team

- Whether account and health details appear in one screen or several steps.
- Which additional health details, if any, are necessary, and which are optional.
- Units, required fields, validation, profile updates, and the backend/authentication contract.
- What the user sees immediately after login or registration.

## Broader concept supplied by Tommy

The application is intended for long-duration, long-distance crewed missions, including the team's proposed Mars-travel scenario. The following sections preserve Tommy's supplied ideas for discussion; they are not implementation assignments or verified capabilities.

### Physical health, symptoms, and personal trends

- Gather astronaut health indicators from sensors and allow the crew member to report symptoms manually.
- Track history cumulatively and learn what is normal for each person, rather than judging every person against one generic baseline.
- Focus attention on substantial, repeated, or sustained deviations over time, and present useful context to a clinician.
- Combine sensor observations, symptom entries, health history, and relevant environment readings in that context.
- The proposed assistant may help explain observations and offer bounded support while awaiting professional input, without replacing a doctor or clinical judgment. Clinical content and escalation rules need separate agreement.

### Medical inventory and physical compartments

- Represent a real medication/supplies cabinet digitally, showing its shelves or locker-style compartments by category.
- Identify compartments with labels such as B3, and highlight the corresponding compartment in the app when access is granted.
- Pair the digital highlight with a physical indicator, such as a green LED; show locked or unavailable compartments distinctly.
- Tommy proposes separate access paths for everyday supplies and prescription-controlled medicines. The precise access policy is not decided by these notes.
- For controlled compartments, a clinician's prescription/authorization would include a code or QR code that grants access only to the prescribed compartment(s).
- A symptom flow could point to an authorized compartment, subject to the team's agreed clinical and hardware access rules.

### Mental wellbeing and professional support

- Offer a short daily wellbeing check-in, with roughly ten yes/no or 1–5 questions; the actual questionnaire has not been selected or validated.
- Encourage optional daily notes about the crew member's thoughts and experiences.
- Preserve a longitudinal wellbeing history alongside physical health observations.
- Offer a way to request a private session with a specialist psychologist on Earth, potentially booked one or two weeks ahead with a defined time slot.
- Tommy's proposed session is not recorded. He also proposes giving the psychologist useful prior check-in context and building the relationship before departure from Earth.
- Feasibility, communication delays, consent, and access to wellbeing records remain points for the team to resolve; this is not a promise of live communication on every mission.

### Motivation and mascot customization

- Award points for exercise consistency, completing daily check-ins, optionally writing journal notes, and improving a personal exercise record.
- Emphasize each person's own progress rather than competing against colleagues.
- Tommy also suggested a weekly leaderboard and placement bonuses. Discuss whether that fits the aim of avoiding unhealthy competition before adopting it.
- Spend points in a cosmetic shop to customize the companion mascot, for example with glasses, hats, or clothing.

### Companion mascot and guided interaction

- Possible mascot directions from Tommy: a small blue alien or a small astronaut robot, with a Star Wars-inspired name and personality. No character design has been chosen.
- The mascot can introduce the app and offer an optional guided demo.
- A conversation menu can route a user toward tasks such as reporting a symptom or starting an exercise session.
- For symptom reporting, guide the user through the same structured choices available in the manual flow: body area, symptom, and severity, then record the entry.
- Alternatively, guide the user through the UI by highlighting the next control and pointing toward it.
- Explore spoken numbered choices, such as 1–5, as an optional interaction mode; speech recognition and its suitability still need investigation.
- Possible idle states: floating/meditating, sleeping, or exercising in response to the user's activity.

### Environment, datasets, and later access options

- Include spacecraft environmental readings such as CO2 alongside health context.
- Use suitable NASA/challenge datasets for evidence-based demonstrations where available, with sources and transformations documented. Availability, release dates, and suitability still need verification by the research owners.
- Explore face or fingerprint authentication as a later account-access option; it is not part of an implemented account system in this brief.

## Tasks

- [x] Record Tommy's change of role: concepts and planning here, visual UI implementation by zt.
- [x] Withdraw the earlier UI PR and delete its remote branch.
- [x] Preserve the supplied entry-flow requirements and broader concepts in this plan.
- [ ] Review and refine the next concept with Tommy, keeping questions separate from decisions.
- [ ] Let zt use the published plan to determine the visual implementation and raise any missing requirements.
- [ ] Propose changes to `shared/PLAN.md` only when Tommy asks the team to adopt a concept, using the required teammate-approved PR.

## How to continue

Read this plan and Tommy's status first. Ask Tommy which concept he wants to refine, update these notes in English, and publish only his own planning/status documents. Do not resume the withdrawn UI prototype. Update the status and commit/push before Tommy takes a break.
