let siteData = null;
let currentEdit = null;
let quotes = [];
const selectedQuoteIds = new Set();

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const login = $('[data-login]');
const dash = $('[data-dashboard]');
const statusBox = $('[data-global-status]');
const slug = () => `item-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const MAX_ORIGINAL_UPLOAD_SIZE = 10 * 1024 * 1024;
const MAX_OPTIMIZED_UPLOAD_SIZE = 5 * 1024 * 1024;
const TARGET_OPTIMIZED_SIZE = 1.5 * 1024 * 1024;
const MAX_OPTIMIZED_EDGE = 1920;
const ALLOWED_UPLOAD_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const PLACEHOLDER_IMAGE = 'assets/images/placeholders/blueprint.svg';
const isGitHubUpload = (url) => String(url || '').startsWith('https://raw.githubusercontent.com/') && String(url).includes('/assets/uploads/');
const imageFallback = (img) => { if (!img.dataset.fallbackApplied) { img.dataset.fallbackApplied = '1'; img.src = PLACEHOLDER_IMAGE; } };
const safe = (value) => String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));

function showStatus(message, type = 'info') {
  statusBox.textContent = message;
  statusBox.dataset.type = type;
  $$('.form-status').forEach((el) => { if (!el.matches('[data-login-status]')) el.textContent = message; });
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { accept: 'application/json', ...(options.body instanceof FormData ? {} : { 'content-type': 'application/json' }), ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || 'Yêu cầu thất bại');
    error.status = res.status;
    throw error;
  }
  return data;
}

function getPath(obj, path) { return path.split('.').reduce((acc, key) => acc?.[key], obj); }
function setPath(obj, path, value) { const parts = path.split('.'); let cur = obj; while (parts.length > 1) cur = cur[parts.shift()]; cur[parts[0]] = value; }
function itemName(type) { return type === 'products' ? 'sản phẩm' : type === 'projects' ? 'công trình' : 'bài viết'; }
function itemDefaults(type) {
  if (type === 'posts') return { id: slug(), title: 'Bài viết mới', date: new Date().toISOString().slice(0, 10), description: 'Mô tả ngắn', content: 'Nội dung bài viết', image: 'assets/images/stock/stock-blueprint.svg' };
  return { id: slug(), name: type === 'products' ? 'Sản phẩm mới' : 'Công trình mới', category: siteData.categories?.[0] || 'Đang cập nhật', group: 'Hình ảnh minh họa', area: 'Cà Mau', description: 'Mô tả ngắn', cover: 'assets/images/stock/stock-blueprint.svg', images: ['assets/images/stock/stock-blueprint.svg'], note: 'Hình ảnh minh họa' };
}

async function checkSession() {
  try {
    await api('/api/auth/me');
    login.classList.add('hidden');
    dash.classList.remove('hidden');
    await loadData();
  } catch {
    login.classList.remove('hidden');
    dash.classList.add('hidden');
  }
}

async function loginSubmit(event) {
  event.preventDefault();
  const status = $('[data-login-status]');
  status.textContent = 'Đang đăng nhập...';
  try {
    await api('/api/auth/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())) });
    login.classList.add('hidden');
    dash.classList.remove('hidden');
    await loadData();
  } catch (error) {
    status.textContent = error.status === 401
      ? 'Thông tin đăng nhập không hợp lệ'
      : 'Không thể đăng nhập. Vui lòng kiểm tra cấu hình và thử lại.';
  }
}

async function logout() {
  await api('/api/auth/logout', { method: 'POST', body: '{}' }).catch(() => {});
  dash.classList.add('hidden');
  login.classList.remove('hidden');
}

async function loadData() {
  siteData = await api('/api/admin/site');
  await loadQuotes();
  renderAdmin();
  showStatus('Đã tải dữ liệu production từ D1.', 'success');
}

async function saveSite(message = 'Đã lưu nội dung website vào D1.') {
  const data = await api('/api/admin/site', { method: 'PUT', body: JSON.stringify(siteData) });
  siteData = data.site;
  renderAdmin();
  showStatus(message, 'success');
}

function renderAdmin() {
  $('[data-count-products]').textContent = siteData.products?.length || 0;
  $('[data-count-projects]').textContent = siteData.projects?.length || 0;
  $('[data-count-posts]').textContent = siteData.posts?.length || 0;
  $('[data-count-quotes]').textContent = quotes.filter((quote) => quote.status === 'new').length;
  renderList('[data-list-products]', siteData.products || [], 'category', 'products');
  renderList('[data-list-projects]', siteData.projects || [], 'group', 'projects');
  renderList('[data-list-posts]', siteData.posts || [], 'date', 'posts');
  fillSiteForm();
  renderQuotes();
}

function renderList(selector, items, meta, type) {
  const tpl = $('#item-template');
  const wrap = $(selector);
  wrap.innerHTML = '';
  items.forEach((item, index) => {
    const node = tpl.content.cloneNode(true);
    const img = node.querySelector('img');
    img.src = item.cover || item.image || PLACEHOLDER_IMAGE;
    img.onerror = () => imageFallback(img);
    img.alt = item.name || item.title;
    node.querySelector('b').textContent = item.name || item.title;
    node.querySelector('p').textContent = item.description || '';
    node.querySelector('small').textContent = item[meta] || '';
    node.querySelector('[data-edit]').addEventListener('click', () => openEditor(type, index));
    node.querySelector('[data-delete]').addEventListener('click', async () => {
      if (!confirm(`Xóa ${itemName(type)} này?`)) return;
      items.splice(index, 1);
      await saveSite(`Đã xóa ${itemName(type)}.`);
    });
    wrap.appendChild(node);
  });
}

function fillSiteForm() {
  $$('[data-site-form] [name]').forEach((input) => { input.value = getPath(siteData, input.name) || ''; });
}

function switchTab(button) {
  $$('[data-tab]').forEach((item) => item.classList.remove('active'));
  button.classList.add('active');
  $$('.tab').forEach((tab) => tab.classList.remove('active'));
  $(`#${button.dataset.tab}`).classList.add('active');
  $('[data-title]').textContent = button.textContent;
  $('[data-nav]').classList.remove('open');
  if (button.dataset.tab === 'quotes') loadQuotes().then(renderQuotes).catch((error) => showStatus(error.message, 'error'));
}

