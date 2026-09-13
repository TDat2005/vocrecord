const nodemailer = require('nodemailer');

class EmailService {
    /**
     * Tạo instance nodemailer đã config sẵn SMTP
     */
    static createMailer() {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false, // true for 465, false for other ports
            requireTLS: true,
            auth: {
                user: process.env.SMTP_USER || '',
                pass: process.env.SMTP_PASS || ''
            }
        });
    }

    /**
     * Gửi OTP xác thực qua email
     */
    static async sendOTP(email, otpCode, type = 'dangky') {
        try {
            const transporter = this.createMailer();
            const typeText = type === 'dangky' ? 'Đăng Ký Tài Khoản' : 'Khôi Phục Mật Khẩu';
            
            const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
            const fromName = process.env.SMTP_FROM_NAME || 'Voc Records';

            const mailOptions = {
                from: `"${fromName}" <${fromEmail}>`,
                to: email,
                subject: `[${typeText}] Mã xác thực OTP - Vọc Records`,
                html: this.getOtpEmailTemplate(otpCode, typeText),
                text: `Mã OTP của bạn là: ${otpCode}. Mã có hiệu lực trong 5 phút.`
            };

            await transporter.sendMail(mailOptions);
            return true;
        } catch (error) {
            console.error("EmailService::sendOTP Error:", error.message);
            return false;
        }
    }

    /**
     * Gửi email xác nhận đơn hàng
     */
    static async sendOrderConfirmation(email, orderData) {
        try {
            const transporter = this.createMailer();
            
            const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
            const fromName = process.env.SMTP_FROM_NAME || 'Voc Records';

            const totalFormatted = new Intl.NumberFormat('vi-VN').format(orderData.total || 0) + 'đ';

            const mailOptions = {
                from: `"${fromName}" <${fromEmail}>`,
                to: email,
                subject: `Xác nhận đơn hàng #${orderData.orderId} - Vọc Records`,
                html: this.getOrderConfirmationTemplate(orderData),
                text: `Đơn hàng #${orderData.orderId} đã được đặt thành công. Tổng tiền: ${totalFormatted}`
            };

            await transporter.sendMail(mailOptions);
            return true;
        } catch (error) {
            console.error("EmailService::sendOrderConfirmation Error:", error.message);
            return false;
        }
    }

    /**
     * Gửi email cập nhật trạng thái đơn hàng
     */
    static async sendOrderStatusUpdate(email, orderId, newStatus) {
        try {
            const transporter = this.createMailer();
            const statusText = this.getStatusText(newStatus);
            
            const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
            const fromName = process.env.SMTP_FROM_NAME || 'Voc Records';

            const mailOptions = {
                from: `"${fromName}" <${fromEmail}>`,
                to: email,
                subject: `Cập nhật đơn hàng #${orderId}: ${statusText} - Vọc Records`,
                html: this.getOrderStatusTemplate(orderId, newStatus, statusText),
                text: `Đơn hàng #${orderId} đã được cập nhật trạng thái: ${statusText}`
            };

            await transporter.sendMail(mailOptions);
            return true;
        } catch (error) {
            console.error("EmailService::sendOrderStatusUpdate Error:", error.message);
            return false;
        }
    }

    /**
     * Map trạng thái đơn hàng sang text tiếng Việt
     */
    static getStatusText(status) {
        const map = {
            'choxacnhan': 'Chờ xác nhận',
            'daxacnhan': 'Đã xác nhận',
            'dangchuanbihang': 'Đang chuẩn bị hàng',
            'danggiaohang': 'Đang giao hàng',
            'hoanthanh': 'Đã giao thành công',
            'dahuy': 'Đã huỷ',
            'dahoantien': 'Đã hoàn tiền',
        };
        return map[status] || status;
    }

    // ═══════════════════════════════════════════
    // EMAIL TEMPLATES (HTML)
    // ═══════════════════════════════════════════

    static getOtpEmailTemplate(otpCode, typeText) {
        return `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 0;">
                <tr><td align="center">
                    <table width="500" cellpadding="0" cellspacing="0" style="background:#ffffff;border:3px solid #000000;">
                        <!-- Header -->
                        <tr>
                            <td style="background:#facc15;padding:24px;text-align:center;border-bottom:3px solid #000;">
                                <h1 style="margin:0;font-size:28px;font-weight:900;letter-spacing:4px;color:#000;">VỌC RECORDS</h1>
                            </td>
                        </tr>
                        <!-- Body -->
                        <tr>
                            <td style="padding:32px 24px;">
                                <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#000;text-transform:uppercase;">
                                    ${typeText}
                                </h2>
                                <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.6;">
                                    Bạn vừa yêu cầu mã xác thực cho tài khoản Vọc Records. Vui lòng sử dụng mã OTP dưới đây:
                                </p>
                                
                                <!-- OTP Code -->
                                <div style="text-align:center;margin:24px 0;">
                                    <div style="display:inline-block;background:#000;color:#facc15;padding:16px 32px;font-size:36px;font-weight:900;letter-spacing:12px;border:3px solid #000;">
                                        ${otpCode}
                                    </div>
                                </div>

                                <p style="margin:16px 0 0;color:#dc2626;font-size:13px;font-weight:700;text-align:center;text-transform:uppercase;">
                                    ⏱ Mã có hiệu lực trong 5 phút
                                </p>
                                
                                <hr style="border:none;border-top:2px dashed #ddd;margin:24px 0;">
                                
                                <p style="margin:0;color:#888;font-size:12px;line-height:1.5;">
                                    Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này. Không chia sẻ mã OTP cho bất kỳ ai.
                                </p>
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="background:#000;padding:16px 24px;text-align:center;border-top:3px solid #000;">
                                <p style="margin:0;color:#facc15;font-size:12px;font-weight:700;letter-spacing:2px;">
                                    © 2026 VỌC RECORDS — ĐĨA NHẠC & PHONG CÁCH
                                </p>
                            </td>
                        </tr>
                    </table>
                </td></tr>
            </table>
        </body>
        </html>`;
    }

    static escapeHtml(unsafe) {
        return (unsafe || '').toString()
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    static getOrderConfirmationTemplate(orderData) {
        let itemsHtml = '';
        if (orderData.items && orderData.items.length > 0) {
            for (const item of orderData.items) {
                const itemName = this.escapeHtml(item.TenSP || item.name || 'Sản phẩm');
                const qty = item.SoLuong || item.qty || 1;
                const priceNum = item.DonGia || item.price || 0;
                const price = new Intl.NumberFormat('vi-VN').format(priceNum);
                
                itemsHtml += `
                <tr>
                    <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;">${itemName}</td>
                    <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;text-align:center;">${qty}</td>
                    <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;text-align:right;">${price}đ</td>
                </tr>`;
            }
        }

        const total = new Intl.NumberFormat('vi-VN').format(orderData.total || 0);
        const address = this.escapeHtml(orderData.address || '');
        const nguoiNhan = this.escapeHtml(orderData.nguoiNhan || '');
        const sdtNhan = this.escapeHtml(orderData.sdtNhan || '');

        return `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 0;">
                <tr><td align="center">
                    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:3px solid #000000;">
                        <!-- Header -->
                        <tr>
                            <td style="background:#facc15;padding:24px;text-align:center;border-bottom:3px solid #000;">
                                <h1 style="margin:0;font-size:28px;font-weight:900;letter-spacing:4px;color:#000;">VỌC RECORDS</h1>
                            </td>
                        </tr>
                        <!-- Body -->
                        <tr>
                            <td style="padding:32px 24px;">
                                <div style="text-align:center;margin-bottom:24px;">
                                    <div style="display:inline-block;background:#22c55e;color:#fff;padding:8px 20px;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">
                                        ✓ ĐẶT HÀNG THÀNH CÔNG
                                    </div>
                                </div>

                                <h2 style="margin:0 0 4px;font-size:18px;font-weight:700;color:#000;">
                                    Đơn hàng #${orderData.orderId}
                                </h2>
                                <p style="margin:0 0 20px;color:#666;font-size:13px;">
                                    Cảm ơn bạn đã đặt hàng tại Vọc Records!
                                </p>

                                <!-- Shipping Info -->
                                <div style="background:#fefce8;border:2px solid #000;padding:16px;margin-bottom:20px;">
                                    <p style="margin:0 0 4px;font-size:12px;font-weight:700;text-transform:uppercase;color:#000;">THÔNG TIN GIAO HÀNG</p>
                                    <p style="margin:0;font-size:13px;color:#333;">
                                        <strong>${nguoiNhan}</strong> — ${sdtNhan}<br>
                                        ${address}
                                    </p>
                                </div>

                                <!-- Items Table -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #000;margin-bottom:20px;">
                                    <tr style="background:#000;color:#facc15;">
                                        <td style="padding:10px 12px;font-size:12px;font-weight:700;text-transform:uppercase;">Sản phẩm</td>
                                        <td style="padding:10px 12px;font-size:12px;font-weight:700;text-transform:uppercase;text-align:center;">SL</td>
                                        <td style="padding:10px 12px;font-size:12px;font-weight:700;text-transform:uppercase;text-align:right;">Giá</td>
                                    </tr>
                                    ${itemsHtml}
                                    <tr style="background:#fafafa;">
                                        <td colspan="2" style="padding:12px;font-size:14px;font-weight:900;text-transform:uppercase;">TỔNG CỘNG</td>
                                        <td style="padding:12px;font-size:16px;font-weight:900;text-align:right;color:#dc2626;">${total}đ</td>
                                    </tr>
                                </table>

                                <p style="margin:0;color:#888;font-size:12px;line-height:1.5;">
                                    Đơn hàng của bạn đang được xử lý. Chúng tôi sẽ gửi email thông báo khi đơn hàng được xác nhận và giao đi.
                                </p>
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="background:#000;padding:16px 24px;text-align:center;border-top:3px solid #000;">
                                <p style="margin:0;color:#facc15;font-size:12px;font-weight:700;letter-spacing:2px;">
                                    © 2026 VỌC RECORDS — ĐĨA NHẠC & PHONG CÁCH
                                </p>
                            </td>
                        </tr>
                    </table>
                </td></tr>
            </table>
        </body>
        </html>`;
    }

    static getOrderStatusTemplate(orderId, status, statusText) {
        const colorMap = {
            'daxacnhan': '#6366f1',
            'dangchuanbihang': '#3b82f6',
            'danggiaohang': '#a855f7',
            'hoanthanh': '#22c55e',
            'dahuy': '#ef4444',
            'dahoantien': '#10b981',
        };
        const statusColor = colorMap[status] || '#000000';

        const messageMap = {
            'daxacnhan': 'Đơn hàng của bạn đã được xác nhận và đang được xử lý.',
            'dangchuanbihang': 'Đơn hàng đang được chuẩn bị. Vui lòng chờ thêm một chút!',
            'danggiaohang': 'Đơn hàng đã được giao cho đơn vị vận chuyển. Bạn sẽ nhận được hàng sớm!',
            'hoanthanh': 'Đơn hàng đã được giao thành công. Cảm ơn bạn đã tin tưởng Vọc Records!',
            'dahuy': 'Đơn hàng đã được huỷ theo yêu cầu. Nếu bạn cần hỗ trợ, vui lòng liên hệ.',
            'dahoantien': 'Shop đã thực hiện chuyển tiền hoàn lại tài khoản ngân hàng của bạn. Vui lòng kiểm tra tài khoản.',
        };
        const message = messageMap[status] || 'Trạng thái đơn hàng đã được cập nhật.';

        return `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 0;">
                <tr><td align="center">
                    <table width="500" cellpadding="0" cellspacing="0" style="background:#ffffff;border:3px solid #000000;">
                        <!-- Header -->
                        <tr>
                            <td style="background:#facc15;padding:24px;text-align:center;border-bottom:3px solid #000;">
                                <h1 style="margin:0;font-size:28px;font-weight:900;letter-spacing:4px;color:#000;">VỌC RECORDS</h1>
                            </td>
                        </tr>
                        <!-- Body -->
                        <tr>
                            <td style="padding:32px 24px;text-align:center;">
                                <h2 style="margin:0 0 8px;font-size:18px;font-weight:700;color:#000;text-transform:uppercase;">
                                    Cập nhật đơn hàng #${orderId}
                                </h2>
                                
                                <div style="margin:24px 0;">
                                    <div style="display:inline-block;background:${statusColor};color:#fff;padding:12px 28px;font-size:16px;font-weight:900;text-transform:uppercase;letter-spacing:2px;">
                                        ${statusText}
                                    </div>
                                </div>
                                
                                <p style="margin:16px 0 0;color:#555;font-size:14px;line-height:1.6;">
                                    ${message}
                                </p>

                                <hr style="border:none;border-top:2px dashed #ddd;margin:24px 0;">
                                
                                <p style="margin:0;color:#888;font-size:12px;">
                                    Bạn có thể xem chi tiết đơn hàng tại trang tài khoản trên website.
                                </p>
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="background:#000;padding:16px 24px;text-align:center;border-top:3px solid #000;">
                                <p style="margin:0;color:#facc15;font-size:12px;font-weight:700;letter-spacing:2px;">
                                    © 2026 VỌC RECORDS — ĐĨA NHẠC & PHONG CÁCH
                                </p>
                            </td>
                        </tr>
                    </table>
                </td></tr>
            </table>
        </body>
        </html>`;
    }
}

module.exports = EmailService;
