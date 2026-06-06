# VẸN TOÀN CÀ MAU

Website production cho **VẸN TOÀN CÀ MAU**: giới thiệu dịch vụ cơ khí, xây dựng, vật liệu; nhận yêu cầu báo giá; quản trị nội dung, hình ảnh và yêu cầu khách hàng trên Cloudflare Pages.

## 1. Kiến trúc production không cần R2

Website **không cần Cloudflare R2**, không cần bucket R2 và không dùng binding `IMAGES`.

Tiếp tục dùng:

- Frontend tĩnh: `index.html`, `admin.html`, `assets/css/*`, `assets/js/*`.
- Backend: Cloudflare Pages Functions trong thư mục `functions/`.
- Database: Cloudflare D1 binding giữ đúng tên `DB`.
- Cloudflare Variables and Secrets cho admin, session và GitHub API.

Dữ liệu lưu trữ:

- Nội dung website production lưu trong bảng D1 `site_content`.
- Yêu cầu báo giá lưu trong bảng D1 `quote_requests`.
- Ảnh upload từ admin được ghi vào GitHub repository `ventoan68/van-toan-ca-mau`, thư mục `assets/uploads/`.
- Trang public hiển thị ảnh upload bằng URL dạng `https://raw.githubusercontent.com/ventoan68/van-toan-ca-mau/main/assets/uploads/<filename>`.

## 2. Endpoint chính

### Public

- `GET /api/site`: lấy nội dung website từ D1, fallback server-side về dữ liệu mẫu khi chưa có row.
- `POST /api/quotes`: khách gửi yêu cầu báo giá thật vào D1.

### Auth

- `POST /api/auth/login`: đăng nhập admin bằng `ADMIN_USERNAME` và `ADMIN_PASSWORD_HASH`.
- `GET /api/auth/me`: kiểm tra phiên đăng nhập bằng cookie HttpOnly.
- `POST /api/auth/logout`: xóa cookie phiên.

### Admin

- `GET /api/admin/site`: lấy nội dung website để chỉnh sửa.
- `PUT /api/admin/site`: lưu nội dung website vào D1.
- `POST /api/admin/upload`: upload nhiều ảnh JPG/JPEG/PNG/WebP, tối đa 1 MB/ảnh, vào `assets/uploads/` qua GitHub REST API.
- `DELETE /api/admin/upload`: xóa ảnh hợp lệ trong `assets/uploads/` qua GitHub REST API.
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

## 5. Tạo GitHub fine-grained personal access token

Tạo token trong GitHub để Pages Functions có thể commit ảnh upload vào repository.

1. Vào GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens.
2. Chọn **Generate new token**.
3. Đặt tên dễ nhận biết, ví dụ `van-toan-ca-mau-pages-upload`.
4. Chọn owner có repository `ventoan68/van-toan-ca-mau`.
5. Ở **Repository access**, chỉ chọn repository `van-toan-ca-mau`. Không cấp token cho tất cả repository.
6. Cấp quyền tối thiểu:

| Permission | Mức quyền |
|---|---|
| Contents | Read and write |
| Metadata | Read-only |

7. Tạo token và copy một lần để khai báo vào Cloudflare Pages secret.

**Bảo mật bắt buộc:** không gửi token qua chat, không ghi token vào source code, không ghi token vào frontend, không lưu token trong `localStorage`.

## 6. Khai báo Cloudflare Variables and Secrets

Trong Cloudflare Pages → Settings → Environment variables, khai báo cho Production và Preview nếu cần kiểm thử PR.

### Secrets

| Secret | Ghi chú |
|---|---|
| `GITHUB_TOKEN` | Fine-grained token của GitHub, chỉ cấp cho repository `van-toan-ca-mau` |
| `ADMIN_USERNAME` | Tài khoản admin |
| `ADMIN_PASSWORD_HASH` | Hash PBKDF2 SHA-256, không phải mật khẩu thật |
| `SESSION_SECRET` | Chuỗi ngẫu nhiên dài, dùng ký cookie phiên |

### Variables

| Variable | Giá trị khuyến nghị |
|---|---|
| `GITHUB_OWNER` | `ventoan68` |
| `GITHUB_REPO` | `van-toan-ca-mau` |
| `GITHUB_BRANCH` | `main` |

Không gửi token hoặc mật khẩu qua chat. Không ghi token hoặc mật khẩu vào frontend.

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

## 8. Upload ảnh

