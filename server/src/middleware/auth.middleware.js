const jwt = require('jsonwebtoken');

const getJwtSecret = () => {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured');
    return process.env.JWT_SECRET;
};

const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, getJwtSecret());
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Invalid token' });
    }
};

const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, getJwtSecret());
            req.user = decoded;
        }
        next();
    } catch (error) {
        next();
    }
};

const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Forbidden: Insufficient privileges' });
        }
        next();
    };
};

module.exports = { authenticate, optionalAuth, requireRole, getJwtSecret };
