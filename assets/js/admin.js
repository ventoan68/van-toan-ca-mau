let siteData = null;
let currentEdit = null;
let currentServiceIndex = null;
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
const MAX_BATCH_UPLOAD_SIZE = 20 * 1024 * 1024;
const MAX_FILES_PER_BATCH = 10;
const MAX_FILES_PER_BATCH_MESSAGE = 'Mỗi lần chỉ được chọn tối đa 10 ảnh. Vui lòng bỏ bớt ảnh và thử lại.';
const TARGET_OPTIMIZED_SIZE = 1.5 * 1024 * 1024;
const MAX_OPTIMIZED_EDGE = 1920;
const ALLOWED_UPLOAD_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const PLACEHOLDER_IMAGE = 'assets/images/placeholders/blueprint.svg';
const ABOUT_FALLBACK_IMAGE = 'assets/images/stock/stock-mechanic-tools.svg';
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
function setPath(obj, path, value) { const parts = path.split('.'); let cur = obj; while (parts.length > 1) { const key = parts.shift(); cur[key] = cur[key] && typeof cur[key] === 'object' ? cur[key] : {}; cur = cur[key]; } cur[parts[0]] = value; }
function itemName(type) { return type === 'products' ? 'sản phẩm' : type === 'projects' ? 'công trình' : 'bài viết'; }
function serviceDefaults() { return { id: slug(), title: 'Dịch vụ mới', description: 'Mô tả ngắn cho dịch vụ', icon: '🛠️', image: 'assets/images/stock/stock-blueprint.svg' }; }
function aboutDefaults() { return { eyebrow: 'Giới thiệu', title: 'Đơn vị đồng hành cho nhu cầu cơ khí, xây dựng và vật liệu', paragraph1: 'VẸN TOÀN CÀ MAU hướng đến cách làm việc thực tế, rõ ràng và gần gũi với khách hàng địa phương. Website này giúp khách hàng xem nhanh nhóm dịch vụ, sản phẩm, quy trình trao đổi và gửi yêu cầu báo giá.', paragraph2: 'Đơn vị tiếp nhận các nhu cầu về nhà thép tiền chế, khung sắt, mái tôn, cửa nhôm Xingfa, cửa kính, lan can, cầu thang, hàng rào, mái che, sắt thép, gạch và vật liệu xây dựng.', image: ABOUT_FALLBACK_IMAGE, cardTitle: 'Phong cách làm việc', cardText: 'Trao đổi rõ nhu cầu, khảo sát kỹ hiện trạng, tư vấn phương án phù hợp.' }; }
function normalizeSiteData() { siteData.about = { ...aboutDefaults(), ...(siteData.about || {}) }; siteData.services = Array.isArray(siteData.services) ? siteData.services.map((service) => ({ ...serviceDefaults(), ...service, id: service.id || slug() })) : []; }
function itemDefaults(type) {
  if (type === 'posts') return { id: slug(), title: 'Bài viết mới', date: new Date().toISOString().slice(0, 10), description: 'Mô tả ngắn', content: 'Nội dung bài viết', image: 'assets/images/stock/stock-blueprint.svg', images: ['assets/images/stock/stock-blueprint.svg'] };
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
  normalizeSiteData();
  await loadQuotes();
  renderAdmin();
  showStatus('Đã tải dữ liệu production từ D1.', 'success');
}

async function saveSite(message = 'Đã lưu nội dung website vào D1.') {
  const data = await api('/api/admin/site', { method: 'PUT', body: JSON.stringify(siteData) });
  siteData = data.site;
  normalizeSiteData();
  renderAdmin();
  showStatus(message, 'success');
}

function renderAdmin() {
  $('[data-count-services]').textContent = siteData.services?.length || 0;
  $('[data-count-products]').textContent = siteData.products?.length || 0;
  $('[data-count-projects]').textContent = siteData.projects?.length || 0;
  $('[data-count-posts]').textContent = siteData.posts?.length || 0;
  $('[data-count-quotes]').textContent = quotes.filter((quote) => quote.status === 'new').length;
  renderServicesAdmin();
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
  siteData.about = { ...aboutDefaults(), ...(siteData.about || {}) };
  $$('[data-site-form] [name]').forEach((input) => { input.value = getPath(siteData, input.name) || ''; });
  updateAboutPreview();
}

function updateAboutPreview() {
  const preview = $('[data-about-preview]');
  const input = $('[data-site-form] [name="about.image"]');
  if (!preview || !input) return;
  preview.src = input.value || ABOUT_FALLBACK_IMAGE;
  preview.onerror = () => { preview.onerror = null; preview.src = ABOUT_FALLBACK_IMAGE; };
}

