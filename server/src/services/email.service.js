const nodemailer = require('nodemailer');
const pool = require('../config/database');

const formatMoney = (value) => `${new Intl.NumberFormat('vi-VN').format(Number(value) || 0)}đ`;

let cachedTransporter = null;

class EmailService {
    static isConfigured() {
        return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
    }

    /**
     * Một transporter dùng chung (pool) có giới hạn thời gian chờ.
     * Không đặt timeout thì SMTP chậm/bị chặn sẽ treo request tới 2 phút (mặc định của nodemailer).
     */
    static getTransporter() {
        if (cachedTransporter) return cachedTransporter;
        const host = process.env.SMTP_HOST || 'smtp.gmail.com';
        const port = Number(process.env.SMTP_PORT) || 587;
        // App Password của Gmail hiển thị dạng "abcd efgh ijkl mnop"; bỏ khoảng trắng cho chắc chắn.
        const rawPass = process.env.SMTP_PASS || '';
        const pass = host.includes('gmail') ? rawPass.replace(/\s+/g, '') : rawPass;

        cachedTransporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465, // 465 dùng SSL ngay từ đầu, 587 dùng STARTTLS
            requireTLS: port !== 465,
            pool: true,
            maxConnections: 2,
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 20000,
            auth: { user: process.env.SMTP_USER || '', pass }
        });
        return cachedTransporter;
    }

    static async send({ to, subject, html, text }) {
        if (!to) return false;
        if (!this.isConfigured()) {
            console.warn(`[Email] SMTP chưa cấu hình, bỏ qua email "${subject}" tới ${to}.`);
            return false;
        }
        const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
        const fromName = process.env.SMTP_FROM_NAME || 'Vọc Records';
        try {
            await this.getTransporter().sendMail({ from: `"${fromName}" <${fromEmail}>`, to, subject, html, text });
            return true;
        } catch (error) {
            console.error(`[Email] Gửi "${subject}" tới ${to} thất bại:`, error.code || '', error.message);
            return false;
        }
    }

    /** Gửi OTP xác thực (đăng ký / quên mật khẩu). Hàm này được chờ vì người dùng cần biết đã gửi được hay chưa. */
    static async sendOTP(email, otpCode, type = 'dangky') {
        const typeText = type === 'dangky' ? 'Đăng ký tài khoản' : 'Khôi phục mật khẩu';
        if (!this.isConfigured() && process.env.NODE_ENV !== 'production') {
            // Máy dev chưa có SMTP: in mã ra log server để vẫn đăng ký / đổi mật khẩu thử được.
            console.warn(`[Email] SMTP chưa cấu hình. OTP ${typeText.toLowerCase()} cho ${email}: ${otpCode}`);
            return true;
        }
        return this.send({
            to: email,
            subject: `${typeText} - Mã xác thực Vọc Records`,
            html: this.getOtpEmailTemplate(otpCode, typeText),
            text: `Mã OTP của bạn là: ${otpCode}. Mã có hiệu lực trong 5 phút.`
        });
    }

    static async sendOrderConfirmation(email, orderData) {
        return this.send({
            to: email,
            subject: `Xác nhận đơn hàng #${orderData.orderId} - Vọc Records`,
            html: this.getOrderConfirmationTemplate(orderData),
            text: `Đơn hàng #${orderData.orderId} đã được đặt thành công. Tổng tiền: ${formatMoney(orderData.total)}`
        });
    }

    static async sendOrderStatusUpdate(email, orderId, newStatus) {
        const statusText = this.getStatusText(newStatus);
        return this.send({
            to: email,
            subject: `Đơn hàng #${orderId}: ${statusText} - Vọc Records`,
            html: this.getOrderStatusTemplate(orderId, newStatus, statusText),
            text: `Đơn hàng #${orderId} đã được cập nhật trạng thái: ${statusText}`
        });
    }

    /**
     * Gửi email trạng thái đơn ở nền: API trả kết quả ngay, không chờ SMTP.
     * Lỗi gửi mail chỉ ghi log, không làm hỏng thao tác của người dùng.
     */
    static notifyOrderStatus(orderId, status) {
        (async () => {
            const [rows] = await pool.query(
                'SELECT kh.Email FROM DonHang dh JOIN KhachHang kh ON kh.MaKH = dh.MaKH WHERE dh.MaDH = ?',
                [orderId]
            );
            if (rows[0]?.Email) await this.sendOrderStatusUpdate(rows[0].Email, orderId, status);
        })().catch((error) => console.error('[Email] notifyOrderStatus:', error.message));
    }

    static getStatusText(status) {
        const map = {
            choxacnhan: 'Chờ xác nhận',
            daxacnhan: 'Đã xác nhận',
            dangchuanbihang: 'Đang chuẩn bị hàng',
            danggiaohang: 'Đang giao hàng',
            hoanthanh: 'Đã giao thành công',
            dahuy: 'Đã hủy',
            dahoantien: 'Đã hoàn tiền'
        };
        return map[status] || status;
    }

    static escapeHtml(unsafe) {
        return (unsafe ?? '').toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // ═══════════════════════════════════════════
    // MẪU EMAIL (HTML) — kiểu đơn giản giống email thông báo của Shopify
    // ═══════════════════════════════════════════

    static layout(title, body) {
        return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f6f7;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f7;padding:32px 12px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #e3e3e3;border-radius:12px;">
        <tr><td style="padding:24px 28px 0;font-size:18px;font-weight:700;">Vọc Records</td></tr>
        <tr><td style="padding:20px 28px 8px;">
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;">${title}</h1>
          ${body}
        </td></tr>
        <tr><td style="padding:20px 28px 24px;border-top:1px solid #ebebeb;color:#8a8a8a;font-size:12px;line-height:1.6;">
          Vọc Records · 54 Triều Khúc, Thanh Xuân, Hà Nội · Hotline 0766 255 478<br>
          Đây là email tự động, vui lòng không trả lời email này.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
    }

    static getOtpEmailTemplate(otpCode, typeText) {
        return this.layout(typeText, `
          <p style="margin:0 0 20px;color:#616161;font-size:14px;line-height:1.6;">
            Dùng mã dưới đây để tiếp tục. Mã có hiệu lực trong <strong>5 phút</strong>.
          </p>
          <div style="margin:0 0 20px;padding:16px;background:#f6f6f7;border-radius:8px;text-align:center;font-size:30px;font-weight:700;letter-spacing:10px;">
            ${this.escapeHtml(otpCode)}
          </div>
          <p style="margin:0 0 12px;color:#8a8a8a;font-size:13px;line-height:1.6;">
            Nếu bạn không yêu cầu mã này, hãy bỏ qua email. Không chia sẻ mã OTP cho bất kỳ ai.
          </p>`);
    }

    static getOrderConfirmationTemplate(orderData) {
        const rows = (orderData.items || []).map((item) => {
            const name = this.escapeHtml(item.TenSP || item.name || 'Sản phẩm');
            const qty = Number(item.SoLuong || item.qty || 1);
            const price = Number(item.DonGia || item.price || 0);
            return `
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #ebebeb;font-size:14px;">${name} <span style="color:#8a8a8a;">× ${qty}</span></td>
                <td style="padding:10px 0;border-bottom:1px solid #ebebeb;font-size:14px;text-align:right;white-space:nowrap;">${formatMoney(price * qty)}</td>
              </tr>`;
        }).join('');
        const line = (label, value) => `
              <tr>
                <td style="padding:4px 0;font-size:14px;color:#616161;">${label}</td>
                <td style="padding:4px 0;font-size:14px;text-align:right;">${value}</td>
              </tr>`;

        return this.layout(`Cảm ơn bạn đã đặt hàng!`, `
          <p style="margin:0 0 20px;color:#616161;font-size:14px;line-height:1.6;">
            Đơn hàng <strong>#${this.escapeHtml(orderData.orderId)}</strong> đã được ghi nhận. Chúng tôi sẽ gửi email khi đơn được xác nhận và giao đi.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
            ${orderData.subtotal !== undefined ? line('Tạm tính', formatMoney(orderData.subtotal)) : ''}
            ${Number(orderData.discount) > 0 ? line('Giảm giá', `−${formatMoney(orderData.discount)}`) : ''}
            ${orderData.shippingFee !== undefined ? line('Phí vận chuyển', formatMoney(orderData.shippingFee)) : ''}
            <tr>
              <td style="padding:12px 0 0;border-top:1px solid #e3e3e3;font-size:16px;font-weight:600;">Tổng cộng</td>
              <td style="padding:12px 0 0;border-top:1px solid #e3e3e3;font-size:16px;font-weight:600;text-align:right;">${formatMoney(orderData.total)}</td>
            </tr>
          </table>
          <div style="margin:24px 0 8px;padding:16px;background:#f6f6f7;border-radius:8px;font-size:14px;line-height:1.6;">
            <div style="color:#616161;font-size:13px;margin-bottom:4px;">Giao tới</div>
            <strong>${this.escapeHtml(orderData.nguoiNhan)}</strong> · ${this.escapeHtml(orderData.sdtNhan)}<br>
            ${this.escapeHtml(orderData.address)}
          </div>`);
    }

    static getOrderStatusTemplate(orderId, status, statusText) {
        const messages = {
            daxacnhan: 'Đơn hàng của bạn đã được xác nhận và đang được xử lý.',
            dangchuanbihang: 'Cửa hàng đang đóng gói đơn hàng và chờ đơn vị vận chuyển đến lấy.',
            danggiaohang: 'Đơn hàng đã được giao cho đơn vị vận chuyển. Bạn sẽ sớm nhận được hàng!',
            hoanthanh: 'Đơn hàng đã được giao thành công. Cảm ơn bạn đã tin tưởng Vọc Records!',
            dahuy: 'Đơn hàng đã được hủy. Nếu cần hỗ trợ, vui lòng liên hệ cửa hàng.',
            dahoantien: 'Cửa hàng đã chuyển tiền hoàn lại vào tài khoản của bạn. Vui lòng kiểm tra biến động số dư.'
        };
        return this.layout(`Đơn hàng #${this.escapeHtml(orderId)}: ${this.escapeHtml(statusText)}`, `
          <p style="margin:0 0 20px;color:#616161;font-size:14px;line-height:1.6;">
            ${messages[status] || 'Trạng thái đơn hàng của bạn vừa được cập nhật.'}
          </p>
          <p style="margin:0 0 12px;color:#8a8a8a;font-size:13px;">Bạn có thể xem chi tiết đơn hàng trong mục Tài khoản trên website.</p>`);
    }
}

module.exports = EmailService;
