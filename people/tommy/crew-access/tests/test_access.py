import hashlib
from contextlib import closing
import http.client
import importlib.util
import json
from pathlib import Path
import sqlite3
import tempfile
import threading
import time
import unittest

spec = importlib.util.spec_from_file_location('crew_access', Path(__file__).resolve().parents[1] / 'serve.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class CrewAccessTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.database = Path(cls.temp.name) / 'crew.sqlite3'
        cls.server = module.make_server(0, cls.database)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.port = cls.server.server_port

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()
        cls.temp.cleanup()

    def setUp(self):
        self.server.RequestHandlerClass.keywords['store'].attempts.clear()

    def request(self, path, data=None, cookie='', extra_headers=None, method=None):
        connection = http.client.HTTPConnection('127.0.0.1', self.port, timeout=10)
        headers = {'Content-Type': 'application/json', 'X-Pulse-Request': '1'}
        if cookie:
            headers['Cookie'] = cookie
        headers.update(extra_headers or {})
        connection.request(method or ('GET' if data is None else 'POST'), path,
                           body=None if data is None else json.dumps(data), headers=headers)
        response = connection.getresponse()
        payload = response.read()
        content = json.loads(payload) if response.getheader('Content-Type', '').startswith('application/json') else payload
        result = response.status, dict(response.getheaders()), content
        connection.close()
        return result

    def account(self, username='test_crew'):
        return {'firstName': 'Test', 'lastName': 'Crew', 'username': username,
                'password': 'sample-password-123', 'confirmPassword': 'sample-password-123',
                'profile': {'age': 35, 'height': 178, 'weight': 74.5, 'bloodType': 'O+', 'allergies': ''}}

    def test_full_account_lifecycle_and_session_rotation(self):
        status, headers, body = self.request('/api/signup', self.account('lifecycle'))
        self.assertEqual(status, 201)
        self.assertEqual(body['user']['profile']['weight'], 74.5)
        self.assertNotIn('password', json.dumps(body))
        cookie = headers['Set-Cookie'].split(';')[0]
        self.assertIn('HttpOnly', headers['Set-Cookie'])
        self.assertIn('SameSite=Strict', headers['Set-Cookie'])
        self.assertEqual(self.request('/api/session', cookie=cookie)[2]['user']['username'], 'lifecycle')
        status, headers, _ = self.request('/api/login', {'username': 'LIFECYCLE', 'password': 'sample-password-123'}, cookie=cookie)
        self.assertEqual(status, 200)
        self.assertIsNone(self.request('/api/session', cookie=cookie)[2]['user'])
        new_cookie = headers['Set-Cookie'].split(';')[0]
        self.assertEqual(self.request('/api/logout', {}, cookie=new_cookie)[0], 200)
        self.assertIsNone(self.request('/api/session', cookie=new_cookie)[2]['user'])

    def test_credentials_are_salted_hashed_and_profile_is_durable(self):
        self.assertEqual(self.request('/api/signup', self.account('hashed_one'))[0], 201)
        self.assertEqual(self.request('/api/signup', self.account('hashed_two'))[0], 201)
        with closing(sqlite3.connect(self.database)) as db:
            rows = db.execute("SELECT salt, password_hash FROM crew WHERE username IN ('hashed_one','hashed_two') ORDER BY username").fetchall()
        self.assertNotEqual(rows[0][0], rows[1][0])
        self.assertNotEqual(rows[0][1], rows[1][1])
        self.assertNotIn(b'sample-password-123', self.database.read_bytes())
        restarted = module.CrewStore(self.database)
        with restarted.connect() as db:
            row = db.execute('SELECT * FROM crew WHERE username = ?', ('hashed_one',)).fetchone()
        self.assertEqual(restarted.public_user(row)['profile']['height'], 178)

    def test_duplicate_usernames_are_case_insensitive(self):
        self.assertEqual(self.request('/api/signup', self.account('duplicate'))[0], 201)
        status, _, body = self.request('/api/signup', self.account('DUPLICATE'))
        self.assertEqual(status, 409)
        self.assertIn('username', body['fields'])

    def test_invalid_health_and_mismatched_passwords_are_rejected(self):
        data = self.account('invalid')
        data['confirmPassword'] = 'different'
        data['profile'].update(age=2.5, height=0, weight=True)
        status, _, body = self.request('/api/signup', data)
        self.assertEqual(status, 400)
        for field in ['confirmPassword', 'age', 'height', 'weight']:
            self.assertIn(field, body['fields'])

    def test_wrong_and_unknown_credentials_have_same_response(self):
        self.request('/api/signup', self.account('known'))
        wrong = self.request('/api/login', {'username': 'known', 'password': 'wrong'})
        unknown = self.request('/api/login', {'username': 'unknown', 'password': 'wrong'})
        self.assertEqual(wrong[0], 401)
        self.assertEqual(wrong[2], unknown[2])

    def test_expired_and_missing_sessions(self):
        self.assertIsNone(self.request('/api/session')[2]['user'])
        _, headers, _ = self.request('/api/signup', self.account('expiry'))
        cookie = headers['Set-Cookie'].split(';')[0]
        store = self.server.RequestHandlerClass.keywords['store']
        digest = hashlib.sha256(cookie.split('=', 1)[1].encode()).digest()
        store.sessions[digest] = ('expiry', time.monotonic() - 1)
        self.assertIsNone(self.request('/api/session', cookie=cookie)[2]['user'])

    def test_database_source_and_path_traversal_are_not_served(self):
        for path in ['/.local/crew.sqlite3', '/serve.py', '/tests/test_access.py', '/%2e%2e/README.md', '/.gitignore']:
            self.assertEqual(self.request(path)[0], 404, path)
            self.assertEqual(self.request(path, method='HEAD')[0], 404, path)
        for path in ['/', '/app.js', '/styles.css', '/assets/team-logo.png']:
            self.assertEqual(self.request(path)[0], 200, path)

    def test_foreign_origins_and_missing_request_header_are_blocked(self):
        self.assertEqual(self.request('/api/signup', self.account('foreign'), extra_headers={'Origin': 'https://example.com'})[0], 403)
        self.assertEqual(self.request('/api/signup', self.account('no_header'), extra_headers={'X-Pulse-Request': ''})[0], 403)

    def test_attempt_limit(self):
        for _ in range(20):
            self.assertEqual(self.request('/api/login', {'username': None, 'password': None})[0], 401)
        self.assertEqual(self.request('/api/login', {'username': None, 'password': None})[0], 429)


if __name__ == '__main__':
    unittest.main()
