-- ============================================================
-- Tài khoản mẫu để test (đăng nhập, mua hàng, quản trị).
-- Mật khẩu chung cho mọi tài khoản: Demo@123
--
--   admin.demo                    Quản trị viên (xem được mục Nhân sự)
--   nhanvien.demo                 Nhân viên bán hàng
--   khach1@vocrecord.local        Khách hàng, có 2 địa chỉ ở Hà Nội
--   khach2@vocrecord.local        Khách hàng, có 1 địa chỉ ở TP.HCM
--   khach.bikhoa@vocrecord.local  Khách hàng đã bị khóa (test thông báo khóa tài khoản)
--
-- Địa chỉ dùng tên tỉnh/phường mới (sau sắp xếp hành chính 2025) và mã của GHN.
-- Chạy lại nhiều lần được: tài khoản/hồ sơ đã có sẽ được bỏ qua.
-- Áp dụng cho CSDL đang chạy:
--   docker compose exec -T db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" clonevocrecord' < database/seed_demo_accounts.sql
-- ============================================================

SET NAMES utf8mb4;

-- bcrypt của "Demo@123"
SET @demo_hash = '$2a$10$f.qOMyKLrsPoib4YzrNkS.oxRXrO5i3HWVfq0kaY7IefCMRVqMw32';

INSERT IGNORE INTO TaiKhoan (TenDangNhap, MatKhau, VaiTro, TrangThai) VALUES
    ('admin.demo', @demo_hash, 'admin', 1),
    ('nhanvien.demo', @demo_hash, 'nhanvien', 1),
    ('khach1@vocrecord.local', @demo_hash, 'khachhang', 1),
    ('khach2@vocrecord.local', @demo_hash, 'khachhang', 1),
    ('khach.bikhoa@vocrecord.local', @demo_hash, 'khachhang', 0);

-- Hồ sơ nhân viên (cần cho nhập kho, ghi người xử lý đơn)
INSERT INTO NhanVien (HoTen, ChucVu, MaTK)
SELECT 'Phạm Quản Trị', 'Quản trị viên', tk.MaTK FROM TaiKhoan tk
WHERE tk.TenDangNhap = 'admin.demo'
  AND NOT EXISTS (SELECT 1 FROM NhanVien nv WHERE nv.MaTK = tk.MaTK);

INSERT INTO NhanVien (HoTen, ChucVu, MaTK)
SELECT 'Lê Văn Bình', 'Nhân viên bán hàng', tk.MaTK FROM TaiKhoan tk
WHERE tk.TenDangNhap = 'nhanvien.demo'
  AND NOT EXISTS (SELECT 1 FROM NhanVien nv WHERE nv.MaTK = tk.MaTK);

-- Hồ sơ khách hàng
INSERT INTO KhachHang (HoTen, SoDienThoai, Email, DiaChi, MaTK)
SELECT 'Nguyễn Minh Anh', '0912000001', 'khach1@vocrecord.local', '12 Thái Hà, Phường Đống Đa, Hà Nội', tk.MaTK FROM TaiKhoan tk
WHERE tk.TenDangNhap = 'khach1@vocrecord.local'
  AND NOT EXISTS (SELECT 1 FROM KhachHang kh WHERE kh.MaTK = tk.MaTK OR kh.Email = 'khach1@vocrecord.local');

INSERT INTO KhachHang (HoTen, SoDienThoai, Email, DiaChi, MaTK)
SELECT 'Trần Thu Hà', '0912000002', 'khach2@vocrecord.local', '45 Lê Lợi, Phường Sài Gòn, TP. Hồ Chí Minh', tk.MaTK FROM TaiKhoan tk
WHERE tk.TenDangNhap = 'khach2@vocrecord.local'
  AND NOT EXISTS (SELECT 1 FROM KhachHang kh WHERE kh.MaTK = tk.MaTK OR kh.Email = 'khach2@vocrecord.local');

INSERT INTO KhachHang (HoTen, SoDienThoai, Email, DiaChi, MaTK)
SELECT 'Khách Bị Khóa', '0912000003', 'khach.bikhoa@vocrecord.local', NULL, tk.MaTK FROM TaiKhoan tk
WHERE tk.TenDangNhap = 'khach.bikhoa@vocrecord.local'
  AND NOT EXISTS (SELECT 1 FROM KhachHang kh WHERE kh.MaTK = tk.MaTK OR kh.Email = 'khach.bikhoa@vocrecord.local');

-- Sổ địa chỉ (chỉ thêm khi khách chưa có địa chỉ nào)
INSERT INTO SoDiaChi (MaKH, NguoiNhan, SoDienThoai, DiaChi, GHNTinh, GHNPhuong, GHNProvinceId, GHNWardId, MacDinh)
SELECT kh.MaKH, 'Nguyễn Minh Anh', '0912000001', '12 Thái Hà', 'Hà Nội', 'Phường Đống Đa', '1000000', '1003476', 1
FROM KhachHang kh
WHERE kh.Email = 'khach1@vocrecord.local'
  AND NOT EXISTS (SELECT 1 FROM SoDiaChi dc WHERE dc.MaKH = kh.MaKH);

INSERT INTO SoDiaChi (MaKH, NguoiNhan, SoDienThoai, DiaChi, GHNTinh, GHNPhuong, GHNProvinceId, GHNWardId, MacDinh)
SELECT kh.MaKH, 'Nguyễn Văn Nam (người nhận hộ)', '0912000009', '120 Nguyễn Trãi', 'Hà Nội', 'Phường Thanh Xuân', '1000000', '1003469', 0
FROM KhachHang kh
WHERE kh.Email = 'khach1@vocrecord.local'
  AND (SELECT COUNT(*) FROM SoDiaChi dc WHERE dc.MaKH = kh.MaKH) = 1;

INSERT INTO SoDiaChi (MaKH, NguoiNhan, SoDienThoai, DiaChi, GHNTinh, GHNPhuong, GHNProvinceId, GHNWardId, MacDinh)
SELECT kh.MaKH, 'Trần Thu Hà', '0912000002', '45 Lê Lợi', 'Hồ Chí Minh', 'Phường Sài Gòn', '1000001', '1003506', 1
FROM KhachHang kh
WHERE kh.Email = 'khach2@vocrecord.local'
  AND NOT EXISTS (SELECT 1 FROM SoDiaChi dc WHERE dc.MaKH = kh.MaKH);
