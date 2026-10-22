const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const DonHangModel = require('../models/donhang.model');
const KhachHangModel = require('../models/khachhang.model');
const DiscountModel = require('../models/discount.model');
const PayOSService = require('../services/payos.service');
const EmailService = require('../services/email.service');
const GHNService = require('../services/ghn.service');
const { createShipment } = require('./shipping.routes');
const Wallet = require('../services/tradein/wallet');
const { isPhone, PHONE_MESSAGE } = require('../utils/validate');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const staff = [authenticate, requireRole('admin', 'nhanvien')];

// Địa chỉ website để PayOS chuyển khách về sau khi thanh toán. Ưu tiên APP_URL trong .env,
// không có thì lấy theo trang khách đang mở (header Origin), cuối cùng là localhost:8080.
const appUrl = (req) => (process.env.APP_URL || req.get('origin') || 'http://localhost:8080').replace(/\/+$/, '');
const withOrderId = (url, orderId) => `${url}${url.includes('?') ? '&' : '?'}order_id=${orderId}`;
const PAYOS_TIMEOUT_MINUTES = 10; // đơn PayOS chưa thanh toán quá thời gian này thì tự hủy

const expireUnpaidPayosOrders = async () => {
    let connection;
    try {
        connection = await pool.getConnection();
        const [expiredOrders] = await connection.query(`
            SELECT dh.MaDH, dh.MaKH 
            FROM DonHang dh
            JOIN ThanhToan tt ON dh.MaDH = tt.MaDH
            WHERE dh.PhuongThucThanhToan = 'payos'
              AND dh.TrangThai = 'choxacnhan'
              AND tt.TrangThaiTT = 'chuathanhtoan'
              AND dh.NgayDat < (NOW() - INTERVAL ${PAYOS_TIMEOUT_MINUTES} MINUTE)
        `);

        for (const order of expiredOrders) {
            try {
                await connection.beginTransaction();
                const [cancelled] = await connection.execute(
                    "UPDATE DonHang SET TrangThai = 'dahuy', GhiChu = CONCAT(COALESCE(GhiChu, ''), ' [Hệ thống tự động hủy do quá 10 phút chưa thanh toán PayOS]') WHERE MaDH = ? AND TrangThai = 'choxacnhan'",
                    [order.MaDH]
                );
                // Tiến trình chạy định kỳ và mỗi lần gọi GET /orders có thể trùng nhau:
                // lần chạy sau không hủy được (affectedRows = 0) thì không được cộng kho lần nữa.
                if (!cancelled.affectedRows) {
                    await connection.rollback();
                    continue;
                }
                await connection.execute(
                    "UPDATE ThanhToan SET TrangThaiTT = 'thatbai', NgayTT = NOW() WHERE MaDH = ? AND TrangThaiTT = 'chuathanhtoan'",
                    [order.MaDH]
                );
                await DonHangModel.releaseCancelledOrder(order.MaDH, connection);
                await connection.commit();
                console.log(`[PayOS Expiry] Đã tự động hủy đơn #${order.MaDH} và hoàn lại tồn kho do quá hạn 10 phút`);
            } catch (err) {
                await connection.rollback();
                console.error(`[PayOS Expiry Error] Đơn #${order.MaDH}:`, err.message);
            }
        }
    } catch (err) {
        console.error('[PayOS Expiry Worker Error]:', err.message);
    } finally {
        if (connection) connection.release();
    }
};

setInterval(expireUnpaidPayosOrders, 30000);

