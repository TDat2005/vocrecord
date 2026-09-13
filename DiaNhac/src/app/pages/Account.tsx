import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { 
  User, Package, Heart, Edit2, Save, Trash2, MapPin, KeyRound, 
  LogOut, Plus, Phone, Mail, Clock, Truck 
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { API_BASE } from '../config/api';
import '../../styles/pages/account.css';

type Tab = 'orders' | 'addresses' | 'profile' | 'password' | 'wishlist';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
});

interface Order {
  MaDH: number;
  NgayDat: string;
  TrangThai: 'choxacnhan' | 'daxacnhan' | 'dangchuanbihang' | 'danggiaohang' | 'hoanthanh' | 'dahuy';
  TongTien: number;
  MaDonGHN?: string;
  GHNTrangThai?: string;
  PhuongThucThanhToan?: string;
  TrangThaiTT?: string;
  TrangThaiHoanTien?: 'khongapdung' | 'choxuly' | 'dahoantien';
  ThongTinHoanTien?: string;
}

interface Address {
  MaDC: number;
  MaKH: number;
  NguoiNhan: string;
  SoDienThoai: string;
  DiaChi: string;
  GHNTinh?: string;
  GHNPhuong?: string;
  GHNProvinceId?: string;
  GHNWardId?: string;
  MacDinh: number;
}

