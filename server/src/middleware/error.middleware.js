// Lỗi 4xx và lỗi tạo bằng fail() (expose) trả nguyên message; lỗi khác chỉ trả câu chung chung
// để không lộ câu SQL, tên cột... cho người dùng.
const errorMiddleware = (err, req, res, next) => {
    const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
    if (status >= 500) console.error(err);
    const visible = status < 500 || err.expose === true;
    res.status(status).json({
        success: false,
        message: visible ? (err.message || 'Request không hợp lệ') : 'Đã xảy ra lỗi máy chủ. Vui lòng thử lại sau.'
    });
};

module.exports = errorMiddleware;
