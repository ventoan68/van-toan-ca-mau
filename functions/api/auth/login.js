import { createSessionCookie, verifyPassword } from '../../_shared/auth.js';
import { json } from '../../_shared/response.js';
import { cleanText } from '../../_shared/sanitize.js';

function logLoginError(stage, error) {
  console.error(JSON.stringify({
    stage,
    error: {
      name: error?.name || 'Error',
      message: error?.message || 'Unknown login error',
    },
  }));
}

export async function onRequestPost({ request, env }) {
  let stage = 'read_env';
  try {
    if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD_HASH || !env.SESSION_SECRET) {
      return json({ error: 'Admin chưa được cấu hình' }, 503);
    }

    stage = 'parse_json_body';
    const body = await request.json();
    const username = cleanText(body.username, 80);
    const password = String(body.password ?? '');

    stage = 'verify_password';
    const passwordOk = await verifyPassword(password, env.ADMIN_PASSWORD_HASH);
    if (username !== env.ADMIN_USERNAME || !passwordOk) {
      return json({ error: 'Thông tin đăng nhập không hợp lệ' }, 401);
    }

    stage = 'create_session_cookie';
    const cookie = await createSessionCookie(username, env.SESSION_SECRET);

    stage = 'return_set_cookie';
    return json({ ok: true, username }, 200, { 'Set-Cookie': cookie });
  } catch (error) {
    logLoginError(stage, error);
    return json({ error: 'Không thể đăng nhập' }, 400);
  }
}
