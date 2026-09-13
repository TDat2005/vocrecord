-- Seed nội dung thật dùng cho môi trường demo của Vọc Records.
-- File này an toàn khi chạy lại: bài viết/sản phẩm đã tồn tại sẽ không bị nhân đôi.

SET NAMES utf8mb4;
USE clonevocrecord;

-- Các bảng này được app sử dụng nhưng trước đây chưa có trong bộ SQL khởi tạo.
CREATE TABLE IF NOT EXISTS MaGiamGia (
    MaGG INT AUTO_INCREMENT PRIMARY KEY,
    Code VARCHAR(50) UNIQUE NOT NULL,
    LoaiGiamGia ENUM('percent', 'fixed') DEFAULT 'percent',
    GiaTri DECIMAL(15, 2) NOT NULL,
    DonHangToiThieu DECIMAL(15, 2) DEFAULT 0,
    SoLuong INT DEFAULT 0,
    DaDung INT DEFAULT 0,
    NgayHetHan DATETIME NULL,
    NgayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS SoDiaChi (
    MaDC INT AUTO_INCREMENT PRIMARY KEY,
    MaKH INT NOT NULL,
    NguoiNhan VARCHAR(100) NOT NULL,
    SoDienThoai VARCHAR(20) NOT NULL,
    DiaChi VARCHAR(255) NOT NULL,
    MacDinh BOOLEAN DEFAULT FALSE,
    NgayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (MaKH) REFERENCES KhachHang(MaKH) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @add_audit_content = IF(
    EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'NhatKyHoatDong' AND COLUMN_NAME = 'NoiDung'),
    'SELECT 1',
    'ALTER TABLE NhatKyHoatDong ADD COLUMN NoiDung TEXT NULL AFTER HanhDong'
);
PREPARE add_audit_content_stmt FROM @add_audit_content;
EXECUTE add_audit_content_stmt;
DEALLOCATE PREPARE add_audit_content_stmt;

INSERT IGNORE INTO MaGiamGia (Code, LoaiGiamGia, GiaTri, DonHangToiThieu, SoLuong, NgayHetHan) VALUES
('WELCOME10', 'percent', 10, 0, 100, '2027-12-31 23:59:59'),
('VINYL50', 'fixed', 50000, 500000, 100, '2027-12-31 23:59:59'),
('AUDIO15', 'percent', 15, 1000000, 30, '2027-12-31 23:59:59');

-- Bổ sung metadata để Blog và Hướng dẫn có thể lọc đúng nghiệp vụ.
SET @add_blog_category = IF(
    EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'BaiViet' AND COLUMN_NAME = 'ChuyenMuc'),
    'SELECT 1',
    'ALTER TABLE BaiViet ADD COLUMN ChuyenMuc VARCHAR(100) NULL AFTER LoaiBV'
);
PREPARE add_blog_category_stmt FROM @add_blog_category;
EXECUTE add_blog_category_stmt;
DEALLOCATE PREPARE add_blog_category_stmt;

SET @add_blog_difficulty = IF(
    EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'BaiViet' AND COLUMN_NAME = 'DoKho'),
    'SELECT 1',
    'ALTER TABLE BaiViet ADD COLUMN DoKho ENUM(''Dễ'', ''Trung bình'', ''Nâng cao'') NULL AFTER ChuyenMuc'
);
PREPARE add_blog_difficulty_stmt FROM @add_blog_difficulty;
EXECUTE add_blog_difficulty_stmt;
DEALLOCATE PREPARE add_blog_difficulty_stmt;

-- Metadata nghiệp vụ cho phần tóm tắt và hướng dẫn theo từng bước.
SET @add_blog_summary = IF(
    EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'BaiViet' AND COLUMN_NAME = 'TomTat'),
    'SELECT 1',
    'ALTER TABLE BaiViet ADD COLUMN TomTat VARCHAR(500) NULL'
);
PREPARE add_blog_summary_stmt FROM @add_blog_summary;
EXECUTE add_blog_summary_stmt;
DEALLOCATE PREPARE add_blog_summary_stmt;

SET @add_blog_duration = IF(
    EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'BaiViet' AND COLUMN_NAME = 'ThoiLuong'),
    'SELECT 1',
    'ALTER TABLE BaiViet ADD COLUMN ThoiLuong VARCHAR(50) NULL'
);
PREPARE add_blog_duration_stmt FROM @add_blog_duration;
EXECUTE add_blog_duration_stmt;
DEALLOCATE PREPARE add_blog_duration_stmt;

SET @add_guide_audience = IF(
    EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'BaiViet' AND COLUMN_NAME = 'DoiTuong'),
    'SELECT 1',
    'ALTER TABLE BaiViet ADD COLUMN DoiTuong VARCHAR(150) NULL'
);
PREPARE add_guide_audience_stmt FROM @add_guide_audience;
EXECUTE add_guide_audience_stmt;
DEALLOCATE PREPARE add_guide_audience_stmt;

SET @add_guide_tools = IF(
    EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'BaiViet' AND COLUMN_NAME = 'DungCu'),
    'SELECT 1',
    'ALTER TABLE BaiViet ADD COLUMN DungCu TEXT NULL'
);
PREPARE add_guide_tools_stmt FROM @add_guide_tools;
EXECUTE add_guide_tools_stmt;
DEALLOCATE PREPARE add_guide_tools_stmt;

