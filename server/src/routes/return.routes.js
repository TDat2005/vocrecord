const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const DonHangModel = require('../models/donhang.model');
const GHNService = require('../services/ghn.service');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const editor = [authenticate, requireRole('admin', 'nhanvien')];
const RETURN_REASONS = ['hang_loi', 'sai_san_pham', 'thieu_hang', 'hu_hong_van_chuyen', 'khac'];
const RETURN_STATUSES = ['moi', 'dangxuly', 'chapnhan', 'tuchoi', 'danghoan', 'hoantat'];

const returnSelect = `
    SELECT yc.MaYCT as id, yc.MaDH as order_id, yc.MaKH as customer_id, yc.LyDo as reason,
           yc.MoTa as description, yc.BangChung as evidence, yc.TrangThai as status,
           yc.SoTienHoan as refund_amount, yc.TrangThaiHoanTien as refund_status,
           yc.GhiChuAdmin as admin_note, yc.DaNhapKho as restocked,
           yc.NgayTao as created_at, yc.NgayCapNhat as updated_at,
           dh.TongTien as order_total, dh.TrangThai as order_status, dh.MaDonGHN as ghn_order_code, dh.GHNTrangThai as ghn_status,
           kh.HoTen as customer_name, kh.Email as customer_email
    FROM YeuCauTraHang yc
    JOIN DonHang dh ON dh.MaDH = yc.MaDH
    JOIN KhachHang kh ON kh.MaKH = yc.MaKH`;

const getReturn = async (id) => {
    const [rows] = await pool.query(`${returnSelect} WHERE yc.MaYCT=?`, [id]);
    return rows[0];
};

router.post('/', authenticate, async (req, res, next) => {
    let connection;
    try {
        const customerId = req.user.customerId;
        if (!customerId) return res.status(403).json({ success: false, message: 'Tài khoản không phải khách hàng' });
        const { order_id: orderId, reason, description = '', evidence = '', items = [] } = req.body;
        if (!orderId || !RETURN_REASONS.includes(reason) || !String(description).trim()) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin yêu cầu trả hàng' });
        }

        const order = await DonHangModel.getById(orderId, customerId);
        if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng của bạn' });
        const ageDays = (Date.now() - new Date(order.NgayDat).getTime()) / 86400000;
        const allowedGHNStatuses = ['delivered', 'damage', 'lost', 'returned', 'return', 'return_fail'];
        if (order.TrangThai !== 'hoanthanh' && !allowedGHNStatuses.includes(String(order.GHNTrangThai || '').toLowerCase())) {
            return res.status(400).json({ success: false, message: 'Chỉ có thể yêu cầu trả hàng sau khi đơn đã giao hoặc được GHN ghi nhận lỗi' });
        }
        if (ageDays > Number(process.env.RETURN_WINDOW_DAYS || 7)) {
            return res.status(400).json({ success: false, message: `Đã quá thời hạn đổi trả ${process.env.RETURN_WINDOW_DAYS || 7} ngày` });
        }

        const [existing] = await pool.query("SELECT MaYCT FROM YeuCauTraHang WHERE MaDH=? AND MaKH=? AND TrangThai NOT IN ('tuchoi', 'hoantat')", [orderId, customerId]);
        if (existing.length) return res.status(409).json({ success: false, message: 'Đơn hàng đang có yêu cầu trả hàng được xử lý' });

        const [orderItems] = await pool.query('SELECT MaCTDH, MaSP, SoLuong, DonGia FROM ChiTietDonHang WHERE MaDH=?', [orderId]);
        const requestedItems = Array.isArray(items) && items.length ? items : orderItems.map((item) => ({ detail_id: item.MaCTDH, quantity: item.SoLuong }));
        const normalized = [];
        let refundAmount = 0;
        for (const requested of requestedItems) {
            const found = orderItems.find((item) => String(item.MaCTDH) === String(requested.detail_id) || String(item.MaSP) === String(requested.product_id));
            const quantity = Number(requested.quantity);
            if (!found || !Number.isInteger(quantity) || quantity < 1 || quantity > found.SoLuong) {
                return res.status(400).json({ success: false, message: 'Sản phẩm hoặc số lượng trả không hợp lệ' });
            }
            normalized.push({ detailId: found.MaCTDH, productId: found.MaSP, quantity });
            refundAmount += Number(found.DonGia) * quantity;
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();
        const [result] = await connection.query(
            "INSERT INTO YeuCauTraHang (MaDH, MaKH, LyDo, MoTa, BangChung, TrangThai, SoTienHoan, TrangThaiHoanTien) VALUES (?, ?, ?, ?, ?, 'moi', ?, 'choxuly')",
            [orderId, customerId, reason, String(description).trim(), typeof evidence === 'string' ? evidence : JSON.stringify(evidence), refundAmount]
        );
        for (const item of normalized) {
            await connection.query('INSERT INTO YeuCauTraHangChiTiet (MaYCT, MaCTDH, MaSP, SoLuong) VALUES (?, ?, ?, ?)', [result.insertId, item.detailId, item.productId, item.quantity]);
        }
        await connection.commit();
        connection.release();
        res.status(201).json({ success: true, message: 'Đã gửi yêu cầu trả hàng', id: result.insertId, refund_amount: refundAmount });
    } catch (error) {
        if (connection) { await connection.rollback(); connection.release(); }
        next(error);
    }
});

