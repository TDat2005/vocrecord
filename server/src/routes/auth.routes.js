const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

const pool = require('../config/database');
const TaiKhoanModel = require('../models/taikhoan.model');
const KhachHangModel = require('../models/khachhang.model');
const OtpModel = require('../models/otp.model');
const { isPhone, PHONE_MESSAGE, MIN_PASSWORD } = require('../utils/validate');
const { withTransaction } = require('../utils/db');
const { issueToken } = require('../utils/token');
const EmailService = require('../services/email.service');
const { forgetAccountStatus } = require('../middleware/auth.middleware');
const { rateLimit } = require('../middleware/rate-limit.middleware');

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Bạn đăng nhập sai hoặc thử quá nhiều lần. Vui lòng thử lại sau 15 phút.' });
const otpLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: 'Bạn đã yêu cầu OTP quá nhiều lần. Vui lòng thử lại sau.' });
// Giới hạn số lần nhập OTP: mã chỉ có 6 chữ số nên không chặn thì có thể dò hết trong 5 phút hiệu lực.
const verifyLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Bạn nhập mã OTP quá nhiều lần. Vui lòng thử lại sau 15 phút.' });

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Email là tên đăng nhập của khách: luôn so sánh ở dạng chữ thường, bỏ khoảng trắng.
const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
// Mã OTP sinh bằng bộ sinh số ngẫu nhiên an toàn (Math.random có thể đoán được).
const newOtp = () => String(crypto.randomInt(100000, 1000000));
const bad = (res, message, status = 400) => res.status(status).json({ success: false, message });

// POST /login
router.post('/login', loginLimiter, async (req, res, next) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) return bad(res, 'Vui lòng nhập tài khoản và mật khẩu.');
        if (!process.env.JWT_SECRET) return bad(res, 'Máy chủ chưa cấu hình xác thực.', 503);

        const user = await TaiKhoanModel.findByUsername(String(username).trim());
        if (!user || !(await bcrypt.compare(String(password), user.MatKhau))) {
            return bad(res, 'Sai tài khoản hoặc mật khẩu!');
        }
        if (Number(user.TrangThai) === 0) return bad(res, 'Tài khoản của bạn đã bị khoá. Vui lòng liên hệ Admin.', 403);

        // Đăng nhập đúng thì xóa bộ đếm: giới hạn chỉ nhằm chặn dò mật khẩu.
        loginLimiter.reset(req);

        const profile = await KhachHangModel.getByAccountId(user.MaTK);
        const customerId = profile ? profile.MaKH : null;
        let name = profile ? profile.HoTen : '';
        if (user.VaiTro !== 'khachhang') {
            // Nhân viên/admin: ưu tiên tên trong hồ sơ nhân viên (header & trang quản trị hiển thị tên này).
            const [staffRows] = await pool.query('SELECT HoTen FROM NhanVien WHERE MaTK = ? LIMIT 1', [user.MaTK]);
            name = staffRows[0]?.HoTen || name;
        }

        const token = issueToken({ accountId: user.MaTK, customerId, username: user.TenDangNhap, role: user.VaiTro });
        return res.json({
            success: true,
            token,
            user: { id: user.MaTK, customer_id: customerId, username: user.TenDangNhap, name, role: user.VaiTro },
        });
    } catch (error) {
        next(error);
    }
});

// POST /register (cũ, không xác thực OTP) đã được gỡ bỏ:
// đăng ký bắt buộc đi qua /send-register-otp -> /verify-register-otp (UC01).

const emailTaken = async (email) => Boolean(await TaiKhoanModel.findByUsername(email) || await KhachHangModel.findByEmail(email));

// POST /send-register-otp
router.post('/send-register-otp', otpLimiter, async (req, res, next) => {
    try {
        const email = normalizeEmail(req.body.email);
        if (!EMAIL_REGEX.test(email)) return bad(res, 'Email không hợp lệ.');
        if (await emailTaken(email)) return bad(res, 'Email này đã được đăng ký. Vui lòng đăng nhập.', 409);

        const otpCode = newOtp();
        await OtpModel.create(email, otpCode, 'dangky');
        const sent = await EmailService.sendOTP(email, otpCode, 'dangky');
        if (!sent) return bad(res, 'Không thể gửi email. Vui lòng thử lại sau.', 502);
        return res.json({ success: true, message: 'Mã OTP đã được gửi đến email của bạn.' });
    } catch (error) {
        next(error);
    }
});

