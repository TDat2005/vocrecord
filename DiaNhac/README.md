# Vọc Records — Frontend

Giao diện React (JavaScript/JSX) + Vite, phong cách đơn giản theo Shopify.

## Chạy thử

```bash
npm install
npm run dev     # http://localhost:5173, /api và /socket.io được chuyển sang http://localhost:3000
npm run build   # xuất ra thư mục dist/ (Nginx phục vụ thư mục này)
```

## Cấu trúc

- `src/app/pages/` — các trang (Home, Shop, ProductDetail, Cart, Checkout, Account, Admin...)
- `src/app/components/` — thành phần dùng chung; `components/admin/` là các mục của trang quản trị
- `src/app/context/` — giỏ hàng (lưu localStorage), yêu thích (lấy từ server), thông báo (toast)
- `src/app/utils/api.js` — hàm gọi API dùng chung (tự gắn token, Content-Type)
- `src/styles/theme.css` — biến màu, cỡ chữ, bo góc; `shared.css` — nút, form, thẻ, bảng, modal
