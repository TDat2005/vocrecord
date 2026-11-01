const pool = require('../config/database');

class YeuThichModel {
    static async getByCustomer(customerId) {
        const [rows] = await pool.execute(
            `SELECT sp.MaSP as id, sp.TenSP as title, sp.NgheSi as artist, sp.GiaBan as price, sp.HinhAnh as image,
                    sp.SoLuongTon as stock, sp.TinhTrang as status, yt.MaYT
             FROM YeuThich yt JOIN SanPham sp ON yt.MaSP = sp.MaSP WHERE yt.MaKH = ? ORDER BY yt.MaYT DESC`,
            [customerId]
        );
        return rows;
    }

    // INSERT IGNORE + khóa UNIQUE (migration 14): bấm nhanh 2 lần không tạo 2 dòng.
    // Trả về false nếu sản phẩm đã có trong danh sách.
    static async add(customerId, productId) {
        const [result] = await pool.execute("INSERT IGNORE INTO YeuThich (MaKH, MaSP) VALUES (?, ?)", [customerId, productId]);
        return result.affectedRows > 0;
    }

    static async remove(customerId, productId) {
        const [result] = await pool.execute("DELETE FROM YeuThich WHERE MaKH = ? AND MaSP = ?", [customerId, productId]);
        return result.affectedRows > 0;
    }
}

module.exports = YeuThichModel;
