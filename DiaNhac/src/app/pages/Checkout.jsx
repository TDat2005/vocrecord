import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { QrCode, ShoppingBag, Truck, Wallet } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { AddressFormModal } from '../components/AddressForm';
import { DiscountForm } from '../components/DiscountForm';
import { SafeImage } from '../components/SafeImage';
import { Badge, EmptyState } from '../components/ui';
import { PAYOS_TIMEOUT_SECONDS, PayosPaymentModal } from '../components/PayosPaymentModal';
import { api, NETWORK_ERROR } from '../utils/api';
import { useCurrentUser } from '../utils/auth';
import { SHIPPING_FEE } from '../utils/catalog';
import { formatPrice } from '../utils/format';
import '../../styles/pages/cart.css';

export function Checkout() {
  const navigate = useNavigate();
  const toast = useToast();
  const user = useCurrentUser();
  const { items, subtotal, count, appliedDiscount, clearCart, refreshCart } = useCart();
  const [addresses, setAddresses] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [payment, setPayment] = useState(null);
  const [credit, setCredit] = useState({ balance: 0, use: false });
  const customerId = user?.customer_id;

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  // Số dư ví tín dụng (tiền bán/ký gửi đĩa cũ) để trừ vào đơn.
  useEffect(() => {
    if (!customerId) return;
    api.get('/tradein/wallet').then((data) => {
      if (data.success && data.data.balance > 0) setCredit({ balance: data.data.balance, use: true });
    }).catch(() => {});
  }, [customerId]);

  // Sổ địa chỉ; nếu trống thì lấy địa chỉ trong hồ sơ khách hàng.
  useEffect(() => {
    if (!customerId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get('/account/addresses');
        if (cancelled) return;
        if (data.success && data.data?.length) {
          setAddresses(data.data);
          setSelectedId((data.data.find((addr) => addr.MacDinh === 1) || data.data[0]).MaDC);
          return;
        }
        const profile = await api.get('/account/profile');
        if (!cancelled && profile.success && profile.data?.address) {
          setAddresses([{ MaDC: 'profile', NguoiNhan: profile.data.fullName || '', SoDienThoai: profile.data.phone || '', DiaChi: profile.data.address }]);
          setSelectedId('profile');
        }
      } catch {
        // Khách vẫn có thể thêm địa chỉ mới.
      }
    })();
    return () => { cancelled = true; };
  }, [customerId]);

  if (!user) return <Navigate to="/login" state={{ returnUrl: '/checkout' }} replace />;

  if (!customerId) {
    return (
      <div className="page">
        <EmptyState title="Tài khoản nhân viên không thể đặt hàng" action={<Link to="/" className="btn btn--primary">Về trang chủ</Link>}>
          Vui lòng đăng nhập bằng tài khoản khách hàng để mua sắm.
        </EmptyState>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="page">
        <EmptyState icon={ShoppingBag} title="Giỏ hàng trống" action={<Link to="/shop" className="btn btn--primary">Mua sắm ngay</Link>}>
          Bạn cần thêm sản phẩm vào giỏ hàng trước khi thanh toán.
        </EmptyState>
      </div>
    );
  }

  const discountAmount = appliedDiscount?.amount || 0;
  const totalBeforeCredit = Math.max(0, subtotal - discountAmount + SHIPPING_FEE);
  // Server tự tính lại phần trừ ví theo số dư thật lúc đặt hàng; ở đây chỉ để hiển thị.
  const creditUsed = credit.use ? Math.min(credit.balance, totalBeforeCredit) : 0;
  const total = totalBeforeCredit - creditUsed;
  const paidByCredit = creditUsed > 0 && total === 0;

  const handleAddAddress = (values) => {
    const newAddress = {
      MaDC: `new_${Date.now()}`,
      NguoiNhan: values.recipientName,
      SoDienThoai: values.recipientPhone,
      DiaChi: values.address,
      GHNTinh: values.provinceName,
      GHNPhuong: values.wardName,
      GHNProvinceId: values.provinceId,
      GHNWardId: values.wardId,
      isNew: true,
    };
    setAddresses((current) => [newAddress, ...current]);
    setSelectedId(newAddress.MaDC);
    setShowAddressForm(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const selected = addresses.find((addr) => addr.MaDC === selectedId);
    if (!selected) {
      toast.error('Vui lòng chọn hoặc thêm địa chỉ giao hàng.');
      return;
    }
    if (!selected.NguoiNhan || !selected.SoDienThoai || !selected.DiaChi) {
      toast.error('Thông tin địa chỉ giao hàng chưa đầy đủ.');
      return;
    }

    const isPayos = paymentMethod === 'online' && !paidByCredit;
    setSubmitting(true);
    try {
      const data = await api.post('/orders', {
        items: items.map((item) => ({ id: item.id, qty: item.quantity, price: item.price })),
        total,
        address: selected.DiaChi,
        nguoiNhan: selected.NguoiNhan,
        sdtNhan: selected.SoDienThoai,
        ghiChu: note,
        saveAddress: Boolean(selected.isNew),
        discountCode: appliedDiscount?.code || null,
        useCredit: credit.use && credit.balance > 0,
        phuongThucThanhToan: isPayos ? 'payos' : 'cod',
        ghn: {
          provinceId: selected.GHNProvinceId || '',
          provinceName: selected.GHNTinh || '',
          wardId: selected.GHNWardId || '',
          wardName: selected.GHNPhuong || '',
        },
      });
      if (!data.success) {
        toast.error(`Không thể đặt hàng: ${data.message || 'lỗi không xác định'}`);
        return;
      }
      if (isPayos && data.payos_data) {
        setPayment({ ...data.payos_data, orderId: data.order_id, expiresAt: Date.now() + PAYOS_TIMEOUT_SECONDS * 1000 });
        return;
      }
      clearCart();
      toast.success(`Đặt hàng thành công! Mã đơn hàng #${data.order_id}`);
      navigate(`/order/${data.order_id}`);
    } catch {
      toast.error(NETWORK_ERROR);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaid = (orderId) => {
    setPayment(null);
    clearCart();
    navigate(`/payment-result?order_id=${orderId}`);
  };

  const handleExpired = (message) => {
    setPayment(null);
    toast.error(message);
  };

  const handlePaymentClose = (reason) => {
    setPayment(null);
    if (reason === 'later') {
      clearCart();
      toast.show('Đơn hàng đang chờ thanh toán trong 10 phút, xem tại mục Đơn hàng.');
      navigate('/account?tab=orders');
    }
  };

  return (
    <div className="page page--subtle">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Thanh toán</h1>
        </div>

        <div className="checkout">
          <form onSubmit={handleSubmit} className="checkout__main">
            <section className="card">
              <div className="card__header">
                <h2 className="card__title"><Truck size={18} /> Giao hàng</h2>
                <button type="button" className="btn btn--plain text-sm" onClick={() => setShowAddressForm(true)}>+ Thêm địa chỉ</button>
              </div>
              {addresses.length === 0 ? (
                <div className="checkout__empty">
                  <p className="text-muted">Bạn chưa có địa chỉ giao hàng nào.</p>
                  <button type="button" className="btn btn--secondary" onClick={() => setShowAddressForm(true)}>Thêm địa chỉ giao hàng</button>
                </div>
              ) : (
                <div className="choice-list">
                  {addresses.map((addr) => (
                    <label key={addr.MaDC} className={`choice ${selectedId === addr.MaDC ? 'choice--selected' : ''}`}>
                      <input type="radio" name="address" checked={selectedId === addr.MaDC} onChange={() => setSelectedId(addr.MaDC)} />
                      <div className="choice__body">
                        <p className="choice__title">{addr.NguoiNhan} · {addr.SoDienThoai}</p>
                        <p className="choice__desc">{addr.DiaChi}</p>
                        {(addr.GHNPhuong || addr.GHNTinh) && (
                          <p className="choice__desc">{[addr.GHNPhuong, addr.GHNTinh].filter(Boolean).join(', ')}</p>
                        )}
                      </div>
                      {addr.MacDinh === 1 && <Badge>Mặc định</Badge>}
                      {addr.isNew && <Badge tone="info">Mới</Badge>}
                    </label>
                  ))}
                </div>
              )}
              <label className="field checkout__note">
                <span className="label">Ghi chú đơn hàng (không bắt buộc)</span>
                <textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} className="textarea" placeholder="Lời nhắn cho cửa hàng" />
              </label>
            </section>

            {credit.balance > 0 && (
              <section className="card">
                <div className="card__header">
                  <h2 className="card__title"><Wallet size={18} /> Ví tín dụng</h2>
                </div>
                <label className="checkbox-label">
                  <input type="checkbox" checked={credit.use} onChange={(event) => setCredit((current) => ({ ...current, use: event.target.checked }))} />
                  <span>Dùng số dư {formatPrice(credit.balance)} (tiền bán, ký gửi đĩa cũ) để thanh toán</span>
                </label>
              </section>
            )}

            <section className="card">
              <div className="card__header">
                <h2 className="card__title">Phương thức thanh toán</h2>
              </div>
              {paidByCredit ? (
                <p className="text-sm text-muted">Ví tín dụng trả toàn bộ đơn hàng, bạn không cần thanh toán thêm khi nhận hàng.</p>
              ) : (
              <div className="choice-list">
                <label className={`choice ${paymentMethod === 'cod' ? 'choice--selected' : ''}`}>
                  <input type="radio" name="payment" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} />
                  <div className="choice__body">
                    <p className="choice__title">Thanh toán khi nhận hàng (COD)</p>
                    <p className="choice__desc">Trả tiền mặt cho nhân viên giao hàng.</p>
                  </div>
                  <Truck size={20} className="text-muted" />
                </label>
                <label className={`choice ${paymentMethod === 'online' ? 'choice--selected' : ''}`}>
                  <input type="radio" name="payment" checked={paymentMethod === 'online'} onChange={() => setPaymentMethod('online')} />
                  <div className="choice__body">
                    <p className="choice__title">Chuyển khoản VietQR (PayOS)</p>
                    <p className="choice__desc">Quét mã QR bằng ứng dụng ngân hàng, xác nhận tự động.</p>
                  </div>
                  <QrCode size={20} className="text-muted" />
                </label>
              </div>
              )}
            </section>

            <button type="submit" className="btn btn--primary btn--lg btn--full" disabled={submitting}>
              {submitting ? 'Đang đặt hàng...' : paymentMethod === 'online' && !paidByCredit ? 'Thanh toán bằng VietQR' : 'Đặt hàng'}
            </button>
            <Link to="/cart" className="link text-sm checkout__back">Quay lại giỏ hàng</Link>
          </form>

          <aside className="card checkout__summary">
            <h2 className="card__title">Đơn hàng ({count} sản phẩm)</h2>
            <ul className="checkout__items">
              {items.map((item) => (
                <li key={item.id} className="checkout-item">
                  <div className="checkout-item__image">
                    <SafeImage src={item.image} alt={item.title} />
                    <span className="checkout-item__qty">{item.quantity}</span>
                  </div>
                  <div className="checkout-item__info">
                    <p className="line-clamp-2 text-sm font-medium">{item.title}</p>
                    {item.artist && <p className="text-xs text-muted line-clamp-1">{item.artist}</p>}
                  </div>
                  <span className="text-sm nowrap">{formatPrice(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <DiscountForm />
            <div className="stack stack--sm">
              <div className="summary-row"><span className="text-muted">Tạm tính</span><span>{formatPrice(subtotal)}</span></div>
              <div className="summary-row"><span className="text-muted">Phí vận chuyển</span><span>{formatPrice(SHIPPING_FEE)}</span></div>
              {appliedDiscount && (
                <div className="summary-row"><span className="text-muted">Giảm giá ({appliedDiscount.code})</span><span>−{formatPrice(discountAmount)}</span></div>
              )}
              {creditUsed > 0 && (
                <div className="summary-row"><span className="text-muted">Trả bằng ví tín dụng</span><span>−{formatPrice(creditUsed)}</span></div>
              )}
            </div>
            <div className="summary-row summary-row--total"><span>Tổng cộng</span><span>{formatPrice(total)}</span></div>
          </aside>
        </div>
      </div>

      {showAddressForm && (
        <AddressFormModal submitLabel="Lưu & chọn" onSubmit={handleAddAddress} onClose={() => setShowAddressForm(false)} />
      )}

      {payment && (
        <PayosPaymentModal payment={payment} onPaid={handlePaid} onExpired={handleExpired} onClose={handlePaymentClose} />
      )}
    </div>
  );
}
