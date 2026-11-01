// Lỗi có mã HTTP do code của mình tạo ra, message viết cho người dùng nên được phép hiển thị (expose),
// kể cả lỗi 5xx (vd: "Không hủy được vận đơn GHN"). Lỗi lạ (SQL, thư viện) không có expose nên
// error.middleware.js chỉ trả câu chung chung, không lộ chi tiết bên trong.
const fail = (status, message) => Object.assign(new Error(message), { status, expose: true });

module.exports = { fail };