router.post('/', authenticate, async (req, res, next) => {
    let connection;
    try {
        const {
            customer_id: clientCustomerId,
            items = [],
            total: clientTotal = 0,
            address = '',
            nguoiNhan = '',
            sdtNhan = '',
            ghiChu = '',
            phuongThucThanhToan = 'cod',
            maGiaoDich = null,
            saveAddress = false,
            discountCode = null,
            useCredit = false,
            ghn = {}
        } = req.body;

        if (!req.user.customerId || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Dữ liệu đặt hàng không hợp lệ' });
        }
        const customer_id = req.user.customerId;
        const receiverName = String(nguoiNhan || '').trim();
        const receiverPhone = String(sdtNhan || '').trim();
        const receiverAddress = String(address || '').trim();
        if (!receiverName || !receiverPhone || !receiverAddress) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập đủ thông tin nhận hàng' });
        }
        if (!isPhone(receiverPhone)) return res.status(400).json({ success: false, message: PHONE_MESSAGE });
        if (receiverName.length > 100 || receiverAddress.length > 255) {
            return res.status(400).json({ success: false, message: 'Tên người nhận tối đa 100 ký tự, địa chỉ tối đa 255 ký tự' });
        }

        const allowedPaymentMethods = ['cod', 'payos'];
        if (!allowedPaymentMethods.includes(phuongThucThanhToan)) {
            return res.status(400).json({ success: false, message: 'Phương thức thanh toán không hợp lệ' });
        }

        let isPayos = (phuongThucThanhToan === 'payos');
        const trangThaiThanhToan = 'chuathanhtoan';

        connection = await pool.getConnection();
        await connection.beginTransaction();

        if (saveAddress) {
            await KhachHangModel.addAddress(customer_id, nguoiNhan, sdtNhan, address, ghn, connection);
        }

        // Giá và tồn kho luôn lấy từ DB, không tin giá/tổng tiền do trình duyệt gửi lên.
        const itemMap = new Map();
        for (const item of items) {
            const productId = Number(item.id);
            const quantity = Number(item.qty);
            if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(quantity) || quantity <= 0 || quantity > 99) {
                const validationError = new Error('Số lượng hoặc sản phẩm không hợp lệ');
                validationError.status = 400;
                throw validationError;
            }
            itemMap.set(productId, (itemMap.get(productId) || 0) + quantity);
        }

        const normalizedItems = [];
        let subtotal = 0;
        for (const [productId, quantity] of itemMap.entries()) {
            const [productRows] = await connection.execute(
                'SELECT MaSP, TenSP, GiaBan, SoLuongTon, TinhTrang FROM SanPham WHERE MaSP = ? FOR UPDATE',
                [productId]
            );
            const product = productRows[0];
            if (!product) {
                const productError = new Error('Sản phẩm không tồn tại');
                productError.status = 400;
                throw productError;
            }
            if (product.TinhTrang === 'ngungkinhdoanh') {
                const stopError = new Error(`Sản phẩm "${product.TenSP}" đã ngừng kinh doanh`);
                stopError.status = 409;
                throw stopError;
            }
            if (product.TinhTrang === 'hethang' || Number(product.SoLuongTon) < quantity) {
                const stockError = new Error(`Sản phẩm "${product.TenSP}" không đủ tồn kho`);
                stockError.status = 409;
                throw stockError;
            }
            const unitPrice = Number(product.GiaBan);
            subtotal += unitPrice * quantity;
            normalizedItems.push({ id: productId, qty: quantity, price: unitPrice });
        }

        const clientTotalNumber = Number(clientTotal);
        if (clientTotal !== undefined && clientTotal !== null && (!Number.isFinite(clientTotalNumber) || clientTotalNumber < 0)) {
            const totalError = new Error('Tổng tiền không hợp lệ');
            totalError.status = 400;
            throw totalError;
        }

        // Mã giảm giá kiểm tra lại lúc đặt (khóa dòng mã để hai đơn không cùng dùng lượt cuối).
        // Mã không còn dùng được thì báo khách, không âm thầm tính giá gốc như trước.
        let soTienGiam = 0;
        if (discountCode) {
            const discount = await DiscountModel.reserve(discountCode, subtotal, connection, customer_id);
            if (!discount.ok) {
                const discountError = new Error(`${discount.message}. Vui lòng bỏ mã giảm giá hoặc chọn mã khác.`);
                discountError.status = 409;
                throw discountError;
            }
            soTienGiam = discount.amount;
        }

        const shippingFee = 30000;
        let totalAfterDiscount = subtotal - soTienGiam + shippingFee;
        if (totalAfterDiscount < 0) totalAfterDiscount = 0;

        // Trả một phần hoặc toàn bộ bằng ví tín dụng (tiền bán/ký gửi đĩa cũ). TongTien là phần còn phải thu.
        let creditUsed = 0;
        let paymentMethod = phuongThucThanhToan;
        if (useCredit === true) {
            const balance = await Wallet.getBalance(connection, customer_id, { forUpdate: true });
            creditUsed = Math.min(balance, totalAfterDiscount);
            totalAfterDiscount -= creditUsed;
            if (creditUsed > 0 && totalAfterDiscount === 0) {
                paymentMethod = 'tindung'; // ví trả hết: không cần PayOS, shipper không thu tiền
                isPayos = false;
            }
        }

        const maDH = await DonHangModel.create(customer_id, totalAfterDiscount, address, nguoiNhan, sdtNhan, ghiChu, paymentMethod, discountCode, soTienGiam, connection);

        if (creditUsed > 0) {
            await connection.execute('UPDATE DonHang SET SoTienTinDung = ? WHERE MaDH = ?', [creditUsed, maDH]);
            await Wallet.addEntry(connection, { customerId: customer_id, amount: -creditUsed, type: 'thanhtoan', orderId: maDH, note: `Thanh toán đơn #${maDH}` });
        }

        await connection.execute(
            'UPDATE DonHang SET PhiVanChuyen = ?, GHNProvinceName = ?, GHNWardName = ? WHERE MaDH = ?',
            [shippingFee, ghn?.provinceName || null, ghn?.wardName || null, maDH]
        );


        for (const item of normalizedItems) {
            await DonHangModel.addItem(maDH, item.id, item.qty, item.price, connection);
            const [stockUpdate] = await connection.execute(
                'UPDATE SanPham SET SoLuongTon = SoLuongTon - ? WHERE MaSP = ? AND SoLuongTon >= ?',
                [item.qty, item.id, item.qty]
            );
            if (!stockUpdate.affectedRows) {
                const stockError = new Error('Tồn kho đã thay đổi. Vui lòng tải lại giỏ hàng');
                stockError.status = 409;
                throw stockError;
            }
        }

        let payosData = null;
        if (isPayos) {
            const orderCode = parseInt(Date.now().toString().slice(-9) + maDH.toString().slice(-5));
            await DonHangModel.createPayment(maDH, totalAfterDiscount, phuongThucThanhToan, 'chuathanhtoan', orderCode, connection);
            
            // Trước đây khi chưa đặt PAYOS_RETURN_URL, link quay về chỉ là "?order_id=..." (không hợp lệ) nên PayOS từ chối.
            const returnUrl = withOrderId(process.env.PAYOS_RETURN_URL || `${appUrl(req)}/payment-result`, maDH);
            const cancelUrl = withOrderId(process.env.PAYOS_CANCEL_URL || `${appUrl(req)}/payment-result`, maDH);

            payosData = await PayOSService.createPaymentLink(orderCode, totalAfterDiscount, "VocRecords DH" + maDH, returnUrl, cancelUrl);
            // Giữ link + mã QR: khách bấm "Thanh toán sau" vẫn mở lại được trong chi tiết đơn (trong 10 phút).
            await connection.execute('UPDATE ThanhToan SET DuLieuThanhToan = ? WHERE MaDH = ?', [JSON.stringify({
                checkoutUrl: payosData.checkoutUrl, qrCode: payosData.qrCode, accountNumber: payosData.accountNumber,
                accountName: payosData.accountName, bin: payosData.bin, amount: payosData.amount, description: payosData.description,
            }), maDH]);
        } else {
            await DonHangModel.createPayment(maDH, totalAfterDiscount, paymentMethod, paymentMethod === 'tindung' ? 'dathanhtoan' : trangThaiThanhToan, null, connection);
        }

        await connection.commit();
        connection.release();

        let shipping = { status: GHNService.isConfigured() ? 'pending_confirmation' : 'disabled', fee: shippingFee };

        // Email xác nhận gửi ở nền: SMTP chậm không làm khách phải chờ khi bấm đặt hàng.
        (async () => {
            const customerInfo = await KhachHangModel.getProfile(customer_id);
            if (!customerInfo?.Email) return;
            const orderItems = await DonHangModel.getOrderItems(maDH);
            await EmailService.sendOrderConfirmation(customerInfo.Email, {
                orderId: maDH,
                subtotal,
                discount: soTienGiam,
                shippingFee,
                total: totalAfterDiscount,
                items: orderItems,
                address,
                nguoiNhan,
                sdtNhan
            });
        })().catch((emailErr) => console.error('Order email error:', emailErr.message));

        const response = { success: true, message: 'Đặt hàng thành công!', order_id: maDH };
        response.shipping = shipping;
        if (payosData) {
            response.checkoutUrl = payosData.checkoutUrl;
            response.payos_data = payosData;
        }

        res.json(response);

    } catch (error) {
        console.error('Order creation error:', error);
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        const status = Number.isInteger(error.status) ? error.status : 500;
        res.status(status).json({
            success: false,
            message: status < 500 ? error.message : (error.message || 'Không thể tạo đơn hàng lúc này. Vui lòng thử lại sau.')
        });
    }
});

