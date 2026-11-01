const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const YeuThichModel = require('../models/yeuthich.model');
const { fail } = require('../utils/http');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

const readRequest = (req) => {
    if (!req.user.customerId) throw fail(403, 'Chỉ tài khoản khách hàng mới lưu được sản phẩm yêu thích');
    const productId = Number(req.body.product_id);
    if (req.method !== 'GET' && (!Number.isInteger(productId) || productId <= 0)) throw fail(400, 'Sản phẩm không hợp lệ');
    return { customerId: req.user.customerId, productId };
};

// GET / — Danh sách yêu thích của khách đang đăng nhập
router.get('/', async (req, res, next) => {
    try {
        const { customerId } = readRequest(req);
        res.json({ success: true, data: await YeuThichModel.getByCustomer(customerId) });
    } catch (error) {
        next(error);
    }
});

// POST / — Thêm vào yêu thích
router.post('/', async (req, res, next) => {
    try {
        const { customerId, productId } = readRequest(req);
        const [product] = await pool.query('SELECT MaSP FROM SanPham WHERE MaSP = ?', [productId]);
        if (!product.length) throw fail(404, 'Không tìm thấy sản phẩm');
        if (!(await YeuThichModel.add(customerId, productId))) throw fail(409, 'Sản phẩm đã có trong danh sách!');
        res.json({ success: true, message: 'Đã thêm vào danh sách yêu thích' });
    } catch (error) {
        next(error);
    }
});

// DELETE / — Bỏ khỏi yêu thích
router.delete('/', async (req, res, next) => {
    try {
        const { customerId, productId } = readRequest(req);
        await YeuThichModel.remove(customerId, productId);
        res.json({ success: true, message: 'Đã xóa khỏi danh sách yêu thích' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
