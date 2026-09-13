-- Migration 07: chat trực tiếp và các index phục vụ truy vấn thường dùng.
-- Migration này đồng thời chuẩn hóa metadata sản phẩm và bổ sung catalog đa dạng.
-- Chạy sau 06_migrate_shipping_interactions.sql.

USE clonevocrecord;
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS ChatConversation (
    MaCuocChat INT AUTO_INCREMENT PRIMARY KEY,
    MaKH INT NOT NULL,
    MaSP INT NULL,
    MaDH INT NULL,
    ChuDe VARCHAR(200) NULL,
    TrangThai ENUM('mo', 'dong') NOT NULL DEFAULT 'mo',
    TinNhanCuoi DATETIME NULL,
    NgayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    NgayCapNhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (MaKH) REFERENCES KhachHang(MaKH) ON DELETE CASCADE,
    FOREIGN KEY (MaSP) REFERENCES SanPham(MaSP) ON DELETE SET NULL,
    FOREIGN KEY (MaDH) REFERENCES DonHang(MaDH) ON DELETE SET NULL,
    INDEX idx_chat_customer_status (MaKH, TrangThai, TinNhanCuoi),
    INDEX idx_chat_last_message (TinNhanCuoi)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ChatMessage (
    MaTinNhan INT AUTO_INCREMENT PRIMARY KEY,
    MaCuocChat INT NOT NULL,
    MaTK INT NOT NULL,
    VaiTroNguoiGui ENUM('khachhang', 'nhanvien', 'admin') NOT NULL,
    NoiDung TEXT NOT NULL,
    DaDoc BOOLEAN NOT NULL DEFAULT FALSE,
    NgayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (MaCuocChat) REFERENCES ChatConversation(MaCuocChat) ON DELETE CASCADE,
    FOREIGN KEY (MaTK) REFERENCES TaiKhoan(MaTK) ON DELETE CASCADE,
    INDEX idx_chat_message_conversation (MaCuocChat, MaTinNhan, NgayTao),
    INDEX idx_chat_message_unread (MaCuocChat, DaDoc, MaTK)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Các index được thêm theo kiểu idempotent để migration có thể chạy lại.
SET @idx = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DonHang' AND INDEX_NAME = 'idx_donhang_customer_date'), 'SELECT 1', 'ALTER TABLE DonHang ADD INDEX idx_donhang_customer_date (MaKH, NgayDat)');
PREPARE stmt FROM @idx; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DonHang' AND INDEX_NAME = 'idx_donhang_status_date'), 'SELECT 1', 'ALTER TABLE DonHang ADD INDEX idx_donhang_status_date (TrangThai, NgayDat)');
PREPARE stmt FROM @idx; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DonHang' AND INDEX_NAME = 'idx_donhang_ghn_code'), 'SELECT 1', 'ALTER TABLE DonHang ADD INDEX idx_donhang_ghn_code (MaDonGHN)');
PREPARE stmt FROM @idx; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ChiTietDonHang' AND INDEX_NAME = 'idx_ctdh_order'), 'SELECT 1', 'ALTER TABLE ChiTietDonHang ADD INDEX idx_ctdh_order (MaDH)');
PREPARE stmt FROM @idx; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ThanhToan' AND INDEX_NAME = 'idx_thanhtoan_transaction'), 'SELECT 1', 'ALTER TABLE ThanhToan ADD INDEX idx_thanhtoan_transaction (MaGiaoDich)');
PREPARE stmt FROM @idx; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'BaiViet' AND INDEX_NAME = 'idx_baiviet_listing'), 'SELECT 1', 'ALTER TABLE BaiViet ADD INDEX idx_baiviet_listing (LoaiBV, TrangThai, NgayTao)');
PREPARE stmt FROM @idx; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'YeuThich' AND INDEX_NAME = 'idx_yeuthich_customer_product'), 'SELECT 1', 'ALTER TABLE YeuThich ADD INDEX idx_yeuthich_customer_product (MaKH, MaSP)');
PREPARE stmt FROM @idx; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Metadata sản phẩm: tách thể loại nhạc khỏi nhóm hàng và bỏ tracklist mẫu.
SET @add_music_genre = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SanPham' AND COLUMN_NAME = 'TheLoaiNhac'), 'SELECT 1', 'ALTER TABLE SanPham ADD COLUMN TheLoaiNhac VARCHAR(100) NULL AFTER TheLoai');
PREPARE stmt FROM @add_music_genre; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @add_format = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SanPham' AND COLUMN_NAME = 'DinhDang'), 'SELECT 1', 'ALTER TABLE SanPham ADD COLUMN DinhDang VARCHAR(100) NULL AFTER HinhAnh');
PREPARE stmt FROM @add_format; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @add_condition = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SanPham' AND COLUMN_NAME = 'TinhTrangDia'), 'SELECT 1', 'ALTER TABLE SanPham ADD COLUMN TinhTrangDia VARCHAR(100) NULL AFTER DinhDang');
PREPARE stmt FROM @add_condition; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @add_package = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SanPham' AND COLUMN_NAME = 'QuyCach'), 'SELECT 1', 'ALTER TABLE SanPham ADD COLUMN QuyCach VARCHAR(100) NULL AFTER TinhTrangDia');
PREPARE stmt FROM @add_package; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @add_tracklist = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SanPham' AND COLUMN_NAME = 'Tracklist'), 'SELECT 1', 'ALTER TABLE SanPham ADD COLUMN Tracklist TEXT NULL AFTER QuyCach');
PREPARE stmt FROM @add_tracklist; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE SanPham
SET
    TheLoaiNhac = CASE
        WHEN TenSP IN ('Random Access Memories', 'Discovery', 'Homogenic') THEN 'ELECTRONIC'
        WHEN TenSP = 'Currents' THEN 'PSYCHEDELIC POP'
        WHEN TenSP = 'Abbey Road' THEN 'CLASSIC ROCK'
        WHEN TenSP = 'The Dark Side of the Moon' THEN 'PROGRESSIVE ROCK'
        WHEN TenSP = 'Rumours' THEN 'SOFT ROCK'
        WHEN TenSP = 'OK Computer' THEN 'ALTERNATIVE ROCK'
        WHEN TenSP = 'Nevermind (Cassette)' THEN 'GRUNGE'
        WHEN TenSP IN ('Kind of Blue', 'Blue Train', 'A Love Supreme') THEN 'JAZZ'
        WHEN TenSP = 'Getz / Gilberto' THEN 'BOSSA NOVA'
        WHEN TenSP IN ('Thriller', '1989 (Cassette)', 'Future Nostalgia') THEN 'POP'
        WHEN TenSP = 'After Hours (Cassette)' THEN 'SYNTH-POP'
        WHEN TenSP = 'Back to Black' THEN 'SOUL'
        WHEN TenSP = 'Unreal Unearth' THEN 'ALTERNATIVE'
        WHEN TenSP = 'What''s Going On' THEN 'FUNK / SOUL'
        WHEN TenSP IN ('The Miseducation of Lauryn Hill', 'To Pimp a Butterfly') THEN 'HIP HOP'
        WHEN TenSP = 'Demon Days (Cassette)' THEN 'ALTERNATIVE HIP HOP'
        WHEN TenSP = 'Dummy' THEN 'TRIP HOP'
        WHEN TenSP = 'Plastic Love' THEN 'CITY POP'
        WHEN TenSP = 'Folklore' THEN 'INDIE FOLK'
        WHEN TenSP = 'Blue' THEN 'FOLK'
        ELSE TheLoaiNhac
    END,
    DinhDang = COALESCE(DinhDang, CASE
        WHEN TheLoai = 'Đĩa Than (Vinyl)' THEN 'Vinyl 12" LP'
        WHEN TheLoai = 'Cassette' THEN 'Cassette'
        WHEN TheLoai = 'Máy Quay Đĩa (Turntable)' THEN 'Turntable'
        WHEN TheLoai = 'Phụ Kiện' THEN 'Phụ kiện'
        ELSE 'Đang cập nhật'
    END),
    TinhTrangDia = COALESCE(TinhTrangDia, CASE
        WHEN TheLoai IN ('Đĩa Than (Vinyl)', 'Cassette') THEN 'Brand New (SS)'
        WHEN TheLoai = 'Máy Quay Đĩa (Turntable)' THEN 'Brand New'
        ELSE 'Mới'
    END),
    QuyCach = COALESCE(QuyCach, CASE
        WHEN TheLoai IN ('Đĩa Than (Vinyl)', 'Cassette') THEN '1 x Album'
        WHEN TheLoai = 'Máy Quay Đĩa (Turntable)' THEN '1 x Thiết bị'
        WHEN TheLoai = 'Phụ Kiện' THEN '1 x Sản phẩm'
        ELSE 'Đang cập nhật'
    END)
