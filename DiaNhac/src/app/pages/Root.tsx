
import { Outlet, Link } from 'react-router';
import { Header } from '../components/Header';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { ScrollToTop } from '../components/ScrollToTop';
import { useState } from 'react';
import { Mail, Send, ArrowUp } from 'lucide-react';
import { useEffect } from 'react';
import '../../styles/pages/root.css';

export function Root() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [showTopBtn, setShowTopBtn] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowTopBtn(true);
      } else {
        setShowTopBtn(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const goToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      // Trong thực tế sẽ gọi API
      setSubscribed(true);
      setTimeout(() => {
        setSubscribed(false);
        setEmail('');
      }, 3000);
    }
  };

  return (
    <div className="root-layout">
      <ScrollToTop />
      <Header />
      <main className="root-main">
        <Outlet />
      </main>
      <MobileBottomNav />
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            {/* Vọc Records */}
            <div>
              <img src="/images/voc_logo_new.png" alt="Vọc Records" className="footer-logo" />
              <ul className="footer-list">
                <li><Link to="/" className="footer-link">Trang chủ</Link></li>
                <li><Link to="/blog" className="footer-link">Về chúng tôi</Link></li>
                <li><Link to="/account" className="footer-link">Tài khoản</Link></li>
              </ul>
            </div>

            {/* Shop */}
            <div>
              <h4 className="footer-heading">Sản phẩm</h4>
              <ul className="footer-list">
                <li><Link to="/shop" className="footer-link">Đĩa Than</Link></li>
                <li><Link to="/turntables" className="footer-link">Mâm Đĩa</Link></li>
                <li><Link to="/cassettes" className="footer-link">Cassette</Link></li>
                <li><Link to="/accessories" className="footer-link">Phụ Kiện</Link></li>
              </ul>
            </div>

            {/* Nội dung */}
            <div>
              <h4 className="footer-heading">Nội dung</h4>
              <ul className="footer-list">
                <li><Link to="/blog" className="footer-link">Blog</Link></li>
                <li><Link to="/guides" className="footer-link">Hướng dẫn</Link></li>
                <li><Link to="/shop" className="footer-link">Cửa hàng</Link></li>
              </ul>
            </div>

            {/* Email Subscription */}
            <div>
              <h4 className="footer-heading">Đăng ký nhận tin</h4>
              <p className="footer-newsletter-desc">
                Nhận thông tin về sản phẩm mới và ưu đãi đặc biệt
              </p>
              <form onSubmit={handleSubscribe} className="footer-newsletter-form">
                <div className="footer-newsletter-input-wrapper">
                  <Mail className="footer-newsletter-icon" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email của bạn"
                    required
                    className="footer-newsletter-input"
                  />
                </div>
                <button
                  type="submit"
                  disabled={subscribed}
                  className="footer-newsletter-btn"
                >
                  {subscribed ? (
                    <>✓ Đã đăng ký!</>
                  ) : (
                    <>
                      <Send style={{ width: 16, height: 16 }} />
                      Đăng ký
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; 2026 Nhóm 7 Công nghệ phần mềm. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Scroll To Top Button */}
      {showTopBtn && (
        <button
          onClick={goToTop}
          className="scroll-top-btn active-neo animate-bounce"
          aria-label="Cuộn lên đầu trang"
        >
          <ArrowUp style={{ width: 24, height: 24 }} />
        </button>
      )}
    </div>
  );
}