function openEditor(type, index) {
  currentEdit = { type, index };
  const item = siteData[type][index];
  const modal = $('[data-editor-modal]');
  modal.querySelector('h3').textContent = `Sửa ${itemName(type)}`;
  modal.querySelector('[name="title"]').value = item.name || item.title || '';
  modal.querySelector('[name="meta"]').value = item.category || item.group || item.date || '';
  modal.querySelector('[name="description"]').value = item.description || '';
  modal.querySelector('[name="content"]').value = item.content || item.note || item.area || '';
  modal.querySelector('[name="gallery"]').value = '';
  $('[data-preview-grid]').innerHTML = '';
  $('[data-upload-progress]').value = 0;
  renderImageManager();
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeEditor() {
  const modal = $('[data-editor-modal]');
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  $('[data-editor-form]').reset();
}

function getCurrentImages(item, type) {
  if (type === 'posts') return [item.image].filter(Boolean);
  return item.images?.length ? item.images : [item.cover].filter(Boolean);
}

function setCurrentImages(item, type, images) {
  if (type === 'posts') item.image = images[0] || 'assets/images/stock/stock-blueprint.svg';
  else {
    item.images = images;
    item.cover = images.includes(item.cover) ? item.cover : images[0] || 'assets/images/stock/stock-blueprint.svg';
  }
}

function renderImageManager() {
  const { type, index } = currentEdit;
  const item = siteData[type][index];
  const images = getCurrentImages(item, type);
  $('[data-image-manager]').innerHTML = images.map((src, imageIndex) => `
    <article class="image-row" data-image-index="${imageIndex}">
      <img src="${src}" alt="Ảnh ${imageIndex + 1}" onerror="this.src='${PLACEHOLDER_IMAGE}'">
      <span>${imageIndex === 0 || src === item.cover || src === item.image ? 'Ảnh đại diện' : 'Ảnh chi tiết'}</span>
      <button type="button" data-cover>Đại diện</button>
      <button type="button" data-up>↑</button>
      <button type="button" data-down>↓</button>
      <button type="button" data-remove>Xóa</button>
    </article>`).join('');
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '0 KB';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 1 : 2).replace(/\.0$/, '')} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function isAllowedImage(file) {
  return ALLOWED_UPLOAD_TYPES.has(file.type);
}

