const express = require('express');
const router = express.Router();
const { isPhone, PHONE_MESSAGE, MIN_PASSWORD } = require('../utils/validate');
const bcrypt = require('bcryptjs');
const KhachHangModel = require('../models/khachhang.model');
const TaiKhoanModel = require('../models/taikhoan.model');
const { authenticate, forgetAccountStatus } = require('../middleware/auth.middleware');
const { issueToken } = require('../utils/token');

router.use(authenticate);

const bad = (res, message, status = 400) => res.status(status).json({ success: false, message });

// Các route sổ địa chỉ/hồ sơ chỉ dành cho tài khoản có hồ sơ khách hàng.
const requireCustomer = (req, res, next) => {
    if (!req.user.customerId) return bad(res, 'Tài khoản chưa có hồ sơ khách hàng', 403);
    next();
};

// GET /profile
router.get('/profile', requireCustomer, async (req, res, next) => {
    try {
        const profile = await KhachHangModel.getProfile(req.user.customerId);
        if (!profile) return bad(res, 'Không tìm thấy khách hàng', 404);
        return res.json({
            success: true,
            data: { fullName: profile.HoTen, email: profile.Email, phone: profile.SoDienThoai, address: profile.DiaChi },
        });
    } catch (error) {
        next(error);
    }
});

// PUT /profile
router.put('/profile', requireCustomer, async (req, res, next) => {
    try {
        const fullName = String(req.body.fullName ?? '').trim();
        const phone = String(req.body.phone ?? '').trim();
        const { address } = req.body;

        if (!fullName || fullName.length > 100) return bad(res, 'Vui lòng nhập họ tên (tối đa 100 ký tự).');
        if (phone && !isPhone(phone)) return bad(res, PHONE_MESSAGE);
        if (address !== undefined && String(address).length > 500) return bad(res, 'Địa chỉ quá dài.');

        await KhachHangModel.updateProfile(req.user.customerId, fullName, phone, address === undefined ? undefined : String(address).trim());
        return res.json({ success: true, message: 'Cập nhật thông tin thành công' });
    } catch (error) {
        next(error);
    }
});

// GET /addresses
router.get('/addresses', requireCustomer, async (req, res, next) => {
    try {
        return res.json({ success: true, data: await KhachHangModel.getAddresses(req.user.customerId) });
    } catch (error) {
        next(error);
    }
});

// POST /addresses
router.post('/addresses', requireCustomer, async (req, res, next) => {
    try {
        const { provinceId, provinceName, wardId, wardName, isDefault = false } = req.body;
        const nguoiNhan = String(req.body.nguoiNhan || '').trim();
        const soDienThoai = String(req.body.soDienThoai || '').trim();
        const diaChi = String(req.body.diaChi || '').trim();
        if (!nguoiNhan || !soDienThoai || !diaChi) return bad(res, 'Vui lòng điền đầy đủ tên người nhận, số điện thoại và địa chỉ.');
        if (nguoiNhan.length > 100 || diaChi.length > 255) return bad(res, 'Tên người nhận tối đa 100 ký tự, địa chỉ tối đa 255 ký tự.');
        if (!isPhone(soDienThoai)) return bad(res, PHONE_MESSAGE);

        const newId = await KhachHangModel.createAddress(req.user.customerId, {
            nguoiNhan,
            soDienThoai,
            diaChi,
            ghn: { provinceId, provinceName, wardId, wardName },
            isDefault: Boolean(isDefault),
        });
        return res.json({ success: true, message: 'Thêm địa chỉ giao hàng thành công!', addressId: newId });
    } catch (error) {
        next(error);
    }
});

// DELETE /addresses/:id
router.delete('/addresses/:id', requireCustomer, async (req, res, next) => {
    try {
        const deleted = await KhachHangModel.deleteAddress(req.user.customerId, req.params.id);
        if (!deleted) return bad(res, 'Không tìm thấy địa chỉ để xóa.', 404);
        return res.json({ success: true, message: 'Đã xóa địa chỉ thành công!' });
    } catch (error) {
        next(error);
    }
});

// PUT /addresses/:id/default
router.put('/addresses/:id/default', requireCustomer, async (req, res, next) => {
    try {
        const updated = await KhachHangModel.setDefaultAddress(req.user.customerId, req.params.id);
        if (!updated) return bad(res, 'Không tìm thấy địa chỉ.', 404);
        return res.json({ success: true, message: 'Đã đặt làm địa chỉ mặc định!' });
    } catch (error) {
        next(error);
    }
});

// PUT /change-password
// Đổi mật khẩu làm các phiên đăng nhập khác hết hiệu lực; trả vé mới để phiên hiện tại vẫn dùng tiếp.
router.put('/change-password', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const currentPassword = String(req.body.currentPassword || '');
        const newPassword = String(req.body.newPassword || '');

        if (!currentPassword || !newPassword) return bad(res, 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.');
        if (newPassword.length < MIN_PASSWORD) return bad(res, `Mật khẩu mới phải có ít nhất ${MIN_PASSWORD} ký tự.`);

        const user = await TaiKhoanModel.findById(userId);
        if (!user) return bad(res, 'Không tìm thấy tài khoản người dùng.', 404);
        if (!(await bcrypt.compare(currentPassword, user.MatKhau))) return bad(res, 'Mật khẩu hiện tại không chính xác!');

        await TaiKhoanModel.updatePassword(userId, await bcrypt.hash(newPassword, 10));
        forgetAccountStatus(userId);
        const token = issueToken({ accountId: userId, customerId: req.user.customerId, username: req.user.username, role: req.user.role });
        return res.json({ success: true, message: 'Đổi mật khẩu thành công!', token });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
