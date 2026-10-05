#!/usr/bin/env bash
# Tạo 3 tài khoản kiểm thử (khách hàng, nhân viên, quản trị) cho CI.
# Dùng: MYSQL="mysql -h127.0.0.1 -uroot -proot" TEST_PASS=... bash deploy/ci-seed-accounts.sh
set -euo pipefail
: "${MYSQL:?Thiếu biến MYSQL}"
: "${TEST_PASS:?Thiếu biến TEST_PASS}"
HASH=$(cd server && node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 10))" "$TEST_PASS")
$MYSQL --default-character-set=utf8mb4 clonevocrecord <<SQL
INSERT INTO TaiKhoan (TenDangNhap, MatKhau, VaiTro) VALUES ('ci_khach', '$HASH', 'khachhang');
INSERT INTO KhachHang (HoTen, SoDienThoai, Email, MaTK) VALUES ('Khách CI', '0900000001', 'ci_khach@example.com', LAST_INSERT_ID());
INSERT INTO TaiKhoan (TenDangNhap, MatKhau, VaiTro) VALUES ('ci_nhanvien', '$HASH', 'nhanvien');
INSERT INTO NhanVien (HoTen, ChucVu, MaTK) VALUES ('Nhân viên CI', 'Nhân viên bán hàng', LAST_INSERT_ID());
INSERT INTO TaiKhoan (TenDangNhap, MatKhau, VaiTro) VALUES ('ci_admin', '$HASH', 'admin');
INSERT INTO NhanVien (HoTen, ChucVu, MaTK) VALUES ('Quản trị CI', 'Quản trị viên', LAST_INSERT_ID());
SQL
echo "Đã tạo tài khoản ci_khach, ci_nhanvien, ci_admin"
