# Nguồn hình ảnh

## Tình trạng tải ảnh trong môi trường hiện tại

Đã thử tải trực tiếp ảnh từ các domain được yêu cầu (`pexels.com`, `images.pexels.com`, `unsplash.com`, `images.unsplash.com`) bằng `curl`/Python với URL ảnh thực tế. Proxy của môi trường trả về `403 Forbidden` / `CONNECT tunnel failed, response 403`, còn tải trình duyệt Playwright để chụp màn hình cũng bị chặn từ CDN với `Domain forbidden`.

Vì không thể tải binary ảnh thật vào repository trong môi trường này, website hiện **không hotlink ảnh ngoài** và không dùng ảnh không rõ bản quyền. Thay vào đó, phiên bản này bổ sung 20 ảnh SVG minh họa rõ nét trong `assets/images/stock/` để giao diện ưu tiên thư mục stock thay vì placeholder. Các placeholder cũ vẫn được giữ trong `assets/images/placeholders/` làm phương án dự phòng.

> Khi chạy ở môi trường có quyền truy cập Pexels/Unsplash, quản trị viên nên thay các file SVG trong `assets/images/stock/` bằng ảnh WebP/JPG tải thật từ Pexels hoặc Unsplash, sau đó cập nhật URL nguồn ở bảng dưới.

## File đang dùng trên website

| File ảnh | URL nguồn | Nền tảng | Tác giả | Khu vực sử dụng | Ghi chú |
|---|---|---|---|---|---|
| `assets/images/stock/stock-steel-structure.svg` | Không tải được từ Pexels/Unsplash trong môi trường hiện tại | Fallback nội bộ | VẸN TOÀN CÀ MAU | Hero, sản phẩm, lightbox | Hình ảnh minh họa |
| `assets/images/stock/stock-pre-engineered-building.svg` | Không tải được từ Pexels/Unsplash trong môi trường hiện tại | Fallback nội bộ | VẸN TOÀN CÀ MAU | Dịch vụ, sản phẩm, công trình | Hình ảnh minh họa |
| `assets/images/stock/stock-metal-roof-frame.svg` | Không tải được từ Pexels/Unsplash trong môi trường hiện tại | Fallback nội bộ | VẸN TOÀN CÀ MAU | Dịch vụ, sản phẩm, công trình | Hình ảnh minh họa |
| `assets/images/stock/stock-aluminum-glass-door.svg` | Không tải được từ Pexels/Unsplash trong môi trường hiện tại | Fallback nội bộ | VẸN TOÀN CÀ MAU | Dịch vụ, sản phẩm, bài viết | Hình ảnh minh họa |
| `assets/images/stock/stock-glass-door.svg` | Không tải được từ Pexels/Unsplash trong môi trường hiện tại | Fallback nội bộ | VẸN TOÀN CÀ MAU | Dịch vụ, sản phẩm | Hình ảnh minh họa |
| `assets/images/stock/stock-railing-stairs.svg` | Không tải được từ Pexels/Unsplash trong môi trường hiện tại | Fallback nội bộ | VẸN TOÀN CÀ MAU | Dịch vụ, sản phẩm | Hình ảnh minh họa |
| `assets/images/stock/stock-fence-awning.svg` | Không tải được từ Pexels/Unsplash trong môi trường hiện tại | Fallback nội bộ | VẸN TOÀN CÀ MAU | Dịch vụ, sản phẩm, công trình | Hình ảnh minh họa |
| `assets/images/stock/stock-floor-tiles.svg` | Không tải được từ Pexels/Unsplash trong môi trường hiện tại | Fallback nội bộ | VẸN TOÀN CÀ MAU | Dịch vụ, sản phẩm, bài viết | Hình ảnh minh họa |
| `assets/images/stock/stock-wall-tiles.svg` | Không tải được từ Pexels/Unsplash trong môi trường hiện tại | Fallback nội bộ | VẸN TOÀN CÀ MAU | Dịch vụ, sản phẩm | Hình ảnh minh họa |
| `assets/images/stock/stock-construction-steel.svg` | Không tải được từ Pexels/Unsplash trong môi trường hiện tại | Fallback nội bộ | VẸN TOÀN CÀ MAU | Dịch vụ, sản phẩm | Hình ảnh minh họa |
| `assets/images/stock/stock-building-materials.svg` | Không tải được từ Pexels/Unsplash trong môi trường hiện tại | Fallback nội bộ | VẸN TOÀN CÀ MAU | Dịch vụ, sản phẩm, bài viết | Hình ảnh minh họa |
| `assets/images/stock/stock-mechanic-tools.svg` | Không tải được từ Pexels/Unsplash trong môi trường hiện tại | Fallback nội bộ | VẸN TOÀN CÀ MAU | Giới thiệu | Hình ảnh minh họa |
| `assets/images/stock/stock-construction-site.svg` | Không tải được từ Pexels/Unsplash trong môi trường hiện tại | Fallback nội bộ | VẸN TOÀN CÀ MAU | Nền hero | Hình ảnh minh họa |
| `assets/images/stock/stock-warehouse-materials.svg` | Không tải được từ Pexels/Unsplash trong môi trường hiện tại | Fallback nội bộ | VẸN TOÀN CÀ MAU | Sản phẩm | Hình ảnh minh họa |
| `assets/images/stock/stock-steel-beams.svg` | Không tải được từ Pexels/Unsplash trong môi trường hiện tại | Fallback nội bộ | VẸN TOÀN CÀ MAU | Sản phẩm | Hình ảnh minh họa |
| `assets/images/stock/stock-roof-sheet.svg` | Không tải được từ Pexels/Unsplash trong môi trường hiện tại | Fallback nội bộ | VẸN TOÀN CÀ MAU | Sản phẩm, bài viết | Hình ảnh minh họa |
| `assets/images/stock/stock-brick-cement.svg` | Không tải được từ Pexels/Unsplash trong môi trường hiện tại | Fallback nội bộ | VẸN TOÀN CÀ MAU | Sản phẩm | Hình ảnh minh họa |
| `assets/images/stock/stock-industrial-workshop.svg` | Không tải được từ Pexels/Unsplash trong môi trường hiện tại | Fallback nội bộ | VẸN TOÀN CÀ MAU | Công trình, sản phẩm | Hình ảnh minh họa |
| `assets/images/stock/stock-glass-facade.svg` | Không tải được từ Pexels/Unsplash trong môi trường hiện tại | Fallback nội bộ | VẸN TOÀN CÀ MAU | Công trình, sản phẩm | Hình ảnh minh họa |
| `assets/images/stock/stock-blueprint.svg` | Không tải được từ Pexels/Unsplash trong môi trường hiện tại | Fallback nội bộ | VẸN TOÀN CÀ MAU | Bài viết | Hình ảnh minh họa |

