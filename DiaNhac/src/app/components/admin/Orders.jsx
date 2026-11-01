import { useCallback, useEffect, useState } from 'react';
import { Eye, Printer, RefreshCw, Search, Truck } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api, NETWORK_ERROR } from '../../utils/api';
import { formatDateTime, formatOrderCode, formatPrice } from '../../utils/format';
import {
  CANCELLABLE_STATUSES, ORDER_STATUS_OPTIONS, ORDER_STEPS, getOrderStatus, getPaymentStatus, getRefundStatus,
} from '../../utils/status';
import { useDebounced } from '../../hooks/useDebounced';
import { Modal, Pagination, StatusBadge } from '../ui';
import { printInvoice } from './invoice';
import { PageHeader } from './PageHeader';

const parseRefund = (raw) => {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

function RefundDetails({ raw }) {
  const refund = parseRefund(raw);
  if (!refund) return raw ? <span>{raw}</span> : <span>Khách chưa gửi thông tin tài khoản.</span>;
  return (
    <span>
      {refund.nganHang} · <strong>{refund.soTK}</strong> · {refund.chuTK}
      {refund.lyDo && <><br />Lý do: {refund.lyDo}</>}
    </span>
  );
}

function OrderDetailsModal({ order, onClose }) {
  const toast = useToast();
  const { info, items = [] } = order;
  const subtotal = items.reduce((sum, item) => sum + Number(item.DonGia) * Number(item.SoLuong), 0);

  const handlePrint = () => {
    if (!printInvoice(order)) toast.error('Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép popup.');
  };

  return (
    <Modal
      wide
      title={`Đơn hàng ${formatOrderCode(info.MaDH)}`}
      onClose={onClose}
      footer={(
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>Đóng</button>
          <button type="button" className="btn btn--primary" onClick={handlePrint}><Printer size={16} /> In hóa đơn</button>
        </>
      )}
    >
      <div className="stack">
        <div className="inline">
          <StatusBadge status={getOrderStatus(info.TrangThai)} />
          <StatusBadge status={getPaymentStatus(info.TrangThaiTT || 'chuathanhtoan')} />
          <span className="text-muted">Đặt lúc {formatDateTime(info.NgayDat)}</span>
        </div>

        <div className="field-row">
          <div className="card card--subtle">
            <h3 className="card__title">Người nhận</h3>
            <dl className="description-list card__body-gap">
              <dt>Họ tên</dt><dd>{info.NguoiNhan || '—'}</dd>
              <dt>Điện thoại</dt><dd>{info.SDTNhan || '—'}</dd>
              <dt>Địa chỉ</dt><dd>{info.DiaChiGiao || '—'}</dd>
              {info.GhiChu && <><dt>Ghi chú</dt><dd>{info.GhiChu}</dd></>}
            </dl>
          </div>
          <div className="card card--subtle">
            <h3 className="card__title">Thanh toán & vận chuyển</h3>
            <dl className="description-list card__body-gap">
              <dt>Phương thức</dt><dd>{String(info.ThanhToanHinhThuc || info.PhuongThucThanhToan || 'cod').toUpperCase()}</dd>
              <dt>Mã GHN</dt><dd>{info.MaDonGHN || 'Chưa tạo'}</dd>
              {info.GHNTrangThai && <><dt>Trạng thái GHN</dt><dd>{info.GHNTrangThai}</dd></>}
            </dl>
          </div>
        </div>

        {info.TrangThaiHoanTien && info.TrangThaiHoanTien !== 'khongapdung' && (
          <div className="banner banner--warning">
            <div>
              <p className="banner__title">Hoàn tiền: {getRefundStatus(info.TrangThaiHoanTien).label}</p>
              <RefundDetails raw={info.ThongTinHoanTien} />
            </div>
          </div>
        )}

        <div className="table-wrap card card--flush">
          <table className="table">
            <thead><tr><th>Sản phẩm</th><th>Nghệ sĩ</th><th className="is-numeric">SL</th><th className="is-numeric">Đơn giá</th><th className="is-numeric">Thành tiền</th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.MaCTDH}>
                  <td className="font-medium">{item.TenSP}</td>
                  <td className="text-muted">{item.NgheSi || '—'}</td>
                  <td className="is-numeric">{item.SoLuong}</td>
                  <td className="is-numeric">{formatPrice(item.DonGia)}</td>
                  <td className="is-numeric">{formatPrice(Number(item.DonGia) * Number(item.SoLuong))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="stack stack--sm" style={{ marginLeft: 'auto', width: 'min(100%, 20rem)' }}>
          <div className="summary-row"><span className="text-muted">Tạm tính</span><span>{formatPrice(subtotal)}</span></div>
          {Number(info.SoTienGiam) > 0 && (
            <div className="summary-row"><span className="text-muted">Giảm giá ({info.CodeGiamGia || 'Voucher'})</span><span>−{formatPrice(info.SoTienGiam)}</span></div>
          )}
          <div className="summary-row"><span className="text-muted">Phí vận chuyển</span><span>{formatPrice(info.PhiVanChuyen)}</span></div>
          {Number(info.SoTienTinDung) > 0 && (
            <div className="summary-row"><span className="text-muted">Trả bằng ví tín dụng</span><span>−{formatPrice(info.SoTienTinDung)}</span></div>
          )}
          <div className="summary-row summary-row--total"><span>{Number(info.SoTienTinDung) > 0 ? 'Còn phải thu' : 'Tổng cộng'}</span><span>{formatPrice(info.TongTien)}</span></div>
        </div>
      </div>
    </Modal>
  );
}

// Chỉ hiện các trạng thái server cho phép chuyển tới (đi tiếp, hoặc hủy khi chưa giao), giống canTransition ở server.
const FLOW = ORDER_STEPS.map((step) => step.id);
const canMoveTo = (from, to) => (to === 'dahuy'
  ? CANCELLABLE_STATUSES.includes(from)
  : FLOW.indexOf(to) > FLOW.indexOf(from) && FLOW.indexOf(from) !== -1);

export function Orders() {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [paging, setPaging] = useState({ page: 1, total: 0, limit: 50 });
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [details, setDetails] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [page, setPage] = useState(1);
  const keyword = useDebounced(query.trim());

  // Tìm kiếm, lọc và phân trang ở server (trước đây chỉ xem được 100 đơn gần nhất).
  const load = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), limit: '50' });
    if (keyword) params.set('q', keyword);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    api.get(`/orders?${params}`).then((data) => {
      if (!data.success) return;
      setOrders(data.data || []);
      setPaging({ page: data.page || 1, total: data.total ?? (data.data || []).length, limit: data.limit || 50 });
    }).catch(() => toast.error(NETWORK_ERROR));
  }, [toast, page, keyword, statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [keyword, statusFilter]);

  // Chạy một thao tác trên đơn, hiện thông báo rồi tải lại danh sách.
  const runAction = async (orderId, request, successMessage) => {
    setBusyId(orderId);
    try {
      const data = await request();
      if (data.success) {
        toast.success(typeof successMessage === 'function' ? successMessage(data) : successMessage);
        load();
      } else {
        toast.error(data.message || 'Thao tác thất bại');
      }
    } catch {
      toast.error(NETWORK_ERROR);
    } finally {
      setBusyId(null);
    }
  };

  const changeStatus = (order, status) => {
    if (status === 'dahuy' && !window.confirm(`Hủy đơn ${formatOrderCode(order.MaDH)}? Tồn kho sẽ được hoàn lại.`)) return;
    runAction(order.MaDH, () => api.put(`/orders/${order.MaDH}/status`, { status }), `Đã chuyển đơn sang "${getOrderStatus(status).label}"`);
  };

  // Server trả kèm lý do khi GHN lỗi và phải dùng mã giả lập (môi trường thử).
  const createShipment = (order) => runAction(
    order.MaDH,
    () => api.post(`/shipping/orders/${order.MaDH}/create`, {}),
    (data) => data.message || `Đã tạo vận đơn GHN ${data.data?.order_code || ''}`,
  );

  const confirmRefund = (order) => {
    if (!window.confirm(`Xác nhận đã chuyển khoản hoàn tiền cho đơn ${formatOrderCode(order.MaDH)}?`)) return;
    runAction(order.MaDH, () => api.put(`/orders/${order.MaDH}/refund-confirm`), 'Đã xác nhận hoàn tiền');
  };

  const openDetails = async (orderId) => {
    try {
      const data = await api.get(`/orders/${orderId}`);
      if (data.success) setDetails(data.data);
      else toast.error(data.message || 'Không thể tải đơn hàng');
    } catch {
      toast.error(NETWORK_ERROR);
    }
  };

  return (
    <>
      <PageHeader
        title="Đơn hàng"
        subtitle={`${paging.total} đơn hàng`}
        actions={<button type="button" className="btn btn--secondary" onClick={load}><RefreshCw size={16} /> Làm mới</button>}
      />

      <section className="card card--flush">
        <div className="admin-toolbar">
          <label className="admin-search">
            <Search size={16} />
            <input className="input input--sm" type="search" placeholder="Tìm mã đơn, tên khách hoặc số điện thoại" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <select className="select select--sm" style={{ width: 'auto' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Lọc trạng thái">
            <option value="all">Tất cả trạng thái</option>
            {ORDER_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            <option value="refund">Cần hoàn tiền</option>
          </select>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Đơn hàng</th><th>Ngày đặt</th><th>Khách hàng</th><th className="is-numeric">Tổng tiền</th><th>Vận chuyển</th><th>Trạng thái</th><th /></tr>
            </thead>
            <tbody>
              {orders.length === 0 && <tr><td colSpan={7} className="table__empty">Không có đơn hàng phù hợp.</td></tr>}
              {orders.map((order) => {
                const isFinal = ['hoanthanh', 'dahuy'].includes(order.TrangThai);
                const busy = busyId === order.MaDH;
                return (
                  <tr key={order.MaDH}>
                    <td>
                      <button type="button" className="btn btn--plain font-semibold" onClick={() => openDetails(order.MaDH)}>{formatOrderCode(order.MaDH)}</button>
                      {order.TrangThaiHoanTien && order.TrangThaiHoanTien !== 'khongapdung' && (
                        <div><StatusBadge status={getRefundStatus(order.TrangThaiHoanTien)} /></div>
                      )}
                    </td>
                    <td className="nowrap text-muted">{formatDateTime(order.NgayDat)}</td>
                    <td>
                      <div>{order.HoTen || order.NguoiNhan || 'Khách vãng lai'}</div>
                      {order.TrangThaiHoanTien === 'choxuly' && (
                        <div className="refund-box">
                          <RefundDetails raw={order.ThongTinHoanTien} />
                        </div>
                      )}
                    </td>
                    <td className="is-numeric">{formatPrice(order.TongTien)}</td>
                    <td>
                      {order.MaDonGHN ? (
                        <>
                          <div className="font-medium">{order.MaDonGHN}</div>
                          <div className="text-xs text-muted">{order.GHNTrangThai || 'đang đồng bộ'}</div>
                        </>
                      ) : (
                        <span className="text-muted">Chưa tạo</span>
                      )}
                    </td>
                    <td>
                      <select
                        className="select select--sm"
                        value={order.TrangThai}
                        onChange={(e) => changeStatus(order, e.target.value)}
                        disabled={isFinal || busy}
                        aria-label={`Trạng thái đơn ${order.MaDH}`}
                      >
                        {ORDER_STATUS_OPTIONS.filter((option) => option.value === order.TrangThai || canMoveTo(order.TrangThai, option.value)).map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="table-actions">
                        {order.TrangThaiHoanTien === 'choxuly' && (
                          <button type="button" className="btn btn--secondary btn--sm" onClick={() => confirmRefund(order)} disabled={busy}>Đã hoàn tiền</button>
                        )}
                        {!order.MaDonGHN && ['daxacnhan', 'dangchuanbihang'].includes(order.TrangThai) && (
                          <button type="button" className="btn btn--secondary btn--sm" onClick={() => createShipment(order)} disabled={busy} title="Tạo vận đơn giao hàng nhanh">
                            <Truck size={14} /> Tạo GHN
                          </button>
                        )}
                        <button type="button" className="icon-button icon-button--sm" onClick={() => openDetails(order.MaDH)} aria-label="Xem chi tiết"><Eye size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={paging.page} total={paging.total} limit={paging.limit} onChange={setPage} />
        <p className="help-text" style={{ padding: '0.75rem 1rem' }}>
          Tạo vận đơn GHN khi đơn ở trạng thái “Đã xác nhận” hoặc “Đang chuẩn bị”. Trạng thái chỉ được chuyển tiếp, không quay lui.
        </p>
      </section>

      {details && <OrderDetailsModal order={details} onClose={() => setDetails(null)} />}
    </>
  );
}
