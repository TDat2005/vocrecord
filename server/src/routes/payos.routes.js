const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const PayOSService = require('../services/payos.service');
const DonHangModel = require('../models/donhang.model');

// 1. POST /webhook — Receive PayOS webhook callback
router.post('/webhook', async (req, res, next) => {
    try {
        const data = req.body;

        if (!data || data.success === undefined || !data.data) {
            return res.json({ success: false, message: 'Invalid webhook payload' });
        }

        if (data.success === false) {
            return res.json({ success: true }); // Acknowledge bad payload to payos
        }

        const webhookData = data.data;
        const signature = data.signature;

        // Verify HMAC-SHA256 signature before touching order or inventory data.
        if (!PayOSService.verifyWebhookSignature(webhookData, signature)) {
            return res.status(401).json({ success: false, message: 'Invalid signature' });
        }

        const orderCode = webhookData.orderCode;
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const [thanhToanRows] = await connection.query(
                `SELECT tt.MaDH, tt.TrangThaiTT
                 FROM ThanhToan tt
                 WHERE tt.MaGiaoDich = ?
                 FOR UPDATE`,
                [orderCode]
            );
            const thanhToan = thanhToanRows[0];

            if (thanhToan) {
                const maDH = thanhToan.MaDH;
                if (webhookData.code === '00') {
                    if (thanhToan.TrangThaiTT !== 'dathanhtoan') {
                        // Thanh toán xong chỉ là "đã xác nhận"; còn phải chuẩn bị hàng và tạo vận đơn GHN
                        // trước khi sang "đang giao" (đồng bộ với nhánh kiểm tra trạng thái trong order.routes.js).
                        await connection.query("UPDATE ThanhToan SET TrangThaiTT = 'dathanhtoan', NgayTT = NOW() WHERE MaDH = ?", [maDH]);
                        await connection.query("UPDATE DonHang SET TrangThai = 'daxacnhan' WHERE MaDH = ? AND TrangThai = 'choxacnhan'", [maDH]);
                        // Đơn đã bị tự hủy (quá hạn) nhưng tiền vẫn về: cần hoàn tiền cho khách.
                        await connection.query("UPDATE DonHang SET TrangThaiHoanTien = 'choxuly' WHERE MaDH = ? AND TrangThai = 'dahuy' AND TrangThaiHoanTien = 'khongapdung'", [maDH]);
                    }
                } else if (!['thatbai', 'dahuy', 'dathanhtoan'].includes(thanhToan.TrangThaiTT)) {
                    // The payment webhook can be retried. Re-stock only on the first failure.
                    await connection.query("UPDATE ThanhToan SET TrangThaiTT = 'thatbai', NgayTT = NOW() WHERE MaDH = ?", [maDH]);
                    const [cancelled] = await connection.query("UPDATE DonHang SET TrangThai = 'dahuy' WHERE MaDH = ? AND TrangThai <> 'dahuy'", [maDH]);
                    if (cancelled.affectedRows) await DonHangModel.releaseCancelledOrder(maDH, connection);
                }
            }
            await connection.commit();
            res.json({ success: true });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        next(error);
    }
});

module.exports = router;
