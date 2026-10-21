import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { Heart, LogOut, MapPin, Package, Plus, Trash2 } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { AddressFormModal } from '../components/AddressForm';
import { useOrderCancel } from '../components/OrderCancel';
import { ProductCard } from '../components/ProductCard';
import { Badge, EmptyState, StatusBadge } from '../components/ui';
import { api, NETWORK_ERROR } from '../utils/api';
import { clearSession, getToken, saveSession, useCurrentUser } from '../utils/auth';
import { formatDateTime, formatPrice, PHONE_PATTERN } from '../utils/format';
import { CANCELLABLE_STATUSES, getOrderStatus, getPaymentStatus, getRefundStatus } from '../utils/status';
import '../../styles/pages/account.css';

const TABS = [
  { id: 'orders', label: 'Đơn hàng' },
  { id: 'addresses', label: 'Sổ địa chỉ' },
  { id: 'profile', label: 'Thông tin cá nhân' },
  { id: 'password', label: 'Đổi mật khẩu' },
  { id: 'wishlist', label: 'Yêu thích' },
];
const TAB_IDS = TABS.map((tab) => tab.id);
const TAB_KEY = 'voc_account_tab';

const ORDER_FILTERS = [
  { id: 'all', label: 'Tất cả', match: () => true },
  { id: 'pending', label: 'Chờ xác nhận', match: (o) => ['choxacnhan', 'daxacnhan'].includes(o.TrangThai) },
  { id: 'shipping', label: 'Đang giao', match: (o) => ['dangchuanbihang', 'danggiaohang'].includes(o.TrangThai) },
  { id: 'done', label: 'Hoàn thành', match: (o) => o.TrangThai === 'hoanthanh' },
  { id: 'canceled', label: 'Đã hủy', match: (o) => o.TrangThai === 'dahuy' },
];

