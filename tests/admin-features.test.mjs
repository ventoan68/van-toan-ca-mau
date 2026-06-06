import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSessionCookie } from '../functions/_shared/auth.js';
import { applyImageSeedPreset } from '../functions/_shared/site-store.js';
import { onRequestDelete as deleteQuote } from '../functions/api/admin/quotes/[id].js';

async function adminRequest(url = 'https://example.test/api/admin/quotes/1') {
  const cookie = await createSessionCookie('admin', 'test-session-secret-at-least-32-characters');
  return new Request(url, { method: 'DELETE', headers: { cookie } });
}

function envWithDeleteResult(changes) {
  return {
    SESSION_SECRET: 'test-session-secret-at-least-32-characters',
    DB: {
      prepare(sql) {
        assert.match(sql, /DELETE FROM quote_requests WHERE id = \?/);
        return {
          bind(id) {
            return {
              async run() {
                return { meta: { changes }, id };
              },
            };
          },
        };
      },
    },
  };
}

test('DELETE /api/admin/quotes/:id rejects invalid id before touching D1', async () => {
  let touched = false;
  const response = await deleteQuote({
    request: await adminRequest('https://example.test/api/admin/quotes/nope'),
    env: { SESSION_SECRET: 'test-session-secret-at-least-32-characters', DB: { prepare() { touched = true; } } },
    params: { id: 'nope' },
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error, 'ID không hợp lệ');
  assert.equal(touched, false);
});

test('DELETE /api/admin/quotes/:id returns 404 when no quote is deleted', async () => {
  const response = await deleteQuote({ request: await adminRequest(), env: envWithDeleteResult(0), params: { id: '9' } });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error, 'Không tìm thấy yêu cầu báo giá');
});

test('DELETE /api/admin/quotes/:id deletes exactly one quote', async () => {
  const response = await deleteQuote({ request: await adminRequest(), env: envWithDeleteResult(1), params: { id: '7' } });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, { ok: true, deletedId: 7, message: 'Đã xóa yêu cầu báo giá' });
});

test('applyImageSeedPreset only changes image fields and keeps contact data', () => {
  const site = {
    brand: { heroImage: 'old.svg', name: 'Brand' },
    contact: { phone: '0900000000', zalo: '0900000000', address: 'Cà Mau', serviceArea: 'Cà Mau' },
    services: [{ title: 'Cửa nhôm Xingfa', image: 'old-service.svg', description: 'Giữ nguyên' }],
    products: [{ id: 'p3', name: 'Cửa', cover: 'old-cover.svg', images: ['old-cover.svg'], description: 'Giữ nguyên' }],
    projects: [],
    posts: [],
  };

  const next = applyImageSeedPreset(site, {
    brand: { heroImage: 'new.webp' },
    services: [{ title: 'Cửa nhôm Xingfa', image: 'new-service.webp' }],
    products: [{ id: 'p3', cover: 'new-cover.webp', images: ['new-cover.webp', 'detail.webp'] }],
  });

  assert.deepEqual(next.contact, site.contact);
  assert.equal(next.services[0].description, 'Giữ nguyên');
  assert.equal(next.products[0].description, 'Giữ nguyên');
  assert.equal(next.brand.heroImage, 'new.webp');
  assert.equal(next.products[0].cover, 'new-cover.webp');
  assert.deepEqual(next.products[0].images, ['new-cover.webp', 'detail.webp']);
});
