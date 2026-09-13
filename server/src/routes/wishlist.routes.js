const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const YeuThichModel = require('../models/yeuthich.model');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

// 1. GET / — List wishlist items by ?customer_id=
router.get('/', async (req, res, next) => {
    try {
        const customerId = req.user.customerId || null;
        if (!customerId) {
            return res.json({ success: false, message: 'Thiếu mã khách hàng' });
        }

        const [rows] = await pool.query(
            "SELECT sp.MaSP as id, sp.TenSP as title, sp.NgheSi as artist, sp.GiaBan as price, sp.HinhAnh as image, yt.MaYT FROM YeuThich yt JOIN SanPham sp ON yt.MaSP = sp.MaSP WHERE yt.MaKH = ?",
            [customerId]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
});

// 2. POST / — Add to wishlist
router.post('/', async (req, res, next) => {
    try {
        const customerId = req.user.customerId || null;
        const productId = req.body.product_id || null;

        if (!customerId || !productId) {
            return res.json({ success: false, message: 'Dữ liệu không đầy đủ.' });
        }

        const [exists] = await pool.query("SELECT * FROM YeuThich WHERE MaKH = ? AND MaSP = ?", [customerId, productId]);
        if (exists.length > 0) {
            return res.json({ success: false, message: 'Sản phẩm đã có trong danh sách!' });
        }

        const [result] = await pool.query("INSERT INTO YeuThich (MaKH, MaSP) VALUES (?, ?)", [customerId, productId]);
        res.json({ success: true, message: 'Đã thêm vào danh sách yêu thích', wishlist_id: result.insertId });
    } catch (error) {
        res.json({ success: false, message: 'Lỗi: ' + error.message });
    }
});

// 3. DELETE / — Remove from wishlist
router.delete('/', async (req, res, next) => {
    try {
        const customerId = req.user.customerId || null;
        const productId = req.body.product_id || null;

        if (!customerId || !productId) {
            return res.json({ success: false, message: 'Dữ liệu không đầy đủ.' });
        }

        await pool.query("DELETE FROM YeuThich WHERE MaKH = ? AND MaSP = ?", [customerId, productId]);
        res.json({ success: true, message: 'Đã xóa khỏi danh sách yêu thích' });
    } catch (error) {
        res.json({ success: false, message: 'Lỗi: ' + error.message });
    }
});

module.exports = router;
