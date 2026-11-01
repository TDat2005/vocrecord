const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const NhanVienModel = require('../models/nhanvien.model');
const TaiKhoanModel = require('../models/taikhoan.model');
const { withTransaction } = require('../utils/db');
const { fail } = require('../utils/http');
const { MIN_PASSWORD } = require('../utils/validate');
const { STAFF_ROLES } = require('../constants/order');
const { authenticate, requireRole, forgetAccountStatus } = require('../middleware/auth.middleware');

router.use(authenticate, requireRole('admin'));

// Đọc và kiểm tra dữ liệu nhân viên. Vai trò chỉ được là admin/nhanvien (trước đây nhận mọi chuỗi gửi lên).
function readEmployee(body, { isNew }) {
    const employee = {
        username: String(body.username || '').trim(),
        password: String(body.password || ''),
        name: String(body.name || '').trim(),
        position: String(body.position || '').trim(),
        role: body.role || 'nhanvien',
    };
    if (isNew && (!employee.username || employee.username.length > 100)) throw fail(400, 'Tên đăng nhập là bắt buộc (tối đa 100 ký tự)');
    if (isNew && !employee.password) throw fail(400, 'Vui lòng nhập mật khẩu');
    if (employee.password && employee.password.length < MIN_PASSWORD) throw fail(400, `Mật khẩu phải có ít nhất ${MIN_PASSWORD} ký tự`);
    if (!employee.name || employee.name.length > 100) throw fail(400, 'Họ tên là bắt buộc (tối đa 100 ký tự)');
    if (!STAFF_ROLES.includes(employee.role)) throw fail(400, 'Vai trò không hợp lệ');
    return employee;
}

// Tài khoản lấy theo mã nhân viên trong đường dẫn, không tin account_id gửi lên
// (trước đây gửi account_id của khách hàng là đổi được vai trò/khóa tài khoản khách).
async function findEmployee(id, connection = pool) {
    const [[employee]] = await connection.query(
        'SELECT nv.MaNV, nv.MaTK, tk.VaiTro FROM NhanVien nv JOIN TaiKhoan tk ON tk.MaTK = nv.MaTK WHERE nv.MaNV = ?',
        [id]
    );
    if (!employee) throw fail(404, 'Không tìm thấy nhân viên');
    return employee;
}

// GET /
router.get('/', async (req, res, next) => {
    try {
        return res.json({ success: true, data: await NhanVienModel.getAll() });
    } catch (error) {
        next(error);
    }
});

// POST /
router.post('/', async (req, res, next) => {
    try {
        const employee = readEmployee(req.body, { isNew: true });
        if (await TaiKhoanModel.findByUsername(employee.username)) throw fail(409, 'Tên đăng nhập đã tồn tại!');

        const hashedPassword = await bcrypt.hash(employee.password, 10);
        await withTransaction(async (connection) => {
            const maTK = await NhanVienModel.createAuth(employee.username, hashedPassword, employee.role, connection);
            await NhanVienModel.createProfile(employee.name, employee.position, maTK, connection);
        });
        return res.json({ success: true, message: 'Thêm nhân viên thành công!' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return next(fail(409, 'Tên đăng nhập đã tồn tại!'));
        next(error);
    }
});

// PUT /:id (id = MaNV)
router.put('/:id', async (req, res, next) => {
    try {
        const data = readEmployee(req.body, { isNew: false });
        const hashedPassword = data.password ? await bcrypt.hash(data.password, 10) : null;
        const accountId = await withTransaction(async (connection) => {
            const employee = await findEmployee(req.params.id, connection);
            // Admin tự hạ quyền mình thì mất luôn quyền vào trang này.
            if (Number(employee.MaTK) === Number(req.user.id) && data.role !== 'admin') {
                throw fail(400, 'Không thể tự hạ quyền tài khoản đang đăng nhập');
            }
            await NhanVienModel.updateProfile(employee.MaNV, data.name, data.position, connection);
            await NhanVienModel.updateAuth(employee.MaTK, data.role, connection);
            if (hashedPassword) await TaiKhoanModel.updatePassword(employee.MaTK, hashedPassword, connection);
            return employee.MaTK;
        });
        forgetAccountStatus(accountId); // vai trò/mật khẩu mới có hiệu lực ngay với phiên đang đăng nhập
        return res.json({ success: true, message: 'Cập nhật thành công!' });
    } catch (error) {
        next(error);
    }
});

// PUT /:id/toggle (id = MaNV)
router.put('/:id/toggle', async (req, res, next) => {
    try {
        const status = Number(req.body.status) === 0 ? 0 : 1;
        const employee = await findEmployee(req.params.id);
        if (Number(employee.MaTK) === Number(req.user.id) && status === 0) throw fail(400, 'Không thể tự khóa tài khoản đang đăng nhập');

        await NhanVienModel.toggleStatus(employee.MaTK, status);
        forgetAccountStatus(employee.MaTK); // khóa có hiệu lực ngay với phiên đang đăng nhập
        return res.json({ success: true, message: status === 1 ? 'Đã mở khóa tài khoản!' : 'Đã khóa tài khoản!' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
