const pool = require('../config/database');

class BaiVietModel {
    static baseQuery() {
        return `SELECT b.MaBV as id, b.TieuDe as title, b.NoiDung as content, b.LoaiBV as type, b.HinhAnh as image, b.ChuyenMuc as category, b.DoKho as difficulty, b.NgayTao as created_at, b.NgayCapNhat as updated_at, b.TrangThai as status,
              COALESCE(nv.HoTen, t.TenDangNhap, 'Admin') as author
              FROM BaiViet b
              LEFT JOIN TaiKhoan t ON b.MaTK = t.MaTK
              LEFT JOIN NhanVien nv ON t.MaTK = nv.MaTK`;
    }

    static async getAll(type = null, status = 'daxuatban', limit = 50) {
        let query = this.baseQuery() + " WHERE 1=1";
        const params = [];

        if (type) {
            query += " AND b.LoaiBV = ?";
            params.push(type);
        }
        if (status !== 'all') {
            query += " AND b.TrangThai = ?";
            params.push(status);
        }
        query += " ORDER BY b.NgayTao DESC LIMIT " + parseInt(limit, 10);

        const [rows] = await pool.execute(query, params);
        return rows;
    }

    static async getById(id) {
        const query = this.baseQuery() + " WHERE b.MaBV = ?";
        const [rows] = await pool.execute(query, [id]);
        return rows[0];
    }

    static async create(title, content, type, image, status, accountId, category = null, difficulty = null) {
        const [result] = await pool.execute(
            "INSERT INTO BaiViet (TieuDe, NoiDung, LoaiBV, HinhAnh, TrangThai, MaTK, ChuyenMuc, DoKho) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [title, content, type, image, status, accountId, category, difficulty]
        );
        return result.insertId;
    }

    static async update(id, title, content, type, image, status, category = null, difficulty = null) {
        const [result] = await pool.execute(
            "UPDATE BaiViet SET TieuDe=?, NoiDung=?, LoaiBV=?, HinhAnh=?, TrangThai=?, ChuyenMuc=?, DoKho=? WHERE MaBV=?",
            [title, content, type, image, status, category, difficulty, id]
        );
        return result.affectedRows > 0;
    }

    static async delete(id) {
        const [result] = await pool.execute("DELETE FROM BaiViet WHERE MaBV=?", [id]);
        return result.affectedRows > 0;
    }
}

module.exports = BaiVietModel;
