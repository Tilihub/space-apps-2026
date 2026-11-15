# Medical bay, training and private-support follow-up

Tommy's latest presentation direction, 2026-11-15. Branch: tommy/frontend-polish, PR #74. These changes stay in the integration's browser presentation layer. Owner modules and shared contracts are unchanged.

## Implemented crew UI

- Locked bins use a faint transparent red tint and a red highlight, based on the API's per-person locked state. This includes Tomas's NSAID blocks. Available gauze/supplies keep the ordinary appearance; open bins stay green. Blue/red/green use the same hover and selection rules, with one continuous selected frame and no offset double outline.
- The emergency banner has a dismiss button. Hiding a notification records its incident ID for this person in this browser session; it does not resolve the incident or hide future incident IDs. Tommy explicitly asked to clear the old demonstration incidents: they were closed through the existing medical-officer paperwork endpoint on ports 8012/8017/8018, leaving zero open incidents without resetting other records.
- One global Start training starts the next session from Petros's controller. Manual summary/recovery/dismiss actions, Saved sessions, day-of-week strip/labels and No pulse sensor are absent from the crew presentation. Assigned exercise order, set completion, rest reminders and the resistance-to-rowing spacing remain.
- After Stop/completion, the browser waits a full mission minute and calls the original controller's save with recovery automatically. It also works while another page is open. Failed saves retry after 15 mission seconds, using the original duplicate protection. The app must remain open through recovery/save; the owner's in-memory workout controller still does not restore an unfinished run after a page reload.
- Heart-rate and breathing plots use a rolling five-minute window with a clear Simulated badge. Heart-rate summary records identify their synthetic source. The weekly demo extends the published synthetic stage ramp with additional fictional samples; breathing is explicitly synthesized, not taken from astronaut telemetry. Fictional negative-time pre-start display samples provide context but never enter the controller's nonnegative replay or workout summary.
- Psychologist chat accepts free text and displays a scripted reply locally. Its header/footer explicitly identify the simulation and absence of Earth delivery. No journal, psychologist message or private fact is sent to Earth, reports, or the companion through this mockup. The local conversation clears on profile switch/sign-out/reload.
- Overview describes Mars transit, replacing the orbit wording.

## Drafts awaiting owner integration

Tommy explicitly chose drafts until the team connects the missing backend support.

### Defibrillator — dadis2 and zt

The L3 display has a three-column equipment compartment, marked Planned equipment. Its details are a noncollectable draft; no fake item is inserted into the catalogue or sent to the meds API. Connect it through a separately reviewed inventory/equipment change: real item identity/location, emergency authorization, checkout/return state, availability and logging. The current medicine-dose model should not be silently assumed to represent reusable equipment. Keep the existing medicines, grants and stock unchanged.

### Exercise load and PR — Petros, Angelos and zt

The current exercise has an editable manual kilogram field with stacked +/− controls in 5 kg steps. It is explicitly a load draft, not saved to health records; there is no Not connected placeholder preventing entry. Ordinary form draft restoration preserves the entry during set toggles. The current workout schema records total reps and pulse summary, not exercise-level loads or PRs. PR remains blank rather than inventing history.

Agree exercise identity, performed sets/reps/load, units, personal-record comparison and ownership before adding durable storage. Petros's prescribed equipment is a compact flywheel: a kilogram label is a product draft, not an established conversion from flywheel inertia to external load. Do not add arbitrary load fields to the existing strict workout endpoint or reinterpret total reps as weight.

### Psychologist transport — zt and the assigned owner

The free-text UI is a scripted preview, not a connected clinician. Real delivery needs the separately agreed psychologist identity/role, private author-recipient access, queued/sent/received states and retention. The ordinary Earth medical role must not gain private journal/chat access through this work.

## Verification

- Root npm test: 102 passed, none skipped. JavaScript syntax and diff checks passed.
- Browser checked Tomas's real allergy block/red tint, neutral available gauze, L3 equipment spanning all three columns, and the single-frame computed outline/shadow.
- Banner dismissal survived reload; a new incident appeared again, while the dismissed incident remained open until Tommy explicitly requested clinical closure.
- Browser completed four set ticks and one exercise, stopped, moved to Wellbeing and automatically saved exactly one summary through the existing health API after recovery. Temporary record: 48 reps, synthetic source, a non-null recovery value.
- Additional controller/display checks covered five-minute nonfuture plot windows, nonnegative saved replay samples, recovery timing and duplicate-save prevention.
- Browser sent free-form text in the psychologist preview and displayed a scripted reply. No external transport was invoked.

## Latest Overview/task correction

The fourth Overview instrument is now Daily tasks, not a count of sessions: wellbeing (explicit completion of all ten questions) and training. Training's task cue closes immediately on session end, and a per-person/day visual marker survives reload before recovery storage finishes. It is not a fabricated workout record. A new day or demo reset clears that marker; rest days have no pending exercise requirement.

Load entry uses stacked +/− controls, five kilograms per press, and no large suggestion popup. L1 remains ten items/two pages following Tommy's cancellation of the proposed reduction. Port 8018's missing current entries were populated using the existing agreed presentation seeder, with no store reset or workout overwrite.

## Explicit wellbeing and timer correction

Preset core records no longer complete the wellbeing task. The user answers all ten questions and presses Finish daily wellbeing. This UI completion marker is separate from the three persisted core values and seven local drafts.

One-second rendering interpolates the synchronized server clock without changing API/save timestamps. Exercise time resets independently of session time; final sets do not restart rest; interval labels follow the original controller. Four new regression checks and browser validation passed (106 root tests total). Overview-space proposals remain in overview-space-proposal.md.
