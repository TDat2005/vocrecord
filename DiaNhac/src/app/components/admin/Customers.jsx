import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api, NETWORK_ERROR } from '../../utils/api';
import { formatPrice } from '../../utils/format';
import { PageHeader } from './PageHeader';

export function Customers() {
  const toast = useToast();
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    api.get('/admin/customers').then((data) => { if (data.success) setCustomers(data.data || []); }).catch(() => toast.error(NETWORK_ERROR));
  }, [toast]);

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
              <tr><th>Khách hàng</th><th>Email</th><th>Điện thoại</th><th className="is-numeric">Đơn hoàn thành</th><th className="is-numeric">Tổng chi tiêu</th></tr>
            </thead>
            <tbody>
              {visible.length === 0 && <tr><td colSpan={5} className="table__empty">Không có khách hàng.</td></tr>}
              {visible.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-xs text-muted">KH-{customer.id}</div>
                  </td>
                  <td>{customer.email}</td>
                  <td>{customer.phone || '—'}</td>
                  <td className="is-numeric">{customer.totalOrders}</td>
                  <td className="is-numeric">{formatPrice(customer.totalSpent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
