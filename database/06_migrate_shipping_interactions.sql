-- Migration 06: GHN, trả hàng và hỏi đáp sản phẩm.
-- Chạy sau 05_seed_content_catalog.sql trên database clonevocrecord.

USE clonevocrecord;
SET NAMES utf8mb4;

-- Thông tin cần để tạo và đồng bộ đơn GHN.
SET @add_ghn_code = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DonHang' AND COLUMN_NAME = 'MaDonGHN'), 'SELECT 1', 'ALTER TABLE DonHang ADD COLUMN MaDonGHN VARCHAR(50) NULL');
PREPARE add_ghn_code_stmt FROM @add_ghn_code; EXECUTE add_ghn_code_stmt; DEALLOCATE PREPARE add_ghn_code_stmt;
SET @add_ghn_status = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DonHang' AND COLUMN_NAME = 'GHNTrangThai'), 'SELECT 1', 'ALTER TABLE DonHang ADD COLUMN GHNTrangThai VARCHAR(50) NULL');
PREPARE add_ghn_status_stmt FROM @add_ghn_status; EXECUTE add_ghn_status_stmt; DEALLOCATE PREPARE add_ghn_status_stmt;
SET @add_ghn_fee = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DonHang' AND COLUMN_NAME = 'PhiVanChuyen'), 'SELECT 1', 'ALTER TABLE DonHang ADD COLUMN PhiVanChuyen DECIMAL(15,2) DEFAULT 0');
PREPARE add_ghn_fee_stmt FROM @add_ghn_fee; EXECUTE add_ghn_fee_stmt; DEALLOCATE PREPARE add_ghn_fee_stmt;
SET @add_ghn_eta = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DonHang' AND COLUMN_NAME = 'GHNExpectedDelivery'), 'SELECT 1', 'ALTER TABLE DonHang ADD COLUMN GHNExpectedDelivery DATETIME NULL');
PREPARE add_ghn_eta_stmt FROM @add_ghn_eta; EXECUTE add_ghn_eta_stmt; DEALLOCATE PREPARE add_ghn_eta_stmt;
SET @add_ghn_sync = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DonHang' AND COLUMN_NAME = 'GHNLastSync'), 'SELECT 1', 'ALTER TABLE DonHang ADD COLUMN GHNLastSync DATETIME NULL');
PREPARE add_ghn_sync_stmt FROM @add_ghn_sync; EXECUTE add_ghn_sync_stmt; DEALLOCATE PREPARE add_ghn_sync_stmt;
SET @add_ghn_reason = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DonHang' AND COLUMN_NAME = 'GHNReason'), 'SELECT 1', 'ALTER TABLE DonHang ADD COLUMN GHNReason VARCHAR(255) NULL');
PREPARE add_ghn_reason_stmt FROM @add_ghn_reason; EXECUTE add_ghn_reason_stmt; DEALLOCATE PREPARE add_ghn_reason_stmt;
SET @add_ghn_province = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DonHang' AND COLUMN_NAME = 'GHNProvinceName'), 'SELECT 1', 'ALTER TABLE DonHang ADD COLUMN GHNProvinceName VARCHAR(150) NULL');
PREPARE add_ghn_province_stmt FROM @add_ghn_province; EXECUTE add_ghn_province_stmt; DEALLOCATE PREPARE add_ghn_province_stmt;
SET @add_ghn_ward = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DonHang' AND COLUMN_NAME = 'GHNWardName'), 'SELECT 1', 'ALTER TABLE DonHang ADD COLUMN GHNWardName VARCHAR(150) NULL');
PREPARE add_ghn_ward_stmt FROM @add_ghn_ward; EXECUTE add_ghn_ward_stmt; DEALLOCATE PREPARE add_ghn_ward_stmt;
SET @add_ghn_new_address = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DonHang' AND COLUMN_NAME = 'GHNIsNewAddress'), 'SELECT 1', 'ALTER TABLE DonHang ADD COLUMN GHNIsNewAddress BOOLEAN DEFAULT TRUE');
PREPARE add_ghn_new_address_stmt FROM @add_ghn_new_address; EXECUTE add_ghn_new_address_stmt; DEALLOCATE PREPARE add_ghn_new_address_stmt;
SET @add_ghn_weight = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DonHang' AND COLUMN_NAME = 'CanNang'), 'SELECT 1', 'ALTER TABLE DonHang ADD COLUMN CanNang INT DEFAULT 600');
PREPARE add_ghn_weight_stmt FROM @add_ghn_weight; EXECUTE add_ghn_weight_stmt; DEALLOCATE PREPARE add_ghn_weight_stmt;
SET @add_ghn_length = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DonHang' AND COLUMN_NAME = 'ChieuDai'), 'SELECT 1', 'ALTER TABLE DonHang ADD COLUMN ChieuDai INT DEFAULT 25');
PREPARE add_ghn_length_stmt FROM @add_ghn_length; EXECUTE add_ghn_length_stmt; DEALLOCATE PREPARE add_ghn_length_stmt;
SET @add_ghn_width = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DonHang' AND COLUMN_NAME = 'ChieuRong'), 'SELECT 1', 'ALTER TABLE DonHang ADD COLUMN ChieuRong INT DEFAULT 20');
PREPARE add_ghn_width_stmt FROM @add_ghn_width; EXECUTE add_ghn_width_stmt; DEALLOCATE PREPARE add_ghn_width_stmt;
SET @add_ghn_height = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DonHang' AND COLUMN_NAME = 'ChieuCao'), 'SELECT 1', 'ALTER TABLE DonHang ADD COLUMN ChieuCao INT DEFAULT 8');
PREPARE add_ghn_height_stmt FROM @add_ghn_height; EXECUTE add_ghn_height_stmt; DEALLOCATE PREPARE add_ghn_height_stmt;
SET @add_discount_code = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DonHang' AND COLUMN_NAME = 'CodeGiamGia'), 'SELECT 1', 'ALTER TABLE DonHang ADD COLUMN CodeGiamGia VARCHAR(50) NULL AFTER PhuongThucThanhToan');
PREPARE add_discount_code_stmt FROM @add_discount_code; EXECUTE add_discount_code_stmt; DEALLOCATE PREPARE add_discount_code_stmt;
SET @add_discount_amount = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DonHang' AND COLUMN_NAME = 'SoTienGiam'), 'SELECT 1', 'ALTER TABLE DonHang ADD COLUMN SoTienGiam DECIMAL(15,2) DEFAULT 0.00 AFTER CodeGiamGia');
PREPARE add_discount_amount_stmt FROM @add_discount_amount; EXECUTE add_discount_amount_stmt; DEALLOCATE PREPARE add_discount_amount_stmt;
SET @add_refund_info = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DonHang' AND COLUMN_NAME = 'ThongTinHoanTien'), 'SELECT 1', 'ALTER TABLE DonHang ADD COLUMN ThongTinHoanTien TEXT NULL');
PREPARE add_refund_info_stmt FROM @add_refund_info; EXECUTE add_refund_info_stmt; DEALLOCATE PREPARE add_refund_info_stmt;
SET @add_refund_status = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DonHang' AND COLUMN_NAME = 'TrangThaiHoanTien'), 'SELECT 1', "ALTER TABLE DonHang ADD COLUMN TrangThaiHoanTien ENUM('khongapdung', 'choxuly', 'dahoantien') DEFAULT 'khongapdung'");
PREPARE add_refund_status_stmt FROM @add_refund_status; EXECUTE add_refund_status_stmt; DEALLOCATE PREPARE add_refund_status_stmt;

