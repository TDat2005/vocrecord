const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const GHNService = require('../services/ghn.service');
const Wallet = require('../services/tradein/wallet');
const { withTransaction } = require('../utils/db');
const { fail } = require('../utils/http');
const { decodePhoto, newPhotoKey, servePhoto } = require('../utils/photo');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const editor = [authenticate, requireRole('admin', 'nhanvien')];
const RETURN_REASONS = ['hang_loi', 'sai_san_pham', 'thieu_hang', 'hu_hong_van_chuyen', 'khac'];
const RETURN_STATUSES = ['moi', 'dangxuly', 'chapnhan', 'tuchoi', 'danghoan', 'hoantat'];
const OPEN_STATUSES = ['moi', 'dangxuly', 'chapnhan', 'danghoan'];
// Các bước kế tiếp hợp lệ (theo biểu đồ trạng thái yêu cầu trả hàng): moi -> dangxuly -> chapnhan/tuchoi -> danghoan -> hoantat.
const RETURN_NEXT = {
    moi: ['dangxuly'],
    dangxuly: ['chapnhan', 'tuchoi'],
    chapnhan: ['danghoan'],
    danghoan: ['hoantat'],
    tuchoi: [],
    hoantat: [],
};
// Giữ nguyên trạng thái (chỉ sửa ghi chú, số tiền hoàn) luôn được; hoàn tất là bước cuối nên không sửa được nữa.
const canMoveReturn = (from, to) => (from === to ? from !== 'hoantat' : (RETURN_NEXT[from] || []).includes(to));
const RETURN_LABELS = { moi: 'Mới', dangxuly: 'Đang xử lý', chapnhan: 'Chấp nhận', tuchoi: 'Từ chối', danghoan: 'Đang hoàn', hoantat: 'Hoàn tất' };
const returnMoveError = (from, to) => fail(409, from === 'hoantat'
    ? 'Yêu cầu đã hoàn tất, không thể đổi trạng thái'
    : `Không thể chuyển yêu cầu từ "${RETURN_LABELS[from]}" sang "${RETURN_LABELS[to]}"`);
// GHN ghi nhận giao lỗi/hoàn hàng: cho phép khiếu nại dù đơn chưa "hoàn thành".
const RETURNABLE_GHN_STATUSES = ['delivered', 'damage', 'lost', 'returned', 'return', 'return_fail'];
const GHN_RETURNABLE_TO_SENDER = ['delivery_fail', 'storing', 'waiting_to_return', 'return'];
const returnWindowDays = () => Number(process.env.RETURN_WINDOW_DAYS || 7);
const MAX_RETURN_PHOTOS = 4;
const photoUrl = (photo) => `/api/returns/photos/${photo.MaAnh}/${photo.KhoaTruyCap}`;

// Ảnh bằng chứng của yêu cầu. Chưa chạy migration 14 (chưa có bảng AnhTraHang) thì coi như không có ảnh.
async function loadPhotos(returnId) {
    try {
        const [rows] = await pool.query('SELECT MaAnh, KhoaTruyCap FROM AnhTraHang WHERE MaYCT = ? ORDER BY ThuTu, MaAnh', [returnId]);
        return rows.map(photoUrl);
    } catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE') return [];
        throw error;
    }
}

const returnSelect = `
    SELECT yc.MaYCT as id, yc.MaDH as order_id, yc.MaKH as customer_id, yc.LyDo as reason,
           yc.MoTa as description, yc.BangChung as evidence, yc.TrangThai as status,
           yc.SoTienHoan as refund_amount, yc.TrangThaiHoanTien as refund_status,
           yc.GhiChuAdmin as admin_note, yc.DaNhapKho as restocked,
           yc.NgayTao as created_at, yc.NgayCapNhat as updated_at,
           dh.TongTien as order_total, dh.SoTienTinDung as order_credit, dh.TrangThai as order_status,
           dh.MaDonGHN as ghn_order_code, dh.GHNTrangThai as ghn_status,
           kh.HoTen as customer_name, kh.Email as customer_email, kh.SoDienThoai as customer_phone
    FROM YeuCauTraHang yc
    JOIN DonHang dh ON dh.MaDH = yc.MaDH
    JOIN KhachHang kh ON kh.MaKH = yc.MaKH`;

