const express = require('express');
const router = express.Router();
const PayOSService = require('../services/payos.service');
const EmailService = require('../services/email.service');
const DonHangModel = require('../models/donhang.model');
const { cancelOrder, markOrderPaid } = require('../services/order.service');
const { withTransaction } = require('../utils/db');

// POST /webhook — PayOS báo kết quả thanh toán. PayOS có thể gửi lại nhiều lần nên mọi bước đều chạy lại được.
router.post('/webhook', async (req, res, next) => {
    try {
        const data = req.body;
        if (!data || data.success === undefined || !data.data) {
            return res.status(400).json({ success: false, message: 'Invalid webhook payload' });
        }
        if (data.success === false) return res.json({ success: true }); // PayOS gửi thử: chỉ cần xác nhận đã nhận

        const webhookData = data.data;
        // Kiểm tra chữ ký HMAC-SHA256 trước khi đụng tới đơn hàng, tồn kho.
        if (!PayOSService.verifyWebhookSignature(webhookData, data.signature)) {
            return res.status(401).json({ success: false, message: 'Invalid signature' });
        }

        const payment = await DonHangModel.findPaymentByTransaction(webhookData.orderCode);
        if (payment) {
            const cancelled = await withTransaction(async (connection) => {
                if (webhookData.code === '00') {
                    await markOrderPaid(connection, payment.MaDH);
                    return false;
                }
                const order = await DonHangModel.lockById(payment.MaDH, connection);
                if (!order || order.TrangThai === 'dahuy' || order.TrangThaiTT !== 'chuathanhtoan') return false;
                return cancelOrder(connection, order, { note: '[PayOS báo thanh toán thất bại]' });
            });
            if (cancelled) EmailService.notifyOrderStatus(payment.MaDH, 'dahuy');
        }
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
