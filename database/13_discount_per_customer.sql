-- Migration 13: giới hạn số lần mỗi khách dùng một mã giảm giá.
--  * MaGiamGia.GioiHanMoiKhach: số đơn (không tính đơn đã hủy) một khách được dùng mã này. Mặc định 1 như
--    các web bán hàng thông thường; 0 = không giới hạn. Trước đây một khách dùng WELCOME10 bao nhiêu lần cũng được.
-- Chạy sau 12_order_lifecycle.sql. Chạy lại nhiều lần được.

USE clonevocrecord;
SET NAMES utf8mb4;

SET @add_limit = IF(
    EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'MaGiamGia' AND COLUMN_NAME = 'GioiHanMoiKhach'),
    'SELECT 1',
    'ALTER TABLE MaGiamGia ADD COLUMN GioiHanMoiKhach INT NOT NULL DEFAULT 1'
);
PREPARE add_limit_stmt FROM @add_limit;
EXECUTE add_limit_stmt;
DEALLOCATE PREPARE add_limit_stmt;