const getReturn = async (id) => {
    const [rows] = await pool.query(`${returnSelect} WHERE yc.MaYCT=?`, [id]);
    return rows[0];
};

/**
 * Các món còn trả được của một đơn: số lượng mua trừ số đã nằm trong các yêu cầu trả hàng khác chưa bị từ chối.
 * Tiền hoàn mỗi món đã trừ phần mã giảm giá chia theo tỷ lệ giá trị (trước đây hoàn đủ giá gốc dù khách mua giá đã giảm).
 */
async function returnableItems(connection, order) {
    const [items] = await connection.query(
        `SELECT ct.MaCTDH, ct.MaSP, ct.SoLuong, ct.DonGia, sp.TenSP, sp.HinhAnh,
                COALESCE((SELECT SUM(d.SoLuong) FROM YeuCauTraHangChiTiet d JOIN YeuCauTraHang y ON y.MaYCT = d.MaYCT
                          WHERE d.MaCTDH = ct.MaCTDH AND y.TrangThai <> 'tuchoi'), 0) AS DaTra
         FROM ChiTietDonHang ct JOIN SanPham sp ON sp.MaSP = ct.MaSP WHERE ct.MaDH = ?`,
        [order.MaDH]
    );
    const subtotal = items.reduce((sum, item) => sum + Number(item.DonGia) * Number(item.SoLuong), 0);
    const keepRatio = subtotal > 0 ? Math.max(0, 1 - Number(order.SoTienGiam || 0) / subtotal) : 1;
    return items.map((item) => ({
        detail_id: item.MaCTDH,
        product_id: item.MaSP,
        title: item.TenSP,
        image: item.HinhAnh,
        quantity: Number(item.SoLuong),
        returned: Number(item.DaTra),
        returnable: Math.max(Number(item.SoLuong) - Number(item.DaTra), 0),
        unit_refund: Math.round(Number(item.DonGia) * keepRatio),
    }));
}

// Đơn có được gửi yêu cầu trả hàng không: đã giao (hoặc GHN báo lỗi/hoàn), còn trong hạn đổi trả.
function returnBlocker(order) {
    if (order.TrangThai !== 'hoanthanh' && !RETURNABLE_GHN_STATUSES.includes(String(order.GHNTrangThai || '').toLowerCase())) {
        return 'Chỉ có thể yêu cầu trả hàng sau khi đơn đã giao hoặc được GHN ghi nhận lỗi';
    }
    // Hạn đổi trả tính từ ngày giao thành công (đơn giao chậm không bị mất quyền đổi trả); đơn cũ chưa có thì lấy ngày đặt.
    const ageDays = (Date.now() - new Date(order.NgayHoanThanh || order.NgayDat).getTime()) / 86400000;
    if (ageDays > returnWindowDays()) return `Đã quá thời hạn đổi trả ${returnWindowDays()} ngày`;
    return null;
}

const findCustomerOrder = async (connection, orderId, customerId, { lock = false } = {}) => {
    const [[order]] = await connection.query(
        `SELECT * FROM DonHang WHERE MaDH = ? AND MaKH = ?${lock ? ' FOR UPDATE' : ''}`,
        [orderId, customerId]
    );
    if (!order) throw fail(404, 'Không tìm thấy đơn hàng của bạn');
    return order;
};

const requireCustomer = (req) => {
    if (!req.user.customerId) throw fail(403, 'Tài khoản không phải khách hàng');
    return req.user.customerId;
};

// Ảnh bằng chứng (đường dẫn có khóa ngẫu nhiên, xem được không cần đăng nhập giống ảnh thu mua).
router.get('/photos/:id/:key', servePhoto(pool, 'AnhTraHang'));

