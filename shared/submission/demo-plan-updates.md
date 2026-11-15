# Demo plan updates for Tommy (15 November, evening)

For Tommy and his coding tool. Tommy's presentation plan in `people/tommy/presentation/` was written
before the decisions below. Only Tommy edits that folder, so this note lists what is now out of
date there. Decided by zt with the team on 15 November; built and checked in the app the same day.
How the prepared start works: [deploy.md](deploy.md), "The prepared start".

## What changed in the app

- **The public demo exists and is required.** The organisers don't accept localhost; the app is live
  at https://pulse-crew-health.onrender.com/ and always opens on a prepared mission day 42.
- **The presentation reset is built.** Every start, every Reset and the end of day 42 load the
  prepared start: today's check-ins, Tomas's headache and his sleeping-pill request waiting for
  Earth, Ines's journal and nine of her ten wellbeing answers, and Mara's 700 Pulsars from days 38–40.
- **Mara's scene uses the stage push-ups.** Exercise → Program → Stage demo. Any number of push-ups
  gives +200 for the exercise and +100 for a new personal best, every run. From 700 she reaches
  1,000 and can buy the round spectacles. No 25 kg squat is needed.
- **Ines's scene:** the first nine wellbeing answers are already filled in. The presenter answers
  the tenth, "How mentally refreshed have you felt?", presses Finish, and gets +100.
- **Leo's scene needs rewriting.** Since dadis2's #85 the medical officer console has only
  Approvals and Inventory. There is no clinician view of Tomas's sleep comparison any more, and the
  team decided to keep it that way. What exists for that minute: Tomas's sleeping-pill request
  waits for Earth; the Earth console approves it or shows the ready QR code; Tomas scans or types the
  code in Medical bay → My treatment and collects the due dose. Leo's Inventory tab can also take
  any medicine for any crew member, logged.

## Lines in Tommy's plan that are now wrong

| File | Line | Now |
|---|---|---|
| `seven-minute-run.md` | 20, Introduction: "Do not claim deployed public hosting" | The app is publicly hosted; say so and show the link |
| `seven-minute-run.md` | 3, "the separate complete presentation-reset initializer is still not implemented" | Built; Reset loads the prepared start |
| `seven-minute-run.md` | 9 and 12, Scenario 2 "valid PR" and Scenario 5 "clinician assessment" | Stage push-ups with the fixed rewards; Leo's minute without the clinician view |
| `README.md` | 13, Mara: "record a valid higher kilogram PR" | Stage push-ups, any count: +200 and +100 |
| `README.md` | 16, Leo: "Show Tomas's detailed sleep comparison in the clinician role" | Not possible; use the Earth request, QR and collection |
| `README.md` | 24, "The complete automatic presentation initializer is not implemented yet" | Built |
| `five-scenarios.md` | 15–17, Mara's 25 kg squat | Stage push-ups instead |
| `five-scenarios.md` | 43–49, Leo's "clinical comparison" core | Not possible; see above |

Everything else in the plan (timing, Kai's defibrillator scene, Tomas's opening, the closing) still
matches the app.
