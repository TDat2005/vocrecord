const pool = require('../config/database');

class DonHangModel {
    static async create(customerId, total, address, nguoiNhan, sdtNhan, ghiChu, phuongThucThanhToan, codeGiamGia = null, soTienGiam = 0, connection = pool) {
        const [result] = await connection.execute(
            "INSERT INTO DonHang (MaKH, TongTien, TrangThai, DiaChiGiao, NguoiNhan, SDTNhan, GhiChu, PhuongThucThanhToan, CodeGiamGia, SoTienGiam) VALUES (?, ?, 'choxacnhan', ?, ?, ?, ?, ?, ?, ?)",
            [customerId, total, address, nguoiNhan, sdtNhan, ghiChu, phuongThucThanhToan, codeGiamGia, soTienGiam]
        );
        return result.insertId;
    }

    static async addItem(maDH, maSP, soLuong, donGia, connection = pool) {
        const [result] = await connection.execute(
            "INSERT INTO ChiTietDonHang (MaDH, MaSP, SoLuong, DonGia) VALUES (?, ?, ?, ?)",
            [maDH, maSP, soLuong, donGia]
        );
        return result.affectedRows > 0;
    }

    static async createPayment(maDH, soTien, hinhThuc, trangThai, maGiaoDich, connection = pool) {
        const [result] = await connection.execute(
            "INSERT INTO ThanhToan (MaDH, SoTien, HinhThuc, TrangThaiTT, MaGiaoDich) VALUES (?, ?, ?, ?, ?)",
            [maDH, soTien, hinhThuc, trangThai, maGiaoDich]
        );
        return result.affectedRows > 0;
    }

    static async getByCustomer(customerId, limit = 100, offset = 0) {
        const [rows] = await pool.execute(
            "SELECT * FROM DonHang WHERE MaKH = ? ORDER BY NgayDat DESC LIMIT ? OFFSET ?",
            [customerId, limit, offset]
        );
        return rows;
    }

    static async getAll(limit = 100, offset = 0) {
        const [rows] = await pool.query(
            "SELECT dh.*, kh.HoTen, kh.SoDienThoai FROM DonHang dh LEFT JOIN KhachHang kh ON dh.MaKH = kh.MaKH ORDER BY dh.NgayDat DESC LIMIT ? OFFSET ?",
            [limit, offset]
        );
        return rows;
    }

    static async getById(orderId, customerId = null) {
        let q = "SELECT dh.*, tt.HinhThuc as ThanhToanHinhThuc, tt.TrangThaiTT, tt.MaGiaoDich FROM DonHang dh LEFT JOIN ThanhToan tt ON dh.MaDH = tt.MaDH WHERE dh.MaDH = ?";
        const params = [orderId];
        if (customerId) {
            q += " AND dh.MaKH = ?";
            params.push(customerId);
        }
        const [rows] = await pool.execute(q, params);
        return rows[0];
    }

    static async getOrderItems(orderId, connection = pool) {
        const [rows] = await connection.execute(
            "SELECT ct.*, sp.TenSP, sp.HinhAnh, sp.NgheSi FROM ChiTietDonHang ct JOIN SanPham sp ON ct.MaSP = sp.MaSP WHERE ct.MaDH = ?",
            [orderId]
        );
        return rows;
    }

    static async updateStatus(orderId, status, adminId = null) {
        const [result] = await pool.execute(
            "UPDATE DonHang SET TrangThai = ?, MaNVXuLy = ? WHERE MaDH = ?",
            [status, adminId, orderId]
        );
        return result.affectedRows > 0;
    }

    static async getStatus(orderId, customerId) {
        const [rows] = await pool.execute(
            "SELECT TrangThai FROM DonHang WHERE MaDH = ? AND MaKH = ?",
            [orderId, customerId]
        );
        return rows[0];
    }

    static async cancel(orderId, connection = pool) {
        const [result] = await connection.execute(
            "UPDATE DonHang SET TrangThai = 'dahuy' WHERE MaDH = ? AND TrangThai NOT IN ('danggiaohang', 'hoanthanh', 'dahuy')",
            [orderId]
        );
        return result.affectedRows > 0;
    }

    static async getPaymentByOrderCode(orderCode) {
        const [rows] = await pool.execute(
            "SELECT tt.*, dh.MaDH, dh.TrangThai as TrangThaiDH FROM ThanhToan tt JOIN DonHang dh ON tt.MaDH = dh.MaDH WHERE tt.MaGiaoDich = ?",
            [String(orderCode)]
        );
        return rows[0];
    }

    static async updatePaymentStatus(maDH, trangThai) {
        const [result] = await pool.execute(
            "UPDATE ThanhToan SET TrangThaiTT = ?, NgayTT = NOW() WHERE MaDH = ?",
            [trangThai, maDH]
        );
        return result.affectedRows > 0;
    }

    static async getPaymentByOrderId(orderId) {
        const [rows] = await pool.execute(
            "SELECT * FROM ThanhToan WHERE MaDH = ?",
            [orderId]
        );
        return rows[0];
    }
}

module.exports = DonHangModel;
