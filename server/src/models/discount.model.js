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
        return Math.min(Math.max(amount, 0), total);
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