async function detectWebpExport() {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const blob = await canvasToBlob(canvas, 'image/webp', 0.8).catch(() => null);
  return blob?.type === 'image/webp';
}

let webpExportSupport;
async function canExportWebp() {
  if (webpExportSupport === undefined) webpExportSupport = await detectWebpExport();
  return webpExportSupport;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error(`Không thể xuất ảnh ${type}.`))), type, quality);
  });
}

async function readExifOrientation(file) {
  if (file.type !== 'image/jpeg') return 1;
  const buffer = await file.slice(0, 128 * 1024).arrayBuffer();
  const view = new DataView(buffer);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return 1;
  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset);
    offset += 2;
    if (marker === 0xffda || marker === 0xffd9) break;
    const size = view.getUint16(offset);
    if (size < 2 || offset + size > view.byteLength) break;
    if (marker === 0xffe1 && size >= 10) {
      const exifStart = offset + 2;
      const exifHeader = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00];
      if (exifHeader.every((byte, index) => view.getUint8(exifStart + index) === byte)) {
        const tiff = exifStart + 6;
        const little = view.getUint16(tiff) === 0x4949;
        const firstIfd = tiff + view.getUint32(tiff + 4, little);
        const entries = view.getUint16(firstIfd, little);
        for (let i = 0; i < entries; i += 1) {
          const entry = firstIfd + 2 + i * 12;
          if (entry + 12 > view.byteLength) break;
          if (view.getUint16(entry, little) === 0x0112) return view.getUint16(entry + 8, little) || 1;
        }
      }
    }
    offset += size;
  }
  return 1;
}