// POST /verify-register-otp
router.post('/verify-register-otp', verifyLimiter, async (req, res, next) => {
    try {
        const email = normalizeEmail(req.body.email);
        const otpCode = String(req.body.otp || '').trim();
        const password = String(req.body.password || '');
        const fullname = String(req.body.fullname || '').trim().slice(0, 100);
        const phone = String(req.body.phone || '').trim();

        if (!email || !otpCode || !password) return bad(res, 'Thiếu thông tin bắt buộc.');
        if (password.length < MIN_PASSWORD) return bad(res, `Mật khẩu phải có ít nhất ${MIN_PASSWORD} ký tự.`);
        if (phone && !isPhone(phone)) return bad(res, PHONE_MESSAGE);

        const validOtp = await OtpModel.verify(email, otpCode, 'dangky');
        if (!validOtp) return bad(res, 'Mã OTP không đúng hoặc đã hết hạn.');
        if (await emailTaken(email)) return bad(res, 'Email này đã được đăng ký. Vui lòng đăng nhập.', 409);

        const hashedPassword = await bcrypt.hash(password, 10);
        await withTransaction(async (connection) => {
            const maTK = await TaiKhoanModel.create(email, hashedPassword, 'khachhang', connection);
            await KhachHangModel.create(fullname || email, email, maTK, phone || null, null, connection);
            await OtpModel.markUsed(email, otpCode, 'dangky', connection);
        });
        return res.json({ success: true, message: 'Đăng ký thành công! Chào mừng bạn đến với Vọc Records.' });
    } catch (error) {
        // Hai lần bấm đăng ký cùng lúc: lần sau trùng email.
        if (error.code === 'ER_DUP_ENTRY') return bad(res, 'Email này đã được đăng ký. Vui lòng đăng nhập.', 409);
        next(error);
    }
});

// POST /send-forgot-otp
router.post('/send-forgot-otp', otpLimiter, async (req, res, next) => {
    try {
        const email = normalizeEmail(req.body.email);
        if (!EMAIL_REGEX.test(email)) return bad(res, 'Email không hợp lệ.');

        // Trả cùng một câu dù email có hay không, để không dò được email nào đã đăng ký.
        const message = 'Nếu email tồn tại trong hệ thống, mã OTP sẽ được gửi.';
        const user = await TaiKhoanModel.findByUsername(email);
        if (!user) return res.json({ success: true, message });

        const otpCode = newOtp();
        await OtpModel.create(email, otpCode, 'quenmatkhau');
        await EmailService.sendOTP(email, otpCode, 'quenmatkhau');
        return res.json({ success: true, message });
    } catch (error) {
        next(error);
    }
});

// POST /verify-forgot-otp
router.post('/verify-forgot-otp', verifyLimiter, async (req, res, next) => {
    try {
        const email = normalizeEmail(req.body.email);
        const otpCode = String(req.body.otp || '').trim();
        if (!email || !otpCode) return bad(res, 'Thiếu thông tin.');

        const validOtp = await OtpModel.verify(email, otpCode, 'quenmatkhau');
        if (!validOtp) return bad(res, 'Mã OTP không đúng hoặc đã hết hạn.');
        return res.json({ success: true, message: 'Xác thực thành công. Bạn có thể đặt mật khẩu mới.' });
    } catch (error) {
        next(error);
    }
});

// POST /reset-password
router.post('/reset-password', verifyLimiter, async (req, res, next) => {
    try {
        const email = normalizeEmail(req.body.email);
        const otpCode = String(req.body.otp || '').trim();
        const newPassword = String(req.body.new_password || '');

        if (!email || !otpCode || !newPassword) return bad(res, 'Thiếu thông tin.');
        if (newPassword.length < MIN_PASSWORD) return bad(res, `Mật khẩu phải có ít nhất ${MIN_PASSWORD} ký tự.`);

        const validOtp = await OtpModel.verify(email, otpCode, 'quenmatkhau');
        if (!validOtp) return bad(res, 'Mã OTP không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.');

        const user = await TaiKhoanModel.findByUsername(email);
        if (!user) return bad(res, 'Không tìm thấy tài khoản.', 404);

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await withTransaction(async (connection) => {
            // Đánh dấu mã đã dùng trước: hai request cùng mã chạy song song thì chỉ một request đổi được mật khẩu.
            const used = await OtpModel.markUsed(email, otpCode, 'quenmatkhau', connection);
            if (!used) throw Object.assign(new Error('Mã OTP đã được sử dụng.'), { status: 400 });
            await TaiKhoanModel.updatePassword(user.MaTK, hashedPassword, connection);
        });
        forgetAccountStatus(user.MaTK); // các phiên đăng nhập cũ hết hiệu lực ngay
        return res.json({ success: true, message: 'Đổi mật khẩu thành công!' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
