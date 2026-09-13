import { Home, ShoppingCart, User, Search, ShoppingBag } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { useCart } from '../context/CartContext';
import '../../styles/components/mobile-bottom-nav.css';

export function MobileBottomNav() {
  const location = useLocation();
  const { getCartCount } = useCart();

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Shop', path: '/shop' },
    { icon: ShoppingBag, label: 'Cart', path: '/cart', badge: getCartCount() },
    { icon: User, label: 'Account', path: '/login' },
  ];

  return (
    <div className="mobile-bottom-nav mobile-nav-shadow">
      <div className="mobile-bottom-nav-inner">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`mobile-bottom-nav-item active-neo ${isActive ? 'mobile-bottom-nav-item--active' : ''}`}
            >
              <div className={`mobile-bottom-nav-icon ${isActive ? 'mobile-bottom-nav-icon--active' : ''}`}>
                <Icon style={{ width: 24, height: 24 }} />
              </div>
              <span className={`mobile-bottom-nav-label ${isActive ? 'mobile-bottom-nav-label--active' : ''}`}>
                {item.label}
              </span>
              
              {item.badge !== undefined && item.badge > 0 && (
                <span className="mobile-bottom-nav-badge">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
