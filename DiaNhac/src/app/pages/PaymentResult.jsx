import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { api } from '../utils/api';
import { getToken } from '../utils/auth';
import '../../styles/pages/cart.css';

// PayOS chuyển về /payment-result?order_id=<MaDH>&code=00&status=PAID&orderCode=<mã PayOS>...
// Mã orderCode của PayOS KHÁC mã đơn hàng, nên luôn dùng order_id và hỏi lại server trạng thái thật.
export function PaymentResult() {
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();
  const [status, setStatus] = useState('loading');
  const orderId = searchParams.get('order_id');

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const read = (key) => searchParams.get(key) || params.get(key);
    const cancelledByUser = read('cancel') === 'true' || read('status') === 'CANCELLED';
    const paidByParams = read('code') === '00' && read('status') === 'PAID';

    const finish = (result) => {
      if (cancelled) return;
      setStatus(result);
      if (result === 'success') clearCart();
    };

    if (cancelledByUser) {
      finish('cancel');
    } else if (orderId && getToken()) {
      api.get(`/orders/${orderId}/status`)
        .then((data) => {
          if (data.success && data.status === 'dathanhtoan') finish('success');
          else if (data.status === 'dahuy' || data.status === 'thatbai') finish('cancel');
          else finish(paidByParams ? 'pending' : 'cancel');
        })
        .catch(() => finish(paidByParams ? 'pending' : 'cancel'));
    } else {
      finish(paidByParams ? 'pending' : 'cancel');
    }

    return () => { cancelled = true; };
  }, [searchParams, orderId, clearCart]);

  const content = {
    loading: { icon: Clock, tone: 'muted', title: 'Đang xác thực kết quả thanh toán...', text: '' },
    success: {
      icon: CheckCircle2,
      tone: 'success',
      title: 'Thanh toán thành công',
      text: 'Cảm ơn bạn đã mua sắm tại Vọc Records. Cửa hàng đã ghi nhận thanh toán và đang chuẩn bị đơn hàng của bạn.',
    },
    pending: {
      icon: Clock,
      tone: 'muted',
      title: 'Đang chờ xác nhận thanh toán',
      text: 'PayOS đã báo giao dịch thành công, hệ thống sẽ cập nhật đơn hàng trong ít phút. Bạn có thể xem trạng thái trong mục Đơn hàng.',
    },
    cancel: {
      icon: XCircle,
      tone: 'critical',
      title: 'Giao dịch chưa hoàn tất',
      text: 'Giao dịch đã bị hủy hoặc chưa được thanh toán. Bạn có thể kiểm tra lại đơn hàng hoặc đặt hàng lại.',
    },
  }[status];
  const Icon = content.icon;

  return (
    <div className="page page--subtle">
      <div className="container container--narrow">
        <div className="card payment-result">
          <Icon size={56} strokeWidth={1.5} className={`payment-result__icon payment-result__icon--${content.tone}`} />
          <h1 className="payment-result__title">{content.title}</h1>
          {orderId && status !== 'loading' && <p className="text-muted">Đơn hàng #{orderId}</p>}
          {content.text && <p className="payment-result__text">{content.text}</p>}
          {status !== 'loading' && (
            <div className="button-group payment-result__actions">
              {orderId
                ? <Link to={`/order/${orderId}`} className="btn btn--primary">Xem chi tiết đơn hàng</Link>
                : <Link to="/account?tab=orders" className="btn btn--primary">Xem đơn hàng</Link>}
              {status === 'cancel'
                ? <Link to="/cart" className="btn btn--secondary">Quay lại giỏ hàng</Link>
                : <Link to="/shop" className="btn btn--secondary">Tiếp tục mua sắm</Link>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
