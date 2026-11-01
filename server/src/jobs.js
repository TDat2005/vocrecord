const pool = require('./config/database');
const OtpModel = require('./models/otp.model');
const { expireUnpaidPayosOrders } = require('./services/order.service');
const { expireConsignments } = require('./services/tradein/consignment');

// Các tiến trình chạy định kỳ của server. Gom ở một chỗ và chỉ khởi động khi server chạy,
// không chạy ngay lúc một file route được require (trước đây làm cả script kiểm thử cũng chạy theo).
const MINUTE = 60 * 1000;

const every = (name, intervalMs, task) => {
    let running = false;
    const run = async () => {
        if (running) return; // lần trước chưa xong thì bỏ qua lần này
        running = true;
        try {
            await task();
        } catch (error) {
            console.error(`[job:${name}]`, error.message);
        } finally {
            running = false;
        }
    };
    setInterval(run, intervalMs).unref();
    setTimeout(run, 5000).unref();
};

function startJobs() {
    every('payos-expiry', 30 * 1000, expireUnpaidPayosOrders);
    every('consignment-expiry', 60 * MINUTE, expireConsignments);
    every('cleanup', 60 * MINUTE, async () => {
        await OtpModel.cleanExpired();
        // Đĩa khách thêm để thẩm định nhưng không gửi yêu cầu (kèm ảnh) sau 2 ngày thì xóa.
        await pool.query('DELETE FROM ChiTietThuMua WHERE MaYC IS NULL AND NgayTao < NOW() - INTERVAL 2 DAY');
    });
}

module.exports = { startJobs };
