import { requireAdmin } from '../../_shared/auth.js';
import { json } from '../../_shared/response.js';
import { QUOTE_STATUSES } from '../../_shared/quotes.js';

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;
  const url = new URL(request.url);
  const status = url.searchParams.get('status') || '';
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 100);
  let stmt;
  if (status && QUOTE_STATUSES.has(status)) {
    stmt = env.DB.prepare('SELECT * FROM quote_requests WHERE status = ? ORDER BY created_at DESC LIMIT ?').bind(status, limit);
  } else {
    stmt = env.DB.prepare('SELECT * FROM quote_requests ORDER BY created_at DESC LIMIT ?').bind(limit);
  }
  const { results } = await stmt.all();
  return json({ ok: true, quotes: results || [] });
}
