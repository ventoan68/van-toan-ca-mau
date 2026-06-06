import { clearSessionCookie } from '../../_shared/auth.js';
import { json } from '../../_shared/response.js';

export async function onRequestPost() {
  return json({ ok: true }, 200, { 'set-cookie': clearSessionCookie() });
}
