const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const DiscountModel = require('../models/discount.model');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const editor = [authenticate, requireRole('admin', 'nhanvien')];

// 1. GET / — Get all discount codes
router.get('/', ...editor, async (req, res, next) => {
    try {
        const [rows] = await pool.query("SELECT * FROM MaGiamGia ORDER BY NgayTao DESC");
        res.json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
});

// 2. POST /check — Validate and calculate discount
router.post('/check', async (req, res, next) => {
    try {
        res.json(await DiscountModel.check(req.body.code, req.body.cartTotal));
    } catch (error) {
        next(error);
    }
});

// 3. POST / — Create new discount code
router.post('/', ...editor, async (req, res, next) => {
    try {
        const code = req.body.Code || '';
        const loai = req.body.LoaiGiamGia || 'percent';
        const giaTri = parseFloat(req.body.GiaTri) || 0;
        const dk = parseFloat(req.body.DonHangToiThieu) || 0;
        const sl = parseInt(req.body.SoLuong) || 0;
        const han = req.body.NgayHetHan || null;

        if (!code || giaTri <= 0) {
            return res.json({ success: false, message: 'Dữ liệu không hợp lệ' });
        }

        await pool.query(
            "INSERT INTO MaGiamGia (Code, LoaiGiamGia, GiaTri, DonHangToiThieu, SoLuong, NgayHetHan) VALUES (?, ?, ?, ?, ?, ?)",
            [code.toUpperCase(), loai, giaTri, dk, sl, han]
        );
        res.json({ success: true, message: 'Tạo mã thành công' });
    } catch (error) {
        res.json({ success: false, message: 'Lỗi: Thử lại hoặc Code đã tồn tại' });
    }
});

// 4. PUT /:id — Update discount code
router.put('/:id', ...editor, async (req, res, next) => {
    try {
        const id = req.params.id || req.body.MaGG;
        if (!id) {
            return res.json({ success: false, message: 'Thiếu ID' });
        }
        
        const code = String(req.body.Code || '').trim();
        const loai = req.body.LoaiGiamGia === 'fixed' ? 'fixed' : 'percent';
        const giaTri = parseFloat(req.body.GiaTri) || 0;
        const dk = parseFloat(req.body.DonHangToiThieu) || 0;
        const sl = parseInt(req.body.SoLuong, 10) || 0;
        // Chuỗi rỗng không hợp lệ với cột DATETIME: bỏ trống nghĩa là không giới hạn.
        const han = req.body.NgayHetHan || null;

        if (!code || giaTri <= 0) {
            return res.json({ success: false, message: 'Dữ liệu không hợp lệ' });
        }

        await pool.query(
            "UPDATE MaGiamGia SET Code = ?, LoaiGiamGia = ?, GiaTri = ?, DonHangToiThieu = ?, SoLuong = ?, NgayHetHan = ? WHERE MaGG = ?",
            [code.toUpperCase(), loai, giaTri, dk, sl, han, id]
        );
        res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (error) {
        res.json({ success: false, message: 'Lỗi cập nhật' });
    }
});

// 5. DELETE /:id — Delete discount code
router.delete('/:id', ...editor, async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!id) {
            return res.json({ success: false, message: 'Thiếu ID' });
        }

        await pool.query("DELETE FROM MaGiamGia WHERE MaGG = ?", [id]);
        res.json({ success: true, message: 'Xoá thành công' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
