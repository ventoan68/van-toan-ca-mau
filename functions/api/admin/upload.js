import { requireAdmin } from '../../_shared/auth.js';
import { json } from '../../_shared/response.js';
import { cleanText, normalizeUploadName } from '../../_shared/sanitize.js';

const UPLOAD_DIR = 'assets/uploads';
const ALLOWED = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);
const MAX_SIZE = 5 * 1024 * 1024;
const MAX_BATCH_SIZE = 20 * 1024 * 1024;

function githubConfig(env) {
  const owner = cleanText(env.GITHUB_OWNER, 80);
  const repo = cleanText(env.GITHUB_REPO, 100);
  const branch = cleanText(env.GITHUB_BRANCH || 'main', 100);
  const token = env.GITHUB_TOKEN;
  if (!token || !owner || !repo || !branch) return null;
  return { owner, repo, branch, token };
}

function encodePath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function makeFilename(file) {
  const ext = ALLOWED.get(file.type);
  const base = normalizeUploadName(file.name).replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'image';
  const rand = crypto.randomUUID().replace(/-/g, '').slice(0, 10);
  return `${Date.now()}-${rand}-${base}.${ext}`;
}

function makeUploadPath(filename) {
  if (!/^[a-z0-9][a-z0-9._-]{0,160}\.(jpg|png|webp)$/i.test(filename) || filename.includes('..') || filename.includes('/')) {
    throw new Error('Tên file ảnh không hợp lệ');
  }
  return `${UPLOAD_DIR}/${filename}`;
}

function rawUrl(config, filename) {
  return `https://raw.githubusercontent.com/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/${encodeURIComponent(config.branch)}/${UPLOAD_DIR}/${encodeURIComponent(filename)}`;
}

function uploadPathFromInput(input, config) {
  const value = cleanText(input, 500);
  if (!value) return '';
  let path = value;
  const rawPrefix = `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/`;
  if (path.startsWith(rawPrefix)) path = decodeURIComponent(path.slice(rawPrefix.length));
  if (path.startsWith('/')) path = path.slice(1);
  if (path.includes('..') || path.includes('\\') || /[\u0000-\u001f]/.test(path)) return '';
  if (!path.startsWith(`${UPLOAD_DIR}/`)) return '';
  const filename = path.slice(`${UPLOAD_DIR}/`.length);
  if (!filename || filename.includes('/') || !/^[a-z0-9][a-z0-9._-]{0,160}\.(jpg|jpeg|png|webp)$/i.test(filename)) return '';
  return `${UPLOAD_DIR}/${filename}`;
}

async function githubFetch(config, path, init = {}) {
  const [contentPath, query = ''] = path.split('?');
  const url = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${encodePath(contentPath)}${query ? `?${query}` : ''}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${config.token}`,
      'content-type': 'application/json',
      'user-agent': 'van-toan-ca-mau-pages-functions',
      'x-github-api-version': '2022-11-28',
      ...init.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.message === 'Not Found' ? 'Không tìm thấy file hoặc repository trên GitHub' : 'GitHub API không thể xử lý yêu cầu';
    throw new Error(message);
  }
  return data;
}

async function uploadToGitHub(config, file) {
  if (!file || typeof file.arrayBuffer !== 'function') throw new Error('Không tìm thấy file ảnh');
  if (!ALLOWED.has(file.type)) throw new Error('Chỉ nhận JPG, JPEG, PNG hoặc WebP');
  if (file.size > MAX_SIZE) throw new Error('Ảnh sau tối ưu không được vượt quá 5 MB.');
  const filename = makeFilename(file);
  const path = makeUploadPath(filename);
  const content = arrayBufferToBase64(await file.arrayBuffer());
  await githubFetch(config, path, {
    method: 'PUT',
    body: JSON.stringify({
      message: `Upload ảnh website: ${filename}`,
      content,
      branch: config.branch,
    }),
  });
  return { path, url: rawUrl(config, filename), name: cleanText(file.name, 120), size: file.size, type: file.type };
}

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;
  const config = githubConfig(env);
  if (!config) return json({ error: 'Upload GitHub chưa được cấu hình đầy đủ' }, 503);
  try {
    const form = await request.formData();
    const files = [...form.getAll('files'), ...form.getAll('file')].filter((file) => file && typeof file.arrayBuffer === 'function');
    if (!files.length) return json({ error: 'Không tìm thấy file ảnh' }, 400);
    const batchSize = files.reduce((total, file) => total + (file.size || 0), 0);
    if (batchSize > MAX_BATCH_SIZE) return json({ error: 'Tổng dung lượng một lần upload không được vượt quá 20 MB.' }, 400);
    const uploaded = [];
    for (const file of files) uploaded.push(await uploadToGitHub(config, file));
    return json({ ok: true, files: uploaded });
  } catch (error) {
    console.error('github-upload', error.message);
    const status = /không được vượt|Chỉ nhận|Không tìm thấy file|Tên file/.test(error.message) ? 400 : 502;
    return json({ error: error.message || 'Không thể tải ảnh lên GitHub' }, status);
  }
}

export async function onRequestDelete({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;
  const config = githubConfig(env);
  if (!config) return json({ error: 'Upload GitHub chưa được cấu hình đầy đủ' }, 503);
  try {
    const body = await request.json();
    const path = uploadPathFromInput(body.path ?? body.key ?? body.url, config);
    if (!path) return json({ error: 'Chỉ được xóa ảnh trong assets/uploads/' }, 400);
    if (path.endsWith('.svg')) return json({ error: 'Không được xóa placeholder SVG' }, 400);
    const current = await githubFetch(config, `${path}?ref=${encodeURIComponent(config.branch)}`);
    if (!current.sha) return json({ error: 'Không lấy được SHA file cần xóa' }, 404);
    await githubFetch(config, path, {
      method: 'DELETE',
      body: JSON.stringify({
        message: `Xóa ảnh website: ${path.split('/').pop()}`,
        sha: current.sha,
        branch: config.branch,
      }),
    });
    return json({ ok: true });
  } catch (error) {
    console.error('github-delete', error.message);
    return json({ error: error.message || 'Không thể xóa ảnh trên GitHub' }, 502);
  }
}
