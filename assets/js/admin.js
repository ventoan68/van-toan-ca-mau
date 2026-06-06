let siteData = null;
let currentEdit = null;
let quotes = [];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const login = $('[data-login]');
const dash = $('[data-dashboard]');
const statusBox = $('[data-global-status]');
const slug = () => `item-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const MAX_UPLOAD_SIZE = 1024 * 1024;
const PLACEHOLDER_IMAGE = 'assets/images/placeholders/blueprint.svg';
const isGitHubUpload = (url) => String(url || '').startsWith('https://raw.githubusercontent.com/') && String(url).includes('/assets/uploads/');
const imageFallback = (img) => { if (!img.dataset.fallbackApplied) { img.dataset.fallbackApplied = '1'; img.src = PLACEHOLDER_IMAGE; } };

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

async function uploadFiles(files) {
  const progress = $('[data-upload-progress]');
  const status = $('[data-upload-status]');
  const selected = [...files];
  const tooLarge = selected.find((file) => file.size > MAX_UPLOAD_SIZE);
  if (tooLarge) throw new Error(`Ảnh ${tooLarge.name} vượt quá 1 MB. Vui lòng tối ưu ảnh trước khi upload.`);
  const form = new FormData();
  selected.forEach((file) => form.append('files', file));
  progress.value = 10;
  status.textContent = `Đang upload ${selected.length} ảnh lên GitHub...`;
  const result = await api('/api/admin/upload', { method: 'POST', body: form });
  progress.value = 100;
  const uploaded = (result.files || []).map((entry) => entry.url);
  status.textContent = `Đã upload ${uploaded.length} ảnh vào assets/uploads/ trên GitHub.`;
  return uploaded;
}

function previewSelectedFiles(input) {
  const wrap = $('[data-preview-grid]');
  const status = $('[data-upload-status]');
  const count = $('[data-selected-count]');
  const files = [...input.files];
  wrap.innerHTML = '';
  count.textContent = files.length ? `Đã chọn ${files.length} ảnh.` : 'Chưa chọn ảnh.';
  const tooLarge = files.filter((file) => file.size > MAX_UPLOAD_SIZE);
  status.textContent = tooLarge.length
    ? `${tooLarge.length} ảnh vượt quá 1 MB: ${tooLarge.map((file) => file.name).join(', ')}`
    : 'Ảnh JPG, PNG, WebP tối đa 1 MB/ảnh. Có thể chọn nhiều ảnh trên desktop, Android và iPhone.';
  files.forEach((file) => {
    const card = document.createElement('figure');
    const url = URL.createObjectURL(file);
    const img = document.createElement('img');
    const caption = document.createElement('figcaption');
    img.src = url;
    img.alt = file.name;
    img.onload = () => URL.revokeObjectURL(url);
    caption.textContent = `${file.name} • ${(file.size / 1024).toFixed(0)} KB${file.size > MAX_UPLOAD_SIZE ? ' • vượt 1 MB' : ''}`;
    card.className = file.size > MAX_UPLOAD_SIZE ? 'invalid' : '';
    card.append(img, caption);
    wrap.appendChild(card);
  });
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
  if (files.some((file) => file.size > MAX_UPLOAD_SIZE)) {
    $('[data-upload-status]').textContent = 'Có ảnh vượt quá 1 MB. Vui lòng bỏ ảnh đó hoặc nén lại trước khi lưu.';
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
}

function renderQuotes() {
  const wrap = $('[data-quotes-list]');
  const tpl = $('#quote-template');
  wrap.innerHTML = '';
  if (!quotes.length) {
    wrap.innerHTML = '<p class="empty">Chưa có yêu cầu báo giá.</p>';
    return;
  }
  quotes.forEach((quote) => {
    const node = tpl.content.cloneNode(true);
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
    wrap.appendChild(node);
  });
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
$('[data-quote-filter]').addEventListener('change', async () => { await loadQuotes(); renderQuotes(); });
checkSession();
