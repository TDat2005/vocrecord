import { useEffect } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { MAX_ORDER_QUANTITY } from '../utils/catalog';

// Các thành phần giao diện nhỏ dùng lại ở nhiều trang.

export function Badge({ tone = 'neutral', children }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

// Badge từ kết quả của getOrderStatus / getPaymentStatus... trong utils/status.js
export function StatusBadge({ status }) {
  return <Badge tone={status.tone}>{status.label}</Badge>;
}

export function Modal({ title, onClose, children, footer, wide = false }) {
  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <div className={`modal ${wide ? 'modal--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal__header">
          <h2 className="modal__title">{title}</h2>
          {onClose && (
            <button type="button" className="icon-button icon-button--sm" onClick={onClose} aria-label="Đóng">
              <X size={18} />
            </button>
          )}
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={44} strokeWidth={1.5} className="empty-state__icon" />}
      {title && <p className="empty-state__title">{title}</p>}
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function QuantitySelector({ value, max: stock, onChange, size }) {
  const max = Math.min(stock, MAX_ORDER_QUANTITY);
  const handleInput = (event) => {
    const next = Number.parseInt(event.target.value, 10);
    if (Number.isInteger(next) && next >= 1) onChange(Math.min(next, max));
  };

  return (
    <div className={`qty ${size === 'sm' ? 'qty--sm' : ''}`}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Giảm số lượng">
        <Minus size={16} />
      </button>
      <input type="number" value={value} min={1} max={max} onChange={handleInput} aria-label="Số lượng" />
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Tăng số lượng">
        <Plus size={16} />
      </button>
    </div>
  );
}

// Phân trang cho bảng ở trang quản trị: page bắt đầu từ 1, total là tổng số dòng server trả về.
export function Pagination({ page, total, limit, onChange }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Phân trang">
      <button type="button" className="btn btn--secondary btn--sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>Trước</button>
      <span className="text-sm text-muted">Trang {page}/{pages} · {total} mục</span>
      <button type="button" className="btn btn--secondary btn--sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>Sau</button>
    </nav>
  );
}

// Nút "Xem thêm" cho danh sách sản phẩm phía khách.
export function LoadMore({ shown, total, loading, onClick }) {
  if (shown >= total) return null;
  return (
    <div className="load-more">
      <p className="text-sm text-muted">Đang hiển thị {shown}/{total} sản phẩm</p>
      <button type="button" className="btn btn--secondary" onClick={onClick} disabled={loading}>
        {loading ? 'Đang tải...' : 'Xem thêm'}
      </button>
    </div>
  );
}
