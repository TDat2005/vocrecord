import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api, NETWORK_ERROR } from '../../utils/api';
import { formatDateTime, formatOrderCode, formatPrice } from '../../utils/format';
import { RETURN_REASONS, RETURN_STATUS_OPTIONS, getReturnStatus } from '../../utils/status';
import { StatusBadge } from '../ui';
import { PageHeader } from './PageHeader';

export function Returns() {
  const toast = useToast();
  const [returns, setReturns] = useState([]);

  const load = useCallback(() => {
    api.get('/returns/manage').then((data) => { if (data.success) setReturns(data.data || []); }).catch(() => toast.error(NETWORK_ERROR));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const changeStatus = async (item, status) => {
    if (status === 'hoantat' && !window.confirm('Hoàn tất yêu cầu sẽ cộng lại tồn kho cho sản phẩm trả về. Tiếp tục?')) return;
    try {
      const data = await api.put(`/returns/${item.id}/status`, { status });
      if (data.success) {
        toast.success(data.wallet_refund ? data.message : `Đã chuyển yêu cầu sang "${getReturnStatus(status).label}"`);
        load();
      } else {
        toast.error(data.message || 'Không thể cập nhật yêu cầu');
      }
    } catch {
      toast.error(NETWORK_ERROR);
    }
  };

  return (
    <>
      <PageHeader
        title="Trả hàng / khiếu nại"
        subtitle="Duyệt lỗi/sai hàng trước, chuyển sang “Đang hoàn”, rồi “Hoàn tất” khi đã nhận lại hàng. Kho chỉ cộng lại ở bước Hoàn tất."
        actions={<button type="button" className="btn btn--secondary" onClick={load}><RefreshCw size={16} /> Làm mới</button>}
      />
      <section className="card card--flush">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Yêu cầu</th><th>Đơn hàng</th><th>Khách hàng</th><th>Lý do</th><th className="is-numeric">Số tiền hoàn</th><th>Trạng thái</th></tr></thead>
            <tbody>
              {returns.length === 0 && <tr><td colSpan={6} className="table__empty">Chưa có yêu cầu trả hàng.</td></tr>}
              {returns.map((item) => (
                <tr key={item.id}>
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
                    <div className="text-xs text-muted pre-wrap">{item.description}</div>
                    {/* Chỉ mở link http(s): khách tự nhập nên có thể chứa "javascript:" */}
                    {/^https?:\/\//i.test(item.evidence || '')
                      ? <a href={item.evidence} target="_blank" rel="noopener noreferrer" className="link text-xs">Xem bằng chứng</a>
                      : item.evidence && <div className="text-xs text-muted">Bằng chứng: {item.evidence}</div>}
                  </td>
                  <td className="is-numeric">{formatPrice(item.refund_amount)}</td>
                  <td>
                    <div className="stack stack--sm">
                      <StatusBadge status={getReturnStatus(item.status)} />
                      <select
                        className="select select--sm"
                        value={item.status}
                        onChange={(e) => changeStatus(item, e.target.value)}
                        disabled={item.status === 'hoantat'}
                        aria-label={`Trạng thái yêu cầu ${item.id}`}
                      >
                        {RETURN_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