- Admin có thể chọn nhiều ảnh trên desktop, Android và iPhone.
- Chỉ nhận JPG/JPEG, PNG, WebP.
- Mỗi ảnh tối đa 1 MB; nên tối ưu ảnh dưới 1 MB trước khi upload để Pages Functions và GitHub API xử lý ổn định.
- Ảnh được commit tuần tự vào `assets/uploads/` trên branch cấu hình bởi `GITHUB_BRANCH`.
- File trong `assets/uploads/` có thể được xóa riêng từ admin; placeholder SVG và file ngoài thư mục này không được xóa qua API.

## 9. Redeploy và kiểm tra sau khi deploy

Sau khi tạo binding `DB`, khai báo variables/secrets và chạy migration:

1. Redeploy Cloudflare Pages.
2. Mở `/admin.html`.
3. Đăng nhập bằng `ADMIN_USERNAME` và mật khẩu thật tương ứng với hash.
4. Kiểm tra `GET /api/auth/me` trả về phiên hợp lệ sau đăng nhập.
5. Đăng xuất bằng `POST /api/auth/logout`, sau đó xác nhận `/api/auth/me` trả về chưa đăng nhập.
6. Sửa nội dung website và bấm lưu để ghi vào D1.
7. Mở trang chủ bằng trình duyệt khác để xác nhận mọi khách truy cập thấy nội dung mới từ `GET /api/site`.
8. Gửi form báo giá ở trang chủ và xác nhận thông báo: “Đã gửi yêu cầu thành công. Vẹn Toàn Cà Mau sẽ liên hệ để trao đổi chi tiết.”
9. Vào tab “Yêu cầu báo giá” để xem, gọi điện, mở Zalo, gửi email, ghi chú và đổi trạng thái.
10. Upload nhiều ảnh ở tab sản phẩm/công trình/bài viết, chọn ảnh đại diện, sắp xếp ảnh và xóa từng ảnh khi cần.
11. Mở URL `raw.githubusercontent.com` của ảnh vừa upload để xác nhận ảnh hiển thị được.

## 10. Responsive cần kiểm tra

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

## 11. Hình ảnh minh họa và ảnh thật

Website giữ SVG fallback trong `assets/images/stock/` và `assets/images/placeholders/`. Khi chưa có ảnh công trình thật, chỉ ghi **“Hình ảnh minh họa”**. Không tự khẳng định ảnh stock là công trình thực tế.

Nguồn stock hợp lệ nên dùng khi cần thay ảnh minh họa:

- Pexels: trang tìm kiếm “glass aluminum door”.
- Pexels: ảnh “Glass Window With Metal Frame”.
- Pexels: ảnh “Aluminum Framed Glass Door in a Greenhouse”.
- Unsplash: bộ ảnh “Aluminum Windows”.
- Unsplash: bộ ảnh “Glass Doors”.

Xem thêm `IMAGE_SOURCES.md` để theo dõi nguồn ảnh và ghi chú bản quyền.

## 12. Chạy local static preview

Static preview không có D1 thật hoặc GitHub token thật:

```bash
python3 -m http.server 8080
```

Mở:

- Trang chủ: `http://localhost:8080/`
- Quản trị: `http://localhost:8080/admin.html`

Để kiểm thử Pages Functions với D1 local và GitHub API, nên dùng Wrangler Pages dev và cấu hình biến môi trường tương ứng. Không dùng token thật trong file commit lên repository.

## 13. Checklist trước khi dùng thật

- [ ] Cloudflare Pages dùng production branch `main`.
- [ ] Binding `DB` đã trỏ đến D1 production.
- [ ] Không cấu hình R2 bucket và không cấu hình binding `IMAGES`.
- [ ] Variables `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH` đã khai báo.
- [ ] Secrets `GITHUB_TOKEN`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET` đã khai báo.
- [ ] Đã chạy `migrations/0001_init.sql`.
- [ ] Đăng nhập, đăng xuất, `/api/auth/me` hoạt động.
- [ ] CRUD nội dung website hoạt động và lưu vĩnh viễn vào D1.
- [ ] Upload nhiều ảnh hoạt động và ảnh hiển thị bằng URL `raw.githubusercontent.com`.
- [ ] Xóa ảnh trong `assets/uploads/` hoạt động, không xóa được file ngoài thư mục này.
- [ ] Form báo giá public gửi được.
- [ ] Admin xem và xử lý yêu cầu báo giá được.