SET @add_guide_steps = IF(
    EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'BaiViet' AND COLUMN_NAME = 'CacBuoc'),
    'SELECT 1',
    'ALTER TABLE BaiViet ADD COLUMN CacBuoc JSON NULL'
);
PREPARE add_guide_steps_stmt FROM @add_guide_steps;
EXECUTE add_guide_steps_stmt;
DEALLOCATE PREPARE add_guide_steps_stmt;

-- Chuẩn hóa 3 bài mẫu cũ thành nội dung có thể xuất bản.
UPDATE BaiViet
SET TieuDe = 'Bắt đầu chơi đĩa than: 7 điều cần biết trước khi mua',
    NoiDung = 'Nếu mới làm quen với vinyl, bạn chưa cần một bộ dàn thật đắt tiền. Hãy bắt đầu bằng một mâm đĩa có phono preamp tích hợp hoặc một phono preamp rời phù hợp với ampli.

1. Xác định ngân sách cho mâm đĩa, kim đọc và loa.
2. Kiểm tra đĩa có bị cong vênh, xước sâu hoặc mốc bìa hay không.
3. Đĩa cũ nên được hỏi rõ tình trạng (grading) và nghe thử nếu có thể.
4. Luôn cầm đĩa ở mép ngoài hoặc nhãn giữa, không chạm vào rãnh.
5. Chuẩn bị bao trong chống tĩnh điện và bao ngoài ngay từ đầu.
6. Mâm đĩa phải đặt trên mặt phẳng chắc, tránh loa và nguồn rung.
7. Hãy mua những album bạn thực sự muốn nghe, không chỉ mua vì độ hiếm.

Vinyl hay ở trải nghiệm nghe chủ động: chọn đĩa, lau đĩa, đặt kim và nghe trọn một mặt. Thiết bị tốt là thiết bị giúp bạn nghe thường xuyên và bảo vệ được bộ sưu tập.',
    LoaiBV = 'huongdan', HinhAnh = '/images/products/catalog/abbey-road.jpg',
    ChuyenMuc = 'Hướng dẫn cơ bản', DoKho = 'Dễ', TrangThai = 'daxuatban'
WHERE TieuDe LIKE 'Hướng dẫn chọn đĩa than%';

UPDATE BaiViet
SET TieuDe = 'Vinyl và nhạc số: chọn trải nghiệm phù hợp với bạn',
    NoiDung = 'Vinyl không thay thế nhạc số trong mọi tình huống. Nhạc số tiện lợi, dễ tìm kiếm và phù hợp khi di chuyển; vinyl tạo ra một nghi thức nghe nhạc chậm rãi, hữu hình và giàu tính sưu tầm.

Về âm thanh, chất lượng cuối cùng phụ thuộc vào bản master, tình trạng đĩa, kim đọc, phono stage, ampli và loa. Vì vậy không nên mặc định rằng mọi bản vinyl đều hay hơn mọi bản streaming.

Khi chọn đĩa, hãy ưu tiên bản phát hành có thông tin mastering rõ ràng, nhà cung cấp uy tín và tình trạng vật lý tốt. Một bản đĩa sạch, phẳng và được căn chỉnh đúng sẽ đem lại trải nghiệm ổn định hơn nhiều so với một bản hiếm nhưng xuống cấp.

Kết luận đơn giản: dùng streaming để khám phá, dùng vinyl cho những album bạn muốn nghe sâu và giữ lâu.',
    LoaiBV = 'blog', HinhAnh = '/images/products/catalog/kind-of-blue.jpg',
    ChuyenMuc = 'Kiến thức Vinyl', DoKho = NULL, TrangThai = 'daxuatban'
WHERE TieuDe LIKE 'Top 10 album vinyl%';

UPDATE BaiViet
SET TieuDe = 'Cách bảo quản đĩa than đúng cách trong điều kiện gia đình',
    NoiDung = 'Đĩa than bền hơn khi được tránh khỏi ba tác nhân chính: bụi, nhiệt và ẩm. Sau mỗi lần nghe, đưa đĩa trở lại bao trong sạch rồi cất vào bìa, không để mặt đĩa tiếp xúc trực tiếp với giấy cũ hoặc bìa bị mốc.

Hãy dựng đĩa theo chiều đứng, xếp vừa phải để đĩa không bị nghiêng. Không xếp chồng nhiều đĩa vì sức nặng có thể làm cong đĩa theo thời gian. Tủ nên đặt ở nơi khô, thoáng, tránh nắng chiếu trực tiếp và tránh sát tường ẩm.

Trước khi nghe, dùng chổi carbon nhẹ nhàng theo vòng tròn của rãnh để lấy bụi. Với vết bẩn bám sâu, dùng dung dịch vệ sinh dành riêng cho vinyl; tuyệt đối không dùng cồn, nước rửa kính hoặc hóa chất gia dụng chưa được kiểm chứng.',
    LoaiBV = 'huongdan', HinhAnh = '/images/products/catalog/vinyl-cleaning-fluid.jpg',
    ChuyenMuc = 'Bảo trì thiết bị', DoKho = 'Dễ', TrangThai = 'daxuatban'
WHERE TieuDe LIKE 'Cách bảo quản đĩa than%';

