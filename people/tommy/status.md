# tommy

## Profile

- GitHub: tommy2002t
- AI tool: Codex (desktop app)
- Operating system: macOS

## Now

- Last updated: 2026-11-14 13:04
- Working on: First crew access UI is ready for Tommy to review.
- Branch: tommy/crew-access-ui

## Done

- Completed onboarding with a repository-local GitHub noreply email.
- Read Tommy's supplied project concept and team logo.
- Created the branded Start screen, Log in, two-step Sign up, and profile welcome screen in `people/tommy/crew-access/`.
- Added a loopback-only account server with ignored local storage and sample-data demo.
- Passed 9 automated account/server tests, including private-file exposure and session checks.
- Verified registration, duplicate usernames, incorrect/correct login, session reload, logout, and demo in the browser; checked layouts at 390px and 1440px.

## Blocked / need from others

- Team backend and production identity integration are not yet agreed; the current implementation is a local prototype.

## Next steps

- Continue on `tommy/crew-access-ui`: review the first UI with Tommy, then choose the next screen.
- Connect the relative `/api/` account endpoints to the team backend when agreed; see the UI README for the contract.
- Run locally with `python3 people/tommy/crew-access/serve.py`; use sample details.
