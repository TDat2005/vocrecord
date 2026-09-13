const pool = require('../config/database');

class YeuThichModel {
    static async getByCustomer(customerId) {
        const [rows] = await pool.execute(
            "SELECT sp.MaSP as id, sp.TenSP as title, sp.NgheSi as artist, sp.GiaBan as price, sp.HinhAnh as image, yt.MaYT FROM YeuThich yt JOIN SanPham sp ON yt.MaSP = sp.MaSP WHERE yt.MaKH = ?",
            [customerId]
        );
        return rows;
    }

    static async exists(customerId, productId) {
        const [rows] = await pool.execute(
            "SELECT * FROM YeuThich WHERE MaKH = ? AND MaSP = ?",
            [customerId, productId]
        );
        return rows.length > 0;
    }

    static async add(customerId, productId) {
        const [result] = await pool.execute(
            "INSERT INTO YeuThich (MaKH, MaSP) VALUES (?, ?)",
            [customerId, productId]
        );
        return result.insertId;
    }

    static async remove(customerId, productId) {
        const [result] = await pool.execute(
            "DELETE FROM YeuThich WHERE MaKH = ? AND MaSP = ?",
            [customerId, productId]
        );
        return result.affectedRows > 0;
    }
}

module.exports = YeuThichModel;
