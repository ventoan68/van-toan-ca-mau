# IMAGE_SOURCES

## Ảnh đã dùng trong repository

| File | Nhóm sản phẩm | Nguồn | Tác giả | Ghi chú |
| --- | --- | --- | --- | --- |
| `assets/uploads/1780748480991-a92979af5e-tai-xuong-1.jpg` | Cửa nhôm Xingfa | Ảnh admin đã tải sẵn trong repository | Admin VẸN TOÀN CÀ MAU | Ảnh đã tồn tại trước trong repository; PR này không thêm file ảnh nhị phân mới và không hotlink. |

## Ảnh đính kèm trong nhiệm vụ

Môi trường làm việc chỉ có thể truy cập trực tiếp một ảnh trùng với ảnh đính kèm đang nằm sẵn trong repository: `assets/uploads/1780748480991-a92979af5e-tai-xuong-1.jpg`.
Các ảnh đính kèm còn lại hiển thị trong nội dung yêu cầu nhưng không có đường dẫn file nhị phân trong filesystem, nên chưa thể tải/chuyển đổi/lưu vào repository một cách an toàn.

Đánh giá trực quan từ các ảnh đính kèm và cách xử lý trong PR này:

- Ảnh cửa nhôm/kính có chữ hoặc logo của đơn vị khác: đã loại, không đưa vào seed.
- Ảnh có watermark/tên doanh nghiệp khác: đã loại, không đưa vào seed.
- Ảnh còn lại nhưng không có file nhị phân để xử lý: chưa đưa vào repository; cần admin tải lên thủ công qua trang quản trị hoặc cung cấp file gốc trong repo.
- Không thêm ảnh WebP/JPG/PNG nhị phân mới trong PR này để tránh lỗi “Binary files are not supported” khi tạo PR; bộ seed chỉ tham chiếu ảnh JPG đã tồn tại sẵn.

## Ảnh stock đã sử dụng

Không có ảnh stock Pexels/Unsplash nào được tải về repository trong lần cập nhật này vì các endpoint tải ảnh bị chặn 403 trong môi trường hiện tại. Website vẫn giữ các fallback SVG hiện có và không hotlink ảnh ngoài.

## Nguồn stock đề xuất cần tải thủ công nếu muốn bổ sung ảnh thật

| Nhóm sản phẩm | URL trang nguồn | Tác giả | Ghi chú |
| --- | --- | --- | --- |
| Nhà thép tiền chế | https://unsplash.com/photos/steel-skeleton-of-a-building-under-construction-WOZ7f8lafNQ | Iman Imen | Hình ảnh minh họa; cần tải thủ công, tối ưu WebP/JPG dưới 500 KB trước khi commit. |
| Cửa kính và vách kính | https://unsplash.com/photos/glass-metal-door-Cmx1Tay0gJ8 | Pavel Nekoranec | Hình ảnh minh họa; cần tải thủ công, tối ưu WebP/JPG dưới 500 KB trước khi commit. |
| Lan can – cầu thang | https://unsplash.com/photos/a-staircase-with-a-glass-railing-and-metal-handrail-OUQS4yKF0YU | Martti Salmi | Hình ảnh minh họa; cần tải thủ công, tối ưu WebP/JPG dưới 500 KB trước khi commit. |
| Sắt thép xây dựng | https://unsplash.com/photos/construction-worker-inspects-rebar-on-a-building-site-dSjrv4w1g1Q | Toni Reed | Hình ảnh minh họa; cần tải thủ công, tối ưu WebP/JPG dưới 500 KB trước khi commit. |
