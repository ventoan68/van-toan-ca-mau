import { requireAdmin } from '../../../_shared/auth.js';
import { json } from '../../../_shared/response.js';
import { IMAGE_SEED_PRESET } from '../../../_shared/default-site.js';
import { getSite, saveSite, applyImageSeedPreset } from '../../../_shared/site-store.js';

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;
  const current = await getSite(env);
  return json({ ok: true, preview: applyImageSeedPreset(current, IMAGE_SEED_PRESET), preset: IMAGE_SEED_PRESET });
}

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;
  try {
    const current = await getSite(env);
    const next = applyImageSeedPreset(current, IMAGE_SEED_PRESET);
    const saved = await saveSite(env, next);
    return json({ ok: true, site: saved, message: 'Đã nạp bộ ảnh mẫu mới từ repository. Chỉ các trường ảnh và gallery được cập nhật.' });
  } catch (error) {
    console.error('site-seed-images', error?.message || error);
    return json({ error: 'Không thể nạp bộ ảnh mẫu mới từ repository' }, 500);
  }
}
