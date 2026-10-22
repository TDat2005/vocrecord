-- Migration 11: Thu mua & ký gửi đĩa cũ, ví tín dụng cửa hàng.
--  * YeuCauThuMua: khách gửi đĩa cũ cho cửa hàng (bán đứt hoặc ký gửi), đi qua các bước
--    moi -> chonhandia -> dangthamdinh -> chokhachxacnhan -> hoanthanh (hoặc tuchoi / khachtuchoi / dahuy).
--  * ChiTietThuMua: từng đĩa trong yêu cầu, kèm kết quả AI chấm sơ bộ (Gemini đọc ảnh) và kết quả
--    nhân viên thẩm định theo thang Goldmine (M, NM, VG+, VG, G+, G, P). Đĩa được tạo trước khi gửi yêu cầu
--    (MaYC = NULL) để khách xem ngay ước tính của AI.
--  * AnhThuMua: ảnh khách chụp, lưu trong CSDL; truy cập bằng khóa ngẫu nhiên trong đường dẫn.
--  * HopDongKyGui: đĩa ký gửi đang bán; bán được thì tính tiền trả cho người gửi (trừ hoa hồng).
--  * GiaoDichTinDung + KhachHang.SoDuTinDung: ví tín dụng (nhận khi bán đĩa, dùng khi thanh toán đơn).
--  * SanPham.LoaiHang: phân biệt hàng mới và đĩa cũ (mỗi bản đĩa cũ là một sản phẩm, tồn kho 1).
--  * DonHang.SoTienTinDung: phần đơn hàng trả bằng ví tín dụng (TongTien là phần còn phải thu).
-- Chạy sau 10_real_covers.sql. Chạy lại nhiều lần được.

USE clonevocrecord;
SET NAMES utf8mb4;

-- Thêm cột nếu chưa có (MySQL 8.0 không có ADD COLUMN IF NOT EXISTS).
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

CALL voc_add_column('KhachHang', 'SoDuTinDung', 'DECIMAL(15,2) NOT NULL DEFAULT 0');
CALL voc_add_column('SanPham', 'LoaiHang', "ENUM('moi','cu') NOT NULL DEFAULT 'moi'");
CALL voc_add_column('DonHang', 'SoTienTinDung', 'DECIMAL(15,2) NOT NULL DEFAULT 0');
DROP PROCEDURE voc_add_column;

-- Đơn trả toàn bộ bằng ví tín dụng ghi phương thức thanh toán 'tindung'.
ALTER TABLE ThanhToan MODIFY COLUMN HinhThuc ENUM('tiemmat', 'chuyenkhoan', 'cod', 'payos', 'momo', 'vnpay', 'tindung') DEFAULT 'cod';

