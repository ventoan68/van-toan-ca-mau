# VẸN TOÀN CÀ MAU

Website production cho **VẸN TOÀN CÀ MAU**: giới thiệu dịch vụ cơ khí, xây dựng, vật liệu; nhận yêu cầu báo giá; quản trị nội dung, hình ảnh và yêu cầu khách hàng trên Cloudflare Pages.

## 1. Kiến trúc production

- Frontend tĩnh: `index.html`, `admin.html`, `assets/css/*`, `assets/js/*`.
- Backend: Cloudflare Pages Functions trong thư mục `functions/`.
- Database: Cloudflare D1 binding tên `DB`.
- Lưu ảnh: Cloudflare R2 binding tên `IMAGES`.
- Nội dung website production lưu trong bảng `site_content`, không dùng `localStorage` làm nguồn dữ liệu.
- Yêu cầu báo giá lưu trong bảng `quote_requests`.
- Ảnh upload được lưu trong R2 và phục vụ qua route công khai `/media/uploads/...`.

## 2. Endpoint chính

### Public

- `GET /api/site`: lấy nội dung website từ D1, fallback server-side về dữ liệu mẫu khi chưa có row.
- `POST /api/quotes`: khách gửi yêu cầu báo giá.
- `GET /media/*`: phục vụ ảnh từ R2.

### Auth

- `POST /api/auth/login`: đăng nhập admin bằng `ADMIN_USERNAME` và `ADMIN_PASSWORD_HASH`.
- `POST /api/auth/logout`: xóa cookie phiên.
- `GET /api/auth/me`: kiểm tra phiên đăng nhập.

### Admin

- `GET /api/admin/site`: lấy nội dung website để chỉnh sửa.
- `PUT /api/admin/site`: lưu nội dung website vào D1.
- `POST /api/admin/upload`: upload ảnh JPG/JPEG/PNG/WebP lên R2.
- `DELETE /api/admin/upload`: xóa ảnh trong R2.
- `GET /api/admin/quotes`: xem yêu cầu báo giá, có thể lọc `?status=new`.
- `PATCH /api/admin/quotes/:id`: cập nhật trạng thái và ghi chú nội bộ.

## 3. Kết nối repository với Cloudflare Pages

1. Vào Cloudflare Dashboard → Workers & Pages → Create application → Pages → Connect to Git.
2. Chọn repository `van-toan-ca-mau`.
3. Cấu hình build:
   - Production branch: `main`
   - Framework preset: `None`
   - Build command: để trống
   - Output directory: `/`
4. Deploy lần đầu để Cloudflare nhận Pages Functions trong thư mục `functions/`.

## 4. Tạo D1 database và migration

Tạo D1 database trong Cloudflare Dashboard hoặc dùng Wrangler:

```bash
wrangler d1 create van-toan-ca-mau
```

Trong Cloudflare Pages → Settings → Functions → D1 database bindings:

| Binding | Giá trị |
|---|---|
| `DB` | D1 database vừa tạo |

Chạy migration:

```bash
wrangler d1 execute van-toan-ca-mau --file=migrations/0001_init.sql --remote
```

Migration tạo:

- `site_content(id, content_json, updated_at)`
- `quote_requests(id, customer_name, phone, email, zalo, need, area, message, status, admin_note, created_at, updated_at)`
- Index cho `status`, `created_at`, và `(status, created_at)`.

## 5. Tạo R2 bucket

Tạo R2 bucket, ví dụ:

```bash
wrangler r2 bucket create van-toan-ca-mau-images
```

Trong Cloudflare Pages → Settings → Functions → R2 bucket bindings:

| Binding | Giá trị |
|---|---|
| `IMAGES` | R2 bucket vừa tạo |

## 6. Khai báo secrets bắt buộc

Trong Cloudflare Pages → Settings → Environment variables, tạo dạng secret:

| Secret | Ghi chú |
|---|---|
| `ADMIN_USERNAME` | Dự kiến: `ventoan` |
| `ADMIN_PASSWORD_HASH` | Hash PBKDF2 SHA-256, không phải mật khẩu thật |
| `SESSION_SECRET` | Chuỗi ngẫu nhiên dài, dùng ký cookie phiên |

