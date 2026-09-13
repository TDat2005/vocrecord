import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router';
import { CheckCircle2, XCircle, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';

export function PaymentResult() {
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();
  const [status, setStatus] = useState<'success' | 'cancel' | 'loading'>('loading');
  const [displayOrderCode, setDisplayOrderCode] = useState<string | null>(null);

  useEffect(() => {
    // Parse params from both react-router useSearchParams and window.location.search (for redirects)
    const windowParams = new URLSearchParams(window.location.search);
    const cancelParam = searchParams.get('cancel') || windowParams.get('cancel');
    const statusParam = searchParams.get('status') || windowParams.get('status');
    const codeParam = searchParams.get('code') || windowParams.get('code');
    const orderCode = searchParams.get('orderCode') || windowParams.get('orderCode');

    if (orderCode) {
      setDisplayOrderCode(orderCode);
    }

    if (cancelParam === 'true' || statusParam === 'CANCELLED') {
      setStatus('cancel');
    } else if (codeParam === '00' || statusParam === 'PAID' || orderCode) {
      setStatus('success');
      clearCart();
    } else {
      setStatus('cancel');
    }
  }, [searchParams, clearCart]);

  return (
    <div className="page page--gray page-centered" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div className="neo-box neo-box--thick" style={{ padding: '2.5rem', maxWidth: '32rem', width: '100%', textAlign: 'center', boxShadow: '12px 12px 0 0 rgba(0,0,0,1)' }}>
        {status === 'loading' && (
          <div style={{ padding: '2rem 0' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, textTransform: 'uppercase' }}>Đang xác thực kết quả thanh toán...</h2>
          </div>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 style={{ width: 88, height: 88, color: '#22c55e', margin: '0 auto 1.25rem' }} />
            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)' }}>
              Thanh Toán Thành Công!
            </h2>
            {displayOrderCode && (
              <div style={{ background: '#f0fdf4', border: '2px solid #22c55e', padding: '0.6rem 1rem', marginBottom: '1.25rem', fontWeight: 900, fontSize: '1rem', color: '#15803d' }}>
                MÃ ĐƠN HÀNG: #{displayOrderCode}
              </div>
            )}
            <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--gray-700)', marginBottom: '1.75rem', borderTop: '2px solid #000', borderBottom: '2px solid #000', padding: '1rem 0', lineHeight: 1.6 }}>
              Cảm ơn bạn đã mua sắm tại Vọc Records. Hệ thống đã xác nhận thanh toán và đang chuẩn bị gửi hàng cho bạn.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {displayOrderCode ? (
                <Link to={`/order/${displayOrderCode}`} className="neo-btn neo-btn--primary neo-btn--full">
                  XEM CHI TIẾT ĐƠN HÀNG
                </Link>
              ) : (
                <Link to="/account" className="neo-btn neo-btn--primary neo-btn--full">
                  QUẢN LÝ ĐƠN HÀNG
                </Link>
              )}
              <Link to="/shop" className="neo-btn neo-btn--secondary neo-btn--full">
                TIẾP TỤC MUA SẮM
              </Link>
            </div>
          </>
        )}

        {status === 'cancel' && (
          <>
            <XCircle style={{ width: 88, height: 88, color: 'var(--color-danger)', margin: '0 auto 1.25rem' }} />
            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)' }}>
              Giao Dịch Chưa Hoàn Tất
            </h2>
            {displayOrderCode && (
              <div style={{ background: '#fef2f2', border: '2px solid var(--color-danger)', padding: '0.6rem 1rem', marginBottom: '1.25rem', fontWeight: 900, fontSize: '1rem', color: '#b91c1c' }}>
                ĐƠN HÀNG: #{displayOrderCode}
              </div>
            )}
            <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--gray-700)', marginBottom: '1.75rem', borderTop: '2px solid #000', borderBottom: '2px solid #000', padding: '1rem 0', lineHeight: 1.6 }}>
              Giao dịch trực tuyến đã bị hủy hoặc chưa hoàn tất thanh toán. Bạn có thể kiểm tra lại đơn hàng hoặc tiến hành thanh toán lại.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link to="/cart" className="neo-btn neo-btn--yellow neo-btn--full">
                QUAY LẠI GIỎ HÀNG
              </Link>
              <Link to="/account" className="neo-btn neo-btn--secondary neo-btn--full">
                XEM ĐƠN HÀNG TRONG TÀI KHOẢN
              </Link>
              <Link to="/shop" className="neo-btn neo-btn--secondary neo-btn--full" style={{ border: '2px dashed #000' }}>
                VỀ CỬA HÀNG
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
