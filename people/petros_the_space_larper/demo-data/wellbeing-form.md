# PET-2 daily wellbeing form proposal

The form is a product check-in aligned with [Tommy's Q11–Q17](../../tommy/plan.md), the proposed [ZT app contract](https://github.com/Tilihub/space-apps-2026/blob/fb0c20f/shared/contract/README.md), and the [PET-1 fixtures](README.md). These are proposed labels for the team to review. They do not define a validated psychometric instrument.

| Order and field | Exact prompt | Recall and answer | Save behavior |
|---|---|---|---|
| 1. `sleepHours` | How many hours did you sleep in the last 24 hours, including naps? | Previous 24 hours. Hours from 0 to 24. | Optional. A true zero means no sleep. |
| 2. `mood` | How would you rate your mood over the last 24 hours? | Previous 24 hours. 1 = Very low mood, 10 = Very good mood. Higher = better mood. | Optional whole number. |
| 3. `stress` | How stressed did you feel over the last 24 hours? | Previous 24 hours. 1 = Not stressed at all, 10 = Extremely stressed. Higher = more stress. | Optional whole number. |
| 4. `fatigue` | How fatigued did you feel over the last 24 hours? | Previous 24 hours. 1 = Not fatigued at all, 10 = Extremely fatigued. Higher = more fatigue. | Optional whole number. |
| Private journal | Is there anything you want to write down privately? | Optional free text. It can describe any period. | Separate save action in Mind, with the proposed 5,000-character limit. |

Save one check-in per mission day. Require at least one observed answer in the combined daily check-in. Start every input unanswered and store skipped items as `null`. Keep **Request private support** available independently of the form.

Use versioned 1–10 fields for new mood, stress and fatigue inputs. Preserve old 0–10 records and references under their original declared scale. Compare like with like. The proposed demo starts with a new synthetic 1–10 reference. Symptom severity and established questionnaire scores are their own instruments, so neither enters the wellbeing comparison.

The only human journal readers are the author and their assigned psychologist. The author's chatbot may use the journal for the author's own session, subject to the integration's configured private processing path. Standard medical reports, role dashboards, and ordinary transmission queues omit both the text and private facts derived from it. The current ZT draft implements only author access in its first Mind contract. Psychologist access, permitted assistant processing and retention still need integration. Numeric check-in permissions are handled separately. The crew's basic daily summary is distinct from the clinician-only detailed history and weekly analysis in Tommy's latest brief.
