const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const DonHangModel = require('../models/donhang.model');
const KhachHangModel = require('../models/khachhang.model');
const DiscountModel = require('../models/discount.model');
const PayOSService = require('../services/payos.service');
const EmailService = require('../services/email.service');
const GHNService = require('../services/ghn.service');
const Wallet = require('../services/tradein/wallet');
const { cancelOrder, markOrderPaid } = require('../services/order.service');
const { withTransaction } = require('../utils/db');
const { fail } = require('../utils/http');
const { isPhone, PHONE_MESSAGE } = require('../utils/validate');
const {
    SHIPPING_FEE, ORDER_FLOW, FINAL_STATUSES, CANCELLABLE_STATUSES, PAYOS_TIMEOUT_MINUTES, MAX_ORDER_NOTE, isStaffRole,
} = require('../constants/order');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const staff = [authenticate, requireRole('admin', 'nhanvien')];

// Địa chỉ website để PayOS chuyển khách về sau khi thanh toán. Ưu tiên APP_URL trong .env,
// không có thì lấy theo trang khách đang mở (header Origin), cuối cùng là localhost:8080.
const appUrl = (req) => (process.env.APP_URL || req.get('origin') || 'http://localhost:8080').replace(/\/+$/, '');
const withOrderId = (url, orderId) => `${url}${url.includes('?') ? '&' : '?'}order_id=${orderId}`;
const MAX_QUANTITY = 99;

const staffEmployeeId = async (accountId) => {
    const [rows] = await pool.query('SELECT MaNV FROM NhanVien WHERE MaTK = ?', [accountId]);
    return rows[0]?.MaNV || null;
};

// Đọc và kiểm tra dữ liệu đặt hàng do trình duyệt gửi lên (giá, tổng tiền luôn tính lại từ CSDL).
function readOrderRequest(body) {
    const {
        items = [], address = '', nguoiNhan = '', sdtNhan = '', ghiChu = '',
        phuongThucThanhToan = 'cod', saveAddress = false, discountCode = null, useCredit = false, ghn = {},
    } = body || {};
    const order = {
        receiverName: String(nguoiNhan || '').trim(),
        receiverPhone: String(sdtNhan || '').trim(),
        receiverAddress: String(address || '').trim(),
        note: String(ghiChu || '').trim(),
        paymentMethod: phuongThucThanhToan,
        saveAddress: Boolean(saveAddress),
        discountCode: discountCode ? String(discountCode).trim().toUpperCase() : null,
        useCredit: useCredit === true,
        ghn: ghn && typeof ghn === 'object' ? ghn : {},
        quantities: new Map(),
    };
    if (!Array.isArray(items) || items.length === 0) throw fail(400, 'Dữ liệu đặt hàng không hợp lệ');
    if (!order.receiverName || !order.receiverPhone || !order.receiverAddress) throw fail(400, 'Vui lòng nhập đủ thông tin nhận hàng');
    if (!isPhone(order.receiverPhone)) throw fail(400, PHONE_MESSAGE);
    if (order.receiverName.length > 100 || order.receiverAddress.length > 255) {
        throw fail(400, 'Tên người nhận tối đa 100 ký tự, địa chỉ tối đa 255 ký tự');
    }
    // Cột GhiChu dài 255 ký tự; chừa chỗ cho hệ thống ghi thêm lý do khi tự hủy đơn.
    if (order.note.length > MAX_ORDER_NOTE) throw fail(400, `Ghi chú đơn hàng tối đa ${MAX_ORDER_NOTE} ký tự`);
    if (!['cod', 'payos'].includes(order.paymentMethod)) throw fail(400, 'Phương thức thanh toán không hợp lệ');
    // Môi trường thật cần tỉnh/phường để tạo vận đơn GHN (không có thì đơn không giao được).
    if (process.env.GHN_ENV === 'production' && (!order.ghn.provinceName || !order.ghn.wardName)) {
        throw fail(400, 'Địa chỉ giao hàng thiếu Tỉnh/thành hoặc Phường/xã. Vui lòng chọn lại địa chỉ.');
    }
    for (const item of items) {
        const productId = Number(item && item.id);
        const quantity = Number(item && item.qty);
        if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(quantity) || quantity <= 0 || quantity > MAX_QUANTITY) {
            throw fail(400, 'Số lượng hoặc sản phẩm không hợp lệ');
        }
        order.quantities.set(productId, (order.quantities.get(productId) || 0) + quantity);
    }
    for (const quantity of order.quantities.values()) {
        if (quantity > MAX_QUANTITY) throw fail(400, `Mỗi sản phẩm đặt tối đa ${MAX_QUANTITY} cái`);
    }
    return order;
}

