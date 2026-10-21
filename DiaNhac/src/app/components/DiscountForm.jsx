import { useState } from 'react';
import { Tag, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { NETWORK_ERROR } from '../utils/api';
import { formatPrice } from '../utils/format';

// Ô nhập mã giảm giá dùng ở Giỏ hàng và Thanh toán.
export function DiscountForm() {
  const { appliedDiscount, applyDiscount, removeDiscount } = useCart();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleApply = async () => {
    const value = code.trim();
    if (!value) return;
    setLoading(true);
    try {
      const data = await applyDiscount(value);
      if (data.success) {
        setCode('');
        toast.success(data.message || 'Đã áp dụng mã giảm giá');
      } else {
        toast.error(data.message || 'Mã giảm giá không hợp lệ');
      }
    } catch {
      toast.error(NETWORK_ERROR);
    } finally {
      setLoading(false);
    }
  };

  if (appliedDiscount) {
    return (
      <div className="discount-applied">
        <span className="badge badge--info"><Tag size={12} /> {appliedDiscount.code}</span>
        <span className="text-sm text-muted">Giảm {formatPrice(appliedDiscount.amount)}</span>
        <button type="button" className="icon-button icon-button--sm" onClick={removeDiscount} aria-label="Gỡ mã giảm giá">
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="input-group">
      <input
        type="text"
        value={code}
        onChange={(event) => setCode(event.target.value.toUpperCase())}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            handleApply();
          }
        }}
        placeholder="Mã giảm giá"
        aria-label="Mã giảm giá"
        className="input"
      />
      <button type="button" onClick={handleApply} disabled={loading || !code.trim()} className="btn btn--secondary">
        {loading ? 'Đang kiểm tra...' : 'Áp dụng'}
      </button>
    </div>
  );
}
