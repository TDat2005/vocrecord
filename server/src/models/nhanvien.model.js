const pool = require('../config/database');

class NhanVienModel {
    static async getAll() {
        const [rows] = await pool.query(`
            SELECT nv.MaNV as id, tk.TenDangNhap as username, nv.HoTen as name, nv.ChucVu as position, tk.VaiTro as role, tk.TrangThai as status, tk.MaTK as account_id
            FROM NhanVien nv
            JOIN TaiKhoan tk ON nv.MaTK = tk.MaTK
            ORDER BY nv.MaNV DESC
        `);
        return rows;
    }

    static async createAuth(username, hashedPassword, role, connection = pool) {
        const [result] = await connection.execute(
            "INSERT INTO TaiKhoan (TenDangNhap, MatKhau, VaiTro, TrangThai) VALUES (?, ?, ?, 1)",
            [username, hashedPassword, role]
        );
        return result.insertId;
    }

    static async createProfile(hoTen, chucVu, maTK, connection = pool) {
        const [result] = await connection.execute(
            "INSERT INTO NhanVien (HoTen, ChucVu, MaTK) VALUES (?, ?, ?)",
            [hoTen, chucVu, maTK]
        );
        return result.insertId;
    }

    static async updateProfile(maNV, hoTen, chucVu, connection = pool) {
        const db = connection || pool;
        const [result] = await db.execute(
            "UPDATE NhanVien SET HoTen = ?, ChucVu = ? WHERE MaNV = ?",
            [hoTen, chucVu, maNV]
        );
        return result.affectedRows > 0;
    }

    static async updateAuth(maTK, role, connection = pool) {
        const db = connection || pool;
        const [result] = await db.execute(
            "UPDATE TaiKhoan SET VaiTro = ? WHERE MaTK = ?",
            [role, maTK]
        );
        return result.affectedRows > 0;
    }
    
    static async updatePassword(maTK, hashedPassword, connection = pool) {
        const db = connection || pool;
        const [result] = await db.execute(
            "UPDATE TaiKhoan SET MatKhau = ? WHERE MaTK = ?",
            [hashedPassword, maTK]
        );
        return result.affectedRows > 0;
    }

    static async toggleStatus(maTK, status, connection = pool) {
        const db = connection || pool;
        const [result] = await db.execute(
            "UPDATE TaiKhoan SET TrangThai = ? WHERE MaTK = ?",
            [status, maTK]
        );
        return result.affectedRows > 0;
    }
}

module.exports = NhanVienModel;