// Ghi đơn, trừ kho, giữ lượt mã giảm giá và trừ ví trong một transaction. Chưa gọi PayOS ở đây:
// gọi mạng trong lúc đang khóa dòng sản phẩm thì PayOS chậm sẽ làm mọi khách khác mua cùng sản phẩm phải chờ.
async function placeOrder(connection, customerId, request) {
    if (request.saveAddress) {
        await KhachHangModel.addAddress(customerId, request.receiverName, request.receiverPhone, request.receiverAddress, request.ghn, connection);
    }

    const lines = [];
    let subtotal = 0;
    for (const [productId, quantity] of request.quantities.entries()) {
        const [[product]] = await connection.execute(
            'SELECT MaSP, TenSP, GiaBan, SoLuongTon, TinhTrang FROM SanPham WHERE MaSP = ? FOR UPDATE',
            [productId]
        );
        if (!product) throw fail(400, 'Sản phẩm không tồn tại');
        if (product.TinhTrang === 'ngungkinhdoanh') throw fail(409, `Sản phẩm "${product.TenSP}" đã ngừng kinh doanh`);
        if (product.TinhTrang === 'hethang' || Number(product.SoLuongTon) < quantity) throw fail(409, `Sản phẩm "${product.TenSP}" không đủ tồn kho`);
        const price = Number(product.GiaBan);
        subtotal += price * quantity;
        lines.push({ id: productId, qty: quantity, price });
    }

    // Mã giảm giá kiểm tra lại lúc đặt (khóa dòng mã để hai đơn không cùng dùng lượt cuối).
    let discountAmount = 0;
    if (request.discountCode) {
        const discount = await DiscountModel.reserve(request.discountCode, subtotal, connection, customerId);
        if (!discount.ok) throw fail(409, `${discount.message}. Vui lòng bỏ mã giảm giá hoặc chọn mã khác.`);
        discountAmount = discount.amount;
    }

    let total = Math.max(subtotal - discountAmount + SHIPPING_FEE, 0);

    // Trả một phần hoặc toàn bộ bằng ví tín dụng (tiền bán/ký gửi đĩa cũ). TongTien là phần còn phải thu.
    let creditUsed = 0;
    let paymentMethod = request.paymentMethod;
    if (request.useCredit) {
        const balance = await Wallet.getBalance(connection, customerId, { forUpdate: true });
        creditUsed = Math.min(balance, total);
        total -= creditUsed;
        if (creditUsed > 0 && total === 0) paymentMethod = 'tindung'; // ví trả hết: không cần PayOS, shipper không thu tiền
    }

    const orderId = await DonHangModel.create(
        customerId, total, request.receiverAddress, request.receiverName, request.receiverPhone, request.note || null,
        paymentMethod, discountAmount > 0 ? request.discountCode : null, discountAmount, connection
    );
    await connection.execute(
        'UPDATE DonHang SET PhiVanChuyen = ?, SoTienTinDung = ?, GHNProvinceName = ?, GHNWardName = ? WHERE MaDH = ?',
        [SHIPPING_FEE, creditUsed, request.ghn.provinceName || null, request.ghn.wardName || null, orderId]
    );
    if (creditUsed > 0) {
        await Wallet.addEntry(connection, { customerId, amount: -creditUsed, type: 'thanhtoan', orderId, note: `Thanh toán đơn #${orderId}` });
    }

    for (const line of lines) {
        await DonHangModel.addItem(orderId, line.id, line.qty, line.price, connection);
        const [stockUpdate] = await connection.execute(
            'UPDATE SanPham SET SoLuongTon = SoLuongTon - ? WHERE MaSP = ? AND SoLuongTon >= ?',
            [line.qty, line.id, line.qty]
        );
        if (!stockUpdate.affectedRows) throw fail(409, 'Tồn kho đã thay đổi. Vui lòng tải lại giỏ hàng');
    }

    let payosOrderCode = null;
    if (paymentMethod === 'payos') {
        // Mã giao dịch PayOS là số nguyên duy nhất: 9 số cuối thời gian + 5 số cuối mã đơn.
        payosOrderCode = parseInt(Date.now().toString().slice(-9) + orderId.toString().slice(-5), 10);
        await DonHangModel.createPayment(orderId, total, 'payos', 'chuathanhtoan', payosOrderCode, connection);
    } else {
        await DonHangModel.createPayment(orderId, total, paymentMethod, paymentMethod === 'tindung' ? 'dathanhtoan' : 'chuathanhtoan', null, connection);
    }

    return { orderId, subtotal, discountAmount, total, payosOrderCode };
}

