# tommy: my plan

My personal concept notes and requirements for May the Pulse Be With You. Only Tommy edits this file. The team's common plan is [shared/PLAN.md](../../shared/PLAN.md).

## My part and working agreement

- Tommy supplies the concepts, intended user journeys, and feature requirements.
- Tommy's assistant helps capture, clarify, and organize those thoughts in this plan, then commits and pushes the notes for zt to use.
- zt (Zisis, GitHub `Tilihub`) owns visual design, layout, styling, and UI implementation, as clarified by Tommy on 2026-11-14.
- Each contributor continues their own module. Tommy describes how the pieces connect conceptually; zt handles the final application layout, implementation, and presentation from that brief. Backend/API details still need coordination with module owners.
- Do not create or publish UI prototypes, screens, styling, or application code from this chat unless Tommy explicitly changes this agreement. A new concept is a note to refine, not an instruction to implement it.
- zt uses this published plan as an implementation brief, following the repository's ownership rules. This file stays in Tommy's own folder.
- These are Tommy's proposals. They do not amend the common plan or represent team approval of every feature. The team decides the final scope and interfaces.

## Current state

- The earlier UI prototype PR #20 was closed without merging, and its remote branch `tommy/crew-access-ui` was deleted.
- This handoff contains planning documents only. There is no active UI implementation from Tommy for zt to integrate.
- First brief for zt: branded entry screen, login, registration, and a basic health profile.
- Proposed next work for each contributor, based on the latest published modules and zt's new overview, is in [implementation-tasks.md](implementation-tasks.md). These are suggestions for Tommy to assign, not team-approved assignments.

## Tommy's clarified requirements — 2026-11-14, questions 1–4

These are Tommy's answers for the implementation brief. They still need coordination with the relevant owners before becoming team-wide agreements.

### Mission and users

- The demo represents a long-duration journey toward Mars.
- Astronauts are the primary application users.
- An onboard doctor/surgeon has elevated access, including the ability to authorize access to inventory compartments. The exact permissions and approval categories are still open.
- A specialist on Earth receives crew health data, extreme readings, and user-reported symptoms for review when needed, and can return clinical assessments and authorization codes/QR codes.
- Tommy's answers to questions 5–9 below clarify periodic/incident reporting, restricted journal access, onboard persistence, and the division between onboard and ground authorization. Exact intervals, categories, and unresolved access boundaries remain explicit questions.

### Home screen and persistent companion

- After login, show a daily summary of the crew member's basic health information.
- Keep the mascot available in a corner across all application tabs, floating like the Codex pet reference supplied by Tommy.
- Clicking the mascot opens a way to ask questions and receive guidance. The summary remains the main entry screen; the mascot is available alongside it.
- Tommy assigns preparation/training of the mascot's conversational behavior to Angelos. This is an intended responsibility, not a claim that a trained model already exists. zt continues to own the visual UI implementation.
- The exact summary fields, access to personal data within the conversation, and the boundary between guidance and other actions remain open.

### First-demo priorities

| Required for the first demo, at a basic level | Notes |
|---|---|
| Personal health and history | User-specific health overview and past records |
| Spacecraft environment and alerts | Environment monitoring and relevant notifications |
| Medical inventory and access flow | Supplies/medications and the intended authorization journey |
| Daily wellbeing check-in and notes | A basic daily self-report and note-taking flow |
| Mascot conversation and guidance | Basic assistance and navigation support |

Points, cosmetic customization, and gamification are deferred until the core experience is in place; they are not prerequisites for the first demo.

## Tommy's clarified requirements — questions 5–9

### How the team joins the pieces

- Everyone continues developing their own component. Tommy supplies the conceptual connections and intended user journeys through this plan.
- zt handles the final layout, application implementation, and appearance using Tommy's brief and the contributors' components. This resolves the high-level handoff question; concrete API and authentication contracts still need agreement.

### Inventory authorization

- The onboard doctor can authorize some categories of compartments. Other, specific categories require approval from Earth. The exact category list has not been specified in this brief.
- Access is authorized using a code or a QR code. A single code/QR is intended to open multiple compartments in parallel.
- Q10 clarified: one code/QR opens only the compartments named in that prescription/authorization, all together, like collecting a Box Now delivery. It does not grant cabinet-wide access. Show those same compartments in the application so the crew member can collect the prescribed items.
- Ground clinicians return their clinical assessment and prescription together with the necessary authorization code/QR.

### Reporting to Earth

- Routine information can be sent every few days; the exact interval remains to be chosen. This brief does not claim a standard clinical reporting cadence.
- A change requiring review or a user-entered symptom requiring analysis can trigger an earlier report. The criteria for these triggers are still to be agreed.
- Provide a Create report action that assembles a detailed account of the situation from reported symptoms and the recent days' health data, allowing the clinician on Earth to understand the context.
- The user can manually send a report at any time. The system can also send one automatically when the agreed conditions are met.
- The recent-history window, exact report fields, report preview/editing, transmission feedback, and the implementation owner for report assembly need more detail.
- Journal permissions apply to report content as well: ordinary medical reports must not expose private thoughts to people outside the explicitly permitted journal audience.

### Private thoughts and specialist access

- Q11 clarified: the designated human specialist is the psychologist who follows the astronaut and may communicate with them through chat. Human readers of the private thoughts are limited to the author and that psychologist; other crew members, the onboard doctor, and a general Earth clinician do not gain journal access through their ordinary roles.
- Q12 clarified: the user's chatbot may also process their private thoughts to provide contextual psychological support and guidance within its agreed non-clinician role. This does not authorize forwarding the thoughts or journal-derived details to other people or ordinary medical reports.
- How the psychologist relationship is assigned and enforced, conversation retention, and any external model-processing arrangement still need implementation details. The answers above are product requirements, not a claim that such services have been connected or that real data have been transmitted.
- Permissions for the numerical wellbeing answers are a separate question from this explicit restriction on free-text thoughts.

