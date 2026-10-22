import { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api, NETWORK_ERROR } from '../../utils/api';
import { useCurrentUser } from '../../utils/auth';
import { formatPrice } from '../../utils/format';
import { Badge } from '../ui';
import { PageHeader } from './PageHeader';

export function Customers() {
  const toast = useToast();
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState('');
  const isAdmin = useCurrentUser()?.role === 'admin';

  const load = useCallback(() => {
    api.get('/admin/customers').then((data) => { if (data.success) setCustomers(data.data || []); }).catch(() => toast.error(NETWORK_ERROR));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  // Khóa tài khoản: khách không đăng nhập, không đặt hàng được; phiên đang mở bị đăng xuất ngay.
  const toggleLock = async (customer) => {
    const locking = Number(customer.active) !== 0;
    if (locking && !window.confirm(`Khóa tài khoản ${customer.name}? Khách sẽ không đăng nhập và đặt hàng được.`)) return;
    try {
      const data = await api.put(`/admin/customers/${customer.id}/status`, { active: !locking });
      if (data.success) { toast.success(data.message); load(); } else toast.error(data.message || 'Không cập nhật được');
    } catch {
      toast.error(NETWORK_ERROR);
    }
  };

  const keyword = query.trim().toLowerCase();
  const visible = customers.filter((customer) => !keyword
    || String(customer.name || '').toLowerCase().includes(keyword)
    || String(customer.email || '').toLowerCase().includes(keyword)
    || String(customer.phone || '').includes(keyword));

  return (
    <>
      <PageHeader title="Khách hàng" subtitle={`${customers.length} khách hàng`} />
      <section className="card card--flush">
        <div className="admin-toolbar">
          <label className="admin-search">
            <Search size={16} />
            <input className="input input--sm" type="search" placeholder="Tìm theo tên, email, số điện thoại" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Khách hàng</th><th>Email</th><th>Điện thoại</th><th className="is-numeric">Đơn hoàn thành</th><th className="is-numeric">Đơn đã hủy</th><th className="is-numeric">Tổng chi tiêu</th><th>Tài khoản</th></tr>
            </thead>
            <tbody>
              {visible.length === 0 && <tr><td colSpan={7} className="table__empty">Không có khách hàng.</td></tr>}
              {visible.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-xs text-muted">KH-{customer.id}</div>
                  </td>
                  <td>{customer.email}</td>
                  <td>{customer.phone || '—'}</td>
                  <td className="is-numeric">{customer.totalOrders}</td>
                  <td className="is-numeric">{customer.cancelledOrders}</td>
                  <td className="is-numeric">{formatPrice(customer.totalSpent)}</td>
                  <td className="nowrap">
                    {Number(customer.active) === 0 ? <Badge tone="critical">Đã khóa</Badge> : <Badge tone="success">Hoạt động</Badge>}
                    {isAdmin && customer.account_id && (
                      <button type="button" className="btn btn--plain text-sm" onClick={() => toggleLock(customer)}>
                        {Number(customer.active) === 0 ? 'Mở khóa' : 'Khóa'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
