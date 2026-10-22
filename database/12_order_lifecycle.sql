-- Migration 12: chuẩn hóa vòng đời đơn hàng.
--  * DonHang.NgayHoanThanh: ngày giao thành công. Hạn đổi trả và doanh thu tính theo ngày này
--    (trước đây tính theo ngày đặt: đơn giao chậm bị mất quyền đổi trả, doanh thu cộng nhầm vào ngày đặt).
--  * ThanhToan.DuLieuThanhToan: link + mã QR PayOS đã tạo, để khách bấm "Thanh toán sau" vẫn mở lại được.
-- Chạy sau 11_trade_in.sql. Chạy lại nhiều lần được.

USE clonevocrecord;
SET NAMES utf8mb4;

DROP PROCEDURE IF EXISTS voc_add_column;
DELIMITER //
CREATE PROCEDURE voc_add_column(IN tbl VARCHAR(64), IN col VARCHAR(64), IN definition VARCHAR(500))
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col) THEN
        SET @ddl = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `', col, '` ', definition);
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //
DELIMITER ;

CALL voc_add_column('DonHang', 'NgayHoanThanh', 'DATETIME NULL');
CALL voc_add_column('ThanhToan', 'DuLieuThanhToan', 'TEXT NULL');
DROP PROCEDURE voc_add_column;

-- Đơn đã hoàn thành từ trước: lấy ngày thanh toán COD (lúc giao xong) nếu có, không thì ngày đặt.
UPDATE DonHang dh
LEFT JOIN ThanhToan tt ON tt.MaDH = dh.MaDH
SET dh.NgayHoanThanh = COALESCE(tt.NgayTT, dh.NgayDat)
WHERE dh.TrangThai = 'hoanthanh' AND dh.NgayHoanThanh IS NULL;
