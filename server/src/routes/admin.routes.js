const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { withTransaction } = require('../utils/db');
const { fail } = require('../utils/http');
const { authenticate, requireRole, forgetAccountStatus } = require('../middleware/auth.middleware');

router.use(authenticate, requireRole('admin', 'nhanvien'));

// Doanh thu ghi nhận vào ngày giao thành công (NgayHoanThanh) và gồm cả phần khách trả bằng ví tín dụng.
// Trước đây tính theo ngày đặt: đơn đặt hôm qua, giao hôm nay không vào doanh thu hôm nay.
const REVENUE = '(dh.TongTien + COALESCE(dh.SoTienTinDung, 0))';
// CSDL lưu UTC, "ngày" của cửa hàng tính theo giờ Việt Nam (UTC+7): đơn giao lúc 6h sáng không bị tính sang hôm trước.
const vnDate = (column) => `DATE(CONVERT_TZ(${column}, '+00:00', '+07:00'))`;
const VN_TODAY = "DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00'))";
const REVENUE_DATE = vnDate('COALESCE(dh.NgayHoanThanh, dh.NgayDat)');

// GET /dashboard
router.get('/dashboard', async (req, res, next) => {
    try {
        const [revRows, ordRows, prodRows, custRows, topProducts] = await Promise.all([
            pool.query(`SELECT SUM(${REVENUE}) as todayRevenue FROM DonHang dh WHERE ${REVENUE_DATE} = ${VN_TODAY} AND dh.TrangThai = 'hoanthanh'`),
            pool.query(`SELECT COUNT(MaDH) as todayOrders FROM DonHang WHERE ${vnDate('NgayDat')} = ${VN_TODAY} AND TrangThai != 'dahuy'`),
            pool.query("SELECT COUNT(MaSP) as totalProducts FROM SanPham WHERE TinhTrang <> 'ngungkinhdoanh'"),
            // Chỉ đếm tài khoản khách (dữ liệu cũ có hồ sơ khách gắn với tài khoản nhân viên).
            pool.query("SELECT COUNT(kh.MaKH) as totalCustomers FROM KhachHang kh LEFT JOIN TaiKhoan tk ON tk.MaTK = kh.MaTK WHERE tk.MaTK IS NULL OR tk.VaiTro = 'khachhang'"),
            pool.query(`
            SELECT sp.MaSP as id, sp.TenSP as name, sp.NgheSi as artist, SUM(ct.SoLuong) as sales, SUM(ct.SoLuong * ct.DonGia) as revenue
            FROM ChiTietDonHang ct
            JOIN SanPham sp ON ct.MaSP = sp.MaSP
            JOIN DonHang dh ON ct.MaDH = dh.MaDH
            WHERE dh.TrangThai = 'hoanthanh'
            GROUP BY sp.MaSP
            ORDER BY sales DESC
            LIMIT 5
            `)
        ]);

        res.json({
            success: true,
            data: {
                todayRevenue: parseFloat(revRows[0][0]?.todayRevenue || 0),
                todayOrders: parseInt(ordRows[0][0]?.todayOrders || 0, 10),
                totalProducts: parseInt(prodRows[0][0]?.totalProducts || 0, 10),
                totalCustomers: parseInt(custRows[0][0]?.totalCustomers || 0, 10),
                topProducts: topProducts[0]
            }
        });
    } catch (error) {
        next(error);
    }
});

const paging = (query, defaultLimit = 50) => {
    const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || defaultLimit, 1), 100);
    return { page, limit, offset: (page - 1) * limit };
};

// GET /customers?q=&page=&limit= — tìm theo tên, email, số điện thoại.
router.get('/customers', async (req, res, next) => {
    try {
        const { page, limit, offset } = paging(req.query);
        const keyword = String(req.query.q || '').trim();
        const where = ["(tk.MaTK IS NULL OR tk.VaiTro = 'khachhang')"];
        const params = [];
        if (keyword) {
            where.push('(kh.HoTen LIKE ? OR kh.Email LIKE ? OR kh.SoDienThoai LIKE ?)');
            params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
        }
        const from = `FROM KhachHang kh LEFT JOIN TaiKhoan tk ON tk.MaTK = kh.MaTK WHERE ${where.join(' AND ')}`;
        const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total ${from}`, params);
        const [customers] = await pool.query(`
            SELECT kh.MaKH as id, kh.HoTen as name, kh.Email as email, kh.SoDienThoai as phone,
                   tk.MaTK as account_id, COALESCE(tk.TrangThai, 1) as active,
                   (SELECT COUNT(*) FROM DonHang d WHERE d.MaKH = kh.MaKH AND d.TrangThai = 'hoanthanh') as totalOrders,
                   (SELECT COALESCE(SUM(d.TongTien + COALESCE(d.SoTienTinDung, 0)), 0) FROM DonHang d WHERE d.MaKH = kh.MaKH AND d.TrangThai = 'hoanthanh') as totalSpent,
                   (SELECT COUNT(*) FROM DonHang d WHERE d.MaKH = kh.MaKH AND d.TrangThai = 'dahuy') as cancelledOrders
            ${from}
            ORDER BY kh.MaKH DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);
        res.json({ success: true, data: customers, total: Number(total), page, limit });
    } catch (error) {
        next(error);
    }
});

