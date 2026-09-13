const errorMiddleware = (err, req, res, next) => {
    console.error(err);
    const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 500 ? err.status : 500;
    res.status(status).json({
        success: false,
        message: status >= 500 ? 'Đã xảy ra lỗi máy chủ. Vui lòng thử lại sau.' : (err.message || 'Request không hợp lệ')
    });
};

module.exports = errorMiddleware;
