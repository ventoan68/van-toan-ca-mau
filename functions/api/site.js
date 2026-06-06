import { getSite } from '../_shared/site-store.js';
import { json } from '../_shared/response.js';

export async function onRequestGet({ env }) {
  try {
    return json(await getSite(env), 200, { 'cache-control': 'public, max-age=60' });
  } catch {
    return json({ error: 'Không tải được dữ liệu website' }, 500);
  }
}
