const buckets = new Map();

const keyOf = (req) => `${req.ip || 'unknown'}:${req.baseUrl}${req.path}`;

const rateLimit = ({ windowMs = 15 * 60 * 1000, max = 20, message = 'Bạn thao tác quá nhiều lần. Vui lòng thử lại sau.' } = {}) => {
    const middleware = (req, res, next) => {
        const key = keyOf(req);
        const now = Date.now();
        const current = buckets.get(key);

        if (!current || now >= current.resetAt) {
            buckets.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }

        current.count += 1;
        if (current.count > max) {
            res.set('Retry-After', Math.ceil((current.resetAt - now) / 1000));
            return res.status(429).json({ success: false, message });
        }

        return next();
    };
    // Xóa bộ đếm của request hiện tại (vd: đăng nhập thành công thì không tính vào số lần sai).
    middleware.reset = (req) => buckets.delete(keyOf(req));
    return middleware;
};

// Dọn bucket hết hạn định kỳ để không giữ IP vô thời hạn trong RAM.
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of buckets.entries()) {
        if (value.resetAt <= now) buckets.delete(key);
    }
}, 10 * 60 * 1000).unref();

module.exports = { rateLimit };
