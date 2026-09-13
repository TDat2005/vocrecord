const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const NhanVienModel = require('../models/nhanvien.model');
const TaiKhoanModel = require('../models/taikhoan.model');
const bcrypt = require('bcryptjs');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

router.use(authenticate, requireRole('admin'));

// GET /
router.get('/', async (req, res, next) => {
    try {
        const data = await NhanVienModel.getAll();
        return res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

// POST /
router.post('/', async (req, res, next) => {
    let connection;
    try {
        const username = (req.body.username || '').trim();
        const password = req.body.password || '';
        const name = (req.body.name || '').trim();
        const position = (req.body.position || '').trim();
        const role = req.body.role || 'nhanvien';

        if (!username || !password || !name) {
            return res.json({ success: false, message: 'Vui lòng điền đủ thông tin bắt buộc (Username, Mật khẩu, Họ tên)' });
        }

        const existingUser = await TaiKhoanModel.findByUsername(username);
        if (existingUser) {
            return res.json({ success: false, message: 'Tên đăng nhập đã tồn tại!' });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        const hashedPassword = await bcrypt.hash(password, 10);
        const maTK = await NhanVienModel.createAuth(username, hashedPassword, role, connection);
        await NhanVienModel.createProfile(name, position, maTK, connection);

        await connection.commit();
        return res.json({ success: true, message: 'Thêm nhân viên thành công!' });
    } catch (error) {
        if (connection) {
            try { await connection.rollback(); } catch (e) { console.error('Rollback error:', e); }
        }
        console.error('Lỗi thêm nhân viên:', error);
        return res.json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
});

// PUT /:id
router.put('/:id', async (req, res, next) => {
    let connection;
    try {
        const id = req.params.id || 0;
        const accountId = req.body.account_id || 0;
        const name = (req.body.name || '').trim();
        const position = (req.body.position || '').trim();
        const role = req.body.role || 'nhanvien';
        const password = req.body.password || '';

        if (!id || !accountId || !name) {
            return res.json({ success: false, message: 'Dữ liệu không hợp lệ' });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        await NhanVienModel.updateProfile(id, name, position, connection);
        await NhanVienModel.updateAuth(accountId, role, connection);

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await NhanVienModel.updatePassword(accountId, hashedPassword, connection);
        }

        await connection.commit();
        return res.json({ success: true, message: 'Cập nhật thành công!' });
    } catch (error) {
        if (connection) {
            try { await connection.rollback(); } catch (e) { console.error('Rollback error:', e); }
        }
        console.error('Lỗi cập nhật nhân viên:', error);
        return res.json({ success: false, message: 'Lỗi: ' + error.message });
    } finally {
        if (connection) connection.release();
    }
});

// PUT /:id/toggle
router.put('/:id/toggle', async (req, res, next) => {
    try {
        const accountId = req.body.account_id || 0;
        const status = req.body.status !== undefined ? parseInt(req.body.status) : 1;

        if (!accountId) {
            return res.json({ success: false, message: 'Thiếu ID Tài khoản' });
        }

        const success = await NhanVienModel.toggleStatus(accountId, status);
        if (success) {
            return res.json({ success: true, message: status === 1 ? 'Đã mở khóa tài khoản!' : 'Đã khóa tài khoản!' });
        } else {
            return res.json({ success: false, message: 'Lỗi cập nhật trạng thái' });
        }
    } catch (error) {
        next(error);
    }
});

module.exports = router;
