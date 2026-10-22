const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const DiscountModel = require('../models/discount.model');
const { authenticate, optionalAuth, requireRole } = require('../middleware/auth.middleware');

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
router.post('/check', optionalAuth, async (req, res, next) => {
    try {
        res.json(await DiscountModel.check(req.body.code, req.body.cartTotal, req.user && req.user.customerId));
    } catch (error) {
        next(error);
    }
});

// Kiểm tra dữ liệu mã giảm giá (trước đây nhận cả mức giảm 150% hay số lượt âm).
function readDiscount(body) {
    const discount = {
        code: String(body.Code || '').trim().toUpperCase(),
        type: body.LoaiGiamGia === 'fixed' ? 'fixed' : 'percent',
        value: Number(body.GiaTri),
        minimum: body.DonHangToiThieu === undefined || body.DonHangToiThieu === '' ? 0 : Number(body.DonHangToiThieu),
        quantity: body.SoLuong === undefined || body.SoLuong === '' ? 0 : Number(body.SoLuong),
        perCustomer: body.GioiHanMoiKhach === undefined || body.GioiHanMoiKhach === '' ? 1 : Number(body.GioiHanMoiKhach),
        // Chuỗi rỗng không hợp lệ với cột DATETIME: bỏ trống nghĩa là không giới hạn.
        expiry: body.NgayHetHan || null,
    };
    let error = null;
    if (!/^[A-Z0-9_-]{3,30}$/.test(discount.code)) error = 'Mã gồm 3–30 ký tự chữ không dấu, số, gạch ngang';
    else if (!Number.isFinite(discount.value) || discount.value <= 0) error = 'Giá trị giảm phải lớn hơn 0';
    else if (discount.type === 'percent' && discount.value > 100) error = 'Giảm theo phần trăm tối đa 100%';
    else if (!Number.isFinite(discount.minimum) || discount.minimum < 0) error = 'Giá trị đơn tối thiểu không hợp lệ';
    else if (!Number.isInteger(discount.quantity) || discount.quantity < 0) error = 'Số lượt dùng phải là số nguyên không âm (0 = không giới hạn)';
    else if (!Number.isInteger(discount.perCustomer) || discount.perCustomer < 0) error = 'Giới hạn mỗi khách phải là số nguyên không âm (0 = không giới hạn)';
    else if (discount.expiry && Number.isNaN(Date.parse(discount.expiry))) error = 'Ngày hết hạn không hợp lệ';
    return { discount, error };
}

// 3. POST / — Create new discount code
router.post('/', ...editor, async (req, res, next) => {
    try {
        const { discount: d, error } = readDiscount(req.body || {});
        if (error) return res.status(400).json({ success: false, message: error });

        await pool.query(
            "INSERT INTO MaGiamGia (Code, LoaiGiamGia, GiaTri, DonHangToiThieu, SoLuong, GioiHanMoiKhach, NgayHetHan) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [d.code, d.type, d.value, d.minimum, d.quantity, d.perCustomer, d.expiry]
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
        
        const { discount: d, error } = readDiscount(req.body || {});
        if (error) return res.status(400).json({ success: false, message: error });

        await pool.query(
            "UPDATE MaGiamGia SET Code = ?, LoaiGiamGia = ?, GiaTri = ?, DonHangToiThieu = ?, SoLuong = ?, GioiHanMoiKhach = ?, NgayHetHan = ? WHERE MaGG = ?",
            [d.code, d.type, d.value, d.minimum, d.quantity, d.perCustomer, d.expiry, id]
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
