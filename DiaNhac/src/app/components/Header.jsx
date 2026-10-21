import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { Menu, MessageCircle, Search, ShoppingBag, User, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { clearSession, isStaff, useCurrentUser } from '../utils/auth';
import '../../styles/components/header.css';

export const NAV_ITEMS = [
  { label: 'Đĩa than', href: '/shop' },
  { label: 'Mâm đĩa', href: '/turntables' },
  { label: 'Cassette', href: '/cassettes' },
  { label: 'Phụ kiện', href: '/accessories' },
  { label: 'Blog', href: '/blog' },
  { label: 'Hướng dẫn', href: '/guides' },
];

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { count } = useCart();
  const user = useCurrentUser();
  const [query, setQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Đóng menu khi chuyển trang.
  useEffect(() => {
    setDrawerOpen(false);
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  // Bấm ra ngoài thì đóng menu tài khoản.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const handleSearch = (event) => {
    event.preventDefault();
    const keyword = query.trim();
    if (keyword) navigate(`/search?q=${encodeURIComponent(keyword)}`);
  };

  const handleLogout = () => {
    clearSession();
    navigate('/');
  };

  const searchInput = (
    <input
      type="search"
      placeholder="Tìm đĩa, nghệ sĩ, tâm trạng..."
      value={query}
      onChange={(event) => setQuery(event.target.value)}
      aria-label="Tìm kiếm sản phẩm"
    />
  );

  return (
    <>
      <div className="announcement-bar">Giao hàng toàn quốc qua GHN · Phí vận chuyển đồng giá 30.000đ</div>
      <header className="site-header">
        <div className="container site-header__top">
          <button type="button" className="icon-button site-header__menu-toggle" onClick={() => setDrawerOpen(true)} aria-label="Mở menu">
            <Menu size={22} />
          </button>

          <Link to="/" className="site-header__logo">
            <img src="/images/voc_logo_new.png" alt="" />
            <span>Vọc Records</span>
          </Link>

          <form className="site-header__search" onSubmit={handleSearch} role="search">
            <Search size={18} className="site-header__search-icon" />
            {searchInput}
          </form>

          <div className="site-header__icons">
            <Link to="/chat" className="icon-button" title="Chat với cửa hàng" aria-label="Chat với cửa hàng">
              <MessageCircle size={20} />
            </Link>

            {user ? (
              <div className="site-header__account" ref={menuRef}>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-expanded={menuOpen}
                  aria-label="Tài khoản"
                >
                  <User size={20} />
                </button>
                {menuOpen && (
                  <div className="dropdown">
                    <div className="dropdown__header">
                      <strong>{user.name || user.username}</strong>
                      <span>{user.username}</span>
                    </div>
                    {isStaff(user) && <Link to="/admin" className="dropdown__item">Trang quản trị</Link>}
                    {user.customer_id && <Link to="/account" className="dropdown__item">Tài khoản của tôi</Link>}
                    {user.customer_id && <Link to="/account?tab=orders" className="dropdown__item">Đơn hàng</Link>}
                    <button type="button" className="dropdown__item" onClick={handleLogout}>Đăng xuất</button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="icon-button" aria-label="Đăng nhập">
                <User size={20} />
              </Link>
            )}

            <Link to="/cart" className="icon-button" aria-label={`Giỏ hàng (${count} sản phẩm)`}>
              <ShoppingBag size={20} />
              {count > 0 && <span className="cart-count">{count}</span>}
            </Link>
          </div>
        </div>

        <nav className="site-header__nav" aria-label="Danh mục">
          <ul className="container">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <NavLink to={item.href} className={({ isActive }) => `site-header__nav-link ${isActive ? 'is-active' : ''}`}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {drawerOpen && (
        <div className="drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <aside className="drawer" onClick={(event) => event.stopPropagation()} aria-label="Menu">
            <div className="drawer__header">
              <Link to="/" className="site-header__logo">
                <img src="/images/voc_logo_new.png" alt="" />
                <span>Vọc Records</span>
              </Link>
              <button type="button" className="icon-button" onClick={() => setDrawerOpen(false)} aria-label="Đóng menu">
                <X size={22} />
              </button>
            </div>
            <form className="drawer__search" onSubmit={handleSearch} role="search">
              <Search size={18} />
              {searchInput}
            </form>
            <nav className="drawer__nav">
              {NAV_ITEMS.map((item) => <Link key={item.href} to={item.href}>{item.label}</Link>)}
              <Link to="/chat">Chat với Vọc Records</Link>
            </nav>
            <div className="drawer__footer">
              {user ? (
                <div className="stack stack--sm">
                  {isStaff(user) && <Link to="/admin" className="btn btn--secondary btn--full">Trang quản trị</Link>}
                  {user.customer_id && <Link to="/account" className="btn btn--secondary btn--full">Tài khoản của tôi</Link>}
                  <button type="button" className="btn btn--primary btn--full" onClick={handleLogout}>Đăng xuất</button>
                </div>
              ) : (
                <Link to="/login" className="btn btn--primary btn--full">Đăng nhập</Link>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
