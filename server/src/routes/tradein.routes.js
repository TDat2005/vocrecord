const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { rateLimit } = require('../middleware/rate-limit.middleware');
const { appraise } = require('../services/tradein/appraisal');
const Wallet = require('../services/tradein/wallet');
const { GRADES, GRADE_CODES, POLICY, buyoutPayout, roundPrice } = require('../services/tradein/pricing');

// Thu mua & ký gửi đĩa cũ.
//
// Máy trạng thái yêu cầu thu mua (YeuCauThuMua.TrangThai):
//   moi ──(NV hẹn lịch)──> chonhandia ──(NV nhận đĩa)──> dangthamdinh ──(NV gửi báo giá)──> chokhachxacnhan
//   chokhachxacnhan ──(khách đồng ý: bán đứt / ký gửi)──> hoanthanh
//   chokhachxacnhan ──(khách không đồng ý, nhận lại đĩa)──> khachtuchoi
//   moi, chonhandia ──(khách hủy)──> dahuy;  mọi bước chưa kết thúc ──(NV từ chối)──> tuchoi
//   Khách mang đĩa tới quầy thì NV chuyển thẳng moi -> dangthamdinh.
//
// Hợp đồng ký gửi (HopDongKyGui.TrangThai):
//   dangban ──(đơn chứa đĩa hoàn thành)──> daban ──(NV chi trả)──> dathanhtoan
//   (nhận tiền vào ví thì daban được bỏ qua: chuyển thẳng dathanhtoan)
//   dangban ──(khách rút đĩa / NV trả lại)──> datra

const staff = [authenticate, requireRole('admin', 'nhanvien')];
const REQUEST_STATUSES = ['moi', 'chonhandia', 'dangthamdinh', 'chokhachxacnhan', 'hoanthanh', 'khachtuchoi', 'tuchoi', 'dahuy'];
const OPEN_STATUSES = ['moi', 'chonhandia', 'dangthamdinh', 'chokhachxacnhan'];
const CONTRACT_STATUSES = ['dangban', 'daban', 'dathanhtoan', 'datra'];
const PAYOUT_METHODS = ['tienmat', 'chuyenkhoan', 'tindung'];
const FORMATS = ['vinyl', 'cassette'];
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

const itemLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 20, message: 'Bạn thẩm định quá nhiều đĩa trong thời gian ngắn. Vui lòng thử lại sau ít phút.' });

const fail = (status, message) => Object.assign(new Error(message), { status });
const text = (value, max) => String(value ?? '').trim().slice(0, max);
const money = (value) => (value === null || value === undefined ? null : Number(value));
const photoUrl = (photo) => `/api/tradein/photos/${photo.MaAnh}/${photo.KhoaTruyCap}`;
const gradeLabel = (code) => (GRADES.find((grade) => grade.code === code) || {}).label || code;

const requireCustomer = (req) => {
    if (!req.user.customerId) throw fail(403, 'Chức năng này dành cho tài khoản khách hàng');
    return req.user.customerId;
};

async function staffId(req, connection = pool) {
    const [rows] = await connection.query('SELECT MaNV FROM NhanVien WHERE MaTK = ?', [req.user.id]);
    return rows[0] ? rows[0].MaNV : null;
}

// Giải mã ảnh data URL và kiểm tra đúng là JPEG/PNG/WEBP (không tin phần khai báo của trình duyệt).
function decodePhoto(dataUrl) {
    const match = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
    if (!match) throw fail(400, 'Ảnh phải là JPG, PNG hoặc WEBP');
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > MAX_PHOTO_BYTES) throw fail(400, 'Mỗi ảnh tối đa 2MB');
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
    const isPng = buffer.subarray(0, 4).toString('hex') === '89504e47';
    const isWebp = buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP';
    if (!isJpeg && !isPng && !isWebp) throw fail(400, 'Tệp ảnh không hợp lệ');
    return { buffer, mime: isJpeg ? 'image/jpeg' : isPng ? 'image/png' : 'image/webp' };
}

// ---------- Đọc dữ liệu ----------
const REQUEST_SELECT = `
    SELECT yc.MaYC AS id, yc.MaKH AS customer_id, yc.TrangThai AS status, yc.CachGiao AS delivery,
           yc.GhiChuKhach AS customer_note, yc.NgayHen AS appointment, yc.LoiNhanCuaHang AS shop_message,
           yc.HinhThuc AS mode, yc.NhanTien AS payout_method, yc.ThongTinNhanTien AS payout_info,
           yc.TongTienThuMua AS payout_total, yc.DaChiTra AS paid, yc.NgayChiTra AS paid_at,
           yc.NgayTao AS created_at, yc.NgayCapNhat AS updated_at,
           kh.HoTen AS customer_name, kh.Email AS customer_email, kh.SoDienThoai AS customer_phone,
           (SELECT COUNT(*) FROM ChiTietThuMua c WHERE c.MaYC = yc.MaYC) AS item_count,
           (SELECT COALESCE(SUM(c.GiaThuMua), 0) FROM ChiTietThuMua c WHERE c.MaYC = yc.MaYC AND c.KetQua = 'nhan') AS offer_buy_total,
           (SELECT COALESCE(SUM(c.GiaNiemYet), 0) FROM ChiTietThuMua c WHERE c.MaYC = yc.MaYC AND c.KetQua = 'nhan') AS offer_list_total
    FROM YeuCauThuMua yc JOIN KhachHang kh ON kh.MaKH = yc.MaKH`;

