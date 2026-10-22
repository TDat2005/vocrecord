import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { ArrowLeft, Check, QrCode, Truck } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useOrderCancel } from '../components/OrderCancel';
import { PayosPaymentModal } from '../components/PayosPaymentModal';
import { SafeImage } from '../components/SafeImage';
import { EmptyState, StatusBadge } from '../components/ui';
import { api, NETWORK_ERROR } from '../utils/api';
import { useCurrentUser } from '../utils/auth';
import { formatDateTime, formatPrice } from '../utils/format';
import {
  CANCELLABLE_STATUSES, ORDER_STEPS, RETURN_REASONS,
  getOrderStatus, getPaymentStatus, getRefundStatus, getReturnStatus,
} from '../utils/status';
import '../../styles/pages/account.css';

function parseRefundInfo(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function OrderTimeline({ status }) {
  const current = ORDER_STEPS.findIndex((step) => step.id === status);
  return (
    <ol className="timeline">
      {ORDER_STEPS.map((step, index) => {
        const state = index < current ? 'done' : index === current ? 'current' : 'todo';
        return (
          <li key={step.id} className={`timeline__step timeline__step--${state}`}>
            <span className="timeline__dot">{state === 'todo' ? index + 1 : <Check size={14} />}</span>
            <span className="timeline__label">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function ReturnRequestCard({ order, items, request, onCreated }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ reason: 'hang_loi', description: '', evidence: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.description.trim()) {
      toast.error('Vui lòng mô tả vấn đề của sản phẩm.');
      return;
    }
    setSubmitting(true);
    try {
      const data = await api.post('/returns', {
        order_id: order.MaDH,
        reason: form.reason,
        description: form.description,
        evidence: form.evidence,
        items: items.map((item) => ({ detail_id: item.MaCTDH, quantity: item.SoLuong })),
      });
      if (!data.success) {
        toast.error(data.message || 'Không thể gửi yêu cầu trả hàng');
        return;
      }
      toast.success('Đã gửi yêu cầu trả hàng. Cửa hàng sẽ liên hệ xác nhận.');
      setOpen(false);
      onCreated({ status: 'moi', reason: form.reason, description: form.description });
    } catch {
      toast.error(NETWORK_ERROR);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="card">
      <h2 className="card__title">Trả hàng / báo lỗi</h2>
      <div className="card__body-gap">
        {request ? (
          <div className="inline">
            <span>Yêu cầu trả hàng ({RETURN_REASONS[request.reason] || request.reason}):</span>
            <StatusBadge status={getReturnStatus(request.status)} />
          </div>
        ) : order.TrangThai !== 'hoanthanh' ? (
          <p className="text-muted">Bạn có thể gửi yêu cầu trả hàng sau khi đơn đã giao thành công.</p>
        ) : !open ? (
          <div className="stack stack--sm">
            <p className="text-muted">Nếu sản phẩm lỗi, sai hàng hoặc hư hỏng khi vận chuyển, bạn có thể gửi yêu cầu trong thời hạn đổi trả.</p>
            <div><button type="button" className="btn btn--secondary" onClick={() => setOpen(true)}>Tạo yêu cầu trả hàng</button></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="form">
            <label className="field">
              <span className="label">Lý do</span>
              <select className="select" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
                {Object.entries(RETURN_REASONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="label">Mô tả vấn đề</span>
              <textarea className="textarea" required minLength={10} rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Tình trạng đĩa, bìa, phụ kiện..." />
            </label>
            <label className="field">
              <span className="label">Link ảnh/video bằng chứng (nếu có)</span>
              <input className="input" value={form.evidence} onChange={(e) => setForm({ ...form, evidence: e.target.value })} />
            </label>
            <div className="button-group">
              <button type="submit" className="btn btn--primary" disabled={submitting}>{submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}</button>
              <button type="button" className="btn btn--secondary" onClick={() => setOpen(false)}>Hủy</button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

export function OrderDetail() {
  const { id } = useParams();
  const user = useCurrentUser();
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [returnRequest, setReturnRequest] = useState(null);
  const [paying, setPaying] = useState(false);
  const toast = useToast();

  const loadOrder = useCallback(async () => {
    try {
      const data = await api.get(`/orders/${id}`);
      setOrderData(data.success ? data.data : null);
      if (data.success) {
        const returns = await api.get('/returns/mine').catch(() => null);
        if (returns?.success) {
          setReturnRequest((returns.data || []).find((item) => String(item.order_id) === String(id)) || null);
        }
      }
    } catch {
      setOrderData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (user) loadOrder();
  }, [user, loadOrder]);

  const { startCancel, refundModal, canceling } = useOrderCancel({
    defaultName: orderData?.info?.NguoiNhan,
    onCancelled: loadOrder,
  });

  if (!user) return <Navigate to="/login" state={{ returnUrl: `/order/${id}` }} replace />;
  if (loading) return <p className="loading-text">Đang tải đơn hàng...</p>;

  if (!orderData?.info) {
    return (
      <div className="page">
        <EmptyState title="Không tìm thấy đơn hàng" action={<Link to="/account?tab=orders" className="btn btn--primary">Về danh sách đơn hàng</Link>} />
      </div>
    );
  }

  const { info, items, payment } = orderData;
  const isCanceled = info.TrangThai === 'dahuy';
  const refundInfo = parseRefundInfo(info.ThongTinHoanTien);
  const itemsSubtotal = items.reduce((sum, item) => sum + Number(item.DonGia) * Number(item.SoLuong), 0);
  const paymentMethod = info.ThanhToanHinhThuc || info.PhuongThucThanhToan || 'cod';

  return (
    <div className="page page--subtle">
      <div className="container order-page">
        <Link to="/account?tab=orders" className="back-link"><ArrowLeft size={16} /> Đơn hàng của tôi</Link>

        <div className="page-header page-header--row">
          <div>
            <div className="inline">
              <h1 className="page-title">Đơn hàng #{info.MaDH}</h1>
              <StatusBadge status={getOrderStatus(info.TrangThai)} />
            </div>
            <p className="page-subtitle">Đặt lúc {formatDateTime(info.NgayDat)}</p>
          </div>
          {!isCanceled && CANCELLABLE_STATUSES.includes(info.TrangThai) && (
            info.MaDonGHN
              ? <span className="text-sm text-muted">Đã tạo vận đơn GHN — liên hệ cửa hàng nếu cần hủy</span>
              : <button type="button" className="btn btn--secondary" onClick={() => startCancel(info)} disabled={canceling}>Hủy đơn hàng</button>
          )}
        </div>

        {payment && (
          <div className="banner banner--warning order-pay-banner">
            <div>
              <p className="banner__title">Đơn hàng đang chờ thanh toán VietQR</p>
              <p className="text-sm">Thanh toán trước {formatDateTime(payment.expiresAt)}, quá hạn đơn sẽ tự hủy.</p>
            </div>
            <button type="button" className="btn btn--primary" onClick={() => setPaying(true)}><QrCode size={16} /> Thanh toán ngay</button>
          </div>
        )}

        <div className="order-layout">
          <div className="stack">
            <section className="card">
              <h2 className="card__title">Trạng thái đơn hàng</h2>
              <div className="card__body-gap stack">
                {isCanceled ? (
                  <div className="banner banner--critical">Đơn hàng đã bị hủy.</div>
                ) : (
                  <OrderTimeline status={info.TrangThai} />
                )}
                {info.TrangThaiHoanTien === 'choxuly' && (
                  <div className="banner banner--warning">
                    <div>
                      <p className="banner__title">Đang chờ cửa hàng hoàn tiền</p>
                      <p>Vọc Records đang đối soát và sẽ chuyển hoàn tiền vào tài khoản của bạn sớm nhất.</p>
                      {refundInfo && (
                        <p>{refundInfo.nganHang} · {refundInfo.soTK} · {refundInfo.chuTK}</p>
                      )}
                    </div>
                  </div>
                )}
                {info.TrangThaiHoanTien === 'dahoantien' && (
                  <div className="banner banner--success">
                    <div>
                      <p className="banner__title">Đã hoàn tiền</p>
                      <p>Cửa hàng đã chuyển tiền hoàn trả. Vui lòng kiểm tra biến động số dư.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="card">
              <h2 className="card__title">Sản phẩm</h2>
              <ul className="order-items">
                {items.map((item) => (
                  <li key={item.MaCTDH} className="order-item">
                    <Link to={`/product/${item.MaSP}`} className="order-item__image"><SafeImage src={item.HinhAnh} alt={item.TenSP} /></Link>
                    <div className="order-item__info">
                      <Link to={`/product/${item.MaSP}`} className="font-medium line-clamp-2">{item.TenSP}</Link>
                      {item.NgheSi && <p className="text-sm text-muted">{item.NgheSi}</p>}
                      <p className="text-sm text-muted">{formatPrice(item.DonGia)} × {item.SoLuong}</p>
                    </div>
                    <span className="nowrap">{formatPrice(Number(item.DonGia) * Number(item.SoLuong))}</span>
                  </li>
                ))}
              </ul>
              <div className="stack stack--sm order-totals">
                <div className="summary-row"><span className="text-muted">Tạm tính</span><span>{formatPrice(itemsSubtotal)}</span></div>
                {Number(info.SoTienGiam) > 0 && (
                  <div className="summary-row"><span className="text-muted">Giảm giá ({info.CodeGiamGia})</span><span>−{formatPrice(info.SoTienGiam)}</span></div>
                )}
                <div className="summary-row"><span className="text-muted">Phí vận chuyển</span><span>{formatPrice(info.PhiVanChuyen)}</span></div>
                {Number(info.SoTienTinDung) > 0 && (
                  <div className="summary-row"><span className="text-muted">Trả bằng ví tín dụng</span><span>−{formatPrice(info.SoTienTinDung)}</span></div>
                )}
                <div className="summary-row summary-row--total"><span>{Number(info.SoTienTinDung) > 0 ? 'Còn phải thanh toán' : 'Tổng cộng'}</span><span>{formatPrice(info.TongTien)}</span></div>
              </div>
            </section>

            <ReturnRequestCard order={info} items={items} request={returnRequest} onCreated={setReturnRequest} />
          </div>

          <div className="stack">
            <section className="card">
              <h2 className="card__title"><Truck size={18} /> Giao hàng</h2>
              <dl className="description-list card__body-gap">
                <dt>Người nhận</dt><dd>{info.NguoiNhan || '—'}</dd>
                <dt>Điện thoại</dt><dd>{info.SDTNhan || '—'}</dd>
                <dt>Địa chỉ</dt><dd>{info.DiaChiGiao}</dd>
                <dt>Ghi chú</dt><dd>{info.GhiChu || 'Không có'}</dd>
                {info.MaDonGHN && <><dt>Mã GHN</dt><dd>{info.MaDonGHN} · {info.GHNTrangThai || 'đang đồng bộ'}</dd></>}
                {info.GHNExpectedDelivery && <><dt>Dự kiến giao</dt><dd>{formatDateTime(info.GHNExpectedDelivery)}</dd></>}
              </dl>
            </section>

            <section className="card">
              <h2 className="card__title">Thanh toán</h2>
              <dl className="description-list card__body-gap">
                <dt>Phương thức</dt><dd>{paymentMethod === 'payos' ? 'Chuyển khoản VietQR (PayOS)' : paymentMethod === 'tindung' ? 'Ví tín dụng Vọc Records' : 'Thanh toán khi nhận hàng'}</dd>
                <dt>Trạng thái</dt><dd><StatusBadge status={getPaymentStatus(info.TrangThaiTT || 'chuathanhtoan')} /></dd>
                {info.TrangThaiHoanTien && info.TrangThaiHoanTien !== 'khongapdung' && (
                  <><dt>Hoàn tiền</dt><dd><StatusBadge status={getRefundStatus(info.TrangThaiHoanTien)} /></dd></>
                )}
              </dl>
            </section>
          </div>
        </div>
      </div>
      {refundModal}
      {paying && payment && (
        <PayosPaymentModal
          payment={payment}
          onPaid={() => { setPaying(false); toast.success('Đã nhận thanh toán, cảm ơn bạn!'); loadOrder(); }}
          onExpired={(message) => { setPaying(false); toast.error(message); loadOrder(); }}
          onClose={() => { setPaying(false); loadOrder(); }}
        />
      )}
    </div>
  );
}
