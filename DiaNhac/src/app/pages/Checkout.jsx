import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { QrCode, ShoppingBag, Truck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { AddressFormModal } from '../components/AddressForm';
import { DiscountForm } from '../components/DiscountForm';
import { SafeImage } from '../components/SafeImage';
import { Badge, EmptyState, Modal } from '../components/ui';
import { api, NETWORK_ERROR } from '../utils/api';
import { useCurrentUser } from '../utils/auth';
import { SHIPPING_FEE } from '../utils/catalog';
import { formatPrice } from '../utils/format';
import '../../styles/pages/cart.css';

const PAYOS_TIMEOUT_SECONDS = 600; // Server tự hủy đơn PayOS chưa thanh toán sau 10 phút.

// Hộp thoại quét mã VietQR, tự kiểm tra trạng thái thanh toán mỗi 3 giây.
function PayosPaymentModal({ payment, onPaid, onExpired, onClose }) {
  const toast = useToast();
  const [secondsLeft, setSecondsLeft] = useState(PAYOS_TIMEOUT_SECONDS);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.round((payment.expiresAt - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [payment.expiresAt]);

  useEffect(() => {
    if (secondsLeft === 0) onExpired('Đơn hàng đã hết hạn thanh toán (quá 10 phút) và đã được hủy.');
  }, [secondsLeft, onExpired]);

  const checkStatus = async (manual = false) => {
    try {
      const data = await api.get(`/orders/${payment.orderId}/status`);
      if (data.success && data.status === 'dathanhtoan') onPaid(payment.orderId);
      else if (data.status === 'dahuy' || data.status === 'thatbai') onExpired('Đơn hàng đã hết hạn thanh toán hoặc đã bị hủy.');
      else if (manual) toast.show('Hệ thống chưa ghi nhận thanh toán. Đang tiếp tục kiểm tra tự động...');
    } catch {
      if (manual) toast.error(NETWORK_ERROR);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => checkStatus(false), 3000);
    return () => clearInterval(interval);
  }, [payment.orderId]);

  const handleCancel = async () => {
    if (!window.confirm('Hủy đơn hàng này để chọn phương thức thanh toán khác?')) return;
    setCanceling(true);
    try {
      const data = await api.put(`/orders/${payment.orderId}/cancel`, { lyDo: 'Khách hủy lệnh PayOS để chọn lại phương thức thanh toán' });
      if (data.success) toast.success('Đã hủy lệnh thanh toán. Bạn có thể chọn phương thức khác.');
      else toast.error(data.message || 'Không thể hủy đơn hàng');
    } catch {
      toast.error(NETWORK_ERROR);
    } finally {
      setCanceling(false);
      onClose('cancel');
    }
  };

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const seconds = String(secondsLeft % 60).padStart(2, '0');

  return (
    <Modal
      title={`Thanh toán đơn hàng #${payment.orderId}`}
      footer={(
        <>
          <button type="button" className="btn btn--plain btn--plain-critical" onClick={handleCancel} disabled={canceling} style={{ marginRight: 'auto' }}>
            {canceling ? 'Đang hủy...' : 'Hủy & đổi phương thức'}
          </button>
          <button type="button" className="btn btn--secondary" onClick={() => onClose('later')} disabled={canceling}>Thanh toán sau</button>
          <button type="button" className="btn btn--primary" onClick={() => checkStatus(true)}>Tôi đã chuyển khoản</button>
        </>
      )}
    >
      <div className="payos">
        <div className="banner banner--warning">
          <span>Mã thanh toán hết hạn sau <strong className="payos__timer">{minutes}:{seconds}</strong></span>
        </div>
        <p className="text-muted text-sm">Mở ứng dụng ngân hàng hoặc ví điện tử bất kỳ để quét mã VietQR bên dưới.</p>
        <div className="payos__qr">
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(payment.qrCode || '')}`} alt="Mã QR thanh toán" />
        </div>
        <dl className="description-list">
          <dt>Ngân hàng (BIN)</dt><dd>{payment.bin}</dd>
          <dt>Chủ tài khoản</dt><dd>{payment.accountName}</dd>
          <dt>Số tài khoản</dt><dd>{payment.accountNumber}</dd>
          <dt>Số tiền</dt><dd className="font-semibold">{formatPrice(payment.amount)}</dd>
          <dt>Nội dung</dt><dd>{payment.description}</dd>
        </dl>
        {payment.checkoutUrl && (
          <a href={payment.checkoutUrl} target="_blank" rel="noopener noreferrer" className="link text-sm">Mở trang thanh toán PayOS</a>
        )}
      </div>
    </Modal>
  );
}

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
  const customerId = user?.customer_id;

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

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
  const total = Math.max(0, subtotal - discountAmount + SHIPPING_FEE);

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

    const isPayos = paymentMethod === 'online';
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

            <section className="card">
              <div className="card__header">
                <h2 className="card__title">Phương thức thanh toán</h2>
              </div>
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
            </section>

            <button type="submit" className="btn btn--primary btn--lg btn--full" disabled={submitting}>
              {submitting ? 'Đang đặt hàng...' : paymentMethod === 'online' ? 'Thanh toán bằng VietQR' : 'Đặt hàng'}
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