const ITEM_SELECT = `
    SELECT c.MaCT AS id, c.MaYC AS request_id, c.MaKH AS customer_id, c.TenDia AS title, c.NgheSi AS artist,
           c.DinhDang AS format, c.NamPhatHanh AS year, c.KhachTuDanhGia AS self_grade,
           c.AiTrangThai AS ai_status, c.AiTinhTrangDia AS ai_media_grade, c.AiTinhTrangBia AS ai_sleeve_grade,
           c.AiNhanXet AS ai_detail, c.AiDoTinCay AS ai_confidence, c.AiMoHinh AS ai_model,
           c.MaSPThamChieu AS match_product_id, sp.TenSP AS match_title, sp.NgheSi AS match_artist, c.DoGiongAnh AS match_similarity,
           c.GiaThamChieu AS base_price, c.GiaDeXuatThuMua AS suggested_buy_price, c.GiaDeXuatNiemYet AS suggested_list_price,
           c.TinhTrangDia AS media_grade, c.TinhTrangBia AS sleeve_grade, c.GhiChuThamDinh AS staff_note,
           c.GiaThuMua AS buy_price, c.GiaNiemYet AS list_price, c.KetQua AS result, c.MaSP AS product_id, c.NgayTao AS created_at
    FROM ChiTietThuMua c LEFT JOIN SanPham sp ON sp.MaSP = c.MaSPThamChieu`;

function formatItem(row, photos) {
    let detail = {};
    try { detail = row.ai_detail ? JSON.parse(row.ai_detail) : {}; } catch { detail = {}; }
    const { ai_detail: _ignored, ...rest } = row;
    return {
        ...rest,
        ai_confidence: money(row.ai_confidence),
        match_similarity: money(row.match_similarity),
        base_price: money(row.base_price),
        suggested_buy_price: money(row.suggested_buy_price),
        suggested_list_price: money(row.suggested_list_price),
        buy_price: money(row.buy_price),
        list_price: money(row.list_price),
        ai: {
            summary: detail.summary || null,
            defects: detail.defects || [],
            identified: detail.identified || null,
            is_record: detail.isRecord !== false,
            media_visible: detail.mediaVisible !== false,
            error: detail.error || null,
        },
        photos: (photos.get(row.id) || []).map(photoUrl),
    };
}

async function loadItems(where, params, connection = pool) {
    const [rows] = await connection.query(`${ITEM_SELECT} WHERE ${where} ORDER BY c.MaCT`, params);
    const photos = new Map();
    if (rows.length) {
        const [photoRows] = await connection.query(
            'SELECT MaAnh, MaCT, KhoaTruyCap FROM AnhThuMua WHERE MaCT IN (?) ORDER BY ThuTu, MaAnh',
            [rows.map((row) => row.id)]
        );
        for (const photo of photoRows) {
            if (!photos.has(photo.MaCT)) photos.set(photo.MaCT, []);
            photos.get(photo.MaCT).push(photo);
        }
    }
    return rows.map((row) => formatItem(row, photos));
}

const formatRequest = (row) => ({
    ...row,
    paid: Boolean(row.paid),
    payout_total: money(row.payout_total),
    offer_buy_total: money(row.offer_buy_total),
    offer_list_total: money(row.offer_list_total),
});

async function getRequest(id, connection = pool) {
    const [rows] = await connection.query(`${REQUEST_SELECT} WHERE yc.MaYC = ?`, [id]);
    if (!rows[0]) return null;
    return { ...formatRequest(rows[0]), items: await loadItems('c.MaYC = ?', [id], connection) };
}

// ---------- Chính sách (công khai) ----------
router.get('/policy', (req, res) => {
    res.json({ success: true, data: { grades: GRADES, ...POLICY } });
});

// Ảnh khách chụp. Khóa ngẫu nhiên trong đường dẫn thay cho đăng nhập (thẻ <img> không gửi kèm token).
router.get('/photos/:id/:key', async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT KieuAnh, DuLieu FROM AnhThuMua WHERE MaAnh = ? AND KhoaTruyCap = ?', [req.params.id, req.params.key]);
        if (!rows[0]) return res.status(404).end();
        res.set({ 'Content-Type': rows[0].KieuAnh, 'Cache-Control': 'public, max-age=604800, immutable' });
        res.send(rows[0].DuLieu);
    } catch (error) { next(error); }
});

// ---------- Khách hàng ----------

