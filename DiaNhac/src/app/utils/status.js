// Nhãn & màu cho các trạng thái lưu trong CSDL (enum tiếng Việt không dấu).

export const ORDER_STEPS = [
  { id: 'choxacnhan', label: 'Chờ xác nhận' },
  { id: 'daxacnhan', label: 'Đã xác nhận' },
  { id: 'dangchuanbihang', label: 'Đang chuẩn bị' },
  { id: 'danggiaohang', label: 'Đang giao' },
  { id: 'hoanthanh', label: 'Hoàn thành' },
];

const ORDER_STATUS = {
  choxacnhan: { label: 'Chờ xác nhận', tone: 'attention' },
  daxacnhan: { label: 'Đã xác nhận', tone: 'info' },
  dangchuanbihang: { label: 'Đang chuẩn bị', tone: 'info' },
  danggiaohang: { label: 'Đang giao', tone: 'info' },
  hoanthanh: { label: 'Hoàn thành', tone: 'success' },
  dahuy: { label: 'Đã hủy', tone: 'critical' },
};

const PAYMENT_STATUS = {
  chuathanhtoan: { label: 'Chưa thanh toán', tone: 'attention' },
  dangxuly: { label: 'Đang xử lý', tone: 'info' },
  dathanhtoan: { label: 'Đã thanh toán', tone: 'success' },
  thatbai: { label: 'Thanh toán thất bại', tone: 'critical' },
  dahuy: { label: 'Đã hủy', tone: 'critical' },
};

const REFUND_STATUS = {
  choxuly: { label: 'Chờ hoàn tiền', tone: 'warning' },
  dahoantien: { label: 'Đã hoàn tiền', tone: 'success' },
};

const RETURN_STATUS = {
  moi: { label: 'Mới', tone: 'attention' },
  dangxuly: { label: 'Đang xử lý', tone: 'info' },
  chapnhan: { label: 'Chấp nhận', tone: 'success' },
  tuchoi: { label: 'Từ chối', tone: 'critical' },
  danghoan: { label: 'Đang hoàn', tone: 'warning' },
  hoantat: { label: 'Hoàn tất', tone: 'success' },
};

const COMMENT_STATUS = {
  choxuly: { label: 'Chờ duyệt', tone: 'attention' },
  daduyet: { label: 'Đã duyệt', tone: 'success' },
  an: { label: 'Đã ẩn', tone: 'neutral' },
};

export const RETURN_REASONS = {
  hang_loi: 'Hàng bị lỗi',
  sai_san_pham: 'Sai sản phẩm',
  thieu_hang: 'Thiếu hàng',
  hu_hong_van_chuyen: 'Hư hỏng do vận chuyển',
  khac: 'Lý do khác',
};

export const PRODUCT_STATUS_OPTIONS = [
  { value: 'conhang', label: 'Còn hàng' },
  { value: 'saphethang', label: 'Sắp hết hàng' },
  { value: 'hethang', label: 'Hết hàng' },
  { value: 'preorder', label: 'Pre-order' },
  { value: 'ngungkinhdoanh', label: 'Ngừng kinh doanh' },
];

const lookup = (map) => (value) => map[value] || { label: value || 'Không rõ', tone: 'neutral' };

export const getOrderStatus = lookup(ORDER_STATUS);
export const getPaymentStatus = lookup(PAYMENT_STATUS);
export const getRefundStatus = lookup(REFUND_STATUS);
export const getReturnStatus = lookup(RETURN_STATUS);
export const getCommentStatus = lookup(COMMENT_STATUS);

export const ORDER_STATUS_OPTIONS = Object.entries(ORDER_STATUS).map(([value, { label }]) => ({ value, label }));
export const RETURN_STATUS_OPTIONS = Object.entries(RETURN_STATUS).map(([value, { label }]) => ({ value, label }));

// Khách chỉ tự hủy được khi đơn chưa giao cho đơn vị vận chuyển.
export const CANCELLABLE_STATUSES = ['choxacnhan', 'daxacnhan', 'dangchuanbihang'];
