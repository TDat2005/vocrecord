const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const KhachHangModel = require('../models/khachhang.model');
const TaiKhoanModel = require('../models/taikhoan.model');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

// GET /profile?customer_id=...
router.get('/profile', async (req, res, next) => {
    try {
        const customerId = req.user.customerId;
        if (!customerId) return res.status(403).json({ success: false, message: 'Tài khoản chưa có hồ sơ khách hàng' });

        const profile = await KhachHangModel.getProfile(customerId);
        if (profile) {
            return res.json({
                success: true,
                data: {
                    fullName: profile.HoTen,
                    email: profile.Email,
                    phone: profile.SoDienThoai,
                    address: profile.DiaChi
                }
            });
        } else {
            return res.json({ success: false, message: 'Không tìm thấy khách hàng' });
        }
    } catch (error) {
        next(error);
    }
});

// PUT /profile
router.put('/profile', async (req, res, next) => {
    try {
        const customerId = req.user.customerId;
        const { fullName = '', phone = '', address = '' } = req.body;

        if (!customerId) {
            return res.status(403).json({ success: false, message: 'Tài khoản chưa có hồ sơ khách hàng' });
        }

        await KhachHangModel.updateProfile(customerId, fullName, phone, address);
        return res.json({ success: true, message: 'Cập nhật thông tin thành công' });
    } catch (error) {
        return res.json({ success: false, message: 'Lỗi cập nhật: ' + error.message });
    }
});

// GET /addresses
router.get('/addresses', async (req, res, next) => {
    try {
        const customerId = req.user.customerId;
        if (!customerId) return res.status(403).json({ success: false, message: 'Tài khoản chưa có hồ sơ khách hàng' });

        const addresses = await KhachHangModel.getAddresses(customerId);
        return res.json({ success: true, data: addresses });
    } catch (error) {
        next(error);
    }
});

// POST /addresses
router.post('/addresses', async (req, res, next) => {
    try {
        const customerId = req.user.customerId;
        if (!customerId) return res.status(403).json({ success: false, message: 'Tài khoản chưa có hồ sơ khách hàng' });

        const { nguoiNhan, soDienThoai, diaChi, provinceId, provinceName, wardId, wardName, isDefault = false } = req.body;
        if (!nguoiNhan || !soDienThoai || !diaChi) {
            return res.json({ success: false, message: 'Vui lòng điền đầy đủ tên người nhận, số điện thoại và địa chỉ.' });
        }

        const newId = await KhachHangModel.createAddress(customerId, {
            nguoiNhan: nguoiNhan.trim(),
            soDienThoai: soDienThoai.trim(),
            diaChi: diaChi.trim(),
            ghn: { provinceId, provinceName, wardId, wardName },
            isDefault: Boolean(isDefault)
        });

        return res.json({ success: true, message: 'Thêm địa chỉ giao hàng thành công!', addressId: newId });
    } catch (error) {
        next(error);
    }
});

// DELETE /addresses/:id
router.delete('/addresses/:id', async (req, res, next) => {
    try {
        const customerId = req.user.customerId;
        const addressId = req.params.id;
        if (!customerId) return res.status(403).json({ success: false, message: 'Tài khoản chưa có hồ sơ khách hàng' });

        const deleted = await KhachHangModel.deleteAddress(customerId, addressId);
        if (deleted) {
            return res.json({ success: true, message: 'Đã xóa địa chỉ thành công!' });
        } else {
            return res.json({ success: false, message: 'Không tìm thấy địa chỉ để xóa.' });
        }
    } catch (error) {
        next(error);
    }
});

// PUT /addresses/:id/default
router.put('/addresses/:id/default', async (req, res, next) => {
    try {
        const customerId = req.user.customerId;
        const addressId = req.params.id;
        if (!customerId) return res.status(403).json({ success: false, message: 'Tài khoản chưa có hồ sơ khách hàng' });

        await KhachHangModel.setDefaultAddress(customerId, addressId);
        return res.json({ success: true, message: 'Đã đặt làm địa chỉ mặc định!' });
    } catch (error) {
        next(error);
    }
});

// PUT /change-password
router.put('/change-password', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.json({ success: false, message: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.' });
        }
        if (newPassword.length < 6) {
            return res.json({ success: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
        }

        const user = await TaiKhoanModel.findById(userId);
        if (!user) {
            return res.json({ success: false, message: 'Không tìm thấy tài khoản người dùng.' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.MatKhau);
        if (!isMatch) {
            return res.json({ success: false, message: 'Mật khẩu hiện tại không chính xác!' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await TaiKhoanModel.updatePassword(userId, hashedPassword);

        return res.json({ success: true, message: 'Đổi mật khẩu thành công!' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