-- Lưu địa chỉ chuẩn GHN cho các đơn mới; DiaChi vẫn giữ địa chỉ chi tiết người dùng nhập.
SET @add_address_province = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SoDiaChi' AND COLUMN_NAME = 'GHNTinh'), 'SELECT 1', 'ALTER TABLE SoDiaChi ADD COLUMN GHNTinh VARCHAR(150) NULL');
PREPARE add_address_province_stmt FROM @add_address_province; EXECUTE add_address_province_stmt; DEALLOCATE PREPARE add_address_province_stmt;
SET @add_address_ward = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SoDiaChi' AND COLUMN_NAME = 'GHNPhuong'), 'SELECT 1', 'ALTER TABLE SoDiaChi ADD COLUMN GHNPhuong VARCHAR(150) NULL');
PREPARE add_address_ward_stmt FROM @add_address_ward; EXECUTE add_address_ward_stmt; DEALLOCATE PREPARE add_address_ward_stmt;
SET @add_address_province_id = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SoDiaChi' AND COLUMN_NAME = 'GHNProvinceId'), 'SELECT 1', 'ALTER TABLE SoDiaChi ADD COLUMN GHNProvinceId INT NULL');
PREPARE add_address_province_id_stmt FROM @add_address_province_id; EXECUTE add_address_province_id_stmt; DEALLOCATE PREPARE add_address_province_id_stmt;
SET @add_address_ward_id = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SoDiaChi' AND COLUMN_NAME = 'GHNWardId'), 'SELECT 1', 'ALTER TABLE SoDiaChi ADD COLUMN GHNWardId INT NULL');
PREPARE add_address_ward_id_stmt FROM @add_address_ward_id; EXECUTE add_address_ward_id_stmt; DEALLOCATE PREPARE add_address_ward_id_stmt;

