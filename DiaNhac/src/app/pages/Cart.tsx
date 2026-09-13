import { useState } from 'react';
import { Link } from 'react-router';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { API_BASE } from '../config/api';
import '../../styles/pages/cart.css';


export function Cart() {
  const { items, removeFromCart, updateQuantity, getCartTotal, clearCart, appliedDiscount, setAppliedDiscount } = useCart();
  const [couponInput, setCouponInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleApplyCoupon = () => {
    if (!couponInput) return;
    setLoading(true);
    fetch(`${API_BASE}/discounts/check`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,  'Content-Type': 'application/json'  },
        body: JSON.stringify({ code: couponInput, cartTotal: getCartTotal() })
    })
    .then(res => res.json())
    .then(data => {
        setLoading(false);
        if (data.success) {
            setAppliedDiscount({ code: data.data.code, amount: data.data.discountAmount });
            alert(data.message);
        } else {
            alert(data.message);
        }
    })
    .catch(() => {
        setLoading(false);
        alert('Có lỗi xảy ra khi áp dụng mã!');
    });
  };

  if (items.length === 0) {
    return (
      <div className="page page--gray page-centered">
        <div className="empty-state" style={{ maxWidth: '32rem', width: '90%', padding: '3rem' }}>
          <ShoppingBag className="empty-state-icon" />
          <h2 className="empty-state-title" style={{ fontFamily: 'var(--font-heading)' }}>Giỏ hàng trống</h2>
          <p className="empty-state-desc">
            Bạn chưa thêm Sản phẩm nào vào giỏ hàng.
          </p>
          <Link to="/shop" className="neo-btn neo-btn--primary">
            Quay Về Cửa Hàng
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page page--gray">
      <div className="container" style={{ padding: '2rem 1rem' }}>
        <div className="page-header flex-between">
          <h1 className="page-title" style={{ fontFamily: 'var(--font-heading)' }}>GIỎ HÀNG</h1>
          <button onClick={clearCart} className="neo-btn neo-btn--danger neo-btn--sm">
            Xóa Tất Cả
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
          {/* Cart Items */}
          <div style={{ gridColumn: 'span 1' }}>
            <div className="cart-items-list">
              {items.map((item) => (
                <div key={item.id} className="cart-item">
                  {/* Image */}
                  <div className="cart-item-image">
                    <img src={item.image} alt={item.title} />
                  </div>

                  {/* Info */}
                  <div className="cart-item-info">
                    <Link to={`/product/${item.id}`} className="cart-item-title line-clamp-2" style={{ textDecoration: 'none' }}>
                      {item.title}
                    </Link>
                    <p className="cart-item-artist">{item.artist}</p>

                    <div className="cart-item-controls">
                      {/* Quantity */}
                      <div className="qty-selector">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="qty-btn">
                          <Minus style={{ width: 16, height: 16, pointerEvents: 'none' }} />
                        </button>
                        <span className="qty-value">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          className="qty-btn"
                        >
                          <Plus style={{ width: 16, height: 16, pointerEvents: 'none' }} />
                        </button>
                      </div>

                      <button onClick={() => removeFromCart(item.id)} className="cart-item-remove">
                        <Trash2 style={{ width: 14, height: 14 }} /> XÓA
                      </button>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="cart-item-price">
                    <p className="cart-item-price-each">{item.price.toLocaleString('vi-VN')}đ/sp</p>
                    <p className="cart-item-price-total">{(item.price * item.quantity).toLocaleString('vi-VN')}đ</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div>
            <div className="cart-summary sticky-summary">
              <h2 className="cart-summary-title" style={{ fontFamily: 'var(--font-heading)' }}>CỘNG GIỎ HÀNG</h2>

              <div className="cart-summary-row" style={{ borderBottom: '2px solid #000', paddingBottom: '1rem' }}>
                <span style={{ color: 'var(--gray-600)' }}>Tạm tính</span>
                <span>{getCartTotal().toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="cart-summary-row" style={{ borderBottom: '2px solid #000', paddingBottom: '1rem' }}>
                <span style={{ color: 'var(--gray-600)' }}>Phí vận chuyển</span>
                <span>MIỄN PHÍ</span>
              </div>
              {appliedDiscount && (
                <div className="cart-summary-row" style={{ borderBottom: '2px dashed #000', paddingBottom: '1rem', color: 'var(--color-danger)' }}>
                  <span>GIẢM GIÁ ({appliedDiscount.code})</span>
                  <span>-{appliedDiscount.amount.toLocaleString('vi-VN')}đ</span>
                </div>
              )}
              <div className="cart-summary-total">
                <span className="cart-summary-total-label">Tổng</span>
                <span className="cart-summary-total-value">
                  {(getCartTotal() - (appliedDiscount?.amount || 0)).toLocaleString('vi-VN')}đ
                </span>
              </div>

              {/* Coupon */}
              <div style={{ marginTop: '1.5rem' }}>
                <label className="neo-label" style={{ fontSize: '0.75rem' }}>Mã Giảm Giá</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="NHẬP MÃ TẠI ĐÂY"
                    className="neo-input"
                    style={{ flex: 1, fontSize: '0.875rem' }}
                  />
                  <button onClick={handleApplyCoupon} disabled={loading} className="neo-btn neo-btn--primary neo-btn--sm">
                    {loading ? '...' : 'ÁP DỤNG'}
                  </button>
                </div>
              </div>

              <div className="cart-actions">
                <Link to="/checkout" className="neo-btn neo-btn--primary neo-btn--full" style={{ fontSize: '1.125rem' }}>
                  Tiến Hành Thanh Toán
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}