router.get('/', authenticate, async (req, res, next) => {
    try {
        await expireUnpaidPayosOrders();
        let orders;
        if (['admin', 'nhanvien'].includes(req.user.role)) {
            orders = await DonHangModel.getAll(100, 0);
        } else {
            if (!req.user.customerId) return res.status(403).json({ success: false, message: 'Tài khoản chưa có hồ sơ khách hàng' });
            orders = await DonHangModel.getByCustomer(req.user.customerId, 100, 0);
        }
        res.json({ success: true, data: orders });
    } catch (error) {
        next(error);
    }
});

// Quy tắc chuyển trạng thái đơn hàng (máy trạng thái):
// choxacnhan -> daxacnhan -> dangchuanbihang -> danggiaohang -> hoanthanh
// Chỉ được đi tiếp (có thể bỏ qua bước), không được quay lui.
// Được hủy (dahuy) khi đơn chưa ở danggiaohang. hoanthanh và dahuy là trạng thái cuối.
const ORDER_FLOW = ['choxacnhan', 'daxacnhan', 'dangchuanbihang', 'danggiaohang', 'hoanthanh'];
const canTransition = (from, to) => {
    if (from === to) return false;
    if (from === 'hoanthanh' || from === 'dahuy') return false;
    if (to === 'dahuy') return ORDER_FLOW.indexOf(from) < ORDER_FLOW.indexOf('danggiaohang');
    const fromIdx = ORDER_FLOW.indexOf(from);
    const toIdx = ORDER_FLOW.indexOf(to);
    return fromIdx !== -1 && toIdx > fromIdx;
};