// Email xác nhận gửi ở nền: SMTP chậm không làm khách phải chờ khi bấm đặt hàng.
function sendConfirmationEmail(customerId, placed, request) {
    (async () => {
        const customer = await KhachHangModel.getProfile(customerId);
        if (!customer?.Email) return;
        await EmailService.sendOrderConfirmation(customer.Email, {
            orderId: placed.orderId,
            subtotal: placed.subtotal,
            discount: placed.discountAmount,
            shippingFee: SHIPPING_FEE,
            total: placed.total,
            items: await DonHangModel.getOrderItems(placed.orderId),
            address: request.receiverAddress,
            nguoiNhan: request.receiverName,
            sdtNhan: request.receiverPhone,
        });
    })().catch((error) => console.error('Order email error:', error.message));
}

router.post('/', authenticate, async (req, res, next) => {
    try {
        const customerId = req.user.customerId;
        if (!customerId) throw fail(400, 'Dữ liệu đặt hàng không hợp lệ');
        const request = readOrderRequest(req.body);
        const placed = await withTransaction((connection) => placeOrder(connection, customerId, request));

        let payosData = null;
        if (placed.payosOrderCode) {
            const returnUrl = withOrderId(process.env.PAYOS_RETURN_URL || `${appUrl(req)}/payment-result`, placed.orderId);
            const cancelUrl = withOrderId(process.env.PAYOS_CANCEL_URL || `${appUrl(req)}/payment-result`, placed.orderId);
            try {
                payosData = await PayOSService.createPaymentLink(placed.payosOrderCode, placed.total, `VocRecords DH${placed.orderId}`, returnUrl, cancelUrl);
            } catch (error) {
                // Không tạo được link thanh toán: hủy đơn vừa tạo để trả lại tồn kho, mã giảm giá và tiền ví.
                console.error(`[PayOS] Đơn #${placed.orderId}:`, error.message);
                await withTransaction(async (connection) => {
                    const order = await DonHangModel.lockById(placed.orderId, connection);
                    if (order) await cancelOrder(connection, order, { note: '[Không tạo được link thanh toán PayOS]' });
                });
                throw fail(502, `Không tạo được mã thanh toán VietQR lúc này nên đơn #${placed.orderId} đã được hủy (bạn chưa bị trừ tiền). Vui lòng thử lại hoặc chọn thanh toán khi nhận hàng.`);
            }
            // Giữ link + mã QR: khách bấm "Thanh toán sau" vẫn mở lại được trong chi tiết đơn (trong 10 phút).
            await pool.execute('UPDATE ThanhToan SET DuLieuThanhToan = ? WHERE MaDH = ?', [JSON.stringify({
                checkoutUrl: payosData.checkoutUrl, qrCode: payosData.qrCode, accountNumber: payosData.accountNumber,
                accountName: payosData.accountName, bin: payosData.bin, amount: payosData.amount, description: payosData.description,
            }), placed.orderId]);
        }

        sendConfirmationEmail(customerId, placed, request);
        const response = {
            success: true,
            message: 'Đặt hàng thành công!',
            order_id: placed.orderId,
            shipping: { status: GHNService.isConfigured() ? 'pending_confirmation' : 'disabled', fee: SHIPPING_FEE },
        };
        if (payosData) {
            response.checkoutUrl = payosData.checkoutUrl;
            response.payos_data = payosData;
        }
        res.json(response);
    } catch (error) {
        next(error);
    }
});