// GET /order/:orderId — các món của đơn còn trả được, để khách chọn món và số lượng.
router.get('/order/:orderId', authenticate, async (req, res, next) => {
    try {
        const order = await findCustomerOrder(pool, req.params.orderId, requireCustomer(req));
        const [open] = await pool.query('SELECT MaYCT FROM YeuCauTraHang WHERE MaDH = ? AND TrangThai IN (?)', [order.MaDH, OPEN_STATUSES]);
        res.json({
            success: true,
            data: {
                blocker: open.length ? 'Đơn hàng đang có yêu cầu trả hàng được xử lý' : returnBlocker(order),
                window_days: returnWindowDays(),
                items: await returnableItems(pool, order),
            },
        });
    } catch (error) { next(error); }
});

router.post('/', authenticate, async (req, res, next) => {
    try {
        const customerId = requireCustomer(req);
        const { order_id: orderId, reason, items = [] } = req.body;
        const description = String(req.body.description || '').trim();
        const evidence = String(req.body.evidence || '').trim();
        if (!orderId || !RETURN_REASONS.includes(reason) || !description) throw fail(400, 'Thiếu thông tin yêu cầu trả hàng');
        if (description.length > 2000) throw fail(400, 'Mô tả tối đa 2000 ký tự');
        if (evidence.length > 1000) throw fail(400, 'Link bằng chứng tối đa 1000 ký tự');
        const photosInput = Array.isArray(req.body.photos) ? req.body.photos : [];
        if (photosInput.length > MAX_RETURN_PHOTOS) throw fail(400, `Tối đa ${MAX_RETURN_PHOTOS} ảnh bằng chứng`);
        const photos = photosInput.map(decodePhoto);

        const created = await withTransaction(async (connection) => {
            // Khóa đơn: hai lần bấm gửi cùng lúc không tạo ra hai yêu cầu cho cùng món hàng.
            const order = await findCustomerOrder(connection, orderId, customerId, { lock: true });
            const blocker = returnBlocker(order);
            if (blocker) throw fail(400, blocker);
            const [open] = await connection.query('SELECT MaYCT FROM YeuCauTraHang WHERE MaDH = ? AND TrangThai IN (?)', [order.MaDH, OPEN_STATUSES]);
            if (open.length) throw fail(409, 'Đơn hàng đang có yêu cầu trả hàng được xử lý');

            const available = await returnableItems(connection, order);
            // Không gửi danh sách món: trả tất cả món còn trả được.
            const requested = Array.isArray(items) && items.length
                ? items
                : available.filter((item) => item.returnable > 0).map((item) => ({ detail_id: item.detail_id, quantity: item.returnable }));
            // Gộp các dòng trùng món (trước đây gửi một món 2 lần là được hoàn tiền 2 lần).
            const wanted = new Map();
            for (const entry of requested) {
                const found = available.find((item) => String(item.detail_id) === String(entry.detail_id) || String(item.product_id) === String(entry.product_id));
                const quantity = Number(entry.quantity);
                if (!found || !Number.isInteger(quantity) || quantity < 1) throw fail(400, 'Sản phẩm hoặc số lượng trả không hợp lệ');
                wanted.set(found, (wanted.get(found) || 0) + quantity);
            }
            if (wanted.size === 0) throw fail(400, 'Đơn hàng không còn sản phẩm nào để trả');

            let refundAmount = 0;
            for (const [item, quantity] of wanted) {
                if (quantity > item.returnable) {
                    throw fail(400, `"${item.title}" chỉ còn trả được ${item.returnable} sản phẩm${item.returned ? ` (đã yêu cầu trả ${item.returned})` : ''}`);
                }
                refundAmount += item.unit_refund * quantity;
            }

            const [result] = await connection.query(
                "INSERT INTO YeuCauTraHang (MaDH, MaKH, LyDo, MoTa, BangChung, TrangThai, SoTienHoan, TrangThaiHoanTien) VALUES (?, ?, ?, ?, ?, 'moi', ?, 'choxuly')",
                [order.MaDH, customerId, reason, description, evidence || null, refundAmount]
            );
            for (const [item, quantity] of wanted) {
                await connection.query('INSERT INTO YeuCauTraHangChiTiet (MaYCT, MaCTDH, MaSP, SoLuong) VALUES (?, ?, ?, ?)', [result.insertId, item.detail_id, item.product_id, quantity]);
            }
            for (const [index, photo] of photos.entries()) {
                await connection.query(
                    'INSERT INTO AnhTraHang (MaYCT, KhoaTruyCap, KieuAnh, DuLieu, ThuTu) VALUES (?, ?, ?, ?, ?)',
                    [result.insertId, newPhotoKey(), photo.mime, photo.buffer, index]
                );
            }
            return { id: result.insertId, refundAmount };
        });
        res.status(201).json({ success: true, message: 'Đã gửi yêu cầu trả hàng', id: created.id, refund_amount: created.refundAmount });
    } catch (error) {
        next(error);
    }
});