router.put('/:id/status', ...staff, async (req, res, next) => {
    let connection;
    try {
        const orderId = req.params.id;
        const { status } = req.body;

        if (!orderId || !status) {
            return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
        }

        const allowedStatuses = [...ORDER_FLOW, 'dahuy'];
        if (!allowedStatuses.includes(status)) return res.status(400).json({ success: false, message: 'Trạng thái đơn hàng không hợp lệ' });

        const order = await DonHangModel.getById(orderId);
        if (!order) return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });

        if (!canTransition(order.TrangThai, status)) {
            return res.status(400).json({
                success: false,
                message: `Không thể chuyển đơn từ "${order.TrangThai}" sang "${status}"`
            });
        }
        // Giống quy tắc ở /cancel: đơn đã có vận đơn GHN thì chỉ Admin được hủy.
        if (status === 'dahuy' && order.MaDonGHN && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: `Đơn đã có mã vận đơn GHN (${order.MaDonGHN}), chỉ Admin được hủy.` });
        }
        // Đơn PayOS chưa nhận được tiền chỉ được hủy, không được xác nhận hay giao
        // (trước đây xác nhận được, vận đơn tạo ra với tiền thu hộ 0đ nên hàng đi mà không thu được tiền).
        if (order.PhuongThucThanhToan === 'payos' && order.TrangThaiTT !== 'dathanhtoan' && status !== 'dahuy') {
            return res.status(409).json({ success: false, message: 'Đơn thanh toán qua PayOS chưa nhận được tiền nên chưa thể xác nhận. Chờ khách thanh toán hoặc hủy đơn.' });
        }
        // Hủy đơn đã có vận đơn: hủy vận đơn bên GHN trước để shipper không tới lấy hàng.
        let ghnCancelled = false;
        if (status === 'dahuy' && order.MaDonGHN && String(order.GHNTrangThai || '').toLowerCase() !== 'cancel') {
            let result;
            try {
                const data = await GHNService.cancelOrder([order.MaDonGHN], 'GHN-CANCEL-OTHER', 'Cửa hàng hủy đơn');
                result = Array.isArray(data) ? data[0] : data;
            } catch (error) {
                return res.status(502).json({ success: false, message: `Không hủy được vận đơn GHN ${order.MaDonGHN}: ${error.message}` });
            }
            if (!result || !result.result) {
                return res.status(409).json({ success: false, message: `GHN không cho hủy vận đơn ${order.MaDonGHN}${result && result.message ? ` (${result.message})` : ''}. Có thể shipper đã lấy hàng.` });
            }
            ghnCancelled = true;
        }

        const [staffRows] = await pool.query('SELECT MaNV FROM NhanVien WHERE MaTK = ?', [req.user.id]);
        const employeeId = staffRows[0]?.MaNV || null;

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Điều kiện TrangThai = trạng thái cũ để tránh 2 người cập nhật cùng lúc.
        const [upd] = await connection.execute(
            'UPDATE DonHang SET TrangThai = ?, MaNVXuLy = ? WHERE MaDH = ? AND TrangThai = ?',
            [status, employeeId, orderId, order.TrangThai]
        );
        if (!upd.affectedRows) {
            const conflict = new Error('Đơn hàng vừa được người khác cập nhật, vui lòng tải lại');
            conflict.status = 409;
            throw conflict;
        }

        if (status === 'hoanthanh') {
            // Giao thành công đơn COD = shipper đã thu tiền. Trước đây đơn COD hoàn thành vẫn hiện "Chưa thanh toán".
            // Đơn có đĩa ký gửi: tính tiền trả người gửi.
            await DonHangModel.onCompleted(orderId, connection);
        }

        if (status === 'dahuy') {
            if (ghnCancelled) await connection.execute("UPDATE DonHang SET GHNTrangThai = 'cancel', GHNLastSync = NOW() WHERE MaDH = ?", [orderId]);
            await DonHangModel.releaseCancelledOrder(orderId, connection);
            // Đơn trả hết bằng ví tín dụng đã được hoàn vào ví ở releaseCancelledOrder, không cần hoàn tiền ngân hàng.
            if (order.TrangThaiTT === 'dathanhtoan' && order.PhuongThucThanhToan !== 'tindung') {
                // Đã thanh toán online: chuyển sang chờ hoàn tiền, nhân viên liên hệ khách lấy thông tin ngân hàng.
                await connection.execute(
                    "UPDATE DonHang SET TrangThaiHoanTien = 'choxuly' WHERE MaDH = ?",
                    [orderId]
                );
            } else {
                await connection.execute(
                    "UPDATE ThanhToan SET TrangThaiTT = 'thatbai', NgayTT = NOW() WHERE MaDH = ? AND TrangThaiTT = 'chuathanhtoan'",
                    [orderId]
                );
            }
        }

        await connection.execute(
            'INSERT INTO NhatKyHoatDong (MaTK, HanhDong, NoiDung) VALUES (?, ?, ?)',
            [req.user.id, 'Cập nhật trạng thái đơn hàng', `Đơn #${orderId}: ${order.TrangThai} -> ${status}`]
        );

        await connection.commit();
        connection.release();
        connection = null;

        EmailService.notifyOrderStatus(orderId, status);
        res.json({ success: true, message: 'Cập nhật trạng thái thành công' });
    } catch (error) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        if (Number.isInteger(error.status)) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
});

