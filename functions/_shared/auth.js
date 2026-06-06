import { json } from './response.js';

const enc = new TextEncoder();
const dec = new TextDecoder();
const SESSION_COOKIE = 'vt_session';
const SESSION_MAX_AGE = 60 * 60 * 8;
const HMAC_ALGORITHM = { name: 'HMAC', hash: { name: 'SHA-256' } };
const PBKDF2_HASH = { name: 'SHA-256' };

function logAuthError(stage, error) {
  console.error(JSON.stringify({
    stage,
    error: {
      name: error?.name || 'Error',
      message: error?.message || 'Unknown authentication error',
    },
  }));
}

function base64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), HMAC_ALGORITHM, false, ['sign']);
  return base64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(value))));
}

function safeEqual(a, b) {
  const x = enc.encode(a);
  const y = enc.encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i += 1) diff |= x[i] ^ y[i];
  return diff === 0;
}

export async function verifyPassword(password, stored) {
  if (!stored || !stored.startsWith('pbkdf2$sha256$')) return false;
  const parts = stored.split('$');
  if (parts.length !== 5) return false;
  const [, , iterRaw, salt, expected] = parts;
  const iterations = Number(iterRaw);
  if (!Number.isInteger(iterations) || iterations < 100000 || !salt || !expected) return false;
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: PBKDF2_HASH, salt: enc.encode(salt), iterations }, key, 256);
  return safeEqual(base64Url(new Uint8Array(bits)), expected);
}

export async function createSessionCookie(username, secret) {
  const payload = base64Url(enc.encode(JSON.stringify({ u: username, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE })));
  const sig = await hmac(secret, payload);
  return `${SESSION_COOKIE}=${payload}.${sig}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_MAX_AGE}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export async function getSession(request, env) {
  try {
    const raw = request.headers.get('cookie')?.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))?.[1];
    if (!raw || !env.SESSION_SECRET) return null;
    const [payload, sig] = raw.split('.');
    if (!payload || !sig) return null;
    const expected = await hmac(env.SESSION_SECRET, payload);
    if (!safeEqual(expected, sig)) return null;
    const data = JSON.parse(dec.decode(fromBase64Url(payload)));
    if (!data.u || data.exp <= Date.now() / 1000) return null;
    return data;
  } catch (error) {
    logAuthError('get_session', error);
    return null;
  }
}

export async function requireAdmin(request, env) {
  const session = await getSession(request, env);
  if (!session) return { response: json({ error: 'Chưa đăng nhập' }, 401) };
  return { session };
}