## Nguồn Pexels/Unsplash đã kiểm tra để thay thế sau

Các trang/URL dưới đây được kiểm tra bằng công cụ duyệt web để xác nhận là nguồn Pexels/Unsplash rõ ràng, nhưng shell không tải được binary ảnh trong môi trường hiện tại:

| URL nguồn đã kiểm tra | Nền tảng | Tác giả nếu thấy được | Nhóm phù hợp | Ghi chú |
|---|---|---|---|---|
| `https://www.pexels.com/photo/photo-of-a-steel-construction-11931934/` | Pexels | Brett Sayles | Kết cấu thép | Hình ảnh minh họa |
| `https://www.pexels.com/photo/steel-construction-over-concrete-19216777/` | Pexels | Alex Quezada | Khung thép | Hình ảnh minh họa |
| `https://www.pexels.com/photo/tall-steel-building-12716355/` | Pexels | Egor Komarov | Kết cấu thép / mặt dựng | Hình ảnh minh họa |
| `https://www.pexels.com/photo/modern-steel-structure-building-under-construction-32577705/` | Pexels | Sergio Fdez | Công trường / kết cấu thép | Hình ảnh minh họa |
| `https://www.pexels.com/photo/tiles-on-floor-16202240/` | Pexels | Tuherdias Awang | Gạch lát nền | Hình ảnh minh họa |
| `https://www.pexels.com/photo/tiles-with-a-pattern-on-the-floor-18764945/` | Pexels | Orhan Pergel | Gạch lát nền / ốp tường | Hình ảnh minh họa |
| `https://unsplash.com/s/photos/steel-construction` | Unsplash | Nhiều tác giả | Kết cấu thép / xây dựng | Hình ảnh minh họa |
| `https://unsplash.com/s/photos/steel-building` | Unsplash | Nhiều tác giả | Nhà thép / công nghiệp | Hình ảnh minh họa |
| `https://unsplash.com/s/photos/steel-structure-building` | Unsplash | Nhiều tác giả | Kết cấu thép | Hình ảnh minh họa |

## Lệnh tải bị chặn đã ghi nhận

```bash
curl -L --max-time 20 -o /tmp/test.jpg 'https://source.unsplash.com/1600x1000/?steel,construction'
curl -L --max-time 30 -o /tmp/u.jpg 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1600&q=80'
curl -L --max-time 60 -o assets/images/stock/steel-concrete-structure.jpg 'https://images.pexels.com/photos/5801624/pexels-photo-5801624.jpeg?cs=srgb&dl=pexels-val-burger-3898035-5801624.jpg&fm=jpg'
```

Kết quả đều bị proxy môi trường chặn, nên không có ảnh Pexels/Unsplash binary thật được commit trong lần cập nhật này.