router.put('/:id/cancel', authenticate, async (req, res, next) => {
    let connection;
    try {
        const orderId = req.params.id;
        const customer_id = req.user.customerId;
        const userRole = req.user.role;

        if (!orderId || (!customer_id && !['admin', 'nhanvien'].includes(userRole))) {
            return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
        }

        const order = await DonHangModel.getById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
        }
        if (!['admin', 'nhanvien'].includes(userRole) && order.MaKH !== customer_id) {
            return res.status(403).json({ success: false, message: 'Đơn hàng không thuộc về bạn' });
        }

        // Nghiệp vụ 3: Chặn khách tự hủy khi đơn đã tạo mã vận chuyển GHN
        if (order.MaDonGHN && !['admin'].includes(userRole)) {
            return res.status(400).json({
                success: false,
                message: `Đơn hàng đã được tạo mã vận chuyển GHN (${order.MaDonGHN}). Không thể hủy trực tuyến, vui lòng liên hệ trực tiếp với Cửa hàng để được hỗ trợ!`
            });
        }

        if (['danggiaohang', 'hoanthanh', 'dahuy'].includes(order.TrangThai)) {
            return res.status(400).json({ success: false, message: 'Đơn hàng này không thể hủy.' });
        }

        // Nghiệp vụ 1: Xử lý thu thập thông tin tài khoản hoàn tiền nếu đã thanh toán
        const { nganHang, soTK, chuTK, lyDo } = req.body || {};
        let thongTinHoanTien = null;
        let trangThaiHoanTien = 'khongapdung';

        // Đơn trả hết bằng ví tín dụng tự hoàn vào ví khi hủy, không cần thông tin ngân hàng.
        if (order.TrangThaiTT === 'dathanhtoan' && order.PhuongThucThanhToan !== 'tindung') {
            if (!nganHang || !soTK || !chuTK) {
                return res.status(400).json({
                    success: false,
                    message: 'Đơn hàng đã thanh toán online. Vui lòng cung cấp đầy đủ thông tin ngân hàng (Tên ngân hàng, Số tài khoản, Tên chủ tài khoản) để Shop hoàn tiền!'
                });
            }
            thongTinHoanTien = JSON.stringify({
                nganHang: String(nganHang).trim(),
                soTK: String(soTK).trim(),
                chuTK: String(chuTK).trim(),
                lyDo: String(lyDo || 'Khách hàng yêu cầu hủy đơn').trim(),
                ngayYeuCau: new Date().toISOString()
            });
            trangThaiHoanTien = 'choxuly';
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [updateResult] = await connection.execute(
            "UPDATE DonHang SET TrangThai = 'dahuy', ThongTinHoanTien = ?, TrangThaiHoanTien = ? WHERE MaDH = ? AND TrangThai NOT IN ('danggiaohang', 'hoanthanh', 'dahuy')",
            [thongTinHoanTien, trangThaiHoanTien, orderId]
        );

        if (!updateResult.affectedRows) {
            const conflict = new Error('Đơn hàng đã được xử lý hoặc không thể hủy');
            conflict.status = 409;
            throw conflict;
        }

        if (order.TrangThaiTT === 'chuathanhtoan') {
            await connection.execute(
                "UPDATE ThanhToan SET TrangThaiTT = 'thatbai', NgayTT = NOW() WHERE MaDH = ?",
                [orderId]
            );
        }

        await DonHangModel.releaseCancelledOrder(orderId, connection);

        await connection.commit();
        connection.release();
        connection = null;

        EmailService.notifyOrderStatus(orderId, 'dahuy');

        res.json({
            success: true,
            message: trangThaiHoanTien === 'choxuly'
                ? 'Đã hủy đơn hàng! Shop đã tiếp nhận thông tin ngân hàng và sẽ xử lý hoàn tiền sớm nhất.'
                : 'Đã hủy đơn hàng thành công.'
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        res.status(error.status || 500).json({ success: false, message: 'Lỗi: ' + error.message });
    }
});

router.put('/:id/refund-confirm', ...staff, async (req, res, next) => {
    try {
        const orderId = req.params.id;
        const order = await DonHangModel.getById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }
        if (order.TrangThaiHoanTien !== 'choxuly') {
            return res.status(400).json({ success: false, message: 'Đơn hàng không ở trạng thái chờ hoàn tiền' });
        }

        await pool.query(
            "UPDATE DonHang SET TrangThaiHoanTien = 'dahoantien' WHERE MaDH = ?",
            [orderId]
        );

        EmailService.notifyOrderStatus(orderId, 'dahoantien');

        res.json({ success: true, message: 'Xác nhận hoàn tiền thành công!' });
    } catch (error) {
        next(error);
    }
});

router.get('/:id', authenticate, async (req, res, next) => {
    try {
        const orderId = req.params.id;
        const customer_id = ['admin', 'nhanvien'].includes(req.user.role) ? null : req.user.customerId;

        if (!orderId) {
            return res.json({ success: false, message: 'Thiếu order_id' });
        }

        await expireUnpaidPayosOrders();

        const orderInfo = await DonHangModel.getById(orderId, customer_id);
        if (!orderInfo) {
            return res.json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }

        const items = await DonHangModel.getOrderItems(orderId);
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

router.get('/:id/status', authenticate, async (req, res, next) => {
    try {
        const orderId = req.params.id;
        if (!orderId) {
            return res.json({ success: false });
        }

        await expireUnpaidPayosOrders();

        const customerId = ['admin', 'nhanvien'].includes(req.user.role) ? null : req.user.customerId;
        const order = await DonHangModel.getById(orderId, customerId);
        if (!order) {
            return res.json({ success: false });
        }

        if (order.TrangThai === 'dahuy') {
            return res.json({ success: true, status: 'dahuy', message: 'Đơn hàng đã bị hủy (hết hạn hoặc theo yêu cầu)' });
        }

        if (order.TrangThaiTT === 'dathanhtoan') {
            return res.json({ success: true, status: 'dathanhtoan' });
        }

        if (order.ThanhToanHinhThuc === 'payos' && order.MaGiaoDich) {
            try {
                const orderCode = order.MaGiaoDich;
                const result = await PayOSService.getPaymentRequest(orderCode);
                if (result.code === '00' && result.data && result.data.status) {
                    const payosStatus = result.data.status;
                    if (payosStatus === 'PAID') {
                        await pool.query("UPDATE ThanhToan SET TrangThaiTT = 'dathanhtoan', NgayTT = COALESCE(NgayTT, NOW()) WHERE MaDH = ?", [orderId]);
                        await pool.query("UPDATE DonHang SET TrangThai = 'daxacnhan' WHERE MaDH = ? AND TrangThai = 'choxacnhan'", [orderId]);
                        await pool.query("UPDATE DonHang SET TrangThaiHoanTien = 'choxuly' WHERE MaDH = ? AND TrangThai = 'dahuy' AND TrangThaiHoanTien = 'khongapdung'", [orderId]);
                        return res.json({ success: true, status: 'dathanhtoan' });
                    } else if (payosStatus === 'CANCELLED' || payosStatus === 'EXPIRED') {
                        // Hủy đơn + hoàn kho trong 1 transaction. Trước đây chỉ đặt ThanhToan = thatbai,
                        // khiến tiến trình tự hủy (chỉ quét TrangThaiTT = chuathanhtoan) bỏ sót đơn và giữ tồn kho mãi.
                        const conn = await pool.getConnection();
                        try {
                            await conn.beginTransaction();
                            const [cancelled] = await conn.execute(
                                "UPDATE DonHang SET TrangThai = 'dahuy' WHERE MaDH = ? AND TrangThai = 'choxacnhan'",
                                [orderId]
                            );
                            await conn.execute(
                                "UPDATE ThanhToan SET TrangThaiTT = 'thatbai', NgayTT = NOW() WHERE MaDH = ? AND TrangThaiTT = 'chuathanhtoan'",
                                [orderId]
                            );
                            if (cancelled.affectedRows) await DonHangModel.releaseCancelledOrder(orderId, conn);
                            await conn.commit();
                        } catch (txErr) {
                            await conn.rollback();
                            throw txErr;
                        } finally {
                            conn.release();
                        }
                        return res.json({ success: true, status: 'thatbai' });
                    }
                }
            } catch (err) {
                console.error('PayOS check error:', err.message);
            }
        }

        res.json({ success: true, status: order.TrangThaiTT });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
