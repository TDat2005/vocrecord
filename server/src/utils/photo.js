const crypto = require('crypto');
const { fail } = require('./http');

// Ảnh khách tải lên (thẩm định đĩa cũ, bằng chứng trả hàng): gửi dạng data URL base64, lưu trong CSDL.
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

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

// Khóa ngẫu nhiên trong đường dẫn ảnh thay cho đăng nhập (thẻ <img> không gửi kèm token).
const newPhotoKey = () => crypto.randomBytes(16).toString('hex');

// Trả ảnh đã lưu: express handler cho GET /photos/:id/:key, đọc từ bảng `table` (cột MaAnh, KhoaTruyCap, KieuAnh, DuLieu).
const servePhoto = (pool, table) => async (req, res, next) => {
    try {
        const [rows] = await pool.query(`SELECT KieuAnh, DuLieu FROM ${table} WHERE MaAnh = ? AND KhoaTruyCap = ?`, [req.params.id, req.params.key]);
        if (!rows[0]) return res.status(404).end();
        res.set({ 'Content-Type': rows[0].KieuAnh, 'Cache-Control': 'public, max-age=604800, immutable' });
        res.send(rows[0].DuLieu);
    } catch (error) { next(error); }
};

module.exports = { MAX_PHOTO_BYTES, decodePhoto, newPhotoKey, servePhoto };
