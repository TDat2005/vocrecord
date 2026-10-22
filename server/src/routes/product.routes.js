const express = require('express');
const router = express.Router();
const SanPhamModel = require('../models/sanpham.model');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const editor = [authenticate, requireRole('admin', 'nhanvien')];

// GET / — List products with optional ?category= and ?search= filters
router.get('/', async (req, res, next) => {
    try {
        const { category, search } = req.query;
        const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 100, 1), 100);
        const products = await SanPhamModel.getAll(category, search, limit, (page - 1) * limit);
        res.json({ success: true, data: products });
    } catch (error) {
        next(error);
    }
});

// GET /categories — List all categories (DanhMuc)
router.get('/categories', async (req, res, next) => {
    try {
        const categories = await SanPhamModel.getCategories();
        res.json({ success: true, data: categories });
    } catch (error) {
        next(error);
    }
});

// GET /:id — Get product detail by MaSP
router.get('/:id', async (req, res, next) => {
    try {
        const product = await SanPhamModel.getById(req.params.id);
        if (product) {
            product.ai_keywords = await SanPhamModel.getAiKeywords(product.id);
            res.json({ success: true, data: product });
        } else {
            res.json({ success: false, message: 'Không tìm thấy sản phẩm' });
        }
    } catch (error) {
        next(error);
    }
});

const pool = require('../config/database');
const PRODUCT_STATUSES = ['conhang', 'saphethang', 'hethang', 'preorder', 'ngungkinhdoanh'];

// Đọc và kiểm tra dữ liệu sản phẩm. Khi sửa, trường không gửi lên giữ nguyên giá trị hiện tại
// (trước đây thiếu trường nào thì về mặc định: thiếu giá -> 0đ, thiếu tồn kho -> 0).
function readProduct(body, current = {}) {
    const pick = (key, fallback) => (body[key] !== undefined ? body[key] : fallback);
    const yearValue = pick('year', current.year ?? null);
    const product = {
        title: String(pick('title', current.title ?? '') || '').trim(),
        artist: String(pick('artist', current.artist ?? '') || '').trim(),
        genre: pick('genre', current.category ?? current.genre ?? ''),
        musicGenre: pick('music_genre', current.music_genre ?? null),
        price: Number(pick('price', current.price)),
        stock: Number(pick('stock', current.stock ?? 0)),
        description: pick('description', current.description ?? ''),
        image: pick('image', current.image ?? '/images/products/vinyl-01.webp'),
        format: pick('format', current.format ?? null),
        condition: pick('condition', current.condition ?? null),
        packageInfo: pick('package_info', current.package_info ?? null),
        tracklist: pick('tracklist', current.tracklist ?? null),
        year: yearValue === null || yearValue === '' ? null : Number(yearValue),
        status: pick('status', current.status ?? 'conhang'),
    };
    let error = null;
    if (!product.title || product.title.length > 255) error = 'Tên sản phẩm là bắt buộc (tối đa 255 ký tự)';
    else if (!Number.isFinite(product.price) || product.price <= 0 || product.price > 1e10) error = 'Giá bán phải lớn hơn 0';
    else if (!Number.isInteger(product.stock) || product.stock < 0) error = 'Tồn kho phải là số nguyên không âm';
    else if (product.year !== null && (!Number.isInteger(product.year) || product.year < 1900 || product.year > 2100)) error = 'Năm phát hành không hợp lệ';
    else if (!PRODUCT_STATUSES.includes(product.status)) error = 'Trạng thái sản phẩm không hợp lệ';
    return { product, error };
}

const logActivity = (req, action, content) => pool.query('INSERT INTO NhatKyHoatDong (MaTK, HanhDong, NoiDung) VALUES (?, ?, ?)', [req.user.id, action, content]).catch(() => {});

// POST / — Create product (admin): map genre name to MaDM, insert into SanPham
router.post('/', ...editor, async (req, res, next) => {
    try {
        const { product: p, error } = readProduct(req.body || {});
        if (error) return res.status(400).json({ success: false, message: error });

        let maDM = 1;
        const dm = await SanPhamModel.getDanhMucByName(p.genre);
        if (dm) maDM = dm.MaDM;

        const id = await SanPhamModel.create(p.title, p.artist, p.genre, p.price, p.stock, p.description, p.image, p.year, p.status, maDM, p.musicGenre, p.format, p.condition, p.packageInfo, p.tracklist);
        if (req.body.ai_keywords !== undefined) await SanPhamModel.setAiKeywords(id, req.body.ai_keywords);
        logActivity(req, 'Thêm sản phẩm', `#${id} ${p.title}, tồn ${p.stock}`);
        res.json({ success: true, message: 'Thêm sản phẩm thành công', id });
    } catch (error) {
        next(error);
    }
});

// PUT /:id — Update product
// Tồn kho: form gửi kèm stock_before (số tồn lúc mở form) thì chỉ áp dụng phần chênh lệch admin muốn đổi,
// không ghi đè số đã bán ra trong lúc admin đang sửa. Không gửi stock thì giữ nguyên tồn kho.
router.put('/:id', ...editor, async (req, res, next) => {
    try {
        const id = req.params.id;
        const current = await SanPhamModel.getById(id);
        if (!current) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        const body = req.body || {};
        const { product: p, error } = readProduct(body, current);
        if (error) return res.status(400).json({ success: false, message: error });

        let maDM = 1;
        const dm = await SanPhamModel.getDanhMucByName(p.genre);
        if (dm) maDM = dm.MaDM;

        const hasStockBefore = body.stock_before !== undefined && body.stock_before !== null && body.stock_before !== '';
        const directStock = body.stock !== undefined && !hasStockBefore ? p.stock : null;
        const success = await SanPhamModel.update(id, p.title, p.artist, p.genre, p.price, directStock, p.description, p.image, p.year, p.status, maDM, p.musicGenre, p.format, p.condition, p.packageInfo, p.tracklist);
        if (!success) return res.json({ success: false, message: 'Lỗi cập nhật sản phẩm' });

        let stockNow = directStock ?? Number(current.stock);
        if (hasStockBefore && body.stock !== undefined) {
            const delta = p.stock - Number(body.stock_before);
            if (delta) stockNow = await SanPhamModel.adjustStock(id, delta);
        }
        if (stockNow !== Number(current.stock)) logActivity(req, 'Điều chỉnh tồn kho', `#${id} ${p.title}: ${current.stock} -> ${stockNow}`);
        if (body.ai_keywords !== undefined) await SanPhamModel.setAiKeywords(id, body.ai_keywords);
        res.json({ success: true, message: 'Đã cập nhật sản phẩm', stock: stockNow });
    } catch (error) {
        next(error);
    }
});

// DELETE /:id — Delete product
router.delete('/:id', ...editor, async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!id) {
            return res.json({ success: false, message: 'ID không hợp lệ' });
        }
        const success = await SanPhamModel.delete(id);
        if (success) {
            res.json({ success: true, message: 'Đã chuyển sản phẩm sang Ngừng kinh doanh (giữ lịch sử đơn hàng)' });
        } else {
            res.json({ success: false, message: 'Lỗi xóa sản phẩm' });
        }
    } catch (error) {
        next(error);
    }
});

module.exports = router;
