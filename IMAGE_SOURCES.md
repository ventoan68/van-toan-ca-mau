# Nguồn hình ảnh

Website hiện giữ SVG fallback trong `assets/images/stock/` và `assets/images/placeholders/` để tránh dùng ảnh không rõ giấy phép hoặc hotlink ảnh ngoài. Khi chưa có ảnh công trình thật của VẸN TOÀN CÀ MAU, toàn bộ ảnh stock/fallback phải được ghi là **“Hình ảnh minh họa”**.

## Nguồn hợp lệ đã tra cứu

Các nguồn dưới đây phù hợp để quản trị viên tải ảnh minh họa hợp lệ rồi upload qua dashboard production vào `assets/uploads/` của GitHub:

| Nguồn | URL | Gợi ý dùng | Ghi chú hiển thị |
|---|---|---|---|
| Unsplash | https://unsplash.com/s/photos/aluminum-windows | Cửa nhôm, vách kính, facade | Hình ảnh minh họa |
| Unsplash | https://unsplash.com/s/photos/glass-doors | Cửa kính, cửa trượt, nội thất kính | Hình ảnh minh họa |
| Unsplash | https://unsplash.com/s/photos/glass-window | Cửa sổ kính, mặt dựng kính | Hình ảnh minh họa |
| Pexels | https://www.pexels.com/search/glass%20aluminum%20door/ | Cửa nhôm kính, showroom, vách kính | Hình ảnh minh họa |
| Pexels | https://www.pexels.com/photo/glass-window-with-metal-frame-97510/ | Khung kim loại và kính | Hình ảnh minh họa |
| Pexels | https://www.pexels.com/photo/aluminum-framed-glass-door-in-a-greenhouse-14455528/ | Cửa kính khung nhôm | Hình ảnh minh họa |
| Pexels | https://www.pexels.com/photo/aluminum-and-glass-facade-system-of-building-9901861/ | Mặt dựng nhôm kính | Hình ảnh minh họa |

## Quy tắc dùng ảnh

- Không dùng ảnh từ Google Images, Facebook, Pinterest hoặc nguồn không rõ giấy phép.
- Không hotlink ảnh ngoài trong production; hãy tải ảnh hợp lệ rồi upload qua admin để lưu vào `assets/uploads/` của GitHub.
- Không ghi “công trình thực tế” nếu ảnh không phải công trình thật do khách hàng/người dùng cung cấp.
- Ảnh người dùng cung cấp nên được tối ưu về dung lượng trước khi upload.
- API production chỉ nhận JPG/JPEG, PNG, WebP và giới hạn 1 MB/ảnh.