-- Bổ sung metadata hiển thị đúng ngữ cảnh, không dùng phần mở đầu làm tóm tắt giả.
UPDATE BaiViet
SET TomTat = 'Lộ trình thực tế để bắt đầu sưu tầm vinyl: chọn thiết bị, kiểm tra đĩa và bảo vệ bộ sưu tập.',
    ThoiLuong = '6 phút', DoiTuong = 'Người mới bắt đầu', DungCu = 'Mâm đĩa, bao trong chống tĩnh điện',
    CacBuoc = JSON_ARRAY('Xác định ngân sách và bộ dàn', 'Kiểm tra tình trạng đĩa', 'Cầm và bảo quản đĩa đúng cách', 'Đặt mâm ở vị trí ổn định')
WHERE TieuDe = 'Bắt đầu chơi đĩa than: 7 điều cần biết trước khi mua';

UPDATE BaiViet
SET TomTat = 'So sánh trải nghiệm vinyl và nhạc số dựa trên nhu cầu nghe, chất lượng bản master và khả năng sưu tầm.',
    ThoiLuong = '5 phút'
WHERE TieuDe = 'Vinyl và nhạc số: chọn trải nghiệm phù hợp với bạn';

UPDATE BaiViet
SET TomTat = 'Checklist bảo quản đĩa trong điều kiện gia đình: tránh bụi, nhiệt, ẩm và vệ sinh đúng vật liệu.',
    ThoiLuong = '4 phút', DoiTuong = 'Người đang sở hữu đĩa than', DungCu = 'Chổi carbon, dung dịch vệ sinh vinyl, bao trong sạch',
    CacBuoc = JSON_ARRAY('Cất đĩa vào bao trong sạch', 'Dựng đĩa theo chiều đứng', 'Tránh nắng, nhiệt và ẩm', 'Vệ sinh bằng dụng cụ chuyên dụng')
WHERE TieuDe = 'Cách bảo quản đĩa than đúng cách trong điều kiện gia đình';

-- Các bài viết bổ sung. Mỗi câu lệnh chỉ thêm nếu chưa có cùng tiêu đề.
INSERT INTO BaiViet (TieuDe, NoiDung, LoaiBV, HinhAnh, ChuyenMuc, DoKho, TrangThai)
SELECT 'Review album: The Dark Side of the Moon - Pink Floyd',
       'The Dark Side of the Moon là lựa chọn kinh điển cho người bắt đầu sưu tầm progressive rock. Album có cấu trúc liền mạch, nhiều lớp hiệu ứng và phần chuyển bài được dàn dựng như một tác phẩm thống nhất.

Khi mua bản vinyl, hãy kiểm tra phiên bản phát hành, năm tái bản và tình trạng đĩa. Với album có nhiều lần tái bản, thông tin trên nhãn và mã runout giúp phân biệt các bản khác nhau. Một bản sạch, phẳng và có bao trong tốt quan trọng hơn việc chỉ săn một bản cũ.

Đây là album nên nghe trọn một mặt ở âm lượng vừa phải, trong một không gian ít nhiễu. Hãy bắt đầu với bản bạn dễ mua, sau đó nâng cấp khi đã hiểu mình thích chất âm và phiên bản nào.',
       'blog', '/images/products/catalog/dark-side-of-the-moon.jpg', 'Review Album', NULL, 'daxuatban'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM BaiViet WHERE TieuDe = 'Review album: The Dark Side of the Moon - Pink Floyd');

INSERT INTO BaiViet (TieuDe, NoiDung, LoaiBV, HinhAnh, ChuyenMuc, DoKho, TrangThai)
SELECT '5 bước kiểm tra đĩa vinyl cũ trước khi thanh toán',
       'Đĩa cũ có thể là cách tiết kiệm để mở rộng bộ sưu tập, nhưng cần kiểm tra có hệ thống.

1. Nhìn nghiêng dưới ánh sáng để phát hiện xước sâu, mốc và vết bẩn.
2. Đặt đĩa lên mặt phẳng để kiểm tra cong vênh; không cố bẻ hoặc ép đĩa.
3. Xem nhãn giữa có bị bong, ướt hoặc có dấu hiệu ngấm nước không.
4. Kiểm tra bìa, gáy và bao trong; mùi ẩm mốc thường cho thấy đĩa đã được bảo quản kém.
5. Đối chiếu grading của người bán và hỏi chính sách đổi trả nếu đĩa bị lỗi khi phát.

Grading chỉ là mô tả, không thay thế việc kiểm tra thực tế. Nếu không được nghe thử, hãy ưu tiên người bán có ảnh thật và mô tả rõ ràng.',
       'huongdan', '/images/products/catalog/abbey-road.jpg', 'Hướng dẫn cơ bản', 'Dễ', 'daxuatban'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM BaiViet WHERE TieuDe = '5 bước kiểm tra đĩa vinyl cũ trước khi thanh toán');

INSERT INTO BaiViet (TieuDe, NoiDung, LoaiBV, HinhAnh, ChuyenMuc, DoKho, TrangThai)
SELECT 'City Pop và sức sống mới của những bản thu Nhật Bản',
       'City Pop thường được nhắc đến khi nói về làn sóng khám phá lại âm nhạc Nhật Bản cuối thập niên 1970 và 1980. Những bản phối giàu groove, bass rõ và màu sắc jazz-funk khiến dòng nhạc này phù hợp cả khi nghe chủ động lẫn làm nhạc nền.

