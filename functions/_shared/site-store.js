import { DEFAULT_SITE } from './default-site.js';
import { sanitizeDeep } from './sanitize.js';

const SITE_ID = 'main';

export async function getSite(env) {
  const row = await env.DB.prepare('SELECT content_json FROM site_content WHERE id = ?').bind(SITE_ID).first();
  if (!row?.content_json) return DEFAULT_SITE;
  try {
    return JSON.parse(row.content_json);
  } catch {
    return DEFAULT_SITE;
  }
}

export async function saveSite(env, input) {
  const content = sanitizeDeep(input);
  const now = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO site_content (id, content_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET content_json = excluded.content_json, updated_at = excluded.updated_at
  `).bind(SITE_ID, JSON.stringify(content), now).run();
  return content;
}
