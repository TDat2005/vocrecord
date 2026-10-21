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
        const code = req.body.code || '';
        const cartTotal = parseFloat(req.body.cartTotal) || 0;

        if (!code) {
            return res.json({ success: false, message: 'Vui lòng nhập mã' });
        }

        const [rows] = await pool.query("SELECT * FROM MaGiamGia WHERE Code = ?", [code.toUpperCase()]);
        const discount = rows[0];

        if (!discount) {
            return res.json({ success: false, message: 'Mã giảm giá không tồn tại' });
        }

        // Kiem tra han su dung
        if (discount.NgayHetHan && new Date(discount.NgayHetHan).getTime() < Date.now()) {
            return res.json({ success: false, message: 'Mã đã hết hạn' });
        }

        // Kiem tra so luong
        if (discount.SoLuong > 0 && discount.DaDung >= discount.SoLuong) {
            return res.json({ success: false, message: 'Mã đã hết lượt sử dụng' });
        }

        // Kiem tra don hang toi thieu (cột DECIMAL được mysql2 trả về dạng chuỗi nên phải ép sang số)
        const minimum = Number(discount.DonHangToiThieu) || 0;
        if (cartTotal < minimum) {
            return res.json({
                success: false,
                message: 'Đơn hàng chưa đạt giá trị tối thiểu ' + minimum.toLocaleString('vi-VN') + 'đ'
            });
        }

        // Tinh toan tien giam
        const value = Number(discount.GiaTri) || 0;
        let moneyDiscount = discount.LoaiGiamGia === 'percent' ? cartTotal * (value / 100) : value;

        if (moneyDiscount > cartTotal) {
            moneyDiscount = cartTotal; // Khong giam qua tong tien
        }
        moneyDiscount = Math.round(moneyDiscount); // khớp cách server tính khi tạo đơn

        res.json({
            success: true,
            data: {
                code: discount.Code,
                discountAmount: moneyDiscount
            },
            message: 'Áp dụng thành công!'
        });

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
