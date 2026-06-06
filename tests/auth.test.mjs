import assert from 'node:assert/strict';
import { test } from 'node:test';
import { onRequestPost as loginPost } from '../functions/api/auth/login.js';
import { onRequestGet as meGet } from '../functions/api/auth/me.js';

const enc = new TextEncoder();

function base64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function makeHash(password, salt = 'test-salt', iterations = 100000) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: { name: 'SHA-256' }, salt: enc.encode(salt), iterations }, key, 256);
  return `pbkdf2$sha256$${iterations}$${salt}$${base64Url(new Uint8Array(bits))}`;
}

async function login({ username = 'admin', password = 'correct-password', env }) {
  return loginPost({
    env,
    request: new Request('https://example.test/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }),
  });
}

test('valid PBKDF2 hash can log in and creates a session cookie', async () => {
  const env = {
    ADMIN_USERNAME: 'admin',
    ADMIN_PASSWORD_HASH: await makeHash('correct-password'),
    SESSION_SECRET: 'test-session-secret-at-least-32-characters',
  };

  const response = await login({ env });
  const body = await response.json();
  const cookie = response.headers.get('set-cookie');

  assert.equal(response.status, 200);
  assert.deepEqual(body, { ok: true, username: 'admin' });
  assert.match(cookie, /^vt_session=[^.]+\.[^;]+; Path=\/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800$/);
});

test('wrong password is rejected', async () => {
  const env = {
    ADMIN_USERNAME: 'admin',
    ADMIN_PASSWORD_HASH: await makeHash('correct-password'),
    SESSION_SECRET: 'test-session-secret-at-least-32-characters',
  };

  const response = await login({ password: 'wrong-password', env });
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error, 'Thông tin đăng nhập không hợp lệ');
  assert.equal(response.headers.get('set-cookie'), null);
});

test('wrong username is rejected', async () => {
  const env = {
    ADMIN_USERNAME: 'admin',
    ADMIN_PASSWORD_HASH: await makeHash('correct-password'),
    SESSION_SECRET: 'test-session-secret-at-least-32-characters',
  };

  const response = await login({ username: 'other-admin', env });
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error, 'Thông tin đăng nhập không hợp lệ');
  assert.equal(response.headers.get('set-cookie'), null);
});

test('GET /api/auth/me recognizes a valid session', async () => {
  const env = {
    ADMIN_USERNAME: 'admin',
    ADMIN_PASSWORD_HASH: await makeHash('correct-password'),
    SESSION_SECRET: 'test-session-secret-at-least-32-characters',
  };

  const loginResponse = await login({ env });
  const cookie = loginResponse.headers.get('set-cookie');
  const response = await meGet({
    env,
    request: new Request('https://example.test/api/auth/me', {
      headers: { cookie },
    }),
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, { authenticated: true, username: 'admin' });
});
