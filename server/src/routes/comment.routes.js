const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const editor = [authenticate, requireRole('admin', 'nhanvien')];

const commentSelect = `
    SELECT c.MaBL as id, c.MaSP as product_id, c.MaCha as parent_id, c.Loai as type,
           c.NoiDung as content, c.TrangThai as status, c.NgayTao as created_at,
           COALESCE(nv.HoTen, t.TenDangNhap, kh.HoTen, 'Khách hàng') as author,
           CASE WHEN t.VaiTro IN ('admin', 'nhanvien') THEN 1 ELSE 0 END as is_staff,
           sp.TenSP as product_title
    FROM BinhLuanSanPham c
    JOIN SanPham sp ON sp.MaSP = c.MaSP
    LEFT JOIN KhachHang kh ON kh.MaKH = c.MaKH
    LEFT JOIN TaiKhoan t ON t.MaTK = c.MaTK
    LEFT JOIN NhanVien nv ON nv.MaTK = c.MaTK`;

router.get('/product/:productId', async (req, res, next) => {
    try {
        const [rows] = await pool.query(`${commentSelect} WHERE c.MaSP = ? AND c.TrangThai = 'daduyet' ORDER BY c.NgayTao ASC`, [req.params.productId]);
        res.json({ success: true, data: rows });
    } catch (error) { next(error); }
});

router.post('/product/:productId', authenticate, async (req, res, next) => {
    try {
        const content = String(req.body.content || '').trim();
        if (!content || content.length > 2000) return res.status(400).json({ success: false, message: 'Nội dung phải từ 1 đến 2000 ký tự' });
        if (!req.user.customerId) return res.status(403).json({ success: false, message: 'Chỉ tài khoản khách hàng mới được gửi câu hỏi' });
        const [product] = await pool.query('SELECT MaSP FROM SanPham WHERE MaSP = ?', [req.params.productId]);
        if (!product.length) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        const [result] = await pool.query(
            "INSERT INTO BinhLuanSanPham (MaSP, MaKH, MaTK, Loai, NoiDung, TrangThai) VALUES (?, ?, ?, 'cauhoi', ?, 'choxuly')",
            [req.params.productId, req.user.customerId, req.user.id, content]
        );
        res.status(201).json({ success: true, message: 'Đã gửi câu hỏi. Cửa hàng sẽ phản hồi sớm.', id: result.insertId });
    } catch (error) { next(error); }
});

router.get('/manage', ...editor, async (req, res, next) => {
    try {
        const status = ['all', 'choxuly', 'daduyet', 'an'].includes(req.query.status) ? req.query.status : 'all';
        const params = [];
        let query = `${commentSelect} WHERE 1=1`;
        if (status !== 'all') { query += ' AND c.TrangThai = ?'; params.push(status); }
        query += ' ORDER BY c.NgayTao DESC LIMIT 200';
        const [rows] = await pool.query(query, params);
        res.json({ success: true, data: rows });
    } catch (error) { next(error); }
});

router.put('/:id/status', ...editor, async (req, res, next) => {
    try {
        const status = String(req.body.status || '');
        if (!['choxuly', 'daduyet', 'an'].includes(status)) return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
        const [result] = await pool.query('UPDATE BinhLuanSanPham SET TrangThai=? WHERE MaBL=?', [status, req.params.id]);
        res.json({ success: result.affectedRows > 0, message: result.affectedRows ? 'Đã cập nhật bình luận' : 'Không tìm thấy bình luận' });
    } catch (error) { next(error); }
});

router.post('/:id/reply', ...editor, async (req, res, next) => {
    try {
        const content = String(req.body.content || '').trim();
        if (!content || content.length > 2000) return res.status(400).json({ success: false, message: 'Nội dung phải từ 1 đến 2000 ký tự' });
        const [parents] = await pool.query('SELECT MaBL, MaSP FROM BinhLuanSanPham WHERE MaBL=?', [req.params.id]);
        if (!parents.length) return res.status(404).json({ success: false, message: 'Không tìm thấy câu hỏi' });
        const [result] = await pool.query(
            "INSERT INTO BinhLuanSanPham (MaSP, MaTK, MaCha, Loai, NoiDung, TrangThai) VALUES (?, ?, ?, 'phanhoi', ?, 'daduyet')",
            [parents[0].MaSP, req.user.id, parents[0].MaBL, content]
        );
        await pool.query("UPDATE BinhLuanSanPham SET TrangThai='daduyet' WHERE MaBL=?", [req.params.id]);
        res.status(201).json({ success: true, message: 'Đã gửi phản hồi', id: result.insertId });
    } catch (error) { next(error); }
});

module.exports = router;
