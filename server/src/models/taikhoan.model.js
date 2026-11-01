const pool = require('../config/database');

class TaiKhoanModel {
    static async findById(maTK, connection = pool) {
        const db = connection || pool;
        const [rows] = await db.execute(
            "SELECT * FROM TaiKhoan WHERE MaTK = ?",
            [maTK]
        );
        return rows[0];
    }

    static async findByUsername(username, connection = pool) {
        const db = connection || pool;
        const [rows] = await db.execute(
            "SELECT * FROM TaiKhoan WHERE TenDangNhap = ?",
            [username]
        );
        return rows[0];
    }

    static async create(username, hashedPassword, role = 'khachhang', connection = pool) {
        const db = connection || pool;
        const [result] = await db.execute(
            "INSERT INTO TaiKhoan (TenDangNhap, MatKhau, VaiTro) VALUES (?, ?, ?)",
            [username, hashedPassword, role]
        );
        return result.insertId;
    }

    // Ghi kèm thời điểm đổi mật khẩu để vé đăng nhập cũ hết hiệu lực (auth.middleware.js).
    // Lấy giờ của Node (không dùng NOW() của MySQL) để so khớp với thời điểm cấp vé.
    static async updatePassword(maTK, hashedPassword, connection = pool) {
        const db = connection || pool;
        try {
            const [result] = await db.execute(
                "UPDATE TaiKhoan SET MatKhau = ?, NgayDoiMatKhau = ? WHERE MaTK = ?",
                [hashedPassword, new Date(), maTK]
            );
            return result.affectedRows > 0;
        } catch (error) {
            if (error.code !== 'ER_BAD_FIELD_ERROR') throw error; // chưa chạy migration 14
            const [result] = await db.execute("UPDATE TaiKhoan SET MatKhau = ? WHERE MaTK = ?", [hashedPassword, maTK]);
            return result.affectedRows > 0;
        }
    }
}

module.exports = TaiKhoanModel;
