import { useEffect } from 'react';
import { Minus, Plus, X } from 'lucide-react';

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

export function QuantitySelector({ value, max, onChange, size }) {
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
