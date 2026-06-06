import { requireAdmin } from '../../_shared/auth.js';
import { json } from '../../_shared/response.js';
import { getSite, saveSite } from '../../_shared/site-store.js';

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;
  return json(await getSite(env));
}

export async function onRequestPut({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;
  try {
    const saved = await saveSite(env, await request.json());
    return json({ ok: true, site: saved });
  } catch (error) {
    console.error('site-save', error);
    return json({ error: 'Không thể lưu nội dung website' }, 500);
  }
}
