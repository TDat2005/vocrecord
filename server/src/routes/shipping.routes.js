const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const DonHangModel = require('../models/donhang.model');
const GHNService = require('../services/ghn.service');
const EmailService = require('../services/email.service');
const { cancelOrder } = require('../services/order.service');
const { withTransaction } = require('../utils/db');
const { fail } = require('../utils/http');
const { ORDER_FLOW, FINAL_STATUSES, isStaffRole } = require('../constants/order');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const editor = [authenticate, requireRole('admin', 'nhanvien')];

// Trạng thái vận đơn GHN -> trạng thái đơn hàng của cửa hàng. null = không đổi trạng thái đơn.
// (Trước đây 'money_collect_delivering' - shipper đang thu tiền - bị hiểu nhầm là đã giao xong.)
const GHN_STATUS_MAP = {
    ready_to_pick: 'dangchuanbihang',
    picking: 'dangchuanbihang',
    money_collect_picking: 'dangchuanbihang',
    picked: 'danggiaohang',
    storing: 'danggiaohang',
    transporting: 'danggiaohang',
    sorting: 'danggiaohang',
    delivering: 'danggiaohang',
    money_collect_delivering: 'danggiaohang',
    delivery_fail: 'danggiaohang',
    waiting_to_return: 'danggiaohang',
    return: 'danggiaohang',
    return_transporting: 'danggiaohang',
    return_sorting: 'danggiaohang',
    returning: 'danggiaohang',
    return_fail: 'danggiaohang',
    delivered: 'hoanthanh',
    cancel: 'dahuy',
    returned: 'dahuy',
    lost: 'dahuy',
    damage: 'dahuy'
};
// Hàng chưa rời kho hoặc đã được trả về cửa hàng thì cộng lại tồn kho; hàng mất/hỏng thì không.
const RESTOCK_GHN_STATUSES = ['cancel', 'returned'];

