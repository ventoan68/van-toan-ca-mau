import { getSession } from '../../_shared/auth.js';
import { json } from '../../_shared/response.js';

export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ authenticated: false }, 401);
  return json({ authenticated: true, username: session.u });
}
