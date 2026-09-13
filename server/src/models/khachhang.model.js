const pool = require('../config/database');

class KhachHangModel {
    static async getProfile(customerId, connection = pool) {
        const db = connection || pool;
        const [rows] = await db.execute("SELECT * FROM KhachHang WHERE MaKH = ?", [customerId]);
        return rows[0];
    }

    static async getByAccountId(maTK, connection = pool) {
        const db = connection || pool;
        const [rows] = await db.execute("SELECT * FROM KhachHang WHERE MaTK = ?", [maTK]);
        return rows[0];
    }

    static async findByEmail(email, connection = pool) {
        const db = connection || pool;
        const [rows] = await db.execute("SELECT * FROM KhachHang WHERE Email = ?", [email]);
        return rows[0];
    }

    static async create(hoTen, email, maTK, phone = null, diaChi = null, connection = pool) {
        // Hỗ trợ nếu truyền connection ở vị trí thứ 4 (tương thích ngược)
        if (phone && typeof phone.execute === 'function') {
            connection = phone;
            phone = null;
            diaChi = null;
        }
        const db = connection || pool;
        const [result] = await db.execute(
            "INSERT INTO KhachHang (HoTen, Email, SoDienThoai, DiaChi, MaTK) VALUES (?, ?, ?, ?, ?)",
            [hoTen, email, phone || null, diaChi || null, maTK]
        );
        return result.insertId;
    }

    static async updateProfile(customerId, fullName, phone, address, connection = pool) {
        const db = connection || pool;
        const [result] = await db.execute(
            "UPDATE KhachHang SET HoTen = ?, SoDienThoai = ?, DiaChi = ? WHERE MaKH = ?",
            [fullName, phone, address, customerId]
        );
        return result.affectedRows > 0;
    }

    static async getAll() {
        const [rows] = await pool.query(`
            SELECT k.MaKH as id, k.HoTen as name, k.Email as email, k.SoDienThoai as phone, 
                   COUNT(d.MaDH) as totalOrders, SUM(d.TongTien) as totalSpent
            FROM KhachHang k
            LEFT JOIN DonHang d ON k.MaKH = d.MaKH
            GROUP BY k.MaKH
            ORDER BY k.MaKH DESC
        `);
        return rows;
    }

    static async getAddresses(customerId) {
        const [rows] = await pool.execute(
            "SELECT * FROM SoDiaChi WHERE MaKH = ? ORDER BY MacDinh DESC, NgayTao DESC",
            [customerId]
        );
        return rows;
    }

    static async addAddress(customerId, nguoiNhan, sdt, diaChi, ghn = {}, connection = pool) {
        // Backward-compatible signature: addAddress(..., connection)
        if (ghn && typeof ghn.execute === 'function') {
            connection = ghn;
            ghn = {};
        }
        const db = connection || pool;
        // Kiểm tra xem đã tồn tại y hệt chưa
        const [rows] = await db.execute(
            "SELECT MaDC FROM SoDiaChi WHERE MaKH = ? AND NguoiNhan = ? AND SoDienThoai = ? AND DiaChi = ?",
            [customerId, nguoiNhan, sdt, diaChi]
        );
        
        if (rows.length > 0) {
            return false; // Đã tồn tại
        }

        const [result] = await db.execute(
            "INSERT INTO SoDiaChi (MaKH, NguoiNhan, SoDienThoai, DiaChi, GHNTinh, GHNPhuong, GHNProvinceId, GHNWardId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [customerId, nguoiNhan, sdt, diaChi, ghn.provinceName || null, ghn.wardName || null, ghn.provinceId || null, ghn.wardId || null]
        );
        return result.insertId;
    }

    static async createAddress(customerId, { nguoiNhan, soDienThoai, diaChi, ghn = {}, isDefault = false }, connection = pool) {
        const db = connection || pool;
        const [existing] = await db.execute("SELECT MaDC FROM SoDiaChi WHERE MaKH = ?", [customerId]);
        const shouldBeDefault = isDefault || existing.length === 0 ? 1 : 0;
        
        if (shouldBeDefault === 1 && existing.length > 0) {
            await db.execute("UPDATE SoDiaChi SET MacDinh = 0 WHERE MaKH = ?", [customerId]);
        }

        const [result] = await db.execute(
            "INSERT INTO SoDiaChi (MaKH, NguoiNhan, SoDienThoai, DiaChi, GHNTinh, GHNPhuong, GHNProvinceId, GHNWardId, MacDinh) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                customerId,
                nguoiNhan,
                soDienThoai,
                diaChi,
                ghn.provinceName || null,
                ghn.wardName || null,
                ghn.provinceId || null,
                ghn.wardId || null,
                shouldBeDefault
            ]
        );
        return result.insertId;
    }

    static async deleteAddress(customerId, addressId, connection = pool) {
        const db = connection || pool;
        const [result] = await db.execute(
            "DELETE FROM SoDiaChi WHERE MaDC = ? AND MaKH = ?",
            [addressId, customerId]
        );
        return result.affectedRows > 0;
    }

    static async setDefaultAddress(customerId, addressId, connection = pool) {
        const db = connection || pool;
        await db.execute("UPDATE SoDiaChi SET MacDinh = 0 WHERE MaKH = ?", [customerId]);
        const [result] = await db.execute(
            "UPDATE SoDiaChi SET MacDinh = 1 WHERE MaDC = ? AND MaKH = ?",
            [addressId, customerId]
        );
        return result.affectedRows > 0;
    }
}

module.exports = KhachHangModel;
