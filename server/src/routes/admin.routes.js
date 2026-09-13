const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

router.use(authenticate, requireRole('admin', 'nhanvien'));

// GET /dashboard
router.get('/dashboard', async (req, res, next) => {
    try {
        const [revRows, ordRows, prodRows, custRows, topProducts] = await Promise.all([
            pool.query("SELECT SUM(TongTien) as todayRevenue FROM DonHang WHERE NgayDat >= CURDATE() AND NgayDat < CURDATE() + INTERVAL 1 DAY AND TrangThai = 'hoanthanh'"),
            pool.query("SELECT COUNT(MaDH) as todayOrders FROM DonHang WHERE NgayDat >= CURDATE() AND NgayDat < CURDATE() + INTERVAL 1 DAY AND TrangThai != 'dahuy'"),
            pool.query("SELECT COUNT(MaSP) as totalProducts FROM SanPham"),
            pool.query("SELECT COUNT(MaKH) as totalCustomers FROM KhachHang"),
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

// GET /customers
router.get('/customers', async (req, res, next) => {
    try {
        const [customers] = await pool.query(`
            SELECT kh.*, COUNT(dh.MaDH) as totalOrders, COALESCE(SUM(dh.TongTien), 0) as totalSpent
            FROM KhachHang kh
            LEFT JOIN DonHang dh ON kh.MaKH = dh.MaKH AND dh.TrangThai = 'hoanthanh'
            GROUP BY kh.MaKH
            ORDER BY kh.MaKH DESC
            LIMIT 200
        `);
        res.json({ success: true, data: customers });
    } catch (error) {
        next(error);
    }
});

// GET /inventory
router.get('/inventory', async (req, res, next) => {
    try {
        const [inventory] = await pool.query(`
            SELECT sp.MaSP as id, sp.TenSP as name, sp.GiaBan as price, sp.SoLuongTon as stock, dm.TenDM as genre, sp.TinhTrang as status
            FROM SanPham sp
            LEFT JOIN DanhMuc dm ON sp.MaDM = dm.MaDM
            ORDER BY sp.MaSP DESC
            LIMIT 200
        `);
        res.json({ success: true, data: inventory });
    } catch (error) {
        next(error);
    }
});

// GET /revenue-report
router.get('/revenue-report', async (req, res, next) => {
    try {
        const { start, end } = req.query;
        // Default start 30 days ago, end today
        const startDate = start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const endDate = end || new Date().toISOString().split('T')[0];

        const [report] = await pool.query(`
            SELECT DATE(NgayDat) as date, SUM(TongTien) as revenue, COUNT(MaDH) as orders
            FROM DonHang
            WHERE NgayDat >= ? AND NgayDat < DATE_ADD(?, INTERVAL 1 DAY) AND TrangThai = 'hoanthanh'
            GROUP BY DATE(NgayDat)
            ORDER BY DATE(NgayDat) ASC
        `, [startDate, endDate]);

        res.json({ success: true, data: report });
    } catch (error) {
        next(error);
    }
});

// POST /import-stock
router.post('/import-stock', async (req, res, next) => {
    let connection;
    try {
        const { items = [], note = '' } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.json({ success: false, message: 'Dữ liệu không hợp lệ' });
        }

        const [staffRows] = await pool.query('SELECT MaNV FROM NhanVien WHERE MaTK = ?', [req.user.id]);
        const employeeId = staffRows[0]?.MaNV;
        if (!employeeId) return res.status(403).json({ success: false, message: 'Tài khoản chưa có hồ sơ nhân viên' });

        connection = await pool.getConnection();
        await connection.beginTransaction();

        let total = 0;
        for (const item of items) {
            total += (item.qty * item.price);
        }

        const [result] = await connection.query("INSERT INTO PhieuNhap (MaNV, TongTien, GhiChu) VALUES (?, ?, ?)", [employeeId, total, note]);
        const maPN = result.insertId;

        for (const item of items) {
            await connection.query("INSERT INTO ChiTietPhieuNhap (MaPN, MaSP, SoLuongNhap, GiaNhap) VALUES (?, ?, ?, ?)", [maPN, item.id, item.qty, item.price]);
            await connection.query("UPDATE SanPham SET SoLuongTon = SoLuongTon + ? WHERE MaSP = ?", [item.qty, item.id]);
        }

        const logMsg = `Nhập kho phiếu #${maPN}, tổng tiền ${total}`;
        await connection.query(
            "INSERT INTO NhatKyHoatDong (MaTK, HanhDong) VALUES ((SELECT MaTK FROM NhanVien WHERE MaNV = ? LIMIT 1), ?)",
            [employeeId, logMsg]
        );

        await connection.commit();
        connection.release();

        res.json({ success: true, message: 'Nhập kho thành công!', phieu_nhap_id: maPN });
    } catch (error) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        res.json({ success: false, message: 'Lỗi nhập kho: ' + error.message });
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
