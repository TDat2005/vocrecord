const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const DonHangModel = require('../models/donhang.model');
const GHNService = require('../services/ghn.service');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const editor = [authenticate, requireRole('admin', 'nhanvien')];

const mapGHNStatus = (status) => {
    const value = String(status || '').toLowerCase();
    if (['delivered', 'money_collect_delivering'].includes(value)) return 'hoanthanh';
    if (['cancel', 'returned', 'return_fail', 'lost', 'damage'].includes(value)) return 'dahuy';
    if (['ready_to_pick', 'picking', 'money_collect_picking'].includes(value)) return 'dangchuanbihang';
    if (value) return 'danggiaohang';
    return null;
};

const parseDate = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const syncLocalOrder = async (orderCode, data = {}) => {
    if (!orderCode) return null;
    const status = data.status || data.Status || '';
    const reason = data.reason || data.Reason || null;
    const fee = data.total_fee || data.totalFee || data.fee?.total || data.Fee?.Total || null;
    const eta = parseDate(data.leadtime || data.expected_delivery_time || data.ExpectedDeliveryTime);
    const localStatus = mapGHNStatus(status);
    const [result] = await pool.query(
        `UPDATE DonHang SET GHNTrangThai = ?, GHNReason = ?, GHNLastSync = NOW(),
         GHNExpectedDelivery = COALESCE(?, GHNExpectedDelivery),
         PhiVanChuyen = COALESCE(?, PhiVanChuyen),
         TrangThai = COALESCE(?, TrangThai)
         WHERE MaDonGHN = ?`,
        [status || null, reason, eta, fee, localStatus, orderCode]
    );
    return result.affectedRows > 0;
};

const createShipment = async (orderId, shipping = {}) => {
    const order = await DonHangModel.getById(orderId);
    if (!order) {
        const error = new Error('Không tìm thấy đơn hàng');
        error.status = 404;
        throw error;
    }
    if (order.TrangThai !== 'daxacnhan') {
        const error = new Error('Chỉ có thể tạo vận đơn GHN khi đơn hàng đã ở trạng thái "Đã xác nhận"!');
        error.status = 400;
        throw error;
    }
    const items = await DonHangModel.getOrderItems(orderId);
    const payload = GHNService.buildOrderPayload(order, items, shipping);
    
    if (!payload.to_province_name) payload.to_province_name = order.GHNProvinceName || 'Hồ Chí Minh';
    if (!payload.to_ward_name) payload.to_ward_name = order.GHNWardName || 'Phường Bến Nghé (Quận 1)';
    if (!payload.to_name) payload.to_name = order.NguoiNhan;
    if (!payload.to_phone) payload.to_phone = order.SDTNhan;
    if (!payload.to_address) payload.to_address = order.DiaChiGiao;

    const data = await GHNService.createOrder(payload);
    const expectedDelivery = parseDate(data?.expected_delivery_time);
    await pool.query(
        `UPDATE DonHang SET MaDonGHN = ?, GHNTrangThai = ?, PhiVanChuyen = ?, GHNExpectedDelivery = ?, GHNLastSync = NOW(), GHNReason = NULL,
         GHNProvinceName = COALESCE(?, GHNProvinceName), GHNWardName = COALESCE(?, GHNWardName),
         TrangThai = 'danggiaohang'
         WHERE MaDH = ?`,
        [data.order_code, 'ready_to_pick', data.total_fee || 0, expectedDelivery, payload.to_province_name, payload.to_ward_name, orderId]
    );
    return { data, payload };
};

// GHN master data is proxied so the token never reaches the browser.
router.get('/ghn/provinces', async (req, res, next) => {
    try { res.json({ success: true, data: await GHNService.getProvinces() }); } catch (error) { next(error); }
});

router.get('/ghn/wards', async (req, res, next) => {
    try {
        if (!req.query.province_id) return res.status(400).json({ success: false, message: 'Thiếu province_id' });
        res.json({ success: true, data: await GHNService.getWards(req.query.province_id) });
    } catch (error) { next(error); }
});

router.post('/ghn/fee', async (req, res, next) => {
    try { res.json({ success: true, data: await GHNService.calculateFee(req.body) }); } catch (error) { next(error); }
});

router.post('/orders/:id/create', ...editor, async (req, res, next) => {
    try {
        const result = await createShipment(req.params.id, req.body || {});
        res.json({ success: true, message: 'Đã tạo đơn GHN', data: result.data });
    } catch (error) { next(error); }
});

router.get('/orders/:id', authenticate, async (req, res, next) => {
    try {
        const order = await DonHangModel.getById(req.params.id, req.user.role === 'admin' || req.user.role === 'nhanvien' ? null : req.user.customerId);
        if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        if (!order.MaDonGHN) return res.json({ success: true, data: { local: order, ghn: null } });
        const ghn = await GHNService.getOrderInfo(order.MaDonGHN);
        await syncLocalOrder(order.MaDonGHN, ghn);
        res.json({ success: true, data: { local: order, ghn } });
    } catch (error) { next(error); }
});

router.post('/orders/:id/cancel', ...editor, async (req, res, next) => {
    try {
        const order = await DonHangModel.getById(req.params.id);
        if (!order?.MaDonGHN) return res.status(400).json({ success: false, message: 'Đơn chưa có mã GHN' });
        const data = await GHNService.cancelOrder([order.MaDonGHN], req.body.reason_code, req.body.reason);
        const result = Array.isArray(data) ? data[0] : data;
        if (result?.result) await pool.query("UPDATE DonHang SET TrangThai='dahuy', GHNTrangThai='cancel', GHNLastSync=NOW() WHERE MaDH=?", [req.params.id]);
        res.json({ success: Boolean(result?.result), data });
    } catch (error) { next(error); }
});

// GHN calls this endpoint after every status change. Register the URL in the GHN dashboard.
router.post('/webhook/ghn', async (req, res, next) => {
    try {
        const event = req.body || {};
        const orderCode = event.OrderCode || event.order_code || event.orderCode;
        const status = event.Status || event.status;
        if (!orderCode) return res.status(400).json({ success: false, message: 'Thiếu mã đơn GHN' });
        await syncLocalOrder(orderCode, event);
        res.json({ success: true, order_code: orderCode, status });
    } catch (error) { next(error); }
});

module.exports = router;
module.exports.createShipment = createShipment;
module.exports.syncLocalOrder = syncLocalOrder;
