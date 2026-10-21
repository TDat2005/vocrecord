import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { api, NETWORK_ERROR } from '../utils/api';
import { formatPrice } from '../utils/format';
import { Modal } from './ui';

const BANKS = [
  ['Vietcombank', 'Vietcombank (VCB)'],
  ['MB Bank', 'MB Bank (Quân Đội)'],
  ['Techcombank', 'Techcombank (TCB)'],
  ['VietinBank', 'VietinBank (CTG)'],
  ['BIDV', 'BIDV'],
  ['ACB', 'ACB (Á Châu)'],
  ['VPBank', 'VPBank'],
  ['TPBank', 'TPBank (Tiên Phong)'],
  ['Sacombank', 'Sacombank'],
  ['MoMo', 'Ví MoMo'],
  ['Khac', 'Ngân hàng khác (ghi rõ ở lý do)'],
];

function RefundFormModal({ order, defaultName, submitting, onSubmit, onClose }) {
  const [form, setForm] = useState({
    nganHang: 'Vietcombank',
    soTK: '',
    chuTK: String(defaultName || '').toUpperCase(),
    lyDo: 'Đổi ý không muốn mua nữa',
  });
  const update = (changes) => setForm((current) => ({ ...current, ...changes }));

  return (
    <Modal
      title={`Hủy đơn hàng #${order.MaDH}`}
      onClose={submitting ? undefined : onClose}
      footer={(
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose} disabled={submitting}>Đóng</button>
          <button type="submit" form="refund-form" className="btn btn--critical" disabled={submitting}>
            {submitting ? 'Đang xử lý...' : 'Hủy đơn & yêu cầu hoàn tiền'}
          </button>
        </>
      )}
    >
      <form id="refund-form" className="form" onSubmit={(event) => { event.preventDefault(); onSubmit(form); }}>
        <div className="banner banner--info">
          Đơn hàng đã thanh toán online {formatPrice(order.TongTien)}. Vui lòng cung cấp tài khoản nhận tiền để Vọc Records hoàn tiền cho bạn.
        </div>
        <label className="field">
          <span className="label">Ngân hàng nhận tiền</span>
          <select className="select" value={form.nganHang} onChange={(e) => update({ nganHang: e.target.value })} required>
            {BANKS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="label">Số tài khoản / số điện thoại ví</span>
          <input className="input" required value={form.soTK} onChange={(e) => update({ soTK: e.target.value })} placeholder="0123456789" />
        </label>
        <label className="field">
          <span className="label">Tên chủ tài khoản (viết hoa không dấu)</span>
          <input className="input" required value={form.chuTK} onChange={(e) => update({ chuTK: e.target.value.toUpperCase() })} placeholder="NGUYEN VAN A" />
        </label>
        <label className="field">
          <span className="label">Lý do hủy đơn</span>
          <textarea className="textarea" rows={2} value={form.lyDo} onChange={(e) => update({ lyDo: e.target.value })} />
        </label>
      </form>
    </Modal>
  );
}

// Quy trình khách hủy đơn: chặn khi đã có vận đơn GHN, hỏi thông tin hoàn tiền nếu đã thanh toán online.
export function useOrderCancel({ defaultName, onCancelled }) {
  const toast = useToast();
  const [refundOrder, setRefundOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const executeCancel = async (orderId, refundPayload = {}) => {
    setSubmitting(true);
    try {
      const data = await api.put(`/orders/${orderId}/cancel`, refundPayload);
      if (data.success) {
        toast.success(data.message || 'Đã hủy đơn hàng.');
        setRefundOrder(null);
        onCancelled?.();
      } else {
        toast.error(data.message || 'Không thể hủy đơn hàng');
      }
    } catch {
      toast.error(NETWORK_ERROR);
    } finally {
      setSubmitting(false);
    }
  };

  const startCancel = (order) => {
    if (order.MaDonGHN) {
      toast.error(`Đơn đã có mã vận đơn GHN (${order.MaDonGHN}). Vui lòng liên hệ cửa hàng để được hỗ trợ hủy.`);
      return;
    }
    const paymentMethod = order.ThanhToanHinhThuc || order.PhuongThucThanhToan;
    if (paymentMethod === 'payos' && order.TrangThaiTT === 'dathanhtoan') {
      setRefundOrder(order);
      return;
    }
    if (window.confirm(`Bạn chắc chắn muốn hủy đơn hàng #${order.MaDH}?`)) executeCancel(order.MaDH);
  };

  const refundModal = refundOrder && (
    <RefundFormModal
      order={refundOrder}
      defaultName={defaultName}
      submitting={submitting}
      onSubmit={(payload) => executeCancel(refundOrder.MaDH, payload)}
      onClose={() => setRefundOrder(null)}
    />
  );

  return { startCancel, refundModal, canceling: submitting };
}
