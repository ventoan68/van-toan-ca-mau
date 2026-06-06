import { createSessionCookie, verifyPassword } from '../../_shared/auth.js';
import { json } from '../../_shared/response.js';
import { cleanText } from '../../_shared/sanitize.js';

export async function onRequestPost({ request, env }) {
  try {
    if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD_HASH || !env.SESSION_SECRET) {
      return json({ error: 'Admin chưa được cấu hình' }, 503);
    }
    const body = await request.json();
    const username = cleanText(body.username, 80);
    const password = String(body.password ?? '');
    const ok = username === env.ADMIN_USERNAME && await verifyPassword(password, env.ADMIN_PASSWORD_HASH);
    if (!ok) return json({ error: 'Thông tin đăng nhập không hợp lệ' }, 401);
    return json({ ok: true, username }, 200, { 'set-cookie': await createSessionCookie(username, env.SESSION_SECRET) });
  } catch {
    return json({ error: 'Không thể đăng nhập' }, 400);
  }
}
