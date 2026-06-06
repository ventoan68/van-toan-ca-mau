import { json, publicError } from '../_shared/response.js';
import { cleanEmail, cleanPhone, cleanText } from '../_shared/sanitize.js';

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const customerName = cleanText(body.customer_name ?? body.name, 120);
    const phone = cleanPhone(body.phone);
    const email = cleanEmail(body.email);
    const zalo = cleanPhone(body.zalo);
    const need = cleanText(body.need, 160);
    const area = cleanText(body.area, 160);
    const message = cleanText(body.message, 2000);

    if (!customerName || !phone || !need || !area) {
      return publicError('Vui lòng nhập họ tên, số điện thoại, nhu cầu và khu vực.', 400);
    }
    if (String(body.email ?? '').trim() && !email) return publicError('Email chưa đúng định dạng.', 400);

    const now = new Date().toISOString();
    await env.DB.prepare(`
      INSERT INTO quote_requests (customer_name, phone, email, zalo, need, area, message, status, admin_note, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'new', '', ?, ?)
    `).bind(customerName, phone, email, zalo, need, area, message, now, now).run();

    return json({ ok: true, message: 'Đã gửi yêu cầu thành công. Vẹn Toàn Cà Mau sẽ liên hệ để trao đổi chi tiết.' }, 201);
  } catch (error) {
    console.error('quote-create', error);
    return publicError('Không thể gửi yêu cầu lúc này. Vui lòng thử lại sau.', 500);
  }
}
