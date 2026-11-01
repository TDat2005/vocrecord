const pool = require('../config/database');
const TradeInOrderHooks = require('../services/tradein/order-hooks');

const PAYMENT_JOIN = 'LEFT JOIN ThanhToan tt ON dh.MaDH = tt.MaDH';

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
        const [rows] = await pool.query(
            // Kèm trạng thái thanh toán: trang Tài khoản cần biết đơn PayOS đã trả tiền để hỏi thông tin hoàn tiền khi hủy.
            `SELECT dh.*, tt.TrangThaiTT FROM DonHang dh ${PAYMENT_JOIN} WHERE dh.MaKH = ? ORDER BY dh.NgayDat DESC LIMIT ? OFFSET ?`,
            [customerId, limit, offset]
        );
        return rows;
    }

    // Danh sách đơn cho nhân viên, có tìm kiếm (mã đơn, tên khách/người nhận, SĐT) và lọc trạng thái.
    // status = 'refund': đơn đang chờ cửa hàng hoàn tiền.
    static async search({ q = '', status = '', limit = 50, offset = 0 } = {}) {
        const where = [];
        const params = [];
        if (status === 'refund') {
            where.push("dh.TrangThaiHoanTien = 'choxuly'");
        } else if (status) {
            where.push('dh.TrangThai = ?');
            params.push(status);
        }
        const keyword = String(q).trim().replace(/^ORD-0*/i, '');
        if (keyword) {
            where.push('(dh.MaDH = ? OR kh.HoTen LIKE ? OR dh.NguoiNhan LIKE ? OR dh.SDTNhan LIKE ?)');
            params.push(Number(keyword) || 0, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
        }
        const from = `FROM DonHang dh LEFT JOIN KhachHang kh ON dh.MaKH = kh.MaKH ${PAYMENT_JOIN} ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`;
        const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total ${from}`, params);
        const [rows] = await pool.query(
            `SELECT dh.*, kh.HoTen, kh.SoDienThoai, tt.TrangThaiTT ${from} ORDER BY dh.NgayDat DESC LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );
        return { rows, total: Number(total) };
    }

    static async getById(orderId, customerId = null) {
        let q = `SELECT dh.*, tt.HinhThuc as ThanhToanHinhThuc, tt.TrangThaiTT, tt.MaGiaoDich, tt.DuLieuThanhToan FROM DonHang dh ${PAYMENT_JOIN} WHERE dh.MaDH = ?`;
        const params = [orderId];
        if (customerId) {
            q += " AND dh.MaKH = ?";
            params.push(customerId);
        }
        const [rows] = await pool.execute(q, params);
        return rows[0];
    }

    // Đọc và khóa dòng đơn (cùng dòng thanh toán) trong transaction: hai thao tác cùng lúc trên một đơn
    // (nhân viên hủy, khách hủy, webhook PayOS/GHN, tiến trình tự hủy) phải chờ nhau thay vì ghi đè nhau.
    static async lockById(orderId, connection) {
        const [rows] = await connection.query(
            `SELECT dh.*, tt.HinhThuc as ThanhToanHinhThuc, tt.TrangThaiTT, tt.MaGiaoDich FROM DonHang dh ${PAYMENT_JOIN} WHERE dh.MaDH = ? FOR UPDATE`,
            [orderId]
        );
        return rows[0] || null;
    }

    // Dòng thanh toán theo mã giao dịch PayOS (orderCode trong webhook).
    static async findPaymentByTransaction(orderCode) {
        const [rows] = await pool.execute('SELECT MaDH, TrangThaiTT FROM ThanhToan WHERE MaGiaoDich = ?', [String(orderCode)]);
        return rows[0] || null;
    }

    static async getOrderItems(orderId, connection = pool) {
        const [rows] = await connection.execute(
            "SELECT ct.*, sp.TenSP, sp.HinhAnh, sp.NgheSi FROM ChiTietDonHang ct JOIN SanPham sp ON ct.MaSP = sp.MaSP WHERE ct.MaDH = ?",
            [orderId]
        );
        return rows;
    }

    /**
     * Trả lại tài nguyên khi một đơn bị hủy: cộng lại tồn kho, trả lại 1 lượt dùng mã giảm giá
     * và hoàn phần đã trả bằng ví tín dụng.
     * restock = false: hàng không về lại kho (GHN báo mất/hỏng) nhưng vẫn hoàn lượt mã và tiền ví cho khách.
     * Chỉ gọi đúng một lần cho mỗi đơn, ngay sau câu UPDATE chuyển đơn sang 'dahuy' có affectedRows > 0.
     */
    static async releaseCancelledOrder(orderId, connection = pool, { restock = true } = {}) {
        if (restock) {
            const items = await this.getOrderItems(orderId, connection);
            for (const item of items) {
                await connection.execute('UPDATE SanPham SET SoLuongTon = SoLuongTon + ? WHERE MaSP = ?', [item.SoLuong, item.MaSP]);
            }
        }
        await connection.execute(
            `UPDATE MaGiamGia mg JOIN DonHang dh ON dh.CodeGiamGia COLLATE utf8mb4_unicode_ci = mg.Code
             SET mg.DaDung = GREATEST(mg.DaDung - 1, 0)
             WHERE dh.MaDH = ? AND dh.SoTienGiam > 0`,
            [orderId]
        );
        await TradeInOrderHooks.refundCancelledOrder(orderId, connection);
    }

    /**
     * Đơn chuyển sang hoàn thành (nhân viên cập nhật hoặc GHN báo đã giao): ghi nhận tiền COD đã thu
     * và tính tiền cho người ký gửi nếu đơn có đĩa ký gửi.
     */
    static async onCompleted(orderId, connection = pool) {
        // Ngày giao thành công: hạn đổi trả và doanh thu tính theo ngày này.
        await connection.execute('UPDATE DonHang SET NgayHoanThanh = COALESCE(NgayHoanThanh, NOW()) WHERE MaDH = ?', [orderId]);
        await this.markCodPaid(orderId, connection);
        await TradeInOrderHooks.settleCompletedOrder(orderId, connection);
    }

    /** Đơn COD giao thành công nghĩa là shipper đã thu tiền: ghi nhận thanh toán. */
    static async markCodPaid(orderId, connection = pool) {
        await connection.execute(
            "UPDATE ThanhToan SET TrangThaiTT = 'dathanhtoan', NgayTT = NOW() WHERE MaDH = ? AND HinhThuc = 'cod' AND TrangThaiTT <> 'dathanhtoan'",
            [orderId]
        );
    }
}

module.exports = DonHangModel;