CREATE TABLE IF NOT EXISTS YeuCauThuMua (
    MaYC INT AUTO_INCREMENT PRIMARY KEY,
    MaKH INT NOT NULL,
    TrangThai ENUM('moi','chonhandia','dangthamdinh','chokhachxacnhan','hoanthanh','khachtuchoi','tuchoi','dahuy') NOT NULL DEFAULT 'moi',
    CachGiao ENUM('mangden','guiship') NOT NULL DEFAULT 'mangden',
    GhiChuKhach TEXT NULL,
    NgayHen DATETIME NULL,
    LoiNhanCuaHang TEXT NULL,
    HinhThuc ENUM('bandut','kygui') NULL,
    NhanTien ENUM('tienmat','chuyenkhoan','tindung') NULL,
    ThongTinNhanTien VARCHAR(255) NULL,
    TongTienThuMua DECIMAL(15,2) NULL,
    DaChiTra BOOLEAN NOT NULL DEFAULT FALSE,
    NgayChiTra DATETIME NULL,
    MaNV INT NULL,
    NgayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    NgayCapNhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_yctm_khach (MaKH, NgayTao),
    INDEX idx_yctm_trangthai (TrangThai, NgayTao),
    FOREIGN KEY (MaKH) REFERENCES KhachHang(MaKH) ON DELETE CASCADE,
    FOREIGN KEY (MaNV) REFERENCES NhanVien(MaNV) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ChiTietThuMua (
    MaCT INT AUTO_INCREMENT PRIMARY KEY,
    MaYC INT NULL,
    MaKH INT NOT NULL,
    TenDia VARCHAR(255) NOT NULL,
    NgheSi VARCHAR(255) NULL,
    DinhDang ENUM('vinyl','cassette') NOT NULL DEFAULT 'vinyl',
    NamPhatHanh INT NULL,
    KhachTuDanhGia VARCHAR(4) NULL,
    -- Kết quả AI chấm sơ bộ
    AiTrangThai ENUM('xong','loi','tat') NOT NULL DEFAULT 'tat',
    AiTinhTrangDia VARCHAR(4) NULL,
    AiTinhTrangBia VARCHAR(4) NULL,
    AiNhanXet TEXT NULL,
    AiDoTinCay DECIMAL(3,2) NULL,
    AiMoHinh VARCHAR(60) NULL,
    MaSPThamChieu INT NULL,
    DoGiongAnh DECIMAL(5,4) NULL,
    GiaThamChieu DECIMAL(15,2) NULL,
    GiaDeXuatThuMua DECIMAL(15,2) NULL,
    GiaDeXuatNiemYet DECIMAL(15,2) NULL,
    -- Kết quả nhân viên thẩm định
    TinhTrangDia VARCHAR(4) NULL,
    TinhTrangBia VARCHAR(4) NULL,
    GhiChuThamDinh TEXT NULL,
    GiaThuMua DECIMAL(15,2) NULL,
    GiaNiemYet DECIMAL(15,2) NULL,
    KetQua ENUM('cho','nhan','loai') NOT NULL DEFAULT 'cho',
    MaSP INT NULL,
    NgayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cttm_yeucau (MaYC),
    INDEX idx_cttm_nhap (MaKH, MaYC),
    FOREIGN KEY (MaYC) REFERENCES YeuCauThuMua(MaYC) ON DELETE CASCADE,
    FOREIGN KEY (MaKH) REFERENCES KhachHang(MaKH) ON DELETE CASCADE,
    FOREIGN KEY (MaSPThamChieu) REFERENCES SanPham(MaSP) ON DELETE SET NULL,
    FOREIGN KEY (MaSP) REFERENCES SanPham(MaSP) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS AnhThuMua (
    MaAnh INT AUTO_INCREMENT PRIMARY KEY,
    MaCT INT NOT NULL,
    KhoaTruyCap CHAR(32) NOT NULL,
    KieuAnh VARCHAR(40) NOT NULL,
    DuLieu MEDIUMBLOB NOT NULL,
    ThuTu TINYINT NOT NULL DEFAULT 0,
    NgayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_anh_ct (MaCT, ThuTu),
    FOREIGN KEY (MaCT) REFERENCES ChiTietThuMua(MaCT) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS HopDongKyGui (
    MaHD INT AUTO_INCREMENT PRIMARY KEY,
    MaCT INT NOT NULL UNIQUE,
    MaKH INT NOT NULL,
    MaSP INT NOT NULL,
    GiaBan DECIMAL(15,2) NOT NULL,
    TyLeHoaHong DECIMAL(5,2) NOT NULL,
    NhanTien ENUM('tienmat','chuyenkhoan','tindung') NOT NULL,
    ThongTinNhanTien VARCHAR(255) NULL,
    TrangThai ENUM('dangban','daban','dathanhtoan','datra') NOT NULL DEFAULT 'dangban',
    MaDH INT NULL,
    GiaBanThucTe DECIMAL(15,2) NULL,
    SoTienTra DECIMAL(15,2) NULL,
    NgayBatDau TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    NgayHetHan DATETIME NOT NULL,
    NgayBan DATETIME NULL,
    NgayThanhToan DATETIME NULL,
    INDEX idx_hdkg_khach (MaKH, TrangThai),
    INDEX idx_hdkg_sp (MaSP, TrangThai),
    FOREIGN KEY (MaCT) REFERENCES ChiTietThuMua(MaCT) ON DELETE CASCADE,
    FOREIGN KEY (MaKH) REFERENCES KhachHang(MaKH) ON DELETE CASCADE,
    FOREIGN KEY (MaSP) REFERENCES SanPham(MaSP) ON DELETE RESTRICT,
    FOREIGN KEY (MaDH) REFERENCES DonHang(MaDH) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS GiaoDichTinDung (
    MaGD INT AUTO_INCREMENT PRIMARY KEY,
    MaKH INT NOT NULL,
    SoTien DECIMAL(15,2) NOT NULL,
    SoDuSau DECIMAL(15,2) NOT NULL,
    Loai ENUM('thumua','kygui','thanhtoan','hoantra','dieuchinh') NOT NULL,
    MaYC INT NULL,
    MaHD INT NULL,
    MaDH INT NULL,
    GhiChu VARCHAR(255) NULL,
    NgayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_gdtd_khach (MaKH, NgayTao),
    FOREIGN KEY (MaKH) REFERENCES KhachHang(MaKH) ON DELETE CASCADE,
    FOREIGN KEY (MaYC) REFERENCES YeuCauThuMua(MaYC) ON DELETE SET NULL,
    FOREIGN KEY (MaHD) REFERENCES HopDongKyGui(MaHD) ON DELETE SET NULL,
    FOREIGN KEY (MaDH) REFERENCES DonHang(MaDH) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
