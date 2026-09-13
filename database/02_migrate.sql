-- Migration: Đồng bộ CSDL với báo cáo CNPM
-- Chạy trên database clonevocrecord

USE clonevocrecord;
SET NAMES utf8mb4;

-- 1. Bảng DonHang: thêm cột theo báo cáo mục 2.3.2 bảng 8
ALTER TABLE DonHang
  ADD COLUMN NguoiNhan NVARCHAR(100) NULL AFTER MaKH,
  ADD COLUMN SDTNhan VARCHAR(15) NULL AFTER NguoiNhan,
  ADD COLUMN GhiChu NVARCHAR(255) NULL AFTER DiaChiGiao,
  ADD COLUMN MaNVXuLy INT NULL AFTER GhiChu,
  ADD COLUMN PhuongThucThanhToan NVARCHAR(50) DEFAULT 'COD' AFTER TrangThai,
  ADD CONSTRAINT fk_donhang_nhanvien FOREIGN KEY (MaNVXuLy) REFERENCES NhanVien(MaNV) ON DELETE SET NULL;

-- 2. Bảng SanPham: thêm NamPhatHanh, sửa TinhTrang
ALTER TABLE SanPham
  ADD COLUMN NamPhatHanh INT NULL AFTER TheLoai;

ALTER TABLE SanPham
  MODIFY COLUMN TinhTrang ENUM('conhang', 'saphethang', 'hethang', 'preorder', 'ngungkinhdoanh') DEFAULT 'conhang';

-- 3. Bảng ThanhToan: thêm MaGiaoDich, sửa enum
ALTER TABLE ThanhToan
  ADD COLUMN MaGiaoDich VARCHAR(100) NULL AFTER TrangThaiTT,
  ADD COLUMN SoTien DECIMAL(15, 2) NULL AFTER MaDH;

ALTER TABLE ThanhToan
  MODIFY COLUMN HinhThuc ENUM('tiemmat', 'chuyenkhoan', 'cod', 'payos', 'momo', 'vnpay') DEFAULT 'cod';

ALTER TABLE ThanhToan
  MODIFY COLUMN TrangThaiTT ENUM('chuathanhtoan', 'dangxuly', 'dathanhtoan', 'thatbai', 'dahuy') DEFAULT 'chuathanhtoan';

-- 4. Bảng PhieuNhap: thêm GhiChu
ALTER TABLE PhieuNhap
  ADD COLUMN GhiChu NVARCHAR(255) NULL AFTER TongTien;

-- 5. Bảng Blog (mới - cho admin/nhân viên viết bài)
CREATE TABLE IF NOT EXISTS BaiViet (
    MaBV INT AUTO_INCREMENT PRIMARY KEY,
    TieuDe NVARCHAR(255) NOT NULL,
    NoiDung TEXT NOT NULL,
    LoaiBV ENUM('blog', 'huongdan') DEFAULT 'blog',
    HinhAnh VARCHAR(255) NULL,
    MaTK INT NULL,
    TrangThai ENUM('nhap', 'daxuatban') DEFAULT 'nhap',
    NgayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    NgayCapNhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (MaTK) REFERENCES TaiKhoan(MaTK) ON DELETE SET NULL
);

-- Insert dữ liệu mẫu blog
INSERT INTO BaiViet (TieuDe, NoiDung, LoaiBV, TrangThai) VALUES
('Hướng dẫn chọn đĩa than cho người mới', 'Bạn mới bắt đầu chơi đĩa than? Đây là những điều cơ bản bạn cần biết trước khi mua chiếc đĩa đầu tiên. Đĩa than (vinyl) là một phương tiện lưu trữ âm nhạc analog, đem lại trải nghiệm nghe nhạc ấm áp và chân thực hơn so với digital. Khi chọn đĩa, bạn nên chú ý đến tình trạng bề mặt đĩa, kiểm tra xem có bị xước hay cong vênh không. Đĩa mới sealed thường có chất lượng tốt nhất, nhưng đĩa vintage cũng có giá trị riêng nếu được bảo quản tốt.', 'huongdan', 'daxuatban'),
('Top 10 album vinyl đáng sưu tầm 2026', 'Năm 2026 chứng kiến sự trở lại mạnh mẽ của vinyl với nhiều album xuất sắc. Từ các bản tái bản kinh điển đến những album mới được phát hành độc quyền trên đĩa than, đây là danh sách 10 album không thể bỏ qua cho bộ sưu tập của bạn.', 'blog', 'daxuatban'),
('Cách bảo quản đĩa than đúng cách', 'Đĩa than cần được bảo quản cẩn thận để giữ chất lượng âm thanh. Luôn cất đĩa trong bao bì chống tĩnh điện, để đứng thay vì xếp chồng, và tránh ánh nắng trực tiếp. Vệ sinh đĩa thường xuyên bằng bàn chải carbon fiber trước mỗi lần nghe.', 'huongdan', 'daxuatban');
