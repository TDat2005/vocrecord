import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import {
  ExternalLink, FileText, Home, LogOut, Menu, MessageCircle, MessagesSquare, Package,
  PackagePlus, Recycle, RotateCcw, ShoppingCart, Tag, UserCog, Users, X,
} from 'lucide-react';
import { EmptyState } from '../components/ui';
import { Dashboard } from '../components/admin/Dashboard';
import { ProductCreate } from '../components/admin/ProductCreate';
import { Inventory } from '../components/admin/Inventory';
import { Orders } from '../components/admin/Orders';
import { Customers } from '../components/admin/Customers';
import { ContentManager } from '../components/admin/ContentManager';
import { Comments } from '../components/admin/Comments';
import { Returns } from '../components/admin/Returns';
import { TradeIns } from '../components/admin/TradeIns';
import { AdminChat } from '../components/admin/AdminChat';
import { Discounts } from '../components/admin/Discounts';
import { Employees } from '../components/admin/Employees';
import { clearSession, isStaff, useCurrentUser } from '../utils/auth';
import '../../styles/pages/admin.css';

const NAV_GROUPS = [
  {
    title: 'Bán hàng',
    items: [
      { id: 'dashboard', label: 'Tổng quan', icon: Home, component: Dashboard },
      { id: 'orders', label: 'Đơn hàng', icon: ShoppingCart, component: Orders },
      { id: 'customers', label: 'Khách hàng', icon: Users, component: Customers },
      { id: 'returns', label: 'Trả hàng / khiếu nại', icon: RotateCcw, component: Returns },
      { id: 'tradein', label: 'Thu mua & ký gửi', icon: Recycle, component: TradeIns },
    ],
  },
  {
    title: 'Sản phẩm',
    items: [
      { id: 'inventory', label: 'Kho hàng', icon: Package, component: Inventory },
      { id: 'products', label: 'Thêm sản phẩm', icon: PackagePlus, component: ProductCreate },
      { id: 'discounts', label: 'Mã giảm giá', icon: Tag, component: Discounts },
    ],
  },
  {
    title: 'Nội dung & hỗ trợ',
    items: [
      { id: 'blog', label: 'Blog & hướng dẫn', icon: FileText, component: ContentManager },
      { id: 'comments', label: 'Hỏi đáp sản phẩm', icon: MessagesSquare, component: Comments },
      { id: 'chat', label: 'Chat khách hàng', icon: MessageCircle, component: AdminChat },
    ],
  },
  {
    title: 'Cửa hàng',
    adminOnly: true,
    items: [
      { id: 'employees', label: 'Nhân sự & phân quyền', icon: UserCog, component: Employees },
    ],
  },
];

const SECTION_KEY = 'voc_admin_section';

export function Admin() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const groups = NAV_GROUPS.filter((group) => !group.adminOnly || user?.role === 'admin');
  const items = groups.flatMap((group) => group.items);
  const requested = searchParams.get('tab') || searchParams.get('section') || localStorage.getItem(SECTION_KEY);
  const active = items.find((item) => item.id === requested) || items[0];

  useEffect(() => {
    document.title = `${active.label} · Quản trị Vọc Records`;
    return () => { document.title = 'Vọc Records - Đĩa Than, Cassette & Mâm Đĩa Nhạc'; };
  }, [active.label]);

  if (!user) return <Navigate to="/login" state={{ returnUrl: '/admin' }} replace />;

  if (!isStaff(user)) {
    return (
      <div className="page">
        <EmptyState title="Bạn không có quyền truy cập trang quản trị" action={<Link to="/" className="btn btn--primary">Về trang chủ</Link>} />
      </div>
    );
  }

  const openSection = (id) => {
    localStorage.setItem(SECTION_KEY, id);
    setSearchParams({ tab: id }, { replace: true });
    setSidebarOpen(false);
    window.scrollTo({ top: 0 });
  };

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  const Section = active.component;
  const displayName = user.name || user.username;

  return (
    <div className="admin">
      <header className="admin-topbar">
        <button type="button" className="admin-topbar__menu" onClick={() => setSidebarOpen(true)} aria-label="Mở menu quản trị">
          <Menu size={20} />
        </button>
        <span className="admin-topbar__brand">
          <img src="/images/voc_logo_new.png" alt="" />
          Vọc Records
        </span>
        <div className="admin-topbar__right">
          <Link to="/" className="admin-topbar__link"><ExternalLink size={15} /> <span>Xem cửa hàng</span></Link>
          <span className="admin-topbar__user">
            <span className="admin-topbar__avatar">{String(displayName).charAt(0).toUpperCase()}</span>
            <span className="admin-topbar__name">{displayName}</span>
          </span>
          <button type="button" className="admin-topbar__link" onClick={handleLogout} aria-label="Đăng xuất">
            <LogOut size={15} />
          </button>
        </div>
      </header>

      <div className="admin-body">
        {sidebarOpen && <div className="admin-sidebar__backdrop" onClick={() => setSidebarOpen(false)} />}
        <aside className={`admin-sidebar ${sidebarOpen ? 'admin-sidebar--open' : ''}`}>
          <div className="admin-sidebar__close">
            <button type="button" className="icon-button" onClick={() => setSidebarOpen(false)} aria-label="Đóng menu">
              <X size={20} />
            </button>
          </div>
          <nav>
            {groups.map((group) => (
              <div key={group.title} className="admin-nav__group">
                <p className="admin-nav__title">{group.title}</p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openSection(item.id)}
                      className={`admin-nav__item ${active.id === item.id ? 'admin-nav__item--active' : ''}`}
                      aria-current={active.id === item.id ? 'page' : undefined}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>

        <main className="admin-main">
          <div className="admin-page">
            <Section />
          </div>
        </main>
      </div>
    </div>
  );
}
