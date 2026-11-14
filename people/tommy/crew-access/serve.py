#!/usr/bin/env python3
"""Loopback-only crew-access prototype. No third-party dependencies."""
import argparse
from collections import defaultdict, deque
from contextlib import contextmanager
from functools import partial
import hashlib
import hmac
from http import cookies
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import math
import os
from pathlib import Path
import re
import secrets
import sqlite3
import threading
import time
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent
ITERATIONS = 600_000
SESSION_SECONDS = 8 * 60 * 60
BLOOD_TYPES = {'', 'A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−'}
ALLOWED_FILES = {'index.html', 'styles.css', 'app.js', 'assets/team-logo.png', 'assets/favicon.svg'}


class ValidationError(Exception):
    def __init__(self, fields):
        self.fields = fields


class CrewStore:
    def __init__(self, database):
        self.database = Path(database)
        self.database.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        with self.connect() as db:
            db.execute('''CREATE TABLE IF NOT EXISTS crew (
                id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL,
                first_name TEXT NOT NULL, last_name TEXT NOT NULL,
                salt BLOB NOT NULL, password_hash BLOB NOT NULL, profile TEXT NOT NULL
            )''')
        os.chmod(self.database, 0o600)
        self.sessions = {}
        self.attempts = defaultdict(deque)
        self.lock = threading.Lock()
        self.dummy_salt = secrets.token_bytes(16)

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.database, timeout=10)
        db.row_factory = sqlite3.Row
        try:
            with db:
                yield db
        finally:
            db.close()

    def public_user(self, row):
        return {'firstName': row['first_name'], 'lastName': row['last_name'],
                'username': row['username'], 'profile': json.loads(row['profile'])}

    def rate_limited(self, address):
        with self.lock:
            now = time.monotonic()
            attempts = self.attempts[address]
            while attempts and attempts[0] < now - 60:
                attempts.popleft()
            if len(attempts) >= 20:
                return True
            attempts.append(now)
            return False

    def create_session(self, username):
        token = secrets.token_urlsafe(32)
        with self.lock:
            self.sessions = {k: v for k, v in self.sessions.items() if v[1] > time.monotonic()}
            self.sessions[hashlib.sha256(token.encode()).digest()] = (username, time.monotonic() + SESSION_SECONDS)
        return token

    def session_user(self, token):
        digest = hashlib.sha256(token.encode()).digest()
        with self.lock:
            session = self.sessions.get(digest)
            if not session or session[1] < time.monotonic():
                self.sessions.pop(digest, None)
                return None
        with self.connect() as db:
            row = db.execute('SELECT * FROM crew WHERE username = ?', (session[0],)).fetchone()
        return self.public_user(row) if row else None

    def delete_session(self, token):
        with self.lock:
            self.sessions.pop(hashlib.sha256(token.encode()).digest(), None)


def validate_account(data):
    fields = {}
    clean = {}
    for key in ['firstName', 'lastName']:
        value = data.get(key, '')
        if not isinstance(value, str) or not 1 <= len(value.strip()) <= 60:
            fields[key] = 'Enter a name between 1 and 60 characters.'
        else:
            clean[key] = value.strip()
    username = data.get('username', '')
    if not isinstance(username, str) or not re.fullmatch(r'[A-Za-z0-9_]{3,24}', username):
        fields['username'] = 'Use 3–24 letters, numbers, or underscores.'
    else:
        clean['username'] = username.lower()
    password = data.get('password', '')
    if not isinstance(password, str) or not 8 <= len(password) <= 128:
        fields['password'] = 'Use 8–128 characters.'
    elif password != data.get('confirmPassword'):
        fields['confirmPassword'] = 'Passwords must match.'
    else:
        clean['password'] = password
    profile = data.get('profile')
    if not isinstance(profile, dict):
        profile = {}
    clean_profile = {}
    for key, low, high in [('age', 1, 120), ('height', 30, 300), ('weight', 1, 500)]:
        value = profile.get(key)
        if (isinstance(value, bool) or not isinstance(value, (int, float)) or
                not math.isfinite(value) or not low <= value <= high or
                (key == 'age' and value != int(value))):
            fields[key] = f'Enter {key} from {low} to {high}' + (' in whole years.' if key == 'age' else '.')
        else:
            clean_profile[key] = value
    blood = profile.get('bloodType', '')
    if not isinstance(blood, str) or blood not in BLOOD_TYPES:
        fields['bloodType'] = 'Choose a blood type from the list.'
    notes = profile.get('allergies', '')
    if not isinstance(notes, str) or len(notes) > 500:
        fields['allergies'] = 'Use up to 500 characters.'
    if fields:
        raise ValidationError(fields)
    clean_profile.update(bloodType=blood, allergies=notes.strip())
    clean['profile'] = clean_profile
    return clean


