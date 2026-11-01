const pool = require('../config/database');

const normalizeCode = (code) => String(code || '').trim().toUpperCase();

// Số đơn (không tính đơn đã hủy) khách này đã dùng mã; so với giới hạn mỗi khách của mã (0 = không giới hạn).
async function customerLimitMessage(discount, customerId, connection) {
    const limit = Number(discount.GioiHanMoiKhach ?? 1);
    if (!customerId || !limit) return null;
    const [[row]] = await connection.query(
        "SELECT COUNT(*) AS used FROM DonHang WHERE MaKH = ? AND CodeGiamGia = ? AND SoTienGiam > 0 AND TrangThai <> 'dahuy'",
        [customerId, discount.Code]
    );
    if (Number(row.used) < limit) return null;
    return limit === 1 ? 'bạn đã dùng mã này rồi (mỗi khách chỉ được dùng 1 lần)' : `bạn đã dùng mã này ${limit} lần, hết lượt dành cho mỗi khách`;
}

/**
 * Kiểm tra một mã đã đọc từ CSDL và tính số tiền giảm cho tổng tiền hàng.
 * Dùng chung cho kiểm tra ở giỏ hàng (check) và lúc tạo đơn (reserve) để hai nơi luôn ra cùng một kết quả.
 * Trả về { ok: true, amount } hoặc { ok: false, reason } (reason viết thường, nơi gọi tự thêm tiền tố).
 */
async function evaluate(discount, cartTotal, customerId, connection) {
    if (!discount) return { ok: false, reason: 'không tồn tại' };
    if (discount.NgayHetHan && new Date(discount.NgayHetHan).getTime() < Date.now()) return { ok: false, reason: 'đã hết hạn' };
    const quantity = Number(discount.SoLuong || 0);
    if (quantity > 0 && Number(discount.DaDung || 0) >= quantity) return { ok: false, reason: 'đã hết lượt sử dụng' };
    const usedUp = await customerLimitMessage(discount, customerId, connection);
    if (usedUp) return { ok: false, reason: usedUp };
    // Cột DECIMAL được mysql2 trả về dạng chuỗi nên phải ép sang số.
    const total = Math.max(Number(cartTotal) || 0, 0);
    const minimum = Number(discount.DonHangToiThieu || 0);
    if (total < minimum) return { ok: false, reason: `chỉ áp dụng cho đơn từ ${minimum.toLocaleString('vi-VN')}đ` };

    const value = Number(discount.GiaTri || 0);
    const raw = discount.LoaiGiamGia === 'percent' ? total * value / 100 : value;
    return { ok: true, amount: Math.round(Math.min(Math.max(raw, 0), total)) }; // không giảm quá tổng tiền
}

class DiscountModel {
    // Kiểm tra mã cho khách (trang giỏ hàng, trợ lý AI): trả về lý do cụ thể khi mã không dùng được.
    static async check(code, cartTotal, customerId = null) {
        const normalized = normalizeCode(code);
        if (!normalized) return { success: false, message: 'Vui lòng nhập mã' };
        const [rows] = await pool.query("SELECT * FROM MaGiamGia WHERE Code = ?", [normalized]);
        const result = await evaluate(rows[0], cartTotal, customerId, pool);
        if (!result.ok) return { success: false, message: `Mã giảm giá ${result.reason}` };
        return { success: true, data: { code: rows[0].Code, discountAmount: result.amount }, message: 'Áp dụng thành công!' };
    }

    /**
     * Giữ một lượt dùng mã cho đơn đang tạo (gọi trong transaction tạo đơn).
     * Khóa dòng mã (FOR UPDATE) nên hai đơn đặt cùng lúc không cùng lấy được lượt cuối.
     * Trả về { ok, amount } hoặc { ok: false, message } với lý do cụ thể để báo khách.
     */
    static async reserve(code, cartTotal, connection, customerId = null) {
        const normalized = normalizeCode(code);
        const [rows] = await connection.execute('SELECT * FROM MaGiamGia WHERE Code = ? LIMIT 1 FOR UPDATE', [normalized]);
        const result = await evaluate(rows[0], cartTotal, customerId, connection);
        if (!result.ok) return { ok: false, message: `Mã giảm giá "${normalized}" ${result.reason}` };
        await connection.execute('UPDATE MaGiamGia SET DaDung = DaDung + 1 WHERE MaGG = ?', [rows[0].MaGG]);
        return { ok: true, amount: result.amount };
    }
}

module.exports = DiscountModel;
module.exports.normalizeCode = normalizeCode;
