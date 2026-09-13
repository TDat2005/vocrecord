const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const pool = require('../config/database');
const TaiKhoanModel = require('../models/taikhoan.model');
const KhachHangModel = require('../models/khachhang.model');
const OtpModel = require('../models/otp.model');
const EmailService = require('../services/email.service');
const { rateLimit } = require('../middleware/rate-limit.middleware');

const JWT_SECRET = process.env.JWT_SECRET;
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Bạn đăng nhập sai hoặc thử quá nhiều lần. Vui lòng thử lại sau 15 phút.' });
const otpLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: 'Bạn đã yêu cầu OTP quá nhiều lần. Vui lòng thử lại sau.' });

// POST /login
router.post('/login', loginLimiter, async (req, res, next) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.json({ success: false, message: 'Vui lòng nhập tài khoản và mật khẩu.' });
        }
        if (!JWT_SECRET) return res.status(503).json({ success: false, message: 'Máy chủ chưa cấu hình xác thực.' });

        const user = await TaiKhoanModel.findByUsername(username);

        if (user && await bcrypt.compare(password, user.MatKhau)) {
            if (user.TrangThai === 0) {
                return res.json({ success: false, message: 'Tài khoản của bạn đã bị khoá. Vui lòng liên hệ Admin.' });
            }

            const profile = await KhachHangModel.getByAccountId(user.MaTK);
            const customerId = profile ? profile.MaKH : null;
            const name = profile ? profile.HoTen : '';

            // Generate JWT
            const token = jwt.sign(
                { id: user.MaTK, customerId, username: user.TenDangNhap, role: user.VaiTro },
                JWT_SECRET,
                { expiresIn: '1d' }
            );

            return res.json({
                success: true,
                token,
                user: {
                    id: user.MaTK,
                    customer_id: customerId,
                    username: user.TenDangNhap,
                    name: name,
                    role: user.VaiTro
                }
            });
        } else {
            return res.json({ success: false, message: 'Sai tài khoản hoặc mật khẩu!' });
        }
    } catch (error) {
        next(error);
    }
});

// POST /register (Legacy)
router.post('/register', async (req, res, next) => {
    let connection;
    try {
        const { username, password, fullname, email } = req.body;

        if (!username || !password) {
            return res.json({ success: false, message: 'Thiếu username hoặc password' });
        }

        const existingUser = await TaiKhoanModel.findByUsername(username);
        if (existingUser) {
            return res.json({ success: false, message: 'Lỗi: Tên đăng nhập đã tồn tại.' });
        }
        if (email) {
            const existingKhachHang = await KhachHangModel.findByEmail(email);
            if (existingKhachHang) {
                return res.json({ success: false, message: 'Lỗi: Email đã được sử dụng.' });
            }
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        const hashedPassword = await bcrypt.hash(password, 10);
        const maTK = await TaiKhoanModel.create(username, hashedPassword, 'khachhang', connection);
        await KhachHangModel.create(fullname ? fullname : username, email || null, maTK, null, null, connection);
        await connection.commit();
        
        return res.json({ success: true, message: 'Đăng ký thành công!' });
    } catch (error) {
        if (connection) {
            try { await connection.rollback(); } catch (e) { console.error('Rollback error:', e); }
        }
        console.error('Lỗi register legacy:', error);
        return res.json({ success: false, message: 'Lỗi: User hoặc Email đã tồn tại.' });
    } finally {
        if (connection) connection.release();
    }
});

// POST /send-register-otp
router.post('/send-register-otp', otpLimiter, async (req, res, next) => {
    try {
        const email = (req.body.email || '').trim().toLowerCase();

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            return res.json({ success: false, message: 'Email không hợp lệ.' });
        }

        const existingUser = await TaiKhoanModel.findByUsername(email);
        if (existingUser) {
            return res.json({ success: false, message: 'Email này đã được đăng ký. Vui lòng đăng nhập.' });
        }

        const existingKhachHang = await KhachHangModel.findByEmail(email);
        if (existingKhachHang) {
            return res.json({ success: false, message: 'Email này đã được đăng ký. Vui lòng đăng nhập.' });
        }

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        await OtpModel.create(email, otpCode, 'dangky');
        const sent = await EmailService.sendOTP(email, otpCode, 'dangky');

        if (sent) {
            return res.json({ success: true, message: 'Mã OTP đã được gửi đến email của bạn.' });
        } else {
            return res.json({ success: false, message: 'Không thể gửi email. Vui lòng thử lại sau.' });
        }
    } catch (error) {
        next(error);
    }
});

