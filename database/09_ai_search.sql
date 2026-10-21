-- Migration 09: dữ liệu cho tìm kiếm thông minh (từ khóa + vector) và trợ lý mua sắm AI.
--  * SanPham.TuKhoaAI: tâm trạng, dịp nghe, đối tượng... giúp câu như "nhạc buồn nghe lúc mưa" tìm ra đúng đĩa.
--    Quản trị viên sửa được trong form sản phẩm; để trống thì chỉ dùng tên, nghệ sĩ, thể loại, mô tả.
--  * SanPhamVector: lưu embedding (văn bản và ảnh bìa) để không phải tính lại mỗi lần khởi động server.
--    Server tự tính khi thiếu hoặc khi nội dung sản phẩm đổi (so sánh DauVanTay).
-- Chạy sau migrate_08_fk_restrict_sanpham.sql. Chạy lại nhiều lần được.

USE clonevocrecord;
SET NAMES utf8mb4;

SET @add_ai_keywords = IF(
    EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SanPham' AND COLUMN_NAME = 'TuKhoaAI'),
    'SELECT 1',
    'ALTER TABLE SanPham ADD COLUMN TuKhoaAI TEXT NULL AFTER MoTa'
);
PREPARE add_ai_keywords_stmt FROM @add_ai_keywords;
EXECUTE add_ai_keywords_stmt;
DEALLOCATE PREPARE add_ai_keywords_stmt;