async function loadImageSource(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { image: bitmap, width: bitmap.width, height: bitmap.height, orientation: 1, close: () => bitmap.close?.() };
    } catch {
      // Fallback below gives a clearer error and supports older browsers.
    }
  }
  const orientation = await readExifOrientation(file).catch(() => 1);
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      const swaps = orientation >= 5 && orientation <= 8;
      resolve({ image, width: swaps ? image.naturalHeight : image.naturalWidth, height: swaps ? image.naturalWidth : image.naturalHeight, orientation, close: () => {} });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Không đọc được ảnh ${file.name}. Vui lòng chọn lại file JPG, PNG hoặc WebP hợp lệ.`));
    };
    image.src = url;
  });
}

function drawOrientedImage(ctx, image, width, height, orientation) {
  if (orientation <= 1) {
    ctx.drawImage(image, 0, 0, width, height);
    return;
  }
  if (orientation === 2) { ctx.translate(width, 0); ctx.scale(-1, 1); }
  if (orientation === 3) { ctx.translate(width, height); ctx.rotate(Math.PI); }
  if (orientation === 4) { ctx.translate(0, height); ctx.scale(1, -1); }
  if (orientation === 5) { ctx.rotate(0.5 * Math.PI); ctx.scale(1, -1); }
  if (orientation === 6) { ctx.translate(width, 0); ctx.rotate(0.5 * Math.PI); }
  if (orientation === 7) { ctx.translate(width, height); ctx.rotate(0.5 * Math.PI); ctx.scale(-1, 1); }
  if (orientation === 8) { ctx.translate(0, height); ctx.rotate(-0.5 * Math.PI); }
  const sourceWidth = orientation >= 5 && orientation <= 8 ? height : width;
  const sourceHeight = orientation >= 5 && orientation <= 8 ? width : height;
  ctx.drawImage(image, 0, 0, sourceWidth, sourceHeight);
}

function makeOptimizedName(name, mimeType) {
  const ext = mimeType === 'image/webp' ? 'webp' : 'jpg';
  return `${name.replace(/\.[^.]+$/, '') || 'image'}-optimized.${ext}`;
}

async function optimizeImageFile(file) {
  if (!isAllowedImage(file)) throw new Error(`File ${file.name} không hợp lệ. Chỉ nhận JPG, JPEG, PNG hoặc WebP.`);
  if (file.size > MAX_ORIGINAL_UPLOAD_SIZE) throw new Error('Ảnh gốc không được vượt quá 10 MB.');
  const source = await loadImageSource(file);
  try {
    const scale = Math.min(1, MAX_OPTIMIZED_EDGE / Math.max(source.width, source.height));
    const targetWidth = Math.max(1, Math.round(source.width * scale));
    const targetHeight = Math.max(1, Math.round(source.height * scale));
    if (scale === 1 && file.size <= TARGET_OPTIMIZED_SIZE) {
      return { file, originalSize: file.size, optimizedSize: file.size, skipped: true, width: source.width, height: source.height };
    }
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Trình duyệt không hỗ trợ tối ưu ảnh bằng canvas.');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    drawOrientedImage(ctx, source.image, targetWidth, targetHeight, source.orientation);
    const outputType = await canExportWebp() ? 'image/webp' : 'image/jpeg';
    const qualities = [0.86, 0.82, 0.78, 0.74, 0.7, 0.66, 0.62, 0.58, 0.52, 0.46, 0.4];
    let blob = null;
    for (const quality of qualities) {
      blob = await canvasToBlob(canvas, outputType, quality);
      if (blob.size <= TARGET_OPTIMIZED_SIZE) break;
    }
    if (outputType === 'image/webp' && (!blob || blob.type !== 'image/webp')) {
      blob = await canvasToBlob(canvas, 'image/jpeg', 0.86);
    }
    if (!blob || blob.size > MAX_OPTIMIZED_UPLOAD_SIZE) throw new Error('Ảnh sau tối ưu không được vượt quá 5 MB.');
    return {
      file: new File([blob], makeOptimizedName(file.name, blob.type || outputType), { type: blob.type || outputType, lastModified: Date.now() }),
      originalSize: file.size,
      optimizedSize: blob.size,
      skipped: false,
      width: targetWidth,
      height: targetHeight,
    };
  } finally {
    source.close();
  }
}

async function optimizeSelectedFiles(files, onProgress) {
  const selected = [...files];
  const optimized = [];
  let originalTotal = 0;
  let optimizedTotal = 0;
  for (let index = 0; index < selected.length; index += 1) {
    onProgress?.(index, selected.length, selected[index]);
    const result = await optimizeImageFile(selected[index]);
    optimized.push(result.file);
    originalTotal += result.originalSize;
    optimizedTotal += result.optimizedSize;
  }
  return { files: optimized, originalTotal, optimizedTotal };
}

async function uploadFiles(files, refs = {}) {
  const progress = refs.progress || $('[data-upload-progress]');
  const status = refs.status || $('[data-upload-status]');
  const selected = [...files];
  const originalTooLarge = selected.find((file) => file.size > MAX_ORIGINAL_UPLOAD_SIZE);
  if (originalTooLarge) throw new Error('Ảnh gốc không được vượt quá 10 MB.');
  progress.value = 5;
  status.textContent = `Đang tối ưu ${selected.length} ảnh trong trình duyệt...`;
  const optimized = await optimizeSelectedFiles(selected, (index, total, file) => {
    progress.value = 5 + Math.round((index / Math.max(total, 1)) * 45);
    status.textContent = `Đang tối ưu ${index + 1}/${total}: ${file.name}`;
  });
  const form = new FormData();
  optimized.files.forEach((file) => form.append('files', file));
  progress.value = 60;
  status.textContent = `Đang upload ${optimized.files.length} ảnh đã tối ưu lên GitHub...`;
  const result = await api('/api/admin/upload', { method: 'POST', body: form });
  progress.value = 100;
  const uploaded = (result.files || []).map((entry) => entry.url);
  status.textContent = `Đã upload ${uploaded.length} ảnh vào assets/uploads/ trên GitHub. Trước tối ưu: ${formatBytes(optimized.originalTotal)}. Sau tối ưu: ${formatBytes(optimized.optimizedTotal)}.`;
  return uploaded;
}

function previewSelectedFiles(input) {
  const wrap = $('[data-preview-grid]');
  const status = $('[data-upload-status]');
  const count = $('[data-selected-count]');
  const files = [...input.files];
  wrap.innerHTML = '';
  count.textContent = files.length ? `Đã chọn ${files.length} ảnh.` : 'Chưa chọn ảnh.';
  const invalidType = files.filter((file) => !isAllowedImage(file));
  const tooLarge = files.filter((file) => file.size > MAX_ORIGINAL_UPLOAD_SIZE);
  if (tooLarge.length) status.textContent = `${tooLarge.length} ảnh vượt quá 10 MB: ${tooLarge.map((file) => file.name).join(', ')}. Ảnh gốc không được vượt quá 10 MB.`;
  else if (invalidType.length) status.textContent = `${invalidType.length} file không hợp lệ. Chỉ nhận JPG, JPEG, PNG hoặc WebP.`;
  else status.textContent = 'Sẽ tự động tối ưu khi lưu. Ảnh JPG, PNG, WebP tối đa 10 MB/ảnh gốc; sau tối ưu gửi lên server tối đa 5 MB/ảnh.';
  files.forEach((file) => {
    const card = document.createElement('figure');
    const url = URL.createObjectURL(file);
    const img = document.createElement('img');
    const caption = document.createElement('figcaption');
    img.src = url;
    img.alt = file.name;
    img.onload = () => URL.revokeObjectURL(url);
    img.onerror = () => URL.revokeObjectURL(url);
    const invalid = file.size > MAX_ORIGINAL_UPLOAD_SIZE || !isAllowedImage(file);
    caption.textContent = `${file.name} • gốc ${formatBytes(file.size)} • ${invalid ? (file.size > MAX_ORIGINAL_UPLOAD_SIZE ? 'Ảnh gốc không được vượt quá 10 MB' : 'Không phải JPG/PNG/WebP') : 'Sẽ tự động tối ưu khi lưu'}`;
    card.className = invalid ? 'invalid' : '';
    card.append(img, caption);
    wrap.appendChild(card);
  });
}
async function siteHeroUploadChange(event) {
  const input = event.currentTarget;
  const file = input.files?.[0];
  const status = $('[data-site-upload-status]');
  const progress = $('[data-site-upload-progress]');
  if (!file) {
    status.textContent = 'Chưa chọn ảnh hero.';
    progress.value = 0;
    return;
  }
  if (!isAllowedImage(file)) {
    status.textContent = 'Chỉ nhận JPG, JPEG, PNG hoặc WebP.';
    input.value = '';
    return;
  }
  if (file.size > MAX_ORIGINAL_UPLOAD_SIZE) {
    status.textContent = 'Ảnh gốc không được vượt quá 10 MB.';
    input.value = '';
    return;
  }
  try {
    const [url] = await uploadFiles([file], { progress, status });
    $('[data-site-form] [name="brand.heroImage"]').value = url;
    setPath(siteData, 'brand.heroImage', url);
    await saveSite('Đã upload và lưu ảnh hero vào D1.');
    input.value = '';
  } catch (error) {
    status.textContent = error.message || 'Không thể upload ảnh hero.';
  }
}

async function editorSubmit(event) {
  event.preventDefault();
  const { type, index } = currentEdit;
  const item = siteData[type][index];
  const fd = new FormData(event.currentTarget);
  if (type === 'posts') {
    item.title = fd.get('title');
    item.date = fd.get('meta') || new Date().toISOString().slice(0, 10);
    item.content = fd.get('content');
  } else {
    item.name = fd.get('title');
    if (type === 'products') item.category = fd.get('meta');
    if (type === 'projects') item.group = fd.get('meta');
    if (type === 'projects') item.area = fd.get('content'); else item.note = fd.get('content');
  }
  item.description = fd.get('description');
  const files = [...event.currentTarget.gallery.files];
  const invalidFile = files.find((file) => !isAllowedImage(file));
  if (invalidFile) {
    $('[data-upload-status]').textContent = 'Chỉ nhận JPG, JPEG, PNG hoặc WebP.';
    return;
  }
  if (files.some((file) => file.size > MAX_ORIGINAL_UPLOAD_SIZE)) {
    $('[data-upload-status]').textContent = 'Ảnh gốc không được vượt quá 10 MB.';
    return;
  }
  if (files.length) {
    try {
      const urls = await uploadFiles(files);
      const images = getCurrentImages(item, type);
      setCurrentImages(item, type, [...images, ...urls]);
    } catch (error) {
      $('[data-upload-status]').textContent = error.message || 'Không thể upload ảnh.';
      return;
    }
  }
  closeEditor();
  await saveSite(`Đã lưu ${itemName(type)} vào D1.`);
}

async function imageManagerClick(event) {
  const row = event.target.closest('[data-image-index]');
  if (!row || !currentEdit) return;
  const imageIndex = Number(row.dataset.imageIndex);
  const { type, index } = currentEdit;
  const item = siteData[type][index];
  const images = getCurrentImages(item, type);
  if (event.target.matches('[data-cover]')) {
    if (type === 'posts') item.image = images[imageIndex]; else item.cover = images[imageIndex];
  }
  if (event.target.matches('[data-up]') && imageIndex > 0) [images[imageIndex - 1], images[imageIndex]] = [images[imageIndex], images[imageIndex - 1]];
  if (event.target.matches('[data-down]') && imageIndex < images.length - 1) [images[imageIndex + 1], images[imageIndex]] = [images[imageIndex], images[imageIndex + 1]];
  if (event.target.matches('[data-remove]') && confirm('Xóa riêng ảnh này?')) {
    const [removed] = images.splice(imageIndex, 1);
    if (isGitHubUpload(removed)) {
      try {
        await api('/api/admin/upload', { method: 'DELETE', body: JSON.stringify({ url: removed }) });
        showStatus('Đã xóa ảnh khỏi assets/uploads/ trên GitHub.', 'success');
      } catch (error) {
        showStatus(error.message || 'Không thể xóa ảnh trên GitHub.', 'error');
      }
    }
  }
  setCurrentImages(item, type, images);
  renderImageManager();
}

async function loadQuotes() {
  const filter = $('[data-quote-filter]')?.value || '';
  const data = await api(`/api/admin/quotes${filter ? `?status=${encodeURIComponent(filter)}` : ''}`);
  quotes = data.quotes || [];
  const visibleIds = new Set(quotes.map((quote) => String(quote.id)));
  [...selectedQuoteIds].forEach((id) => { if (!visibleIds.has(id)) selectedQuoteIds.delete(id); });
  updateQuoteBulkControls();
}

function updateQuoteBulkControls() {
  const selectAll = $('[data-quote-select-all]');
  const deleteSelected = $('[data-delete-selected-quotes]');
  if (!selectAll || !deleteSelected) return;
  const visibleIds = quotes.map((quote) => String(quote.id));
  const selectedVisibleCount = visibleIds.filter((id) => selectedQuoteIds.has(id)).length;
  selectAll.checked = Boolean(visibleIds.length && selectedVisibleCount === visibleIds.length);
  selectAll.indeterminate = Boolean(selectedVisibleCount && selectedVisibleCount < visibleIds.length);
  deleteSelected.disabled = selectedVisibleCount === 0;
  deleteSelected.textContent = selectedVisibleCount ? `Xóa ${selectedVisibleCount} yêu cầu đã chọn` : 'Xóa các yêu cầu đã chọn';
}

async function deleteQuote(id, { skipConfirm = false } = {}) {
  if (!skipConfirm && !confirm('Bạn có chắc chắn muốn xóa yêu cầu báo giá này? Thao tác này không thể hoàn tác.')) return false;
  await api(`/api/admin/quotes/${id}`, { method: 'DELETE' });
  selectedQuoteIds.delete(String(id));
  await loadQuotes();
  renderAdmin();
  return true;
}

async function deleteSelectedQuotes() {
  const ids = quotes.map((quote) => String(quote.id)).filter((id) => selectedQuoteIds.has(id));
  if (!ids.length) return;
  if (!confirm(`Bạn có chắc chắn muốn xóa ${ids.length} yêu cầu báo giá đã chọn? Thao tác này không thể hoàn tác.`)) return;
  let success = 0;
  const errors = [];
  for (const id of ids) {
    try {
      await api(`/api/admin/quotes/${id}`, { method: 'DELETE' });
      selectedQuoteIds.delete(id);
      success += 1;
    } catch (error) {
      errors.push(`#${id}: ${error.message}`);
    }
  }
  await loadQuotes();
  renderAdmin();
  showStatus(errors.length ? `Đã xóa ${success}/${ids.length} yêu cầu. Lỗi: ${errors.join('; ')}` : `Đã xóa ${success} yêu cầu đã chọn.`, errors.length ? 'error' : 'success');
}

