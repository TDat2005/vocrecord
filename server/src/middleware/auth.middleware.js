const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const getJwtSecret = () => {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured');
    return process.env.JWT_SECRET;
};

// JWT có hạn 1 ngày: chỉ kiểm tra chữ ký thì tài khoản vừa bị khóa, vừa bị hạ quyền hoặc vừa đổi mật khẩu
// vẫn dùng vé cũ được tới khi hết hạn. Mỗi request đọc lại trạng thái, vai trò và lần đổi mật khẩu gần nhất
// từ CSDL (nhớ 30 giây cho đỡ truy vấn); khóa tài khoản, đổi vai trò, đổi mật khẩu thì xóa bộ nhớ để có hiệu lực ngay.
const STATUS_TTL_MS = 30 * 1000;
const statusCache = new Map(); // MaTK -> { account, at }

async function loadAccount(accountId) {
    const cached = statusCache.get(Number(accountId));
    if (cached && Date.now() - cached.at < STATUS_TTL_MS) return cached.account;
    // SELECT * để vẫn chạy được khi chưa có cột NgayDoiMatKhau (migration 14).
    const [rows] = await pool.query('SELECT * FROM TaiKhoan WHERE MaTK = ?', [accountId]);
    const row = rows[0];
    const account = row ? {
        active: Number(row.TrangThai ?? 1) !== 0,
        role: row.VaiTro,
        passwordChangedAt: row.NgayDoiMatKhau ? new Date(row.NgayDoiMatKhau).getTime() : 0,
    } : null;
    statusCache.set(Number(accountId), { account, at: Date.now() });
    return account;
}

const forgetAccountStatus = (accountId) => statusCache.delete(Number(accountId));

// Vé hợp lệ khi tài khoản còn hoạt động và được cấp sau lần đổi mật khẩu gần nhất.
// Trả về thông tin người dùng với vai trò lấy từ CSDL (không tin vai trò ghi trong vé).
async function resolveUser(decoded) {
    const account = await loadAccount(decoded.id);
    if (!account) return { error: 'INVALID' };
    if (!account.active) return { error: 'ACCOUNT_LOCKED' };
    // iat tính bằng giây; cho phép lệch 1 giây vì vé mới được cấp ngay sau khi đổi mật khẩu.
    if (account.passwordChangedAt && decoded.iat * 1000 < account.passwordChangedAt - 1000) return { error: 'SESSION_EXPIRED' };
    return { user: { ...decoded, role: account.role } };
}

const readToken = (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    return jwt.verify(authHeader.split(' ')[1], getJwtSecret());
};

const REJECT_MESSAGES = {
    INVALID: 'Unauthorized: Invalid token',
    ACCOUNT_LOCKED: 'Tài khoản đã bị khóa. Vui lòng liên hệ Vọc Records.',
    SESSION_EXPIRED: 'Phiên đăng nhập đã hết hạn do mật khẩu vừa được thay đổi. Vui lòng đăng nhập lại.',
};

const authenticate = async (req, res, next) => {
    let decoded;
    try {
        decoded = readToken(req);
        if (!decoded) return res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });
    } catch (error) {
        return res.status(401).json({ success: false, message: REJECT_MESSAGES.INVALID });
    }
    try {
        const { user, error } = await resolveUser(decoded);
        if (error) return res.status(401).json({ success: false, code: error, message: REJECT_MESSAGES[error] });
        req.user = user;
    } catch (error) {
        return next(error);
    }
    next();
};

// Có token hợp lệ của tài khoản đang hoạt động thì gắn req.user, không thì coi như khách vãng lai.
const optionalAuth = async (req, res, next) => {
    try {
        const decoded = readToken(req);
        if (decoded) {
            const { user } = await resolveUser(decoded);
            if (user) req.user = user;
        }
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

module.exports = { authenticate, optionalAuth, requireRole, getJwtSecret, forgetAccountStatus, resolveUser };
