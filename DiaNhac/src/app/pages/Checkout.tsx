import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { ShoppingBag, CreditCard, Truck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { API_BASE } from '../config/api';


export function Checkout() {
  const navigate = useNavigate();
  const { items, getCartTotal, clearCart, appliedDiscount, setAppliedDiscount } = useCart();
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('cod');
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [payosModalData, setPayosModalData] = useState<any>(null);
  const [payosTimeLeft, setPayosTimeLeft] = useState(600); // 10 minutes = 600s
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddrId, setSelectedAddrId] = useState<any>(null);
  const [orderNote, setOrderNote] = useState('');
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [newAddrForm, setNewAddrForm] = useState({ recipientName: '', recipientPhone: '', address: '', provinceId: '', provinceName: '', wardId: '', wardName: '' });
  const [ghnProvinces, setGhnProvinces] = useState<any[]>([]);
  const [ghnWards, setGhnWards] = useState<any[]>([]);

  const shippingFee = 30000;
  const cartSubtotal = getCartTotal();
  const discountAmount = appliedDiscount?.amount || 0;
  const orderFinalTotal = Math.max(0, cartSubtotal - discountAmount + shippingFee);

  useEffect(() => {
    const loggedInUser = localStorage.getItem('user');
    if(loggedInUser) {
      const u = JSON.parse(loggedInUser); setUser(u);
      if(u.customer_id) {
        fetch(`${API_BASE}/shipping/ghn/provinces`)
          .then(res => res.json()).then(data => { if (data.success) setGhnProvinces(data.data || []); }).catch(() => {});
        fetch(`${API_BASE}/account/addresses?customer_id=${u.customer_id}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` } })
        .then(res => res.json())
        .then(addrData => {
          if(addrData.success && addrData.data && addrData.data.length > 0) { setSavedAddresses(addrData.data); setSelectedAddrId(addrData.data[0].MaDC); }
          else {
            fetch(`${API_BASE}/account/profile?customer_id=${u.customer_id}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` } })
            .then(res => res.json()).then(data => {
              if(data.success && data.data && (data.data.address || data.data.phone)) {
                const profileAddr = {
                  MaDC: 'default_profile',
                  NguoiNhan: data.data.fullName || data.data.full_name || '',
                  SoDienThoai: data.data.phone || '',
                  DiaChi: data.data.address || ''
                };
                setSavedAddresses([profileAddr]); setSelectedAddrId('default_profile');
              }
            });
          }
        });
      }
    } else { alert("Bạn cần đăng nhập để tiến hành đặt hàng!"); navigate('/login', { state: { returnUrl: '/checkout' } }); }
  }, [navigate]);

  useEffect(() => {
    if (!newAddrForm.provinceId) { setGhnWards([]); return; }
    fetch(`${API_BASE}/shipping/ghn/wards?province_id=${newAddrForm.provinceId}`)
      .then(res => res.json()).then(data => setGhnWards(data.success ? data.data || [] : [])).catch(() => setGhnWards([]));
  }, [newAddrForm.provinceId]);

  // PayOS 10-minute countdown timer
  useEffect(() => {
    if (!payosModalData) return;
    setPayosTimeLeft(600);
    const countdown = setInterval(() => {
      setPayosTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(countdown);
          alert('Đơn hàng đã hết hạn thanh toán (quá 10 phút)! Đơn hàng đã bị hủy và sản phẩm được hoàn lại kho.');
          setPayosModalData(null);
          navigate('/cart');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdown);
  }, [payosModalData, navigate]);

  if (items.length === 0) {
    return (
      <div className="page page--gray page-centered">
        <div className="empty-state" style={{ maxWidth: '28rem', padding: '3rem' }}>
          <ShoppingBag className="empty-state-icon" />
          <h2 className="empty-state-title">Giỏ hàng trống</h2>
          <p className="empty-state-desc">Bạn cần thêm sản phẩm vào giỏ hàng trước khi thanh toán.</p>
          <Link to="/shop" className="neo-btn neo-btn--primary">MUA SẮM NGAY</Link>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selected = savedAddresses.find(a => a.MaDC === selectedAddrId);
    if (!selected) { alert('Vui lòng chọn hoặc thêm địa chỉ giao hàng!'); return; }
    if (!selected.NguoiNhan || !selected.SoDienThoai || !selected.DiaChi) { alert('Thông tin địa chỉ giao hàng không đầy đủ!'); return; }
    if (!user || !user.customer_id) { alert('Vui lòng Đăng nhập để tiến hành Thanh toán.'); navigate('/login'); return; }
    const isPayos = paymentMethod === 'online';
    const payload = {
      customer_id: user.customer_id,
      items: items.map(i => ({ id: i.id, qty: i.quantity, price: i.price })),
      total: orderFinalTotal,
      address: selected.DiaChi,
      nguoiNhan: selected.NguoiNhan,
      sdtNhan: selected.SoDienThoai,
      ghiChu: orderNote,
      saveAddress: selected.isNew ? true : false,
      discountCode: appliedDiscount?.code || null,
      phuongThucThanhToan: isPayos ? 'payos' : 'cod',
      maGiaoDich: isPayos ? 'MOCK-PAYOS-' + Date.now() : null,
      ghn: {
        provinceId: selected.GHNProvinceId || '',
        provinceName: selected.GHNTinh || '',
        wardId: selected.GHNWardId || '',
        wardName: selected.GHNPhuong || ''
      }
    };
    if (isPayos) {
      if(!window.confirm(`Bạn sẽ được chuyển hướng tới cổng thanh toán PayOS.\nTổng tiền (gồm phí ship 30.000đ): ${orderFinalTotal.toLocaleString('vi-VN')}đ\nNhấn OK để tiếp tục.`)) return;
    }
    fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(res => res.json()).then(data => {
      if(data.success) {
        if (isPayos && data.payos_data) {
          setPayosModalData({ ...data.payos_data, order_id: data.order_id });
        } else {
          alert('Đặt hàng thành công! Mã đơn hàng: #' + data.order_id);
          clearCart();
          navigate('/account');
        }
      } else {
        alert('Lỗi đặt hàng: ' + data.message);
      }
    }).catch(err => { alert("Có lỗi xảy ra!"); console.error(err); });
  };

  const handleAddNewAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newAddrForm.recipientName.trim();
    const phone = newAddrForm.recipientPhone.trim();
    const address = newAddrForm.address.trim();

    if(!name || !phone || !address) return;

    const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})$/;
    if (!phoneRegex.test(phone)) {
      alert("Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam (10 số, đầu 03, 05, 07, 08, 09).");
      return;
    }

    if (address.length < 10) {
      alert("Vui lòng nhập địa chỉ cụ thể hơn (tối thiểu 10 ký tự).");
      return;
    }

    const newAddr = { MaDC: 'new_' + Date.now(), NguoiNhan: name, SoDienThoai: phone, DiaChi: address, GHNTinh: newAddrForm.provinceName, GHNPhuong: newAddrForm.wardName, GHNProvinceId: newAddrForm.provinceId, GHNWardId: newAddrForm.wardId, isNew: true };
    setSavedAddresses([newAddr, ...savedAddresses]); setSelectedAddrId(newAddr.MaDC); setShowAddressModal(false); setNewAddrForm({ recipientName: '', recipientPhone: '', address: '', provinceId: '', provinceName: '', wardId: '', wardName: '' });
  };

  useEffect(() => {
    if (!payosModalData) return;
    const interval = setInterval(() => {
      fetch(`${API_BASE}/orders/${payosModalData.order_id}/status`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` } })
        .then(res => res.json()).then(data => {
          if (data.success && data.status === 'dathanhtoan') {
            clearInterval(interval);
            clearCart();
            navigate('/payment-result?orderCode=' + payosModalData.orderCode);
          } else if (data.status === 'dahuy' || data.status === 'thatbai') {
            clearInterval(interval);
            alert('Đơn hàng đã hết hạn thanh toán hoặc bị hủy!');
            setPayosModalData(null);
            navigate('/cart');
          }
        }).catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [payosModalData, navigate, clearCart]);

  const handleCheckPaid = () => {
    fetch(`${API_BASE}/orders/${payosModalData.order_id}/status`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` } })
    .then(res => res.json()).then(data => {
      if(data.success && data.status === 'dathanhtoan') {
        clearCart();
        navigate('/payment-result?orderCode=' + payosModalData.orderCode);
      } else if (data.status === 'dahuy' || data.status === 'thatbai') {
        alert('Đơn hàng đã hết hạn thanh toán hoặc bị hủy!');
        setPayosModalData(null);
        navigate('/cart');
      } else {
        alert('Hệ thống chưa ghi nhận thanh toán. Đang tự động kiểm tra mỗi 3 giây...');
      }
    });
  };

  const handleApplyCoupon = () => {
    if (!couponInput) return; setCouponLoading(true);
    fetch(`${API_BASE}/discounts/check`, { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,  'Content-Type': 'application/json'  }, body: JSON.stringify({ code: couponInput, cartTotal: cartSubtotal }) })
    .then(res => res.json()).then(data => { setCouponLoading(false); if (data.success) { setAppliedDiscount({ code: data.data.code, amount: data.data.discountAmount }); setCouponInput(''); } else { alert(data.message); } })
    .catch(() => { setCouponLoading(false); alert('Có lỗi xảy ra!'); });
  };

  const [isCancelingPayos, setIsCancelingPayos] = useState(false);

  const handleCancelAndChangeMethod = async () => {
    if (!payosModalData?.order_id) return;
    if (!window.confirm("Bạn muốn hủy đơn hàng này để chọn lại phương thức thanh toán khác?\nTồn kho sản phẩm sẽ được hoàn trả ngay lập tức.")) return;
    setIsCancelingPayos(true);
    try {
      const res = await fetch(`${API_BASE}/orders/${payosModalData.order_id}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ lyDo: 'Khách hủy lệnh PayOS để chọn lại phương thức thanh toán' })
      });
      const data = await res.json();
      if (data.success) {
        alert("Đã hủy lệnh PayOS thành công. Tồn kho sản phẩm đã được trả lại. Bạn có thể chọn COD hoặc điều chỉnh đơn hàng.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCancelingPayos(false);
      setPayosModalData(null);
    }
  };

  const handlePayLater = () => {
    clearCart();
    setPayosModalData(null);
    alert("Đơn hàng của bạn đang được lưu tại trang Tài khoản với trạng thái 'Chờ thanh toán' (hiệu lực trong 10 phút).");
    navigate('/account');
  };

  return (
    <div className="page page--gray">
      <div className="container" style={{ padding: '2rem 1rem' }}>
        <div className="page-header">
          <h1 className="page-title" style={{ fontFamily: 'var(--font-heading)' }}>Thanh Toán</h1>
          <p className="page-subtitle">Hoàn tất đơn hàng của bạn</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Address Book */}
            <div className="neo-box">
              <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                <h2 className="neo-box-title" style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Truck style={{ width: 24, height: 24 }} /> Sổ Địa Chỉ Giao Hàng
                </h2>
                <button type="button" onClick={() => setShowAddressModal(true)} className="neo-btn neo-btn--primary neo-btn--sm">+ Thêm Mới</button>
              </div>

              {savedAddresses.length === 0 ? (
                <div className="empty-state empty-state--dashed" style={{ padding: '2rem' }}>
                  <p className="empty-state-desc">Bạn chưa có địa chỉ nào được lưu.</p>
                  <button type="button" onClick={() => setShowAddressModal(true)} style={{ color: '#000', textDecoration: 'underline', fontWeight: 700, textTransform: 'uppercase', background: 'none', border: 'none' }}>Nhấn vào đây để thêm địa chỉ giao hàng</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontWeight: 700 }}>
                  {savedAddresses.map(addr => {
                    const isSelected = selectedAddrId === addr.MaDC;
                    return (
                      <label key={addr.MaDC} style={{ display: 'flex', alignItems: 'flex-start', padding: '1.25rem', border: isSelected ? '3px solid #000' : '2px solid var(--gray-300)', cursor: 'pointer', background: isSelected ? '#fef9c3' : '#fff', boxShadow: isSelected ? '4px 4px 0 #000' : 'none', transition: 'all 0.2s', minHeight: '4.5rem' }}>
                        <input type="radio" name="saved_address" style={{ width: '1.4rem', height: '1.4rem', accentColor: '#000', marginTop: '0.2rem', cursor: 'pointer' }} checked={isSelected} onChange={() => setSelectedAddrId(addr.MaDC)} />
                        <div style={{ marginLeft: '1rem', flex: 1, fontSize: '0.925rem', lineHeight: '1.5' }}>
                          <div style={{ textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                            <span>Người nhận:</span>
                            <span style={{ color: 'var(--color-danger)', fontSize: '1.05rem', fontWeight: 900 }}>{addr.NguoiNhan}</span>
                            <span style={{ background: '#000', color: '#fff', padding: '0.15rem 0.6rem', fontSize: '0.8rem', letterSpacing: '1px' }}>{addr.SoDienThoai}</span>
                          </div>
                          <div style={{ fontWeight: 600, marginTop: '0.4rem', textTransform: 'uppercase', color: 'var(--gray-800)' }}>{addr.DiaChi}</div>
                          {(addr.GHNTinh || addr.GHNPhuong) && (
                            <div style={{ fontSize: '0.8rem', marginTop: '0.35rem', color: 'var(--gray-600)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Truck style={{ width: 15, height: 15 }} /> GHN: {addr.GHNPhuong}, {addr.GHNTinh}
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '2px dashed #000' }}>
                <label htmlFor="note" className="neo-label">Ghi chú đơn hàng (Tùy chọn)</label>
                <textarea id="note" rows={2} value={orderNote} onChange={(e) => setOrderNote(e.target.value)} className="neo-textarea" placeholder="LỜI NHẮN DÀNH CHO CỬA HÀNG" />
              </div>
            </div>

            {/* Payment Method */}
            <div className="neo-box">
              <h2 className="neo-box-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CreditCard style={{ width: 24, height: 24 }} /> Phương Thức Thanh Toán</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                <label style={{ display: 'flex', alignItems: 'center', padding: '1rem', border: paymentMethod === 'cod' ? '3px solid #000' : '2px solid var(--gray-300)', background: paymentMethod === 'cod' ? '#fef9c3' : '#fff', cursor: 'pointer', transition: 'background 0.2s' }}>
                  <input type="radio" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} style={{ width: '1.25rem', height: '1.25rem', accentColor: '#000' }} />
                  <div style={{ marginLeft: '0.75rem' }}>Thanh toán khi nhận hàng (COD)</div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', padding: '1rem', border: paymentMethod === 'online' ? '3px solid #000' : '2px solid var(--gray-300)', background: paymentMethod === 'online' ? '#fef9c3' : '#fff', cursor: 'pointer' }}>
                  <input type="radio" value="online" checked={paymentMethod === 'online'} onChange={() => setPaymentMethod('online')} style={{ width: '1.25rem', height: '1.25rem', accentColor: '#000' }} />
                  <div style={{ marginLeft: '0.75rem' }}>Thanh toán Online chuyển khoản VietQR (PayOS)</div>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div>
            <div className="neo-box neo-box--shadow sticky-summary">
              <h2 className="neo-box-title">Đơn Hàng</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                {items.map((item) => (
                  <div key={item.id} style={{ display: 'flex', gap: '1rem', border: '2px solid #000', padding: '0.5rem' }}>
                    <div style={{ width: '5rem', height: '5rem', flexShrink: 0, borderRight: '2px solid #000', overflow: 'hidden', background: 'var(--gray-100)' }}>
                      <img src={item.image} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
                      <p className="line-clamp-1" style={{ fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase' }}>{item.title}</p>
                      <p style={{ fontSize: '0.875rem', fontWeight: 700 }}>x{item.quantity}</p>
                      <p style={{ fontSize: '0.875rem', fontWeight: 700 }}>{item.price.toLocaleString('vi-VN')}đ</p>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '2px solid #000', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                <div className="flex-between"><span>Tạm tính ({items.reduce((s, i) => s + i.quantity, 0)})</span><span>{cartSubtotal.toLocaleString('vi-VN')}đ</span></div>
                <div className="flex-between" style={{ borderBottom: '2px solid #000', paddingBottom: '1rem' }}>
                  <span style={{ color: 'var(--gray-600)' }}>PHÍ VẬN CHUYỂN TOÀN QUỐC</span>
                  <span style={{ fontWeight: 900 }}>{shippingFee.toLocaleString('vi-VN')}đ</span>
                </div>
                {appliedDiscount && (
                  <div className="flex-between" style={{ borderBottom: '2px dashed #000', paddingBottom: '1rem', color: 'var(--color-danger)' }}>
                    <span>GIẢM GIÁ ({appliedDiscount.code})</span><span>-{discountAmount.toLocaleString('vi-VN')}đ</span>
                  </div>
                )}
                {!appliedDiscount && (
                  <div style={{ paddingBottom: '1rem', borderBottom: '2px solid #000' }}>
                    <label className="neo-label" style={{ fontSize: '0.75rem' }}>Mã Giảm Giá</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input type="text" value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} className="neo-input" style={{ flex: 1, fontSize: '0.875rem' }} placeholder="NHẬP MÃ" />
                      <button type="button" onClick={handleApplyCoupon} disabled={couponLoading} className="neo-btn neo-btn--primary neo-btn--sm">{couponLoading ? '...' : 'ÁP DỤNG'}</button>
                    </div>
                  </div>
                )}
                <div className="flex-between" style={{ borderTop: '2px solid #000', paddingTop: '1rem', fontSize: '1.25rem', fontWeight: 900 }}>
                  <span>TỔNG THANH TOÁN</span><span style={{ color: 'var(--color-danger)' }}>{orderFinalTotal.toLocaleString('vi-VN')}đ</span>
                </div>
              </div>

              <button type="submit" className="neo-btn neo-btn--primary neo-btn--full" style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Xác nhận Đặt hàng</button>
              <Link to="/cart" style={{ display: 'block', textAlign: 'center', fontWeight: 700, textTransform: 'uppercase' }}>← QUAY LẠI GIỎ HÀNG</Link>
            </div>
          </div>
        </form>
      </div>

      {/* Add Address Modal */}
      {showAddressModal && (
        <div className="neo-modal-overlay">
          <div className="neo-modal">
            <h2 className="neo-modal-title">Thêm Địa Chỉ Mới</h2>
            <form onSubmit={handleAddNewAddressSubmit} className="auth-form">
              <div className="form-group"><label className="neo-label">Tên người nhận *</label><input type="text" required minLength={2} value={newAddrForm.recipientName} onChange={e => setNewAddrForm({...newAddrForm, recipientName: e.target.value})} className="neo-input" placeholder="HỌ VÀ TÊN" /></div>
              <div className="form-group"><label className="neo-label">Số điện thoại *</label><input type="tel" required pattern="^(0[3|5|7|8|9])+([0-9]{8})$" title="Số điện thoại Việt Nam gồm 10 chữ số, bắt đầu bằng 03, 05, 07, 08 hoặc 09" value={newAddrForm.recipientPhone} onChange={e => setNewAddrForm({...newAddrForm, recipientPhone: e.target.value})} className="neo-input" placeholder="SỐ ĐIỆN THOẠI" /></div>
              <div className="form-group"><label className="neo-label">Địa chỉ giao hàng *</label><textarea required minLength={10} rows={3} value={newAddrForm.address} onChange={e => setNewAddrForm({...newAddrForm, address: e.target.value})} className="neo-textarea" placeholder="ĐỊA CHỈ CHI TIẾT" /></div>
              <div className="form-row">
                <div className="form-group"><label className="neo-label">Tỉnh / thành GHN *</label>{ghnProvinces.length > 0 ? <select required value={newAddrForm.provinceId} onChange={e => { const option = ghnProvinces.find(p => String(p._id) === e.target.value); setNewAddrForm({ ...newAddrForm, provinceId: e.target.value, provinceName: option?.name || '', wardId: '', wardName: '' }); }} className="neo-input"><option value="">CHỌN TỈNH / THÀNH</option>{ghnProvinces.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}</select> : <input required value={newAddrForm.provinceName} onChange={e => setNewAddrForm({ ...newAddrForm, provinceName: e.target.value })} className="neo-input" placeholder="VÍ DỤ: HỒ CHÍ MINH" />}</div>
                <div className="form-group"><label className="neo-label">Phường / xã GHN *</label>{ghnWards.length > 0 ? <select required value={newAddrForm.wardId} onChange={e => { const option = ghnWards.find(w => String(w._id) === e.target.value); setNewAddrForm({ ...newAddrForm, wardId: e.target.value, wardName: option?.name || '' }); }} className="neo-input"><option value="">CHỌN PHƯỜNG / XÃ</option>{ghnWards.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}</select> : <input required value={newAddrForm.wardName} onChange={e => setNewAddrForm({ ...newAddrForm, wardName: e.target.value })} className="neo-input" placeholder="VÍ DỤ: PHƯỜNG BẾN NGHÉ" />}</div>
              </div>
              <div className="neo-modal-actions">
                <button type="submit" className="neo-btn neo-btn--primary" style={{ flex: 1 }}>LƯU & CHỌN</button>
                <button type="button" onClick={() => setShowAddressModal(false)} className="neo-btn neo-btn--secondary" style={{ flex: 1 }}>HỦY BỎ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PayOS QR Modal with 10-minute live countdown timer */}
      {payosModalData && (
        <div className="neo-modal-overlay">
          <div className="neo-modal" style={{ textAlign: 'center', maxWidth: '28rem' }}>
            <h2 className="neo-modal-title">Thanh Toán Đơn Hàng #{payosModalData.order_id}</h2>
            
            {/* Live 10-Minute Expiration Banner */}
            <div style={{ background: '#fee2e2', border: '3px solid #dc2626', padding: '0.6rem 1rem', marginBottom: '1rem', fontWeight: 900, color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', textTransform: 'uppercase', boxShadow: '3px 3px 0 #dc2626' }}>
              <span>⏱️ HẾT HẠN SAU:</span>
              <span style={{ fontSize: '1.5rem', fontFamily: 'monospace', letterSpacing: '2px', color: '#b91c1c' }}>
                {Math.floor(payosTimeLeft / 60).toString().padStart(2, '0')}:{(payosTimeLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>

            <p style={{ fontWeight: 700, color: 'var(--gray-600)', marginBottom: '1.25rem', borderBottom: '2px solid #000', paddingBottom: '0.75rem', fontSize: '0.875rem' }}>Mở ứng dụng ngân hàng hoặc ví điện tử bất kỳ để quét mã VietQR bên dưới.</p>
            
            <div style={{ background: '#fff', padding: '1rem', border: '3px solid #000', display: 'inline-block', marginBottom: '1.25rem', boxShadow: '4px 4px 0 #000' }}>
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(payosModalData.qrCode)}`} alt="QR Code" style={{ margin: '0 auto', maxWidth: '240px' }} />
            </div>

            <div style={{ textAlign: 'left', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.875rem', border: '2px solid #000', padding: '1rem', marginBottom: '1.25rem', background: '#fef9c3' }}>
              <p className="flex-between" style={{ marginBottom: '0.5rem' }}><span>Ngân hàng:</span><span>{payosModalData.bin}</span></p>
              <p className="flex-between" style={{ marginBottom: '0.5rem' }}><span>Chủ tk:</span><span>{payosModalData.accountName}</span></p>
              <p className="flex-between" style={{ marginBottom: '0.5rem' }}><span>Số tài khoản:</span><span>{payosModalData.accountNumber}</span></p>
              <p className="flex-between" style={{ marginBottom: '0.5rem', fontSize: '1.125rem', color: 'var(--color-danger)' }}><span>Số tiền:</span><span>{payosModalData.amount.toLocaleString()}đ</span></p>
              <p className="flex-between"><span>Nội dung:</span><span>{payosModalData.description}</span></p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button onClick={handleCheckPaid} className="neo-btn neo-btn--yellow neo-btn--full shadow-neo-sm">
                TÔI ĐÃ CHUYỂN KHOẢN XONG
              </button>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={handleCancelAndChangeMethod} 
                  disabled={isCancelingPayos} 
                  className="neo-btn neo-btn--danger" 
                  style={{ fontSize: '0.8rem', padding: '0.6rem 0.4rem', lineHeight: 1.3 }}
                  title="Hủy đơn hàng này, hoàn lại kho và chọn phương thức khác"
                >
                  {isCancelingPayos ? 'ĐANG HỦY...' : 'HỦY & ĐỔI PHƯƠNG THỨC'}
                </button>
                <button 
                  type="button" 
                  onClick={handlePayLater} 
                  disabled={isCancelingPayos} 
                  className="neo-btn neo-btn--secondary" 
                  style={{ fontSize: '0.8rem', padding: '0.6rem 0.4rem', lineHeight: 1.3 }}
                  title="Lưu đơn hàng và thanh toán sau trong 10 phút"
                >
                  ĐỂ THANH TOÁN SAU
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