Khi tìm vinyl City Pop, người sưu tầm nên phân biệt bản gốc, bản tái bản và các bản bootleg. Hãy xem kỹ thông tin hãng phát hành, mã catalog và ảnh nhãn đĩa. Nếu mục tiêu là nghe, bản tái bản chính thức thường dễ mua và ít rủi ro hơn bản trôi nổi.

Điều đáng giá nhất của trào lưu này là nó mở ra cơ hội tìm hiểu toàn bộ bối cảnh âm nhạc, thay vì chỉ chạy theo một ca khúc đang thịnh hành trên mạng xã hội.',
       'blog', '/images/products/catalog/plastic-love.jpg', 'Văn hóa Analog', NULL, 'daxuatban'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM BaiViet WHERE TieuDe = 'City Pop và sức sống mới của những bản thu Nhật Bản');

INSERT INTO BaiViet (TieuDe, NoiDung, LoaiBV, HinhAnh, ChuyenMuc, DoKho, TrangThai)
SELECT 'Cân chỉnh lực tì và chống trượt cho mâm đĩa',
       'Lực tì (tracking force) phải được đặt theo thông số của kim đọc. Trước khi cân chỉnh, đưa cần về đúng vị trí nghỉ, tháo chặn vận chuyển và đảm bảo mâm đĩa nằm cân bằng.

Xoay đối trọng về 0, cân cần ở trạng thái nổi, sau đó xoay cả vòng số đến 0. Tiếp tục xoay đối trọng đến đúng lực tì mà nhà sản xuất khuyến nghị. Cuối cùng đặt anti-skate ở mức gần tương đương và tinh chỉnh theo hướng dẫn của từng mẫu cần.

Không đoán lực tì bằng mắt và không dùng tay ấn kim xuống đĩa. Sai lực tì có thể làm tiếng méo, gây mòn không đều hoặc ảnh hưởng đến cả kim và rãnh đĩa. Nếu chưa có cân stylus, nên dùng cân chuyên dụng có độ phân giải phù hợp.',
       'huongdan', '/images/products/catalog/at-lp60x.jpg', 'Bảo trì thiết bị', 'Trung bình', 'daxuatban'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM BaiViet WHERE TieuDe = 'Cân chỉnh lực tì và chống trượt cho mâm đĩa');

INSERT INTO BaiViet (TieuDe, NoiDung, LoaiBV, HinhAnh, ChuyenMuc, DoKho, TrangThai)
SELECT 'Chọn mâm đĩa đầu tiên: phono tích hợp hay phono rời?',
       'Mâm đĩa có phono preamp tích hợp thường dễ lắp đặt: chỉ cần kết nối với ngõ vào line của ampli hoặc loa active. Đây là lựa chọn hợp lý cho người mới, không muốn mua nhiều thiết bị cùng lúc.

Mâm đĩa dùng phono stage rời cho phép nâng cấp linh hoạt hơn. Khi chọn, hãy kiểm tra loại cartridge, mức output, cổng kết nối và khả năng chỉnh capacitance hoặc gain nếu thiết bị có hỗ trợ.

Đừng chỉ nhìn vào công suất. Độ ổn định tốc độ, chất lượng cần, khả năng chống rung và việc dễ thay kim có ảnh hưởng trực tiếp đến trải nghiệm lâu dài. Hãy chọn hệ thống phù hợp với loa, ampli và thói quen nghe hiện tại.',
       'huongdan', '/images/products/catalog/ps-lx310bt.jpg', 'Kỹ thuật nâng cao', 'Trung bình', 'daxuatban'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM BaiViet WHERE TieuDe = 'Chọn mâm đĩa đầu tiên: phono tích hợp hay phono rời?');

-- Bổ sung giá trị mặc định cho các bài seed mới để card/detail không bị thiếu nghiệp vụ.
UPDATE BaiViet
SET TomTat = CONCAT(LEFT(REPLACE(REPLACE(NoiDung, CHAR(13), ' '), CHAR(10), ' '), 177), CASE WHEN CHAR_LENGTH(NoiDung) > 177 THEN '...' ELSE '' END)
WHERE TomTat IS NULL;

UPDATE BaiViet
SET ThoiLuong = CASE WHEN LoaiBV = 'huongdan' THEN '8 phút' ELSE '5 phút' END
WHERE ThoiLuong IS NULL;

UPDATE BaiViet
SET DoiTuong = 'Người mới bắt đầu',
    DungCu = CASE
        WHEN ChuyenMuc = 'Bảo trì thiết bị' THEN 'Dụng cụ vệ sinh và cân chỉnh cơ bản'
        WHEN ChuyenMuc = 'Kỹ thuật nâng cao' THEN 'Mâm đĩa, kim đọc và dụng cụ đo phù hợp'
        ELSE 'Bộ sưu tầm và thiết bị nghe hiện có'
    END
WHERE LoaiBV = 'huongdan' AND DoiTuong IS NULL;

