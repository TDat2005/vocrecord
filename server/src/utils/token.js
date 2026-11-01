const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../middleware/auth.middleware');

// Cấp vé đăng nhập (JWT 1 ngày). Vai trò trong vé chỉ để hiển thị; server luôn đọc lại vai trò từ CSDL.
const issueToken = ({ accountId, customerId, username, role }) => jwt.sign(
    { id: accountId, customerId, username, role },
    getJwtSecret(),
    { expiresIn: '1d' }
);

module.exports = { issueToken };
