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

test('POST /api/admin/upload accepts exactly 10 optimized images and keeps all GitHub URLs', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ content: { sha: 'ok' } }), { status: 201, headers: { 'content-type': 'application/json' } });
  };
  try {
    const files = Array.from({ length: 10 }, (_, index) => new File([new Uint8Array(64 * 1024)], `batch-${index + 1}.jpg`, { type: 'image/jpeg' }));
    const response = await uploadImages({ request: await uploadRequest(files), env: uploadEnv() });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.files.length, 10);
    assert.equal(calls.length, 10);
    assert.equal(new Set(body.files.map((file) => file.url)).size, 10);
    body.files.forEach((file, index) => {
      assert.match(file.path, new RegExp(`^assets/uploads/.+batch-${index + 1}\\.jpg$`));
      assert.match(file.url, /^https:\/\/raw\.githubusercontent\.com\/ventoan68\/van-toan-ca-mau\/main\/assets\/uploads\//);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('POST /api/admin/upload rejects 11 images before calling GitHub', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({ content: { sha: 'ok' } }), { status: 201, headers: { 'content-type': 'application/json' } });
  };
  try {
    const files = Array.from({ length: 11 }, (_, index) => new File([new Uint8Array(32 * 1024)], `too-many-${index + 1}.webp`, { type: 'image/webp' }));
    const response = await uploadImages({ request: await uploadRequest(files), env: uploadEnv() });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, 'Mỗi lần chỉ được upload tối đa 10 ảnh.');
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('admin upload UI enforces 10-file batches without lowering saved gallery limits', async () => {
  const source = await import('node:fs/promises').then((fs) => fs.readFile(new URL('../assets/js/admin.js', import.meta.url), 'utf8'));
  assert.match(source, /const MAX_FILES_PER_BATCH = 10;/);
  assert.match(source, /Mỗi lần chỉ được chọn tối đa 10 ảnh\. Vui lòng bỏ bớt ảnh và thử lại\./);
  assert.match(source, /Đã chọn \$\{files\.length\}\/\$\{MAX_FILES_PER_BATCH\} ảnh\./);
  assert.match(source, /files\.slice\(0, MAX_FILES_PER_BATCH\)\.forEach/);
  assert.match(source, /selected\.length > MAX_FILES_PER_BATCH/);
  assert.match(source, /Đang tối ưu ảnh \$\{index \+ 1\}\/\$\{total\}\.\.\./);
  assert.match(source, /Đang upload ảnh \$\{index \+ 1\}\/\$\{optimized\.files\.length\} lên GitHub\.\.\./);
  assert.match(source, /for \(let index = 0; index < optimized\.files\.length; index \+= 1\)/);
  assert.doesNotMatch(source, /Promise\.all\(optimized\.files/);
  assert.match(source, /setCurrentImages\(item, type, \[\.\.\.images, \.\.\.urls\]\)/);

  const html = await import('node:fs/promises').then((fs) => fs.readFile(new URL('../admin.html', import.meta.url), 'utf8'));
  assert.match(html, /<input name="gallery" type="file" accept="image\/\*" multiple>/);
  assert.match(source, /data-cover>Đại diện/);
});

test('admin galleries keep old images and append 10 new URLs for products, projects, and posts', async () => {
  const source = await import('node:fs/promises').then((fs) => fs.readFile(new URL('../assets/js/admin.js', import.meta.url), 'utf8'));
  assert.match(source, /if \(type === 'posts'\) \{[\s\S]*item\.images = nextImages;[\s\S]*item\.image = nextImages\[0\]/);
  assert.match(source, /const images = Array\.isArray\(item\.images\) \? item\.images\.filter\(Boolean\) : \[\];/);

  const appendBatch = (existing, urls) => [...existing, ...urls];
  const urls = Array.from({ length: 10 }, (_, index) => `https://raw.githubusercontent.com/ventoan68/van-toan-ca-mau/main/assets/uploads/new-${index + 1}.webp`);
  const oldGallery = ['old-cover.webp', 'old-detail.webp'];
  assert.deepEqual(appendBatch(oldGallery, urls), [...oldGallery, ...urls]);
  assert.equal(appendBatch(oldGallery, urls).length, 12);

  const post = { image: 'old-post.webp', images: ['old-post.webp'] };
  const postImages = appendBatch(post.images, urls);
  post.images = postImages;
  post.image = postImages[0];
  assert.equal(post.image, 'old-post.webp');
  assert.equal(post.images.length, 11);
  assert.deepEqual(post.images.slice(1), urls);
});