router.get('/mine', authenticate, async (req, res, next) => {
    try {
        const [rows] = await pool.query(`${returnSelect} WHERE yc.MaKH=? ORDER BY yc.NgayTao DESC`, [requireCustomer(req)]);
        res.json({ success: true, data: rows });
    } catch (error) { next(error); }
});

router.get('/manage', ...editor, async (req, res, next) => {
    try {
        const status = req.query.status && RETURN_STATUSES.includes(req.query.status) ? req.query.status : null;
        const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 100);
        const where = status ? 'WHERE yc.TrangThai=?' : '';
        const params = status ? [status] : [];
        const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM YeuCauTraHang yc ${where}`, params);
        const [rows] = await pool.query(`${returnSelect} ${where} ORDER BY yc.NgayTao DESC LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
        res.json({ success: true, data: rows, total: Number(total), page, limit });
    } catch (error) { next(error); }
});

router.get('/:id', authenticate, async (req, res, next) => {
    try {
        const item = await getReturn(req.params.id);
        if (!item || (req.user.role === 'khachhang' && Number(item.customer_id) !== Number(req.user.customerId))) throw fail(404, 'Không tìm thấy yêu cầu');
        const [details] = await pool.query(`SELECT ct.MaSP as product_id, ct.SoLuong as quantity, sp.TenSP as product_title, sp.HinhAnh as image
            FROM YeuCauTraHangChiTiet ct JOIN SanPham sp ON sp.MaSP=ct.MaSP WHERE ct.MaYCT=?`, [req.params.id]);
        res.json({ success: true, data: { ...item, items: details, photos: await loadPhotos(req.params.id) } });
    } catch (error) { next(error); }
});

