import { useState } from 'react';
import { Link, Outlet } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { AiAssistant } from '../components/AiAssistant';
import { Header } from '../components/Header';
import { ScrollToTop } from '../components/ScrollToTop';
import { useToast } from '../context/ToastContext';
import '../../styles/pages/root.css';

const FOOTER_LINKS = [
  {
    heading: 'Sản phẩm',
    links: [
      { label: 'Đĩa than', to: '/shop' },
      { label: 'Mâm đĩa', to: '/turntables' },
      { label: 'Cassette', to: '/cassettes' },
      { label: 'Phụ kiện', to: '/accessories' },
    ],
  },
  {
    heading: 'Nội dung',
    links: [
      { label: 'Blog', to: '/blog' },
      { label: 'Hướng dẫn', to: '/guides' },
      { label: 'Chat với cửa hàng', to: '/chat' },
      { label: 'Tài khoản', to: '/account' },
    ],
  },
];

export function Root() {
  const toast = useToast();
  const [email, setEmail] = useState('');

  const handleSubscribe = (event) => {
    event.preventDefault();
    if (!email) return;
    // Chưa có API nhận đăng ký bản tin: chỉ ghi nhận trên giao diện.
    toast.success('Cảm ơn bạn đã đăng ký nhận tin!');
    setEmail('');
  };

  return (
    <div className="root-layout">
      <ScrollToTop />
      <Header />
      <main className="root-main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer__grid">
            <div>
              <Link to="/" className="footer__brand">
                <img src="/images/voc_logo_new.png" alt="" />
                Vọc Records
              </Link>
              <p className="text-muted text-sm">
                Đĩa than, cassette và thiết bị nghe nhạc analog được tuyển chọn kỹ lưỡng.
              </p>
            </div>

            {FOOTER_LINKS.map((group) => (
              <div key={group.heading}>
                <h4 className="footer__heading">{group.heading}</h4>
                <ul className="footer__list">
                  {group.links.map((link) => (
                    <li key={link.to}><Link to={link.to} className="footer__link">{link.label}</Link></li>
                  ))}
                </ul>
              </div>
            ))}

            <div>
              <h4 className="footer__heading">Đăng ký nhận tin</h4>
              <p className="text-muted text-sm">Nhận thông tin về sản phẩm mới và ưu đãi đặc biệt.</p>
              <form onSubmit={handleSubscribe} className="footer__newsletter">
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email của bạn"
                  aria-label="Email nhận tin"
                  required
                />
                <button type="submit" aria-label="Đăng ký"><ArrowRight size={18} /></button>
              </form>
            </div>
          </div>

          <div className="footer__bottom">
            &copy; 2026 Nhóm 7 Công nghệ phần mềm. All rights reserved.
          </div>
        </div>
      </footer>
      <AiAssistant />
    </div>
  );
}