### Onboard storage, assistant context, and interrupted communication

- Store relevant data onboard during normal operation as well as during loss of Earth communication.
- The onboard application should continue to collect information when the Earth link is unavailable. Retain information that needs transmission and send it later when appropriate connectivity is available.
- Tommy expects the user's chatbot to receive onboard health context, including that user's private thoughts, and know their situation. Its outputs and downstream reporting must preserve the separate human journal-access restriction above.
- This is an intended product capability, not a claim that an offline conversational model or synchronization service already exists. Angelos and zt still need to agree those technical connections.

### Updated check against dadis2's published work

- The newer `dadis2/medical-inventory` version at `5a7febb` is now published in PR #34. It replaces the earlier unpublished-version limitation recorded in this brief.
- Its `Import from Earth` accepts a typed prescription code or QR payload containing multiple medicines, checks the patient and basic validity, and adds the plan. `planTake(planId, idx)` still starts retrieval for one plan item at a time; importing the plan is not yet the requested simultaneous release/highlight of the authorized compartments.
- The code's check characters catch typing errors; they do not establish a clinician's identity or a cryptographically verified prescription. The next-task brief separates demo simulation from verified authorization.
- No inventory files were changed by this chat. Coordinate the batch-collection contract with dadis2 and zt.

### Answers 10–12 and remaining questions

- Q10 resolved: all prescribed/authorized compartments together, not the whole cabinet.
- Q11 resolved: the astronaut's psychologist is the permitted human specialist for private thoughts.
- Q12 resolved: the user's chatbot can use those private thoughts for supportive conversation; other human roles do not inherit that access.
- Remaining product details include the daily summary fields, check-in scale/recall period, report preview/visibility and time window, category-specific approval rules, and the definition of any proposed readiness/task score. See the review and proposed task ownership in [implementation-tasks.md](implementation-tasks.md).

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
7. Successful account access opens the daily personal health summary, with the clickable mascot available in a corner across all tabs.

### Open points for zt and the team

- Whether account and health details appear in one screen or several steps.
- Which additional health details, if any, are necessary, and which are optional.
- Units, required fields, validation, profile updates, and the backend/authentication contract.
- The specific information shown in the daily summary and the authentication/backend contract to coordinate with zt and the module owners.

## Broader concept supplied by Tommy

The application is intended for long-duration, long-distance crewed missions. Tommy has selected a journey toward Mars for the demo. The following sections preserve his supplied ideas for discussion; they are not verified capabilities or a replacement for the agreed team plan.

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
- The onboard doctor authorizes some categories; specified other categories require Earth approval through a code/QR. The category list is still open.
- One code/QR opens only the prescribed/authorized compartments together, with the same compartments indicated in the app for collection.
- A symptom flow could point to an authorized compartment, subject to the team's agreed clinical and hardware access rules.

### Mental wellbeing and professional support

- Offer a short daily wellbeing check-in, with roughly ten yes/no or 1–5 questions; the actual questionnaire has not been selected or validated.
- Encourage optional daily notes about the crew member's thoughts and experiences.
- Human journal readers are limited to the author and their psychologist. The user's chatbot may process the thoughts for contextual support; this must not leak private text or derived details into reports for other roles. Numerical check-in visibility remains a separate policy question.
- Preserve a longitudinal wellbeing history alongside physical health observations.
- Offer a way to request a private session with a specialist psychologist on Earth, potentially booked one or two weeks ahead with a defined time slot.
- Tommy's proposed session is not recorded. He also proposes giving the psychologist useful prior check-in context and building the relationship before departure from Earth.
- Feasibility, communication delays, consent, and access to wellbeing records remain points for the team to resolve; this is not a promise of live communication on every mission.

### Motivation and mascot customization — deferred

Tommy places this work after the core first-demo features.

- Award points for exercise consistency, completing daily check-ins, optionally writing journal notes, and improving a personal exercise record.
- Emphasize each person's own progress rather than competing against colleagues.
- Tommy also suggested a weekly leaderboard and placement bonuses. Discuss whether that fits the aim of avoiding unhealthy competition before adopting it.
- Spend points in a cosmetic shop to customize the companion mascot, for example with glasses, hats, or clothing.

### Companion mascot and guided interaction

- Possible mascot directions from Tommy: a small blue alien or a small astronaut robot, with a Star Wars-inspired name and personality. No character design has been chosen.
- The mascot is persistently available in a screen corner across tabs; clicking it opens interaction. Angelos is the intended owner of the conversational preparation/training, as specified by Tommy.
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
- [x] Record Tommy's answers on the Mars-transit setting, onboard/ground roles, daily-summary home screen, persistent mascot, first-demo scope, and deferred gamification.
- [x] Record Tommy's handoff, authorization, report-generation, journal-access, and onboard-storage answers; check the published inventory source and identify the unpublished-version limit.
- [x] Resolve Q10–Q12 and review the newer published inventory, Angelos's weekly reports, Petros's scope proposal, and zt's app overview to draft concrete next tasks for Tommy to assign.
- [ ] Review and refine the next concept with Tommy, keeping questions separate from decisions.
- [ ] Let zt use the published plan to determine the visual implementation and raise any missing requirements.
- [ ] Propose changes to `shared/PLAN.md` only when Tommy asks the team to adopt a concept, using the required teammate-approved PR.

## How to continue

Read this plan and Tommy's status first. Ask Tommy which concept he wants to refine, update these notes in English, and publish only his own planning/status documents. Do not resume the withdrawn UI prototype. Update the status and commit/push before Tommy takes a break.
