const express = require('express');
const router = express.Router();
const { searchProducts, searchByImage, getStatus } = require('../services/ai/catalog-search');
const { status: embeddingStatus } = require('../services/ai/embeddings');
const { rateLimit } = require('../middleware/rate-limit.middleware');

const MODES = ['hybrid', 'keyword', 'semantic'];
const imageLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, message: 'Bạn tìm bằng ảnh quá nhiều lần. Vui lòng thử lại sau.' });

const badRequest = (message) => Object.assign(new Error(message), { status: 400 });

// GET /?q=nhạc buồn nghe lúc mưa dưới 800k&mode=hybrid|keyword|semantic&limit=12
router.get('/', async (req, res, next) => {
    try {
        const q = String(req.query.q || '').trim();
        if (!q) throw badRequest('Vui lòng nhập nội dung tìm kiếm');
        if (q.length > 300) throw badRequest('Nội dung tìm kiếm tối đa 300 ký tự');
        const mode = MODES.includes(req.query.mode) ? req.query.mode : 'hybrid';
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 12, 1), 48);
        res.json({ success: true, data: await searchProducts(q, { mode, limit }) });
    } catch (error) {
        next(error);
    }
});

// GET /status — mô hình nào đã tải, bao nhiêu sản phẩm đã có vector.
router.get('/status', async (req, res, next) => {
    try {
        res.json({ success: true, data: await getStatus() });
    } catch (error) {
        next(error);
    }
});

// POST /image — { vector: number[] } khi trình duyệt đã tự chạy CLIP,
// hoặc { image: "data:image/jpeg;base64,..." } để server chạy CLIP (máy yếu, trình duyệt không hỗ trợ).
router.post('/image', imageLimiter, async (req, res, next) => {
    try {
        const { vector, image } = req.body || {};
        const limit = Math.min(Math.max(Number.parseInt(req.body && req.body.limit, 10) || 8, 1), 24);
        let query;
        if (vector !== undefined) {
            if (!Array.isArray(vector) || vector.length < 64 || vector.length > 2048 || !vector.every(Number.isFinite)) {
                throw badRequest('Vector ảnh không hợp lệ');
            }
            query = { vector };
        } else {
            const match = /^data:image\/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+/=]+)$/.exec(String(image || ''));
            if (!match) throw badRequest('Vui lòng gửi ảnh JPG, PNG, WEBP hoặc GIF');
            const buffer = Buffer.from(match[2], 'base64');
            if (buffer.length > 4 * 1024 * 1024) throw badRequest('Ảnh tối đa 4MB');
            query = { image: buffer };
        }
        res.json({ success: true, data: await searchByImage(query, { limit }) });
    } catch (error) {
        const model = embeddingStatus().image;
        if (error.status === 503 || (!error.status && ['error', 'disabled'].includes(model.status))) {
            return res.status(503).json({ success: false, message: 'Mô hình nhận diện ảnh trên server chưa sẵn sàng. Vui lòng thử lại sau.' });
        }
        next(error);
    }
});

module.exports = router;
