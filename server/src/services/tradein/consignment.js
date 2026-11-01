const pool = require('../../config/database');
const EmailService = require('../email.service');
const { withTransaction } = require('../../utils/db');
const { fail } = require('../../utils/http');

// Gỡ đĩa ký gửi chưa bán khỏi cửa hàng (khách rút, nhân viên trả lại, hoặc hợp đồng hết hạn).
// customerId: chỉ cho rút hợp đồng của chính khách đó.
async function returnConsignment(contractId, { customerId = null } = {}) {
    return withTransaction(async (connection) => {
        const [[contract]] = await connection.query(
            'SELECT hd.MaHD, hd.MaKH, hd.MaSP, hd.TrangThai, sp.SoLuongTon FROM HopDongKyGui hd JOIN SanPham sp ON sp.MaSP = hd.MaSP WHERE hd.MaHD = ? FOR UPDATE',
            [contractId]
        );
        if (!contract || (customerId && Number(contract.MaKH) !== Number(customerId))) throw fail(404, 'Không tìm thấy hợp đồng ký gửi');
        if (contract.TrangThai !== 'dangban') throw fail(409, 'Chỉ rút được đĩa đang bán');
        if (Number(contract.SoLuongTon) < 1) throw fail(409, 'Đĩa đang nằm trong một đơn hàng chưa hoàn tất, chưa rút được');
        await connection.query("UPDATE SanPham SET SoLuongTon = 0, TinhTrang = 'ngungkinhdoanh' WHERE MaSP = ?", [contract.MaSP]);
        await connection.query("UPDATE HopDongKyGui SET TrangThai = 'datra' WHERE MaHD = ?", [contractId]);
        return contract;
    });
}

// Hợp đồng ký gửi quá hạn mà đĩa chưa bán: gỡ khỏi kệ và báo khách hẹn lấy lại đĩa.
// Đĩa đang nằm trong đơn chưa hoàn tất thì để lần chạy sau (đơn có thể bị hủy và đĩa về lại kệ).
async function expireConsignments() {
    const [expired] = await pool.query(
        `SELECT hd.MaHD, sp.TenSP, kh.Email, kh.HoTen FROM HopDongKyGui hd
         JOIN SanPham sp ON sp.MaSP = hd.MaSP JOIN KhachHang kh ON kh.MaKH = hd.MaKH
         WHERE hd.TrangThai = 'dangban' AND hd.NgayHetHan < NOW() AND sp.SoLuongTon > 0`
    );
    for (const contract of expired) {
        try {
            await returnConsignment(contract.MaHD);
            console.log(`[Ký gửi] Hợp đồng #${contract.MaHD} hết hạn, đã gỡ đĩa khỏi cửa hàng`);
            EmailService.send({
                to: contract.Email,
                subject: `Hợp đồng ký gửi "${contract.TenSP}" đã hết hạn - Vọc Records`,
                html: EmailService.layout('Hợp đồng ký gửi đã hết hạn', `
          <p style="margin:0 0 12px;color:#616161;font-size:14px;line-height:1.6;">
            Chào ${EmailService.escapeHtml(contract.HoTen)}, đĩa <strong>${EmailService.escapeHtml(contract.TenSP)}</strong> chưa bán được trong thời hạn ký gửi
            nên Vọc Records đã gỡ đĩa khỏi cửa hàng. Bạn liên hệ hotline 0766 255 478 để hẹn lấy lại đĩa, hoặc ký gửi lại với giá mới.
          </p>`),
                text: `Hợp đồng ký gửi "${contract.TenSP}" đã hết hạn. Đĩa đã được gỡ khỏi cửa hàng, vui lòng liên hệ 0766 255 478 để hẹn lấy lại.`,
            }).catch(() => {});
        } catch (error) {
            console.error(`[Ký gửi] Hợp đồng #${contract.MaHD}:`, error.message);
        }
    }
}

module.exports = { returnConsignment, expireConsignments };
