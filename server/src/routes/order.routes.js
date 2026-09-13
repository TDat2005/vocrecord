const express = require('express');
const router = express.Router();
const axios = require('axios');
const pool = require('../config/database');
const DonHangModel = require('../models/donhang.model');
const SanPhamModel = require('../models/sanpham.model');
const KhachHangModel = require('../models/khachhang.model');
const DiscountModel = require('../models/discount.model');
const PayOSService = require('../services/payos.service');
const EmailService = require('../services/email.service');
const GHNService = require('../services/ghn.service');
const { createShipment } = require('./shipping.routes');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const staff = [authenticate, requireRole('admin', 'nhanvien')];

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
              AND dh.NgayDat < (NOW() - INTERVAL 10 MINUTE)
        `);

        for (const order of expiredOrders) {
            try {
                await connection.beginTransaction();
                await connection.execute(
                    "UPDATE DonHang SET TrangThai = 'dahuy', GhiChu = CONCAT(COALESCE(GhiChu, ''), ' [Hệ thống tự động hủy do quá 10 phút chưa thanh toán PayOS]') WHERE MaDH = ? AND TrangThai = 'choxacnhan'",
                    [order.MaDH]
                );
                await connection.execute(
                    "UPDATE ThanhToan SET TrangThaiTT = 'thatbai', NgayTT = NOW() WHERE MaDH = ? AND TrangThaiTT = 'chuathanhtoan'",
                    [order.MaDH]
                );
                const [items] = await connection.execute(
                    "SELECT MaSP, SoLuong FROM ChiTietDonHang WHERE MaDH = ?",
                    [order.MaDH]
                );
                for (const item of items) {
                    await connection.execute(
                        "UPDATE SanPham SET SoLuongTon = SoLuongTon + ? WHERE MaSP = ?",
                        [item.SoLuong, item.MaSP]
                    );
                }
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

        const allowedPaymentMethods = ['cod', 'payos'];
        if (!allowedPaymentMethods.includes(phuongThucThanhToan)) {
            return res.status(400).json({ success: false, message: 'Phương thức thanh toán không hợp lệ' });
        }

        const isPayos = (phuongThucThanhToan === 'payos');
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
            if (['hethang', 'ngungkinhdoanh'].includes(product.TinhTrang) || Number(product.SoLuongTon) < quantity) {
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

        let soTienGiam = 0;
        if (discountCode) {
            soTienGiam = await DiscountModel.calculateInternalDiscount(discountCode, subtotal, connection);
        }

        const shippingFee = 30000;
        let totalAfterDiscount = subtotal - soTienGiam + shippingFee;
        if (totalAfterDiscount < 0) totalAfterDiscount = 0;

        const maDH = await DonHangModel.create(customer_id, totalAfterDiscount, address, nguoiNhan, sdtNhan, ghiChu, phuongThucThanhToan, discountCode, soTienGiam, connection);

        await connection.execute(
            'UPDATE DonHang SET PhiVanChuyen = ?, GHNProvinceName = ?, GHNWardName = ? WHERE MaDH = ?',
            [shippingFee, ghn?.provinceName || null, ghn?.wardName || null, maDH]
        );

        if (soTienGiam > 0 && discountCode) {
            await DiscountModel.incrementUsage(discountCode, connection);
        }

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
            
            const returnUrl = (process.env.PAYOS_RETURN_URL || '') + "?order_id=" + maDH;
            const cancelUrl = (process.env.PAYOS_CANCEL_URL || '') + "?order_id=" + maDH;
            
            payosData = await PayOSService.createPaymentLink(orderCode, totalAfterDiscount, "VocRecords DH" + maDH, returnUrl, cancelUrl);
        } else {
            await DonHangModel.createPayment(maDH, totalAfterDiscount, phuongThucThanhToan, trangThaiThanhToan, null, connection);
        }

        await connection.commit();
        connection.release();

        let shipping = { status: GHNService.isConfigured() ? 'pending_confirmation' : 'disabled', fee: shippingFee };

        try {
            const customerInfo = await KhachHangModel.getProfile(customer_id);
            if (customerInfo && customerInfo.Email) {
                const orderItems = await DonHangModel.getOrderItems(maDH);
                const emailData = {
                    orderId: maDH,
                    total: totalAfterDiscount,
                    items: orderItems,
                    address,
                    nguoiNhan,
                    sdtNhan
                };
                await EmailService.sendOrderConfirmation(customerInfo.Email, emailData);
            }
        } catch (emailErr) {
            console.error('Order email error:', emailErr.message);
        }

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

router.put('/:id/status', ...staff, async (req, res, next) => {
    try {
        const orderId = req.params.id;
        const { status } = req.body;

        if (!orderId || !status) {
            return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
        }

        const allowedStatuses = ['choxacnhan', 'daxacnhan', 'dangchuanbihang', 'danggiaohang', 'hoanthanh', 'dahuy'];
        if (!allowedStatuses.includes(status)) return res.status(400).json({ success: false, message: 'Trạng thái đơn hàng không hợp lệ' });
        const [staffRows] = await pool.query('SELECT MaNV FROM NhanVien WHERE MaTK = ?', [req.user.id]);
        const employeeId = staffRows[0]?.MaNV || null;
        const updated = await DonHangModel.updateStatus(orderId, status, employeeId);
        if (updated) {
            try {
                const order = await DonHangModel.getById(orderId);
                if (order && order.MaKH) {
                    const customer = await KhachHangModel.getProfile(order.MaKH);
                    if (customer && customer.Email) {
                        await EmailService.sendOrderStatusUpdate(customer.Email, orderId, status);
                    }
                }
            } catch (emailErr) {
                console.error('Status email error:', emailErr.message);
            }

            res.json({ success: true, message: 'Cập nhật trạng thái thành công' });
        } else {
            res.json({ success: false, message: 'Lỗi cập nhật' });
        }
    } catch (error) {
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

        if (order.TrangThaiTT === 'dathanhtoan') {
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

        // Hoàn lại tồn kho
        const items = await DonHangModel.getOrderItems(orderId, connection);
        for (const item of items) {
            await SanPhamModel.updateStock(item.MaSP, item.SoLuong, connection);
        }

        await connection.commit();
        connection.release();

        try {
            const customer = await KhachHangModel.getProfile(order.MaKH);
            if (customer && customer.Email) {
                await EmailService.sendOrderStatusUpdate(customer.Email, orderId, 'dahuy');
            }
        } catch (emailErr) {
            console.error('Cancel email error:', emailErr.message);
        }

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

        try {
            if (order.MaKH) {
                const customer = await KhachHangModel.getProfile(order.MaKH);
                if (customer && customer.Email) {
                    await EmailService.sendOrderStatusUpdate(customer.Email, orderId, 'dahoantien');
                }
            }
        } catch (emailErr) {
            console.error('Refund email error:', emailErr.message);
        }

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
        res.json({ success: true, data: { info: orderInfo, items } });
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
                const response = await axios.get(`https://api-merchant.payos.vn/v2/payment-requests/${orderCode}`, {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-client-id': process.env.PAYOS_CLIENT_ID,
                        'x-api-key': process.env.PAYOS_API_KEY
                    }
                });
                
                const result = response.data;
                if (result.code === '00' && result.data && result.data.status) {
                    const payosStatus = result.data.status;
                    if (payosStatus === 'PAID') {
                        await pool.query("UPDATE ThanhToan SET TrangThaiTT = 'dathanhtoan' WHERE MaDH = ?", [orderId]);
                        await pool.query("UPDATE DonHang SET TrangThai = 'daxacnhan' WHERE MaDH = ? AND TrangThai = 'choxacnhan'", [orderId]);
                        return res.json({ success: true, status: 'dathanhtoan' });
                    } else if (payosStatus === 'CANCELLED' || payosStatus === 'EXPIRED') {
                        await pool.query("UPDATE ThanhToan SET TrangThaiTT = 'thatbai' WHERE MaDH = ?", [orderId]);
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