const parsePaging = (query, defaultLimit) => {
    const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || defaultLimit, 1), 100);
    return { page, limit, offset: (page - 1) * limit };
};

// GET / — Khách: đơn của mình. Nhân viên: tất cả đơn, có ?q= (mã đơn, tên, SĐT), ?status=, ?page=, ?limit=.
router.get('/', authenticate, async (req, res, next) => {
    try {
        if (isStaffRole(req.user.role)) {
            const { page, limit, offset } = parsePaging(req.query, 50);
            const status = [...ORDER_FLOW, 'dahuy', 'refund'].includes(req.query.status) ? req.query.status : '';
            const { rows, total } = await DonHangModel.search({ q: req.query.q || '', status, limit, offset });
            return res.json({ success: true, data: rows, total, page, limit });
        }
        if (!req.user.customerId) throw fail(403, 'Tài khoản chưa có hồ sơ khách hàng');
        const { page, limit, offset } = parsePaging(req.query, 100);
        res.json({ success: true, data: await DonHangModel.getByCustomer(req.user.customerId, limit, offset), page, limit });
    } catch (error) {
        next(error);
    }
});

// Quy tắc chuyển trạng thái đơn hàng (máy trạng thái):
// choxacnhan -> daxacnhan -> dangchuanbihang -> danggiaohang -> hoanthanh
// Chỉ được đi tiếp (có thể bỏ qua bước), không được quay lui.
// Được hủy (dahuy) khi đơn chưa ở danggiaohang. hoanthanh và dahuy là trạng thái cuối.
const canTransition = (from, to) => {
    if (from === to || FINAL_STATUSES.includes(from)) return false;
    if (to === 'dahuy') return CANCELLABLE_STATUSES.includes(from);
    const fromIdx = ORDER_FLOW.indexOf(from);
    return fromIdx !== -1 && ORDER_FLOW.indexOf(to) > fromIdx;
};

router.put('/:id/status', ...staff, async (req, res, next) => {
    try {
        const status = String(req.body.status || '');
        if (![...ORDER_FLOW, 'dahuy'].includes(status)) throw fail(400, 'Trạng thái đơn hàng không hợp lệ');
        const employeeId = await staffEmployeeId(req.user.id);

        await withTransaction(async (connection) => {
            const order = await DonHangModel.lockById(req.params.id, connection);
            if (!order) throw fail(404, 'Đơn hàng không tồn tại');
            if (!canTransition(order.TrangThai, status)) throw fail(400, `Không thể chuyển đơn từ "${order.TrangThai}" sang "${status}"`);
            // Giống quy tắc ở /cancel: đơn đã có vận đơn GHN thì chỉ Admin được hủy.
            if (status === 'dahuy' && order.MaDonGHN && req.user.role !== 'admin') {
                throw fail(403, `Đơn đã có mã vận đơn GHN (${order.MaDonGHN}), chỉ Admin được hủy.`);
            }
            // Đơn PayOS chưa nhận được tiền chỉ được hủy, không được xác nhận hay giao
            // (trước đây xác nhận được, vận đơn tạo ra với tiền thu hộ 0đ nên hàng đi mà không thu được tiền).
            if (order.PhuongThucThanhToan === 'payos' && order.TrangThaiTT !== 'dathanhtoan' && status !== 'dahuy') {
                throw fail(409, 'Đơn thanh toán qua PayOS chưa nhận được tiền nên chưa thể xác nhận. Chờ khách thanh toán hoặc hủy đơn.');
            }

            if (status === 'dahuy') {
                if (!(await cancelOrder(connection, order, { cancelShipment: true, staffId: employeeId }))) {
                    throw fail(409, 'Đơn hàng vừa được người khác cập nhật, vui lòng tải lại');
                }
            } else {
                await connection.execute('UPDATE DonHang SET TrangThai = ?, MaNVXuLy = ? WHERE MaDH = ?', [status, employeeId, order.MaDH]);
                // Giao thành công đơn COD = shipper đã thu tiền; đơn có đĩa ký gửi: tính tiền trả người gửi.
                if (status === 'hoanthanh') await DonHangModel.onCompleted(order.MaDH, connection);
            }
            await connection.execute(
                'INSERT INTO NhatKyHoatDong (MaTK, HanhDong, NoiDung) VALUES (?, ?, ?)',
                [req.user.id, 'Cập nhật trạng thái đơn hàng', `Đơn #${order.MaDH}: ${order.TrangThai} -> ${status}`]
            );
        });

        EmailService.notifyOrderStatus(req.params.id, status);
        res.json({ success: true, message: 'Cập nhật trạng thái thành công' });
    } catch (error) {
        next(error);
    }
});

