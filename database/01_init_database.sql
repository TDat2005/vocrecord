-- SQL Khởi tạo Cơ sở dữ liệu cho hệ thống Vọc Records
-- Chú ý: Dựa trên báo cáo phân tích thiết kế, gồm 14 bảng

CREATE DATABASE IF NOT EXISTS clonevocrecord DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE clonevocrecord;
SET NAMES utf8mb4;

-- 1. Bảng Tài Khoản
CREATE TABLE TaiKhoan (
    MaTK INT AUTO_INCREMENT PRIMARY KEY,
    TenDangNhap VARCHAR(100) UNIQUE NOT NULL,
    MatKhau VARCHAR(255) NOT NULL,
    VaiTro ENUM('khachhang', 'nhanvien', 'admin') DEFAULT 'khachhang',
    TrangThai BOOLEAN DEFAULT TRUE,
    NgayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng Khách Hàng
CREATE TABLE KhachHang (
    MaKH INT AUTO_INCREMENT PRIMARY KEY,
    HoTen VARCHAR(100) NOT NULL,
    SoDienThoai VARCHAR(20),
    Email VARCHAR(100) UNIQUE,
    DiaChi TEXT,
    MaTK INT,
    FOREIGN KEY (MaTK) REFERENCES TaiKhoan(MaTK) ON DELETE CASCADE
);

-- 3. Bảng Nhân Viên
CREATE TABLE NhanVien (
    MaNV INT AUTO_INCREMENT PRIMARY KEY,
    HoTen VARCHAR(100) NOT NULL,
    ChucVu VARCHAR(50),
    MaTK INT,
    FOREIGN KEY (MaTK) REFERENCES TaiKhoan(MaTK) ON DELETE CASCADE
);

-- 4. Bảng Danh Mục Sản Phẩm
CREATE TABLE DanhMuc (
    MaDM INT AUTO_INCREMENT PRIMARY KEY,
    TenDM VARCHAR(100) NOT NULL,
    MoTa TEXT
);

-- 5. Bảng Sản Phẩm
CREATE TABLE SanPham (
    MaSP INT AUTO_INCREMENT PRIMARY KEY,
    TenSP VARCHAR(255) NOT NULL,
    NgheSi VARCHAR(100),
    TheLoai VARCHAR(100),
    GiaBan DECIMAL(15, 2) NOT NULL,
    SoLuongTon INT DEFAULT 0,
    MoTa TEXT,
    HinhAnh VARCHAR(255),
    TinhTrang ENUM('conhang', 'hethang', 'preorder', 'ngungkinhdoanh') DEFAULT 'conhang',
    MaDM INT,
    FOREIGN KEY (MaDM) REFERENCES DanhMuc(MaDM) ON DELETE SET NULL
);

-- 6. Bảng Giỏ Hàng
CREATE TABLE GioHang (
    MaGH INT AUTO_INCREMENT PRIMARY KEY,
    MaKH INT,
    TongTien DECIMAL(15, 2) DEFAULT 0,
    NgayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (MaKH) REFERENCES KhachHang(MaKH) ON DELETE CASCADE
);

-- 7. Bảng Chi Tiết Giỏ Hàng
CREATE TABLE ChiTietGioHang (
    MaCTGH INT AUTO_INCREMENT PRIMARY KEY,
    MaGH INT,
    MaSP INT,
    SoLuong INT NOT NULL,
    DonGia DECIMAL(15, 2),
    FOREIGN KEY (MaGH) REFERENCES GioHang(MaGH) ON DELETE CASCADE,
    FOREIGN KEY (MaSP) REFERENCES SanPham(MaSP) ON DELETE CASCADE
);

-- 8. Bảng Đơn Hàng
CREATE TABLE DonHang (
    MaDH INT AUTO_INCREMENT PRIMARY KEY,
    MaKH INT,
    NgayDat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    TongTien DECIMAL(15, 2) NOT NULL,
    TrangThai ENUM('choxacnhan', 'daxacnhan', 'dangchuanbihang', 'danggiaohang', 'hoanthanh', 'dahuy') DEFAULT 'choxacnhan',
    DiaChiGiao TEXT,
    FOREIGN KEY (MaKH) REFERENCES KhachHang(MaKH) ON DELETE CASCADE
);

-- 9. Bảng Chi Tiết Đơn Hàng
CREATE TABLE ChiTietDonHang (
    MaCTDH INT AUTO_INCREMENT PRIMARY KEY,
    MaDH INT,
    MaSP INT,
    SoLuong INT NOT NULL,
    DonGia DECIMAL(15, 2) NOT NULL,
    FOREIGN KEY (MaDH) REFERENCES DonHang(MaDH) ON DELETE CASCADE,
    FOREIGN KEY (MaSP) REFERENCES SanPham(MaSP) ON DELETE CASCADE
);

-- 10. Bảng Thanh Toán
CREATE TABLE ThanhToan (
    MaTT INT AUTO_INCREMENT PRIMARY KEY,
    MaDH INT,
    HinhThuc ENUM('tiemmat', 'chuyenkhoan', 'thetin-dung') DEFAULT 'tiemmat',
    TrangThaiTT ENUM('chuathanhtoan', 'dathanhtoan', 'thatbai') DEFAULT 'chuathanhtoan',
    NgayTT TIMESTAMP NULL,
    FOREIGN KEY (MaDH) REFERENCES DonHang(MaDH) ON DELETE CASCADE
);

-- 11. Bảng Yêu Thích 
CREATE TABLE YeuThich (
    MaYT INT AUTO_INCREMENT PRIMARY KEY,
    MaKH INT,
    MaSP INT,
    FOREIGN KEY (MaKH) REFERENCES KhachHang(MaKH) ON DELETE CASCADE,
    FOREIGN KEY (MaSP) REFERENCES SanPham(MaSP) ON DELETE CASCADE
);

-- 12. Bảng Phiếu Nhập
CREATE TABLE PhieuNhap (
    MaPN INT AUTO_INCREMENT PRIMARY KEY,
    MaNV INT,
    NgayNhap TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    TongTien DECIMAL(15, 2) DEFAULT 0,
    FOREIGN KEY (MaNV) REFERENCES NhanVien(MaNV) ON DELETE SET NULL
);

-- 13. Bảng Chi Tiết Phiếu Nhập
CREATE TABLE ChiTietPhieuNhap (
    MaCTPN INT AUTO_INCREMENT PRIMARY KEY,
    MaPN INT,
    MaSP INT,
    SoLuongNhap INT NOT NULL,
    GiaNhap DECIMAL(15, 2) NOT NULL,
    FOREIGN KEY (MaPN) REFERENCES PhieuNhap(MaPN) ON DELETE CASCADE,
    FOREIGN KEY (MaSP) REFERENCES SanPham(MaSP) ON DELETE CASCADE
);

-- 14. Bảng Nhật Ký Hoạt Động
CREATE TABLE NhatKyHoatDong (
    MaNK INT AUTO_INCREMENT PRIMARY KEY,
    MaTK INT,
    ThoiGian TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    HanhDong TEXT,
    FOREIGN KEY (MaTK) REFERENCES TaiKhoan(MaTK) ON DELETE CASCADE
);

-- Insert dữ liệu mẫu Danh mục
INSERT INTO DanhMuc (TenDM, MoTa) VALUES 
('Đĩa Than (Vinyl)', 'Các đĩa thanh truyền thống'),
('Cassette', 'Băng Cassette gốc'),
('Máy Quay Đĩa (Turntable)', 'Mâm đĩa chất lượng cao'),
('Phụ Kiện', 'Bao da, thiết bị bảo dưỡng âm thanh');