-- Bộ sản phẩm mẫu dựa trên các album/thiết bị đang được bán phổ biến.
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, GiaBan, SoLuongTon, MoTa, HinhAnh, TinhTrang, MaDM, NamPhatHanh)
SELECT 'Random Access Memories', 'Daft Punk', 'Đĩa Than (Vinyl)', 899000, 12, 'Album electronic kinh điển, bản vinyl 2LP phù hợp để nghe trọn mặt.', '/images/products/vinyl-01.webp', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Đĩa Than (Vinyl)' LIMIT 1), 2013 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'Random Access Memories');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, GiaBan, SoLuongTon, MoTa, HinhAnh, TinhTrang, MaDM, NamPhatHanh)
SELECT 'Abbey Road', 'The Beatles', 'Đĩa Than (Vinyl)', 799000, 10, 'Một trong những album rock được sưu tầm nhiều nhất.', '/images/products/vinyl-02.webp', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Đĩa Than (Vinyl)' LIMIT 1), 1969 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'Abbey Road');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, GiaBan, SoLuongTon, MoTa, HinhAnh, TinhTrang, MaDM, NamPhatHanh)
SELECT 'The Dark Side of the Moon', 'Pink Floyd', 'Đĩa Than (Vinyl)', 849000, 8, 'Progressive rock với cấu trúc album liền mạch và giàu chi tiết.', '/images/products/vinyl-03.webp', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Đĩa Than (Vinyl)' LIMIT 1), 1973 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'The Dark Side of the Moon');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, GiaBan, SoLuongTon, MoTa, HinhAnh, TinhTrang, MaDM, NamPhatHanh)
SELECT 'Rumours', 'Fleetwood Mac', 'Đĩa Than (Vinyl)', 749000, 7, 'Album soft rock nổi tiếng với bản phối cân bằng và giàu cảm xúc.', '/images/products/vinyl-04.webp', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Đĩa Than (Vinyl)' LIMIT 1), 1977 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'Rumours');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, GiaBan, SoLuongTon, MoTa, HinhAnh, TinhTrang, MaDM, NamPhatHanh)
SELECT 'Kind of Blue', 'Miles Davis', 'Đĩa Than (Vinyl)', 899000, 6, 'Jazz kinh điển, bản thu tham chiếu cho nhiều hệ thống nghe.', '/images/products/music-01.webp', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Đĩa Than (Vinyl)' LIMIT 1), 1959 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'Kind of Blue');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, GiaBan, SoLuongTon, MoTa, HinhAnh, TinhTrang, MaDM, NamPhatHanh)
SELECT 'Thriller', 'Michael Jackson', 'Đĩa Than (Vinyl)', 699000, 9, 'Pop kinh điển với nhiều ca khúc quen thuộc.', '/images/products/music-02.webp', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Đĩa Than (Vinyl)' LIMIT 1), 1982 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'Thriller');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, GiaBan, SoLuongTon, MoTa, HinhAnh, TinhTrang, MaDM, NamPhatHanh)
SELECT 'Back to Black', 'Amy Winehouse', 'Đĩa Than (Vinyl)', 799000, 6, 'Soul và jazz-pop với giọng hát đặc trưng.', '/images/products/artist-01.webp', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Đĩa Than (Vinyl)' LIMIT 1), 2006 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'Back to Black');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, GiaBan, SoLuongTon, MoTa, HinhAnh, TinhTrang, MaDM, NamPhatHanh)
SELECT 'Blue Train', 'John Coltrane', 'Đĩa Than (Vinyl)', 849000, 5, 'Hard bop mạnh mẽ, phù hợp cho người nghe jazz.', '/images/products/vinyl-01.webp', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Đĩa Than (Vinyl)' LIMIT 1), 1957 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'Blue Train');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, GiaBan, SoLuongTon, MoTa, HinhAnh, TinhTrang, MaDM, NamPhatHanh)
SELECT 'Getz / Gilberto', 'Stan Getz & João Gilberto', 'Đĩa Than (Vinyl)', 799000, 5, 'Bossa nova nhẹ nhàng, một album jazz dễ nghe.', '/images/products/vinyl-02.webp', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Đĩa Than (Vinyl)' LIMIT 1), 1964 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'Getz / Gilberto');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, GiaBan, SoLuongTon, MoTa, HinhAnh, TinhTrang, MaDM, NamPhatHanh)
SELECT 'A Love Supreme', 'John Coltrane', 'Đĩa Than (Vinyl)', 899000, 4, 'Jazz chuyên sâu với phần trình diễn giàu năng lượng.', '/images/products/vinyl-03.webp', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Đĩa Than (Vinyl)' LIMIT 1), 1965 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'A Love Supreme');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, GiaBan, SoLuongTon, MoTa, HinhAnh, TinhTrang, MaDM, NamPhatHanh)
SELECT 'The Miseducation of Lauryn Hill', 'Lauryn Hill', 'Đĩa Than (Vinyl)', 949000, 5, 'Hip hop và soul kết hợp hài hòa, album đầu tay giàu ảnh hưởng.', '/images/products/vinyl-04.webp', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Đĩa Than (Vinyl)' LIMIT 1), 1998 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'The Miseducation of Lauryn Hill');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, GiaBan, SoLuongTon, MoTa, HinhAnh, TinhTrang, MaDM, NamPhatHanh)
SELECT 'OK Computer', 'Radiohead', 'Đĩa Than (Vinyl)', 849000, 6, 'Alternative rock với không gian âm thanh đặc trưng.', '/images/products/music-01.webp', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Đĩa Than (Vinyl)' LIMIT 1), 1997 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'OK Computer');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, GiaBan, SoLuongTon, MoTa, HinhAnh, TinhTrang, MaDM, NamPhatHanh)
SELECT 'Currents', 'Tame Impala', 'Đĩa Than (Vinyl)', 849000, 7, 'Psychedelic pop hiện đại với phần bass và synth nổi bật.', '/images/products/music-02.webp', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Đĩa Than (Vinyl)' LIMIT 1), 2015 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'Currents');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, GiaBan, SoLuongTon, MoTa, HinhAnh, TinhTrang, MaDM, NamPhatHanh)
SELECT 'Plastic Love', 'Mariya Takeuchi', 'Đĩa Than (Vinyl)', 999000, 4, 'City Pop được yêu thích rộng rãi, phù hợp cho bộ sưu tập Nhật Bản.', '/images/products/artist-01.webp', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Đĩa Than (Vinyl)' LIMIT 1), 1984 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'Plastic Love');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, GiaBan, SoLuongTon, MoTa, HinhAnh, TinhTrang, MaDM, NamPhatHanh)
SELECT 'Discovery', 'Daft Punk', 'Đĩa Than (Vinyl)', 899000, 5, 'French house giàu giai điệu, album phù hợp nghe trong không gian gia đình.', '/images/products/vinyl-01.webp', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Đĩa Than (Vinyl)' LIMIT 1), 2001 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'Discovery');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, GiaBan, SoLuongTon, MoTa, HinhAnh, TinhTrang, MaDM, NamPhatHanh)
SELECT 'Folklore', 'Taylor Swift', 'Đĩa Than (Vinyl)', 1099000, 5, 'Indie folk-pop với không khí trầm lắng và giàu câu chuyện.', '/images/products/vinyl-02.webp', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Đĩa Than (Vinyl)' LIMIT 1), 2020 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'Folklore');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, GiaBan, SoLuongTon, MoTa, HinhAnh, TinhTrang, MaDM, NamPhatHanh)
SELECT 'Unreal Unearth', 'Hozier', 'Đĩa Than (Vinyl)', 999000, 4, 'Alternative soul hiện đại với phần hòa âm dày và giàu cảm xúc.', '/images/products/vinyl-03.webp', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Đĩa Than (Vinyl)' LIMIT 1), 2023 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'Unreal Unearth');

