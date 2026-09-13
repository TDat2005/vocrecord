const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const EDITOR_ROLES = ['admin', 'nhanvien'];
const TYPES = ['blog', 'huongdan'];
const STATUSES = ['nhap', 'daxuatban'];
const DIFFICULTIES = ['Dễ', 'Trung bình', 'Nâng cao'];
const CATEGORIES = {
    blog: ['Kiến thức Vinyl', 'Review Album', 'Nghệ sĩ & Câu chuyện', 'Văn hóa Analog'],
    huongdan: ['Hướng dẫn cơ bản', 'Bảo trì thiết bị', 'Kỹ thuật nâng cao']
};
const OPTIONAL_COLUMNS = ['ChuyenMuc', 'DoKho', 'TomTat', 'ThoiLuong', 'DoiTuong', 'DungCu', 'CacBuoc'];

// These columns are added by 05_seed_content_catalog.sql. The lookup keeps an
// older database readable while the migration is being applied.
let metadataColumnsPromise;
const getMetadataColumns = async () => {
    if (!metadataColumnsPromise) {
        metadataColumnsPromise = pool.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'BaiViet'
             AND COLUMN_NAME IN (${OPTIONAL_COLUMNS.map(() => '?').join(', ')})`,
            OPTIONAL_COLUMNS
        ).then(([rows]) => new Set(rows.map((row) => row.COLUMN_NAME)));
    }
    return metadataColumnsPromise;
};

const articleSelect = (columns) => `
    SELECT b.MaBV as id, b.TieuDe as title, b.NoiDung as content, b.LoaiBV as type,
           b.HinhAnh as image,
           ${columns.has('ChuyenMuc') ? 'b.ChuyenMuc' : 'NULL'} as category,
           ${columns.has('DoKho') ? 'b.DoKho' : 'NULL'} as difficulty,
           ${columns.has('TomTat') ? 'b.TomTat' : 'NULL'} as summary,
           ${columns.has('ThoiLuong') ? 'b.ThoiLuong' : 'NULL'} as duration,
           ${columns.has('DoiTuong') ? 'b.DoiTuong' : 'NULL'} as audience,
           ${columns.has('DungCu') ? 'b.DungCu' : 'NULL'} as tools,
           ${columns.has('CacBuoc') ? 'b.CacBuoc' : 'NULL'} as steps,
           b.NgayTao as created_at, b.NgayCapNhat as updated_at, b.TrangThai as status,
           COALESCE(nv.HoTen, t.TenDangNhap, 'Admin') as author
    FROM BaiViet b
    LEFT JOIN TaiKhoan t ON b.MaTK = t.MaTK
    LEFT JOIN NhanVien nv ON t.MaTK = nv.MaTK`;

const isValidType = (type) => TYPES.includes(type);
const isValidStatus = (status) => STATUSES.includes(status);

const normalizePayload = (body = {}) => {
    const type = body.type || 'blog';
    const status = body.status || 'nhap';
    const category = body.category ? String(body.category).trim() : '';
    const difficulty = body.difficulty ? String(body.difficulty).trim() : '';
    const steps = Array.isArray(body.steps)
        ? body.steps.map((step) => String(step).trim()).filter(Boolean)
        : String(body.steps || '').split(/\r?\n/).map((step) => step.trim()).filter(Boolean);

    if (!isValidType(type)) return { error: 'Loại nội dung không hợp lệ' };
    if (!isValidStatus(status)) return { error: 'Trạng thái không hợp lệ' };
    if (category && !CATEGORIES[type].includes(category)) return { error: 'Chuyên mục không phù hợp với loại nội dung' };
    if (type === 'huongdan' && difficulty && !DIFFICULTIES.includes(difficulty)) return { error: 'Độ khó không hợp lệ' };

    return {
        title: String(body.title || '').trim(),
        content: String(body.content || '').trim(),
        type,
        status,
        image: String(body.image || '').trim() || null,
        category: category || CATEGORIES[type][0],
        difficulty: type === 'huongdan' ? (difficulty || 'Dễ') : null,
        summary: String(body.summary || '').trim() || null,
        duration: String(body.duration || '').trim() || null,
        audience: type === 'huongdan' ? (String(body.audience || '').trim() || null) : null,
        tools: type === 'huongdan' ? (String(body.tools || '').trim() || null) : null,
        steps: type === 'huongdan' && steps.length ? steps : null
    };
};

const appendOptionalFields = (columns, fields, values, payload) => {
    const optional = [
        ['ChuyenMuc', payload.category],
        ['DoKho', payload.difficulty],
        ['TomTat', payload.summary],
        ['ThoiLuong', payload.duration],
        ['DoiTuong', payload.audience],
        ['DungCu', payload.tools],
        ['CacBuoc', payload.steps ? JSON.stringify(payload.steps) : null]
    ];
    optional.forEach(([column, value]) => {
        if (columns.has(column)) {
            fields.push(column);
            values.push(value);
        }
    });
};

const audit = async (accountId, action, message) => {
    if (!accountId) return;
    await pool.query(
        'INSERT INTO NhatKyHoatDong (MaTK, HanhDong, NoiDung) VALUES (?, ?, ?)',
        [accountId, action, message]
    );
};

const editorMiddleware = [authenticate, requireRole(...EDITOR_ROLES)];

const listArticles = async (req, { management = false } = {}) => {
    const columns = await getMetadataColumns();
    const type = req.query.type || null;
    const category = req.query.category || null;
    const requestedStatus = req.query.status || (management ? 'all' : 'daxuatban');
    const parsedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 50;

    if (type && !isValidType(type)) {
        const error = new Error('Loại nội dung không hợp lệ');
        error.status = 400;
        throw error;
    }
    if (management && requestedStatus !== 'all' && !isValidStatus(requestedStatus)) {
        const error = new Error('Trạng thái không hợp lệ');
        error.status = 400;
        throw error;
    }

    let query = articleSelect(columns) + ' WHERE 1=1';
    const params = [];
    if (type) {
        query += ' AND b.LoaiBV = ?';
        params.push(type);
    }
    // Public endpoints must never accept ?status=nhap or ?status=all.
    if (management) {
        if (requestedStatus !== 'all') {
            query += ' AND b.TrangThai = ?';
            params.push(requestedStatus);
        }
    } else {
        query += " AND b.TrangThai = 'daxuatban'";
    }
    if (category && columns.has('ChuyenMuc')) {
        query += ' AND b.ChuyenMuc = ?';
        params.push(category);
    }
    query += ' ORDER BY b.NgayTao DESC LIMIT ?';
    params.push(limit);
    const [rows] = await pool.query(query, params);
    return rows;
};

// Public listing: only published content is ever returned.
router.get('/', async (req, res, next) => {
    try {
        res.json({ success: true, data: await listArticles(req) });
    } catch (error) {
        next(error);
    }
});

// Admin/employee listing: supports drafts and filters for the management screen.
router.get('/manage', ...editorMiddleware, async (req, res, next) => {
    try {
        res.json({ success: true, data: await listArticles(req, { management: true }) });
    } catch (error) {
        next(error);
    }
});

// Protected detail endpoint so editors can load drafts for editing.
router.get('/manage/:id', ...editorMiddleware, async (req, res, next) => {
    try {
        const columns = await getMetadataColumns();
        const [rows] = await pool.query(articleSelect(columns) + ' WHERE b.MaBV = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        next(error);
    }
});

// Public detail: drafts are intentionally invisible, even with a guessed ID.
router.get('/:id', async (req, res, next) => {
    try {
        const columns = await getMetadataColumns();
        const [rows] = await pool.query(
            articleSelect(columns) + " WHERE b.MaBV = ? AND b.TrangThai = 'daxuatban'",
            [req.params.id]
        );
        if (rows.length) return res.json({ success: true, data: rows[0] });
        res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    } catch (error) {
        next(error);
    }
});

// POST / — Create a blog post or guide from the admin panel.
router.post('/', ...editorMiddleware, async (req, res, next) => {
    try {
        const payload = normalizePayload(req.body);
        if (payload.error) return res.status(400).json({ success: false, message: payload.error });
        if (!payload.title || !payload.content) {
            return res.status(400).json({ success: false, message: 'Tiêu đề và nội dung là bắt buộc' });
        }

        const columns = await getMetadataColumns();
        const fields = ['TieuDe', 'NoiDung', 'LoaiBV', 'HinhAnh', 'TrangThai', 'MaTK'];
        const values = [payload.title, payload.content, payload.type, payload.image, payload.status, req.user.id];
        appendOptionalFields(columns, fields, values, payload);
        const placeholders = fields.map(() => '?').join(', ');
        const [result] = await pool.query(`INSERT INTO BaiViet (${fields.join(', ')}) VALUES (${placeholders})`, values);
        await audit(req.user.id, 'ThemBaiViet', `Thêm bài viết mới: '${payload.title}'`);
        res.status(201).json({ success: true, message: 'Thêm bài viết thành công!', id: result.insertId });
    } catch (error) {
        next(error);
    }
});

// PUT /:id — Update an article without trusting a client-supplied account_id.
router.put('/:id', ...editorMiddleware, async (req, res, next) => {
    try {
        const payload = normalizePayload(req.body);
        if (payload.error) return res.status(400).json({ success: false, message: payload.error });
        if (!req.params.id || !payload.title || !payload.content) {
            return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
        }

        const columns = await getMetadataColumns();
        const fields = ['TieuDe', 'NoiDung', 'LoaiBV', 'HinhAnh', 'TrangThai'];
        const values = [payload.title, payload.content, payload.type, payload.image, payload.status];
        appendOptionalFields(columns, fields, values, payload);
        values.push(req.params.id);

        const [result] = await pool.query(`UPDATE BaiViet SET ${fields.map((field) => `${field}=?`).join(', ')} WHERE MaBV=?`, values);
        if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết để cập nhật' });
        await audit(req.user.id, 'SuaBaiViet', `Sửa bài viết ID: ${req.params.id}`);
        res.json({ success: true, message: 'Cập nhật bài viết thành công!' });
    } catch (error) {
        next(error);
    }
});

// DELETE /:id — Delete an article.
router.delete('/:id', ...editorMiddleware, async (req, res, next) => {
    try {
        if (!req.params.id) return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
        const [result] = await pool.query('DELETE FROM BaiViet WHERE MaBV=?', [req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết để xóa' });
        await audit(req.user.id, 'XoaBaiViet', `Xóa bài viết ID: ${req.params.id}`);
        res.json({ success: true, message: 'Đã xóa bài viết' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
