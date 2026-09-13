import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { 
  LayoutDashboard, Package, ShoppingCart, Users, Warehouse, Menu, Trash2, 
  Edit, Search, PenTool, Tag, Eye, Plus, RefreshCw, X, MessageCircle, RotateCcw,
  Download, FileSpreadsheet, Printer
} from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { AdminEmployees } from '../components/AdminEmployees';
import { AdminDiscounts } from '../components/AdminDiscounts';
import { AdminChat } from '../components/AdminChat';
import { API_BASE } from '../config/api';
import '../../styles/pages/admin.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type MenuSection = 'dashboard' | 'products' | 'orders' | 'customers' | 'inventory' | 'blog' | 'chat' | 'comments' | 'returns' | 'employees' | 'discounts';

type ContentForm = {
  title: string;
  type: 'blog' | 'huongdan';
  status: 'daxuatban' | 'nhap';
  category: string;
  difficulty: string;
  summary: string;
  duration: string;
  audience: string;
  tools: string;
  steps: string;
  content: string;
  image: string;
};

const EMPTY_CONTENT_FORM: ContentForm = {
  title: '', type: 'blog', status: 'nhap', category: 'Kiến thức Vinyl', difficulty: '',
  summary: '', duration: '', audience: '', tools: '', steps: '', content: '',
  image: '/images/products/catalog/a-love-supreme.jpg'
};
const BLOG_CONTENT_CATEGORIES = ['Kiến thức Vinyl', 'Review Album', 'Nghệ sĩ & Câu chuyện', 'Văn hóa Analog'];
const GUIDE_CONTENT_CATEGORIES = ['Hướng dẫn cơ bản', 'Bảo trì thiết bị', 'Kỹ thuật nâng cao'];
const PRODUCT_MUSIC_GENRES = ['ROCK', 'CLASSIC ROCK', 'PROGRESSIVE ROCK', 'SOFT ROCK', 'ALTERNATIVE ROCK', 'GRUNGE', 'ALTERNATIVE', 'ELECTRONIC', 'TRIP HOP', 'ALTERNATIVE HIP HOP', 'AMBIENT', 'POP', 'PSYCHEDELIC POP', 'SYNTH-POP', 'R&B', 'SOUL', 'JAZZ', 'SMOOTH JAZZ', 'VOCAL JAZZ', 'JAPANESE JAZZ', 'BLUES', 'FUNK / SOUL', 'DISCO', 'HIP HOP', 'REGGAE', 'LATIN', 'BOSSA NOVA', 'FOLK', 'INDIE FOLK', 'COUNTRY', 'WORLD', 'CLASSICAL', 'STAGE & SCREEN', 'CITY POP', 'VIỆT NAM', 'CHRISTMAS'];

