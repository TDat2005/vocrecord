import { useEffect } from 'react';
import { Link } from 'react-router';
import { ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { DiscountForm } from '../components/DiscountForm';
import { SafeImage } from '../components/SafeImage';
import { EmptyState, QuantitySelector } from '../components/ui';
import { SHIPPING_FEE } from '../utils/catalog';
import { formatPrice } from '../utils/format';
import '../../styles/pages/cart.css';

export function Cart() {
  const { items, subtotal, removeFromCart, updateQuantity, clearCart, refreshCart, appliedDiscount } = useCart();

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  if (items.length === 0) {
    return (
      <div className="page">
        <EmptyState
          icon={ShoppingBag}
          title="Giỏ hàng của bạn đang trống"
          action={<Link to="/shop" className="btn btn--primary">Tiếp tục mua sắm</Link>}
        >
          Bạn chưa thêm sản phẩm nào vào giỏ hàng.
        </EmptyState>
      </div>
    );
  }

  const total = Math.max(0, subtotal - (appliedDiscount?.amount || 0) + SHIPPING_FEE);

  return (
    <div className="page">
      <div className="container">
        <div className="page-header page-header--row">
          <h1 className="page-title">Giỏ hàng</h1>
          <Link to="/shop" className="link-underline">Tiếp tục mua sắm</Link>
        </div>

        <div className="cart">
          <div>
            <div className="cart__head">
              <span>Sản phẩm</span>
              <span>Số lượng</span>
              <span className="text-right">Tổng</span>
            </div>
            <ul className="cart__items">
              {items.map((item) => (
                <li key={item.id} className="cart-item">
                  <Link to={`/product/${item.id}`} className="cart-item__image">
                    <SafeImage src={item.image} alt={item.title} />
                  </Link>
                  <div className="cart-item__info">
                    <Link to={`/product/${item.id}`} className="cart-item__title line-clamp-2">{item.title}</Link>
                    {item.artist && <p className="text-muted text-sm">{item.artist}</p>}
                    <p className="text-sm">{formatPrice(item.price)}</p>
                  </div>
                  <div className="cart-item__quantity">
                    <QuantitySelector
                      size="sm"
                      value={item.quantity}
                      max={item.stock}
                      onChange={(quantity) => updateQuantity(item.id, quantity)}
                    />
                    <button type="button" className="icon-button icon-button--sm" onClick={() => removeFromCart(item.id)} aria-label={`Xóa ${item.title}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <p className="cart-item__total">{formatPrice(item.price * item.quantity)}</p>
                </li>
              ))}
            </ul>
            <button type="button" onClick={clearCart} className="btn btn--plain btn--plain-critical text-sm">Xóa tất cả</button>
          </div>

          <aside className="card cart__summary">
            <h2 className="card__title">Tóm tắt đơn hàng</h2>
            <div className="summary-row"><span className="text-muted">Tạm tính</span><span>{formatPrice(subtotal)}</span></div>
            <div className="summary-row"><span className="text-muted">Phí vận chuyển</span><span>{formatPrice(SHIPPING_FEE)}</span></div>
            {appliedDiscount && (
              <div className="summary-row"><span className="text-muted">Giảm giá</span><span>−{formatPrice(appliedDiscount.amount)}</span></div>
            )}
            <DiscountForm />
            <div className="summary-row summary-row--total"><span>Tổng cộng</span><span>{formatPrice(total)}</span></div>
            <Link to="/checkout" className="btn btn--primary btn--lg btn--full">Thanh toán</Link>
            <p className="help-text">Giá, tồn kho và mã giảm giá được kiểm tra lại khi đặt hàng.</p>
          </aside>
        </div>
      </div>
    </div>
  );
}
