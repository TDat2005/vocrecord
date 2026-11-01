-- Migration 14: các thay đổi CSDL đi kèm đợt sửa lỗi sau review code.
--  * TaiKhoan.NgayDoiMatKhau: thời điểm đổi mật khẩu gần nhất. Vé đăng nhập cấp trước thời điểm này bị từ chối,
--    nên đổi/khôi phục mật khẩu sẽ đăng xuất các phiên cũ (trước đây vé cũ vẫn dùng được tới khi hết hạn 1 ngày).
--  * YeuThich: mỗi khách chỉ lưu một sản phẩm một lần (UNIQUE). Trước đây bấm nhanh 2 lần tạo ra 2 dòng.
--  * MaGiamGia.NgayHetHan: mã tạo từ ô chọn ngày bị lưu thành 00:00 UTC (7 giờ sáng ngày đó theo giờ Việt Nam),
--    nên hết hạn sớm gần một ngày. Đổi thành 23:59:59 ngày đó theo giờ Việt Nam (16:59:59 UTC).
--  * AnhTraHang: ảnh bằng chứng khách tải lên khi gửi yêu cầu trả hàng.
-- Chạy sau 13_discount_per_customer.sql. Chạy lại nhiều lần được.

USE clonevocrecord;
SET NAMES utf8mb4;

SET @add_pwd = IF(
    EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'TaiKhoan' AND COLUMN_NAME = 'NgayDoiMatKhau'),
    'SELECT 1',
    'ALTER TABLE TaiKhoan ADD COLUMN NgayDoiMatKhau DATETIME NULL'
);
PREPARE add_pwd_stmt FROM @add_pwd;
EXECUTE add_pwd_stmt;
DEALLOCATE PREPARE add_pwd_stmt;

-- Xóa dòng yêu thích trùng (giữ dòng cũ nhất) rồi thêm ràng buộc UNIQUE.
DELETE yt FROM YeuThich yt
JOIN YeuThich keep ON keep.MaKH = yt.MaKH AND keep.MaSP = yt.MaSP AND keep.MaYT < yt.MaYT;

SET @add_unique = IF(
    EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'YeuThich' AND INDEX_NAME = 'uq_yeuthich_customer_product'),
    'SELECT 1',
    'ALTER TABLE YeuThich ADD UNIQUE KEY uq_yeuthich_customer_product (MaKH, MaSP)'
);
PREPARE add_unique_stmt FROM @add_unique;
EXECUTE add_unique_stmt;
DEALLOCATE PREPARE add_unique_stmt;

-- Mã hết hạn lúc 00:00:00 UTC là mã chọn từ ô ngày: chuyển sang cuối ngày đó theo giờ Việt Nam.
UPDATE MaGiamGia
SET NgayHetHan = NgayHetHan + INTERVAL 16 HOUR + INTERVAL 59 MINUTE + INTERVAL 59 SECOND
WHERE NgayHetHan IS NOT NULL AND TIME(NgayHetHan) = '00:00:00';

-- Ảnh bằng chứng khách gửi kèm yêu cầu trả hàng (trước đây chỉ nhập được một đường link).
-- Giống AnhThuMua: ảnh lưu trong CSDL, xem qua đường dẫn có khóa ngẫu nhiên (thẻ <img> không gửi kèm token).
CREATE TABLE IF NOT EXISTS AnhTraHang (
    MaAnh INT AUTO_INCREMENT PRIMARY KEY,
    MaYCT INT NOT NULL,
    KhoaTruyCap CHAR(32) NOT NULL,
    KieuAnh VARCHAR(40) NOT NULL,
    DuLieu MEDIUMBLOB NOT NULL,
    ThuTu TINYINT NOT NULL DEFAULT 0,
    NgayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_anh_yct (MaYCT, ThuTu),
    FOREIGN KEY (MaYCT) REFERENCES YeuCauTraHang(MaYCT) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