export function Account() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const validTabs: Tab[] = ['orders', 'addresses', 'profile', 'password', 'wishlist'];

  const getInitialTab = (): Tab => {
    const urlTab = searchParams.get('tab') as Tab;
    if (urlTab && validTabs.includes(urlTab)) {
      return urlTab;
    }
    const savedTab = localStorage.getItem('voc_account_tab') as Tab;
    if (savedTab && validTabs.includes(savedTab)) {
      return savedTab;
    }
    return 'orders';
  };

  const [activeTab, setActiveTab] = useState<Tab>(getInitialTab);

  // Sync state when URL search param changes or update URL if missing
  useEffect(() => {
    const urlTab = searchParams.get('tab') as Tab;
    if (urlTab && validTabs.includes(urlTab)) {
      if (urlTab !== activeTab) {
        setActiveTab(urlTab);
      }
      localStorage.setItem('voc_account_tab', urlTab);
    } else {
      setSearchParams({ tab: activeTab }, { replace: true });
      localStorage.setItem('voc_account_tab', activeTab);
    }
  }, [searchParams]);

  const handleTabChange = (newTab: Tab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab }, { replace: true });
    localStorage.setItem('voc_account_tab', newTab);
  };

  const [orderFilter, setOrderFilter] = useState<'all' | 'choxacnhan' | 'danggiaohang' | 'hoanthanh' | 'dahuy'>('all');
  const { addToCart } = useCart();
  const [user, setUser] = useState<any>(null);

  // Profile State
  const [profileData, setProfileData] = useState({ fullName: '', email: '', phone: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  // Address Book State
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [newAddressForm, setNewAddressForm] = useState({
    recipientName: '',
    recipientPhone: '',
    address: '',
    provinceId: '',
    provinceName: '',
    wardId: '',
    wardName: '',
    isDefault: false
  });
  const [ghnProvinces, setGhnProvinces] = useState<any[]>([]);
  const [ghnWards, setGhnWards] = useState<any[]>([]);
  const [addressSubmitting, setAddressSubmitting] = useState(false);

  // Password State
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  // Orders & Wishlist
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);

  // Cancel & Refund Modal State
  const [cancelingOrder, setCancelingOrder] = useState<Order | null>(null);
  const [refundForm, setRefundForm] = useState({ nganHang: 'Vietcombank', soTK: '', chuTK: '', lyDo: '' });
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    const loggedInUser = localStorage.getItem('user');
    if (!loggedInUser) {
      navigate('/login');
      return;
    }
    const userData = JSON.parse(loggedInUser);
    setUser(userData);

    if (userData.customer_id) {
      fetchProfile(userData.customer_id);
      fetchOrdersData(userData.customer_id);
      fetchAddresses();
      fetchWishlist(userData.customer_id);
    }

    // Load GHN provinces for address modal
    fetch(`${API_BASE}/shipping/ghn/provinces`)
      .then(res => res.json())
      .then(data => { if (data.success) setGhnProvinces(data.data || []); })
      .catch(() => {});
  }, [navigate]);

  useEffect(() => {
    if (!newAddressForm.provinceId) {
      setGhnWards([]);
      return;
    }
    fetch(`${API_BASE}/shipping/ghn/wards?province_id=${newAddressForm.provinceId}`)
      .then(res => res.json())
      .then(data => setGhnWards(data.success ? data.data || [] : []))
      .catch(() => setGhnWards([]));
  }, [newAddressForm.provinceId]);

  const fetchProfile = (custId: any) => {
    fetch(`${API_BASE}/account/profile?customer_id=${custId}`, { headers: authHeaders() })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setProfileData({
            fullName: data.data.fullName || '',
            email: data.data.email || '',
            phone: data.data.phone || ''
          });
        }
      });
  };

  const fetchOrdersData = (custId: any) => {
    fetch(`${API_BASE}/orders?customer_id=${custId}`, { headers: authHeaders() })
      .then(res => res.json())
      .then(data => { if (data.success) setOrders(data.data || []); });
  };

  const fetchAddresses = () => {
    fetch(`${API_BASE}/account/addresses`, { headers: authHeaders() })
      .then(res => res.json())
      .then(data => { if (data.success) setAddresses(data.data || []); });
  };

  const fetchWishlist = (custId: any) => {
    fetch(`${API_BASE}/wishlist?customer_id=${custId}`, { headers: authHeaders() })
      .then(res => res.json())
      .then(data => { if (data.success) setWishlist(data.data || []); });
  };

  const handleLogout = () => {
    if (window.confirm("Bạn có chắc chắn muốn đăng xuất tài khoản?")) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  const handleSaveProfile = async () => {
    if (!profileData.fullName.trim()) return alert("Vui lòng nhập họ và tên.");
    setProfileSaving(true);
    try {
      const res = await fetch(`${API_BASE}/account/profile`, {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: profileData.fullName, phone: profileData.phone })
      });
      const data = await res.json();
      if (data.success) {
        alert("Cập nhật thông tin cá nhân thành công!");
        setIsEditing(false);
      } else {
        alert(data.message || "Lỗi cập nhật");
      }
    } catch {
      alert("Lỗi kết nối máy chủ");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAddAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})$/;
    if (!phoneRegex.test(newAddressForm.recipientPhone)) {
      return alert("Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam (10 số, đầu 03, 05, 07, 08, 09).");
    }
    if (newAddressForm.address.trim().length < 10) {
      return alert("Vui lòng nhập địa chỉ cụ thể hơn (tối thiểu 10 ký tự).");
    }
    setAddressSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/account/addresses`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nguoiNhan: newAddressForm.recipientName,
          soDienThoai: newAddressForm.recipientPhone,
          diaChi: newAddressForm.address,
          provinceId: newAddressForm.provinceId,
          provinceName: newAddressForm.provinceName,
          wardId: newAddressForm.wardId,
          wardName: newAddressForm.wardName,
          isDefault: newAddressForm.isDefault
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("Thêm địa chỉ giao hàng thành công!");
        setShowAddAddressModal(false);
        setNewAddressForm({
          recipientName: '',
          recipientPhone: '',
          address: '',
          provinceId: '',
          provinceName: '',
          wardId: '',
          wardName: '',
          isDefault: false
        });
        fetchAddresses();
      } else {
        alert(data.message || "Lỗi khi thêm địa chỉ");
      }
    } catch {
      alert("Lỗi kết nối máy chủ");
    } finally {
      setAddressSubmitting(false);
    }
  };

  const handleDeleteAddress = async (id: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa địa chỉ này khỏi sổ địa chỉ?")) return;
    try {
      const res = await fetch(`${API_BASE}/account/addresses/${id}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      const data = await res.json();
      if (data.success) {
        alert("Đã xóa địa chỉ!");
        fetchAddresses();
      } else {
        alert(data.message || "Lỗi khi xóa địa chỉ");
      }
    } catch {
      alert("Lỗi kết nối máy chủ");
    }
  };

  const handleSetDefaultAddress = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/account/addresses/${id}/default`, {
        method: 'PUT',
        headers: authHeaders()
      });
      const data = await res.json();
      if (data.success) {
        alert("Đã đặt làm địa chỉ mặc định!");
        fetchAddresses();
      } else {
        alert(data.message || "Lỗi cập nhật");
      }
    } catch {
      alert("Lỗi kết nối máy chủ");
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return alert("Mật khẩu mới và xác nhận mật khẩu không khớp!");
    }
    if (passwordForm.newPassword.length < 6) {
      return alert("Mật khẩu mới phải có ít nhất 6 ký tự!");
    }
    setPasswordSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/account/change-password`, {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("Đổi mật khẩu thành công! Hãy ghi nhớ mật khẩu mới của bạn.");
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        alert(data.message || "Lỗi đổi mật khẩu");
      }
    } catch {
      alert("Lỗi kết nối máy chủ");
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const handleInitiateCancel = (order: Order) => {
    if (order.MaDonGHN) {
      alert(`Đơn hàng đã được tạo mã vận đơn GHN (${order.MaDonGHN}). Không thể hủy trực tuyến, quý khách vui lòng liên hệ trực tiếp với Shop để được hỗ trợ!`);
      return;
    }
    if (order.PhuongThucThanhToan === 'payos' && order.TrangThaiTT === 'dathanhtoan') {
      setCancelingOrder(order);
      setRefundForm({ nganHang: 'Vietcombank', soTK: '', chuTK: profileData.fullName || '', lyDo: 'Đổi ý không muốn mua nữa' });
      return;
    }
    if (!window.confirm('BẠN CÓ CHẮC CHẮN MUỐN HỦY ĐƠN HÀNG NÀY?')) return;
    executeCancel(order.MaDH, {});
  };

  const executeCancel = (orderId: number, refundPayload: any) => {
    setCancelLoading(true);
    fetch(`${API_BASE}/orders/${orderId}/cancel`, {
      method: 'PUT',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId, customer_id: user?.customer_id, ...refundPayload })
    })
    .then(res => res.json())
    .then(data => {
      setCancelLoading(false);
      if (data.success) {
        alert(data.message || 'Đã hủy đơn hàng thành công!');
        setCancelingOrder(null);
        if (user?.customer_id) {
          fetchOrdersData(user.customer_id);
        }
      } else {
        alert(data.message || 'Lỗi khi hủy đơn');
      }
    })
    .catch(err => {
      setCancelLoading(false);
      alert('Lỗi kết nối máy chủ');
      console.error(err);
    });
  };

  const handleRemoveWishlist = (productId: number) => {
    if (!user || !user.customer_id) return;
    fetch(`${API_BASE}/wishlist`, {
      method: 'DELETE',
      headers: authHeaders(),
      body: JSON.stringify({ customer_id: user.customer_id, product_id: productId })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) setWishlist(wishlist.filter(i => i.id != productId));
    });
  };

  const getStatusClass = (status: Order['TrangThai']) => {
    const map: Record<string, string> = {
      choxacnhan: 'order-status--pending',
      daxacnhan: 'order-status--confirmed',
      dangchuanbihang: 'order-status--processing',
      danggiaohang: 'order-status--shipping',
      hoanthanh: 'order-status--completed',
      dahuy: 'order-status--canceled'
    };
    return map[status] || '';
  };

  const getStatusText = (status: Order['TrangThai']) => {
    const texts: Record<string, string> = {
      choxacnhan: 'Chờ xác nhận',
      daxacnhan: 'Đã xác nhận',
      dangchuanbihang: 'Đang xử lý',
      danggiaohang: 'Đang giao',
      hoanthanh: 'Đã giao',
      dahuy: 'Đã hủy'
    };
    return texts[status] || status;
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const formatPrice = (price: number | string) => Number(price).toLocaleString('vi-VN') + 'đ';

  const filteredOrders = orders.filter(o => {
    if (orderFilter === 'all') return true;
    if (orderFilter === 'choxacnhan') return o.TrangThai === 'choxacnhan' || o.TrangThai === 'daxacnhan';
    if (orderFilter === 'danggiaohang') return o.TrangThai === 'dangchuanbihang' || o.TrangThai === 'danggiaohang';
    if (orderFilter === 'hoanthanh') return o.TrangThai === 'hoanthanh';
    if (orderFilter === 'dahuy') return o.TrangThai === 'dahuy';
    return true;
  });

  const tabs = [
    { id: 'orders' as Tab, label: 'ĐƠN HÀNG CỦA TÔI', icon: Package, count: orders.length },
    { id: 'addresses' as Tab, label: 'SỔ ĐỊA CHỈ (GHN)', icon: MapPin, count: addresses.length },
    { id: 'profile' as Tab, label: 'THÔNG TIN CÁ NHÂN', icon: User },
    { id: 'password' as Tab, label: 'ĐỔI MẬT KHẨU', icon: KeyRound },
    { id: 'wishlist' as Tab, label: 'YÊU THÍCH', icon: Heart, count: wishlist.length },
  ];

  return (
    <div className="page page--gray" style={{ padding: '2.5rem 0' }}>
      <div className="container">
        
        {/* Profile / Member Dashboard Header */}
        <div className="neo-box neo-box--thick" style={{ padding: '1.75rem', marginBottom: '2rem', background: '#fff', boxShadow: '8px 8px 0 0 #000' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{
                width: '4.5rem',
                height: '4.5rem',
                borderRadius: '50%',
                background: '#fef08a',
                border: '3px solid #000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                fontWeight: 900,
                fontFamily: 'var(--font-heading)',
                boxShadow: '3px 3px 0 #000'
              }}>
                {(profileData.fullName || user?.name || user?.username || 'V').charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0, fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>
                    {profileData.fullName || user?.name || 'Khách Hàng'}
                  </h1>
                  <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: '#dbeafe', border: '2px solid #000', fontWeight: 800 }}>
                    THÀNH VIÊN VỌC RECORDS
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem', color: 'var(--gray-600)', fontSize: '0.875rem', fontWeight: 600, flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Mail style={{ width: 15, height: 15 }} /> {profileData.email || user?.username || 'Chưa cập nhật'}</span>
                  {profileData.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Phone style={{ width: 15, height: 15 }} /> {profileData.phone}</span>}
                </div>
              </div>
            </div>

            <button onClick={handleLogout} className="neo-btn neo-btn--secondary neo-btn--sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <LogOut style={{ width: 16, height: 16 }} /> ĐĂNG XUẤT
            </button>
          </div>

          {/* Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '2px dashed #000' }}>
            <div 
              onClick={() => { handleTabChange('orders'); setOrderFilter('all'); }} 
              style={{ padding: '0.75rem 1rem', background: '#f8fafc', border: '2px solid #000', textAlign: 'center', cursor: 'pointer' }}
              title="Xem tất cả đơn hàng"
            >
              <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{orders.length}</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase' }}>TỔNG ĐƠN HÀNG</div>
            </div>
            <div 
              onClick={() => { handleTabChange('orders'); setOrderFilter('choxacnhan'); }} 
              style={{ padding: '0.75rem 1rem', background: '#fef9c3', border: '2px solid #000', textAlign: 'center', cursor: 'pointer' }}
              title="Xem đơn đang chờ xử lý"
            >
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#854d0e' }}>
                {orders.filter(o => ['choxacnhan', 'daxacnhan', 'dangchuanbihang', 'danggiaohang'].includes(o.TrangThai)).length}
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#854d0e', textTransform: 'uppercase' }}>ĐANG XỬ LÝ / GIAO</div>
            </div>
            <div 
              onClick={() => { handleTabChange('orders'); setOrderFilter('hoanthanh'); }} 
              style={{ padding: '0.75rem 1rem', background: '#dcfce7', border: '2px solid #000', textAlign: 'center', cursor: 'pointer' }}
              title="Xem đơn đã hoàn thành"
            >
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#166534' }}>
                {orders.filter(o => o.TrangThai === 'hoanthanh').length}
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>ĐÃ HOÀN THÀNH</div>
            </div>
            <div 
              onClick={() => handleTabChange('wishlist')} 
              style={{ padding: '0.75rem 1rem', background: '#ffe4e6', border: '2px solid #000', textAlign: 'center', cursor: 'pointer' }}
              title="Xem sản phẩm yêu thích"
            >
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#be123c' }}>{wishlist.length}</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#be123c', textTransform: 'uppercase' }}>SẢN PHẨM YÊU THÍCH</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="account-tabs">
          <div className="account-tabs-inner">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button 
                  key={tab.id} 
                  onClick={() => handleTabChange(tab.id)} 
                  className={`account-tab ${activeTab === tab.id ? 'account-tab--active' : ''}`}
                >
                  <Icon style={{ width: 18, height: 18 }} /> 
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span style={{ 
                      marginLeft: '0.4rem', 
                      fontSize: '0.75rem', 
                      padding: '0.1rem 0.45rem', 
                      borderRadius: '999px',
                      background: activeTab === tab.id ? '#fff' : '#000',
                      color: activeTab === tab.id ? '#000' : '#fff'
                    }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="account-content">

          {/* TAB 1: ORDERS */}
          {activeTab === 'orders' && (
            <div>
              <div className="flex-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', fontFamily: 'var(--font-heading)', margin: 0 }}>
                  Đơn Hàng Của Tôi
                </h2>
                {/* Filter Chips */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {[
                    { id: 'all', label: 'Tất cả' },
                    { id: 'choxacnhan', label: 'Chờ xác nhận' },
                    { id: 'danggiaohang', label: 'Đang giao' },
                    { id: 'hoanthanh', label: 'Hoàn thành' },
                    { id: 'dahuy', label: 'Đã hủy' }
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setOrderFilter(f.id as any)}
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        border: '2px solid #000',
                        cursor: 'pointer',
                        background: orderFilter === f.id ? '#000' : '#fff',
                        color: orderFilter === f.id ? '#fff' : '#000',
                        boxShadow: orderFilter === f.id ? '2px 2px 0 #000' : 'none'
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="empty-state empty-state--dashed" style={{ padding: '3rem 1rem' }}>
                  <Package style={{ width: 64, height: 64, color: 'var(--gray-300)', margin: '0 auto 1rem' }} />
                  <p className="empty-state-desc">
                    {orderFilter === 'all' ? 'Bạn chưa có đơn hàng nào tại Vọc Records' : 'Không có đơn hàng nào trong mục này'}
                  </p>
                  <Link to="/shop" className="neo-btn neo-btn--primary neo-btn--sm">Khám phá cửa hàng</Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {filteredOrders.map((order) => (
                    <div key={order.MaDH} className="order-card" style={{ boxShadow: '4px 4px 0 #000' }}>
                      <div className="order-card-header">
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                            <h3 style={{ fontWeight: 900, fontSize: '1.25rem', textTransform: 'uppercase', margin: 0, fontFamily: 'var(--font-heading)' }}>
                              ĐƠN HÀNG #{order.MaDH}
                            </h3>
                            {order.PhuongThucThanhToan && (
                              <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', border: '1px solid #000', fontWeight: 800, background: '#f1f5f9' }}>
                                {order.PhuongThucThanhToan.toUpperCase()}
                              </span>
                            )}
                            {order.TrangThaiTT === 'dathanhtoan' && (
                              <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', border: '1px solid #16a34a', fontWeight: 800, background: '#dcfce7', color: '#166534' }}>
                                ĐÃ THANH TOÁN
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--gray-500)', margin: 0 }}>
                            <Clock style={{ width: 13, height: 13, display: 'inline', marginRight: '0.25rem' }} />
                            {formatDate(order.NgayDat)}
                          </p>
                        </div>
                        <span className={`order-status ${getStatusClass(order.TrangThai)}`}>
                          {getStatusText(order.TrangThai)}
                        </span>
                      </div>

                      <div style={{ margin: '1rem 0', fontWeight: 700, fontSize: '0.925rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '0.75rem 0' }}>
                        <div>
                          <span style={{ color: 'var(--gray-500)' }}>TỔNG TIỀN THANH TOÁN: </span>
                          <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-danger)' }}>{formatPrice(order.TongTien)}</span>
                        </div>
                        {order.MaDonGHN && (
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#854d0e', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Truck style={{ width: 16, height: 16 }} />
                            <span>Mã vận đơn GHN: <strong>{order.MaDonGHN}</strong></span>
                          </div>
                        )}
                      </div>

                      <div className="order-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <Link to={`/order/${order.MaDH}`} className="neo-btn neo-btn--primary neo-btn--sm">
                          XEM CHI TIẾT ĐƠN HÀNG
                        </Link>
                        {order.MaDonGHN ? (
                          <span style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem', border: '2px solid #000', fontWeight: 700, background: '#fef9c3', color: '#854d0e', textTransform: 'uppercase' }}>
                            🚚 ĐÃ TẠO GHN ({order.MaDonGHN}) — LIÊN HỆ SHOP ĐỂ HỦY
                          </span>
                        ) : (
                          (order.TrangThai === 'choxacnhan' || order.TrangThai === 'daxacnhan' || order.TrangThai === 'dangchuanbihang') && (
                            <button onClick={() => handleInitiateCancel(order)} className="neo-btn neo-btn--danger neo-btn--sm">
                              HỦY ĐƠN HÀNG
                            </button>
                          )
                        )}
                      </div>

                      {/* Refund status banner for customer */}
                      {order.TrangThaiHoanTien === 'choxuly' && (
                        <div style={{ marginTop: '1rem', background: '#fef3c7', border: '2px solid #d97706', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 700, color: '#92400e' }}>
                          ⏳ ĐANG CHỜ SHOP HOÀN TIỀN: Shop đã nhận thông tin tài khoản và đang đối soát để hoàn trả lại tiền vào tài khoản ngân hàng của bạn.
                        </div>
                      )}
                      {order.TrangThaiHoanTien === 'dahoantien' && (
                        <div style={{ marginTop: '1rem', background: '#dcfce7', border: '2px solid #16a34a', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 700, color: '#166534' }}>
                          ✓ ĐÃ HOÀN TIỀN THÀNH CÔNG: Shop đã chuyển tiền hoàn trả vào tài khoản ngân hàng của bạn.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ADDRESS BOOK (SỔ ĐỊA CHỈ) */}
          {activeTab === 'addresses' && (
            <div>
              <div className="flex-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', fontFamily: 'var(--font-heading)', margin: 0 }}>
                    Sổ Địa Chỉ Giao Hàng
                  </h2>
                  <p style={{ margin: '0.25rem 0 0', color: 'var(--gray-600)', fontSize: '0.875rem', fontWeight: 600 }}>
                    Quản lý các địa chỉ nhận hàng để thanh toán nhanh hơn khi mua sắm
                  </p>
                </div>
                <button onClick={() => setShowAddAddressModal(true)} className="neo-btn neo-btn--primary neo-btn--sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Plus style={{ width: 16, height: 16 }} /> THÊM ĐỊA CHỈ MỚI
                </button>
              </div>

              {addresses.length === 0 ? (
                <div className="empty-state empty-state--dashed" style={{ padding: '3rem 1rem' }}>
                  <MapPin style={{ width: 64, height: 64, color: 'var(--gray-300)', margin: '0 auto 1rem' }} />
                  <p className="empty-state-desc">Bạn chưa lưu địa chỉ nhận hàng nào trong sổ địa chỉ.</p>
                  <button onClick={() => setShowAddAddressModal(true)} className="neo-btn neo-btn--primary neo-btn--sm">
                    + Thêm Địa Chỉ Đầu Tiên
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                  {addresses.map(addr => (
                    <div 
                      key={addr.MaDC} 
                      style={{ 
                        border: addr.MacDinh ? '3px solid #000' : '2px solid var(--gray-300)', 
                        padding: '1.5rem', 
                        background: addr.MacDinh ? '#fef9c3' : '#fff',
                        boxShadow: addr.MacDinh ? '4px 4px 0 #000' : 'none',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                        gap: '1rem'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '240px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '1.125rem', fontWeight: 900, textTransform: 'uppercase' }}>
                            {addr.NguoiNhan}
                          </span>
                          <span style={{ color: 'var(--gray-600)', fontWeight: 700, fontSize: '0.9rem' }}>
                            | {addr.SoDienThoai}
                          </span>
                          {addr.MacDinh === 1 && (
                            <span style={{ 
                              background: '#22c55e', 
                              color: '#fff', 
                              fontSize: '0.7rem', 
                              fontWeight: 900, 
                              padding: '0.2rem 0.5rem', 
                              border: '1px solid #000',
                              textTransform: 'uppercase'
                            }}>
                              ✓ MẶC ĐỊNH
                            </span>
                          )}
                        </div>
                        <p style={{ margin: '0 0 0.25rem', fontWeight: 600, fontSize: '0.95rem', color: '#1e293b' }}>
                          {addr.DiaChi}
                        </p>
                        {(addr.GHNPhuong || addr.GHNTinh) && (
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                            📍 {[addr.GHNPhuong, addr.GHNTinh].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {addr.MacDinh !== 1 && (
                          <button 
                            type="button" 
                            onClick={() => handleSetDefaultAddress(addr.MaDC)} 
                            className="neo-btn neo-btn--secondary neo-btn--sm"
                            style={{ fontSize: '0.75rem' }}
                          >
                            Đặt làm mặc định
                          </button>
                        )}
                        <button 
                          type="button" 
                          onClick={() => handleDeleteAddress(addr.MaDC)} 
                          className="neo-btn neo-btn--danger neo-btn--sm" 
                          title="Xóa địa chỉ"
                          style={{ padding: '0.4rem 0.6rem' }}
                        >
                          <Trash2 style={{ width: 16, height: 16 }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PROFILE (THÔNG TIN CÁ NHÂN) */}
          {activeTab === 'profile' && (
            <div style={{ maxWidth: '40rem' }}>
              <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', fontFamily: 'var(--font-heading)', margin: 0 }}>
                    Thông Tin Cá Nhân
                  </h2>
                  <p style={{ margin: '0.25rem 0 0', color: 'var(--gray-600)', fontSize: '0.875rem' }}>
                    Quản lý thông tin hồ sơ của bạn trên hệ thống
                  </p>
                </div>
                {!isEditing ? (
                  <button onClick={() => setIsEditing(true)} className="neo-btn neo-btn--secondary neo-btn--sm">
                    <Edit2 style={{ width: 16, height: 16 }} /> Chỉnh sửa
                  </button>
                ) : (
                  <button onClick={handleSaveProfile} disabled={profileSaving} className="neo-btn neo-btn--primary neo-btn--sm">
                    <Save style={{ width: 16, height: 16 }} /> {profileSaving ? 'Đang lưu...' : 'Lưu thông tin'}
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="neo-label">Họ và tên *</label>
                  <input 
                    type="text" 
                    value={profileData.fullName} 
                    onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })} 
                    disabled={!isEditing} 
                    className="neo-input" 
                    placeholder="Nguyễn Văn A"
                  />
                </div>

                <div className="form-group">
                  <label className="neo-label">Email tài khoản</label>
                  <input 
                    type="email" 
                    value={profileData.email} 
                    disabled 
                    className="neo-input" 
                    style={{ background: 'var(--gray-200)', cursor: 'not-allowed' }} 
                    title="Email đăng ký không thể thay đổi" 
                  />
                  <small style={{ color: 'var(--gray-500)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    * Email được liên kết cố định với tài khoản để nhận hóa đơn và thông báo đơn hàng.
                  </small>
                </div>

                <div className="form-group">
                  <label className="neo-label">Số điện thoại liên hệ</label>
                  <input 
                    type="tel" 
                    value={profileData.phone} 
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })} 
                    disabled={!isEditing} 
                    className="neo-input" 
                    placeholder="0912345678"
                  />
                </div>

                <div style={{ background: '#f8fafc', border: '2px solid #000', padding: '1rem', marginTop: '0.5rem' }}>
                  <div style={{ fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.35rem', fontSize: '0.875rem' }}>
                    📍 Quản lý địa chỉ giao hàng
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--gray-600)', lineHeight: 1.5 }}>
                    Để thêm nhiều địa chỉ giao hàng chuẩn GHN hoặc đổi địa chỉ mặc định, vui lòng chuyển qua tab{' '}
                    <button 
                      type="button" 
                      onClick={() => handleTabChange('addresses')} 
                      style={{ color: '#000', fontWeight: 800, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      [SỔ ĐỊA CHỈ]
                    </button>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CHANGE PASSWORD (ĐỔI MẬT KHẨU) */}
          {activeTab === 'password' && (
            <div style={{ maxWidth: '32rem' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', fontFamily: 'var(--font-heading)', margin: 0 }}>
                  Đổi Mật Khẩu
                </h2>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--gray-600)', fontSize: '0.875rem' }}>
                  Định kỳ đổi mật khẩu để bảo vệ tài khoản của bạn
                </p>
              </div>

              <form onSubmit={handleChangePasswordSubmit} className="auth-form">
                <div className="form-group">
                  <label className="neo-label">Mật khẩu hiện tại *</label>
                  <input 
                    type="password" 
                    required 
                    value={passwordForm.currentPassword} 
                    onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} 
                    className="neo-input" 
                    placeholder="Nhập mật khẩu đang dùng"
                  />
                </div>

                <div className="form-group">
                  <label className="neo-label">Mật khẩu mới * (tối thiểu 6 ký tự)</label>
                  <input 
                    type="password" 
                    required 
                    minLength={6} 
                    value={passwordForm.newPassword} 
                    onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} 
                    className="neo-input" 
                    placeholder="Mật khẩu mới"
                  />
                </div>

                <div className="form-group">
                  <label className="neo-label">Xác nhận mật khẩu mới *</label>
                  <input 
                    type="password" 
                    required 
                    minLength={6} 
                    value={passwordForm.confirmPassword} 
                    onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} 
                    className="neo-input" 
                    placeholder="Nhập lại mật khẩu mới"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={passwordSubmitting} 
                  className="neo-btn neo-btn--primary" 
                  style={{ marginTop: '0.5rem', width: '100%' }}
                >
                  {passwordSubmitting ? 'ĐANG CẬP NHẬT...' : 'CẬP NHẬT MẬT KHẨU'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 5: WISHLIST (SẢN PHẨM YÊU THÍCH) */}
          {activeTab === 'wishlist' && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', fontFamily: 'var(--font-heading)', margin: 0 }}>
                  Sản Phẩm Yêu Thích
                </h2>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--gray-600)', fontSize: '0.875rem' }}>
                  Danh sách những đĩa than, cassette và phụ kiện bạn đang quan tâm
                </p>
              </div>

              {wishlist.length === 0 ? (
                <div className="empty-state empty-state--dashed" style={{ padding: '3rem 1rem' }}>
                  <Heart style={{ width: 64, height: 64, color: 'var(--gray-300)', margin: '0 auto 1rem' }} />
                  <p className="empty-state-desc">Danh sách yêu thích của bạn đang trống</p>
                  <Link to="/shop" className="neo-btn neo-btn--primary neo-btn--sm">Khám phá ngay</Link>
                </div>
              ) : (
                <div className="grid-4-col">
                  {wishlist.map((item) => (
                    <div key={item.id} className="product-card">
                      <Link to={`/product/${item.id}`} className="product-card-image">
                        <img src={item.image} alt={item.title} />
                      </Link>
                      <div className="product-card-body">
                        <Link to={`/product/${item.id}`} style={{ textDecoration: 'none', marginBottom: '0.5rem', display: 'block' }}>
                          <h3 className="product-card-name line-clamp-1">{item.title}</h3>
                          <p className="product-card-artist line-clamp-1">{item.artist}</p>
                        </Link>
                        <div style={{ marginBottom: '1rem' }}>
                          <span style={{ fontWeight: 900, fontSize: '1.125rem' }}>{formatPrice(item.price)}</span>
                        </div>
                        <div className="product-card-footer" style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            onClick={() => addToCart({ id: item.id, title: item.title, artist: item.artist, price: item.price, image: item.image, stock: item.stock || 99 })} 
                            className="neo-btn neo-btn--primary neo-btn--sm" 
                            style={{ flex: 1 }}
                          >
                            VÀO GIỎ
                          </button>
                          <button 
                            onClick={() => handleRemoveWishlist(item.id)} 
                            className="neo-btn neo-btn--danger neo-btn--sm" 
                            title="Xóa khỏi yêu thích"
                          >
                            <Trash2 style={{ width: 16, height: 16 }} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Address Modal */}
      {showAddAddressModal && (
        <div className="neo-modal-overlay">
          <div className="neo-modal" style={{ maxWidth: '32rem' }}>
            <h2 className="neo-modal-title">Thêm Địa Chỉ Giao Hàng</h2>
            <form onSubmit={handleAddAddressSubmit} className="auth-form">
              <div className="form-group">
                <label className="neo-label">Tên người nhận *</label>
                <input 
                  type="text" 
                  required 
                  minLength={2} 
                  value={newAddressForm.recipientName} 
                  onChange={e => setNewAddressForm({ ...newAddressForm, recipientName: e.target.value })} 
                  className="neo-input" 
                  placeholder="HỌ VÀ TÊN" 
                />
              </div>

              <div className="form-group">
                <label className="neo-label">Số điện thoại *</label>
                <input 
                  type="tel" 
                  required 
                  pattern="^(0[3|5|7|8|9])+([0-9]{8})$" 
                  title="Số điện thoại Việt Nam gồm 10 chữ số (03, 05, 07, 08, 09)" 
                  value={newAddressForm.recipientPhone} 
                  onChange={e => setNewAddressForm({ ...newAddressForm, recipientPhone: e.target.value })} 
                  className="neo-input" 
                  placeholder="SỐ ĐIỆN THOẠI" 
                />
              </div>

              <div className="form-group">
                <label className="neo-label">Địa chỉ cụ thể (Số nhà, tên đường...) *</label>
                <textarea 
                  required 
                  minLength={10} 
                  rows={2} 
                  value={newAddressForm.address} 
                  onChange={e => setNewAddressForm({ ...newAddressForm, address: e.target.value })} 
                  className="neo-textarea" 
                  placeholder="VÍ DỤ: SỐ 54 TRIỀU KHÚC" 
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="neo-label">Tỉnh / thành GHN *</label>
                  {ghnProvinces.length > 0 ? (
                    <select 
                      required 
                      value={newAddressForm.provinceId} 
                      onChange={e => { 
                        const option = ghnProvinces.find(p => String(p._id) === e.target.value); 
                        setNewAddressForm({ 
                          ...newAddressForm, 
                          provinceId: e.target.value, 
                          provinceName: option?.name || '', 
                          wardId: '', 
                          wardName: '' 
                        }); 
                      }} 
                      className="neo-input"
                    >
                      <option value="">CHỌN TỈNH / THÀNH</option>
                      {ghnProvinces.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                    </select>
                  ) : (
                    <input 
                      required 
                      value={newAddressForm.provinceName} 
                      onChange={e => setNewAddressForm({ ...newAddressForm, provinceName: e.target.value })} 
                      className="neo-input" 
                      placeholder="TỈNH / THÀNH" 
                    />
                  )}
                </div>

                <div className="form-group">
                  <label className="neo-label">Phường / xã GHN *</label>
                  {ghnWards.length > 0 ? (
                    <select 
                      required 
                      value={newAddressForm.wardId} 
                      onChange={e => { 
                        const option = ghnWards.find(w => String(w._id) === e.target.value); 
                        setNewAddressForm({ 
                          ...newAddressForm, 
                          wardId: e.target.value, 
                          wardName: option?.name || '' 
                        }); 
                      }} 
                      className="neo-input"
                    >
                      <option value="">CHỌN PHƯỜNG / XÃ</option>
                      {ghnWards.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
                    </select>
                  ) : (
                    <input 
                      required 
                      value={newAddressForm.wardName} 
                      onChange={e => setNewAddressForm({ ...newAddressForm, wardName: e.target.value })} 
                      className="neo-input" 
                      placeholder="PHƯỜNG / XÃ" 
                    />
                  )}
                </div>
              </div>

              <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  id="isDefaultCheckbox" 
                  checked={newAddressForm.isDefault} 
                  onChange={e => setNewAddressForm({ ...newAddressForm, isDefault: e.target.checked })} 
                  style={{ width: '1.1rem', height: '1.1rem', accentColor: '#000', cursor: 'pointer' }}
                />
                <label htmlFor="isDefaultCheckbox" style={{ fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>
                  Đặt làm địa chỉ nhận hàng mặc định
                </label>
              </div>

              <div className="neo-modal-actions" style={{ marginTop: '1.25rem' }}>
                <button type="submit" disabled={addressSubmitting} className="neo-btn neo-btn--primary" style={{ flex: 1.2 }}>
                  {addressSubmitting ? 'ĐANG LƯU...' : 'LƯU ĐỊA CHỈ'}
                </button>
                <button type="button" onClick={() => setShowAddAddressModal(false)} className="neo-btn neo-btn--secondary" style={{ flex: 1 }}>
                  HỦY BỎ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Refund Modal */}
      {cancelingOrder && (
        <div className="neo-modal-overlay">
          <div className="neo-modal" style={{ maxWidth: '32rem' }}>
            <h2 className="neo-modal-title">Yêu Cầu Hoàn Tiền Đơn Hàng #{cancelingOrder.MaDH}</h2>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '1.25rem', borderBottom: '2px solid #000', paddingBottom: '0.75rem' }}>
              Đơn hàng này đã thanh toán Online ({formatPrice(cancelingOrder.TongTien)}). Vui lòng cung cấp số tài khoản chính xác để Vọc Records chuyển hoàn tiền lại cho bạn.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); executeCancel(cancelingOrder.MaDH, refundForm); }} className="auth-form">
              <div className="form-group">
                <label className="neo-label">Ngân Hàng Nhận Tiền *</label>
                <select 
                  value={refundForm.nganHang} 
                  onChange={(e) => setRefundForm({ ...refundForm, nganHang: e.target.value })} 
                  className="neo-input"
                  required
                >
                  <option value="Vietcombank">Vietcombank (VCB)</option>
                  <option value="MB Bank">MB Bank (Quân Đội)</option>
                  <option value="Techcombank">Techcombank (TCB)</option>
                  <option value="VietinBank">VietinBank (CTG)</option>
                  <option value="BIDV">BIDV</option>
                  <option value="ACB">ACB (Á Châu)</option>
                  <option value="VPBank">VPBank</option>
                  <option value="TPBank">TPBank (Tiên Phong)</option>
                  <option value="Sacombank">Sacombank</option>
                  <option value="MoMo">Ví MoMo</option>
                  <option value="Khac">Ngân hàng khác (Ghi rõ vào lý do)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="neo-label">Số Tài Khoản / Số Điện Thoại Ví *</label>
                <input 
                  type="text" 
                  required 
                  value={refundForm.soTK} 
                  onChange={(e) => setRefundForm({ ...refundForm, soTK: e.target.value })} 
                  className="neo-input" 
                  placeholder="VÍ DỤ: 0123456789" 
                />
              </div>
              <div className="form-group">
                <label className="neo-label">Tên Chủ Tài Khoản (VIẾT HOA KHÔNG DẤU) *</label>
                <input 
                  type="text" 
                  required 
                  value={refundForm.chuTK} 
                  onChange={(e) => setRefundForm({ ...refundForm, chuTK: e.target.value.toUpperCase() })} 
                  className="neo-input" 
                  placeholder="NGUYEN VAN A" 
                />
              </div>
              <div className="form-group">
                <label className="neo-label">Lý Do Hủy Đơn</label>
                <textarea 
                  rows={2} 
                  value={refundForm.lyDo} 
                  onChange={(e) => setRefundForm({ ...refundForm, lyDo: e.target.value })} 
                  className="neo-textarea" 
                  placeholder="Lý do hủy đơn hàng..." 
                />
              </div>
              <div className="neo-modal-actions" style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
                <button type="submit" disabled={cancelLoading} className="neo-btn neo-btn--danger" style={{ flex: 1.5 }}>
                  {cancelLoading ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN HỦY & HOÀN TIỀN'}
                </button>
                <button type="button" onClick={() => setCancelingOrder(null)} disabled={cancelLoading} className="neo-btn neo-btn--secondary" style={{ flex: 1 }}>
                  ĐÓNG
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
