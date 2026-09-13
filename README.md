# Vọc Records

Website bán đĩa than, cassette, mâm đĩa và phụ kiện.

## Kiến trúc

- Frontend: React + Vite trong `DiaNhac/`.
- Backend: Node.js + Express trong `server/`, API tại `/api`.
- Database: MySQL 8 trong Docker.
- Ảnh sản phẩm: JPG local trong `DiaNhac/public/images/products/catalog/`; đường dẫn được lưu trong cột `HinhAnh`.
- Nội dung Blog/Hướng dẫn dùng chung bảng `BaiViet`, nhưng được tách rõ theo `LoaiBV`.

## Chạy ứng dụng

```bash
docker compose up -d --build
```

Mở <http://localhost:8080>.

Nếu cổng `8080` đang được project cũ sử dụng, chạy bản copy bằng file override:

```bash
docker compose -f docker-compose.copy.yml up -d --build
```

Mở bản copy tại <http://localhost:8081>.

Nếu cần build frontend thủ công:

```bash
cd DiaNhac
npm install
npm run build
```

Nếu chạy Vite ở `http://localhost:5173`, dùng thêm override dev để Vite proxy API và WebSocket vào backend:

```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
cd DiaNhac
npm run dev
```

Khi chạy bản build qua Nginx, chỉ cần `docker compose up -d --build`; API không cần mở cổng `3000` ra máy host.

Frontend hiện dùng bộ ảnh catalog local trong `DiaNhac/public/images/products/catalog/`.
Sau khi build, Vite sẽ copy bộ ảnh này sang `DiaNhac/dist/images/products/catalog/`.

## Dữ liệu mẫu và migration

`database/05_seed_content_catalog.sql` bổ sung:

- 31 sản phẩm thật phổ biến theo nhóm vinyl, cassette, turntable và phụ kiện.
- 8 bài Blog/Hướng dẫn có nội dung nghiệp vụ, chuyên mục và độ khó.
- Metadata tóm tắt/thời lượng; riêng Hướng dẫn có đối tượng, dụng cụ và các bước thực hiện.
- 3 mã giảm giá mẫu.
- Bảng sổ địa chỉ, metadata bài viết và nhật ký hoạt động còn thiếu.
- Ảnh local nhẹ hơn thay cho URL ảnh cũ.

Với database đã có volume, chạy migration một lần:

```bash
docker compose exec -T db mysql -uroot -proot clonevocrecord < database/05_seed_content_catalog.sql
```

Trên Windows PowerShell, dùng lệnh pipe tương đương:

```powershell
Get-Content .\database\05_seed_content_catalog.sql -Raw |
  docker compose exec -T db mysql -uroot -proot clonevocrecord
```

Migration này đồng thời cập nhật UTF-8 và đường dẫn ảnh local cho các sản phẩm đã tồn tại.

Trong Admin, nhân viên có thể lọc Blog/Hướng dẫn theo trạng thái, tạo bản nháp, sửa, xuất bản hoặc xóa. Nội dung bản nháp không xuất hiện ở trang công khai.

Với database mới, Docker sẽ chạy các file trong `database/` theo thứ tự tên.

### GHN, trả hàng và hỏi đáp

Chạy thêm migration:

```powershell
Get-Content .\database\06_migrate_shipping_interactions.sql -Raw |
  docker compose exec -T db mysql -uroot -proot clonevocrecord
```

Điền `GHN_TOKEN`, `GHN_SHOP_ID` và địa chỉ kho trong `server/.env`. Mặc định hệ thống dùng GHN staging; chỉ đổi `GHN_ENV=production` sau khi đã test. Checkout dùng địa chỉ tỉnh/thành và phường/xã theo catalogue mới của GHN. GHN webhook cần trỏ về:

```text
https://<domain-cua-ban>/api/shipping/webhook/ghn
```

Khách có thể tạo yêu cầu trả hàng trong chi tiết đơn đã giao. Admin xử lý tại `TRẢ HÀNG / KHIẾU NẠI`; chỉ khi chuyển sang `Hoàn tất` hệ thống mới cộng lại tồn kho. Phần `HỎI ĐÁP SẢN PHẨM` là luồng hỏi đáp theo từng sản phẩm, có duyệt và phản hồi từ admin.

Lưu ý: luồng hiện lưu trạng thái hoàn tiền và không tự gọi hoàn tiền PayOS; admin chỉ chuyển `Hoàn tất` sau khi đã xử lý khoản hoàn theo phương thức thanh toán thực tế.

### Metadata sản phẩm và catalog đa dạng

Migration 07 cũng bổ sung các trường để thông tin trên trang chi tiết phản ánh đúng từng phiên bản sản phẩm:

- `Nhóm sản phẩm`: Đĩa Than, Cassette, Turntable hoặc Phụ kiện.
- `Thể loại nhạc`: Rock, Jazz, Pop, Electronic, Hip hop, Việt Nam và các thể loại mở rộng khác.
- `Định dạng / phiên bản`, `Tình trạng bìa / đĩa`, `Quy cách` và `Tracklist`.
- Thêm album mẫu ở nhiều thể loại để việc lọc và trình diễn catalog đa dạng hơn.

Chạy migration 07 một lần với database đã có volume:

```powershell
Get-Content .\database\07_migrate_chat_and_indexes.sql -Raw |
  docker compose exec -T db mysql -uroot -proot clonevocrecord
```

Nếu terminal hiện dạng `C:\Users\...>` như Command Prompt (không phải PowerShell), dùng lệnh này để giữ nguyên UTF-8:

```cmd
docker compose exec -T db mysql --default-character-set=utf8mb4 -uroot -proot clonevocrecord < database\07_migrate_chat_and_indexes.sql
```

Sau đó vào Admin → `KHO HÀNG` → nút sửa sản phẩm. Tracklist nhập mỗi bài một dòng; chỉ nhập sau khi đối soát đúng phiên bản phát hành. Nếu chưa xác minh, trang chi tiết sẽ hiển thị trạng thái đang cập nhật thay vì dữ liệu mẫu.

Các album bổ sung hiện dùng ảnh catalog demo local để không phụ thuộc ảnh từ web. Khi có ảnh chính thức có bản quyền, thay đường dẫn ảnh ngay trong form sửa sản phẩm.

### Chat với Vọc Records

Migration 07 ở trên cũng tạo phần chat và các index tối ưu.

Khách đăng nhập rồi mở `/chat` để nhắn với Vọc Records. Tin nhắn được lưu trong MySQL; trình duyệt ưu tiên WebSocket và tự chuyển sang REST nếu mất kết nối. Nhân viên hoặc admin trả lời tại mục `CHAT KHÁCH HÀNG` trong trang quản trị.

API chỉ nên mở trong network nội bộ Docker; người dùng truy cập qua Nginx ở cổng `8080`. Trước khi chạy production cần đổi `JWT_SECRET`, khai báo `CORS_ORIGINS`, dùng tài khoản MySQL riêng cho ứng dụng và chạy kiểm thử tải.

## Tài khoản demo

- Khách hàng: `demo@vocrecord.local` / `Demo@12345`
- Quản trị: `admin@vocrecord.local` / `Admin@12345`

## Lưu ý

- Ảnh dùng cho demo là ảnh category đã tải về local, không phải ảnh bìa chính thức của từng album.
- Khi đưa lên production, nên thay bằng ảnh sản phẩm có bản quyền/nguồn chính thức và dùng object storage nếu số lượng ảnh tăng nhiều.
- Không commit `.env`, mật khẩu, khóa email hoặc khóa thanh toán.
