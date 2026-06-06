import { requireAdmin } from '../../../_shared/auth.js';
import { json } from '../../../_shared/response.js';
import { cleanText } from '../../../_shared/sanitize.js';
import { QUOTE_STATUSES } from '../../../_shared/quotes.js';

export async function onRequestPatch({ request, env, params }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) return json({ error: 'ID không hợp lệ' }, 400);
    const body = await request.json();
    const status = cleanText(body.status, 40);
    const adminNote = cleanText(body.admin_note, 2000);
    if (!QUOTE_STATUSES.has(status)) return json({ error: 'Trạng thái không hợp lệ' }, 400);
    const now = new Date().toISOString();
    const result = await env.DB.prepare('UPDATE quote_requests SET status = ?, admin_note = ?, updated_at = ? WHERE id = ?')
      .bind(status, adminNote, now, id)
      .run();
    if (!result.meta?.changes) return json({ error: 'Không tìm thấy yêu cầu báo giá' }, 404);
    const quote = await env.DB.prepare('SELECT * FROM quote_requests WHERE id = ?').bind(id).first();
    return json({ ok: true, quote });
  } catch (error) {
    console.error('quote-update', error);
    return json({ error: 'Không thể cập nhật yêu cầu báo giá' }, 500);
  }
}


export async function onRequestDelete({ request, env, params }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) return json({ error: 'ID không hợp lệ' }, 400);
    const result = await env.DB.prepare('DELETE FROM quote_requests WHERE id = ?').bind(id).run();
    if (!result.meta?.changes) return json({ error: 'Không tìm thấy yêu cầu báo giá' }, 404);
    return json({ ok: true, deletedId: id, message: 'Đã xóa yêu cầu báo giá' });
  } catch (error) {
    console.error('quote-delete', error?.message || error);
    return json({ error: 'Không thể xóa yêu cầu báo giá' }, 500);
  }
}
