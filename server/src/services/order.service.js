const pool = require('../config/database');
const DonHangModel = require('../models/donhang.model');
const GHNService = require('./ghn.service');
const EmailService = require('./email.service');
const { withTransaction } = require('../utils/db');
const { fail } = require('../utils/http');
const { PAYOS_TIMEOUT_MINUTES } = require('../constants/order');

// Mọi nơi hủy đơn (khách hủy, nhân viên hủy, PayOS báo thất bại/quá hạn, GHN báo hủy/hoàn hàng)
// đều đi qua cancelOrder() để cùng một quy tắc: hủy vận đơn GHN, hoàn kho, trả lượt mã giảm giá,
// hoàn ví tín dụng và xử lý tiền đã thanh toán. Trước đây logic này chép ở 6 nơi và mỗi nơi lệch một chút.

const GHN_CANCELLED = 'cancel';

/** Hủy vận đơn bên GHN để shipper không tới lấy hàng. Lỗi thì ném ra để không hủy đơn trong CSDL. */
async function cancelGhnShipment(order) {
    if (!order.MaDonGHN || String(order.GHNTrangThai || '').toLowerCase() === GHN_CANCELLED) return false;
    let result;
    try {
        const data = await GHNService.cancelOrder([order.MaDonGHN], 'GHN-CANCEL-OTHER', 'Cửa hàng hủy đơn');
        result = Array.isArray(data) ? data[0] : data;
    } catch (error) {
        throw fail(502, `Không hủy được vận đơn GHN ${order.MaDonGHN}: ${error.message}`);
    }
    if (!result || !result.result) {
        throw fail(409, `GHN không cho hủy vận đơn ${order.MaDonGHN}${result && result.message ? ` (${result.message})` : ''}. Có thể shipper đã lấy hàng.`);
    }
    return true;
}

/**
 * Hủy một đơn đã được khóa bằng DonHangModel.lockById() trong transaction `connection`.
 * - cancelShipment: đơn có vận đơn GHN thì hủy vận đơn trước (lỗi thì không hủy đơn).
 * - restock: cộng lại tồn kho (false khi GHN báo hàng mất/hỏng).
 * - note: lý do do hệ thống ghi thêm vào ghi chú đơn.
 * - refundInfo: thông tin tài khoản khách gửi để nhận hoàn tiền (JSON).
 * Trả về false nếu đơn đã đổi trạng thái (không hủy được), true nếu hủy thành công.
 */
async function cancelOrder(connection, order, { cancelShipment = false, restock = true, note = null, refundInfo = null, staffId = null } = {}) {
    const ghnCancelled = cancelShipment ? await cancelGhnShipment(order) : false;
    const [updated] = await connection.query(
        `UPDATE DonHang SET TrangThai = 'dahuy',
                GhiChu = IF(? IS NULL, GhiChu, LEFT(CONCAT_WS(' ', GhiChu, ?), 255)),
                ThongTinHoanTien = COALESCE(?, ThongTinHoanTien),
                MaNVXuLy = COALESCE(?, MaNVXuLy)
         WHERE MaDH = ? AND TrangThai = ?`,
        [note, note, refundInfo, staffId, order.MaDH, order.TrangThai]
    );
    if (!updated.affectedRows) return false;

    if (ghnCancelled) {
        await connection.execute("UPDATE DonHang SET GHNTrangThai = ?, GHNLastSync = NOW() WHERE MaDH = ?", [GHN_CANCELLED, order.MaDH]);
    }
    await DonHangModel.releaseCancelledOrder(order.MaDH, connection, { restock });

    // Đơn trả hết bằng ví tín dụng đã được hoàn vào ví ở bước trên, không cần hoàn tiền ngân hàng.
    if (order.TrangThaiTT === 'dathanhtoan' && order.PhuongThucThanhToan !== 'tindung') {
        await connection.execute(
            "UPDATE DonHang SET TrangThaiHoanTien = 'choxuly' WHERE MaDH = ? AND TrangThaiHoanTien IN ('khongapdung', 'choxuly')",
            [order.MaDH]
        );
    } else {
        await connection.execute(
            "UPDATE ThanhToan SET TrangThaiTT = 'thatbai', NgayTT = NOW() WHERE MaDH = ? AND TrangThaiTT = 'chuathanhtoan'",
            [order.MaDH]
        );
    }
    return true;
}

/**
 * Ghi nhận PayOS đã nhận tiền (webhook hoặc khách bấm kiểm tra). Chạy lại nhiều lần không sao.
 * Đơn đang chờ xác nhận chuyển sang "đã xác nhận"; đơn đã bị hủy (quá hạn) mà tiền vẫn về thì chuyển sang chờ hoàn tiền.
 */
async function markOrderPaid(connection, orderId) {
    const [paid] = await connection.execute(
        "UPDATE ThanhToan SET TrangThaiTT = 'dathanhtoan', NgayTT = COALESCE(NgayTT, NOW()) WHERE MaDH = ? AND TrangThaiTT <> 'dathanhtoan'",
        [orderId]
    );
    if (!paid.affectedRows) return false;
    // Thanh toán xong chỉ là "đã xác nhận"; còn phải chuẩn bị hàng và tạo vận đơn GHN trước khi sang "đang giao".
    await connection.execute("UPDATE DonHang SET TrangThai = 'daxacnhan' WHERE MaDH = ? AND TrangThai = 'choxacnhan'", [orderId]);
    await connection.execute(
        "UPDATE DonHang SET TrangThaiHoanTien = 'choxuly' WHERE MaDH = ? AND TrangThai = 'dahuy' AND TrangThaiHoanTien = 'khongapdung'",
        [orderId]
    );
    return true;
}

/** Hủy đơn PayOS chờ thanh toán quá PAYOS_TIMEOUT_MINUTES phút (link PayOS cũng hết hạn cùng lúc). */
async function expireUnpaidPayosOrders() {
    const [expired] = await pool.query(
        `SELECT dh.MaDH FROM DonHang dh JOIN ThanhToan tt ON dh.MaDH = tt.MaDH
         WHERE dh.PhuongThucThanhToan = 'payos' AND dh.TrangThai = 'choxacnhan' AND tt.TrangThaiTT = 'chuathanhtoan'
           AND dh.NgayDat < (NOW() - INTERVAL ? MINUTE)`,
        [PAYOS_TIMEOUT_MINUTES]
    );
    for (const { MaDH } of expired) {
        try {
            const cancelled = await withTransaction(async (connection) => {
                const order = await DonHangModel.lockById(MaDH, connection);
                // Kiểm tra lại sau khi khóa: webhook có thể vừa ghi nhận đã thanh toán.
                if (!order || order.TrangThai !== 'choxacnhan' || order.TrangThaiTT !== 'chuathanhtoan') return false;
                return cancelOrder(connection, order, { note: `[Hệ thống tự hủy do quá ${PAYOS_TIMEOUT_MINUTES} phút chưa thanh toán PayOS]` });
            });
            if (cancelled) {
                console.log(`[PayOS Expiry] Đã tự động hủy đơn #${MaDH} và hoàn lại tồn kho do quá hạn ${PAYOS_TIMEOUT_MINUTES} phút`);
                EmailService.notifyOrderStatus(MaDH, 'dahuy');
            }
        } catch (error) {
            console.error(`[PayOS Expiry Error] Đơn #${MaDH}:`, error.message);
        }
    }
}

module.exports = { cancelOrder, cancelGhnShipment, markOrderPaid, expireUnpaidPayosOrders };
