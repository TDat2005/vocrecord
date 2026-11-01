// Hằng số nghiệp vụ đơn hàng dùng chung cho route, dịch vụ và email.

// Phí vận chuyển đồng giá. Giao diện và MCP đọc qua GET /api/config, không tự viết lại con số này.
const SHIPPING_FEE = 30000;

// Luồng trạng thái đơn: chỉ đi tiếp (được bỏ qua bước), không quay lui. dahuy là trạng thái cuối riêng.
const ORDER_FLOW = ['choxacnhan', 'daxacnhan', 'dangchuanbihang', 'danggiaohang', 'hoanthanh'];
const FINAL_STATUSES = ['hoanthanh', 'dahuy'];
// Đơn còn hủy được khi chưa giao cho đơn vị vận chuyển.
const CANCELLABLE_STATUSES = ['choxacnhan', 'daxacnhan', 'dangchuanbihang'];

const ORDER_STATUS_LABELS = {
    choxacnhan: 'Chờ xác nhận',
    daxacnhan: 'Đã xác nhận',
    dangchuanbihang: 'Đang chuẩn bị hàng',
    danggiaohang: 'Đang giao hàng',
    hoanthanh: 'Đã giao thành công',
    dahuy: 'Đã hủy',
};

const PAYOS_TIMEOUT_MINUTES = 10; // đơn PayOS chưa thanh toán quá thời gian này thì tự hủy
const MAX_ORDER_NOTE = 200;

const STAFF_ROLES = ['admin', 'nhanvien'];
const isStaffRole = (role) => STAFF_ROLES.includes(role);

module.exports = {
    SHIPPING_FEE, ORDER_FLOW, FINAL_STATUSES, CANCELLABLE_STATUSES, ORDER_STATUS_LABELS,
    PAYOS_TIMEOUT_MINUTES, MAX_ORDER_NOTE, STAFF_ROLES, isStaffRole,
};