CREATE TABLE IF NOT EXISTS SanPhamVector (
    MaSP INT NOT NULL,
    Loai ENUM('text', 'image') NOT NULL,
    MoHinh VARCHAR(120) NOT NULL,
    DauVanTay CHAR(40) NOT NULL,
    SoChieu SMALLINT NOT NULL,
    Vector MEDIUMBLOB NOT NULL,
    NgayCapNhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (MaSP, Loai, MoHinh),
    FOREIGN KEY (MaSP) REFERENCES SanPham(MaSP) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Từ khóa cho catalog mẫu; chỉ điền khi còn trống để không ghi đè nội dung quản trị viên đã sửa.
UPDATE SanPham sp
JOIN (
    SELECT 'Random Access Memories' AS TenSP, 'vui tươi, sôi động, funk, disco, nhảy, tiệc tùng, lái xe đêm, retro, hoài niệm' AS TuKhoa
    UNION ALL SELECT 'Abbey Road', 'kinh điển, hoài niệm, vui vẻ, ấm áp, nghe cuối tuần, quà tặng người mới chơi đĩa'
    UNION ALL SELECT 'The Dark Side of the Moon', 'trầm tư, sâu lắng, ảo giác, nghe đêm khuya, tập trung, thử loa audiophile'
    UNION ALL SELECT 'Rumours', 'chia tay, buồn man mác, tâm trạng, lãng mạn, lái xe, nghe lúc mưa, hoài niệm'
    UNION ALL SELECT 'Kind of Blue', 'thư giãn, buồn nhẹ, đêm khuya, trời mưa, quán cà phê, lãng mạn, tĩnh lặng, nghe một mình'
    UNION ALL SELECT 'Thriller', 'sôi động, nhảy, tiệc tùng, vui vẻ, năng lượng, nghe cùng gia đình'
    UNION ALL SELECT 'Back to Black', 'buồn, đau khổ, chia tay, thất tình, tâm trạng, đêm mưa, cô đơn'
    UNION ALL SELECT 'Blue Train', 'năng lượng, mạnh mẽ, tập trung làm việc, quán cà phê, buổi tối'
    UNION ALL SELECT 'Getz / Gilberto', 'nhẹ nhàng, thư giãn, lãng mạn, buổi sáng, cà phê, mùa hè, chill, mưa nhẹ'
    UNION ALL SELECT 'A Love Supreme', 'tâm linh, sâu lắng, thiền định, mãnh liệt, nghe tập trung'
    UNION ALL SELECT 'The Miseducation of Lauryn Hill', 'tình yêu, tâm trạng, suy tư, mạnh mẽ, truyền cảm hứng'
    UNION ALL SELECT 'OK Computer', 'u buồn, cô đơn, lo âu, đêm mưa, thành phố, suy tư, tâm trạng'
    UNION ALL SELECT 'Currents', 'mơ màng, chill, chia tay, đêm khuya, thư giãn, lái xe đêm'
    UNION ALL SELECT 'Plastic Love', 'hoài niệm, lãng mạn, thành phố về đêm, chill, lái xe đêm, buồn nhẹ, retro Nhật Bản'
    UNION ALL SELECT 'Discovery', 'vui tươi, sôi động, nhảy, tiệc tùng, năng lượng, tập thể dục'
    UNION ALL SELECT 'Folklore', 'buồn, trầm lắng, trời mưa, mùa thu, cô đơn, kể chuyện, tâm trạng, nghe một mình'
    UNION ALL SELECT 'Unreal Unearth', 'sâu lắng, buồn, u tối, đêm khuya, tâm trạng, hùng tráng'
    UNION ALL SELECT 'PS-LX310BT', 'mâm đĩa tự động, bluetooth, người mới bắt đầu, dễ dùng, nhỏ gọn, quà tặng'
    UNION ALL SELECT 'AT-LP60X', 'mâm đĩa tự động, người mới bắt đầu, giá mềm, dễ dùng, quà tặng'
    UNION ALL SELECT 'Debut EVO 2', 'hi-fi, audiophile, cao cấp, nâng cấp, chỉnh tay, âm thanh chi tiết'
    UNION ALL SELECT 'Brad Retro MKII', 'retro, cổ điển, trang trí phòng khách, gia đình, quà tặng'
    UNION ALL SELECT 'Chổi carbon chống tĩnh điện', 'vệ sinh đĩa, chống tĩnh điện, bảo quản, chăm sóc đĩa, quà tặng nhỏ'
    UNION ALL SELECT 'Dung dịch vệ sinh vinyl', 'vệ sinh, làm sạch đĩa, bảo quản, chăm sóc đĩa'
    UNION ALL SELECT 'Bao ngoài LP chống bụi (10 chiếc)', 'bảo quản, chống bụi, bảo vệ bìa, sưu tầm'
    UNION ALL SELECT 'Bao trong chống tĩnh điện (10 chiếc)', 'bảo quản, chống tĩnh điện, chống trầy, sưu tầm'
    UNION ALL SELECT 'Thảm platter cao su 12 inch', 'phụ kiện mâm đĩa, giảm rung, nâng cấp mâm'
    UNION ALL SELECT 'Chổi vệ sinh kim đọc đĩa', 'vệ sinh kim, stylus, chăm sóc mâm đĩa'
    UNION ALL SELECT 'Nevermind (Cassette)', 'nổi loạn, giận dữ, năng lượng, tuổi trẻ, buồn bã, thập niên 90'
    UNION ALL SELECT '1989 (Cassette)', 'vui tươi, sôi động, tuổi trẻ, tình yêu, quà tặng'
    UNION ALL SELECT 'After Hours (Cassette)', 'u tối, buồn, đêm khuya, cô đơn, chia tay, lái xe đêm, điện ảnh'
    UNION ALL SELECT 'Demon Days (Cassette)', 'u tối, kỳ quái, năng lượng, đô thị, sáng tạo'
    UNION ALL SELECT 'To Pimp a Butterfly', 'sâu sắc, xã hội, jazz rap, suy tư, nghe tập trung'
    UNION ALL SELECT 'What''s Going On', 'ấm áp, suy tư, hòa bình, nhẹ nhàng, chủ nhật'
    UNION ALL SELECT 'Bitches Brew', 'thử nghiệm, phiêu, năng lượng, đêm khuya, ảo giác'
    UNION ALL SELECT 'Buena Vista Social Club', 'vui tươi, mùa hè, thư giãn, nhảy nhẹ, cuối tuần, du lịch'
    UNION ALL SELECT 'Dummy', 'buồn, u tối, đêm mưa, cô đơn, tâm trạng, nghe đêm khuya, điện ảnh'
    UNION ALL SELECT 'Blue', 'buồn, chia tay, mộc mạc, sâu lắng, tâm sự, trời mưa, cô đơn, nghe một mình'
    UNION ALL SELECT 'Spirited Away Original Soundtrack', 'nhẹ nhàng, hoài niệm, tuổi thơ, mơ mộng, piano, thư giãn, trời mưa, đọc sách'
    UNION ALL SELECT 'Homogenic', 'lạnh lẽo, mãnh liệt, tâm trạng, thử nghiệm, mùa đông'
    UNION ALL SELECT 'Future Nostalgia', 'vui tươi, sôi động, nhảy, tiệc tùng, tập thể dục, lạc quan'
    UNION ALL SELECT 'Elis & Tom', 'nhẹ nhàng, lãng mạn, trời mưa, cà phê sáng, thư giãn, mùa hè'
    UNION ALL SELECT '3', 'nhạc Việt, indie Việt, tuổi trẻ, buồn nhẹ, hoài niệm, mưa Hà Nội, tâm trạng'
    UNION ALL SELECT 'An Evening with Silk Sonic', 'lãng mạn, hẹn hò, vui vẻ, sôi động, retro, ngọt ngào, buổi tối'
) seed ON seed.TenSP = sp.TenSP COLLATE utf8mb4_unicode_ci
SET sp.TuKhoaAI = seed.TuKhoa
WHERE sp.TuKhoaAI IS NULL OR sp.TuKhoaAI = '';
