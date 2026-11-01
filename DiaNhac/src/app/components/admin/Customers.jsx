import { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api, NETWORK_ERROR } from '../../utils/api';
import { useCurrentUser } from '../../utils/auth';
import { formatPrice } from '../../utils/format';
import { useDebounced } from '../../hooks/useDebounced';
import { Badge, Pagination } from '../ui';
import { PageHeader } from './PageHeader';

export function Customers() {
  const toast = useToast();
  const [customers, setCustomers] = useState([]);
  const [paging, setPaging] = useState({ page: 1, total: 0, limit: 50 });
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const isAdmin = useCurrentUser()?.role === 'admin';
  const keyword = useDebounced(query.trim());

  const load = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), limit: '50' });
    if (keyword) params.set('q', keyword);
    api.get(`/admin/customers?${params}`).then((data) => {
      if (!data.success) return;
      setCustomers(data.data || []);
      setPaging({ page: data.page || 1, total: data.total ?? 0, limit: data.limit || 50 });
    }).catch(() => toast.error(NETWORK_ERROR));
  }, [toast, page, keyword]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [keyword]);

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


  return (
    <>
      <PageHeader title="Khách hàng" subtitle={`${paging.total} khách hàng`} />
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
              {customers.length === 0 && <tr><td colSpan={7} className="table__empty">Không có khách hàng.</td></tr>}
              {customers.map((customer) => (
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
        <Pagination page={paging.page} total={paging.total} limit={paging.limit} onChange={setPage} />
      </section>
    </>
  );
}