CREATE TABLE IF NOT EXISTS YeuCauTraHang (
    MaYCT INT AUTO_INCREMENT PRIMARY KEY,
    MaDH INT NOT NULL,
    MaKH INT NOT NULL,
    LyDo ENUM('hang_loi', 'sai_san_pham', 'thieu_hang', 'hu_hong_van_chuyen', 'khac') NOT NULL,
    MoTa TEXT NOT NULL,
    BangChung TEXT NULL,
    TrangThai ENUM('moi', 'dangxuly', 'chapnhan', 'tuchoi', 'danghoan', 'hoantat') DEFAULT 'moi',
    SoTienHoan DECIMAL(15,2) DEFAULT 0,
    TrangThaiHoanTien ENUM('khongapdung', 'choxuly', 'daxuly', 'thatbai') DEFAULT 'khongapdung',
    GhiChuAdmin TEXT NULL,
    DaNhapKho BOOLEAN DEFAULT FALSE,
    NgayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    NgayCapNhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (MaDH) REFERENCES DonHang(MaDH) ON DELETE CASCADE,
    FOREIGN KEY (MaKH) REFERENCES KhachHang(MaKH) ON DELETE CASCADE,
    INDEX idx_return_order (MaDH),
    INDEX idx_return_status (TrangThai)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS YeuCauTraHangChiTiet (
    MaYCT INT NOT NULL,
    MaCTDH INT NOT NULL,
    MaSP INT NOT NULL,
    SoLuong INT NOT NULL,
    PRIMARY KEY (MaYCT, MaCTDH),
    FOREIGN KEY (MaYCT) REFERENCES YeuCauTraHang(MaYCT) ON DELETE CASCADE,
    FOREIGN KEY (MaCTDH) REFERENCES ChiTietDonHang(MaCTDH) ON DELETE CASCADE,
    FOREIGN KEY (MaSP) REFERENCES SanPham(MaSP) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS BinhLuanSanPham (
    MaBL INT AUTO_INCREMENT PRIMARY KEY,
    MaSP INT NOT NULL,
    MaKH INT NULL,
    MaTK INT NULL,
    MaCha INT NULL,
    Loai ENUM('cauhoi', 'phanhoi') DEFAULT 'cauhoi',
    NoiDung TEXT NOT NULL,
    TrangThai ENUM('choxuly', 'daduyet', 'an') DEFAULT 'choxuly',
    NgayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    NgayCapNhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (MaSP) REFERENCES SanPham(MaSP) ON DELETE CASCADE,
    FOREIGN KEY (MaKH) REFERENCES KhachHang(MaKH) ON DELETE SET NULL,
    FOREIGN KEY (MaTK) REFERENCES TaiKhoan(MaTK) ON DELETE SET NULL,
    FOREIGN KEY (MaCha) REFERENCES BinhLuanSanPham(MaBL) ON DELETE CASCADE,
    INDEX idx_comment_product (MaSP, TrangThai),
    INDEX idx_comment_parent (MaCha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