Không commit mật khẩu thật, token hoặc secrets vào repository. Không ghi mật khẩu thật trong frontend.

## 7. Tạo password hash an toàn

Chạy local, thay mật khẩu bằng mật khẩu admin thật khi tạo secret:

```bash
node scripts/hash-password.mjs "MAT_KHAU_ADMIN_THAT"
```

Kết quả có dạng:

```text
pbkdf2$sha256$210000$<salt>$<hash>
```

Copy toàn bộ chuỗi này vào secret `ADMIN_PASSWORD_HASH`. Không lưu mật khẩu plain text vào repository.

## 8. Redeploy và kiểm tra

Sau khi tạo bindings, secrets và chạy migration:

1. Redeploy Cloudflare Pages.
2. Mở `/admin.html`.
3. Đăng nhập bằng `ADMIN_USERNAME` và mật khẩu thật tương ứng với hash.
4. Kiểm tra `GET /api/auth/me` trả về phiên hợp lệ sau đăng nhập.
5. Sửa nội dung website và bấm lưu để ghi vào D1.
6. Mở trang chủ bằng trình duyệt khác để xác nhận mọi khách truy cập thấy nội dung mới.
7. Gửi form báo giá ở trang chủ.
8. Vào tab “Yêu cầu báo giá” để xem, gọi điện, mở Zalo, gửi email, ghi chú và đổi trạng thái.
9. Upload nhiều ảnh ở tab sản phẩm/công trình/bài viết, chọn ảnh đại diện, sắp xếp ảnh và xóa từng ảnh khi cần.

## 9. Responsive cần kiểm tra

Kiểm tra bằng DevTools và thiết bị thật nếu có:

- Desktop rộng.
- Laptop.
- Android.
- iPhone.

Các điểm cần xác nhận:

- Trang admin dùng tốt trên điện thoại.
- Sidebar thu gọn, không tràn ngang.
- Modal chỉnh sửa không tràn màn hình.
- Input upload có `multiple` và `accept="image/*"`, không dùng `capture`.
- Form báo giá dễ nhập và nút gửi dễ bấm.

## 10. Hình ảnh minh họa và ảnh thật

Website giữ SVG fallback trong `assets/images/stock/` và `assets/images/placeholders/`. Khi chưa có ảnh công trình thật, chỉ ghi **“Hình ảnh minh họa”**. Không tự khẳng định ảnh stock là công trình thực tế.

Nguồn stock hợp lệ nên dùng khi cần thay ảnh minh họa:

- Pexels: trang tìm kiếm “glass aluminum door”.
- Pexels: ảnh “Glass Window With Metal Frame”.
- Pexels: ảnh “Aluminum Framed Glass Door in a Greenhouse”.
- Unsplash: bộ ảnh “Aluminum Windows”.
- Unsplash: bộ ảnh “Glass Doors”.

Xem thêm `IMAGE_SOURCES.md` để theo dõi nguồn ảnh và ghi chú bản quyền.

## 11. Chạy local static preview

Static preview không có D1/R2 thật:

```bash
python3 -m http.server 8080
```

Mở:

- Trang chủ: `http://localhost:8080/`
- Quản trị: `http://localhost:8080/admin.html`

Để kiểm thử Functions với D1/R2 local, nên dùng Wrangler Pages dev và cấu hình bindings tương ứng.

## 12. Checklist trước khi dùng thật

- [ ] Cloudflare Pages dùng production branch `main`.
- [ ] Binding `DB` đã trỏ đến D1 production.
- [ ] Binding `IMAGES` đã trỏ đến R2 production.
- [ ] Secrets `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET` đã khai báo.
- [ ] Đã chạy `migrations/0001_init.sql`.
- [ ] Đăng nhập, đăng xuất, `/api/auth/me` hoạt động.
- [ ] CRUD nội dung website hoạt động và lưu vĩnh viễn.
- [ ] Upload nhiều ảnh hoạt động và ảnh hiển thị qua `/media/`.
- [ ] Form báo giá public gửi được.
- [ ] Admin xem và xử lý yêu cầu báo giá được.