router.put('/:id/status', ...editor, async (req, res, next) => {
    try {
        const status = String(req.body.status || '');
        if (!RETURN_STATUSES.includes(status)) throw fail(400, 'Trạng thái trả hàng không hợp lệ');
        const item = await getReturn(req.params.id);
        if (!item) throw fail(404, 'Không tìm thấy yêu cầu');
        if (!canMoveReturn(item.status, status)) throw returnMoveError(item.status, status);

        const refundAmount = req.body.refund_amount === undefined || req.body.refund_amount === null || req.body.refund_amount === ''
            ? null
            : Number(req.body.refund_amount);
        // Tiền hoàn tối đa là số khách đã trả cho đơn (tiền mặt/chuyển khoản + ví tín dụng).
        const paidTotal = Number(item.order_total) + Number(item.order_credit || 0);
        if (refundAmount !== null && (!Number.isFinite(refundAmount) || refundAmount < 0 || refundAmount > paidTotal)) {
            throw fail(400, `Số tiền hoàn phải từ 0 đến ${paidTotal.toLocaleString('vi-VN')}đ`);
        }
        const adminNote = req.body.admin_note === undefined ? undefined : String(req.body.admin_note || '').trim().slice(0, 2000) || null;

        if (req.body.triggerGhnReturn && item.ghn_order_code && GHN_RETURNABLE_TO_SENDER.includes(String(item.ghn_status || '').toLowerCase())) {
            await GHNService.returnOrder([item.ghn_order_code]);
        }

        const walletRefund = await withTransaction(async (connection) => {
            const [[locked]] = await connection.query('SELECT TrangThai, DaNhapKho FROM YeuCauTraHang WHERE MaYCT=? FOR UPDATE', [req.params.id]);
            if (!locked) throw fail(404, 'Không tìm thấy yêu cầu');
            // Kiểm tra lại trên dòng đã khóa: người khác có thể vừa chuyển bước. Hoàn tất là bước cuối (kho đã cộng, ví đã hoàn).
            if (!canMoveReturn(locked.TrangThai, status)) throw returnMoveError(locked.TrangThai, status);

            let refundStatus = null;
            if (status === 'chapnhan' || status === 'danghoan') refundStatus = 'choxuly';
            if (status === 'hoantat') refundStatus = 'daxuly';
            if (status === 'tuchoi') refundStatus = 'thatbai';
            await connection.query(
                `UPDATE YeuCauTraHang SET TrangThai=?, TrangThaiHoanTien=COALESCE(?, TrangThaiHoanTien), SoTienHoan=COALESCE(?, SoTienHoan),
                        GhiChuAdmin=IF(?, ?, GhiChuAdmin) WHERE MaYCT=?`,
                [status, refundStatus, refundAmount, adminNote !== undefined, adminNote ?? null, req.params.id]
            );

            if (status !== 'hoantat' || locked.DaNhapKho) return 0;
            const [details] = await connection.query('SELECT MaSP, SoLuong FROM YeuCauTraHangChiTiet WHERE MaYCT=?', [req.params.id]);
            for (const detail of details) await connection.query('UPDATE SanPham SET SoLuongTon=SoLuongTon+? WHERE MaSP=?', [detail.SoLuong, detail.MaSP]);
            await connection.query('UPDATE YeuCauTraHang SET DaNhapKho=TRUE WHERE MaYCT=?', [req.params.id]);
            // Đơn có phần trả bằng ví tín dụng: hoàn phần đó vào ví (không quá số tiền hoàn của yêu cầu),
            // phần còn lại cửa hàng hoàn như cũ (chuyển khoản / tiền mặt). Chạy cùng lúc nhập kho nên chỉ một lần.
            const [[order]] = await connection.query('SELECT MaKH, SoTienTinDung FROM DonHang WHERE MaDH=?', [item.order_id]);
            const [[refunded]] = await connection.query("SELECT COALESCE(SUM(SoTien), 0) AS total FROM GiaoDichTinDung WHERE MaDH=? AND Loai='hoantra'", [item.order_id]);
            const refundTotal = refundAmount !== null ? refundAmount : Number(item.refund_amount);
            const toWallet = Math.max(0, Math.min(refundTotal, Number(order.SoTienTinDung || 0) - Number(refunded.total)));
            if (toWallet > 0) {
                await Wallet.addEntry(connection, { customerId: order.MaKH, amount: toWallet, type: 'hoantra', orderId: item.order_id, note: `Hoàn tiền trả hàng YCT-${req.params.id}` });
            }
            return toWallet;
        });

        const total = refundAmount ?? Number(item.refund_amount);
        res.json({
            success: true,
            message: walletRefund > 0
                ? `Đã cập nhật yêu cầu trả hàng. Đã hoàn ${walletRefund.toLocaleString('vi-VN')}đ vào ví tín dụng của khách${walletRefund < total ? ', phần còn lại hoàn theo cách thông thường' : ''}.`
                : 'Đã cập nhật yêu cầu trả hàng',
            wallet_refund: walletRefund,
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
