import { Link, Outlet } from 'react-router';
import { AiAssistant } from '../components/AiAssistant';
import { Header } from '../components/Header';
import { ScrollToTop } from '../components/ScrollToTop';
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