// POST /verify-register-otp
router.post('/verify-register-otp', async (req, res, next) => {
    let connection;
    try {
        const email = (req.body.email || '').trim().toLowerCase();
        const otpCode = (req.body.otp || '').trim();
        const password = req.body.password || '';
        const fullname = (req.body.fullname || '').trim();
        const phone = (req.body.phone || '').trim();

        if (!email || !otpCode || !password) {
            return res.json({ success: false, message: 'Thiếu thông tin bắt buộc.' });
        }

        if (password.length < 6) {
            return res.json({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự.' });
        }

        const validOtp = await OtpModel.verify(email, otpCode, 'dangky');
        if (!validOtp) {
            return res.json({ success: false, message: 'Mã OTP không đúng hoặc đã hết hạn.' });
        }

        const existingUser = await TaiKhoanModel.findByUsername(email);
        if (existingUser) {
            return res.json({ success: false, message: 'Email này đã được đăng ký. Vui lòng đăng nhập.' });
        }

        const existingKhachHang = await KhachHangModel.findByEmail(email);
        if (existingKhachHang) {
            return res.json({ success: false, message: 'Email này đã được đăng ký. Vui lòng đăng nhập.' });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        const hashedPassword = await bcrypt.hash(password, 10);
        const maTK = await TaiKhoanModel.create(email, hashedPassword, 'khachhang', connection);
        
        await KhachHangModel.create(fullname ? fullname : email, email, maTK, phone || null, null, connection);
        await OtpModel.markUsed(email, otpCode, connection);

        await connection.commit();
        
        return res.json({ success: true, message: 'Đăng ký thành công! Chào mừng bạn đến với Vọc Records.' });
    } catch (error) {
        if (connection) {
            try { await connection.rollback(); } catch (e) { console.error('Rollback error:', e); }
        }
        console.error('Lỗi verify-register-otp:', error);
        return res.json({ 
            success: false, 
            message: error.code === 'ER_DUP_ENTRY' 
                ? 'Lỗi: Email đã tồn tại.' 
                : 'Lỗi hệ thống: ' + (error.message || 'Không thể hoàn tất đăng ký.') 
        });
    } finally {
        if (connection) connection.release();
    }
});

// POST /send-forgot-otp
router.post('/send-forgot-otp', otpLimiter, async (req, res, next) => {
    try {
        const email = (req.body.email || '').trim();

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            return res.json({ success: false, message: 'Email không hợp lệ.' });
        }

        const user = await TaiKhoanModel.findByUsername(email);
        if (!user) {
            return res.json({ success: true, message: 'Nếu email tồn tại trong hệ thống, mã OTP sẽ được gửi.' });
        }

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        await OtpModel.create(email, otpCode, 'quenmatkhau');

        await EmailService.sendOTP(email, otpCode, 'quenmatkhau');

        return res.json({ success: true, message: 'Nếu email tồn tại trong hệ thống, mã OTP sẽ được gửi.' });
    } catch (error) {
        next(error);
    }
});

// POST /verify-forgot-otp
router.post('/verify-forgot-otp', async (req, res, next) => {
    try {
        const email = (req.body.email || '').trim();
        const otpCode = (req.body.otp || '').trim();

        if (!email || !otpCode) {
            return res.json({ success: false, message: 'Thiếu thông tin.' });
        }

        const validOtp = await OtpModel.verify(email, otpCode, 'quenmatkhau');
        if (!validOtp) {
            return res.json({ success: false, message: 'Mã OTP không đúng hoặc đã hết hạn.' });
        }

        return res.json({ success: true, message: 'Xác thực thành công. Bạn có thể đặt mật khẩu mới.' });
    } catch (error) {
        next(error);
    }
});

// POST /reset-password
router.post('/reset-password', async (req, res, next) => {
    try {
        const email = (req.body.email || '').trim();
        const otpCode = (req.body.otp || '').trim();
        const newPassword = req.body.new_password || '';

        if (!email || !otpCode || !newPassword) {
            return res.json({ success: false, message: 'Thiếu thông tin.' });
        }

        if (newPassword.length < 6) {
            return res.json({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự.' });
        }

        const validOtp = await OtpModel.verify(email, otpCode, 'quenmatkhau');
        if (!validOtp) {
            return res.json({ success: false, message: 'Mã OTP không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.' });
        }

        const user = await TaiKhoanModel.findByUsername(email);
        if (!user) {
            return res.json({ success: false, message: 'Không tìm thấy tài khoản.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updated = await TaiKhoanModel.updatePassword(user.MaTK, hashedPassword);

        if (updated) {
            await OtpModel.markUsed(email, otpCode);
            return res.json({ success: true, message: 'Đổi mật khẩu thành công!' });
        } else {
            return res.json({ success: false, message: 'Lỗi cập nhật mật khẩu.' });
        }
    } catch (error) {
        next(error);
    }
});

module.exports = router;