function renderQuotes() {
  const wrap = $('[data-quotes-list]');
  const tpl = $('#quote-template');
  wrap.innerHTML = '';
  if (!quotes.length) {
    wrap.innerHTML = '<p class="empty">Chưa có yêu cầu báo giá.</p>';
    updateQuoteBulkControls();
    return;
  }
  quotes.forEach((quote) => {
    const id = String(quote.id);
    const node = tpl.content.cloneNode(true);
    const checkbox = node.querySelector('[data-select-quote]');
    checkbox.checked = selectedQuoteIds.has(id);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) selectedQuoteIds.add(id); else selectedQuoteIds.delete(id);
      updateQuoteBulkControls();
    });
    node.querySelector('b').textContent = `${quote.customer_name} • ${quote.phone}`;
    node.querySelector('.quote-head span').textContent = `${quote.status} • ${new Date(quote.created_at).toLocaleString('vi-VN')}`;
    node.querySelector('p').textContent = `${quote.need} tại ${quote.area}. ${quote.message || ''}`;
    const actions = node.querySelector('.quote-actions');
    actions.innerHTML = `<a href="tel:${quote.phone}">Gọi điện</a>${quote.zalo ? `<a href="https://zalo.me/${quote.zalo.replace(/\D/g, '')}" target="_blank" rel="noreferrer">Mở Zalo</a>` : ''}${quote.email ? `<a href="mailto:${quote.email}">Gửi email</a>` : ''}`;
    node.querySelector('[name="status"]').value = quote.status;
    node.querySelector('[name="admin_note"]').value = quote.admin_note || '';
    node.querySelector('[data-save-quote]').addEventListener('click', async (event) => {
      const card = event.currentTarget.closest('.quote-item');
      await api(`/api/admin/quotes/${quote.id}`, { method: 'PATCH', body: JSON.stringify({ status: card.querySelector('[name="status"]').value, admin_note: card.querySelector('[name="admin_note"]').value }) });
      await loadQuotes();
      renderAdmin();
      showStatus('Đã cập nhật yêu cầu báo giá.', 'success');
    });
    node.querySelector('[data-delete-quote]').addEventListener('click', async () => {
      try {
        const deleted = await deleteQuote(quote.id);
        if (deleted) showStatus('Đã xóa yêu cầu báo giá.', 'success');
      } catch (error) {
        showStatus(error.message || 'Không thể xóa yêu cầu báo giá.', 'error');
      }
    });
    wrap.appendChild(node);
  });
  updateQuoteBulkControls();
}