// Thêm một đĩa và thẩm định ngay bằng AI (chưa gửi yêu cầu). Khách xem ước tính rồi mới gửi.
router.post('/items', authenticate, itemLimiter, async (req, res, next) => {
    let connection;
    try {
        const customerId = requireCustomer(req);
        const title = text(req.body.title, 255);
        const artist = text(req.body.artist, 255);
        const format = FORMATS.includes(req.body.format) ? req.body.format : 'vinyl';
        const year = Number.parseInt(req.body.year, 10);
        const selfGrade = GRADE_CODES.includes(req.body.self_grade) ? req.body.self_grade : null;
        const photosInput = Array.isArray(req.body.photos) ? req.body.photos : [];
        if (!title) throw fail(400, 'Vui lòng nhập tên album');
        if (photosInput.length < 1 || photosInput.length > POLICY.maxPhotosPerItem) {
            throw fail(400, `Cần từ 1 đến ${POLICY.maxPhotosPerItem} ảnh (ảnh đầu tiên là mặt trước bìa)`);
        }
        const photos = photosInput.map(decodePhoto);

        const result = await appraise({ title, artist, format, selfGrade, photos });
        const detail = result.ai
            ? { summary: result.ai.summary, defects: result.ai.defects, isRecord: result.ai.isRecord, mediaVisible: result.ai.mediaVisible,
                identified: { title: result.ai.title, artist: result.ai.artist, year: result.ai.year, format: result.ai.format } }
            : { error: result.aiError };

        connection = await pool.getConnection();
        await connection.beginTransaction();
        // Dọn đĩa nháp khách thêm nhưng không gửi yêu cầu.
        await connection.query('DELETE FROM ChiTietThuMua WHERE MaYC IS NULL AND NgayTao < NOW() - INTERVAL 2 DAY');
        const [inserted] = await connection.query(
            `INSERT INTO ChiTietThuMua (MaKH, TenDia, NgheSi, DinhDang, NamPhatHanh, KhachTuDanhGia, AiTrangThai, AiTinhTrangDia, AiTinhTrangBia,
                AiNhanXet, AiDoTinCay, AiMoHinh, MaSPThamChieu, DoGiongAnh, GiaThamChieu, GiaDeXuatThuMua, GiaDeXuatNiemYet)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                customerId, title, artist || null, format, Number.isInteger(year) && year > 1900 ? year : (result.ai && result.ai.year) || null, selfGrade,
                result.aiStatus, result.ai ? result.ai.mediaGrade : null, result.ai ? result.ai.sleeveGrade : null,
                JSON.stringify(detail), result.ai ? result.ai.confidence : null, result.ai ? result.ai.model : null,
                result.match ? result.match.productId : null, result.match ? result.match.similarity : null,
                result.basePrice, result.suggestion.buyPrice, result.suggestion.listPrice,
            ]
        );
        for (const [index, photo] of photos.entries()) {
            await connection.query(
                'INSERT INTO AnhThuMua (MaCT, KhoaTruyCap, KieuAnh, DuLieu, ThuTu) VALUES (?, ?, ?, ?, ?)',
                [inserted.insertId, crypto.randomBytes(16).toString('hex'), photo.mime, photo.buffer, index]
            );
        }
        await connection.commit();
        connection.release();
        connection = null;

        const [item] = await loadItems('c.MaCT = ?', [inserted.insertId]);
        res.status(201).json({
            success: true,
            data: { ...item, suggestion: result.suggestion, used_grades: result.grades, match_method: result.match ? result.match.method : null },
        });
    } catch (error) {
        if (connection) { await connection.rollback(); connection.release(); }
        next(error);
    }
});

// Các đĩa khách đã thêm nhưng chưa gửi yêu cầu (tải lại trang không mất).
router.get('/items/drafts', authenticate, async (req, res, next) => {
    try {
        const customerId = requireCustomer(req);
        res.json({ success: true, data: await loadItems('c.MaKH = ? AND c.MaYC IS NULL', [customerId]) });
    } catch (error) { next(error); }
});

router.delete('/items/:id', authenticate, async (req, res, next) => {
    try {
        const customerId = requireCustomer(req);
        const [result] = await pool.query('DELETE FROM ChiTietThuMua WHERE MaCT = ? AND MaKH = ? AND MaYC IS NULL', [req.params.id, customerId]);
        res.json({ success: result.affectedRows > 0, message: result.affectedRows ? 'Đã bỏ đĩa khỏi danh sách' : 'Không tìm thấy đĩa nháp' });
    } catch (error) { next(error); }
});

// Gửi yêu cầu thu mua gồm các đĩa đã thêm.
router.post('/', authenticate, async (req, res, next) => {
    let connection;
    try {
        const customerId = requireCustomer(req);
        const itemIds = [...new Set((Array.isArray(req.body.item_ids) ? req.body.item_ids : []).map(Number).filter(Number.isInteger))];
        if (itemIds.length === 0) throw fail(400, 'Vui lòng thêm ít nhất một đĩa');
        if (itemIds.length > POLICY.maxItemsPerRequest) throw fail(400, `Mỗi yêu cầu tối đa ${POLICY.maxItemsPerRequest} đĩa`);
        const delivery = req.body.delivery === 'guiship' ? 'guiship' : 'mangden';

        connection = await pool.getConnection();
        await connection.beginTransaction();
        const [drafts] = await connection.query('SELECT MaCT FROM ChiTietThuMua WHERE MaCT IN (?) AND MaKH = ? AND MaYC IS NULL FOR UPDATE', [itemIds, customerId]);
        if (drafts.length !== itemIds.length) throw fail(409, 'Danh sách đĩa đã thay đổi, vui lòng tải lại trang');
        const [created] = await connection.query(
            "INSERT INTO YeuCauThuMua (MaKH, TrangThai, CachGiao, GhiChuKhach) VALUES (?, 'moi', ?, ?)",
            [customerId, delivery, text(req.body.note, 2000) || null]
        );
        await connection.query('UPDATE ChiTietThuMua SET MaYC = ? WHERE MaCT IN (?)', [created.insertId, itemIds]);
        await connection.commit();
        connection.release();
        res.status(201).json({ success: true, message: 'Đã gửi yêu cầu thu mua', id: created.insertId });
    } catch (error) {
        if (connection) { await connection.rollback(); connection.release(); }
        next(error);
    }
});

router.get('/mine', authenticate, async (req, res, next) => {
    try {
        const customerId = requireCustomer(req);
        const [rows] = await pool.query(`${REQUEST_SELECT} WHERE yc.MaKH = ? ORDER BY yc.NgayTao DESC LIMIT 100`, [customerId]);
        res.json({ success: true, data: rows.map(formatRequest) });
    } catch (error) { next(error); }
});

router.get('/wallet', authenticate, async (req, res, next) => {
    try {
        const customerId = requireCustomer(req);
        res.json({ success: true, data: { balance: await Wallet.getBalance(pool, customerId), history: await Wallet.getHistory(pool, customerId) } });
    } catch (error) { next(error); }
});

const CONTRACT_SELECT = `
    SELECT hd.MaHD AS id, hd.MaCT AS item_id, hd.MaKH AS customer_id, hd.MaSP AS product_id, hd.GiaBan AS list_price,
           hd.TyLeHoaHong AS commission_rate, hd.NhanTien AS payout_method, hd.ThongTinNhanTien AS payout_info,
           hd.TrangThai AS status, hd.MaDH AS order_id, hd.GiaBanThucTe AS sale_price, hd.SoTienTra AS payout,
           hd.NgayBatDau AS started_at, hd.NgayHetHan AS expires_at, hd.NgayBan AS sold_at, hd.NgayThanhToan AS paid_at,
           sp.TenSP AS title, sp.NgheSi AS artist, sp.HinhAnh AS image, sp.SoLuongTon AS stock, sp.TinhTrangDia AS \`condition\`,
           ct.MaYC AS request_id, kh.HoTen AS customer_name, kh.Email AS customer_email
    FROM HopDongKyGui hd
    JOIN SanPham sp ON sp.MaSP = hd.MaSP
    JOIN ChiTietThuMua ct ON ct.MaCT = hd.MaCT
    JOIN KhachHang kh ON kh.MaKH = hd.MaKH`;

const formatContract = (row) => ({
    ...row,
    list_price: money(row.list_price),
    commission_rate: money(row.commission_rate),
    sale_price: money(row.sale_price),
    payout: money(row.payout),
    expired: row.status === 'dangban' && new Date(row.expires_at).getTime() < Date.now(),
});

router.get('/consignments/mine', authenticate, async (req, res, next) => {
    try {
        const customerId = requireCustomer(req);
        const [rows] = await pool.query(`${CONTRACT_SELECT} WHERE hd.MaKH = ? ORDER BY hd.MaHD DESC`, [customerId]);
        res.json({ success: true, data: rows.map(formatContract) });
    } catch (error) { next(error); }
});

// Rút đĩa ký gửi chưa bán: gỡ khỏi cửa hàng, khách hẹn lấy lại đĩa.
async function returnConsignment(contractId, { customerId = null } = {}) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [[contract]] = await connection.query(
            'SELECT hd.MaHD, hd.MaKH, hd.MaSP, hd.TrangThai, sp.SoLuongTon FROM HopDongKyGui hd JOIN SanPham sp ON sp.MaSP = hd.MaSP WHERE hd.MaHD = ? FOR UPDATE',
            [contractId]
        );
        if (!contract || (customerId && contract.MaKH !== customerId)) throw fail(404, 'Không tìm thấy hợp đồng ký gửi');
        if (contract.TrangThai !== 'dangban') throw fail(409, 'Chỉ rút được đĩa đang bán');
        if (Number(contract.SoLuongTon) < 1) throw fail(409, 'Đĩa đang nằm trong một đơn hàng chưa hoàn tất, chưa rút được');
        await connection.query("UPDATE SanPham SET SoLuongTon = 0, TinhTrang = 'ngungkinhdoanh' WHERE MaSP = ?", [contract.MaSP]);
        await connection.query("UPDATE HopDongKyGui SET TrangThai = 'datra' WHERE MaHD = ?", [contractId]);
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

router.post('/consignments/:id/withdraw', authenticate, async (req, res, next) => {
    try {
        await returnConsignment(req.params.id, { customerId: requireCustomer(req) });
        res.json({ success: true, message: 'Đã gỡ đĩa khỏi cửa hàng. Bạn hẹn với Vọc Records để nhận lại đĩa nhé.' });
    } catch (error) { next(error); }
});

// ---------- Nhân viên ----------
router.get('/manage', ...staff, async (req, res, next) => {
    try {
        const status = REQUEST_STATUSES.includes(req.query.status) ? req.query.status : null;
        const [rows] = await pool.query(
            `${REQUEST_SELECT} ${status ? 'WHERE yc.TrangThai = ?' : ''} ORDER BY FIELD(yc.TrangThai, 'chokhachxacnhan', 'chonhandia', 'dangthamdinh', 'moi') DESC, yc.NgayCapNhat DESC LIMIT 200`,
            status ? [status] : []
        );
        res.json({ success: true, data: rows.map(formatRequest) });
    } catch (error) { next(error); }
});

router.get('/consignments/manage', ...staff, async (req, res, next) => {
    try {
        const status = CONTRACT_STATUSES.includes(req.query.status) ? req.query.status : null;
        const [rows] = await pool.query(`${CONTRACT_SELECT} ${status ? 'WHERE hd.TrangThai = ?' : ''} ORDER BY FIELD(hd.TrangThai, 'daban') DESC, hd.MaHD DESC LIMIT 300`, status ? [status] : []);
        res.json({ success: true, data: rows.map(formatContract) });
    } catch (error) { next(error); }
});

router.put('/consignments/:id/paid', ...staff, async (req, res, next) => {
    try {
        const [result] = await pool.query("UPDATE HopDongKyGui SET TrangThai = 'dathanhtoan', NgayThanhToan = NOW() WHERE MaHD = ? AND TrangThai = 'daban'", [req.params.id]);
        if (!result.affectedRows) throw fail(409, 'Chỉ chi trả được hợp đồng đã bán và chưa thanh toán');
        res.json({ success: true, message: 'Đã ghi nhận chi trả cho người ký gửi' });
    } catch (error) { next(error); }
});

router.put('/consignments/:id/return', ...staff, async (req, res, next) => {
    try {
        await returnConsignment(req.params.id);
        res.json({ success: true, message: 'Đã gỡ đĩa và chuyển hợp đồng sang "Đã trả lại"' });
    } catch (error) { next(error); }
});

router.get('/report', ...staff, async (req, res, next) => {
    try {
        const [[byStatus], [[buyout]], [[usedSales]], [[profit]], [contracts], [[credit]], [aiRows]] = await Promise.all([
            pool.query('SELECT TrangThai AS status, COUNT(*) AS total FROM YeuCauThuMua GROUP BY TrangThai'),
            pool.query(`SELECT COUNT(*) AS items, COALESCE(SUM(c.GiaThuMua), 0) AS cost,
                               (SELECT COALESCE(SUM(TongTienThuMua), 0) FROM YeuCauThuMua WHERE TrangThai = 'hoanthanh' AND HinhThuc = 'bandut') AS paid_out,
                               (SELECT COALESCE(SUM(TongTienThuMua), 0) FROM YeuCauThuMua WHERE TrangThai = 'hoanthanh' AND HinhThuc = 'bandut' AND DaChiTra = FALSE) AS unpaid
                        FROM ChiTietThuMua c JOIN YeuCauThuMua y ON y.MaYC = c.MaYC
                        WHERE y.TrangThai = 'hoanthanh' AND y.HinhThuc = 'bandut' AND c.KetQua = 'nhan'`),
            pool.query(`SELECT COUNT(*) AS items, COALESCE(SUM(ct.DonGia * ct.SoLuong), 0) AS revenue
                        FROM ChiTietDonHang ct JOIN DonHang dh ON dh.MaDH = ct.MaDH JOIN SanPham sp ON sp.MaSP = ct.MaSP
                        WHERE dh.TrangThai = 'hoanthanh' AND sp.LoaiHang = 'cu'`),
            pool.query(`SELECT COUNT(*) AS items, COALESCE(SUM(ct.DonGia * ct.SoLuong - c.GiaThuMua), 0) AS gross_profit
                        FROM ChiTietDonHang ct JOIN DonHang dh ON dh.MaDH = ct.MaDH
                        JOIN ChiTietThuMua c ON c.MaSP = ct.MaSP JOIN YeuCauThuMua y ON y.MaYC = c.MaYC
                        WHERE dh.TrangThai = 'hoanthanh' AND y.HinhThuc = 'bandut'`),
            pool.query(`SELECT TrangThai AS status, COUNT(*) AS total, COALESCE(SUM(GiaBanThucTe - SoTienTra), 0) AS commission,
                               COALESCE(SUM(SoTienTra), 0) AS payout FROM HopDongKyGui GROUP BY TrangThai`),
            pool.query(`SELECT (SELECT COALESCE(SUM(SoDuTinDung), 0) FROM KhachHang) AS outstanding,
                               COALESCE(SUM(CASE WHEN SoTien > 0 AND Loai IN ('thumua', 'kygui') THEN SoTien END), 0) AS issued,
                               COALESCE(-SUM(CASE WHEN Loai = 'thanhtoan' THEN SoTien END), 0) AS spent
                        FROM GiaoDichTinDung`),
            pool.query(`SELECT AiTinhTrangDia AS ai, TinhTrangDia AS staff FROM ChiTietThuMua
                        WHERE AiTrangThai = 'xong' AND TinhTrangDia IS NOT NULL AND AiTinhTrangDia IS NOT NULL`),
        ]);
        const contractBy = Object.fromEntries(contracts.map((row) => [row.status, row]));
        const sold = ['daban', 'dathanhtoan'].map((status) => contractBy[status] || { total: 0, commission: 0, payout: 0 });
        const distance = (a, b) => Math.abs(GRADE_CODES.indexOf(a) - GRADE_CODES.indexOf(b));
        res.json({
            success: true,
            data: {
                requests: Object.fromEntries(byStatus.map((row) => [row.status, Number(row.total)])),
                buyout: { items: Number(buyout.items), cost: Number(buyout.cost), paid_out: Number(buyout.paid_out), unpaid: Number(buyout.unpaid) },
                used_sales: { items: Number(usedSales.items), revenue: Number(usedSales.revenue) },
                buyout_profit: { items: Number(profit.items), gross_profit: Number(profit.gross_profit) },
                consignment: {
                    selling: Number((contractBy.dangban || {}).total || 0),
                    sold: sold.reduce((sum, row) => sum + Number(row.total), 0),
                    returned: Number((contractBy.datra || {}).total || 0),
                    commission: sold.reduce((sum, row) => sum + Number(row.commission), 0),
                    owed: Number((contractBy.daban || {}).payout || 0),
                },
                credit: { outstanding: Number(credit.outstanding), issued: Number(credit.issued), spent: Number(credit.spent) },
                ai_accuracy: {
                    compared: aiRows.length,
                    exact: aiRows.filter((row) => row.ai === row.staff).length,
                    within_one: aiRows.filter((row) => distance(row.ai, row.staff) <= 1).length,
                },
            },
        });
    } catch (error) { next(error); }
});

// Chuyển trạng thái có kiểm tra trạng thái hiện tại (khóa dòng để hai nhân viên không xử lý chồng nhau).
async function lockRequest(connection, id, allowed) {
    const [[row]] = await connection.query('SELECT MaYC, MaKH, TrangThai FROM YeuCauThuMua WHERE MaYC = ? FOR UPDATE', [id]);
    if (!row) throw fail(404, 'Không tìm thấy yêu cầu thu mua');
    if (!allowed.includes(row.TrangThai)) throw fail(409, 'Yêu cầu đã được xử lý ở bước khác, vui lòng tải lại');
    return row;
}

async function withTransaction(work) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const result = await work(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// Hẹn lịch nhận đĩa: moi -> chonhandia.
router.put('/:id/schedule', ...staff, async (req, res, next) => {
    try {
        const appointment = req.body.appointment ? new Date(req.body.appointment) : null;
        if (!appointment || Number.isNaN(appointment.getTime())) throw fail(400, 'Vui lòng chọn ngày giờ hẹn');
        await withTransaction(async (connection) => {
            await lockRequest(connection, req.params.id, ['moi', 'chonhandia']);
            await connection.query(
                "UPDATE YeuCauThuMua SET TrangThai = 'chonhandia', NgayHen = ?, LoiNhanCuaHang = ?, MaNV = ? WHERE MaYC = ?",
                [appointment, text(req.body.message, 2000) || null, await staffId(req, connection), req.params.id]
            );
        });
        res.json({ success: true, message: 'Đã hẹn lịch nhận đĩa' });
    } catch (error) { next(error); }
});

// Đã nhận đĩa (khách mang tới hoặc shipper giao): -> dangthamdinh. Nhân viên chấm dựa trên kết quả AI.
router.put('/:id/receive', ...staff, async (req, res, next) => {
    try {
        await withTransaction(async (connection) => {
            await lockRequest(connection, req.params.id, ['moi', 'chonhandia']);
            await connection.query("UPDATE YeuCauThuMua SET TrangThai = 'dangthamdinh', MaNV = ? WHERE MaYC = ?", [await staffId(req, connection), req.params.id]);
            // Đĩa đã khớp album trong catalog: điền tên, nghệ sĩ chuẩn thay cho tên khách tự đặt ("Đĩa cũ của bố").
            const [matched] = await connection.query(
                `SELECT c.MaCT, sp.TenSP, sp.NgheSi FROM ChiTietThuMua c JOIN SanPham sp ON sp.MaSP = c.MaSPThamChieu WHERE c.MaYC = ?`,
                [req.params.id]
            );
            for (const row of matched) {
                await connection.query('UPDATE ChiTietThuMua SET TenDia = ?, NgheSi = COALESCE(?, NgheSi) WHERE MaCT = ?',
                    [row.TenSP.replace(/\s*\((cassette|vinyl|lp)\)\s*$/i, ''), row.NgheSi, row.MaCT]);
            }
            // Điền sẵn tình trạng và giá từ gợi ý của AI để nhân viên chỉ cần sửa chỗ khác.
            await connection.query(
                `UPDATE ChiTietThuMua SET TinhTrangDia = COALESCE(TinhTrangDia, AiTinhTrangDia, KhachTuDanhGia),
                        TinhTrangBia = COALESCE(TinhTrangBia, AiTinhTrangBia, KhachTuDanhGia),
                        GiaThuMua = COALESCE(GiaThuMua, GiaDeXuatThuMua), GiaNiemYet = COALESCE(GiaNiemYet, GiaDeXuatNiemYet)
                 WHERE MaYC = ?`,
                [req.params.id]
            );
        });
        res.json({ success: true, message: 'Đã nhận đĩa, chuyển sang thẩm định' });
    } catch (error) { next(error); }
});

// Lưu kết quả thẩm định từng đĩa (khi đang thẩm định).
router.put('/:id/items', ...staff, async (req, res, next) => {
    try {
        const items = Array.isArray(req.body.items) ? req.body.items : [];
        await withTransaction(async (connection) => {
            await lockRequest(connection, req.params.id, ['dangthamdinh']);
            for (const item of items) {
                const media = GRADE_CODES.includes(item.media_grade) ? item.media_grade : null;
                const sleeve = GRADE_CODES.includes(item.sleeve_grade) ? item.sleeve_grade : null;
                const buyPrice = item.buy_price === '' || item.buy_price === null || item.buy_price === undefined ? null : Number(item.buy_price);
                const listPrice = item.list_price === '' || item.list_price === null || item.list_price === undefined ? null : Number(item.list_price);
                if ((buyPrice !== null && !(buyPrice >= 0)) || (listPrice !== null && !(listPrice >= 0))) throw fail(400, 'Giá không hợp lệ');
                const result = ['cho', 'nhan', 'loai'].includes(item.result) ? item.result : 'cho';
                await connection.query(
                    `UPDATE ChiTietThuMua SET TenDia = COALESCE(?, TenDia), NgheSi = ?, TinhTrangDia = ?, TinhTrangBia = ?, GiaThuMua = ?, GiaNiemYet = ?,
                            KetQua = ?, GhiChuThamDinh = ?
                     WHERE MaCT = ? AND MaYC = ?`,
                    [text(item.title, 255) || null, text(item.artist, 255) || null, media, sleeve,
                        buyPrice === null ? null : roundPrice(buyPrice), listPrice === null ? null : roundPrice(listPrice), result,
                        text(item.staff_note, 2000) || null, item.id, req.params.id]
                );
            }
        });
        res.json({ success: true, message: 'Đã lưu kết quả thẩm định' });
    } catch (error) { next(error); }
});

// Gửi báo giá cho khách: dangthamdinh -> chokhachxacnhan.
router.put('/:id/offer', ...staff, async (req, res, next) => {
    try {
        await withTransaction(async (connection) => {
            await lockRequest(connection, req.params.id, ['dangthamdinh']);
            const [items] = await connection.query('SELECT KetQua, TinhTrangDia, TinhTrangBia, GiaThuMua, GiaNiemYet FROM ChiTietThuMua WHERE MaYC = ?', [req.params.id]);
            if (items.some((item) => item.KetQua === 'cho')) throw fail(400, 'Còn đĩa chưa thẩm định (chọn Nhận hoặc Không nhận cho từng đĩa)');
            const accepted = items.filter((item) => item.KetQua === 'nhan');
            if (accepted.length === 0) throw fail(400, 'Không nhận đĩa nào: hãy dùng "Từ chối yêu cầu"');
            if (accepted.some((item) => !item.TinhTrangDia || !item.TinhTrangBia || !(Number(item.GiaThuMua) > 0) || !(Number(item.GiaNiemYet) > 0))) {
                throw fail(400, 'Đĩa được nhận cần đủ tình trạng đĩa, bìa, giá thu mua và giá niêm yết');
            }
            await connection.query("UPDATE YeuCauThuMua SET TrangThai = 'chokhachxacnhan', LoiNhanCuaHang = ? WHERE MaYC = ?", [text(req.body.message, 2000) || null, req.params.id]);
        });
        res.json({ success: true, message: 'Đã gửi báo giá cho khách' });
    } catch (error) { next(error); }
});

router.put('/:id/reject', ...staff, async (req, res, next) => {
    try {
        const message = text(req.body.message, 2000);
        if (!message) throw fail(400, 'Vui lòng nhập lý do từ chối');
        await withTransaction(async (connection) => {
            await lockRequest(connection, req.params.id, OPEN_STATUSES);
            await connection.query("UPDATE YeuCauThuMua SET TrangThai = 'tuchoi', LoiNhanCuaHang = ?, MaNV = COALESCE(MaNV, ?) WHERE MaYC = ?", [message, await staffId(req, connection), req.params.id]);
        });
        res.json({ success: true, message: 'Đã từ chối yêu cầu' });
    } catch (error) { next(error); }
});

// Chi trả tiền bán đứt bằng tiền mặt/chuyển khoản (ví tín dụng đã được cộng tự động).
router.put('/:id/paid', ...staff, async (req, res, next) => {
    try {
        const [result] = await pool.query(
            "UPDATE YeuCauThuMua SET DaChiTra = TRUE, NgayChiTra = NOW() WHERE MaYC = ? AND TrangThai = 'hoanthanh' AND HinhThuc = 'bandut' AND DaChiTra = FALSE",
            [req.params.id]
        );
        if (!result.affectedRows) throw fail(409, 'Yêu cầu không ở trạng thái chờ chi trả');
        res.json({ success: true, message: 'Đã ghi nhận chi trả' });
    } catch (error) { next(error); }
});

// ---------- Khách xem chi tiết, hủy, phản hồi báo giá ----------
router.get('/:id', authenticate, async (req, res, next) => {
    try {
        const request = await getRequest(req.params.id);
        const isStaff = ['admin', 'nhanvien'].includes(req.user.role);
        if (!request || (!isStaff && request.customer_id !== req.user.customerId)) throw fail(404, 'Không tìm thấy yêu cầu thu mua');
        // Kết quả thẩm định của nhân viên là bản nháp cho tới khi gửi báo giá: khách chỉ thấy ước tính của AI.
        if (!isStaff && ['moi', 'chonhandia', 'dangthamdinh'].includes(request.status)) {
            request.items = request.items.map((item) => ({ ...item, media_grade: null, sleeve_grade: null, buy_price: null, list_price: null, result: 'cho', staff_note: null }));
            request.offer_buy_total = null;
            request.offer_list_total = null;
        }
        res.json({ success: true, data: request });
    } catch (error) { next(error); }
});

router.post('/:id/cancel', authenticate, async (req, res, next) => {
    try {
        const customerId = requireCustomer(req);
        await withTransaction(async (connection) => {
            const row = await lockRequest(connection, req.params.id, ['moi', 'chonhandia']);
            if (row.MaKH !== customerId) throw fail(404, 'Không tìm thấy yêu cầu thu mua');
            await connection.query("UPDATE YeuCauThuMua SET TrangThai = 'dahuy' WHERE MaYC = ?", [req.params.id]);
        });
        res.json({ success: true, message: 'Đã hủy yêu cầu' });
    } catch (error) { next(error); }
});

async function categoryIds(connection) {
    const [rows] = await connection.query('SELECT MaDM, TenDM FROM DanhMuc');
    const find = (word) => (rows.find((row) => row.TenDM.toLowerCase().includes(word)) || {}).MaDM || null;
    return { vinyl: find('vinyl'), cassette: find('cassette'), names: Object.fromEntries(rows.map((row) => [row.MaDM, row.TenDM])) };
}

// Đưa đĩa đã thu mua/ký gửi lên kệ: mỗi bản đĩa cũ là một sản phẩm riêng, tồn kho 1.
async function listUsedProduct(connection, item, { consigned, categories }) {
    const [[reference]] = item.MaSPThamChieu
        ? await connection.query('SELECT TheLoaiNhac, DinhDang, QuyCach, Tracklist, NamPhatHanh, TuKhoaAI FROM SanPham WHERE MaSP = ?', [item.MaSPThamChieu])
        : [[null]];
    const [[photo]] = await connection.query('SELECT MaAnh, KhoaTruyCap FROM AnhThuMua WHERE MaCT = ? ORDER BY ThuTu, MaAnh LIMIT 1', [item.MaCT]);
    const condition = `Đĩa ${item.TinhTrangDia} · Bìa ${item.TinhTrangBia}`;
    const description = [
        `Đĩa cũ đã được Vọc Records thẩm định theo thang Goldmine: đĩa ${item.TinhTrangDia} (${gradeLabel(item.TinhTrangDia)}), bìa ${item.TinhTrangBia} (${gradeLabel(item.TinhTrangBia)}).`,
        item.GhiChuThamDinh,
        consigned ? 'Hàng ký gửi: cửa hàng bán hộ chủ đĩa, đã kiểm tra trước khi bán.' : null,
    ].filter(Boolean).join('\n');
    const categoryId = categories[item.DinhDang];
    const [created] = await connection.query(
        `INSERT INTO SanPham (TenSP, NgheSi, GiaBan, SoLuongTon, MoTa, HinhAnh, MaDM, TheLoai, TheLoaiNhac, DinhDang, TinhTrangDia,
                              QuyCach, Tracklist, NamPhatHanh, TinhTrang, LoaiHang, TuKhoaAI)
         VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'conhang', 'cu', ?)`,
        [
            item.TenDia, item.NgheSi, item.GiaNiemYet, description, photo ? photoUrl(photo) : null, categoryId, categories.names[categoryId] || null,
            reference ? reference.TheLoaiNhac : null, reference ? reference.DinhDang : (item.DinhDang === 'cassette' ? 'Cassette' : 'LP'),
            condition, reference ? reference.QuyCach : null, reference ? reference.Tracklist : null,
            item.NamPhatHanh || (reference ? reference.NamPhatHanh : null), reference ? reference.TuKhoaAI : null,
        ]
    );
    await connection.query('UPDATE ChiTietThuMua SET MaSP = ? WHERE MaCT = ?', [created.insertId, item.MaCT]);
    return created.insertId;
}

// Khách phản hồi báo giá: đồng ý (bán đứt hoặc ký gửi) -> hoanthanh, không đồng ý -> khachtuchoi.
router.post('/:id/respond', authenticate, async (req, res, next) => {
    try {
        const customerId = requireCustomer(req);
        const accept = req.body.accept === true;
        const mode = req.body.mode === 'kygui' ? 'kygui' : 'bandut';
        const payoutMethod = PAYOUT_METHODS.includes(req.body.payout_method) ? req.body.payout_method : null;
        const payoutInfo = text(req.body.payout_info, 255);
        if (accept && !payoutMethod) throw fail(400, 'Vui lòng chọn cách nhận tiền');
        if (accept && payoutMethod === 'chuyenkhoan' && !payoutInfo) throw fail(400, 'Vui lòng nhập số tài khoản nhận tiền');

        const summary = await withTransaction(async (connection) => {
            const row = await lockRequest(connection, req.params.id, ['chokhachxacnhan']);
            if (row.MaKH !== customerId) throw fail(404, 'Không tìm thấy yêu cầu thu mua');
            if (!accept) {
                await connection.query("UPDATE YeuCauThuMua SET TrangThai = 'khachtuchoi' WHERE MaYC = ?", [req.params.id]);
                return { accepted: false };
            }
            const [items] = await connection.query("SELECT * FROM ChiTietThuMua WHERE MaYC = ? AND KetQua = 'nhan' FOR UPDATE", [req.params.id]);
            const categories = await categoryIds(connection);
            const expiresAt = new Date(Date.now() + POLICY.consignmentDays * 86400000);
            for (const item of items) {
                const productId = await listUsedProduct(connection, item, { consigned: mode === 'kygui', categories });
                if (mode === 'kygui') {
                    await connection.query(
                        'INSERT INTO HopDongKyGui (MaCT, MaKH, MaSP, GiaBan, TyLeHoaHong, NhanTien, ThongTinNhanTien, NgayHetHan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                        [item.MaCT, customerId, productId, item.GiaNiemYet, POLICY.commissionRate, payoutMethod, payoutInfo || null, expiresAt]
                    );
                }
            }
            let payoutTotal = null;
            let paid = false;
            if (mode === 'bandut') {
                payoutTotal = buyoutPayout(items.reduce((sum, item) => sum + Number(item.GiaThuMua), 0), payoutMethod);
                if (payoutMethod === 'tindung') {
                    await Wallet.addEntry(connection, { customerId, amount: payoutTotal, type: 'thumua', requestId: Number(req.params.id), note: `Bán ${items.length} đĩa cũ cho cửa hàng (yêu cầu #${req.params.id})` });
                    paid = true;
                }
            }
            await connection.query(
                `UPDATE YeuCauThuMua SET TrangThai = 'hoanthanh', HinhThuc = ?, NhanTien = ?, ThongTinNhanTien = ?, TongTienThuMua = ?,
                        DaChiTra = ?, NgayChiTra = ${paid ? 'NOW()' : 'NULL'} WHERE MaYC = ?`,
                [mode, payoutMethod, payoutInfo || null, payoutTotal, paid, req.params.id]
            );
            return { accepted: true, mode, items: items.length, payoutTotal, paid };
        });
        const message = !summary.accepted
            ? 'Bạn đã từ chối báo giá. Vọc Records sẽ liên hệ để gửi lại đĩa.'
            : summary.mode === 'kygui'
                ? `Đã ký gửi ${summary.items} đĩa. Đĩa đã lên kệ, bán được bạn sẽ nhận tiền theo hợp đồng.`
                : summary.paid
                    ? `Đã cộng ${summary.payoutTotal.toLocaleString('vi-VN')}đ vào ví tín dụng của bạn.`
                    : 'Đã chốt bán đĩa. Cửa hàng sẽ chi trả theo cách bạn chọn.';
        res.json({ success: true, message, data: summary });
    } catch (error) { next(error); }
});

module.exports = router;
