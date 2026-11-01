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
        const db = connection || pool;
        const [result] = await db.execute(
            "INSERT INTO KhachHang (HoTen, Email, SoDienThoai, DiaChi, MaTK) VALUES (?, ?, ?, ?, ?)",
            [hoTen, email, phone || null, diaChi || null, maTK]
        );
        return result.insertId;
    }

    static async updateProfile(customerId, fullName, phone, address, connection = pool) {
        const db = connection || pool;
        // address = undefined: giữ nguyên địa chỉ cũ (form hồ sơ chỉ gửi họ tên và số điện thoại).
        const [result] = await db.execute(
            "UPDATE KhachHang SET HoTen = ?, SoDienThoai = ?, DiaChi = COALESCE(?, DiaChi) WHERE MaKH = ?",
            [fullName, phone, address === undefined ? null : address, customerId]
        );
        return result.affectedRows > 0;
    }

    static async getAddresses(customerId) {
        const [rows] = await pool.execute(
            "SELECT * FROM SoDiaChi WHERE MaKH = ? ORDER BY MacDinh DESC, NgayTao DESC",
            [customerId]
        );
        return rows;
    }

    static async addAddress(customerId, nguoiNhan, sdt, diaChi, ghn = {}, connection = pool) {
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

    // Xóa địa chỉ mặc định thì địa chỉ mới nhất còn lại trở thành mặc định.
    static async deleteAddress(customerId, addressId, connection = pool) {
        const db = connection || pool;
        const [[address]] = await db.execute("SELECT MacDinh FROM SoDiaChi WHERE MaDC = ? AND MaKH = ?", [addressId, customerId]);
        if (!address) return false;
        await db.execute("DELETE FROM SoDiaChi WHERE MaDC = ? AND MaKH = ?", [addressId, customerId]);
        if (Number(address.MacDinh) === 1) {
            await db.execute("UPDATE SoDiaChi SET MacDinh = 1 WHERE MaKH = ? ORDER BY NgayTao DESC, MaDC DESC LIMIT 1", [customerId]);
        }
        return true;
    }

    // Kiểm tra địa chỉ thuộc về khách trước khi đổi cờ mặc định (trước đây truyền sai mã địa chỉ thì khách
    // mất luôn địa chỉ mặc định). Một câu UPDATE đặt cờ cho cả sổ địa chỉ nên không bao giờ có 2 địa chỉ mặc định.
    static async setDefaultAddress(customerId, addressId, connection = pool) {
        const db = connection || pool;
        const [rows] = await db.execute("SELECT MaDC FROM SoDiaChi WHERE MaDC = ? AND MaKH = ?", [addressId, customerId]);
        if (!rows.length) return false;
        await db.execute("UPDATE SoDiaChi SET MacDinh = (MaDC = ?) WHERE MaKH = ?", [addressId, customerId]);
        return true;
    }
}

module.exports = KhachHangModel;
