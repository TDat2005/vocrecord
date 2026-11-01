const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const DiscountModel = require('../models/discount.model');
const { fail } = require('../utils/http');
const { authenticate, optionalAuth, requireRole } = require('../middleware/auth.middleware');
const { rateLimit } = require('../middleware/rate-limit.middleware');

const editor = [authenticate, requireRole('admin', 'nhanvien')];
// Chặn dò mã giảm giá bằng cách thử liên tục.
const checkLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 60, message: 'Bạn kiểm tra mã giảm giá quá nhiều lần. Vui lòng thử lại sau.' });

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
router.post('/check', checkLimiter, optionalAuth, async (req, res, next) => {
    try {
        res.json(await DiscountModel.check(req.body.code, req.body.cartTotal, req.user && req.user.customerId));
    } catch (error) {
        next(error);
    }
});

// Ô chọn ngày gửi "YYYY-MM-DD": mã dùng được hết ngày đó theo giờ Việt Nam.
// Trước đây lưu thành 00:00 UTC (7 giờ sáng giờ Việt Nam) nên mã hết hạn sớm gần một ngày.
function parseExpiry(value) {
    if (!value) return null;
    const text = String(value).trim();
    const date = /^\d{4}-\d{2}-\d{2}$/.test(text) ? new Date(`${text}T23:59:59+07:00`) : new Date(text);
    return Number.isNaN(date.getTime()) ? undefined : date;
}

// Kiểm tra dữ liệu mã giảm giá (trước đây nhận cả mức giảm 150% hay số lượt âm).
function readDiscount(body) {
    const numberOr = (value, fallback) => (value === undefined || value === null || value === '' ? fallback : Number(value));
    const discount = {
        code: DiscountModel.normalizeCode(body.Code),
        type: body.LoaiGiamGia === 'fixed' ? 'fixed' : 'percent',
        value: Number(body.GiaTri),
        minimum: numberOr(body.DonHangToiThieu, 0),
        quantity: numberOr(body.SoLuong, 0),
        perCustomer: numberOr(body.GioiHanMoiKhach, 1),
        // Bỏ trống nghĩa là không giới hạn (chuỗi rỗng không hợp lệ với cột DATETIME).
        expiry: parseExpiry(body.NgayHetHan),
    };
    if (!/^[A-Z0-9_-]{3,30}$/.test(discount.code)) throw fail(400, 'Mã gồm 3–30 ký tự chữ không dấu, số, gạch ngang');
    if (!Number.isFinite(discount.value) || discount.value <= 0) throw fail(400, 'Giá trị giảm phải lớn hơn 0');
    if (discount.type === 'percent' && discount.value > 100) throw fail(400, 'Giảm theo phần trăm tối đa 100%');
    if (!Number.isFinite(discount.minimum) || discount.minimum < 0) throw fail(400, 'Giá trị đơn tối thiểu không hợp lệ');
    if (!Number.isInteger(discount.quantity) || discount.quantity < 0) throw fail(400, 'Số lượt dùng phải là số nguyên không âm (0 = không giới hạn)');
    if (!Number.isInteger(discount.perCustomer) || discount.perCustomer < 0) throw fail(400, 'Giới hạn mỗi khách phải là số nguyên không âm (0 = không giới hạn)');
    if (discount.expiry === undefined) throw fail(400, 'Ngày hết hạn không hợp lệ');
    return discount;
}

const duplicateCode = (error) => (error.code === 'ER_DUP_ENTRY' ? fail(409, 'Mã giảm giá này đã tồn tại') : error);

// 3. POST / — Create new discount code
router.post('/', ...editor, async (req, res, next) => {
    try {
        const d = readDiscount(req.body || {});
        await pool.query(
            "INSERT INTO MaGiamGia (Code, LoaiGiamGia, GiaTri, DonHangToiThieu, SoLuong, GioiHanMoiKhach, NgayHetHan) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [d.code, d.type, d.value, d.minimum, d.quantity, d.perCustomer, d.expiry]
        );
        res.json({ success: true, message: 'Tạo mã thành công' });
    } catch (error) {
        next(duplicateCode(error));
    }
});

// 4. PUT /:id — Update discount code
router.put('/:id', ...editor, async (req, res, next) => {
    try {
        const d = readDiscount(req.body || {});
        const [result] = await pool.query(
            "UPDATE MaGiamGia SET Code = ?, LoaiGiamGia = ?, GiaTri = ?, DonHangToiThieu = ?, SoLuong = ?, GioiHanMoiKhach = ?, NgayHetHan = ? WHERE MaGG = ?",
            [d.code, d.type, d.value, d.minimum, d.quantity, d.perCustomer, d.expiry, req.params.id]
        );
        if (!result.affectedRows) throw fail(404, 'Không tìm thấy mã giảm giá');
        res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (error) {
        next(duplicateCode(error));
    }
});

// 5. DELETE /:id — Delete discount code
router.delete('/:id', ...editor, async (req, res, next) => {
    try {
        const [result] = await pool.query("DELETE FROM MaGiamGia WHERE MaGG = ?", [req.params.id]);
        if (!result.affectedRows) throw fail(404, 'Không tìm thấy mã giảm giá');
        res.json({ success: true, message: 'Xoá thành công' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
