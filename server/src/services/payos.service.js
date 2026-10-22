const axios = require('axios');
const crypto = require('crypto');

// Đổi được địa chỉ API (máy chủ PayOS giả khi kiểm thử); mặc định là PayOS thật.
const PAYOS_API_URL = (process.env.PAYOS_API_URL || 'https://api-merchant.payos.vn').replace(/\/+$/, '');
const authHeaders = () => ({
    'Content-Type': 'application/json',
    'x-client-id': process.env.PAYOS_CLIENT_ID || '',
    'x-api-key': process.env.PAYOS_API_KEY || '',
});

class PayOSService {
    static async createPaymentLink(orderCode, amount, description, returnUrl = null, cancelUrl = null) {
        const checksumKey = process.env.PAYOS_CHECKSUM_KEY || '';

        const finalReturnUrl = returnUrl || process.env.PAYOS_RETURN_URL || 'http://localhost:8080/payment-result';
        const finalCancelUrl = cancelUrl || process.env.PAYOS_CANCEL_URL || 'http://localhost:8080/payment-result';

        const data = {
            orderCode: orderCode,
            amount: amount,
            description: description.substring(0, 25), // PayOS allows max 25 chars for description
            returnUrl: finalReturnUrl,
            cancelUrl: finalCancelUrl,
            // Hết hạn cùng lúc server tự hủy đơn (10 phút) để khách không thể trả tiền cho đơn đã hủy.
            // expiredAt không nằm trong chuỗi ký signature của PayOS.
            expiredAt: Math.floor(Date.now() / 1000) + 10 * 60
        };

        // Create signature (alphabetical order)
        const signatureString = `amount=${data.amount}&cancelUrl=${data.cancelUrl}&description=${data.description}&orderCode=${data.orderCode}&returnUrl=${data.returnUrl}`;
        const signature = crypto.createHmac('sha256', checksumKey).update(signatureString).digest('hex');
        data.signature = signature;

        try {
            const response = await axios.post(`${PAYOS_API_URL}/v2/payment-requests`, data, { headers: authHeaders() });

            const result = response.data;
            if (result.code === '00') {
                return result.data;
            }
            
            throw new Error(`Lỗi tạo Payment Link từ PayOS: ${result.desc || 'Unknown Error'}`);
        } catch (error) {
            if (error.response && error.response.data && error.response.data.desc) {
                throw new Error(`Lỗi tạo Payment Link từ PayOS: ${error.response.data.desc}`);
            }
            throw new Error(`Lỗi tạo Payment Link từ PayOS: ${error.message}`);
        }
    }

    // Trạng thái link thanh toán trên PayOS (PENDING, PAID, CANCELLED, EXPIRED...).
    static async getPaymentRequest(orderCode) {
        const response = await axios.get(`${PAYOS_API_URL}/v2/payment-requests/${orderCode}`, { headers: authHeaders(), timeout: 10000 });
        return response.data;
    }

    // Chữ ký webhook theo tài liệu PayOS: sắp xếp mọi khóa trong "data" theo bảng chữ cái, nối key=value bằng "&"
    // (null/undefined thành chuỗi rỗng, mảng chuyển JSON), rồi HMAC-SHA256 với checksum key.
    // Trước đây chỉ ký 5 trường (amount, cancel, description, orderCode, status) nên mọi webhook thật bị từ chối 401,
    // đơn đã trả tiền vẫn bị tiến trình 10 phút tự hủy nếu khách đóng trang thanh toán.
    static verifyWebhookSignature(webhookData, signature) {
        const checksumKey = process.env.PAYOS_CHECKSUM_KEY || '';
        if (!checksumKey || typeof signature !== 'string' || !webhookData || typeof webhookData !== 'object') return false;

        const signatureString = Object.keys(webhookData)
            .sort()
            .filter((key) => webhookData[key] !== undefined)
            .map((key) => {
                let value = webhookData[key];
                if (Array.isArray(value)) value = JSON.stringify(value);
                if (value === null || value === 'null' || value === 'undefined') value = '';
                return `${key}=${value}`;
            })
            .join('&');
        const computedSignature = crypto.createHmac('sha256', checksumKey).update(signatureString).digest('hex');
        
        const expected = Buffer.from(computedSignature, 'utf8');
        const received = Buffer.from(signature, 'utf8');
        return expected.length === received.length && crypto.timingSafeEqual(expected, received);
    }
}

module.exports = PayOSService;
