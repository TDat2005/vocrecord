const pool = require('../config/database');

class OtpModel {
    /**
     * Tạo OTP mới (hết hạn sau 5 phút)
     * Xóa OTP cũ cùng loại trước khi tạo mới
     */
    static async create(email, code, type = 'dangky') {
        // Xóa OTP cũ chưa dùng cùng loại
        await pool.execute(
            "DELETE FROM OtpCodes WHERE Email = ? AND LoaiOTP = ? AND DaSuDung = FALSE",
            [email, type]
        );

        // Tạo OTP mới, hết hạn sau 5 phút
        const hetHan = new Date(Date.now() + 5 * 60 * 1000);
        
        const [result] = await pool.execute(
            "INSERT INTO OtpCodes (Email, MaCode, LoaiOTP, HetHan) VALUES (?, ?, ?, ?)",
            [email, code, type, hetHan]
        );
        return result.insertId;
    }

    /**
     * Xác thực OTP: kiểm tra đúng mã, chưa hết hạn, chưa sử dụng
     */
    static async verify(email, code, type = 'dangky', connection = pool) {
        const db = connection || pool;
        const [rows] = await db.execute(
            `SELECT * FROM OtpCodes 
             WHERE Email = ? AND MaCode = ? AND LoaiOTP = ? 
             AND DaSuDung = FALSE AND HetHan > NOW() 
             ORDER BY NgayTao DESC LIMIT 1`,
            [email, code, type]
        );
        return rows[0];
    }

    /**
     * Đánh dấu OTP đã sử dụng
     */
    static async markUsed(email, code, connection = pool) {
        const db = connection || pool;
        const [result] = await db.execute(
            "UPDATE OtpCodes SET DaSuDung = TRUE WHERE Email = ? AND MaCode = ?",
            [email, code]
        );
        return result.affectedRows > 0;
    }

    /**
     * Dọn dẹp OTP hết hạn
     */
    static async cleanExpired() {
        const [result] = await pool.execute("DELETE FROM OtpCodes WHERE HetHan < NOW()");
        return result.affectedRows;
    }
}

module.exports = OtpModel;
