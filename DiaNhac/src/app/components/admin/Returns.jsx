import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api, NETWORK_ERROR } from '../../utils/api';
import { formatDateTime, formatOrderCode, formatPrice } from '../../utils/format';
import { RETURN_REASONS, RETURN_STATUS_OPTIONS, getReturnStatus, returnStatusChoices } from '../../utils/status';
import { SafeImage } from '../SafeImage';
import { Modal, Pagination, StatusBadge } from '../ui';
import { PageHeader } from './PageHeader';

// GHN chỉ cho yêu cầu hoàn hàng về shop khi vận đơn đang ở các trạng thái này (giống server).
const GHN_RETURNABLE = ['delivery_fail', 'storing', 'waiting_to_return', 'return'];

// Chỉ mở link http(s): khách tự nhập nên có thể chứa "javascript:".
function Evidence({ value }) {
  if (!value) return null;
  return /^https?:\/\//i.test(value)
    ? <a href={value} target="_blank" rel="noopener noreferrer" className="link text-xs">Xem bằng chứng</a>
    : <div className="text-xs text-muted">Bằng chứng: {value}</div>;
}

function ReturnDetailModal({ id, onClose, onSaved }) {
  const toast = useToast();
  const [item, setItem] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/returns/${id}`).then((data) => {
      if (!data.success) return toast.error(data.message || 'Không tải được yêu cầu');
      setItem(data.data);
      setForm({ status: data.data.status, refund_amount: Number(data.data.refund_amount) || 0, admin_note: data.data.admin_note || '', triggerGhnReturn: false });
    }).catch(() => toast.error(NETWORK_ERROR));
  }, [id, toast]);

  const save = async (event) => {
    event.preventDefault();
    if (form.status === 'hoantat' && item.status !== 'hoantat'
      && !window.confirm('Hoàn tất yêu cầu sẽ cộng lại tồn kho cho sản phẩm trả về và hoàn phần ví tín dụng. Tiếp tục?')) return;
    setSaving(true);
    try {
      const data = await api.put(`/returns/${id}/status`, form);
      if (data.success) {
        toast.success(data.message);
        onSaved();
      } else {
        toast.error(data.message || 'Không thể cập nhật yêu cầu');
      }
    } catch {
      toast.error(NETWORK_ERROR);
    } finally {
      setSaving(false);
    }
  };

  const finished = item?.status === 'hoantat';
  const paidTotal = item ? Number(item.order_total) + Number(item.order_credit || 0) : 0;

  return (
    <Modal
      wide
      title={`Yêu cầu trả hàng YCT-${id}`}
      onClose={onClose}
      footer={item && (
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>Đóng</button>
          {!finished && <button type="submit" form="return-form" className="btn btn--primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>}
        </>
      )}
    >
      {!item || !form ? <p className="loading-text">Đang tải...</p> : (
        <div className="stack">
          <div className="inline inline--between">
            <StatusBadge status={getReturnStatus(item.status)} />
            <span className="text-sm text-muted">Gửi {formatDateTime(item.created_at)}</span>
          </div>
          <dl className="description-list">
            <dt>Đơn hàng</dt><dd>{formatOrderCode(item.order_id)} · đã trả {formatPrice(paidTotal)}{item.ghn_order_code ? ` · GHN ${item.ghn_order_code} (${item.ghn_status || '—'})` : ''}</dd>
            <dt>Khách hàng</dt><dd>{item.customer_name} · {item.customer_phone || 'chưa có SĐT'} · {item.customer_email}</dd>
            <dt>Lý do</dt><dd>{RETURN_REASONS[item.reason] || item.reason}</dd>
            <dt>Mô tả</dt><dd className="pre-wrap">{item.description}<Evidence value={item.evidence} /></dd>
          </dl>

          {item.photos?.length > 0 && (
            <div className="photo-strip">
              {item.photos.map((url, index) => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="photo-strip__item">
                  <img src={url} alt={`Ảnh bằng chứng ${index + 1}`} />
                </a>
              ))}
            </div>
          )}

          <div className="table-wrap card card--flush">
            <table className="table">
              <thead><tr><th>Sản phẩm trả</th><th className="is-numeric">Số lượng</th></tr></thead>
              <tbody>
                {item.items.map((line) => (
                  <tr key={line.product_id}>
                    <td><div className="table-product"><SafeImage src={line.image} alt="" /><span className="font-medium">{line.product_title}</span></div></td>
                    <td className="is-numeric">{line.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form id="return-form" className="form" onSubmit={save}>
            <div className="field-row">
              <label className="field">
                <span className="label">Trạng thái</span>
                <select className="select" value={form.status} disabled={finished} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {returnStatusChoices(item.status).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <span className="help-text">Chỉ chuyển được sang bước kế tiếp: Mới → Đang xử lý → Chấp nhận/Từ chối → Đang hoàn → Hoàn tất.</span>
              </label>
              <label className="field">
                <span className="label">Số tiền hoàn (VNĐ)</span>
                <input className="input" type="number" min={0} max={paidTotal} step={1000} disabled={finished} value={form.refund_amount} onChange={(e) => setForm({ ...form, refund_amount: e.target.value })} />
                <span className="help-text">Phần khách trả bằng ví tín dụng được hoàn vào ví khi hoàn tất, phần còn lại cửa hàng chuyển khoản cho khách.</span>
              </label>
            </div>
            <label className="field">
              <span className="label">Ghi chú cho khách</span>
              <textarea className="textarea" rows={2} maxLength={2000} disabled={finished} value={form.admin_note} onChange={(e) => setForm({ ...form, admin_note: e.target.value })} placeholder="VD: đã nhận hàng, sẽ hoàn tiền trong 3 ngày" />
            </label>
            {item.ghn_order_code && GHN_RETURNABLE.includes(String(item.ghn_status || '').toLowerCase()) && !finished && (
              <label className="checkbox-label">
                <input type="checkbox" checked={form.triggerGhnReturn} onChange={(e) => setForm({ ...form, triggerGhnReturn: e.target.checked })} />
                Yêu cầu GHN hoàn hàng về cửa hàng
              </label>
            )}
            {finished && <p className="text-sm text-muted">Yêu cầu đã hoàn tất: tồn kho đã cộng lại, không thể chỉnh sửa.</p>}
          </form>
        </div>
      )}
    </Modal>
  );
}

export function Returns() {
  const toast = useToast();
  const [returns, setReturns] = useState([]);
  const [paging, setPaging] = useState({ page: 1, total: 0, limit: 50 });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [openId, setOpenId] = useState(null);

  const load = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), limit: '50' });
    if (statusFilter) params.set('status', statusFilter);
    api.get(`/returns/manage?${params}`).then((data) => {
      if (!data.success) return;
      setReturns(data.data || []);
      setPaging({ page: data.page || 1, total: data.total ?? 0, limit: data.limit || 50 });
    }).catch(() => toast.error(NETWORK_ERROR));
  }, [toast, page, statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [statusFilter]);

  return (
    <>
      <PageHeader
        title="Trả hàng / khiếu nại"
        subtitle="Duyệt lỗi/sai hàng trước, chuyển sang “Đang hoàn”, rồi “Hoàn tất” khi đã nhận lại hàng. Kho chỉ cộng lại ở bước Hoàn tất."
        actions={<button type="button" className="btn btn--secondary" onClick={load}><RefreshCw size={16} /> Làm mới</button>}
      />
      <section className="card card--flush">
        <div className="admin-toolbar">
          <select className="select select--sm" style={{ width: 'auto' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Lọc trạng thái">
            <option value="">Tất cả trạng thái</option>
            {RETURN_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Yêu cầu</th><th>Đơn hàng</th><th>Khách hàng</th><th>Lý do</th><th className="is-numeric">Số tiền hoàn</th><th>Trạng thái</th></tr></thead>
            <tbody>
              {returns.length === 0 && <tr><td colSpan={6} className="table__empty">Chưa có yêu cầu trả hàng.</td></tr>}
              {returns.map((item) => (
                <tr key={item.id} className="table__row--clickable" onClick={() => setOpenId(item.id)}>
                  <td>
                    <div className="font-medium">YCT-{item.id}</div>
                    <div className="text-xs text-muted">{formatDateTime(item.created_at)}</div>
                  </td>
                  <td>
                    <div>{formatOrderCode(item.order_id)}</div>
                    <div className="text-xs text-muted">{item.ghn_order_code || 'Chưa có mã GHN'}</div>
                  </td>
                  <td>
                    <div>{item.customer_name}</div>
                    <div className="text-xs text-muted">{item.customer_email}</div>
                  </td>
                  <td style={{ minWidth: '14rem' }}>
                    <div className="font-medium">{RETURN_REASONS[item.reason] || item.reason}</div>
                    <div className="text-xs text-muted pre-wrap line-clamp-2">{item.description}</div>
                  </td>
                  <td className="is-numeric">{formatPrice(item.refund_amount)}</td>
                  <td><StatusBadge status={getReturnStatus(item.status)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={paging.page} total={paging.total} limit={paging.limit} onChange={setPage} />
      </section>

      {openId && <ReturnDetailModal id={openId} onClose={() => setOpenId(null)} onSaved={() => { setOpenId(null); load(); }} />}
    </>
  );
}
