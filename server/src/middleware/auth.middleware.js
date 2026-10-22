const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const getJwtSecret = () => {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured');
    return process.env.JWT_SECRET;
};

// JWT có hạn 1 ngày: chỉ kiểm tra chữ ký thì tài khoản vừa bị khóa vẫn dùng được tới khi token hết hạn.
// Đọc trạng thái tài khoản từ CSDL (nhớ 30 giây cho đỡ truy vấn), khóa tài khoản thì xóa bộ nhớ để chặn ngay.
const STATUS_TTL_MS = 30 * 1000;
const statusCache = new Map(); // MaTK -> { active, at }

async function isAccountActive(accountId) {
    const cached = statusCache.get(Number(accountId));
    if (cached && Date.now() - cached.at < STATUS_TTL_MS) return cached.active;
    const [rows] = await pool.query('SELECT TrangThai FROM TaiKhoan WHERE MaTK = ?', [accountId]);
    const active = Boolean(rows[0]) && Number(rows[0].TrangThai ?? 1) !== 0;
    statusCache.set(Number(accountId), { active, at: Date.now() });
    return active;
}

const forgetAccountStatus = (accountId) => statusCache.delete(Number(accountId));

const readToken = (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    return jwt.verify(authHeader.split(' ')[1], getJwtSecret());
};

const authenticate = async (req, res, next) => {
    let decoded;
    try {
        decoded = readToken(req);
        if (!decoded) return res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Invalid token' });
    }
    try {
        if (!(await isAccountActive(decoded.id))) {
            return res.status(401).json({ success: false, code: 'ACCOUNT_LOCKED', message: 'Tài khoản đã bị khóa. Vui lòng liên hệ Vọc Records.' });
        }
    } catch (error) {
        return next(error);
    }
    req.user = decoded;
    next();
};

// Có token hợp lệ của tài khoản đang hoạt động thì gắn req.user, không thì coi như khách vãng lai.
const optionalAuth = async (req, res, next) => {
    try {
        const decoded = readToken(req);
        if (decoded && await isAccountActive(decoded.id)) req.user = decoded;
    } catch (error) {
        // token sai hoặc hết hạn: bỏ qua
    }
    next();
};

const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Forbidden: Insufficient privileges' });
        }
        next();
    };
};

module.exports = { authenticate, optionalAuth, requireRole, getJwtSecret, forgetAccountStatus };
