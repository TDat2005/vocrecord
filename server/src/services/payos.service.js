const axios = require('axios');
const crypto = require('crypto');

class PayOSService {
    static async createPaymentLink(orderCode, amount, description, returnUrl = null, cancelUrl = null) {
        const clientId = process.env.PAYOS_CLIENT_ID || '';
        const apiKey = process.env.PAYOS_API_KEY || '';
        const checksumKey = process.env.PAYOS_CHECKSUM_KEY || '';

        const finalReturnUrl = returnUrl || process.env.PAYOS_RETURN_URL || 'http://localhost:8080/payment-result';
        const finalCancelUrl = cancelUrl || process.env.PAYOS_CANCEL_URL || 'http://localhost:8080/payment-result';

        const data = {
            orderCode: orderCode,
            amount: amount,
            description: description.substring(0, 25), // PayOS allows max 25 chars for description
            returnUrl: finalReturnUrl,
            cancelUrl: finalCancelUrl
        };

        // Create signature (alphabetical order)
        const signatureString = `amount=${data.amount}&cancelUrl=${data.cancelUrl}&description=${data.description}&orderCode=${data.orderCode}&returnUrl=${data.returnUrl}`;
        const signature = crypto.createHmac('sha256', checksumKey).update(signatureString).digest('hex');
        data.signature = signature;

        try {
            const response = await axios.post('https://api-merchant.payos.vn/v2/payment-requests', data, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-client-id': clientId,
                    'x-api-key': apiKey
                }
            });

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

    static verifyWebhookSignature(webhookData, signature) {
        const checksumKey = process.env.PAYOS_CHECKSUM_KEY || '';
        if (!checksumKey || typeof signature !== 'string') return false;
        
        // payload format for verify inside webhook
        const data = {
            amount: webhookData.amount,
            cancel: webhookData.cancel ? 'true' : 'false',
            description: webhookData.description,
            orderCode: webhookData.orderCode,
            status: webhookData.status
        };
        
        const signatureString = `amount=${data.amount}&cancel=${data.cancel}&description=${data.description}&orderCode=${data.orderCode}&status=${data.status}`;
        const computedSignature = crypto.createHmac('sha256', checksumKey).update(signatureString).digest('hex');
        
        const expected = Buffer.from(computedSignature, 'utf8');
        const received = Buffer.from(signature, 'utf8');
        return expected.length === received.length && crypto.timingSafeEqual(expected, received);
    }
}

module.exports = PayOSService;
