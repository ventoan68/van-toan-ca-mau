import { requireAdmin } from '../../_shared/auth.js';
import { json } from '../../_shared/response.js';
import { cleanText, normalizeUploadName } from '../../_shared/sanitize.js';

const ALLOWED = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);
const MAX_SIZE = 5 * 1024 * 1024;

function makeKey(file) {
  const ext = ALLOWED.get(file.type);
  const base = normalizeUploadName(file.name).replace(/\.[^.]+$/, '');
  const rand = crypto.randomUUID().slice(0, 8);
  return `uploads/${new Date().toISOString().slice(0, 10)}/${Date.now()}-${rand}-${base}.${ext}`;
}

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;
  try {
    const form = await request.formData();
    const files = form.getAll('files').length ? form.getAll('files') : [form.get('file')].filter(Boolean);
    const uploaded = [];

    for (const file of files) {
      if (!file || typeof file.arrayBuffer !== 'function') return json({ error: 'Không tìm thấy file ảnh' }, 400);
      if (!ALLOWED.has(file.type)) return json({ error: 'Chỉ nhận JPG, JPEG, PNG hoặc WebP' }, 400);
      if (file.size > MAX_SIZE) return json({ error: 'Mỗi ảnh không được vượt quá 5MB' }, 400);
      const key = makeKey(file);
      await env.IMAGES.put(key, await file.arrayBuffer(), {
        httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' },
        customMetadata: { originalName: cleanText(file.name, 120) },
      });
      uploaded.push({ key, url: `/media/${key}`, name: file.name, size: file.size, type: file.type });
    }

    return json({ ok: true, files: uploaded });
  } catch (error) {
    console.error('upload', error);
    return json({ error: 'Không thể tải ảnh lên' }, 500);
  }
}

export async function onRequestDelete({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    const key = cleanText(body.key ?? String(body.url ?? '').replace(/^\/media\//, ''), 300);
    if (!key || key.includes('..') || key.startsWith('/') || !key.startsWith('uploads/')) {
      return json({ error: 'Đường dẫn ảnh không hợp lệ' }, 400);
    }
    await env.IMAGES.delete(key);
    return json({ ok: true });
  } catch {
    return json({ error: 'Không thể xóa ảnh' }, 500);
  }
}