// PUT /customers/:id/status — Admin khóa / mở khóa tài khoản khách (vd: khách hay bom hàng).
// Phiên đang đăng nhập của khách bị chặn ngay (auth.middleware đọc trạng thái tài khoản).
router.put('/customers/:id/status', requireRole('admin'), async (req, res, next) => {
    try {
        const active = req.body.active === true || req.body.active === 1 || req.body.active === '1';
        const [[customer]] = await pool.query('SELECT kh.MaTK, tk.VaiTro FROM KhachHang kh JOIN TaiKhoan tk ON tk.MaTK = kh.MaTK WHERE kh.MaKH = ?', [req.params.id]);
        if (!customer) throw fail(404, 'Không tìm thấy tài khoản khách hàng');
        if (customer.VaiTro !== 'khachhang') throw fail(400, 'Đây là tài khoản nhân viên, khóa ở mục Nhân sự & phân quyền');
        await pool.query('UPDATE TaiKhoan SET TrangThai = ? WHERE MaTK = ?', [active ? 1 : 0, customer.MaTK]);
        forgetAccountStatus(customer.MaTK);
        await pool.query('INSERT INTO NhatKyHoatDong (MaTK, HanhDong, NoiDung) VALUES (?, ?, ?)',
            [req.user.id, active ? 'Mở khóa khách hàng' : 'Khóa khách hàng', `Khách hàng #${req.params.id}`]);
        res.json({ success: true, message: active ? 'Đã mở khóa tài khoản khách' : 'Đã khóa tài khoản khách' });
    } catch (error) {
        next(error);
    }
});

// GET /inventory?q=&page=&limit= — kho hàng có tìm kiếm theo tên/mã và phân trang.
// GET /inventory?all=1 — danh sách rút gọn mọi sản phẩm đang bán (chọn sản phẩm khi lập phiếu nhập kho).
router.get('/inventory', async (req, res, next) => {
    try {
        if (req.query.all === '1') {
            const [rows] = await pool.query("SELECT MaSP as id, TenSP as name, SoLuongTon as stock FROM SanPham WHERE TinhTrang <> 'ngungkinhdoanh' ORDER BY TenSP");
            return res.json({ success: true, data: rows });
        }
        const { page, limit, offset } = paging(req.query);
        const keyword = String(req.query.q || '').trim().replace(/^SP-/i, '');
        const where = keyword ? 'WHERE sp.TenSP LIKE ? OR sp.MaSP = ?' : '';
        const params = keyword ? [`%${keyword}%`, Number(keyword) || 0] : [];
        const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM SanPham sp ${where}`, params);
        const [inventory] = await pool.query(`
            SELECT sp.MaSP as id, sp.TenSP as name, sp.GiaBan as price, sp.SoLuongTon as stock, dm.TenDM as genre, sp.TinhTrang as status, sp.HinhAnh as image
            FROM SanPham sp
            LEFT JOIN DanhMuc dm ON sp.MaDM = dm.MaDM
            ${where}
            ORDER BY sp.MaSP DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);
        res.json({ success: true, data: inventory, total: Number(total), page, limit });
    } catch (error) {
        next(error);
    }
});

// GET /revenue-report
router.get('/revenue-report', async (req, res, next) => {
    try {
        const { start, end } = req.query;
        // Default start 30 days ago, end today
        // Ngày mặc định theo giờ Việt Nam: 30 ngày gần nhất.
        const vnDay = (offsetDays) => new Date(Date.now() + 7 * 3600000 - offsetDays * 86400000).toISOString().split('T')[0];
        const startDate = start || vnDay(30);
        const endDate = end || vnDay(0);

        const [report] = await pool.query(`
            SELECT DATE_FORMAT(${REVENUE_DATE}, '%Y-%m-%d') as date, SUM(${REVENUE}) as revenue, COUNT(dh.MaDH) as orders
            FROM DonHang dh
            WHERE ${REVENUE_DATE} BETWEEN ? AND ? AND dh.TrangThai = 'hoanthanh'
            GROUP BY date
            ORDER BY date ASC
        `, [startDate, endDate]);

        res.json({ success: true, data: report });
    } catch (error) {
        next(error);
    }
});

