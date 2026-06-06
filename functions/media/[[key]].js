export async function onRequestGet({ params, env }) {
  const parts = Array.isArray(params.key) ? params.key : [params.key].filter(Boolean);
  const key = parts.join('/');
  if (!key || key.includes('..') || key.startsWith('/')) return new Response('Not found', { status: 404 });
  const object = await env.IMAGES.get(key);
  if (!object) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', headers.get('cache-control') || 'public, max-age=31536000, immutable');
  return new Response(object.body, { headers });
}