function renderServicesAdmin() {
  const wrap = $('[data-list-services]');
  const tpl = $('#item-template');
  if (!wrap || !tpl) return;
  wrap.innerHTML = '';
  const items = siteData.services || [];
  if (!items.length) {
    wrap.innerHTML = '<p class="empty">Chưa có dịch vụ. Bấm “Thêm dịch vụ” để tạo mới.</p>';
    return;
  }
  items.forEach((service, index) => {
    const node = tpl.content.cloneNode(true);
    const img = node.querySelector('img');
    img.src = service.image || PLACEHOLDER_IMAGE;
    img.onerror = () => imageFallback(img);
    img.alt = service.title || 'Dịch vụ';
    node.querySelector('b').textContent = service.title || 'Dịch vụ chưa có tiêu đề';
    node.querySelector('p').textContent = service.description || '';
    node.querySelector('small').textContent = `${service.icon || '🛠️'} • ${service.id || ''}`;
    node.querySelector('[data-edit]').addEventListener('click', () => openServiceEditor(index));
    node.querySelector('[data-delete]').addEventListener('click', () => deleteService(index));
    wrap.appendChild(node);
  });
}

function openServiceEditor(index) {
  currentServiceIndex = index;
  const service = siteData.services[index];
  const modal = $('[data-service-modal]');
  modal.querySelector('[name="id"]').value = service.id || slug();
  modal.querySelector('[name="title"]').value = service.title || '';
  modal.querySelector('[name="description"]').value = service.description || '';
  modal.querySelector('[name="icon"]').value = service.icon || '';
  modal.querySelector('[name="image"]').value = service.image || '';
  modal.querySelector('[name="imageFile"]').value = '';
  $('[data-service-upload-progress]').value = 0;
  $('[data-service-upload-status]').textContent = 'Chưa chọn ảnh dịch vụ.';
  updateServiceImagePreview();
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeServiceEditor() {
  const modal = $('[data-service-modal]');
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  $('[data-service-form]').reset();
  currentServiceIndex = null;
}

function updateServiceImagePreview() {
  const preview = $('[data-service-image-preview]');
  const input = $('[data-service-form] [name="image"]');
  if (!preview || !input) return;
  preview.src = input.value || PLACEHOLDER_IMAGE;
  preview.onerror = () => { preview.onerror = null; preview.src = PLACEHOLDER_IMAGE; };
}

async function saveService(event) {
  event.preventDefault();
  if (currentServiceIndex === null) return;
  const service = siteData.services[currentServiceIndex];
  const fd = new FormData(event.currentTarget);
  service.id = fd.get('id') || service.id || slug();
  service.title = fd.get('title') || 'Dịch vụ chưa có tiêu đề';
  service.description = fd.get('description') || '';
  service.icon = fd.get('icon') || '🛠️';
  service.image = fd.get('image') || PLACEHOLDER_IMAGE;
  closeServiceEditor();
  await saveSite('Đã lưu dịch vụ vào D1.');
}

async function deleteService(index) {
  if (!confirm('Xóa dịch vụ này?')) return;
  siteData.services.splice(index, 1);
  await saveSite('Đã xóa dịch vụ.');
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
  if (type === 'posts') {
    const images = Array.isArray(item.images) ? item.images.filter(Boolean) : [];
    if (item.image && !images.includes(item.image)) images.unshift(item.image);
    return images.length ? images : [item.image].filter(Boolean);
  }
  return item.images?.length ? item.images : [item.cover].filter(Boolean);
}

function setCurrentImages(item, type, images) {
  const nextImages = images.filter(Boolean);
  if (type === 'posts') {
    item.images = nextImages;
    item.image = nextImages[0] || 'assets/images/stock/stock-blueprint.svg';
  } else {
    item.images = nextImages;
    item.cover = nextImages.includes(item.cover) ? item.cover : nextImages[0] || 'assets/images/stock/stock-blueprint.svg';
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
  if (selected.length > MAX_FILES_PER_BATCH) throw new Error(MAX_FILES_PER_BATCH_MESSAGE);
  const originalTooLarge = selected.find((file) => file.size > MAX_ORIGINAL_UPLOAD_SIZE);
  if (originalTooLarge) throw new Error('Ảnh gốc không được vượt quá 10 MB.');
  progress.value = 5;
  status.textContent = `Đang tối ưu ${selected.length} ảnh trong trình duyệt...`;
  const optimized = await optimizeSelectedFiles(selected, (index, total, file) => {
    progress.value = 5 + Math.round((index / Math.max(total, 1)) * 45);
    status.textContent = `Đang tối ưu ảnh ${index + 1}/${total}...`;
  });
  if (optimized.optimizedTotal > MAX_BATCH_UPLOAD_SIZE) throw new Error('Tổng dung lượng một lần upload không được vượt quá 20 MB.');
  const uploaded = [];
  for (let index = 0; index < optimized.files.length; index += 1) {
    const file = optimized.files[index];
    const form = new FormData();
    form.append('files', file);
    progress.value = 60 + Math.round((index / Math.max(optimized.files.length, 1)) * 35);
    status.textContent = `Đang upload ảnh ${index + 1}/${optimized.files.length} lên GitHub...`;
    const result = await api('/api/admin/upload', { method: 'POST', body: form });
    uploaded.push(...(result.files || []).map((entry) => entry.url));
  }
  progress.value = 100;
  status.textContent = `Đã upload ${uploaded.length} ảnh vào assets/uploads/ trên GitHub. Trước tối ưu: ${formatBytes(optimized.originalTotal)}. Sau tối ưu: ${formatBytes(optimized.optimizedTotal)}.`;
  return uploaded;
}

function previewSelectedFiles(input) {
  const wrap = $('[data-preview-grid]');
  const status = $('[data-upload-status]');
  const count = $('[data-selected-count]');
  const files = [...input.files];
  wrap.innerHTML = '';
  count.textContent = files.length ? `Đã chọn ${files.length}/${MAX_FILES_PER_BATCH} ảnh.` : 'Chưa chọn ảnh.';
  const tooMany = files.length > MAX_FILES_PER_BATCH;
  const invalidType = files.filter((file) => !isAllowedImage(file));
  const tooLarge = files.filter((file) => file.size > MAX_ORIGINAL_UPLOAD_SIZE);
  if (tooMany) status.textContent = MAX_FILES_PER_BATCH_MESSAGE;
  else if (tooLarge.length) status.textContent = `${tooLarge.length} ảnh vượt quá 10 MB: ${tooLarge.map((file) => file.name).join(', ')}. Ảnh gốc không được vượt quá 10 MB.`;
  else if (invalidType.length) status.textContent = `${invalidType.length} file không hợp lệ. Chỉ nhận JPG, JPEG, PNG hoặc WebP.`;
  else status.textContent = 'Sẽ tự động tối ưu khi lưu. Ảnh JPG, PNG, WebP tối đa 10 MB/ảnh gốc; sau tối ưu gửi lên server tối đa 5 MB/ảnh.';
  files.slice(0, MAX_FILES_PER_BATCH).forEach((file) => {
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
async function uploadSingleImage(input, refs) {
  const file = input.files?.[0];
  if (!file) {
    refs.status.textContent = refs.emptyMessage || 'Chưa chọn ảnh.';
    refs.progress.value = 0;
    return null;
  }
  if (!isAllowedImage(file)) {
    refs.status.textContent = 'Chỉ nhận JPG, JPEG, PNG hoặc WebP.';
    input.value = '';
    return null;
  }
  if (file.size > MAX_ORIGINAL_UPLOAD_SIZE) {
    refs.status.textContent = 'Ảnh gốc không được vượt quá 10 MB.';
    input.value = '';
    return null;
  }
  const [url] = await uploadFiles([file], { progress: refs.progress, status: refs.status });
  input.value = '';
  return url;
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

async function uploadAboutImage(event) {
  const input = event.currentTarget;
  const status = $('[data-about-upload-status]');
  const progress = $('[data-about-upload-progress]');
  try {
    const url = await uploadSingleImage(input, { status, progress, emptyMessage: 'Chưa chọn ảnh giới thiệu.' });
    if (!url) return;
    $('[data-site-form] [name="about.image"]').value = url;
    setPath(siteData, 'about.image', url);
    updateAboutPreview();
    status.textContent = 'Đã upload ảnh giới thiệu. Bấm “Lưu thông tin website” để lưu URL vào D1.';
  } catch (error) {
    status.textContent = error.message || 'Không thể upload ảnh giới thiệu.';
  }
}

async function uploadServiceImage(event) {
  const input = event.currentTarget;
  const status = $('[data-service-upload-status]');
  const progress = $('[data-service-upload-progress]');
  try {
    const url = await uploadSingleImage(input, { status, progress, emptyMessage: 'Chưa chọn ảnh dịch vụ.' });
    if (!url) return;
    $('[data-service-form] [name="image"]').value = url;
    updateServiceImagePreview();
    status.textContent = 'Đã upload ảnh dịch vụ. Bấm “Lưu dịch vụ vào D1” để lưu URL.';
  } catch (error) {
    status.textContent = error.message || 'Không thể upload ảnh dịch vụ.';
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
  if (files.length > MAX_FILES_PER_BATCH) {
    $('[data-upload-status]').textContent = MAX_FILES_PER_BATCH_MESSAGE;
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
    normalizeSiteData();
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
$('[data-about-upload]').addEventListener('change', uploadAboutImage);
$('[data-site-form] [name="about.image"]').addEventListener('input', updateAboutPreview);
$('[data-add-service]').addEventListener('click', async () => {
  siteData.services.unshift(serviceDefaults());
  await saveSite('Đã thêm dịch vụ mới.');
  openServiceEditor(0);
});
$('[data-service-form]').addEventListener('submit', saveService);
$('[data-service-image-upload]').addEventListener('change', uploadServiceImage);
$('[data-service-form] [name="image"]').addEventListener('input', updateServiceImagePreview);
$$('[data-service-close]').forEach((button) => button.addEventListener('click', closeServiceEditor));
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