WHERE DinhDang IS NULL OR TinhTrangDia IS NULL OR QuyCach IS NULL OR TheLoaiNhac IS NULL;

-- Bổ sung album ở nhiều nhóm nhạc; ảnh hiện dùng ảnh catalog demo và có thể thay trong Admin.
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, TheLoaiNhac, GiaBan, SoLuongTon, MoTa, HinhAnh, DinhDang, TinhTrangDia, QuyCach, TinhTrang, MaDM, NamPhatHanh)
SELECT 'To Pimp a Butterfly', 'Kendrick Lamar', 'Đĩa Than (Vinyl)', 'HIP HOP', 999000, 5, 'Hip hop giàu lớp lang, phù hợp người nghe muốn khám phá một album có chiều sâu.', '/images/products/vinyl-04.webp', 'Vinyl 12" 2LP', 'Brand New (SS)', '1 x Album', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Đĩa Than (Vinyl)' LIMIT 1), 2015 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'To Pimp a Butterfly');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, TheLoaiNhac, GiaBan, SoLuongTon, MoTa, HinhAnh, DinhDang, TinhTrangDia, QuyCach, TinhTrang, MaDM, NamPhatHanh)
SELECT 'What''s Going On', 'Marvin Gaye', 'Đĩa Than (Vinyl)', 'FUNK / SOUL', 899000, 5, 'Soul giàu cảm xúc với phần phối khí ấm và thông điệp xã hội nổi bật.', '/images/products/vinyl-01.webp', 'Vinyl 12" LP', 'Brand New (SS)', '1 x Album', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Đĩa Than (Vinyl)' LIMIT 1), 1971 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'What''s Going On');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, TheLoaiNhac, GiaBan, SoLuongTon, MoTa, HinhAnh, DinhDang, TinhTrangDia, QuyCach, TinhTrang, MaDM, NamPhatHanh)
SELECT 'Bitches Brew', 'Miles Davis', 'Đĩa Than (Vinyl)', 'JAZZ', 1099000, 4, 'Jazz fusion tiên phong với âm thanh dày và giàu năng lượng.', '/images/products/vinyl-02.webp', 'Vinyl 12" 2LP', 'Brand New (SS)', '1 x Album', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Đĩa Than (Vinyl)' LIMIT 1), 1970 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'Bitches Brew');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, TheLoaiNhac, GiaBan, SoLuongTon, MoTa, HinhAnh, DinhDang, TinhTrangDia, QuyCach, TinhTrang, MaDM, NamPhatHanh)
SELECT 'Buena Vista Social Club', 'Buena Vista Social Club', 'Đĩa Than (Vinyl)', 'LATIN', 949000, 4, 'Âm nhạc Cuba mộc mạc, giàu nhịp điệu và phù hợp nghe thư giãn.', '/images/products/vinyl-03.webp', 'Vinyl 12" LP', 'Brand New (SS)', '1 x Album', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Đĩa Than (Vinyl)' LIMIT 1), 1997 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'Buena Vista Social Club');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, TheLoaiNhac, GiaBan, SoLuongTon, MoTa, HinhAnh, DinhDang, TinhTrangDia, QuyCach, TinhTrang, MaDM, NamPhatHanh)
SELECT 'Dummy', 'Portishead', 'Đĩa Than (Vinyl)', 'TRIP HOP', 899000, 4, 'Trip hop tối màu, nhiều texture và phù hợp những buổi nghe đêm.', '/images/products/vinyl-04.webp', 'Vinyl 12" LP', 'Brand New (SS)', '1 x Album', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Đĩa Than (Vinyl)' LIMIT 1), 1994 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'Dummy');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, TheLoaiNhac, GiaBan, SoLuongTon, MoTa, HinhAnh, DinhDang, TinhTrangDia, QuyCach, TinhTrang, MaDM, NamPhatHanh)
SELECT 'Blue', 'Joni Mitchell', 'Đĩa Than (Vinyl)', 'FOLK', 899000, 4, 'Folk songwriter kinh điển với phần trình bày gần gũi và giàu chi tiết.', '/images/products/vinyl-01.webp', 'Vinyl 12" LP', 'Brand New (SS)', '1 x Album', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Đĩa Than (Vinyl)' LIMIT 1), 1971 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'Blue');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, TheLoaiNhac, GiaBan, SoLuongTon, MoTa, HinhAnh, DinhDang, TinhTrangDia, QuyCach, TinhTrang, MaDM, NamPhatHanh)
SELECT 'Spirited Away Original Soundtrack', 'Joe Hisaishi', 'Đĩa Than (Vinyl)', 'STAGE & SCREEN', 1199000, 3, 'Nhạc phim giàu không khí điện ảnh, phù hợp người sưu tầm soundtrack.', '/images/products/vinyl-02.webp', 'Vinyl 12" 2LP', 'Brand New (SS)', '1 x Album', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Đĩa Than (Vinyl)' LIMIT 1), 2001 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'Spirited Away Original Soundtrack');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, TheLoaiNhac, GiaBan, SoLuongTon, MoTa, HinhAnh, DinhDang, TinhTrangDia, QuyCach, TinhTrang, MaDM, NamPhatHanh)
SELECT 'Homogenic', 'Björk', 'Đĩa Than (Vinyl)', 'ELECTRONIC', 999000, 3, 'Electronic art-pop với thiết kế âm thanh độc đáo và giàu thử nghiệm.', '/images/products/vinyl-03.webp', 'Vinyl 12" LP', 'Brand New (SS)', '1 x Album', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Đĩa Than (Vinyl)' LIMIT 1), 1997 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'Homogenic');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, TheLoaiNhac, GiaBan, SoLuongTon, MoTa, HinhAnh, DinhDang, TinhTrangDia, QuyCach, TinhTrang, MaDM, NamPhatHanh)
SELECT 'Future Nostalgia', 'Dua Lipa', 'Đĩa Than (Vinyl)', 'POP', 899000, 5, 'Pop hiện đại với nhịp disco bắt tai và bản phối sáng rõ.', '/images/products/vinyl-04.webp', 'Vinyl 12" LP', 'Brand New (SS)', '1 x Album', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Đĩa Than (Vinyl)' LIMIT 1), 2020 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'Future Nostalgia');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, TheLoaiNhac, GiaBan, SoLuongTon, MoTa, HinhAnh, DinhDang, TinhTrangDia, QuyCach, TinhTrang, MaDM, NamPhatHanh)
SELECT 'Elis & Tom', 'Elis Regina & Antônio Carlos Jobim', 'Đĩa Than (Vinyl)', 'BOSSA NOVA', 949000, 3, 'Bossa nova tinh tế, nhẹ nhàng và phù hợp không gian nghe tại nhà.', '/images/products/vinyl-01.webp', 'Vinyl 12" LP', 'Brand New (SS)', '1 x Album', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Đĩa Than (Vinyl)' LIMIT 1), 1974 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'Elis & Tom');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, TheLoaiNhac, GiaBan, SoLuongTon, MoTa, HinhAnh, DinhDang, TinhTrangDia, QuyCach, TinhTrang, MaDM, NamPhatHanh)
SELECT '3', 'Ngọt', 'Đĩa Than (Vinyl)', 'VIỆT NAM', 599000, 5, 'Album Việt Nam hiện đại dành cho người muốn mở rộng bộ sưu tập trong nước.', '/images/products/vinyl-02.webp', 'Vinyl 12" LP', 'Brand New (SS)', '1 x Album', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Đĩa Than (Vinyl)' LIMIT 1), 2019 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = '3');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, TheLoaiNhac, GiaBan, SoLuongTon, MoTa, HinhAnh, DinhDang, TinhTrangDia, QuyCach, TinhTrang, MaDM, NamPhatHanh)
SELECT 'An Evening with Silk Sonic', 'Silk Sonic', 'Cassette', 'R&B', 449000, 5, 'R&B hiện đại trên định dạng cassette sưu tầm.', '/images/products/cassette-01.webp', 'Cassette', 'Brand New (SS)', '1 x Album', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Cassette' LIMIT 1), 2021 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'An Evening with Silk Sonic');