// Khách tự hủy đơn của mình; nhân viên/admin hủy hộ khách.
// Đơn đã có vận đơn GHN: khách và nhân viên không hủy được, admin hủy thì vận đơn GHN bị hủy theo.
router.put('/:id/cancel', authenticate, async (req, res, next) => {
    try {
        const isStaff = isStaffRole(req.user.role);
        if (!isStaff && !req.user.customerId) throw fail(400, 'Dữ liệu không hợp lệ');
        const { nganHang, soTK, chuTK, lyDo } = req.body || {};

        const refundRequested = await withTransaction(async (connection) => {
            const order = await DonHangModel.lockById(req.params.id, connection);
            if (!order) throw fail(404, 'Đơn hàng không tồn tại');
            if (!isStaff && Number(order.MaKH) !== Number(req.user.customerId)) throw fail(403, 'Đơn hàng không thuộc về bạn');
            if (order.MaDonGHN && req.user.role !== 'admin') {
                throw fail(400, `Đơn hàng đã được tạo mã vận chuyển GHN (${order.MaDonGHN}). Không thể hủy trực tuyến, vui lòng liên hệ trực tiếp với Cửa hàng để được hỗ trợ!`);
            }
            if (!CANCELLABLE_STATUSES.includes(order.TrangThai)) throw fail(400, 'Đơn hàng này không thể hủy.');

            // Đơn đã thanh toán online: cần tài khoản ngân hàng để hoàn tiền.
            // Đơn trả hết bằng ví tín dụng tự hoàn vào ví khi hủy, không cần thông tin ngân hàng.
            let refundInfo = null;
            if (order.TrangThaiTT === 'dathanhtoan' && order.PhuongThucThanhToan !== 'tindung') {
                if (!nganHang || !soTK || !chuTK) {
                    throw fail(400, 'Đơn hàng đã thanh toán online. Vui lòng cung cấp đầy đủ thông tin ngân hàng (Tên ngân hàng, Số tài khoản, Tên chủ tài khoản) để Shop hoàn tiền!');
                }
                refundInfo = JSON.stringify({
                    nganHang: String(nganHang).trim().slice(0, 100),
                    soTK: String(soTK).trim().slice(0, 50),
                    chuTK: String(chuTK).trim().slice(0, 100),
                    lyDo: String(lyDo || 'Khách hàng yêu cầu hủy đơn').trim().slice(0, 500),
                    ngayYeuCau: new Date().toISOString(),
                });
            }
            const staffId = isStaff ? await staffEmployeeId(req.user.id) : null;
            if (!(await cancelOrder(connection, order, { cancelShipment: true, refundInfo, staffId }))) {
                throw fail(409, 'Đơn hàng đã được xử lý hoặc không thể hủy');
            }
            return Boolean(refundInfo);
        });

        EmailService.notifyOrderStatus(req.params.id, 'dahuy');
        res.json({
            success: true,
            message: refundRequested
                ? 'Đã hủy đơn hàng! Shop đã tiếp nhận thông tin ngân hàng và sẽ xử lý hoàn tiền sớm nhất.'
                : 'Đã hủy đơn hàng thành công.',
        });
    } catch (error) {
        next(error);
    }
});

