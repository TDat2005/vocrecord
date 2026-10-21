const pool = require('../config/database');

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
    static async check(code, cartTotal) {
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

    static async calculateInternalDiscount(code, cartTotal, connection = pool) {
        const [rows] = await connection.execute(
            "SELECT * FROM MaGiamGia WHERE Code = ? LIMIT 1",
            [String(code || '').trim().toUpperCase()]
        );
        const discount = rows[0];
        if (!discount) return 0;

        const now = new Date();
        const expiry = discount.NgayHetHan ? new Date(discount.NgayHetHan) : null;
        const used = Number(discount.DaDung || 0);
        const quantity = Number(discount.SoLuong || 0);
        const minimum = Number(discount.DonHangToiThieu || 0);
        const total = Math.max(Number(cartTotal) || 0, 0);

        if ((expiry && expiry < now) || (quantity > 0 && used >= quantity) || total < minimum) return 0;

        const discountType = String(discount.LoaiGiamGia || '').toLowerCase();
        let amount = ['percent', 'phantram', 'percentage'].includes(discountType)
            ? total * Number(discount.GiaTri || 0) / 100
            : Number(discount.GiaTri || 0);
        // Làm tròn về đồng: PayOS chỉ nhận số tiền nguyên, giảm % có thể ra số lẻ.
        return Math.round(Math.min(Math.max(amount, 0), total));
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

    static async incrementUsage(code, connection = pool) {
        const [result] = await connection.execute(
            "UPDATE MaGiamGia SET DaDung = DaDung + 1 WHERE Code = ?",
            [code]
        );
        return result.affectedRows > 0;
    }
}

module.exports = DiscountModel;
