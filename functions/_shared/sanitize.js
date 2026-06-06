const TEXT_LIMIT = 5000;

export function cleanText(value, max = TEXT_LIMIT) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export function cleanEmail(value) {
  const email = cleanText(value, 160).toLowerCase();
  if (!email) return '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

export function cleanPhone(value) {
  return cleanText(value, 40).replace(/[^0-9+().\-\s]/g, '').slice(0, 40);
}

export function sanitizeDeep(value, depth = 0) {
  if (depth > 8) return null;
  if (Array.isArray(value)) return value.slice(0, 200).map((item) => sanitizeDeep(item, depth + 1));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, val] of Object.entries(value).slice(0, 300)) {
      const cleanKey = cleanText(key, 80).replace(/[^\w.-]/g, '');
      if (cleanKey) out[cleanKey] = sanitizeDeep(val, depth + 1);
    }
    return out;
  }
  if (typeof value === 'string') return cleanText(value, TEXT_LIMIT);
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'boolean' || value === null) return value;
  return '';
}

export function normalizeUploadName(name) {
  const base = cleanText(name, 120)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/\.{2,}/g, '.')
    .replace(/^-+|-+$/g, '')
    .replace(/^\.+/, '')
    .slice(0, 90);
  return base || 'image';
}
