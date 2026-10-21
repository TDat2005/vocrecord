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

// POST / — Create product (admin): map genre name to MaDM, insert into SanPham
router.post('/', ...editor, async (req, res, next) => {
    try {
        const {
            title = '',
            artist = '',
            genre = '',
            music_genre: musicGenre = null,
            price = 0,
            stock = 0,
            description = '',
            image = '/images/products/vinyl-01.webp',
            format = null,
            condition = null,
            package_info: packageInfo = null,
            tracklist = null,
            year = 2024,
            status = 'conhang'
        } = req.body;

        let maDM = 1;
        const dm = await SanPhamModel.getDanhMucByName(genre);
        if (dm) maDM = dm.MaDM;

        const id = await SanPhamModel.create(title, artist, genre, price, stock, description, image, year, status, maDM, musicGenre, format, condition, packageInfo, tracklist);
        if (req.body.ai_keywords !== undefined) await SanPhamModel.setAiKeywords(id, req.body.ai_keywords);
        res.json({ success: true, message: 'Thêm sản phẩm thành công', id });
    } catch (error) {
        next(error);
    }
});

// PUT /:id — Update product
router.put('/:id', ...editor, async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!id) {
            return res.json({ success: false, message: 'ID không hợp lệ' });
        }
        
        const {
            title = '',
            artist = '',
            genre = '',
            music_genre: musicGenre = null,
            price = 0,
            stock = 0,
            description = '',
            image = '',
            format = null,
            condition = null,
            package_info: packageInfo = null,
            tracklist = null,
            year = 2024,
            status = 'conhang'
        } = req.body;

        let maDM = 1;
        const dm = await SanPhamModel.getDanhMucByName(genre);
        if (dm) maDM = dm.MaDM;

        const success = await SanPhamModel.update(id, title, artist, genre, price, stock, description, image, year, status, maDM, musicGenre, format, condition, packageInfo, tracklist);
        if (success && req.body.ai_keywords !== undefined) await SanPhamModel.setAiKeywords(id, req.body.ai_keywords);
        if (success) {
            res.json({ success: true, message: 'Đã cập nhật sản phẩm' });
        } else {
            res.json({ success: false, message: 'Lỗi cập nhật sản phẩm' });
        }
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