function seedPreviewItems(preview) {
  const items = [];
  if (preview?.brand?.heroImage) items.push({ title: 'Hero', image: preview.brand.heroImage, count: 1 });
  (preview?.products || []).forEach((item) => items.push({ title: item.name, image: item.cover, count: item.images?.length || 0 }));
  (preview?.projects || []).forEach((item) => items.push({ title: item.name, image: item.cover, count: item.images?.length || 0 }));
  return items;
}

async function openSeedPreview() {
  const modal = $('[data-seed-modal]');
  const grid = $('[data-seed-preview-grid]');
  const status = $('[data-seed-status]');
  grid.innerHTML = '<p class="empty">Đang tải bản xem trước...</p>';
  status.textContent = '';
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  try {
    const data = await api('/api/admin/site/seed-images');
    grid.innerHTML = seedPreviewItems(data.preview).map((item) => `
      <article class="seed-card"><img src="${safe(item.image || PLACEHOLDER_IMAGE)}" alt="${safe(item.title)}" onerror="this.src='${PLACEHOLDER_IMAGE}'"><b>${safe(item.title)}</b><span>${item.count} ảnh</span></article>`).join('');
  } catch (error) {
    grid.innerHTML = '';
    status.textContent = error.message || 'Không thể tải bản xem trước.';
  }
}