router.get('/mine', authenticate, async (req, res, next) => {
    try {
        if (!req.user.customerId) return res.status(403).json({ success: false, message: 'Tài khoản không phải khách hàng' });
        const [rows] = await pool.query(`${returnSelect} WHERE yc.MaKH=? ORDER BY yc.NgayTao DESC`, [req.user.customerId]);
        res.json({ success: true, data: rows });
    } catch (error) { next(error); }
});

router.get('/manage', ...editor, async (req, res, next) => {
    try {
        const status = req.query.status && RETURN_STATUSES.includes(req.query.status) ? req.query.status : null;
        const params = [];
        let query = `${returnSelect} WHERE 1=1`;
        if (status) { query += ' AND yc.TrangThai=?'; params.push(status); }
        query += ' ORDER BY yc.NgayTao DESC LIMIT 200';
        const [rows] = await pool.query(query, params);
        res.json({ success: true, data: rows });
    } catch (error) { next(error); }
});

router.get('/:id', authenticate, async (req, res, next) => {
    try {
        const item = await getReturn(req.params.id);
        if (!item || (req.user.role === 'khachhang' && item.customer_id !== req.user.customerId)) return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu' });
        const [details] = await pool.query(`SELECT ct.MaSP as product_id, ct.SoLuong as quantity, sp.TenSP as product_title, sp.HinhAnh as image
            FROM YeuCauTraHangChiTiet ct JOIN SanPham sp ON sp.MaSP=ct.MaSP WHERE ct.MaYCT=?`, [req.params.id]);
        res.json({ success: true, data: { ...item, items: details } });
    } catch (error) { next(error); }
});

router.put('/:id/status', ...editor, async (req, res, next) => {
    let connection;
    try {
        const status = String(req.body.status || '');
        if (!RETURN_STATUSES.includes(status)) return res.status(400).json({ success: false, message: 'Trạng thái trả hàng không hợp lệ' });
        const item = await getReturn(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu' });

        const refundAmount = req.body.refund_amount === undefined || req.body.refund_amount === null || req.body.refund_amount === ''
            ? null
            : Number(req.body.refund_amount);
        if (refundAmount !== null && (!Number.isFinite(refundAmount) || refundAmount < 0 || refundAmount > Number(item.order_total))) {
            return res.status(400).json({ success: false, message: 'Số tiền hoàn không hợp lệ' });
        }

        let refundStatus = item.refund_status;
        if (status === 'chapnhan' || status === 'danghoan') refundStatus = 'choxuly';
        if (status === 'hoantat') refundStatus = 'daxuly';
        if (status === 'tuchoi') refundStatus = 'thatbai';

        if (req.body.triggerGhnReturn && item.ghn_order_code && ['delivery_fail', 'storing', 'waiting_to_return', 'return'].includes(String(item.ghn_status || item.order_status).toLowerCase())) {
            await GHNService.returnOrder([item.ghn_order_code]);
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();
        const [lockedRows] = await connection.query(
            'SELECT TrangThai, DaNhapKho FROM YeuCauTraHang WHERE MaYCT=? FOR UPDATE',
            [req.params.id]
        );
        const lockedItem = lockedRows[0];
        if (!lockedItem) {
            const notFound = new Error('Không tìm thấy yêu cầu');
            notFound.status = 404;
            throw notFound;
        }
        const [result] = await connection.query(
            'UPDATE YeuCauTraHang SET TrangThai=?, TrangThaiHoanTien=?, SoTienHoan=COALESCE(?, SoTienHoan), GhiChuAdmin=? WHERE MaYCT=?',
            [status, refundStatus, refundAmount, String(req.body.admin_note || '').trim().slice(0, 2000) || null, req.params.id]
        );
        if (status === 'hoantat' && !lockedItem.DaNhapKho) {
            const [details] = await connection.query('SELECT MaSP, SoLuong FROM YeuCauTraHangChiTiet WHERE MaYCT=?', [req.params.id]);
            for (const detail of details) await connection.query('UPDATE SanPham SET SoLuongTon=SoLuongTon+? WHERE MaSP=?', [detail.SoLuong, detail.MaSP]);
            await connection.query('UPDATE YeuCauTraHang SET DaNhapKho=TRUE WHERE MaYCT=?', [req.params.id]);
        }
        await connection.commit();
        connection.release();
        res.json({ success: result.affectedRows > 0, message: 'Đã cập nhật yêu cầu trả hàng' });
    } catch (error) {
        if (connection) { await connection.rollback(); connection.release(); }
        next(error);
    }
});

module.exports = router;
