const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth.middleware');
const { rateLimit } = require('../middleware/rate-limit.middleware');
const { runAssistant, isConfigured, friendlyError, MODEL } = require('../services/ai/assistant');

const chatLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 40, message: 'Bạn gửi tin nhắn cho trợ lý quá nhanh. Vui lòng thử lại sau ít phút.' });

const MAX_MESSAGES = 20;
const MAX_CHARS = 2000;

// GET /status — giao diện dùng để biết trợ lý AI đã được cấu hình chưa.
router.get('/status', (req, res) => {
    res.json({ success: true, data: { enabled: isConfigured(), model: isConfigured() ? MODEL : null } });
});

function validHistory(messages) {
    if (!Array.isArray(messages) || messages.length === 0) return null;
    const history = messages.slice(-MAX_MESSAGES).map((m) => ({
        role: m && m.role,
        content: typeof (m && m.content) === 'string' ? m.content.trim() : '',
        products: m && Array.isArray(m.products) ? m.products : undefined,
    }));
    const ok = history.every((m) => ['user', 'assistant'].includes(m.role) && m.content.length <= MAX_CHARS);
    const cleaned = history.filter((m) => m.content);
    if (!ok || cleaned.length === 0 || cleaned[cleaned.length - 1].role !== 'user') return null;
    return cleaned;
}

// POST /chat — { messages: [{ role: 'user'|'assistant', content, products? }] }
// Trả về Server-Sent Events: text (từng đoạn chữ), tool (đang gọi công cụ), products (thẻ sản phẩm),
// cart_add (trình duyệt thêm vào giỏ), error, done.
router.post('/chat', chatLimiter, optionalAuth, async (req, res) => {
    if (!isConfigured()) {
        return res.status(503).json({
            success: false,
            code: 'AI_NOT_CONFIGURED',
            message: 'Trợ lý AI chưa được bật (thiếu ANTHROPIC_API_KEY trên server).',
        });
    }
    const history = validHistory(req.body && req.body.messages);
    if (!history) {
        return res.status(400).json({ success: false, message: `Tin nhắn không hợp lệ (tối đa ${MAX_CHARS} ký tự, tin cuối phải của khách).` });
    }

    res.status(200).set({
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no', // Nginx không gom dữ liệu, chữ hiện ra ngay khi Claude viết
    });
    res.flushHeaders();
    const send = (event) => {
        if (!res.writableEnded) res.write(`data: ${JSON.stringify(event)}\n\n`);
    };
    // Giữ kết nối qua proxy trong lúc Claude suy nghĩ hoặc chạy công cụ.
    const keepAlive = setInterval(() => {
        if (!res.writableEnded) res.write(': ping\n\n');
    }, 15000);
    const abort = new AbortController();
    res.on('close', () => {
        if (!res.writableEnded) abort.abort(); // khách đóng khung chat: dừng gọi API
    });

    try {
        const stopReason = await runAssistant({ history, user: req.user, send, signal: abort.signal });
        send({ type: 'done', stopReason });
    } catch (error) {
        if (!abort.signal.aborted) {
            console.error('[assistant]', error);
            send({ type: 'error', message: friendlyError(error) });
        }
    } finally {
        clearInterval(keepAlive);
        res.end();
    }
});

module.exports = router;
