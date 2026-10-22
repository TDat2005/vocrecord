import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useToast } from '../context/ToastContext';
import { api, NETWORK_ERROR } from '../utils/api';
import { formatPrice } from '../utils/format';
import { Modal } from './ui';
import '../../styles/pages/cart.css';

export const PAYOS_TIMEOUT_SECONDS = 600; // Server tự hủy đơn PayOS chưa thanh toán sau 10 phút.

// Hộp thoại quét mã VietQR, tự kiểm tra trạng thái thanh toán mỗi 3 giây.
// Dùng ở bước thanh toán và ở chi tiết đơn (khách bấm "Thanh toán sau" rồi quay lại trả tiếp).
export function PayosPaymentModal({ payment, onPaid, onExpired, onClose }) {
  const toast = useToast();
  const [secondsLeft, setSecondsLeft] = useState(PAYOS_TIMEOUT_SECONDS);
  const [canceling, setCanceling] = useState(false);
  const [qrImage, setQrImage] = useState('');

  // Vẽ mã VietQR ngay trên trình duyệt (trước đây gửi nội dung QR gồm số tài khoản, số tiền cho dịch vụ ngoài api.qrserver.com).
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(payment.qrCode || '', { width: 300, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => { if (!cancelled) setQrImage(url); })
      .catch(() => { if (!cancelled) setQrImage(''); });
    return () => { cancelled = true; };
  }, [payment.qrCode]);

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
          {qrImage ? <img src={qrImage} alt="Mã QR thanh toán" /> : <p className="text-sm text-muted">Đang tạo mã QR...</p>}
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
