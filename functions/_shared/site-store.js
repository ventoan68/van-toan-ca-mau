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

function byIdOrTitle(items = [], patchItems = []) {
  if (!Array.isArray(items) || !Array.isArray(patchItems)) return items;
  return items.map((item) => {
    const patch = patchItems.find((entry) => (entry.id && entry.id === item.id) || (entry.title && entry.title === item.title));
    if (!patch) return item;
    return {
      ...item,
      ...(patch.image ? { image: patch.image } : {}),
      ...(patch.cover ? { cover: patch.cover } : {}),
      ...(Array.isArray(patch.images) ? { images: patch.images } : {}),
    };
  });
}

function servicesByTitle(items = [], patchItems = []) {
  if (!Array.isArray(items) || !Array.isArray(patchItems)) return items;
  return items.map((item) => {
    const patch = patchItems.find((entry) => entry.title === item.title);
    return patch?.image ? { ...item, image: patch.image } : item;
  });
}

export function applyImageSeedPreset(site, preset) {
  const next = structuredClone(site || DEFAULT_SITE);
  if (preset?.brand?.heroImage) next.brand = { ...next.brand, heroImage: preset.brand.heroImage };
  if (preset?.about?.image) next.about = { ...(next.about || {}), image: preset.about.image };
  next.services = servicesByTitle(next.services, preset?.services);
  next.products = byIdOrTitle(next.products, preset?.products);
  next.projects = byIdOrTitle(next.projects, preset?.projects);
  next.posts = byIdOrTitle(next.posts, preset?.posts);
  return next;
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
