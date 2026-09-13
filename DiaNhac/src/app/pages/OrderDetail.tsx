import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { Package, Truck, CheckCircle2, Clock, XCircle, CreditCard, RotateCcw } from 'lucide-react';
import { API_BASE } from '../config/api';


export function OrderDetail() {
  const { id } = useParams();
  const [orderData, setOrderData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [returnRequest, setReturnRequest] = useState<any>(null);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnForm, setReturnForm] = useState({ reason: 'hang_loi', description: '', evidence: '' });
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [refundForm, setRefundForm] = useState({
    nganHang: 'Vietcombank',
    soTK: '',
    chuTK: '',
    lyDo: 'Đổi ý không muốn mua nữa'
  });

  const fetchOrderDetail = () => {
    const loggedInUser = localStorage.getItem('user');
    const user = loggedInUser ? JSON.parse(loggedInUser) : null;
    const token = localStorage.getItem('token') || '';
    const url = `${API_BASE}/orders/${id}${user && user.customer_id ? `?customer_id=${user.customer_id}` : ''}`;
    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).then(res => res.json()).then(data => {
      if(data.success) {
        setOrderData(data.data);
        if (data.data?.info?.NguoiNhan) {
          setRefundForm(prev => ({ ...prev, chuTK: data.data.info.NguoiNhan.toUpperCase() }));
        }
        fetch(`${API_BASE}/returns/mine`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json()).then(returns => {
          if (returns.success) setReturnRequest((returns.data || []).find((item: any) => String(item.order_id) === String(id)) || null);
        }).catch(() => {});
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchOrderDetail();
  }, [id]);

  const handleInitiateCancel = () => {
    const info = orderData?.info;
    if (!info) return;
    if (info.MaDonGHN) {
      alert(`Đơn hàng đã được tạo mã vận đơn GHN (${info.MaDonGHN}). Không thể hủy trực tuyến, quý khách vui lòng liên hệ trực tiếp với Shop để được hỗ trợ!`);
      return;
    }
    if (info.ThanhToanHinhThuc === 'payos' && info.TrangThaiTT === 'dathanhtoan') {
      setShowRefundModal(true);
      return;
    }
    if (!window.confirm('BẠN CÓ CHẮC CHẮN MUỐN HỦY ĐƠN HÀNG NÀY?')) return;
    executeCancel({});
  };

  const executeCancel = (refundPayload: any) => {
    setCancelLoading(true);
    const loggedInUser = localStorage.getItem('user');
    const user = loggedInUser ? JSON.parse(loggedInUser) : null;
    fetch(`${API_BASE}/orders/${id}/cancel`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: id, customer_id: user?.customer_id, ...refundPayload })
    })
    .then(res => res.json())
    .then(data => {
      setCancelLoading(false);
      if (data.success) {
        alert(data.message || 'Đã hủy đơn hàng thành công!');
        setShowRefundModal(false);
        fetchOrderDetail();
      } else {
        alert(data.message || 'Lỗi khi hủy đơn');
      }
    })
    .catch(err => {
      setCancelLoading(false);
      alert('Lỗi kết nối máy chủ');
      console.error(err);
    });
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnForm.description.trim()) return alert('Vui lòng mô tả vấn đề của sản phẩm');
    setReturnSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/returns`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: id, reason: returnForm.reason, description: returnForm.description, evidence: returnForm.evidence, items: (orderData?.items || []).map((item: any) => ({ detail_id: item.MaCTDH, quantity: item.SoLuong })) })
      });
      const data = await response.json();
      if (!data.success) return alert(data.message || 'Không thể gửi yêu cầu trả hàng');
      alert('Đã gửi yêu cầu trả hàng. Cửa hàng sẽ liên hệ xác nhận.');
      setShowReturnForm(false);
      setReturnRequest({ status: 'moi', reason: returnForm.reason, description: returnForm.description });
    } catch { alert('Không thể kết nối tới máy chủ'); }
    finally { setReturnSubmitting(false); }
  };

  if (loading) return <div className="page page--gray" style={{ paddingTop: '6rem', textAlign: 'center', fontWeight: 700 }}>ĐANG TẢI...</div>;

  if (!orderData || !orderData.info) {
    return (
      <div className="page page--gray" style={{ paddingTop: '6rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.875rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '1rem', fontFamily: 'var(--font-heading)' }}>Không tìm thấy đơn hàng</h2>
        <Link to="/account" className="neo-btn neo-btn--primary">Quay lại</Link>
      </div>
    );
  }

  const { info, items } = orderData;
  const statuses = [
    { id: 'choxacnhan', label: 'CHỜ XÁC NHẬN', icon: Clock },
    { id: 'dangchuanbihang', label: 'ĐANG CHUẨN BỊ', icon: Package },
    { id: 'danggiaohang', label: 'ĐANG GIAO', icon: Truck },
    { id: 'hoanthanh', label: 'HOÀN THÀNH', icon: CheckCircle2 }
  ];
  let currentStatusIndex = statuses.findIndex(s => s.id === info.TrangThai);
  const isCanceled = info.TrangThai === 'dahuy';

  return (
    <div className="page page--gray" style={{ padding: '3rem 0' }}>
      <div className="container" style={{ maxWidth: '56rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <Link to="/account" style={{ color: '#000', fontWeight: 700, textTransform: 'uppercase', textDecoration: 'none' }}>← QUAY LẠI TÀI KHOẢN</Link>
          <div className="flex-between" style={{ alignItems: 'flex-start', marginTop: '0.75rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 className="page-title" style={{ fontFamily: 'var(--font-heading)', margin: 0 }}>CHI TIẾT ĐƠN HÀNG #{info.MaDH}</h1>
              <p style={{ color: 'var(--gray-600)', fontWeight: 700, textTransform: 'uppercase', marginTop: '0.5rem' }}>ĐẶT NGÀY: {new Date(info.NgayDat).toLocaleString('vi-VN')}</p>
            </div>
            {!isCanceled && (
              info.MaDonGHN ? (
                <div style={{ padding: '0.5rem 0.75rem', border: '2px solid #000', fontWeight: 700, background: '#fef9c3', color: '#854d0e', textTransform: 'uppercase', fontSize: '0.8rem' }}>
                  🚚 ĐÃ TẠO GHN ({info.MaDonGHN}) — LIÊN HỆ SHOP ĐỂ HỦY
                </div>
              ) : (
                (info.TrangThai === 'choxacnhan' || info.TrangThai === 'daxacnhan' || info.TrangThai === 'dangchuanbihang') && (
                  <button onClick={handleInitiateCancel} className="neo-btn neo-btn--danger">
                    HỦY ĐƠN HÀNG
                  </button>
                )
              )
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="neo-box neo-box--shadow" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h2 className="neo-box-title" style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem' }}>TRẠNG THÁI ĐƠN HÀNG</h2>
          {isCanceled ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--color-danger)', border: '2px solid var(--color-danger)', padding: '1rem', fontWeight: 700, background: '#fef2f2' }}>
                <XCircle style={{ width: 32, height: 32 }} />
                <span style={{ fontSize: '1.25rem', textTransform: 'uppercase' }}>ĐƠN HÀNG ĐÃ BỊ HỦY</span>
              </div>

              {info.TrangThaiHoanTien === 'choxuly' && (
                <div style={{ marginTop: '1rem', background: '#fef3c7', border: '3px solid #d97706', padding: '1rem', fontWeight: 700 }}>
                  <div style={{ color: '#b45309', fontSize: '1.125rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    ⏳ ĐANG CHỜ SHOP HOÀN TIỀN
                  </div>
                  <p style={{ margin: '0 0 0.5rem', color: '#92400e', fontSize: '0.875rem' }}>
                    Đơn hàng đã được hủy. Vọc Records đang đối soát và sẽ chuyển hoàn tiền vào tài khoản ngân hàng của bạn sớm nhất.
                  </p>
                  {info.ThongTinHoanTien && (() => {
                    try {
                      const parsed = JSON.parse(info.ThongTinHoanTien);
                      return (
                        <div style={{ background: '#fff', border: '1px solid #d97706', padding: '0.75rem', fontSize: '0.85rem' }}>
                          <div>Ngân hàng nhận tiền: <strong>{parsed.nganHang}</strong></div>
                          <div>Số tài khoản: <strong>{parsed.soTK}</strong></div>
                          <div>Tên chủ tài khoản: <strong>{parsed.chuTK}</strong></div>
                          {parsed.lyDo && <div>Lý do: {parsed.lyDo}</div>}
                        </div>
                      );
                    } catch { return null; }
                  })()}
                </div>
              )}

              {info.TrangThaiHoanTien === 'dahoantien' && (
                <div style={{ marginTop: '1rem', background: '#dcfce7', border: '3px solid #16a34a', padding: '1rem', fontWeight: 700, color: '#166534' }}>
                  <div style={{ fontSize: '1.125rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    ✓ ĐÃ HOÀN TIỀN THÀNH CÔNG
                  </div>
                  <p style={{ margin: 0, fontSize: '0.875rem' }}>
                    Shop đã hoàn tất chuyển tiền hoàn trả vào tài khoản ngân hàng của bạn. Vui lòng kiểm tra thông báo biến động số dư.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: '100%', height: '4px', background: 'var(--gray-200)', zIndex: 0 }}></div>
              <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', height: '4px', background: '#000', zIndex: 0, transition: 'all 0.5s', width: `${(Math.max(0, currentStatusIndex) / (statuses.length - 1)) * 100}%` }}></div>
              {statuses.map((s, idx) => {
                const Icon = s.icon;
                const isCompleted = idx <= currentStatusIndex;
                const isActive = idx === currentStatusIndex;
                return (
                  <div key={s.id} style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', border: '4px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem', transition: 'all 0.3s', background: isCompleted ? '#000' : 'var(--gray-200)', color: isCompleted ? '#fff' : 'var(--gray-400)' }}>
                      <Icon style={{ width: 24, height: 24 }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: isActive ? '#000' : isCompleted ? 'var(--gray-700)' : 'var(--gray-400)' }}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid-2-col" style={{ marginBottom: '2rem' }}>
          <div className="neo-box neo-box--shadow">
            <h3 className="neo-box-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Truck style={{ width: 20, height: 20 }} /> THÔNG TIN GIAO HÀNG</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase' }}>
              <p><span style={{ color: 'var(--gray-500)' }}>Người nhận:</span> {info.NguoiNhan || 'N/A'}</p>
              <p><span style={{ color: 'var(--gray-500)' }}>Số điện thoại:</span> {info.SDTNhan || 'N/A'}</p>
              <p><span style={{ color: 'var(--gray-500)' }}>Địa chỉ:</span> {info.DiaChiGiao}</p>
              <p><span style={{ color: 'var(--gray-500)' }}>Ghi chú:</span> {info.GhiChu || 'Không có'}</p>
              {info.MaDonGHN && <p><span style={{ color: 'var(--gray-500)' }}>Mã GHN:</span> {info.MaDonGHN} · {info.GHNTrangThai || 'Đang đồng bộ'}</p>}
              {info.GHNExpectedDelivery && <p><span style={{ color: 'var(--gray-500)' }}>Dự kiến giao:</span> {new Date(info.GHNExpectedDelivery).toLocaleString('vi-VN')}</p>}
            </div>
          </div>
          <div className="neo-box neo-box--shadow">
            <h3 className="neo-box-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CreditCard style={{ width: 20, height: 20 }} /> THÔNG TIN THANH TOÁN</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase' }}>
              <p><span style={{ color: 'var(--gray-500)' }}>Phương thức:</span> {info.ThanhToanHinhThuc?.toUpperCase() || 'COD'}</p>
              <p><span style={{ color: 'var(--gray-500)' }}>Trạng thái:</span>
                <span className={`status-badge ${info.TrangThaiTT === 'dathanhtoan' ? 'status-badge--done' : 'status-badge--pending'}`} style={{ marginLeft: '0.5rem' }}>
                  {info.TrangThaiTT === 'dathanhtoan' ? 'ĐÃ THANH TOÁN' : 'CHƯA THANH TOÁN'}
                </span>
              </p>
              {info.MaGiaoDich && <p><span style={{ color: 'var(--gray-500)' }}>Mã giao dịch:</span> {info.MaGiaoDich}</p>}
            </div>
          </div>
        </div>

        <div className="neo-box neo-box--shadow" style={{ marginBottom: '2rem' }}>
          <h3 className="neo-box-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><RotateCcw style={{ width: 20, height: 20 }} /> TRẢ HÀNG / BÁO LỖI</h3>
          {returnRequest ? <p style={{ margin: 0, fontWeight: 700 }}>Yêu cầu trả hàng: <span className="status-badge status-badge--pending" style={{ marginLeft: '0.5rem' }}>{returnRequest.status}</span></p> : info.TrangThai === 'hoanthanh' ? <>
            <p style={{ color: 'var(--gray-600)', marginBottom: '1rem' }}>Nếu sản phẩm lỗi, sai hàng hoặc hư hỏng khi vận chuyển, bạn có thể gửi yêu cầu trong thời hạn đổi trả.</p>
            {!showReturnForm ? <button onClick={() => setShowReturnForm(true)} className="neo-btn neo-btn--secondary">TẠO YÊU CẦU TRẢ HÀNG</button> : <form onSubmit={handleReturnSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <select value={returnForm.reason} onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })} className="neo-input"><option value="hang_loi">Hàng bị lỗi</option><option value="sai_san_pham">Sai sản phẩm</option><option value="thieu_hang">Thiếu hàng</option><option value="hu_hong_van_chuyen">Hư hỏng do vận chuyển</option><option value="khac">Lý do khác</option></select>
              <textarea required minLength={10} rows={4} value={returnForm.description} onChange={(e) => setReturnForm({ ...returnForm, description: e.target.value })} className="neo-textarea" placeholder="Mô tả vấn đề, tình trạng đĩa/bìa/phụ kiện..." />
              <input value={returnForm.evidence} onChange={(e) => setReturnForm({ ...returnForm, evidence: e.target.value })} className="neo-input" placeholder="Link ảnh/video bằng chứng (nếu có)" />
              <div style={{ display: 'flex', gap: '0.75rem' }}><button type="submit" disabled={returnSubmitting} className="neo-btn neo-btn--primary">{returnSubmitting ? 'ĐANG GỬI...' : 'GỬI YÊU CẦU'}</button><button type="button" onClick={() => setShowReturnForm(false)} className="neo-btn neo-btn--secondary">HỦY</button></div>
            </form>}
          </> : <p style={{ margin: 0, color: 'var(--gray-600)' }}>Chỉ có thể mở yêu cầu sau khi đơn hàng đã giao thành công.</p>}
        </div>

        {/* Products */}
        <div className="neo-box neo-box--shadow">
          <h3 className="neo-box-title">SẢN PHẨM ĐÃ ĐẶT</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            {items.map((item: any) => (
              <div key={item.MaCTDH} style={{ display: 'flex', gap: '1rem', border: '2px solid #000', padding: '1rem', alignItems: 'center' }}>
                <div style={{ width: '5rem', height: '5rem', background: 'var(--gray-100)', border: '2px solid #000', flexShrink: 0 }}>
                  <img src={item.HinhAnh} alt={item.TenSP} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 className="line-clamp-1" style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '1.125rem' }}>{item.TenSP}</h4>
                  <p className="line-clamp-1" style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--gray-600)' }}>{item.NgheSi}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, fontWeight: 700 }}>
                  <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>SL: {item.SoLuong}</p>
                  <p style={{ fontSize: '1.125rem' }}>{Number(item.DonGia).toLocaleString('vi-VN')}đ</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '2px solid #000', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'right', fontWeight: 700 }}>
            <div><span style={{ color: 'var(--gray-500)' }}>TẠM TÍNH: </span><span>{items.reduce((s: number, i: any) => s + (Number(i.DonGia) * Number(i.SoLuong)), 0).toLocaleString('vi-VN')}đ</span></div>
            {Number(info.SoTienGiam) > 0 && (
              <div style={{ color: 'var(--color-danger)' }}><span style={{ color: 'var(--gray-500)' }}>GIẢM GIÁ ({info.CodeGiamGia}): </span><span>-{Number(info.SoTienGiam).toLocaleString('vi-VN')}đ</span></div>
            )}
            <div><span style={{ color: 'var(--gray-500)' }}>PHÍ VẬN CHUYỂN: </span><span>{Number(info.PhiVanChuyen || 0).toLocaleString('vi-VN')}đ</span></div>
            <div style={{ borderTop: '2px solid #000', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
              <span style={{ color: 'var(--gray-500)', textTransform: 'uppercase', marginRight: '1rem' }}>TỔNG TIỀN PHẢI TRẢ:</span>
              <span style={{ fontSize: '1.875rem', fontWeight: 900 }}>{Number(info.TongTien).toLocaleString('vi-VN')}đ</span>
            </div>
          </div>
        </div>

        {/* Customer Refund Modal */}
        {showRefundModal && (
          <div className="neo-modal-overlay">
            <div className="neo-modal" style={{ maxWidth: '32rem' }}>
              <h2 className="neo-modal-title">Yêu Cầu Hoàn Tiền Đơn Hàng #{info.MaDH}</h2>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '1.25rem', borderBottom: '2px solid #000', paddingBottom: '0.75rem' }}>
                Đơn hàng này đã thanh toán Online ({Number(info.TongTien).toLocaleString('vi-VN')}đ). Vui lòng cung cấp số tài khoản chính xác để Vọc Records chuyển hoàn tiền lại cho bạn.
              </p>
              <form onSubmit={(e) => { e.preventDefault(); executeCancel(refundForm); }} className="auth-form">
                <div className="form-group">
                  <label className="neo-label">Ngân Hàng Nhận Tiền *</label>
                  <select 
                    value={refundForm.nganHang} 
                    onChange={(e) => setRefundForm({ ...refundForm, nganHang: e.target.value })} 
                    className="neo-input"
                    required
                  >
                    <option value="Vietcombank">Vietcombank (VCB)</option>
                    <option value="MB Bank">MB Bank (Quân Đội)</option>
                    <option value="Techcombank">Techcombank (TCB)</option>
                    <option value="VietinBank">VietinBank (CTG)</option>
                    <option value="BIDV">BIDV</option>
                    <option value="ACB">ACB (Á Châu)</option>
                    <option value="VPBank">VPBank</option>
                    <option value="TPBank">TPBank (Tiên Phong)</option>
                    <option value="Sacombank">Sacombank</option>
                    <option value="MoMo">Ví MoMo</option>
                    <option value="Khac">Ngân hàng khác (Ghi rõ vào lý do)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="neo-label">Số Tài Khoản / Số Điện Thoại Ví *</label>
                  <input 
                    type="text" 
                    required 
                    value={refundForm.soTK} 
                    onChange={(e) => setRefundForm({ ...refundForm, soTK: e.target.value })} 
                    className="neo-input" 
                    placeholder="VÍ DỤ: 0123456789" 
                  />
                </div>
                <div className="form-group">
                  <label className="neo-label">Tên Chủ Tài Khoản (VIẾT HOA KHÔNG DẤU) *</label>
                  <input 
                    type="text" 
                    required 
                    value={refundForm.chuTK} 
                    onChange={(e) => setRefundForm({ ...refundForm, chuTK: e.target.value.toUpperCase() })} 
                    className="neo-input" 
                    placeholder="NGUYEN VAN A" 
                  />
                </div>
                <div className="form-group">
                  <label className="neo-label">Lý Do Hủy Đơn</label>
                  <textarea 
                    rows={2} 
                    value={refundForm.lyDo} 
                    onChange={(e) => setRefundForm({ ...refundForm, lyDo: e.target.value })} 
                    className="neo-textarea" 
                    placeholder="Lý do hủy đơn hàng..." 
                  />
                </div>
                <div className="neo-modal-actions" style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
                  <button type="submit" disabled={cancelLoading} className="neo-btn neo-btn--danger" style={{ flex: 1.5 }}>
                    {cancelLoading ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN HỦY & HOÀN TIỀN'}
                  </button>
                  <button type="button" onClick={() => setShowRefundModal(false)} disabled={cancelLoading} className="neo-btn neo-btn--secondary" style={{ flex: 1 }}>
                    ĐÓNG
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
