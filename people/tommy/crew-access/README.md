# Crew access UI — May the Pulse Be With You

Tommy's first interface prototype. Everything here is isolated in `people/tommy/crew-access/`.

## Run

From the repository root, with Python 3.10 or newer:

```sh
python3 people/tommy/crew-access/serve.py
```

Open <http://127.0.0.1:4173>. No package installation or build is required. Stop with Ctrl+C.

## Included

- Branded Start screen using the supplied team logo, blended into the dark background with CSS.
- Username/password login, password visibility controls, and accessible inline validation.
- Two-step registration: name and credentials, then age, height (cm), weight (kg), optional blood type and health notes.
- A welcome screen showing the signed-in person's baseline profile; logout and a separate sample-data demo.
- Responsive layouts, keyboard navigation, reduced-motion support, and system-font fallback if Google Fonts is unavailable.

## Prototype boundary

This is a loopback-only development app, not production authentication or a medical service. Use sample information. Profiles are stored in an ignored local SQLite database (`.local/crew.sqlite3`); nothing is sent to a medical service. Passwords are salted and hashed with PBKDF2-HMAC-SHA256, not stored as plaintext. Sessions use HttpOnly, SameSite=Strict cookies, expire after eight hours, and reset when the server restarts. The HTTP server deliberately serves only public UI assets, never the database or source files. It has basic request validation and an attempt limit; production needs the team's chosen identity service, HTTPS, data policy, deployment hardening, and review.

The demo profile is explicitly sample data and is never saved. No medication advice, real sensor values, medical decisions, biometric login, inventory unlocking, or live Earth communication is implemented. Those are future team-owned integrations. Credentials and health notes are not written to logs or committed to Git. To reset the local prototype, stop it and remove its `.local/` folder.

## Integration contract

The UI calls relative JSON endpoints with the `X-Pulse-Request: 1` header:

| Endpoint | Request | Success |
| --- | --- | --- |
| `POST /api/signup` | `firstName`, `lastName`, `username`, `password`, `confirmPassword`, `profile` | `201 { user }` and session cookie |
| `POST /api/login` | `username`, `password` | `200 { user }` and session cookie |
| `GET /api/session` | none | `200 { user }`, or `{ user: null }` |
| `POST /api/logout` | `{}` | `200 { ok: true }` and cleared cookie |

`user` contains `firstName`, `lastName`, `username`, and `profile` only. `profile` contains numeric `age`, `height`, `weight`, and optional strings `bloodType`, `allergies`. Validation responses use `{ message, fields?: { fieldName: message } }`. Usernames are case-insensitive. Replace this local server with the team's backend through the same contract when integrating.

## Checks

```sh
python3 -m unittest discover -s people/tommy/crew-access/tests -v
```

The tests use a temporary database and sample data. They cover account lifecycle, persistence, session expiry, validation, duplicate usernames, password hashing, request origin checks, rate limiting, and private-file exposure.
