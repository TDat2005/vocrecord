const buckets = new Map();

const rateLimit = ({ windowMs = 15 * 60 * 1000, max = 20, message = 'Bạn thao tác quá nhiều lần. Vui lòng thử lại sau.' } = {}) => {
    return (req, res, next) => {
        const key = `${req.ip || 'unknown'}:${req.baseUrl}${req.path}`;
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
};

// Dọn bucket hết hạn định kỳ để không giữ IP vô thời hạn trong RAM.
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of buckets.entries()) {
        if (value.resetAt <= now) buckets.delete(key);
    }
}, 10 * 60 * 1000).unref();

module.exports = { rateLimit };