function OrdersTab({ orders, profileName, onChanged }) {
  const [filter, setFilter] = useState('all');
  const { startCancel, refundModal, canceling } = useOrderCancel({ defaultName: profileName, onCancelled: onChanged });
  const visible = orders.filter(ORDER_FILTERS.find((item) => item.id === filter).match);

  return (
    <div className="stack">
      <div className="chip-group">
        {ORDER_FILTERS.map((item) => (
          <button key={item.id} type="button" onClick={() => setFilter(item.id)} className={`chip ${filter === item.id ? 'chip--active' : ''}`}>
            {item.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Package}
            title={filter === 'all' ? 'Bạn chưa có đơn hàng nào' : 'Không có đơn hàng trong mục này'}
            action={<Link to="/shop" className="btn btn--primary">Khám phá cửa hàng</Link>}
          />
        </div>
      ) : (
        <ul className="stack">
          {visible.map((order) => (
            <li key={order.MaDH} className="card order-card">
              <div className="order-card__header">
                <div>
                  <Link to={`/order/${order.MaDH}`} className="order-card__title">Đơn hàng #{order.MaDH}</Link>
                  <p className="text-sm text-muted">{formatDateTime(order.NgayDat)}</p>
                </div>
                <div className="inline">
                  <StatusBadge status={getOrderStatus(order.TrangThai)} />
                  {order.TrangThaiTT && <StatusBadge status={getPaymentStatus(order.TrangThaiTT)} />}
                  {order.TrangThaiHoanTien && order.TrangThaiHoanTien !== 'khongapdung' && (
                    <StatusBadge status={getRefundStatus(order.TrangThaiHoanTien)} />
                  )}
                </div>
              </div>
              <div className="order-card__body">
                <span className="text-muted text-sm">
                  {order.PhuongThucThanhToan === 'payos' ? 'VietQR (PayOS)' : 'Thanh toán khi nhận hàng'}
                  {order.MaDonGHN && ` · Mã vận đơn GHN ${order.MaDonGHN}`}
                </span>
                <span className="font-semibold">{formatPrice(order.TongTien)}</span>
              </div>
              <div className="button-group">
                <Link to={`/order/${order.MaDH}`} className="btn btn--secondary btn--sm">Xem chi tiết</Link>
                {CANCELLABLE_STATUSES.includes(order.TrangThai) && !order.MaDonGHN && (
                  <button type="button" className="btn btn--plain btn--plain-critical text-sm" onClick={() => startCancel(order)} disabled={canceling}>
                    Hủy đơn hàng
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {refundModal}
    </div>
  );
}

function AddressesTab({ addresses, onChanged }) {
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async (values) => {
    setSubmitting(true);
    try {
      const data = await api.post('/account/addresses', {
        nguoiNhan: values.recipientName,
        soDienThoai: values.recipientPhone,
        diaChi: values.address,
        provinceId: values.provinceId,
        provinceName: values.provinceName,
        wardId: values.wardId,
        wardName: values.wardName,
        isDefault: values.isDefault,
      });
      if (data.success) {
        toast.success('Đã thêm địa chỉ giao hàng');
        setShowForm(false);
        onChanged();
      } else {
        toast.error(data.message || 'Không thể thêm địa chỉ');
      }
    } catch {
      toast.error(NETWORK_ERROR);
    } finally {
      setSubmitting(false);
    }
  };

  const runAction = async (request, successMessage) => {
    try {
      const data = await request();
      if (data.success) {
        toast.success(successMessage);
        onChanged();
      } else {
        toast.error(data.message || 'Không thể cập nhật địa chỉ');
      }
    } catch {
      toast.error(NETWORK_ERROR);
    }
  };

  const handleDelete = (id) => {
    if (!window.confirm('Xóa địa chỉ này khỏi sổ địa chỉ?')) return;
    runAction(() => api.del(`/account/addresses/${id}`), 'Đã xóa địa chỉ');
  };

  return (
    <div className="stack">
      <div className="inline inline--between">
        <p className="text-muted">Lưu địa chỉ nhận hàng để thanh toán nhanh hơn.</p>
        <button type="button" className="btn btn--primary btn--sm" onClick={() => setShowForm(true)}><Plus size={16} /> Thêm địa chỉ</button>
      </div>

      {addresses.length === 0 ? (
        <div className="card">
          <EmptyState icon={MapPin} title="Chưa có địa chỉ nào" />
        </div>
      ) : (
        <div className="address-grid">
          {addresses.map((addr) => (
            <div key={addr.MaDC} className="card address-card">
              <div className="inline inline--between">
                <strong>{addr.NguoiNhan}</strong>
                {addr.MacDinh === 1 && <Badge>Mặc định</Badge>}
              </div>
              <p className="text-sm">{addr.SoDienThoai}</p>
              <p className="text-sm text-muted">{addr.DiaChi}</p>
              {(addr.GHNPhuong || addr.GHNTinh) && (
                <p className="text-sm text-muted">{[addr.GHNPhuong, addr.GHNTinh].filter(Boolean).join(', ')}</p>
              )}
              <div className="address-card__actions">
                {addr.MacDinh !== 1 && (
                  <button type="button" className="btn btn--plain text-sm" onClick={() => runAction(() => api.put(`/account/addresses/${addr.MaDC}/default`), 'Đã đặt làm địa chỉ mặc định')}>
                    Đặt làm mặc định
                  </button>
                )}
                <button type="button" className="icon-button icon-button--sm icon-button--critical" onClick={() => handleDelete(addr.MaDC)} aria-label="Xóa địa chỉ">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <AddressFormModal showDefault submitting={submitting} onSubmit={handleAdd} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}

function ProfileTab({ profile, onSaved }) {
  const toast = useToast();
  const user = useCurrentUser();
  const [form, setForm] = useState({ fullName: profile.fullName, phone: profile.phone });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({ fullName: profile.fullName, phone: profile.phone });
  }, [profile.fullName, profile.phone]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.fullName.trim()) {
      toast.error('Vui lòng nhập họ và tên.');
      return;
    }
    setSaving(true);
    try {
      const data = await api.put('/account/profile', { fullName: form.fullName.trim(), phone: form.phone.trim() });
      if (data.success) {
        toast.success('Đã cập nhật thông tin cá nhân');
        // Cập nhật tên hiển thị trên header.
        if (user) saveSession(getToken(), { ...user, name: form.fullName.trim() });
        onSaved();
      } else {
        toast.error(data.message || 'Không thể cập nhật');
      }
    } catch {
      toast.error(NETWORK_ERROR);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="card form account-form" onSubmit={handleSubmit}>
      <label className="field">
        <span className="label">Họ và tên</span>
        <input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
      </label>
      <label className="field">
        <span className="label">Email</span>
        <input className="input" type="email" value={profile.email} disabled />
        <span className="help-text">Email gắn cố định với tài khoản để nhận hóa đơn và thông báo đơn hàng.</span>
      </label>
      <label className="field">
        <span className="label">Số điện thoại</span>
        <input
          className="input"
          type="tel"
          value={form.phone}
          pattern={PHONE_PATTERN}
          title="Số điện thoại Việt Nam gồm 10 chữ số"
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="0912345678"
        />
      </label>
      <div>
        <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
      </div>
    </form>
  );
}

function PasswordTab() {
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp.');
      return;
    }
    setSaving(true);
    try {
      const data = await api.put('/account/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      if (data.success) {
        toast.success('Đổi mật khẩu thành công');
        setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        toast.error(data.message || 'Không thể đổi mật khẩu');
      }
    } catch {
      toast.error(NETWORK_ERROR);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="card form account-form" onSubmit={handleSubmit}>
      <label className="field">
        <span className="label">Mật khẩu hiện tại</span>
        <input className="input" type="password" required autoComplete="current-password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
      </label>
      <label className="field">
        <span className="label">Mật khẩu mới</span>
        <input className="input" type="password" required minLength={6} autoComplete="new-password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
        <span className="help-text">Tối thiểu 6 ký tự.</span>
      </label>
      <label className="field">
        <span className="label">Nhập lại mật khẩu mới</span>
        <input className="input" type="password" required minLength={6} autoComplete="new-password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
      </label>
      <div>
        <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}</button>
      </div>
    </form>
  );
}

function WishlistTab() {
  const { wishlist } = useWishlist();

  if (wishlist.length === 0) {
    return (
      <div className="card">
        <EmptyState icon={Heart} title="Danh sách yêu thích đang trống" action={<Link to="/shop" className="btn btn--primary">Khám phá ngay</Link>}>
          Bấm biểu tượng trái tim trên sản phẩm để lưu lại.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="product-grid product-grid--4">
      {wishlist.map((item) => <ProductCard key={item.id} product={item} quickAdd />)}
    </div>
  );
}

export function Account() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const { wishlist } = useWishlist();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState({ fullName: '', email: '', phone: '' });
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);

  const urlTab = searchParams.get('tab');
  const savedTab = localStorage.getItem(TAB_KEY);
  const activeTab = TAB_IDS.includes(urlTab) ? urlTab : TAB_IDS.includes(savedTab) ? savedTab : 'orders';
  const customerId = user?.customer_id;

  const changeTab = (tab) => {
    localStorage.setItem(TAB_KEY, tab);
    setSearchParams({ tab }, { replace: true });
  };

  const loadProfile = useCallback(() => {
    api.get('/account/profile').then((data) => {
      if (data.success && data.data) {
        setProfile({ fullName: data.data.fullName || '', email: data.data.email || '', phone: data.data.phone || '' });
      }
    }).catch(() => {});
  }, []);
  const loadOrders = useCallback(() => {
    api.get('/orders').then((data) => { if (data.success) setOrders(data.data || []); }).catch(() => {});
  }, []);
  const loadAddresses = useCallback(() => {
    api.get('/account/addresses').then((data) => { if (data.success) setAddresses(data.data || []); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!customerId) return;
    loadProfile();
    loadOrders();
    loadAddresses();
  }, [customerId, loadProfile, loadOrders, loadAddresses]);

  if (!user) return <Navigate to="/login" state={{ returnUrl: '/account' }} replace />;

  if (!customerId) {
    return (
      <div className="page">
        <EmptyState title="Đây là tài khoản nhân viên" action={<Link to="/admin" className="btn btn--primary">Mở trang quản trị</Link>}>
          Tài khoản nhân viên không có hồ sơ khách hàng.
        </EmptyState>
      </div>
    );
  }

  const handleLogout = () => {
    if (!window.confirm('Bạn có chắc chắn muốn đăng xuất?')) return;
    clearSession();
    navigate('/login');
  };

  const counts = { orders: orders.length, addresses: addresses.length, wishlist: wishlist.length };
  const activeOrders = orders.filter((order) => ['choxacnhan', 'daxacnhan', 'dangchuanbihang', 'danggiaohang'].includes(order.TrangThai)).length;
  const displayName = profile.fullName || user.name || 'Khách hàng';

  return (
    <div className="page page--subtle">
      <div className="container">
        <div className="page-header page-header--row">
          <div className="account-hero">
            <span className="avatar">{displayName.charAt(0).toUpperCase()}</span>
            <div>
              <h1 className="page-title">{displayName}</h1>
              <p className="text-muted text-sm">
                {profile.email || user.username}{profile.phone && ` · ${profile.phone}`}
              </p>
            </div>
          </div>
          <button type="button" className="btn btn--secondary" onClick={handleLogout}><LogOut size={16} /> Đăng xuất</button>
        </div>

        <div className="stat-grid">
          <button type="button" className="card stat-card" onClick={() => changeTab('orders')}>
            <span className="stat-card__label">Tổng đơn hàng</span>
            <span className="stat-card__value">{orders.length}</span>
          </button>
          <button type="button" className="card stat-card" onClick={() => changeTab('orders')}>
            <span className="stat-card__label">Đang xử lý / giao</span>
            <span className="stat-card__value">{activeOrders}</span>
          </button>
          <button type="button" className="card stat-card" onClick={() => changeTab('orders')}>
            <span className="stat-card__label">Đã hoàn thành</span>
            <span className="stat-card__value">{orders.filter((order) => order.TrangThai === 'hoanthanh').length}</span>
          </button>
          <button type="button" className="card stat-card" onClick={() => changeTab('wishlist')}>
            <span className="stat-card__label">Sản phẩm yêu thích</span>
            <span className="stat-card__value">{wishlist.length}</span>
          </button>
        </div>

        <div className="tabs account-tabs" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => changeTab(tab.id)}
              className={`tab ${activeTab === tab.id ? 'tab--active' : ''}`}
            >
              {tab.label}
              {counts[tab.id] !== undefined && <span className="tab__count">{counts[tab.id]}</span>}
            </button>
          ))}
        </div>

        <div className="account-content">
          {activeTab === 'orders' && <OrdersTab orders={orders} profileName={profile.fullName} onChanged={loadOrders} />}
          {activeTab === 'addresses' && <AddressesTab addresses={addresses} onChanged={loadAddresses} />}
          {activeTab === 'profile' && <ProfileTab profile={profile} onSaved={loadProfile} />}
          {activeTab === 'password' && <PasswordTab />}
          {activeTab === 'wishlist' && <WishlistTab />}
        </div>
      </div>
    </div>
  );
}