export function Admin() {
  const [searchParams, setSearchParams] = useSearchParams();
  const validSections: MenuSection[] = [
    'dashboard', 'products', 'orders', 'customers', 'inventory', 
    'blog', 'chat', 'comments', 'returns', 'employees', 'discounts'
  ];

  const getInitialSection = (): MenuSection => {
    const urlTab = (searchParams.get('tab') || searchParams.get('section')) as MenuSection;
    if (urlTab && validSections.includes(urlTab)) {
      return urlTab;
    }
    const saved = localStorage.getItem('voc_admin_section') as MenuSection;
    if (saved && validSections.includes(saved)) {
      return saved;
    }
    return 'dashboard';
  };

  const [activeSection, setActiveSection] = useState<MenuSection>(getInitialSection);

  // Sync state when URL search param changes or keep URL in sync
  useEffect(() => {
    const urlTab = (searchParams.get('tab') || searchParams.get('section')) as MenuSection;
    if (urlTab && validSections.includes(urlTab)) {
      if (urlTab !== activeSection) {
        setActiveSection(urlTab);
      }
      localStorage.setItem('voc_admin_section', urlTab);
    } else {
      setSearchParams({ tab: activeSection }, { replace: true });
      localStorage.setItem('voc_admin_section', activeSection);
    }
  }, [searchParams]);

  const handleSectionChange = (section: MenuSection) => {
    setActiveSection(section);
    setSearchParams({ tab: section }, { replace: true });
    localStorage.setItem('voc_admin_section', section);
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({ todayRevenue: 0, todayOrders: 0, totalProducts: 0, totalCustomers: 0, topProducts: [] as any[]});
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [contentItems, setContentItems] = useState<any[]>([]);
  const [contentTypeFilter, setContentTypeFilter] = useState('all');
  const [contentStatusFilter, setContentStatusFilter] = useState('all');
  const [editingContent, setEditingContent] = useState<any>(null);
  const [contentForm, setContentForm] = useState<ContentForm>(EMPTY_CONTENT_FORM);
  const [comments, setComments] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any>(null);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const adminHeaders = { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` };

  const menuItems = [
    { id: 'dashboard' as MenuSection, label: 'DASHBOARD', icon: LayoutDashboard },
    { id: 'products' as MenuSection, label: 'THÊM SẢN PHẨM', icon: Package },
    { id: 'inventory' as MenuSection, label: 'KHO HÀNG', icon: Warehouse },
    { id: 'orders' as MenuSection, label: 'ĐƠN HÀNG', icon: ShoppingCart },
    { id: 'customers' as MenuSection, label: 'KHÁCH HÀNG', icon: Users },
    { id: 'blog' as MenuSection, label: 'QUẢN LÝ BLOG', icon: PenTool },
    { id: 'chat' as MenuSection, label: 'CHAT KHÁCH HÀNG', icon: MessageCircle },
    { id: 'comments' as MenuSection, label: 'HỎI ĐÁP SẢN PHẨM', icon: MessageCircle },
    { id: 'returns' as MenuSection, label: 'TRẢ HÀNG / KHIẾU NẠI', icon: RotateCcw },
    { id: 'discounts' as MenuSection, label: 'MÃ GIẢM GIÁ', icon: Tag },
  ];
  if (user && user.role === 'admin') { menuItems.push({ id: 'employees' as MenuSection, label: 'NHÂN SỰ', icon: Users }); }

  const fetchDashboard = () => {
    fetch(`${API_BASE}/admin/dashboard`, { headers: adminHeaders }).then(res => res.json()).then(data => { if(data.success) setStats(data.data); }).catch(console.error);
    fetch(`${API_BASE}/admin/revenue-report`, { headers: adminHeaders }).then(res => res.json()).then(data => { if(data.success) setRevenueData(data.data); }).catch(console.error);
  };

  const fetchOrders = () => {
    fetch(`${API_BASE}/orders`, { headers: adminHeaders }).then(res => res.json()).then(data => {
      if (data.success && data.data) { setOrders(data.data.map((o: any) => ({ id: o.MaDH, order_code: 'ORD-' + o.MaDH.toString().padStart(3, '0'), customer: o.HoTen || o.MaKH || 'Khách vãng lai', total: parseFloat(o.TongTien), status: o.TrangThai, date: o.NgayDat, ghnCode: o.MaDonGHN, ghnStatus: o.GHNTrangThai, refundStatus: o.TrangThaiHoanTien, refundInfo: o.ThongTinHoanTien }))); }
    }).catch(console.error);
  };

  const fetchCustomers = () => { fetch(`${API_BASE}/admin/customers`, { headers: adminHeaders }).then(res => res.json()).then(data => { if(data.success) setCustomers(data.data); }).catch(console.error); };
  const fetchInventory = () => { fetch(`${API_BASE}/admin/inventory`, { headers: adminHeaders }).then(res => res.json()).then(data => { if(data.success) setInventory(data.data); }).catch(console.error); };
  const fetchContent = async () => {
    try {
      const params = new URLSearchParams({ status: contentStatusFilter, limit: '100' });
      if (contentTypeFilter !== 'all') params.set('type', contentTypeFilter);
      const res = await fetch(`${API_BASE}/blogs/manage?${params.toString()}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` } });
      const data = await res.json();
      if (data.success) setContentItems(data.data || []);
      else alert(data.message || 'Không thể tải nội dung');
    } catch { alert('Không thể kết nối tới máy chủ'); }
  };
  const fetchComments = async () => {
    const res = await fetch(`${API_BASE}/comments/manage`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` } });
    const data = await res.json(); if (data.success) setComments(data.data || []);
  };
  const fetchReturns = async () => {
    const res = await fetch(`${API_BASE}/returns/manage`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` } });
    const data = await res.json(); if (data.success) setReturns(data.data || []);
  };

  useEffect(() => {
    if(activeSection === 'dashboard') fetchDashboard();
    else if(activeSection === 'orders') fetchOrders();
    else if(activeSection === 'customers') fetchCustomers();
    else if(activeSection === 'inventory') { fetchInventory(); setEditingProduct(null); setSearchQuery(''); }
    else if(activeSection === 'blog') fetchContent();
    else if(activeSection === 'comments') fetchComments();
    else if(activeSection === 'returns') fetchReturns();
  }, [activeSection, contentTypeFilter, contentStatusFilter]);

  const resetContentForm = () => { setEditingContent(null); setContentForm(EMPTY_CONTENT_FORM); };

  const handleContentSubmit = async (e: any) => {
    e.preventDefault();
    const payload = { ...contentForm, steps: contentForm.type === 'huongdan' ? contentForm.steps : '' };
    const endpoint = editingContent ? `${API_BASE}/blogs/${editingContent.id}` : `${API_BASE}/blogs`;
    try {
      const res = await fetch(endpoint, {
        method: editingContent ? 'PUT' : 'POST', body: JSON.stringify(payload),
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}`, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!data.success) return alert(data.message || 'Không thể lưu nội dung');
      alert(editingContent ? 'Đã cập nhật nội dung!' : 'Đã tạo nội dung!');
      resetContentForm();
      fetchContent();
    } catch { alert('Không thể kết nối tới máy chủ'); }
  };

  const startEditContent = (item: any) => {
    let steps = '';
    if (Array.isArray(item.steps)) steps = item.steps.join('\n');
    else if (item.steps) {
      try { const parsed = JSON.parse(item.steps); steps = Array.isArray(parsed) ? parsed.join('\n') : String(item.steps); } catch { steps = String(item.steps); }
    }
    setEditingContent(item);
    setContentForm({
      title: item.title || '', type: item.type || 'blog', status: item.status || 'nhap',
      category: item.category || (item.type === 'huongdan' ? 'Hướng dẫn cơ bản' : 'Kiến thức Vinyl'),
      difficulty: item.difficulty || '', summary: item.summary || '', duration: item.duration || '',
      audience: item.audience || '', tools: item.tools || '', steps, content: item.content || '', image: item.image || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteContent = async (id: number) => {
    if (!window.confirm('XÓA NỘI DUNG NÀY? KHÔNG THỂ HOÀN TÁC!')) return;
    try {
      const res = await fetch(`${API_BASE}/blogs/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` } });
      const data = await res.json();
      if (data.success) { alert('Đã xóa nội dung!'); if (editingContent?.id === id) resetContentForm(); fetchContent(); }
      else alert(data.message || 'Không thể xóa nội dung');
    } catch { alert('Không thể kết nối tới máy chủ'); }
  };

  const updateCommentStatus = async (id: number, status: string) => {
    const res = await fetch(`${API_BASE}/comments/${id}/status`, { method: 'PUT', headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    const data = await res.json(); if (data.success) fetchComments(); else alert(data.message || 'Không thể cập nhật');
  };
  const replyComment = async (id: number) => {
    const content = (replyDrafts[id] || '').trim(); if (!content) return;
    const res = await fetch(`${API_BASE}/comments/${id}/reply`, { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) });
    const data = await res.json(); if (data.success) { setReplyDrafts({ ...replyDrafts, [id]: '' }); fetchComments(); } else alert(data.message || 'Không thể gửi phản hồi');
  };
  const updateReturnStatus = async (id: number, status: string) => {
    const res = await fetch(`${API_BASE}/returns/${id}/status`, { method: 'PUT', headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    const data = await res.json(); if (data.success) fetchReturns(); else alert(data.message || 'Không thể cập nhật yêu cầu');
  };

  const handleUpdateOrderStatus = async (orderId: number, status: string) => {
    try { const res = await fetch(`${API_BASE}/orders/${orderId}/status`, { method: 'PUT', body: JSON.stringify({order_id: orderId, status}), headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}`, 'Content-Type': 'application/json' } }); const d = await res.json(); if(d.success) { alert('Cập nhật thành công!'); fetchOrders(); } else alert(d.message); } catch(e) { console.error(e); }
  };

  const handleCreateShipment = async (orderId: number) => {
    const res = await fetch(`${API_BASE}/shipping/orders/${orderId}/create`, { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}`, 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    const data = await res.json(); if (data.success) { alert(`Đã tạo đơn GHN: ${data.data.order_code}`); fetchOrders(); } else alert(data.message || 'Không thể tạo đơn GHN');
  };

  const handleConfirmRefund = async (orderId: number) => {
    if (!window.confirm(`Xác nhận bạn đã chuyển khoản hoàn tiền cho Đơn hàng #${orderId}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/refund-confirm`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}`, 'Content-Type': 'application/json' }
      });
      const d = await res.json();
      if (d.success) {
        alert('Đã xác nhận hoàn tiền thành công!');
        fetchOrders();
      } else {
        alert(d.message || 'Lỗi khi xác nhận hoàn tiền');
      }
    } catch (e: any) {
      alert('Lỗi kết nối: ' + e.message);
    }
  };

  const handleViewOrderDetails = async (orderId: number) => {
    setLoadingOrderDetails(true);
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}`, {
        headers: adminHeaders
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSelectedOrderDetails(data.data);
      } else {
        alert(data.message || 'Không thể tải thông tin đơn hàng');
      }
    } catch (e: any) {
      alert('Lỗi kết nối: ' + e.message);
    } finally {
      setLoadingOrderDetails(false);
    }
  };

  const handlePrintInvoice = (orderDetail: any) => {
    if (!orderDetail || !orderDetail.info) return;
    const { info, items } = orderDetail;
    const printWindow = window.open('', '_blank', 'width=850,height=950');
    if (!printWindow) {
      alert('Trình duyệt đã chặn cửa sổ in hóa đơn. Vui lòng cho phép popup để xuất hóa đơn!');
      return;
    }

    const now = new Date();
    const invoiceContent = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>Hóa Đơn Bán Hàng #${info.MaDH} - Vọc Records</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #111; margin: 0; padding: 25px; line-height: 1.5; font-size: 13px; }
          .invoice-box { max-width: 750px; margin: auto; }
          .header { display: flex; justify-content: space-between; border-bottom: 3px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
          .store-name { font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; }
          .store-info { font-size: 12px; color: #444; margin-top: 5px; line-height: 1.5; }
          .invoice-title { text-align: right; }
          .invoice-title h1 { margin: 0; font-size: 22px; font-weight: 900; text-transform: uppercase; }
          .invoice-meta { font-size: 12px; color: #444; margin-top: 5px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .info-box { border: 1.5px solid #000; padding: 12px; background: #fafafa; }
          .info-box h3 { margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #ddd; padding-bottom: 4px; font-weight: 800; }
          .info-box p { margin: 4px 0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #f1f5f9; font-weight: 800; text-align: left; padding: 8px 10px; border: 1.5px solid #000; font-size: 11px; text-transform: uppercase; }
          td { padding: 8px 10px; border: 1px solid #ccc; font-size: 12px; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .total-section { display: flex; justify-content: flex-end; margin-bottom: 25px; }
          .total-table { width: 320px; }
          .total-table td { border: none; padding: 4px 8px; }
          .total-row { font-size: 15px; font-weight: 900; border-top: 2px solid #000 !important; color: #b91c1c; }
          .footer-note { text-align: center; margin-top: 30px; border-top: 1px dashed #aaa; padding-top: 15px; font-style: italic; color: #555; font-size: 12px; }
          .signatures { display: flex; justify-content: space-between; margin-top: 35px; padding: 0 40px; text-align: center; }
          .sign-title { font-weight: 800; text-transform: uppercase; margin-bottom: 60px; font-size: 12px; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="header">
            <div>
              <div class="store-name">VỌC RECORDS</div>
              <div class="store-info">
                <div>Chuyên Đĩa Than, Cassette & Thiết Bị Âm Thanh</div>
                <div>Địa chỉ: 54 Triều Khúc, Phường Thanh Xuân Nam, Quận Thanh Xuân, Hà Nội</div>
                <div>Hotline / Zalo: <strong>0766 255 478</strong></div>
              </div>
            </div>
            <div class="invoice-title">
              <h1>HÓA ĐƠN BÁN HÀNG</h1>
              <div class="invoice-meta">
                <div><strong>Mã đơn:</strong> #ORD-${String(info.MaDH).padStart(3, '0')}</div>
                <div><strong>Ngày đặt:</strong> ${new Date(info.NgayDat).toLocaleString('vi-VN')}</div>
                <div><strong>Ngày in HĐ:</strong> ${now.toLocaleString('vi-VN')}</div>
              </div>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-box">
              <h3>Thông Tin Người Nhận</h3>
              <p><strong>Họ và tên:</strong> ${info.NguoiNhan || 'Khách vãng lai'}</p>
              <p><strong>Số điện thoại:</strong> ${info.SDTNhan || '—'}</p>
              <p><strong>Địa chỉ giao:</strong> ${info.DiaChiGiao || '—'}</p>
              ${info.GhiChu ? `<p><strong>Ghi chú:</strong> ${info.GhiChu}</p>` : ''}
            </div>
            <div class="info-box">
              <h3>Thanh Toán & Vận Chuyển</h3>
              <p><strong>Hình thức TT:</strong> ${String(info.ThanhToanHinhThuc || 'COD').toUpperCase()}</p>
              <p><strong>Trạng thái TT:</strong> ${info.TrangThaiTT === 'dathanhtoan' ? 'ĐÃ THANH TOÁN' : 'CHƯA THANH TOÁN'}</p>
              ${info.MaDonGHN ? `<p><strong>Mã vận đơn GHN:</strong> ${info.MaDonGHN}</p>` : ''}
              ${info.GHNExpectedDelivery ? `<p><strong>Dự kiến giao:</strong> ${new Date(info.GHNExpectedDelivery).toLocaleDateString('vi-VN')}</p>` : ''}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th class="text-center" style="width: 35px;">STT</th>
                <th>Tên Sản Phẩm / Đĩa Nhạc</th>
                <th>Nghệ Sĩ</th>
                <th class="text-center" style="width: 45px;">SL</th>
                <th class="text-right" style="width: 110px;">Đơn Giá</th>
                <th class="text-right" style="width: 120px;">Thành Tiền</th>
              </tr>
            </thead>
            <tbody>
              ${(items || []).map((item: any, idx: number) => `
                <tr>
                  <td class="text-center">${idx + 1}</td>
                  <td><strong>${item.TenSP}</strong></td>
                  <td>${item.NgheSi || '—'}</td>
                  <td class="text-center">${item.SoLuong}</td>
                  <td class="text-right">${Number(item.DonGia).toLocaleString('vi-VN')}đ</td>
                  <td class="text-right">${(Number(item.DonGia) * Number(item.SoLuong)).toLocaleString('vi-VN')}đ</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="total-section">
            <table class="total-table">
              <tr>
                <td>Tạm tính:</td>
                <td class="text-right"><strong>${(items || []).reduce((sum: number, i: any) => sum + (Number(i.DonGia) * Number(i.SoLuong)), 0).toLocaleString('vi-VN')}đ</strong></td>
              </tr>
              ${Number(info.SoTienGiam) > 0 ? `
                <tr>
                  <td>Giảm giá (${info.CodeGiamGia || 'Voucher'}):</td>
                  <td class="text-right" style="color: #b91c1c;">-${Number(info.SoTienGiam).toLocaleString('vi-VN')}đ</td>
                </tr>
              ` : ''}
              <tr>
                <td>Phí vận chuyển:</td>
                <td class="text-right">${Number(info.PhiVanChuyen || 0).toLocaleString('vi-VN')}đ</td>
              </tr>
              <tr class="total-row">
                <td>TỔNG THANH TOÁN:</td>
                <td class="text-right">${Number(info.TongTien).toLocaleString('vi-VN')}đ</td>
              </tr>
            </table>
          </div>

          <div class="signatures">
            <div>
              <div class="sign-title">KHÁCH HÀNG</div>
              <div>(Ký, ghi rõ họ tên)</div>
            </div>
            <div>
              <div class="sign-title">ĐẠI DIỆN VỌC RECORDS</div>
              <div>(Ký, đóng dấu)</div>
            </div>
          </div>

          <div class="footer-note">
            <p>Cảm ơn quý khách đã mua sắm tại Vọc Records! Chúc bạn có những phút giây trải nghiệm âm nhạc trọn vẹn.</p>
            <p>Khiếu nại & Hỗ trợ kỹ thuật: <strong>0766 255 478</strong></p>
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(invoiceContent);
    printWindow.document.close();
  };

  const handleDeleteProduct = async (productId: number) => {
    if(!window.confirm("XÓA SẢN PHẨM NÀY? KHÔNG THỂ HOÀN TÁC!")) return;
    try { const res = await fetch(`${API_BASE}/products/${productId}`, { method: 'DELETE', body: JSON.stringify({id: productId}), headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}`, 'Content-Type': 'application/json' } }); const d = await res.json(); if(d.success) { alert('Đã xóa!'); fetchInventory(); } else alert(d.message); } catch(e) { console.error(e); }
  };

  const handleEditSubmit = async (e: any) => {
    e.preventDefault(); const formData = new FormData(e.currentTarget); const payload: any = Object.fromEntries(formData.entries()); payload.id = editingProduct.id;
    try { const res = await fetch(`${API_BASE}/products/${payload.id}`, { method: 'PUT', body: JSON.stringify(payload), headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}`, 'Content-Type': 'application/json' } }); const d = await res.json(); if(d.success) { alert('Cập nhật thành công!'); setEditingProduct(null); fetchInventory(); } else alert('Lỗi: ' + d.message); } catch { alert('Lỗi kết nối!'); }
  };

  const filteredInventory = inventory.filter(sp => sp.name.toLowerCase().includes(searchQuery.toLowerCase()) || sp.id.toString().includes(searchQuery));

  const handleExportDashboardExcel = () => {
    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toLocaleTimeString('vi-VN');

      let csv = '\uFEFF'; // UTF-8 BOM for Microsoft Excel

      // Tiêu đề
      csv += 'BÁO CÁO KINH DOANH TỔNG HỢP - VỌC RECORDS\n';
      csv += `Thời gian xuất: ${now.toLocaleDateString('vi-VN')} ${timeStr}\n`;
      csv += `Người lập báo cáo: ${user?.name || user?.username || 'Quản trị viên'}\n\n`;

      // 1. Chỉ số tổng quan
      csv += '--- CHỈ SỐ TỔNG QUAN HÔM NAY ---\n';
      csv += 'Chỉ số,Giá trị\n';
      csv += `Doanh thu hôm nay,"${stats.todayRevenue.toLocaleString('vi-VN')} đ"\n`;
      csv += `Đơn hàng hôm nay,${stats.todayOrders}\n`;
      csv += `Tổng sản phẩm trong kho,${stats.totalProducts}\n`;
      csv += `Tổng khách hàng đăng ký,${stats.totalCustomers}\n\n`;

      // 2. Doanh thu 30 ngày qua
      csv += '--- DOANH THU 30 NGÀY QUA ---\n';
      csv += 'Ngày,Doanh thu (VNĐ)\n';
      if (revenueData && revenueData.length > 0) {
        revenueData.forEach((r: any) => {
          csv += `"${r.date}",${Number(r.revenue || 0)}\n`;
        });
      } else {
        csv += 'Chưa có dữ liệu\n';
      }
      csv += '\n';

      // 3. Top sản phẩm bán chạy
      csv += '--- TOP SẢN PHẨM BÁN CHẠY ---\n';
      csv += 'Tên sản phẩm,Nghệ sĩ,Số lượng đã bán,Tổng doanh thu (VNĐ)\n';
      if (stats.topProducts && stats.topProducts.length > 0) {
        stats.topProducts.forEach((p: any) => {
          csv += `"${(p.name || '').replace(/"/g, '""')}","${(p.artist || '').replace(/"/g, '""')}",${p.sales || 0},${Number(p.revenue || 0)}\n`;
        });
      } else {
        csv += 'Chưa có dữ liệu\n';
      }
      csv += '\n';

      // 4. Danh sách đơn hàng gần đây
      if (orders && orders.length > 0) {
        csv += '--- DANH SÁCH ĐƠN HÀNG GẦN ĐÂY ---\n';
        csv += 'Mã đơn,Khách hàng,Thời gian đặt,Tổng tiền (VNĐ),Trạng thái đơn,Mã GHN,Trạng thái GHN\n';
        orders.forEach((o: any) => {
          const statusMap: Record<string, string> = {
            choxacnhan: 'Chờ xác nhận',
            daxacnhan: 'Đã xác nhận',
            dangchuanbihang: 'Đang chuẩn bị',
            danggiaohang: 'Đang giao',
            hoanthanh: 'Hoàn thành',
            dahuy: 'Đã hủy'
          };
          const statusText = statusMap[o.status] || o.status;
          csv += `"${o.order_code}","${(o.customer || '').replace(/"/g, '""')}","${new Date(o.date).toLocaleString('vi-VN')}",${o.total},"${statusText}","${o.ghnCode || 'Chưa tạo'}","${o.ghnStatus || ''}"\n`;
        });
      }

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Bao_Cao_Kinh_Doanh_Voc_Records_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Có lỗi khi xuất file Excel');
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Header with Export Excel Button */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              flexWrap: 'wrap', 
              gap: '1rem', 
              background: '#fff', 
              border: '3px solid #000', 
              padding: '1.25rem 1.5rem', 
              boxShadow: '4px 4px 0 #000' 
            }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'var(--font-heading)', margin: 0, textTransform: 'uppercase' }}>
                  TỔNG QUAN HOẠT ĐỘNG KINH DOANH
                </h2>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--gray-600)', fontSize: '0.85rem', fontWeight: 600 }}>
                  Dữ liệu thống kê doanh thu, đơn hàng và sản phẩm bán chạy theo thời gian thực
                </p>
              </div>
              <button
                onClick={handleExportDashboardExcel}
                className="neo-btn neo-btn--primary"
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  background: '#16a34a', 
                  color: '#fff', 
                  fontWeight: 800,
                  fontSize: '0.875rem'
                }}
                title="Tải về file Excel (CSV UTF-8) mở bằng Excel/Sheets"
              >
                <Download style={{ width: 18, height: 18 }} />
                XUẤT BÁO CÁO EXCEL
              </button>
            </div>

            <div className="admin-stat-grid">
              <div className="admin-stat-card admin-stat-card--yellow"><div className="admin-stat-label">DOANH THU HÔM NAY</div><div className="admin-stat-value">{stats.todayRevenue.toLocaleString('vi-VN')}đ</div></div>
              <div className="admin-stat-card admin-stat-card--pink"><div className="admin-stat-label">ĐƠN HÀNG HÔM NAY</div><div className="admin-stat-value">{stats.todayOrders}</div></div>
              <div className="admin-stat-card admin-stat-card--blue"><div className="admin-stat-label">TỔNG SẢN PHẨM</div><div className="admin-stat-value">{stats.totalProducts}</div></div>
              <div className="admin-stat-card admin-stat-card--green"><div className="admin-stat-label">TỔNG KHÁCH HÀNG</div><div className="admin-stat-value">{stats.totalCustomers}</div></div>
            </div>
            <div className="admin-table-box">
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', fontFamily: 'var(--font-heading)' }}>Biểu đồ Doanh Thu (30 Ngày Trước)</h3>
              <div style={{ width: '100%', height: '400px' }}>
                <Bar data={{ labels: revenueData.map(r => r.date), datasets: [{ label: 'Doanh thu (VNĐ)', data: revenueData.map(r => r.revenue), backgroundColor: '#facc15', borderColor: '#000', borderWidth: 2 }] }} options={{ responsive: true, maintainAspectRatio: false }} />
              </div>
            </div>
            <div className="admin-table-box">
              <h3 style={{ fontSize: '1.5rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem', marginBottom: '1rem' }}>SẢN PHẨM BÁN CHẠY</h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="admin-table">
                  <thead><tr><th>TÊN SP</th><th>ĐÃ BÁN</th><th>DOANH THU</th></tr></thead>
                  <tbody>{stats.topProducts.map((p, i) => (<tr key={i}><td style={{ textTransform: 'uppercase' }}>{p.name} <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>({p.artist})</span></td><td>{p.sales}</td><td style={{ color: '#15803d' }}>{Number(p.revenue).toLocaleString('vi-VN')}đ</td></tr>))}</tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'products':
        return (
          <div className="admin-form-box">
            <h2 style={{ fontSize: '1.875rem', marginBottom: '1.5rem', fontFamily: 'var(--font-heading)' }}>Thêm Sản Phẩm Mới</h2>
            <form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); const payload = Object.fromEntries(fd.entries()); try { const res = await fetch(`${API_BASE}/products`, { method: 'POST', body: JSON.stringify(payload), headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}`, 'Content-Type': 'application/json' } }); const d = await res.json(); if(d.success) { alert('Thêm thành công!'); e.currentTarget.reset(); } else alert('Lỗi: ' + d.message); } catch { alert('Lỗi kết nối!'); } }} className="admin-form">
                <div className="form-group"><label className="neo-label">Tên sản phẩm *</label><input name="title" required className="neo-input" /></div>
                <div className="form-row">
                <div className="form-group"><label className="neo-label">Nghệ sĩ *</label><input name="artist" required className="neo-input" /></div>
                <div className="form-group"><label className="neo-label">Thể loại *</label><select name="genre" required className="neo-input"><option value="Đĩa Than (Vinyl)">Đĩa Than (Vinyl)</option><option value="Cassette">Cassette</option><option value="Máy Quay Đĩa (Turntable)">Máy Quay Đĩa (Turntable)</option><option value="Phụ Kiện">Phụ Kiện</option></select></div>
              </div>
              <div className="form-group"><label className="neo-label">Thể loại nhạc</label><select name="music_genre" className="neo-input"><option value="">Không áp dụng / chưa cập nhật</option>{PRODUCT_MUSIC_GENRES.map((genre) => <option key={genre} value={genre}>{genre}</option>)}</select></div>
              <div className="form-row">
                <div className="form-group"><label className="neo-label">Giá bán (VNĐ) *</label><input type="number" name="price" required className="neo-input" /></div>
                <div className="form-group"><label className="neo-label">Số lượng *</label><input type="number" name="stock" required className="neo-input" /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="neo-label">Năm phát hành</label><input type="number" name="year" defaultValue={2024} required className="neo-input" /></div>
                <div className="form-group"><label className="neo-label">Tình trạng</label><select name="status" required className="neo-input"><option value="conhang">Còn hàng</option><option value="saphethang">Sắp hết hàng</option><option value="hethang">Hết hàng</option><option value="preorder">Pre-order</option><option value="ngungkinhdoanh">Ngừng kinh doanh</option></select></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="neo-label">Định dạng / phiên bản</label><input name="format" className="neo-input" placeholder={'Ví dụ: Vinyl 12" 2LP'} /></div>
                <div className="form-group"><label className="neo-label">Tình trạng bìa / đĩa</label><input name="condition" className="neo-input" placeholder="Ví dụ: Brand New (SS)" /></div>
              </div>
              <div className="form-group"><label className="neo-label">Quy cách</label><input name="package_info" className="neo-input" placeholder="Ví dụ: 1 x Album" /></div>
              <div className="form-group"><label className="neo-label">Tracklist (mỗi bài một dòng)</label><textarea name="tracklist" rows={5} className="neo-textarea" placeholder="Chỉ nhập khi đã đối soát đúng phiên bản sản phẩm." /></div>
                <div className="form-group"><label className="neo-label">Đường dẫn hình ảnh *</label><input name="image" required defaultValue="/images/products/vinyl-01.webp" className="neo-input" /></div>
              <button type="submit" className="neo-btn neo-btn--primary neo-btn--full" style={{ marginTop: '1rem' }}>LƯU CƠ SỞ DỮ LIỆU</button>
            </form>
          </div>
        );

      case 'orders':
        return (
          <div className="admin-table-box">
            <h2 style={{ fontSize: '1.875rem', marginBottom: '1.5rem', fontFamily: 'var(--font-heading)' }}>Quản Lý Đơn Hàng</h2>
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead><tr><th>MÃ ĐH</th><th>KHÁCH HÀNG</th><th>THỜI GIAN</th><th>TỔNG TIỀN</th><th>GHN</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr></thead>
                <tbody>
                  {orders.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center' }}>TRỐNG</td></tr>}
                  {orders.map(o => (
                    <tr key={o.id}>
                      <td>
                        <strong>{o.order_code}</strong>
                        {o.refundStatus === 'choxuly' && (
                          <div style={{ marginTop: '0.25rem' }}>
                            <span style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #ef4444', padding: '0.15rem 0.4rem', fontSize: '0.65rem', fontWeight: 900 }}>
                              CẦN HOÀN TIỀN
                            </span>
                          </div>
                        )}
                        {o.refundStatus === 'dahoantien' && (
                          <div style={{ marginTop: '0.25rem' }}>
                            <span style={{ background: '#dcfce7', color: '#166534', border: '1px solid #16a34a', padding: '0.15rem 0.4rem', fontSize: '0.65rem', fontWeight: 700 }}>
                              ĐÃ HOÀN TIỀN
                            </span>
                          </div>
                        )}
                      </td>
                      <td>
                        <div>{o.customer}</div>
                        {o.refundStatus === 'choxuly' && (
                          <div style={{ marginTop: '0.35rem', background: '#fff1f2', border: '1px dashed #f43f5e', padding: '0.4rem', fontSize: '0.7rem', textAlign: 'left', lineHeight: '1.4' }}>
                            {(() => {
                              try {
                                const p = JSON.parse(o.refundInfo || '{}');
                                return (
                                  <div>
                                    <div>NH: <strong>{p.nganHang}</strong></div>
                                    <div>STK: <strong style={{ color: '#be123c' }}>{p.soTK}</strong></div>
                                    <div>Chủ: <strong>{p.chuTK}</strong></div>
                                    {p.lyDo && <div style={{ color: '#666', fontStyle: 'italic' }}>Lý do: {p.lyDo}</div>}
                                  </div>
                                );
                              } catch { return <div>{o.refundInfo}</div>; }
                            })()}
                            <button
                              type="button"
                              onClick={() => handleConfirmRefund(o.id)}
                              className="neo-btn neo-btn--sm"
                              style={{ marginTop: '0.35rem', background: '#16a34a', color: '#fff', fontSize: '0.65rem', padding: '0.2rem 0.4rem', width: '100%', textTransform: 'uppercase' }}
                            >
                              ✓ Xác nhận đã chuyển khoản
                            </button>
                          </div>
                        )}
                      </td>
                      <td>{new Date(o.date).toLocaleString('vi-VN')}</td>
                      <td><strong>{o.total.toLocaleString('vi-VN')}đ</strong></td>
                      <td>{o.ghnCode ? <><strong>{o.ghnCode}</strong><br /><small>{o.ghnStatus || 'đang đồng bộ'}</small></> : 'Chưa tạo'}</td>
                      <td>
                        <select value={o.status} onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)} className="neo-input" style={{ padding: '0.25rem', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                          <option value="choxacnhan">CHỜ X.NHẬN</option>
                          <option value="daxacnhan">ĐÃ XÁC NHẬN</option>
                          <option value="danggiaohang">ĐANG GIAO</option>
                          <option value="hoanthanh">HOÀN THÀNH</option>
                          <option value="dahuy">ĐÃ HỦY</option>
                        </select>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: '100px' }}>
                          <button
                            type="button"
                            onClick={() => handleViewOrderDetails(o.id)}
                            className="neo-btn neo-btn--secondary neo-btn--sm"
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              gap: '0.25rem', 
                              padding: '0.35rem 0.5rem', 
                              fontSize: '0.75rem', 
                              fontWeight: 800,
                              width: '100%' 
                            }}
                            title="Xem chi tiết đơn hàng & Xuất hóa đơn"
                          >
                            <Eye style={{ width: 14, height: 14 }} /> CHI TIẾT
                          </button>
                          {o.ghnCode ? (
                            <span style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              padding: '0.35rem 0.5rem', 
                              background: '#dcfce7', 
                              border: '2px solid #16a34a', 
                              color: '#166534', 
                              fontWeight: 800, 
                              fontSize: '0.75rem',
                              whiteSpace: 'nowrap',
                              width: '100%',
                              boxSizing: 'border-box'
                            }}>
                              ✓ ĐÃ TẠO GHN
                            </span>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center', width: '100%' }}>
                              <button
                                onClick={() => handleCreateShipment(o.id)}
                                className="neo-btn neo-btn--primary neo-btn--sm"
                                disabled={o.status !== 'daxacnhan'}
                                title={o.status !== 'daxacnhan' ? 'Cần chuyển trạng thái sang ĐÃ XÁC NHẬN để tạo đơn GHN' : 'Bấm để tạo đơn giao hàng nhanh'}
                                style={{ 
                                  opacity: o.status !== 'daxacnhan' ? 0.5 : 1, 
                                  cursor: o.status !== 'daxacnhan' ? 'not-allowed' : 'pointer',
                                  width: '100%',
                                  padding: '0.35rem 0.5rem',
                                  fontSize: '0.75rem'
                                }}
                              >
                                TẠO GHN
                              </button>
                              {o.status === 'choxacnhan' && (
                                <span style={{ fontSize: '0.65rem', color: '#b45309', fontWeight: 700 }}>
                                  (Cần xác nhận đơn)
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'customers':
        return (
          <div className="admin-table-box">
            <h2 style={{ fontSize: '1.875rem', marginBottom: '1.5rem', fontFamily: 'var(--font-heading)' }}>Danh Sách Khách Hàng</h2>
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead><tr><th>ID</th><th>HỌ TÊN</th><th>EMAIL</th><th>ĐƠN ĐÃ ĐẶT</th><th>TỔNG CHI TIÊU</th></tr></thead>
                <tbody>
                  {customers.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center' }}>TRỐNG</td></tr>}
                  {customers.map(c => (<tr key={c.id}><td>KH-{c.id}</td><td>{c.name}</td><td>{c.email}</td><td>{c.totalOrders} đơn</td><td>{Number(c.totalSpent).toLocaleString('vi-VN')}đ</td></tr>))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'inventory':
        if(editingProduct) {
          return (
            <div className="admin-form-box">
              <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.875rem', fontFamily: 'var(--font-heading)' }}>Sửa Sản Phẩm #{editingProduct.id}</h2>
                <button onClick={() => setEditingProduct(null)} className="neo-btn neo-btn--secondary neo-btn--sm">HUỶ BỎ</button>
              </div>
                <form onSubmit={handleEditSubmit} className="admin-form">
                <div className="form-group"><label className="neo-label">Tên sản phẩm *</label><input name="title" defaultValue={editingProduct.name} required className="neo-input" /></div>
                <div className="form-row"><div className="form-group"><label className="neo-label">Nghệ sĩ *</label><input name="artist" defaultValue={editingProduct.artist} className="neo-input" /></div><div className="form-group"><label className="neo-label">Nhóm sản phẩm *</label><select name="genre" defaultValue={editingProduct.genre} required className="neo-input"><option value="Đĩa Than (Vinyl)">Đĩa Than (Vinyl)</option><option value="Cassette">Cassette</option><option value="Máy Quay Đĩa (Turntable)">Máy Quay Đĩa (Turntable)</option><option value="Phụ Kiện">Phụ Kiện</option></select></div></div>
                <div className="form-group"><label className="neo-label">Thể loại nhạc</label><select name="music_genre" defaultValue={editingProduct.musicGenre || ''} className="neo-input"><option value="">Không áp dụng / chưa cập nhật</option>{PRODUCT_MUSIC_GENRES.map((genre) => <option key={genre} value={genre}>{genre}</option>)}</select></div>
                <div className="form-row"><div className="form-group"><label className="neo-label">Giá bán (VNĐ) *</label><input type="number" name="price" defaultValue={editingProduct.price} required className="neo-input" /></div><div className="form-group"><label className="neo-label">Số lượng *</label><input type="number" name="stock" defaultValue={editingProduct.stock} required className="neo-input" /></div></div>
                <div className="form-row"><div className="form-group"><label className="neo-label">Năm phát hành</label><input type="number" name="year" defaultValue={editingProduct.year || 2024} required className="neo-input" /></div><div className="form-group"><label className="neo-label">Tình trạng bán</label><select name="status" defaultValue={editingProduct.status || 'conhang'} required className="neo-input"><option value="conhang">Còn hàng</option><option value="saphethang">Sắp hết hàng</option><option value="hethang">Hết hàng</option><option value="preorder">Pre-order</option><option value="ngungkinhdoanh">Ngừng kinh doanh</option></select></div></div>
                <div className="form-row"><div className="form-group"><label className="neo-label">Định dạng / phiên bản</label><input name="format" defaultValue={editingProduct.format || ''} className="neo-input" placeholder={'Ví dụ: Vinyl 12" 2LP'} /></div><div className="form-group"><label className="neo-label">Tình trạng bìa / đĩa</label><input name="condition" defaultValue={editingProduct.condition || ''} className="neo-input" placeholder="Ví dụ: Brand New (SS)" /></div></div>
                <div className="form-group"><label className="neo-label">Quy cách</label><input name="package_info" defaultValue={editingProduct.packageInfo || ''} className="neo-input" placeholder="Ví dụ: 1 x Album" /></div>
                <div className="form-group"><label className="neo-label">Tracklist (mỗi bài một dòng)</label><textarea name="tracklist" defaultValue={editingProduct.tracklist || ''} rows={5} className="neo-textarea" placeholder="Chỉ nhập khi đã đối soát đúng phiên bản sản phẩm." /></div>
                <div className="form-group"><label className="neo-label">Đường dẫn hình ảnh *</label><input name="image" defaultValue={editingProduct.image} className="neo-input" /></div>
                <button type="submit" className="neo-btn neo-btn--yellow neo-btn--full" style={{ marginTop: '1rem' }}>CẬP NHẬT THAY ĐỔI</button>
              </form>
            </div>
          );
        }
        return (
          <div className="admin-table-box">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                <h2 style={{ fontSize: '1.875rem', fontFamily: 'var(--font-heading)' }}>Quản Lý Kho Hàng</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <button onClick={() => {
                    const ids = prompt("Nhập danh sách mã sản phẩm và số lượng (VD: 1:10, 2:5):"); if(!ids) return;
                    const parsed = ids.split(',').map(s => { const [id, qty] = s.split(':'); return {id: parseInt(id), qty: parseInt(qty), price: 0}; });
                    const note = prompt("Nhập ghi chú phiếu nhập:");
                    fetch(`${API_BASE}/admin/import-stock`, { method: 'POST', body: JSON.stringify({items: parsed, note}), headers: { ...adminHeaders, 'Content-Type': 'application/json' } }).then(r => r.json()).then(d => { if(d.success) { alert('Nhập kho thành công!'); fetchInventory(); } else alert('Lỗi: ' + d.message); });
                  }} className="neo-btn neo-btn--primary neo-btn--sm">+ Nhập kho</button>
                  <div style={{ display: 'flex', alignItems: 'center', border: '2px solid #000', padding: '0.5rem' }}>
                    <Search style={{ width: 20, height: 20, margin: '0 0.5rem', color: 'var(--gray-500)' }} />
                    <input type="text" placeholder="TÌM KIẾM THEO TÊN / ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ border: 'none', outline: 'none', fontWeight: 700, textTransform: 'uppercase', width: '16rem' }} />
                  </div>
                </div>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead><tr><th>MÃ SP</th><th>SẢN PHẨM</th><th>PHÂN LOẠI</th><th>GIÁ BÁN</th><th>TỒN KHO</th><th style={{ textAlign: 'center' }}>THAO TÁC</th></tr></thead>
                <tbody>
                  {filteredInventory.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center' }}>KHÔNG TÌM THẤY SẢN PHẨM</td></tr>}
                  {filteredInventory.map(sp => (
                    <tr key={sp.id}>
                      <td>SP-{sp.id}</td><td style={{ textTransform: 'uppercase', maxWidth: '16rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sp.name}</td><td style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>{sp.genre}</td><td>{Number(sp.price).toLocaleString('vi-VN')}đ</td>
                      <td><span className={`stock-badge ${sp.stock > 0 ? 'stock-badge--in' : 'stock-badge--out'}`}>{sp.stock > 0 ? sp.stock : 'HẾT HÀNG'}</span></td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          <button onClick={() => { fetch(`${API_BASE}/products/${sp.id}`).then(res => res.json()).then(data => { if(data.success) { setEditingProduct({ id: sp.id, name: data.data.title, artist: data.data.artist, genre: data.data.genre, musicGenre: data.data.music_genre || '', format: data.data.format || '', condition: data.data.condition || '', packageInfo: data.data.package_info || '', tracklist: data.data.tracklist || '', price: data.data.price, stock: data.data.stock, image: data.data.image, description: data.data.description, year: data.data.year, status: data.data.status }); } }); }} className="emp-action-btn" style={{ background: '#60a5fa' }}><Edit style={{ width: 20, height: 20 }} /></button>
                          <button onClick={() => handleDeleteProduct(sp.id)} className="emp-action-btn emp-action-lock"><Trash2 style={{ width: 20, height: 20 }} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'blog':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div><h2 style={{ fontSize: '1.875rem', marginBottom: '0.35rem', fontFamily: 'var(--font-heading)' }}>NỘI DUNG BLOG & HƯỚNG DẪN</h2><p style={{ margin: 0 }}>Blog để chia sẻ kiến thức; Hướng dẫn để dẫn người đọc qua một quy trình cụ thể.</p></div>
              <button type="button" onClick={resetContentForm} className="neo-btn neo-btn--primary"><Plus style={{ width: 18, height: 18 }} /> BÀI MỚI</button>
            </div>

            <div className="admin-table-box" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'end', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ minWidth: '12rem', margin: 0 }}><label className="neo-label">Loại nội dung</label><select value={contentTypeFilter} onChange={(e) => setContentTypeFilter(e.target.value)} className="neo-input"><option value="all">Tất cả</option><option value="blog">Blog</option><option value="huongdan">Hướng dẫn</option></select></div>
              <div className="form-group" style={{ minWidth: '12rem', margin: 0 }}><label className="neo-label">Trạng thái</label><select value={contentStatusFilter} onChange={(e) => setContentStatusFilter(e.target.value)} className="neo-input"><option value="all">Tất cả</option><option value="daxuatban">Đã xuất bản</option><option value="nhap">Bản nháp</option></select></div>
              <button type="button" onClick={fetchContent} className="neo-btn neo-btn--secondary"><RefreshCw style={{ width: 18, height: 18 }} /> LÀM MỚI</button>
            </div>

            <form onSubmit={handleContentSubmit} style={{ border: '2px solid #000', padding: '1.5rem', background: 'var(--gray-50)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}><h3 style={{ fontWeight: 700, textTransform: 'uppercase', margin: 0, fontSize: '1.25rem' }}>{editingContent ? `Sửa nội dung #${editingContent.id}` : 'Tạo nội dung mới'}</h3>{editingContent && <button type="button" onClick={resetContentForm} className="neo-btn neo-btn--secondary neo-btn--sm"><X style={{ width: 16, height: 16 }} /> HỦY SỬA</button>}</div>
              <div className="admin-form">
                <div className="form-group"><label className="neo-label">Tiêu đề *</label><input value={contentForm.title} onChange={(e) => setContentForm({ ...contentForm, title: e.target.value })} required className="neo-input" /></div>
                <div className="form-row">
                  <div className="form-group"><label className="neo-label">Loại nội dung</label><select value={contentForm.type} onChange={(e) => { const type = e.target.value as 'blog' | 'huongdan'; setContentForm({ ...contentForm, type, category: type === 'blog' ? BLOG_CONTENT_CATEGORIES[0] : GUIDE_CONTENT_CATEGORIES[0], difficulty: type === 'blog' ? '' : 'Dễ' }); }} className="neo-input"><option value="blog">Blog / Kiến thức</option><option value="huongdan">Hướng dẫn / Quy trình</option></select></div>
                  <div className="form-group"><label className="neo-label">Trạng thái</label><select value={contentForm.status} onChange={(e) => setContentForm({ ...contentForm, status: e.target.value as 'daxuatban' | 'nhap' })} className="neo-input"><option value="daxuatban">Xuất bản</option><option value="nhap">Bản nháp</option></select></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="neo-label">Chuyên mục</label><select value={contentForm.category} onChange={(e) => setContentForm({ ...contentForm, category: e.target.value })} className="neo-input">{(contentForm.type === 'blog' ? BLOG_CONTENT_CATEGORIES : GUIDE_CONTENT_CATEGORIES).map((category) => <option key={category} value={category}>{category}</option>)}</select></div>
                  {contentForm.type === 'huongdan' ? <div className="form-group"><label className="neo-label">Độ khó</label><select value={contentForm.difficulty} onChange={(e) => setContentForm({ ...contentForm, difficulty: e.target.value })} className="neo-input"><option value="Dễ">Dễ</option><option value="Trung bình">Trung bình</option><option value="Nâng cao">Nâng cao</option></select></div> : <div className="form-group"><label className="neo-label">Thời gian đọc</label><input value={contentForm.duration} onChange={(e) => setContentForm({ ...contentForm, duration: e.target.value })} placeholder="Ví dụ: 5 phút" className="neo-input" /></div>}
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="neo-label">Tóm tắt hiển thị ở thẻ bài</label><input value={contentForm.summary} onChange={(e) => setContentForm({ ...contentForm, summary: e.target.value })} placeholder="Một câu nói rõ bài này giúp người đọc làm gì" className="neo-input" /></div>
                  {contentForm.type === 'huongdan' && <div className="form-group"><label className="neo-label">Thời lượng thực hiện</label><input value={contentForm.duration} onChange={(e) => setContentForm({ ...contentForm, duration: e.target.value })} placeholder="Ví dụ: 10 phút" className="neo-input" /></div>}
                </div>
                {contentForm.type === 'huongdan' && <>
                  <div className="form-row"><div className="form-group"><label className="neo-label">Đối tượng</label><input value={contentForm.audience} onChange={(e) => setContentForm({ ...contentForm, audience: e.target.value })} placeholder="Ví dụ: Người mới bắt đầu" className="neo-input" /></div><div className="form-group"><label className="neo-label">Dụng cụ cần có</label><input value={contentForm.tools} onChange={(e) => setContentForm({ ...contentForm, tools: e.target.value })} placeholder="Ví dụ: Chổi carbon, cân stylus" className="neo-input" /></div></div>
                  <div className="form-group"><label className="neo-label">Các bước thực hiện (mỗi bước một dòng)</label><textarea value={contentForm.steps} onChange={(e) => setContentForm({ ...contentForm, steps: e.target.value })} rows={5} className="neo-textarea" /></div>
                </>}
                <div className="form-group"><label className="neo-label">Nội dung *</label><textarea value={contentForm.content} onChange={(e) => setContentForm({ ...contentForm, content: e.target.value })} rows={12} required className="neo-textarea" /></div>
                <div className="form-group"><label className="neo-label">Đường dẫn ảnh cover</label><input value={contentForm.image} onChange={(e) => setContentForm({ ...contentForm, image: e.target.value })} className="neo-input" /></div>
                <button type="submit" className="neo-btn neo-btn--primary neo-btn--full">{editingContent ? 'LƯU THAY ĐỔI' : 'TẠO NỘI DUNG'}</button>
              </div>
            </form>

            <div className="admin-table-box"><div style={{ overflowX: 'auto' }}><table className="admin-table"><thead><tr><th>TIÊU ĐỀ</th><th>LOẠI</th><th>CHUYÊN MỤC</th><th>TRẠNG THÁI</th><th>NGÀY</th><th>THAO TÁC</th></tr></thead><tbody>
              {contentItems.map((item) => <tr key={item.id}><td style={{ minWidth: '18rem', fontWeight: 700 }}>{item.title}</td><td>{item.type === 'huongdan' ? 'HƯỚNG DẪN' : 'BLOG'}</td><td>{item.category || '—'}</td><td><span className={`stock-badge ${item.status === 'daxuatban' ? 'stock-badge--in' : 'stock-badge--out'}`}>{item.status === 'daxuatban' ? 'ĐÃ XUẤT BẢN' : 'BẢN NHÁP'}</span></td><td>{new Date(item.created_at).toLocaleDateString('vi-VN')}</td><td><div style={{ display: 'flex', gap: '0.4rem' }}><a href={item.type === 'huongdan' ? `/guide/${item.id}` : `/blog/${item.id}`} target="_blank" rel="noreferrer" className="emp-action-btn" style={{ background: '#facc15' }} title="Xem"><Eye style={{ width: 18, height: 18 }} /></a><button type="button" onClick={() => startEditContent(item)} className="emp-action-btn" style={{ background: '#60a5fa' }} title="Sửa"><Edit style={{ width: 18, height: 18 }} /></button><button type="button" onClick={() => handleDeleteContent(item.id)} className="emp-action-btn emp-action-lock" title="Xóa"><Trash2 style={{ width: 18, height: 18 }} /></button></div></td></tr>)}
              {contentItems.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Chưa có nội dung phù hợp.</td></tr>}
            </tbody></table></div></div>
          </div>
        );
      case 'comments':
        return (
          <div className="admin-table-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}><h2 style={{ fontSize: '1.875rem', fontFamily: 'var(--font-heading)', margin: 0 }}>HỎI ĐÁP SẢN PHẨM</h2><button onClick={fetchComments} className="neo-btn neo-btn--secondary"><RefreshCw style={{ width: 18, height: 18 }} /> LÀM MỚI</button></div>
            <div style={{ overflowX: 'auto' }}><table className="admin-table"><thead><tr><th>SẢN PHẨM</th><th>KHÁCH HÀNG</th><th>NỘI DUNG</th><th>TRẠNG THÁI</th><th>PHẢN HỒI</th><th>XỬ LÝ</th></tr></thead><tbody>
              {comments.map((comment) => <tr key={comment.id}><td>{comment.product_title}</td><td>{comment.author}</td><td style={{ minWidth: '18rem' }}>{comment.content}</td><td><span className={`stock-badge ${comment.status === 'daduyet' ? 'stock-badge--in' : 'stock-badge--out'}`}>{comment.status}</span></td><td><div style={{ display: 'flex', gap: '0.4rem' }}><input value={replyDrafts[comment.id] || ''} onChange={(e) => setReplyDrafts({ ...replyDrafts, [comment.id]: e.target.value })} className="neo-input" placeholder="Trả lời..." /><button onClick={() => replyComment(comment.id)} className="neo-btn neo-btn--primary neo-btn--sm">GỬI</button></div></td><td><div style={{ display: 'flex', gap: '0.4rem' }}><button onClick={() => updateCommentStatus(comment.id, 'daduyet')} className="neo-btn neo-btn--primary neo-btn--sm">DUYỆT</button><button onClick={() => updateCommentStatus(comment.id, 'an')} className="neo-btn neo-btn--danger neo-btn--sm">ẨN</button></div></td></tr>)}
              {comments.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Chưa có câu hỏi nào.</td></tr>}
            </tbody></table></div>
          </div>
        );
      case 'chat': return <AdminChat />;
      case 'returns':
        return (
          <div className="admin-table-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}><h2 style={{ fontSize: '1.875rem', fontFamily: 'var(--font-heading)', margin: 0 }}>TRẢ HÀNG / KHIẾU NẠI</h2><button onClick={fetchReturns} className="neo-btn neo-btn--secondary"><RefreshCw style={{ width: 18, height: 18 }} /> LÀM MỚI</button></div>
            <p style={{ color: 'var(--gray-600)' }}>Duyệt lỗi/sai hàng trước, sau đó chuyển sang đang hoàn và hoàn tất sau khi đã nhận hàng. Kho chỉ cộng lại khi trạng thái là Hoàn tất.</p>
            <div style={{ overflowX: 'auto' }}><table className="admin-table"><thead><tr><th>MÃ YÊU CẦU</th><th>ĐƠN HÀNG</th><th>KHÁCH HÀNG</th><th>LÝ DO</th><th>SỐ TIỀN</th><th>TRẠNG THÁI</th></tr></thead><tbody>
              {returns.map((item) => <tr key={item.id}><td>YCT-{item.id}</td><td>#{item.order_id}<br /><small>{item.ghn_order_code || 'Chưa có mã GHN'}</small></td><td>{item.customer_name}</td><td>{item.reason}<br /><small>{item.description}</small></td><td>{Number(item.refund_amount || 0).toLocaleString('vi-VN')}đ</td><td><select value={item.status} onChange={(e) => updateReturnStatus(item.id, e.target.value)} className="neo-input"><option value="moi">Mới</option><option value="dangxuly">Đang xử lý</option><option value="chapnhan">Chấp nhận</option><option value="tuchoi">Từ chối</option><option value="danghoan">Đang hoàn</option><option value="hoantat">Hoàn tất</option></select></td></tr>)}
              {returns.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Chưa có yêu cầu trả hàng.</td></tr>}
            </tbody></table></div>
          </div>
        );
      case 'discounts': return <AdminDiscounts />;
      case 'employees': return <AdminEmployees />;
    }
  };

  return (
    <div className="admin-layout">
      <aside className={`admin-sidebar ${sidebarOpen ? 'admin-sidebar--open' : ''}`}>
        <div className="admin-sidebar-logo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', margin: 0 }}>VỌC PANEL</h1>
          {sidebarOpen && (
            <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <X style={{ width: 24, height: 24 }} />
            </button>
          )}
        </div>
        <nav className="admin-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button 
                key={item.id} 
                onClick={() => { handleSectionChange(item.id); setSidebarOpen(false); }} 
                className={`admin-nav-btn ${activeSection === item.id ? 'admin-nav-btn--active' : ''}`}
              >
                <Icon style={{ width: 20, height: 20 }} /><span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={() => setSidebarOpen(true)} className="admin-menu-btn"><Menu style={{ width: 24, height: 24 }} /></button>
            <h2 className="admin-header-title" style={{ fontFamily: 'var(--font-heading)' }}>{menuItems.find((item) => item.id === activeSection)?.label}</h2>
          </div>
        </header>
        <main className="admin-content">{renderContent()}</main>
      </div>

      {/* Loading Order Details Overlay */}
      {loadingOrderDetails && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ background: '#fff', border: '3px solid #000', padding: '1.25rem 2rem', fontWeight: 900, boxShadow: '6px 6px 0px #000', fontSize: '1rem', textTransform: 'uppercase' }}>
            ⏳ Đang tải chi tiết đơn hàng...
          </div>
        </div>
      )}

      {/* Order Details & Invoice Modal */}
      {selectedOrderDetails && selectedOrderDetails.info && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
          onClick={() => setSelectedOrderDetails(null)}
        >
          <div 
            style={{
              background: '#fff',
              border: '3px solid #000',
              boxShadow: '10px 10px 0px #000',
              maxWidth: '860px',
              width: '100%',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '3px solid #000',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#fafafa'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <ShoppingCart style={{ width: 22, height: 22 }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', fontFamily: 'var(--font-heading)' }}>
                    CHI TIẾT ĐƠN HÀNG #ORD-{String(selectedOrderDetails.info.MaDH).padStart(3, '0')}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.2rem' }}>
                    Ngày đặt: {new Date(selectedOrderDetails.info.NgayDat).toLocaleString('vi-VN')}
                  </div>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedOrderDetails(null)}
                style={{
                  background: '#000',
                  color: '#fff',
                  border: '2px solid #000',
                  cursor: 'pointer',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1rem'
                }}
                title="Đóng"
              >
                ✕
              </button>
            </div>

            {/* Modal Content Body */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Recipient & Shipping Info Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                <div style={{ border: '2px solid #000', padding: '1rem', background: '#f8fafc', boxShadow: '3px 3px 0px #000' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', borderBottom: '1.5px solid #000', paddingBottom: '0.35rem' }}>
                    👤 THÔNG TIN NGƯỜI NHẬN
                  </h4>
                  <div style={{ fontSize: '0.85rem', lineHeight: '1.6' }}>
                    <div><strong>Họ và tên:</strong> {selectedOrderDetails.info.NguoiNhan || 'Khách vãng lai'}</div>
                    <div><strong>Số điện thoại:</strong> {selectedOrderDetails.info.SDTNhan || '—'}</div>
                    <div><strong>Địa chỉ giao:</strong> {selectedOrderDetails.info.DiaChiGiao || '—'}</div>
                    {selectedOrderDetails.info.GhiChu && (
                      <div style={{ marginTop: '0.35rem', color: '#b45309', background: '#fef3c7', padding: '0.35rem 0.5rem', border: '1px solid #f59e0b' }}>
                        <strong>Ghi chú:</strong> {selectedOrderDetails.info.GhiChu}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ border: '2px solid #000', padding: '1rem', background: '#f8fafc', boxShadow: '3px 3px 0px #000' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', borderBottom: '1.5px solid #000', paddingBottom: '0.35rem' }}>
                    📦 TRẠNG THÁI & VẬN CHUYỂN
                  </h4>
                  <div style={{ fontSize: '0.85rem', lineHeight: '1.6' }}>
                    <div><strong>Trạng thái đơn:</strong> <span style={{ textTransform: 'uppercase', fontWeight: 800, color: '#2563eb' }}>{selectedOrderDetails.info.TrangThai}</span></div>
                    <div><strong>Phương thức TT:</strong> {String(selectedOrderDetails.info.ThanhToanHinhThuc || 'COD').toUpperCase()}</div>
                    <div><strong>Thanh toán:</strong> {selectedOrderDetails.info.TrangThaiTT === 'dathanhtoan' ? <span style={{ color: '#16a34a', fontWeight: 700 }}>ĐÃ THANH TOÁN</span> : <span style={{ color: '#dc2626', fontWeight: 700 }}>CHƯA THANH TOÁN</span>}</div>
                    {selectedOrderDetails.info.MaDonGHN && (
                      <div style={{ marginTop: '0.25rem' }}>
                        <strong>Mã vận đơn GHN:</strong> <span style={{ color: '#ea580c', fontWeight: 800 }}>{selectedOrderDetails.info.MaDonGHN}</span>
                      </div>
                    )}
                    {selectedOrderDetails.info.GHNTrangThai && (
                      <div><strong>Trạng thái GHN:</strong> {selectedOrderDetails.info.GHNTrangThai}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Refund Info if any */}
              {selectedOrderDetails.info.TrangThaiHoanTien && (
                <div style={{ border: '2px solid #f43f5e', background: '#fff1f2', padding: '1rem', boxShadow: '3px 3px 0px #f43f5e' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: 800, color: '#e11d48', textTransform: 'uppercase' }}>
                    ⚠️ THÔNG TIN HOÀN TIỀN (TRẠNG THÁI: {selectedOrderDetails.info.TrangThaiHoanTien.toUpperCase()})
                  </h4>
                  <div style={{ fontSize: '0.85rem', lineHeight: '1.5' }}>
                    {(() => {
                      try {
                        const r = JSON.parse(selectedOrderDetails.info.ThongTinHoanTien || '{}');
                        return (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                            <div>Ngân hàng: <strong>{r.nganHang}</strong></div>
                            <div>Số TK: <strong style={{ color: '#be123c' }}>{r.soTK}</strong></div>
                            <div>Chủ TK: <strong>{r.chuTK}</strong></div>
                            {r.lyDo && <div>Lý do: <em>{r.lyDo}</em></div>}
                          </div>
                        );
                      } catch {
                        return <div>{selectedOrderDetails.info.ThongTinHoanTien}</div>;
                      }
                    })()}
                  </div>
                </div>
              )}

              {/* Items Table */}
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 800, textTransform: 'uppercase' }}>
                  DANH SÁCH SẢN PHẨM ({selectedOrderDetails.items?.length || 0})
                </h4>
                <div style={{ border: '2px solid #000', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #000' }}>
                        <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center', width: '40px' }}>STT</th>
                        <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left' }}>Sản phẩm</th>
                        <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left' }}>Nghệ sĩ</th>
                        <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center', width: '60px' }}>SL</th>
                        <th style={{ padding: '0.6rem 0.8rem', textAlign: 'right', width: '120px' }}>Đơn giá</th>
                        <th style={{ padding: '0.6rem 0.8rem', textAlign: 'right', width: '130px' }}>Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedOrderDetails.items || []).map((item: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>{idx + 1}</td>
                          <td style={{ padding: '0.6rem 0.8rem' }}><strong>{item.TenSP}</strong></td>
                          <td style={{ padding: '0.6rem 0.8rem', color: '#64748b' }}>{item.NgheSi || '—'}</td>
                          <td style={{ padding: '0.6rem 0.8rem', textAlign: 'center', fontWeight: 700 }}>{item.SoLuong}</td>
                          <td style={{ padding: '0.6rem 0.8rem', textAlign: 'right' }}>{Number(item.DonGia).toLocaleString('vi-VN')}đ</td>
                          <td style={{ padding: '0.6rem 0.8rem', textAlign: 'right', fontWeight: 700 }}>{(Number(item.DonGia) * Number(item.SoLuong)).toLocaleString('vi-VN')}đ</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals Summary */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ width: '320px', border: '2px solid #000', padding: '0.85rem 1rem', background: '#f8fafc', boxShadow: '3px 3px 0px #000' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                    <span>Tạm tính:</span>
                    <strong>{(selectedOrderDetails.items || []).reduce((sum: number, i: any) => sum + (Number(i.DonGia) * Number(i.SoLuong)), 0).toLocaleString('vi-VN')}đ</strong>
                  </div>
                  {Number(selectedOrderDetails.info.SoTienGiam) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#dc2626' }}>
                      <span>Giảm giá ({selectedOrderDetails.info.CodeGiamGia || 'Voucher'}):</span>
                      <strong>-{Number(selectedOrderDetails.info.SoTienGiam).toLocaleString('vi-VN')}đ</strong>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                    <span>Phí vận chuyển:</span>
                    <span>{Number(selectedOrderDetails.info.PhiVanChuyen || 0).toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #000', paddingTop: '0.5rem', fontSize: '1.05rem', fontWeight: 900, color: '#b91c1c' }}>
                    <span>TỔNG TIỀN:</span>
                    <span>{Number(selectedOrderDetails.info.TongTien).toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '3px solid #000',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#fafafa'
            }}>
              <button
                type="button"
                onClick={() => setSelectedOrderDetails(null)}
                className="neo-btn neo-btn--secondary"
              >
                ĐÓNG
              </button>
              <button
                type="button"
                onClick={() => handlePrintInvoice(selectedOrderDetails)}
                className="neo-btn neo-btn--primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#facc15', color: '#000' }}
              >
                <Printer style={{ width: 18, height: 18 }} /> XUẤT HÓA ĐƠN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