INSERT INTO SanPham (TenSP, NgheSi, TheLoai, GiaBan, SoLuongTon, MoTa, HinhAnh, TinhTrang, MaDM, NamPhatHanh)
SELECT 'PS-LX310BT', 'Sony', 'Máy Quay Đĩa (Turntable)', 6990000, 3, 'Mâm đĩa tự động, hỗ trợ Bluetooth và phono tích hợp.', '/images/products/turntable-01.webp', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Máy Quay Đĩa (Turntable)' LIMIT 1), 2019 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'PS-LX310BT');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, GiaBan, SoLuongTon, MoTa, HinhAnh, TinhTrang, MaDM, NamPhatHanh)
SELECT 'AT-LP60X', 'Audio-Technica', 'Máy Quay Đĩa (Turntable)', 4990000, 4, 'Mâm đĩa tự động dễ dùng, phù hợp người mới bắt đầu.', '/images/products/turntable-02.webp', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Máy Quay Đĩa (Turntable)' LIMIT 1), 2019 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'AT-LP60X');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, GiaBan, SoLuongTon, MoTa, HinhAnh, TinhTrang, MaDM, NamPhatHanh)
SELECT 'Debut EVO 2', 'Pro-Ject', 'Máy Quay Đĩa (Turntable)', 16990000, 2, 'Mâm đĩa thủ công dành cho hệ thống hi-fi và người muốn nâng cấp.', '/images/products/turntable-01.webp', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Máy Quay Đĩa (Turntable)' LIMIT 1), 2024 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'Debut EVO 2');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, GiaBan, SoLuongTon, MoTa, HinhAnh, TinhTrang, MaDM, NamPhatHanh)
SELECT 'Brad Retro MKII', 'Gadhouse', 'Máy Quay Đĩa (Turntable)', 5590000, 3, 'Mâm đĩa phong cách retro, phù hợp không gian nghe nhạc gia đình.', '/images/products/turntable-02.webp', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Máy Quay Đĩa (Turntable)' LIMIT 1), 2024 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'Brad Retro MKII');