router.put('/:id/refund-confirm', ...staff, async (req, res, next) => {
    try {
        const [result] = await pool.query(
            "UPDATE DonHang SET TrangThaiHoanTien = 'dahoantien' WHERE MaDH = ? AND TrangThaiHoanTien = 'choxuly'",
            [req.params.id]
        );
        if (!result.affectedRows) throw fail(400, 'Đơn hàng không ở trạng thái chờ hoàn tiền');
        await pool.query('INSERT INTO NhatKyHoatDong (MaTK, HanhDong, NoiDung) VALUES (?, ?, ?)',
            [req.user.id, 'Xác nhận hoàn tiền', `Đơn #${req.params.id}`]);
        EmailService.notifyOrderStatus(req.params.id, 'dahoantien');
        res.json({ success: true, message: 'Xác nhận hoàn tiền thành công!' });
    } catch (error) {
        next(error);
    }
});

router.get('/:id', authenticate, async (req, res, next) => {
    try {
        const customerId = isStaffRole(req.user.role) ? null : req.user.customerId;
        const orderInfo = await DonHangModel.getById(req.params.id, customerId);
        if (!orderInfo) throw fail(404, 'Không tìm thấy đơn hàng');

        const items = await DonHangModel.getOrderItems(req.params.id);
        // Đơn PayOS đang chờ thanh toán: trả lại link + mã QR để khách thanh toán tiếp ("Thanh toán sau").
        const { DuLieuThanhToan: savedPayment, ...info } = orderInfo;
        let payment = null;
        if (info.ThanhToanHinhThuc === 'payos' && info.TrangThaiTT === 'chuathanhtoan' && info.TrangThai === 'choxacnhan' && savedPayment) {
            const expiresAt = new Date(info.NgayDat).getTime() + PAYOS_TIMEOUT_MINUTES * 60 * 1000;
            try {
                if (expiresAt > Date.now()) payment = { ...JSON.parse(savedPayment), orderId: info.MaDH, expiresAt };
            } catch {
                payment = null;
            }
        }
        res.json({ success: true, data: { info, items, payment } });
    } catch (error) {
        next(error);
    }
});

// Trạng thái thanh toán của đơn. Đơn PayOS chưa ghi nhận tiền thì hỏi thẳng PayOS
// (phòng khi webhook chưa tới hoặc bị chặn).
router.get('/:id/status', authenticate, async (req, res, next) => {
    try {
        const customerId = isStaffRole(req.user.role) ? null : req.user.customerId;
        const order = await DonHangModel.getById(req.params.id, customerId);
        if (!order) throw fail(404, 'Không tìm thấy đơn hàng');
        // Đơn đã hủy mà tiền vẫn về (khách trả sau khi quá hạn) vẫn báo "đã hủy": cửa hàng sẽ hoàn tiền.
        if (order.TrangThai === 'dahuy') {
            return res.json({ success: true, status: 'dahuy', message: 'Đơn hàng đã bị hủy (hết hạn hoặc theo yêu cầu)' });
        }
        if (order.TrangThaiTT === 'dathanhtoan') return res.json({ success: true, status: 'dathanhtoan' });

        if (order.ThanhToanHinhThuc === 'payos' && order.MaGiaoDich) {
            try {
                const result = await PayOSService.getPaymentRequest(order.MaGiaoDich);
                const payosStatus = result.code === '00' && result.data ? result.data.status : null;
                if (payosStatus === 'PAID') {
                    await withTransaction((connection) => markOrderPaid(connection, order.MaDH));
                    return res.json({ success: true, status: 'dathanhtoan' });
                }
                if (payosStatus === 'CANCELLED' || payosStatus === 'EXPIRED') {
                    const cancelled = await withTransaction(async (connection) => {
                        const locked = await DonHangModel.lockById(order.MaDH, connection);
                        if (!locked || locked.TrangThai !== 'choxacnhan' || locked.TrangThaiTT !== 'chuathanhtoan') return false;
                        return cancelOrder(connection, locked, { note: `[Khách hủy hoặc hết hạn thanh toán PayOS (${payosStatus})]` });
                    });
                    if (cancelled) EmailService.notifyOrderStatus(order.MaDH, 'dahuy');
                    return res.json({ success: true, status: 'thatbai' });
                }
            } catch (error) {
                console.error('PayOS check error:', error.message);
            }
        }
        res.json({ success: true, status: order.TrangThaiTT });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
