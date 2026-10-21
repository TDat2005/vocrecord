// MySQL trả cột DECIMAL dưới dạng chuỗi ("350000.00"), nên luôn ép về số trước khi định dạng.
export function formatPrice(value) {
  return `${(Number(value) || 0).toLocaleString('vi-VN')}đ`;
}

export function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('vi-VN');
}

export function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatLongDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Giá trị cho <input type="date"> (YYYY-MM-DD theo giờ địa phương).
export function toDateInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatOrderCode(id) {
  return `ORD-${String(id).padStart(3, '0')}`;
}

export const PHONE_PATTERN = '^0[35789][0-9]{8}$';
export const PHONE_REGEX = new RegExp(PHONE_PATTERN);
