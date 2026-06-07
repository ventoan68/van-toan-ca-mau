const state = { site: null, lightboxImages: [], lightboxIndex: 0 };
const safe = (value) => String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
const PLACEHOLDER_IMAGE = 'assets/images/placeholders/blueprint.svg';
const ABOUT_FALLBACK_IMAGE = 'assets/images/stock/stock-mechanic-tools.svg';
const imageSrc = (value) => safe(value || PLACEHOLDER_IMAGE);
const fallbackAttr = `onerror="this.onerror=null;this.src='${PLACEHOLDER_IMAGE}'"`;

async function loadSite() {
  try {
    const res = await fetch('/api/site', { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error('API site unavailable');
    state.site = await res.json();
  } catch (error) {
    console.warn('Không tải được /api/site, dùng data/site.json làm fallback tĩnh.', error);
    const fallback = await fetch('data/site.json');
    state.site = await fallback.json();
  }
  renderSite(state.site);
}

function setText(selector, value) {
  document.querySelectorAll(selector).forEach((element) => { element.textContent = value; });
}

function renderSite(site) {
  setText('[data-brand-name]', site.brand.name);
  setText('[data-brand-tagline]', site.brand.tagline);
  setText('[data-hero-title]', site.brand.heroTitle);
  setText('[data-hero-description]', site.brand.heroDescription);
  const heroImage = document.querySelector('[data-hero-image]');
  if (heroImage) {
    heroImage.src = site.brand.heroImage || PLACEHOLDER_IMAGE;
    heroImage.onerror = () => { heroImage.onerror = null; heroImage.src = PLACEHOLDER_IMAGE; };
  }
  const heroBg = document.querySelector('.hero-bg');
  if (heroBg && site.brand.heroImage) {
    heroBg.style.backgroundImage = `radial-gradient(circle at 20% 10%,rgba(249,115,22,.35),transparent 28%),linear-gradient(115deg,rgba(7,26,47,.95),rgba(7,26,47,.76)),url('${site.brand.heroImage}')`;
  }
  setText('[data-contact-phone]', site.contact.phone);
  setText('[data-contact-zalo]', site.contact.zalo);
  setText('[data-contact-address]', site.contact.address);
  setText('[data-contact-area]', site.contact.serviceArea);
  setText('[data-contact-hours]', site.contact.workingHours);
  document.querySelectorAll('[data-contact-email]').forEach((link) => {
    link.textContent = site.contact.email;
    link.href = `mailto:${site.contact.email}`;
  });
  renderAbout(site.about || {});
  renderServices(site.services || []);
  renderFilters(site.categories || []);
  renderProducts(site.products || []);
  renderProjects(site.projects || []);
  renderPosts(site.posts || []);
}


function renderAbout(about = {}) {
  const fallback = {
    eyebrow: 'Giới thiệu',
    title: 'Đơn vị đồng hành cho nhu cầu cơ khí, xây dựng và vật liệu',
    paragraph1: 'VẸN TOÀN CÀ MAU hướng đến cách làm việc thực tế, rõ ràng và gần gũi với khách hàng địa phương. Website này giúp khách hàng xem nhanh nhóm dịch vụ, sản phẩm, quy trình trao đổi và gửi yêu cầu báo giá.',
    paragraph2: 'Đơn vị tiếp nhận các nhu cầu về nhà thép tiền chế, khung sắt, mái tôn, cửa nhôm Xingfa, cửa kính, lan can, cầu thang, hàng rào, mái che, sắt thép, gạch và vật liệu xây dựng.',
    image: ABOUT_FALLBACK_IMAGE,
    cardTitle: 'Phong cách làm việc',
    cardText: 'Trao đổi rõ nhu cầu, khảo sát kỹ hiện trạng, tư vấn phương án phù hợp.',
  };
  const data = { ...fallback, ...about };
  setText('[data-about-eyebrow]', data.eyebrow || fallback.eyebrow);
  setText('[data-about-title]', data.title || fallback.title);
  setText('[data-about-paragraph1]', data.paragraph1 || fallback.paragraph1);
  setText('[data-about-paragraph2]', data.paragraph2 || fallback.paragraph2);
  setText('[data-about-card-title]', data.cardTitle || fallback.cardTitle);
  setText('[data-about-card-text]', data.cardText || fallback.cardText);
  const image = document.querySelector('[data-about-image]');
  if (image) {
    image.src = data.image || ABOUT_FALLBACK_IMAGE;
    image.onerror = () => { image.onerror = null; image.src = ABOUT_FALLBACK_IMAGE; };
  }
}

function renderServices(items) {
  document.querySelector('[data-services]').innerHTML = items.map((service) => `
    <article class="service-card">
      <img src="${imageSrc(service.image)}" alt="${safe(service.title)} minh họa" loading="lazy" ${fallbackAttr}>
      <span class="service-icon" aria-hidden="true">${safe(service.icon)}</span>
      <h3>${safe(service.title)}</h3>
      <p>${safe(service.description)}</p>
      <div class="card-actions"><a class="btn btn-dark" href="#products">Xem chi tiết</a><a class="btn btn-primary" href="#quote">Báo giá</a></div>
    </article>`).join('');
}

function renderFilters(categories) {
  const wrap = document.querySelector('[data-filters]');
  wrap.innerHTML = ['Tất cả', ...categories].map((category, index) => `<button type="button" class="${index === 0 ? 'active' : ''}" data-filter="${safe(category)}">${safe(category)}</button>`).join('');
  wrap.onclick = (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    wrap.querySelectorAll('button').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    renderProducts(state.site.products || [], button.dataset.filter);
  };
}

function productCard(item, type = 'product') {
  const images = item.images?.length ? item.images : [item.cover || item.image].filter(Boolean);
  return `<article class="${type}-card">
    <div class="media"><img src="${imageSrc(item.cover || item.image)}" alt="${safe(item.name || item.title)}" loading="lazy" ${fallbackAttr}><span class="badge">${images.length} ảnh</span></div>
    <div class="card-body"><span class="category">${safe(item.category || item.group || 'Hình ảnh minh họa')}</span><h3>${safe(item.name || item.title)}</h3><p>${safe(item.description)}</p>
    ${item.note ? `<span class="note">${safe(item.note)}</span>` : ''}${item.area ? `<p><b>Khu vực:</b> ${safe(item.area)}</p>` : ''}
    <div class="card-actions"><button class="btn btn-dark" type="button" data-gallery="${encodeURIComponent(JSON.stringify(images))}" data-title="${safe(item.name || item.title)}">Xem bộ ảnh</button><a class="btn btn-primary" href="#quote">Yêu cầu báo giá</a></div></div>
  </article>`;
}

function renderProducts(items, filter = 'Tất cả') {
  const data = filter === 'Tất cả' ? items : items.filter((product) => product.category === filter);
  document.querySelector('[data-products]').innerHTML = data.map((product) => productCard(product, 'product')).join('');
}

function renderProjects(items) {
  document.querySelector('[data-projects]').innerHTML = items.map((project) => productCard(project, 'project')).join('');
}

function renderPosts(items) {
  document.querySelector('[data-posts]').innerHTML = items.map((post) => `
    <article class="post-card"><div class="media"><img src="${imageSrc(post.image)}" alt="${safe(post.title)}" loading="lazy" ${fallbackAttr}></div>
      <div class="card-body"><span class="category">${safe(new Date(post.date).toLocaleDateString('vi-VN'))}</span><h3>${safe(post.title)}</h3><p>${safe(post.description)}</p><details><summary class="btn btn-dark">Xem chi tiết</summary><p>${safe(post.content)}</p></details></div>
    </article>`).join('');
}

function openLightbox(images, title) {
  state.lightboxImages = images;
  state.lightboxIndex = 0;
  document.querySelector('[data-lightbox]').classList.add('open');
  document.querySelector('[data-lightbox]').setAttribute('aria-hidden', 'false');
  updateLightbox(title);
  document.querySelector('.lightbox-close').focus();
}

function updateLightbox(title = 'Bộ ảnh') {
  const img = document.querySelector('[data-lightbox-image]');
  img.src = state.lightboxImages[state.lightboxIndex] || PLACEHOLDER_IMAGE;
  img.onerror = () => { img.onerror = null; img.src = PLACEHOLDER_IMAGE; };
  img.alt = `${title} - ảnh ${state.lightboxIndex + 1}`;
  document.querySelector('[data-lightbox-caption]').textContent = `${title} • Ảnh ${state.lightboxIndex + 1}/${state.lightboxImages.length} • Hình ảnh minh họa`;
  document.querySelector('[data-lightbox-thumbs]').innerHTML = state.lightboxImages.map((src, index) => `<button type="button" class="${index === state.lightboxIndex ? 'active' : ''}" data-thumb="${index}" aria-label="Xem ảnh ${index + 1}"><img src="${imageSrc(src)}" alt="Thumbnail ${index + 1}" ${fallbackAttr}></button>`).join('');
}

function closeLightbox() {
  document.querySelector('[data-lightbox]').classList.remove('open');
  document.querySelector('[data-lightbox]').setAttribute('aria-hidden', 'true');
}

function moveLightbox(step) {
  state.lightboxIndex = (state.lightboxIndex + step + state.lightboxImages.length) % state.lightboxImages.length;
  updateLightbox(document.querySelector('[data-lightbox-caption]').textContent.split(' • ')[0]);
}

async function submitQuote(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const note = form.querySelector('.form-note');
  const original = button.textContent;
  button.disabled = true;
  button.textContent = 'Đang gửi...';
  note.textContent = 'Đang gửi yêu cầu báo giá, vui lòng chờ...';
  note.classList.remove('error', 'success');
  const payload = Object.fromEntries(new FormData(form).entries());
  try {
    const res = await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Không thể gửi yêu cầu.');
    form.reset();
    note.textContent = data.message || 'Đã gửi yêu cầu thành công. Vẹn Toàn Cà Mau sẽ liên hệ để trao đổi chi tiết.';
    note.classList.add('success');
  } catch (error) {
    note.textContent = error.message || 'Không thể gửi yêu cầu lúc này. Vui lòng thử lại sau.';
    note.classList.add('error');
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

document.addEventListener('click', (event) => {
  const gallery = event.target.closest('[data-gallery]');
  if (gallery) openLightbox(JSON.parse(decodeURIComponent(gallery.dataset.gallery)), gallery.dataset.title);
  const thumb = event.target.closest('[data-thumb]');
  if (thumb) {
    state.lightboxIndex = Number(thumb.dataset.thumb);
    updateLightbox(document.querySelector('[data-lightbox-caption]').textContent.split(' • ')[0]);
  }
});

document.querySelector('.menu-toggle').addEventListener('click', (event) => {
  const nav = document.querySelector('#primary-nav');
  const open = nav.classList.toggle('open');
  event.currentTarget.setAttribute('aria-expanded', open);
});
document.querySelectorAll('#primary-nav a').forEach((link) => link.addEventListener('click', () => document.querySelector('#primary-nav').classList.remove('open')));
document.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
document.querySelector('.lightbox-prev').addEventListener('click', () => moveLightbox(-1));
document.querySelector('.lightbox-next').addEventListener('click', () => moveLightbox(1));
document.querySelector('[data-lightbox]').addEventListener('click', (event) => { if (event.target.matches('[data-lightbox]')) closeLightbox(); });
document.addEventListener('keydown', (event) => {
  if (!document.querySelector('[data-lightbox]').classList.contains('open')) return;
  if (event.key === 'Escape') closeLightbox();
  if (event.key === 'ArrowLeft') moveLightbox(-1);
  if (event.key === 'ArrowRight') moveLightbox(1);
});
document.querySelector('.quote-form').addEventListener('submit', submitQuote);
loadSite();
