import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSessionCookie } from '../functions/_shared/auth.js';
import { applyImageSeedPreset } from '../functions/_shared/site-store.js';
import { onRequestDelete as deleteQuote } from '../functions/api/admin/quotes/[id].js';
import { onRequestPost as uploadImages } from '../functions/api/admin/upload.js';

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

async function uploadRequest(files) {
  const cookie = await createSessionCookie('admin', 'test-session-secret-at-least-32-characters');
  const form = new FormData();
  files.forEach((file) => form.append('files', file));
  return new Request('https://example.test/api/admin/upload', { method: 'POST', headers: { cookie }, body: form });
}

function uploadEnv() {
  return {
    SESSION_SECRET: 'test-session-secret-at-least-32-characters',
    GITHUB_OWNER: 'ventoan68',
    GITHUB_REPO: 'van-toan-ca-mau',
    GITHUB_BRANCH: 'main',
    GITHUB_TOKEN: 'server-side-token',
  };
}

test('POST /api/admin/upload keeps GitHub assets/uploads flow for optimized images', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ content: { sha: 'ok' } }), { status: 201, headers: { 'content-type': 'application/json' } });
  };
  try {
    const file = new File([new Uint8Array(128 * 1024)], 'small.jpg', { type: 'image/jpeg' });
    const response = await uploadImages({ request: await uploadRequest([file]), env: uploadEnv() });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.files.length, 1);
    assert.match(body.files[0].path, /^assets\/uploads\/.+small\.jpg$/);
    assert.match(body.files[0].url, /^https:\/\/raw\.githubusercontent\.com\/ventoan68\/van-toan-ca-mau\/main\/assets\/uploads\//);
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /\/contents\/assets\/uploads\//);
    assert.equal(calls[0].init.headers.authorization, 'Bearer server-side-token');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('POST /api/admin/upload rejects optimized images over 5 MB', async () => {
  const file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'too-large.webp', { type: 'image/webp' });
  const response = await uploadImages({ request: await uploadRequest([file]), env: uploadEnv() });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error, 'Ảnh sau tối ưu không được vượt quá 5 MB.');
});

test('POST /api/admin/upload rejects a batch over 20 MB', async () => {
  const files = Array.from({ length: 5 }, (_, index) => new File([new Uint8Array(Math.ceil(4.1 * 1024 * 1024))], `batch-${index}.jpg`, { type: 'image/jpeg' }));
  const response = await uploadImages({ request: await uploadRequest(files), env: uploadEnv() });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error, 'Tổng dung lượng một lần upload không được vượt quá 20 MB.');
});

test('POST /api/admin/upload rejects non-image files', async () => {
  const file = new File(['not an image'], 'note.txt', { type: 'text/plain' });
  const response = await uploadImages({ request: await uploadRequest([file]), env: uploadEnv() });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error, 'Chỉ nhận JPG, JPEG, PNG hoặc WebP');
});