INSERT INTO SanPham (TenSP, NgheSi, TheLoai, GiaBan, SoLuongTon, MoTa, HinhAnh, TinhTrang, MaDM, NamPhatHanh)
SELECT 'Chổi carbon chống tĩnh điện', 'Vọc Records', 'Phụ Kiện', 189000, 20, 'Lấy bụi trên rãnh đĩa trước mỗi lần nghe.', '/images/products/accessory-01.webp', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Phụ Kiện' LIMIT 1), 2024 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'Chổi carbon chống tĩnh điện');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, GiaBan, SoLuongTon, MoTa, HinhAnh, TinhTrang, MaDM, NamPhatHanh)
SELECT 'Dung dịch vệ sinh vinyl', 'Vọc Records', 'Phụ Kiện', 249000, 15, 'Dung dịch vệ sinh chuyên dụng cho bề mặt đĩa than.', '/images/products/accessory-02.webp', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Phụ Kiện' LIMIT 1), 2024 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'Dung dịch vệ sinh vinyl');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, GiaBan, SoLuongTon, MoTa, HinhAnh, TinhTrang, MaDM, NamPhatHanh)
SELECT 'Bao ngoài LP chống bụi (10 chiếc)', 'Vọc Records', 'Phụ Kiện', 99000, 25, 'Bao ngoài trong suốt giúp bảo vệ bìa album khỏi bụi và trầy xước.', '/images/products/accessory-01.webp', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Phụ Kiện' LIMIT 1), 2024 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'Bao ngoài LP chống bụi (10 chiếc)');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, GiaBan, SoLuongTon, MoTa, HinhAnh, TinhTrang, MaDM, NamPhatHanh)
SELECT 'Bao trong chống tĩnh điện (10 chiếc)', 'Vọc Records', 'Phụ Kiện', 129000, 25, 'Bao trong thay thế giúp hạn chế bụi và tĩnh điện.', '/images/products/accessory-02.webp', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Phụ Kiện' LIMIT 1), 2024 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'Bao trong chống tĩnh điện (10 chiếc)');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, GiaBan, SoLuongTon, MoTa, HinhAnh, TinhTrang, MaDM, NamPhatHanh)
SELECT 'Thảm platter cao su 12 inch', 'Vọc Records', 'Phụ Kiện', 299000, 10, 'Thảm thay thế giúp đĩa ổn định trên platter.', '/images/products/accessory-01.webp', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Phụ Kiện' LIMIT 1), 2024 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'Thảm platter cao su 12 inch');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, GiaBan, SoLuongTon, MoTa, HinhAnh, TinhTrang, MaDM, NamPhatHanh)
SELECT 'Chổi vệ sinh kim đọc đĩa', 'Vọc Records', 'Phụ Kiện', 159000, 12, 'Chổi nhỏ chuyên dụng để vệ sinh bụi bám trên stylus.', '/images/products/accessory-02.webp', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Phụ Kiện' LIMIT 1), 2024 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'Chổi vệ sinh kim đọc đĩa');

INSERT INTO SanPham (TenSP, NgheSi, TheLoai, GiaBan, SoLuongTon, MoTa, HinhAnh, TinhTrang, MaDM, NamPhatHanh)
SELECT 'Nevermind (Cassette)', 'Nirvana', 'Cassette', 399000, 8, 'Bản cassette grunge kinh điển cho bộ sưu tập lo-fi.', '/images/products/cassette-01.webp', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Cassette' LIMIT 1), 1991 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'Nevermind (Cassette)');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, GiaBan, SoLuongTon, MoTa, HinhAnh, TinhTrang, MaDM, NamPhatHanh)
SELECT '1989 (Cassette)', 'Taylor Swift', 'Cassette', 349000, 9, 'Pop hiện đại trên định dạng cassette sưu tầm.', '/images/products/cassette-01.webp', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Cassette' LIMIT 1), 2014 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = '1989 (Cassette)');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, GiaBan, SoLuongTon, MoTa, HinhAnh, TinhTrang, MaDM, NamPhatHanh)
SELECT 'After Hours (Cassette)', 'The Weeknd', 'Cassette', 399000, 7, 'Synth-pop đậm màu điện ảnh, phiên bản cassette dễ sưu tầm.', '/images/products/cassette-01.webp', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Cassette' LIMIT 1), 2020 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'After Hours (Cassette)');
INSERT INTO SanPham (TenSP, NgheSi, TheLoai, GiaBan, SoLuongTon, MoTa, HinhAnh, TinhTrang, MaDM, NamPhatHanh)
SELECT 'Demon Days (Cassette)', 'Gorillaz', 'Cassette', 449000, 6, 'Alternative hip hop với màu sắc hoạt hình đặc trưng.', '/images/products/cassette-01.webp', 'conhang', (SELECT MaDM FROM DanhMuc WHERE TenDM = 'Cassette' LIMIT 1), 2005 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM SanPham WHERE TenSP = 'Demon Days (Cassette)');

-- Chuyển ảnh URL cũ của các sản phẩm hiện có sang ảnh local nhẹ hơn.
-- Gắn lại khóa danh mục cho các sản phẩm được nhập từ bản seed cũ.
UPDATE SanPham
SET MaDM = CASE
    WHEN TheLoai = 'Đĩa Than (Vinyl)' THEN 1
    WHEN TheLoai = 'Cassette' THEN 2
    WHEN TheLoai = 'Máy Quay Đĩa (Turntable)' THEN 3
    WHEN TheLoai = 'Phụ Kiện' THEN 4
    ELSE MaDM
END
WHERE TheLoai IN ('Đĩa Than (Vinyl)', 'Cassette', 'Máy Quay Đĩa (Turntable)', 'Phụ Kiện');