function closeSeedPreview() {
  const modal = $('[data-seed-modal]');
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

async function applySeedImages() {
  if (!confirm('Bạn xác nhận chỉ cập nhật ảnh đại diện và gallery từ repository? Thao tác này không ghi đè số điện thoại, Zalo, địa chỉ hoặc khu vực phục vụ.')) return;
  const status = $('[data-seed-status]');
  status.textContent = 'Đang nạp bộ ảnh mẫu mới từ repository...';
  try {
    const data = await api('/api/admin/site/seed-images', { method: 'POST', body: '{}' });
    siteData = data.site;
    closeSeedPreview();
    renderAdmin();
    showStatus(data.message || 'Đã nạp bộ ảnh mẫu mới từ repository.', 'success');
  } catch (error) {
    status.textContent = error.message || 'Không thể nạp bộ ảnh mẫu.';
  }
}

$('[data-toggle-password]').addEventListener('click', (event) => {
  const input = event.currentTarget.parentElement.querySelector('input');
  input.type = input.type === 'password' ? 'text' : 'password';
  event.currentTarget.textContent = input.type === 'password' ? 'Hiện' : 'Ẩn';
});
$('#login-form').addEventListener('submit', loginSubmit);
$('[data-logout]').addEventListener('click', logout);
$('[data-sidebar-toggle]').addEventListener('click', () => $('[data-nav]').classList.toggle('open'));
$$('[data-tab]').forEach((button) => button.addEventListener('click', () => switchTab(button)));
$('[data-site-form]').addEventListener('submit', async (event) => {
  event.preventDefault();
  $$('[data-site-form] [name]').forEach((input) => setPath(siteData, input.name, input.value));
  await saveSite('Đã lưu thông tin website vào D1.');
});
$$('[data-add]').forEach((button) => button.addEventListener('click', async () => {
  const type = `${button.dataset.add}s`;
  siteData[type].unshift(itemDefaults(type));
  await saveSite(`Đã thêm ${itemName(type)} mới.`);
  openEditor(type, 0);
}));
$$('[data-editor-close]').forEach((button) => button.addEventListener('click', closeEditor));
$('[data-editor-form]').addEventListener('submit', editorSubmit);
$('[data-image-manager]').addEventListener('click', imageManagerClick);
$('[data-editor-form] [name="gallery"]').addEventListener('change', (event) => previewSelectedFiles(event.currentTarget));
$('[data-site-hero-upload]').addEventListener('change', siteHeroUploadChange);
$('[data-quote-filter]').addEventListener('change', async () => { selectedQuoteIds.clear(); await loadQuotes(); renderQuotes(); });
$('[data-quote-select-all]').addEventListener('change', (event) => {
  quotes.forEach((quote) => { if (event.currentTarget.checked) selectedQuoteIds.add(String(quote.id)); else selectedQuoteIds.delete(String(quote.id)); });
  renderQuotes();
});
$('[data-delete-selected-quotes]').addEventListener('click', deleteSelectedQuotes);
$('[data-seed-preview]').addEventListener('click', openSeedPreview);
$$('[data-seed-close]').forEach((button) => button.addEventListener('click', closeSeedPreview));
$('[data-seed-apply]').addEventListener('click', applySeedImages);
checkSession();
