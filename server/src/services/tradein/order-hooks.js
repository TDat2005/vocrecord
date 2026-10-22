const Wallet = require('./wallet');
const { consignmentPayout } = require('./pricing');

// Gắn nghiệp vụ ví tín dụng và ký gửi vào vòng đời đơn hàng. Mọi hàm chạy trong transaction của đơn.

// Đơn bị hủy: trả lại phần đã thanh toán bằng ví (chỉ một lần cho mỗi đơn).
async function refundCancelledOrder(orderId, connection) {
    const [[order]] = await connection.execute('SELECT MaKH, SoTienTinDung FROM DonHang WHERE MaDH = ?', [orderId]);
    const amount = order ? Number(order.SoTienTinDung) : 0;
    if (!amount) return;
    const [[refunded]] = await connection.execute(
        "SELECT COUNT(*) AS total FROM GiaoDichTinDung WHERE MaDH = ? AND Loai = 'hoantra'",
        [orderId]
    );
    if (refunded.total) return;
    await Wallet.addEntry(connection, { customerId: order.MaKH, amount, type: 'hoantra', orderId, note: `Hoàn tín dụng do hủy đơn #${orderId}` });
}

// Đơn hoàn thành: đĩa ký gửi trong đơn chuyển sang "đã bán" và tính tiền trả người gửi.
// Người gửi chọn nhận vào ví thì cộng ngay; tiền mặt/chuyển khoản thì chờ nhân viên chi trả.
// Mỗi bản đĩa cũ chỉ có một: bán xong thì gỡ khỏi cửa hàng thay vì hiện "Hết hàng" mãi.
async function settleCompletedOrder(orderId, connection) {
    await connection.execute(
        `UPDATE SanPham sp JOIN ChiTietDonHang ct ON ct.MaSP = sp.MaSP
         SET sp.TinhTrang = 'ngungkinhdoanh'
         WHERE ct.MaDH = ? AND sp.LoaiHang = 'cu' AND sp.SoLuongTon = 0`,
        [orderId]
    );
    const [contracts] = await connection.execute(
        `SELECT hd.MaHD, hd.MaKH, hd.TyLeHoaHong, hd.NhanTien, ct.DonGia, sp.TenSP
         FROM HopDongKyGui hd
         JOIN ChiTietDonHang ct ON ct.MaSP = hd.MaSP AND ct.MaDH = ?
         JOIN SanPham sp ON sp.MaSP = hd.MaSP
         WHERE hd.TrangThai = 'dangban'
         FOR UPDATE`,
        [orderId]
    );
    for (const contract of contracts) {
        const salePrice = Number(contract.DonGia);
        const payout = consignmentPayout(salePrice, contract.TyLeHoaHong);
        const paidToWallet = contract.NhanTien === 'tindung';
        await connection.execute(
            `UPDATE HopDongKyGui SET TrangThai = ?, MaDH = ?, GiaBanThucTe = ?, SoTienTra = ?, NgayBan = NOW(),
                    NgayThanhToan = ${paidToWallet ? 'NOW()' : 'NULL'}
             WHERE MaHD = ? AND TrangThai = 'dangban'`,
            [paidToWallet ? 'dathanhtoan' : 'daban', orderId, salePrice, payout, contract.MaHD]
        );
        if (paidToWallet) {
            await Wallet.addEntry(connection, {
                customerId: contract.MaKH,
                amount: payout,
                type: 'kygui',
                contractId: contract.MaHD,
                orderId,
                note: `Bán được đĩa ký gửi "${contract.TenSP}"`,
            });
        }
    }
    return contracts.length;
}

module.exports = { refundCancelledOrder, settleCompletedOrder };