UPDATE SanPham
SET HinhAnh = CASE
    WHEN TheLoai = 'Máy Quay Đĩa (Turntable)' THEN CASE WHEN MOD(MaSP, 2) = 0 THEN '/images/products/turntable-02.webp' ELSE '/images/products/turntable-01.webp' END
    WHEN TheLoai = 'Phụ Kiện' THEN CASE WHEN MOD(MaSP, 2) = 0 THEN '/images/products/accessory-02.webp' ELSE '/images/products/accessory-01.webp' END
    WHEN TheLoai = 'Cassette' THEN '/images/products/cassette-01.webp'
    ELSE CASE MOD(MaSP, 4) WHEN 0 THEN '/images/products/vinyl-04.webp' WHEN 1 THEN '/images/products/vinyl-01.webp' WHEN 2 THEN '/images/products/vinyl-02.webp' ELSE '/images/products/vinyl-03.webp' END
END
WHERE HinhAnh LIKE 'http%';

-- Bộ ảnh catalog local nguyên bản: cập nhật cả các sản phẩm đã tồn tại trong volume cũ.
-- Các ảnh này là asset local trong DiaNhac/public/images/products/catalog/.
UPDATE SanPham
SET HinhAnh = CASE TenSP
    WHEN 'Random Access Memories' THEN '/images/products/catalog/random-access-memories.jpg'
    WHEN 'Abbey Road' THEN '/images/products/catalog/abbey-road.jpg'
    WHEN 'The Dark Side of the Moon' THEN '/images/products/catalog/dark-side-of-the-moon.jpg'
    WHEN 'Rumours' THEN '/images/products/catalog/rumours.jpg'
    WHEN 'Kind of Blue' THEN '/images/products/catalog/kind-of-blue.jpg'
    WHEN 'Thriller' THEN '/images/products/catalog/thriller.jpg'
    WHEN 'Back to Black' THEN '/images/products/catalog/back-to-black.jpg'
    WHEN 'Blue Train' THEN '/images/products/catalog/blue-train.jpg'
    WHEN 'Getz / Gilberto' THEN '/images/products/catalog/getz-gilberto.jpg'
    WHEN 'A Love Supreme' THEN '/images/products/catalog/a-love-supreme.jpg'
    WHEN 'The Miseducation of Lauryn Hill' THEN '/images/products/catalog/miseducation.jpg'
    WHEN 'OK Computer' THEN '/images/products/catalog/ok-computer.jpg'
    WHEN 'Currents' THEN '/images/products/catalog/currents.jpg'
    WHEN 'Plastic Love' THEN '/images/products/catalog/plastic-love.jpg'
    WHEN 'Discovery' THEN '/images/products/catalog/discovery.jpg'
    WHEN 'Folklore' THEN '/images/products/catalog/folklore.jpg'
    WHEN 'Unreal Unearth' THEN '/images/products/catalog/unreal-unearth.jpg'
    WHEN 'PS-LX310BT' THEN '/images/products/catalog/ps-lx310bt.jpg'
    WHEN 'AT-LP60X' THEN '/images/products/catalog/at-lp60x.jpg'
    WHEN 'Debut EVO 2' THEN '/images/products/catalog/debut-evo-2.jpg'
    WHEN 'Brad Retro MKII' THEN '/images/products/catalog/brad-retro-mkii.jpg'
    WHEN 'Chổi carbon chống tĩnh điện' THEN '/images/products/catalog/carbon-brush.jpg'
    WHEN 'Dung dịch vệ sinh vinyl' THEN '/images/products/catalog/vinyl-cleaning-fluid.jpg'
    WHEN 'Bao ngoài LP chống bụi (10 chiếc)' THEN '/images/products/catalog/outer-sleeves.jpg'
    WHEN 'Bao trong chống tĩnh điện (10 chiếc)' THEN '/images/products/catalog/inner-sleeves.jpg'
    WHEN 'Thảm platter cao su 12 inch' THEN '/images/products/catalog/rubber-platter-mat.jpg'
    WHEN 'Chổi vệ sinh kim đọc đĩa' THEN '/images/products/catalog/stylus-brush.jpg'
    WHEN 'Nevermind (Cassette)' THEN '/images/products/catalog/nevermind-cassette.jpg'
    WHEN '1989 (Cassette)' THEN '/images/products/catalog/1989-cassette.jpg'
    WHEN 'After Hours (Cassette)' THEN '/images/products/catalog/after-hours-cassette.jpg'
    WHEN 'Demon Days (Cassette)' THEN '/images/products/catalog/demon-days-cassette.jpg'
    ELSE HinhAnh
END
WHERE TenSP IN (
    'Random Access Memories', 'Abbey Road', 'The Dark Side of the Moon', 'Rumours',
    'Kind of Blue', 'Thriller', 'Back to Black', 'Blue Train', 'Getz / Gilberto',
    'A Love Supreme', 'The Miseducation of Lauryn Hill', 'OK Computer', 'Currents',
    'Plastic Love', 'Discovery', 'Folklore', 'Unreal Unearth', 'PS-LX310BT', 'AT-LP60X',
    'Debut EVO 2', 'Brad Retro MKII', 'Chổi carbon chống tĩnh điện', 'Dung dịch vệ sinh vinyl',
    'Bao ngoài LP chống bụi (10 chiếc)', 'Bao trong chống tĩnh điện (10 chiếc)',
    'Thảm platter cao su 12 inch', 'Chổi vệ sinh kim đọc đĩa', 'Nevermind (Cassette)',
    '1989 (Cassette)', 'After Hours (Cassette)', 'Demon Days (Cassette)'
);