// So sánh token không để lộ độ dài khớp qua thời gian phản hồi.
const sameSecret = (received, expected) => {
    const a = Buffer.from(String(received || ''));
    const b = Buffer.from(String(expected));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const mapGHNStatus = (status) => GHN_STATUS_MAP[String(status || '').toLowerCase()] || null;

const parseDate = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Cập nhật đơn theo trạng thái GHN (webhook hoặc tra cứu).
 * - Không đổi đơn đã hoàn thành/đã hủy, không cho trạng thái lùi lại (vd: danggiaohang -> dangchuanbihang).
 * - Giao thành công đơn COD thì ghi nhận đã thanh toán; GHN hủy/hoàn hàng thì hủy đơn qua cancelOrder()
 *   (hoàn kho nếu hàng về lại cửa hàng, trả lượt mã giảm giá, hoàn ví, xử lý tiền đã thanh toán).
 * - Phí vận chuyển của đơn giữ nguyên số khách đã trả, không ghi đè bằng phí GHN tính với cửa hàng.
 */
const syncLocalOrder = async (orderCode, data = {}) => {
    if (!orderCode) return null;
    const ghnStatus = String(data.status || data.Status || '').toLowerCase();
    const reason = data.reason || data.Reason || null;
    const eta = parseDate(data.leadtime || data.expected_delivery_time || data.ExpectedDeliveryTime);
    const target = mapGHNStatus(ghnStatus);

    const result = await withTransaction(async (connection) => {
        const [[row]] = await connection.execute('SELECT MaDH FROM DonHang WHERE MaDonGHN = ?', [orderCode]);
        if (!row) return null;
        const order = await DonHangModel.lockById(row.MaDH, connection);

        await connection.execute(
            `UPDATE DonHang SET GHNTrangThai = COALESCE(?, GHNTrangThai), GHNReason = ?, GHNLastSync = NOW(),
             GHNExpectedDelivery = COALESCE(?, GHNExpectedDelivery) WHERE MaDH = ?`,
            [ghnStatus || null, reason, eta, order.MaDH]
        );

        const movesForward = target === 'dahuy' || ORDER_FLOW.indexOf(target) > ORDER_FLOW.indexOf(order.TrangThai);
        if (!target || FINAL_STATUSES.includes(order.TrangThai) || !movesForward) return { orderId: order.MaDH, changedTo: null };

        if (target === 'dahuy') {
            const cancelled = await cancelOrder(connection, order, {
                restock: RESTOCK_GHN_STATUSES.includes(ghnStatus),
                note: `[GHN báo ${ghnStatus}${reason ? `: ${reason}` : ''}]`,
            });
            return { orderId: order.MaDH, changedTo: cancelled ? 'dahuy' : null };
        }
        await connection.execute('UPDATE DonHang SET TrangThai = ? WHERE MaDH = ?', [target, order.MaDH]);
        if (target === 'hoanthanh') await DonHangModel.onCompleted(order.MaDH, connection);
        return { orderId: order.MaDH, changedTo: target };
    });

    if (!result) return false;
    if (result.changedTo) EmailService.notifyOrderStatus(result.orderId, result.changedTo);
    return true;
};

// Giữ chỗ tạo vận đơn: hai lần bấm cùng lúc (hoặc hai nhân viên) không tạo ra 2 vận đơn thật bên GHN.
// Dấu "dangtao" quá 2 phút (server tắt giữa chừng) thì cho tạo lại.
const CREATING = 'dangtao';
const claimShipment = async (orderId) => {
    const [claimed] = await pool.query(
        `UPDATE DonHang SET GHNTrangThai = ?, GHNLastSync = NOW()
         WHERE MaDH = ? AND MaDonGHN IS NULL
           AND NOT (GHNTrangThai <=> ? AND GHNLastSync > NOW() - INTERVAL 2 MINUTE)`,
        [CREATING, orderId, CREATING]
    );
    if (!claimed.affectedRows) throw fail(409, 'Đơn hàng đang được tạo vận đơn, vui lòng chờ vài giây rồi tải lại');
};
const releaseShipmentClaim = (orderId) => pool.query(
    'UPDATE DonHang SET GHNTrangThai = NULL WHERE MaDH = ? AND MaDonGHN IS NULL AND GHNTrangThai = ?',
    [orderId, CREATING]
);

const createShipment = async (orderId, shipping = {}) => {
    const order = await DonHangModel.getById(orderId);
    if (!order) throw fail(404, 'Không tìm thấy đơn hàng');
    if (order.MaDonGHN) throw fail(409, `Đơn hàng đã có vận đơn GHN ${order.MaDonGHN}`);
    if (!['daxacnhan', 'dangchuanbihang'].includes(order.TrangThai)) {
        throw fail(400, 'Chỉ tạo được vận đơn GHN khi đơn ở trạng thái "Đã xác nhận" hoặc "Đang chuẩn bị".');
    }
    if (order.PhuongThucThanhToan === 'payos' && order.TrangThaiTT !== 'dathanhtoan') {
        throw fail(409, 'Đơn PayOS chưa thanh toán, không tạo vận đơn (shipper sẽ không thu tiền).');
    }
    const items = await DonHangModel.getOrderItems(orderId);
    const payload = GHNService.buildOrderPayload(order, items, shipping);

    if (!payload.to_province_name || !payload.to_ward_name) {
        // Production: không được tự điền địa chỉ mặc định (trước đây điền "Phường Bến Nghé, Hồ Chí Minh" -> giao nhầm).
        if (process.env.GHN_ENV === 'production') {
            throw fail(400, 'Đơn hàng thiếu Tỉnh/thành hoặc Phường/xã giao hàng, không thể tạo vận đơn GHN.');
        }
        payload.to_province_name = payload.to_province_name || process.env.GHN_FROM_PROVINCE_NAME || 'Hà Nội';
        payload.to_ward_name = payload.to_ward_name || process.env.GHN_FROM_WARD_NAME || '';
    }

    await claimShipment(orderId);
    let data;
    try {
        data = await GHNService.createOrder(payload);
    } catch (error) {
        await releaseShipmentClaim(orderId);
        throw error;
    }
    const expectedDelivery = parseDate(data?.expected_delivery_time);
    // ready_to_pick = chờ GHN đến lấy hàng, nên đơn ở "Đang chuẩn bị" (trước đây chuyển thẳng sang "Đang giao").
    const [updated] = await pool.query(
        `UPDATE DonHang SET MaDonGHN = ?, GHNTrangThai = 'ready_to_pick', GHNExpectedDelivery = ?, GHNLastSync = NOW(), GHNReason = NULL,
         GHNProvinceName = COALESCE(?, GHNProvinceName), GHNWardName = COALESCE(?, GHNWardName),
         TrangThai = IF(TrangThai IN ('daxacnhan', 'dangchuanbihang'), 'dangchuanbihang', TrangThai)
         WHERE MaDH = ? AND MaDonGHN IS NULL`,
        [data.order_code, expectedDelivery, payload.to_province_name, payload.to_ward_name, orderId]
    );
    if (updated.affectedRows) EmailService.notifyOrderStatus(orderId, 'dangchuanbihang');
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

router.post('/orders/:id/create', ...editor, async (req, res, next) => {
    try {
        const result = await createShipment(req.params.id, req.body || {});
        const message = result.data.is_staging
            ? `Đã tạo mã vận đơn giả lập ${result.data.order_code}${result.data.ghn_error ? ` (GHN báo lỗi: ${result.data.ghn_error})` : ''}`
            : `Đã tạo vận đơn GHN ${result.data.order_code}`;
        res.json({ success: true, message, data: result.data });
    } catch (error) {
        // Lỗi từ GHN (vd: "GHN: ward not found") có ích cho nhân viên nên hiện nguyên văn.
        if (error.ghn) error.expose = true;
        next(error);
    }
});

router.get('/orders/:id', authenticate, async (req, res, next) => {
    try {
        const order = await DonHangModel.getById(req.params.id, isStaffRole(req.user.role) ? null : req.user.customerId);
        if (!order) throw fail(404, 'Không tìm thấy đơn hàng');
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
        if (result?.result) await syncLocalOrder(order.MaDonGHN, { status: 'cancel', reason: req.body.reason || 'Cửa hàng hủy vận đơn' });
        res.json({ success: Boolean(result?.result), data });
    } catch (error) { next(error); }
});

// GHN calls this endpoint after every status change. Register the URL in the GHN dashboard.
router.post('/webhook/ghn', async (req, res, next) => {
    try {
        // Webhook GHN không có chữ ký. Nếu đặt GHN_WEBHOOK_TOKEN, hãy khai báo URL webhook dạng
        // /api/shipping/webhook/ghn?token=<GHN_WEBHOOK_TOKEN> trên trang GHN để chặn request giả mạo.
        const expectedToken = process.env.GHN_WEBHOOK_TOKEN;
        // Môi trường thật bắt buộc có token: không có thì ai biết URL cũng báo "đã giao" giả được (đơn COD bị ghi đã thu tiền).
        if (!expectedToken && process.env.GHN_ENV === 'production') {
            return res.status(503).json({ success: false, message: 'Chưa cấu hình GHN_WEBHOOK_TOKEN' });
        }
        if (expectedToken && !sameSecret(req.query.token, expectedToken)) {
            return res.status(401).json({ success: false, message: 'Webhook token không hợp lệ' });
        }
        const event = req.body || {};
        const orderCode = event.OrderCode || event.order_code || event.orderCode;
        const status = event.Status || event.status;
        if (!orderCode) return res.status(400).json({ success: false, message: 'Thiếu mã đơn GHN' });
        await syncLocalOrder(orderCode, event);
        res.json({ success: true, order_code: orderCode, status });
    } catch (error) { next(error); }
});

module.exports = router;