// POST /import-stock
router.post('/import-stock', async (req, res, next) => {
    try {
        const { items = [] } = req.body;
        const note = String(req.body.note || '').trim();
        if (!Array.isArray(items) || items.length === 0) throw fail(400, 'Dữ liệu không hợp lệ');
        if (note.length > 255) throw fail(400, 'Ghi chú phiếu nhập tối đa 255 ký tự');

        const [staffRows] = await pool.query('SELECT MaNV FROM NhanVien WHERE MaTK = ?', [req.user.id]);
        const employeeId = staffRows[0]?.MaNV;
        if (!employeeId) throw fail(403, 'Tài khoản chưa có hồ sơ nhân viên');

        // Kiểm tra dữ liệu từng dòng nhập (khớp luồng phụ UC12 trong báo cáo):
        // số lượng phải là số nguyên > 0, giá nhập >= 0, sản phẩm phải tồn tại.
        const normalized = [];
        for (const item of items) {
            const id = Number(item.id);
            const qty = Number(item.qty);
            const price = Number(item.price);
            if (!Number.isInteger(id) || id <= 0) throw fail(400, 'Mã sản phẩm không hợp lệ');
            if (!Number.isInteger(qty) || qty <= 0) throw fail(400, `Số lượng nhập của sản phẩm #${id} phải là số nguyên lớn hơn 0`);
            if (!Number.isFinite(price) || price < 0) throw fail(400, `Giá nhập của sản phẩm #${id} không hợp lệ`);
            normalized.push({ id, qty, price });
        }
        const ids = [...new Set(normalized.map((i) => i.id))];
        const [existing] = await pool.query('SELECT MaSP FROM SanPham WHERE MaSP IN (?)', [ids]);
        if (existing.length !== ids.length) {
            const found = new Set(existing.map((r) => r.MaSP));
            throw fail(400, `Sản phẩm không tồn tại: #${ids.filter((id) => !found.has(id)).join(', #')}`);
        }

        const total = normalized.reduce((sum, item) => sum + item.qty * item.price, 0);
        const maPN = await withTransaction(async (connection) => {
            const [result] = await connection.query("INSERT INTO PhieuNhap (MaNV, TongTien, GhiChu) VALUES (?, ?, ?)", [employeeId, total, note || null]);
            for (const item of normalized) {
                await connection.query("INSERT INTO ChiTietPhieuNhap (MaPN, MaSP, SoLuongNhap, GiaNhap) VALUES (?, ?, ?, ?)", [result.insertId, item.id, item.qty, item.price]);
                // Hàng về thì mở bán lại sản phẩm đang "Hết hàng" (trước đây vẫn kẹt trạng thái hết hàng, không đặt được).
                await connection.query(
                    "UPDATE SanPham SET SoLuongTon = SoLuongTon + ?, TinhTrang = IF(TinhTrang IN ('hethang', 'saphethang'), 'conhang', TinhTrang) WHERE MaSP = ?",
                    [item.qty, item.id]
                );
            }
            await connection.query(
                "INSERT INTO NhatKyHoatDong (MaTK, HanhDong, NoiDung) VALUES (?, ?, ?)",
                [req.user.id, 'Nhập kho', `Phiếu #${result.insertId}, ${normalized.length} dòng, tổng tiền ${total}`]
            );
            return result.insertId;
        });

        res.json({ success: true, message: 'Nhập kho thành công!', phieu_nhap_id: maPN });
    } catch (error) {
        next(error);
    }
});

// GET /activity-log
router.get('/activity-log', async (req, res, next) => {
    try {
        const [logs] = await pool.query(`
            SELECT n.MaNK as id, n.HanhDong as action, n.NoiDung as content, n.ThoiGian as time, 
                   t.TenDangNhap as username, nv.HoTen as fullname 
            FROM NhatKyHoatDong n 
            LEFT JOIN TaiKhoan t ON n.MaTK = t.MaTK 
            LEFT JOIN NhanVien nv ON t.MaTK = nv.MaTK
            ORDER BY n.ThoiGian DESC 
            LIMIT 50
        `);
        res.json({ success: true, data: logs });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
