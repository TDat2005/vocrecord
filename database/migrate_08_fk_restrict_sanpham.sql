-- 08: Giữ lịch sử giao dịch khi xóa sản phẩm
-- Trước đây các FK tới SanPham dùng ON DELETE CASCADE, nên DELETE một sản phẩm
-- sẽ xóa luôn dòng chi tiết đơn hàng / phiếu nhập / trả hàng của sản phẩm đó.
-- Code hiện xóa mềm (TinhTrang = 'ngungkinhdoanh'); FK đổi sang RESTRICT để DB
-- chặn mọi lệnh DELETE cứng còn sót lại.
-- Tên file bắt đầu bằng "migrate_" để docker-entrypoint chạy SAU các file backup_*.sql.
-- Với DB đang chạy: mysql -uroot -p clonevocrecord < database/migrate_08_fk_restrict_sanpham.sql

ALTER TABLE ChiTietDonHang DROP FOREIGN KEY ChiTietDonHang_ibfk_2;
ALTER TABLE ChiTietDonHang
  ADD CONSTRAINT ChiTietDonHang_ibfk_2 FOREIGN KEY (MaSP) REFERENCES SanPham (MaSP) ON DELETE RESTRICT;

ALTER TABLE ChiTietPhieuNhap DROP FOREIGN KEY ChiTietPhieuNhap_ibfk_2;
ALTER TABLE ChiTietPhieuNhap
  ADD CONSTRAINT ChiTietPhieuNhap_ibfk_2 FOREIGN KEY (MaSP) REFERENCES SanPham (MaSP) ON DELETE RESTRICT;

ALTER TABLE YeuCauTraHangChiTiet DROP FOREIGN KEY YeuCauTraHangChiTiet_ibfk_3;
ALTER TABLE YeuCauTraHangChiTiet
  ADD CONSTRAINT YeuCauTraHangChiTiet_ibfk_3 FOREIGN KEY (MaSP) REFERENCES SanPham (MaSP) ON DELETE RESTRICT;
