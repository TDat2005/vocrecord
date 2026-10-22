const pool = require('../config/database');

// Số đơn (không tính đơn đã hủy) khách này đã dùng mã; so với giới hạn mỗi khách của mã (0 = không giới hạn).
async function customerLimitMessage(discount, customerId, connection) {
    const limit = Number(discount.GioiHanMoiKhach ?? 1);
    if (!customerId || !limit) return null;
    const [[row]] = await connection.query(
        "SELECT COUNT(*) AS used FROM DonHang WHERE MaKH = ? AND CodeGiamGia = ? AND SoTienGiam > 0 AND TrangThai <> 'dahuy'",
        [customerId, discount.Code]
    );
    if (Number(row.used) < limit) return null;
    return limit === 1 ? 'Bạn đã dùng mã này rồi (mỗi khách chỉ được dùng 1 lần)' : `Bạn đã dùng mã này ${limit} lần, hết lượt dành cho mỗi khách`;
}

class DiscountModel {
    static async getAll() {
        const [rows] = await pool.query("SELECT * FROM MaGiamGia ORDER BY NgayTao DESC");
        return rows;
    }

    static async getByCode(code) {
        const [rows] = await pool.execute("SELECT * FROM MaGiamGia WHERE Code = ?", [String(code || '').trim().toUpperCase()]);
        return rows[0];
    }

    // Kiểm tra mã cho khách (trang giỏ hàng, trợ lý AI): trả về lý do cụ thể khi mã không dùng được.
    static async check(code, cartTotal, customerId = null) {
        if (!code) return { success: false, message: 'Vui lòng nhập mã' };
        const total = parseFloat(cartTotal) || 0;
        const [rows] = await pool.query("SELECT * FROM MaGiamGia WHERE Code = ?", [String(code).toUpperCase()]);
        const discount = rows[0];

        if (!discount) return { success: false, message: 'Mã giảm giá không tồn tại' };
        if (discount.NgayHetHan && new Date(discount.NgayHetHan).getTime() < Date.now()) {
            return { success: false, message: 'Mã đã hết hạn' };
        }
        if (discount.SoLuong > 0 && discount.DaDung >= discount.SoLuong) {
            return { success: false, message: 'Mã đã hết lượt sử dụng' };
        }
        const usedUp = await customerLimitMessage(discount, customerId, pool);
        if (usedUp) return { success: false, message: usedUp };
        // Cột DECIMAL được mysql2 trả về dạng chuỗi nên phải ép sang số.
        const minimum = Number(discount.DonHangToiThieu) || 0;
        if (total < minimum) {
            return { success: false, message: 'Đơn hàng chưa đạt giá trị tối thiểu ' + minimum.toLocaleString('vi-VN') + 'đ' };
        }

        const value = Number(discount.GiaTri) || 0;
        let moneyDiscount = discount.LoaiGiamGia === 'percent' ? total * (value / 100) : value;
        if (moneyDiscount > total) moneyDiscount = total; // Không giảm quá tổng tiền
        moneyDiscount = Math.round(moneyDiscount); // khớp cách server tính khi tạo đơn

        return { success: true, data: { code: discount.Code, discountAmount: moneyDiscount }, message: 'Áp dụng thành công!' };
    }

    /**
     * Giữ một lượt dùng mã cho đơn đang tạo (gọi trong transaction tạo đơn).
     * Khóa dòng mã (FOR UPDATE) nên hai đơn đặt cùng lúc không cùng lấy được lượt cuối.
     * Trả về { ok, amount } hoặc { ok: false, message } với lý do cụ thể để báo khách.
     */
    static async reserve(code, cartTotal, connection, customerId = null) {
        const normalized = String(code || '').trim().toUpperCase();
        const [rows] = await connection.execute('SELECT * FROM MaGiamGia WHERE Code = ? LIMIT 1 FOR UPDATE', [normalized]);
        const discount = rows[0];
        const label = `Mã giảm giá "${normalized}"`;
        if (!discount) return { ok: false, message: `${label} không tồn tại` };
        if (discount.NgayHetHan && new Date(discount.NgayHetHan).getTime() < Date.now()) return { ok: false, message: `${label} đã hết hạn` };
        const quantity = Number(discount.SoLuong || 0);
        if (quantity > 0 && Number(discount.DaDung || 0) >= quantity) return { ok: false, message: `${label} đã hết lượt sử dụng` };
        const usedUp = await customerLimitMessage(discount, customerId, connection);
        if (usedUp) return { ok: false, message: `${label}: ${usedUp.charAt(0).toLowerCase()}${usedUp.slice(1)}` };
        const total = Math.max(Number(cartTotal) || 0, 0);
        const minimum = Number(discount.DonHangToiThieu || 0);
        if (total < minimum) return { ok: false, message: `${label} chỉ áp dụng cho đơn từ ${minimum.toLocaleString('vi-VN')}đ` };

        const value = Number(discount.GiaTri || 0);
        const isPercent = ['percent', 'phantram', 'percentage'].includes(String(discount.LoaiGiamGia || '').toLowerCase());
        const raw = isPercent ? total * value / 100 : value;
        const amount = Math.round(Math.min(Math.max(raw, 0), total));
        await connection.execute('UPDATE MaGiamGia SET DaDung = DaDung + 1 WHERE MaGG = ?', [discount.MaGG]);
        return { ok: true, amount };
    }

    static async create(code, loaiGiamGia, giaTri, donHangToiThieu, soLuong, ngayHetHan) {
        const [result] = await pool.execute(
            "INSERT INTO MaGiamGia (Code, LoaiGiamGia, GiaTri, DonHangToiThieu, SoLuong, NgayHetHan) VALUES (?, ?, ?, ?, ?, ?)",
            [String(code).toUpperCase(), loaiGiamGia, giaTri, donHangToiThieu, soLuong, ngayHetHan]
        );
        return result.insertId;
    }

    static async update(id, code, loaiGiamGia, giaTri, donHangToiThieu, soLuong, ngayHetHan) {
        const [result] = await pool.execute(
            "UPDATE MaGiamGia SET Code = ?, LoaiGiamGia = ?, GiaTri = ?, DonHangToiThieu = ?, SoLuong = ?, NgayHetHan = ? WHERE MaGG = ?",
            [String(code).toUpperCase(), loaiGiamGia, giaTri, donHangToiThieu, soLuong, ngayHetHan, id]
        );
        return result.affectedRows > 0;
    }

    static async delete(id) {
        const [result] = await pool.execute("DELETE FROM MaGiamGia WHERE MaGG = ?", [id]);
        return result.affectedRows > 0;
    }
}

module.exports = DiscountModel;
