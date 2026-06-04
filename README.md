# VẸN TOÀN CÀ MAU

Website giới thiệu dịch vụ **cơ khí, xây dựng và vật liệu xây dựng tại Cà Mau**. Phiên bản đầu tiên dùng HTML, CSS, JavaScript thuần, dữ liệu mẫu trong `data/site.json` và skeleton Cloudflare Pages Functions cho backend production an toàn.

## A. Chạy local preview

```bash
python3 -m http.server 8080
```

Mở:

- Trang chủ: `http://localhost:8080/`
- Quản trị xem thử: `http://localhost:8080/admin.html`

Trang quản trị hiện có **local preview mode** để xem dashboard và form mẫu. Dữ liệu production cần cấu hình Cloudflare Pages Functions.

## B. Kiểm tra frontend

- Kiểm tra `data/site.json` hợp lệ.
- Mở `index.html` và kiểm tra menu, bộ lọc sản phẩm, lightbox, form báo giá.
- Mở `admin.html` và kiểm tra đăng nhập xem thử, các tab dashboard, form thông tin website.
- Kiểm tra responsive bằng DevTools ở desktop, laptop, tablet, Android và iPhone.

## C. Bật GitHub Pages để xem bản static preview

- Repository: `ventoan68/van-toan-ca-mau`
- Branch: `main`
- Folder: `/ (root)`
- Địa chỉ dự kiến: `https://ventoan68.github.io/van-toan-ca-mau/`

GitHub Pages chỉ phù hợp để xem frontend tĩnh. Các API trong `functions/` không chạy trên GitHub Pages.

## D. Kết nối Cloudflare Pages

- Repository: `ventoan68/van-toan-ca-mau`
- Production branch: `main`
- Framework preset: `None`
- Build command: để trống nếu không cần build
- Output directory: `/` hoặc để trống theo cấu hình Pages cho repository root
- Địa chỉ dự kiến: `https://<project-name>.pages.dev`

Cloudflare Pages sẽ phục vụ file tĩnh ở root và chạy Pages Functions trong thư mục `functions/`.

## E. Khai báo Cloudflare secrets

Tạo các biến môi trường trong Cloudflare Pages:

```text
ADMIN_USERNAME
ADMIN_PASSWORD_HASH
SESSION_SECRET
GITHUB_TOKEN
GITHUB_OWNER
GITHUB_REPO
GITHUB_BRANCH
```

Tham khảo `.dev.vars.example`. Không commit file `.dev.vars` thật.

## F. Tạo password hash an toàn

Định dạng backend đang chuẩn bị: `pbkdf2$sha256$<iterations>$<salt>$<base64url-hash>`.

Ví dụ tạo hash local, thay mật khẩu trước khi chạy:

```bash
node -e "const c=require('crypto');const p='CHANGE_ME_PASSWORD';const salt=c.randomBytes(16).toString('base64url');const i=120000;const h=c.pbkdf2Sync(p,salt,i,32,'sha256').toString('base64url');console.log(`pbkdf2$sha256$${i}$${salt}$${h}`)"
```

Không gửi mật khẩu hoặc hash qua chat công khai.

## G. Tạo GitHub fine-grained personal access token

- Chỉ cấp quyền cho repository `van-toan-ca-mau`.
- Quyền tối thiểu cần thiết: đọc nội dung repository và ghi nội dung để cập nhật `data/site.json`, `assets/uploads/`.
- Không lưu token trong repository.
- Không đưa token vào frontend hoặc localStorage.
- Không gửi token qua chat.
- Thu hồi token ngay nếu nghi ngờ bị lộ.

## H. Đăng nhập admin production

1. Deploy lên Cloudflare Pages.
2. Cấu hình `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`.
3. Truy cập `/admin.html`.
4. Frontend production có thể gọi `/api/auth/login` để tạo cookie phiên HttpOnly, Secure, SameSite.

## I. Thêm sản phẩm và nhiều ảnh

Giao diện admin đã chuẩn bị các vùng thêm/sửa/xóa sản phẩm, tải nhiều ảnh, chọn ảnh đại diện và xóa riêng từng ảnh. Để lưu production cần nối form admin với:

- `POST /api/admin/upload`
- `PUT /api/admin/site`

## J. Thay ảnh stock bằng ảnh công trình thật

Hiện môi trường tải ảnh từ Pexels/Unsplash bị chặn nên website dùng placeholder SVG. Khi có ảnh thật:

1. Tối ưu ảnh sang WebP hoặc JPG nhẹ.
2. Lưu vào `assets/uploads/` hoặc upload qua dashboard.
3. Cập nhật `cover` và `images` trong `data/site.json`.
4. Với khu vực công trình, chỉ bỏ ghi chú “Hình ảnh minh họa” khi ảnh là công trình thật của đơn vị.

## K. Đổi điện thoại, Zalo, địa chỉ và giờ làm việc

Các trường chưa được cung cấp đang để `Đang cập nhật` trong `data/site.json`:

- `contact.phone`
- `contact.zalo`
- `contact.workingHours`

Có thể chỉnh trong dashboard hoặc sửa trực tiếp file JSON khi chưa bật backend.

## L. Kiểm tra website sau triển khai

- Trang chủ mở trực tiếp, không chuyển sang đăng nhập.
- Menu desktop và mobile hoạt động.
- Cuộn mượt tới từng khu vực.
- Bộ lọc sản phẩm hoạt động.
- Lightbox có nút đóng, mũi tên, thumbnail và hỗ trợ Escape.
- Form báo giá không giả vờ gửi thành công khi chưa có backend.
- Không có token, mật khẩu thật hoặc secret trong repository.

## M. Lưu ý kiến trúc

- GitHub Pages chỉ phù hợp để xem frontend tĩnh.
- Trang admin production nên chạy qua Cloudflare Pages Functions.
- Không dùng `localStorage` để giữ GitHub token production.
- Cookie phiên production phải là `HttpOnly`, `Secure`, `SameSite=Strict`.
- Backend cần kiểm tra quyền trước CRUD, sanitize dữ liệu, giới hạn file upload, chuẩn hóa tên file và không lộ secrets trong lỗi.

## Giới hạn hiện tại

- Chưa có ảnh thật của đơn vị; toàn bộ ảnh công trình hiện là “Hình ảnh minh họa”.
- Tải trực tiếp ảnh Pexels/Unsplash từ shell bị chặn bởi proxy, vì vậy dùng placeholder SVG và ghi rõ trong `IMAGE_SOURCES.md`.
- Skeleton backend đã chuẩn bị endpoint chính, nhưng cần kiểm thử production trên Cloudflare Pages trước khi sử dụng thật.
