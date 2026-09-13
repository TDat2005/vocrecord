
import { Link, useNavigate } from 'react-router';
import { Search, ShoppingCart, User, Menu, X, MessageCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useState } from 'react';
import '../../styles/components/header.css';

export function Header() {
  const navigate = useNavigate();
  const { getCartCount } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/');
    window.location.reload();
  };
  const cartCount = getCartCount();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const menuItems = [
    { label: 'Đĩa Than', href: '/shop' },
    { label: 'Mâm Đĩa', href: '/turntables' },
    { label: 'Cassette', href: '/cassettes' },
    { label: 'Phụ Kiện', href: '/accessories' },
    { label: 'Blog', href: '/blog' },
    { label: 'Hướng dẫn', href: '/guides' },
  ];

  return (
    <header className="header">
      {/* Top Bar */}
      <div className="header-inner container">
        {/* Logo */}
        <Link to="/" className="header-logo">
          <img src="/images/voc_logo_new.png" alt="Vọc Records" />
        </Link>

        {/* Search Bar - Desktop */}
        <form onSubmit={handleSearch} className="header-search">
          <div className="header-search-wrapper">
            <Search className="header-search-icon" />
            <input
              type="text"
              placeholder="TÌM KIẾM ĐĨA THAN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="header-search-input"
            />
          </div>
        </form>

        {/* Right Actions */}
        <div className="header-actions">
          <Link to="/chat" className="header-action-btn" title="Chat với Vọc Records">
            <MessageCircle style={{ width: 24, height: 24 }} />
          </Link>
          <Link to="/cart" className="header-action-btn">
            <ShoppingCart style={{ width: 24, height: 24 }} />
            {cartCount > 0 && (
              <span className="header-cart-badge">
                {cartCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="header-user-menu">
              <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="header-action-btn">
                <User style={{ width: 24, height: 24 }} />
              </button>
              {userMenuOpen && (
                 <div className="header-dropdown">
                    {(user.role === 'admin' || user.role === 'nhanvien') && (
                        <Link to="/admin" onClick={() => setUserMenuOpen(false)} className="header-dropdown-link header-dropdown-link--admin">
                           TRANG QUẢN TRỊ
                        </Link>
                    )}
                    <Link to="/account" onClick={() => setUserMenuOpen(false)} className="header-dropdown-link">
                       QUẢN LÝ TÀI KHOẢN
                    </Link>
                    <button onClick={handleLogout} className="header-dropdown-logout">
                       ĐĂNG XUẤT
                    </button>
                 </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="header-action-btn">
              <User style={{ width: 24, height: 24 }} />
            </Link>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="header-mobile-toggle"
          >
            {mobileMenuOpen ? <X style={{ width: 32, height: 32 }} /> : <Menu style={{ width: 32, height: 32 }} />}
          </button>
        </div>
      </div>

      {/* Navigation Menu - Desktop */}
      <nav className="header-nav">
        <div className="container">
          <ul className="header-nav-list">
            {menuItems.map((item) => (
              <li key={item.href}>
                <Link to={item.href} className="header-nav-link">
                  {item.label}
                </Link>
              </li>
              ))}
          </ul>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="header-mobile-menu header-mobile-menu--open">
          {/* Mobile Search */}
          <div className="header-mobile-search container">
            <h3 className="header-mobile-search-label">Tìm kiếm</h3>
            <form onSubmit={handleSearch}>
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: '#fff', width: 24, height: 24 }} />
                <input
                  type="text"
                  placeholder="BẠN ĐANG TÌM ĐĨA GÌ?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="header-mobile-search-input"
                />
              </div>
            </form>
          </div>

          {/* Mobile Menu Items */}
          <nav className="header-mobile-nav container">
            <h3 className="header-mobile-nav-label">Danh mục</h3>
            <ul className="header-mobile-nav-list">
              {menuItems.map((item) => (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="header-mobile-nav-link"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}

              <li>
                <Link to="/chat" onClick={() => setMobileMenuOpen(false)} className="header-mobile-nav-link">
                  CHAT VỚI VỌC RECORDS
                </Link>
              </li>
              
              <li className="header-mobile-user-section">
                {user ? (
                  <div>
                    <Link to="/account" onClick={() => setMobileMenuOpen(false)} className="header-mobile-user-link">
                       TÀI KHOẢN CỦA TÔI
                    </Link>
                    <button onClick={handleLogout} className="header-mobile-logout">
                       ĐĂNG XUẤT
                    </button>
                  </div>
                ) : (
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="header-mobile-login">
                     ĐĂNG NHẬP
                  </Link>
                )}
              </li>
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}