class Handler(SimpleHTTPRequestHandler):
    server_version = 'PulsePrototype'

    def __init__(self, *args, store, **kwargs):
        self.store = store
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *_args):
        # Never log account details, credentials, health records, or request bodies.
        pass

    def end_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'")
        super().end_headers()

    def reply(self, status, body, token=None, clear=False):
        payload = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(payload)))
        if token:
            self.send_header('Set-Cookie', f'pulse_session={token}; HttpOnly; SameSite=Strict; Path=/; Max-Age={SESSION_SECONDS}')
        if clear:
            self.send_header('Set-Cookie', 'pulse_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0')
        self.end_headers()
        self.wfile.write(payload)

    def session_token(self):
        jar = cookies.SimpleCookie()
        try:
            jar.load(self.headers.get('Cookie', ''))
        except cookies.CookieError:
            return ''
        return jar['pulse_session'].value if 'pulse_session' in jar else ''

    def static_path_allowed(self):
        path = unquote(urlsplit(self.path).path).lstrip('/') or 'index.html'
        return path in ALLOWED_FILES

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == '/api/session':
            return self.reply(200, {'user': self.store.session_user(self.session_token())})
        if not self.static_path_allowed():
            return self.reply(404, {'message': 'Not found.'})
        super().do_GET()

    def do_HEAD(self):
        if not self.static_path_allowed():
            self.send_error(404)
            return
        super().do_HEAD()

    def do_POST(self):
        path = urlsplit(self.path).path
        if path not in {'/api/signup', '/api/login', '/api/logout'}:
            return self.reply(404, {'message': 'Not found.'})
        port = self.server.server_port
        origin = self.headers.get('Origin')
        if (self.headers.get('X-Pulse-Request') != '1' or
                (origin and origin not in {f'http://127.0.0.1:{port}', f'http://localhost:{port}'})):
            return self.reply(403, {'message': 'Use this app from the local preview.'})
        if path != '/api/logout' and self.store.rate_limited(self.client_address[0]):
            return self.reply(429, {'message': 'Too many attempts. Wait a minute and try again.'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 8192:
                return self.reply(400, {'message': 'Request must be between 1 and 8192 bytes.'})
            data = json.loads(self.rfile.read(length))
            if not isinstance(data, dict):
                raise ValueError
        except (ValueError, UnicodeDecodeError):
            return self.reply(400, {'message': 'Invalid request.'})
        try:
            if path == '/api/signup':
                return self.signup(data)
            if path == '/api/login':
                return self.login(data)
            self.store.delete_session(self.session_token())
            return self.reply(200, {'ok': True}, clear=True)
        except ValidationError as error:
            return self.reply(400, {'message': 'Please check the highlighted fields.', 'fields': error.fields})
        except sqlite3.Error:
            return self.reply(500, {'message': 'The local account store is unavailable. Please try again.'})

    def signup(self, data):
        clean = validate_account(data)
        salt = secrets.token_bytes(16)
        password_hash = hashlib.pbkdf2_hmac('sha256', clean['password'].encode(), salt, ITERATIONS)
        try:
            with self.store.connect() as db:
                db.execute('INSERT INTO crew (username, first_name, last_name, salt, password_hash, profile) VALUES (?, ?, ?, ?, ?, ?)',
                           (clean['username'], clean['firstName'], clean['lastName'], salt, password_hash, json.dumps(clean['profile'])))
        except sqlite3.IntegrityError:
            return self.reply(409, {'message': 'That username is already taken. Choose another one.', 'fields': {'username': 'This username is already in use.'}})
        self.store.delete_session(self.session_token())
        token = self.store.create_session(clean['username'])
        return self.reply(201, {'user': self.store.session_user(token)}, token=token)

    def login(self, data):
        username, password = data.get('username'), data.get('password')
        if not isinstance(username, str) or not isinstance(password, str) or len(username) > 24 or len(password) > 128:
            return self.reply(401, {'message': 'Username or password is incorrect.'})
        with self.store.connect() as db:
            row = db.execute('SELECT * FROM crew WHERE username = ?', (username.lower(),)).fetchone()
        computed = hashlib.pbkdf2_hmac('sha256', password.encode(), row['salt'] if row else self.store.dummy_salt, ITERATIONS)
        if not row or not hmac.compare_digest(computed, row['password_hash']):
            return self.reply(401, {'message': 'Username or password is incorrect.'})
        self.store.delete_session(self.session_token())
        token = self.store.create_session(row['username'])
        return self.reply(200, {'user': self.store.public_user(row)}, token=token)


def make_server(port=4173, database=None):
    store = CrewStore(database or ROOT / '.local' / 'crew.sqlite3')
    return ThreadingHTTPServer(('127.0.0.1', port), partial(Handler, store=store))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=4173)
    parser.add_argument('--database', type=Path, default=ROOT / '.local' / 'crew.sqlite3')
    args = parser.parse_args()
    server = make_server(args.port, args.database)
    print(f'Local: http://127.0.0.1:{server.server_port}', flush=True)
    print('Local prototype only. Use sample account and health details. Ctrl+C to stop.', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
