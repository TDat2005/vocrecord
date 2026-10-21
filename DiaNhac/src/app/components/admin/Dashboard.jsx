import { useCallback, useEffect, useState } from 'react';
import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Download } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api, NETWORK_ERROR } from '../../utils/api';
import { getUser } from '../../utils/auth';
import { formatDate, formatDateTime, formatOrderCode, formatPrice, toDateInputValue } from '../../utils/format';
import { getOrderStatus } from '../../utils/status';
import { PageHeader } from './PageHeader';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const BAR_COLOR = '#2a78d6';
const compactNumber = new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 });
const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const EMPTY_STATS = { todayRevenue: 0, todayOrders: 0, totalProducts: 0, totalCustomers: 0, topProducts: [] };

export function Dashboard() {
  const toast = useToast();
  const [stats, setStats] = useState(EMPTY_STATS);
  const [revenue, setRevenue] = useState([]);
  const [range, setRange] = useState({
    start: toDateInputValue(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: toDateInputValue(Date.now()),
  });

  const loadRevenue = useCallback(async (selected) => {
    if (selected.start > selected.end) {
      toast.error('Ngày bắt đầu phải trước ngày kết thúc');
      return;
    }
    try {
      const data = await api.get(`/admin/revenue-report?${new URLSearchParams(selected)}`);
      if (data.success) setRevenue(data.data || []);
    } catch {
      toast.error(NETWORK_ERROR);
    }
  }, [toast]);

  useEffect(() => {
    api.get('/admin/dashboard').then((data) => { if (data.success) setStats(data.data); }).catch(() => {});
    loadRevenue(range);
    // Chỉ tải lần đầu; sau đó người dùng bấm "Xem" để đổi khoảng thời gian.
  }, []);

  const exportCsv = async () => {
    try {
      const ordersData = await api.get('/orders');
      const orders = ordersData.success ? ordersData.data || [] : [];
      const user = getUser();
      const now = new Date();
      const lines = [
        'BÁO CÁO KINH DOANH TỔNG HỢP - VỌC RECORDS',
        `Thời gian xuất,${csvCell(now.toLocaleString('vi-VN'))}`,
        `Người lập báo cáo,${csvCell(user?.name || user?.username || 'Quản trị viên')}`,
        '',
        '--- CHỈ SỐ HÔM NAY ---',
        'Chỉ số,Giá trị',
        `Doanh thu hôm nay (VNĐ),${Number(stats.todayRevenue) || 0}`,
        `Đơn hàng hôm nay,${stats.todayOrders}`,
        `Tổng sản phẩm,${stats.totalProducts}`,
        `Tổng khách hàng,${stats.totalCustomers}`,
        '',
        `--- DOANH THU TỪ ${range.start} ĐẾN ${range.end} ---`,
        'Ngày,Doanh thu (VNĐ),Số đơn',
        ...(revenue.length ? revenue.map((row) => `${csvCell(formatDate(row.date))},${Number(row.revenue) || 0},${row.orders || 0}`) : ['Chưa có dữ liệu']),
        '',
        '--- TOP SẢN PHẨM BÁN CHẠY ---',
        'Tên sản phẩm,Nghệ sĩ,Đã bán,Doanh thu (VNĐ)',
        ...(stats.topProducts.length
          ? stats.topProducts.map((p) => `${csvCell(p.name)},${csvCell(p.artist)},${p.sales || 0},${Number(p.revenue) || 0}`)
          : ['Chưa có dữ liệu']),
        '',
        '--- ĐƠN HÀNG GẦN ĐÂY ---',
        'Mã đơn,Khách hàng,Thời gian đặt,Tổng tiền (VNĐ),Trạng thái,Mã GHN',
        ...orders.map((o) => [
          csvCell(formatOrderCode(o.MaDH)),
          csvCell(o.HoTen || o.NguoiNhan || ''),
          csvCell(formatDateTime(o.NgayDat)),
          Number(o.TongTien) || 0,
          csvCell(getOrderStatus(o.TrangThai).label),
          csvCell(o.MaDonGHN || ''),
        ].join(',')),
      ];
      // BOM để Excel đọc đúng tiếng Việt.
      const blob = new Blob([`﻿${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Bao_Cao_Kinh_Doanh_Voc_Records_${toDateInputValue(now)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Không thể xuất báo cáo');
    }
  };

  const totalRevenue = revenue.reduce((sum, row) => sum + (Number(row.revenue) || 0), 0);
  const chartData = {
    labels: revenue.map((row) => formatDate(row.date)),
    datasets: [{
      label: 'Doanh thu',
      data: revenue.map((row) => Number(row.revenue) || 0),
      backgroundColor: BAR_COLOR,
      hoverBackgroundColor: '#1f5fae',
      borderRadius: { topLeft: 4, topRight: 4 },
      borderSkipped: 'start',
      maxBarThickness: 24,
    }],
  };
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false, // Biểu đồ tĩnh cho gọn mắt; dữ liệu đổi khi bấm "Xem".
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a1a1a',
        padding: 10,
        displayColors: false,
        callbacks: { label: (context) => formatPrice(context.parsed.y) },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#616161', maxRotation: 0, autoSkipPadding: 12 } },
      y: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: '#ebebeb' },
        ticks: { color: '#616161', callback: (value) => compactNumber.format(value) },
      },
    },
  };

  return (
    <>
      <PageHeader
        title="Tổng quan"
        subtitle="Doanh thu, đơn hàng và sản phẩm bán chạy."
        actions={<button type="button" className="btn btn--secondary" onClick={exportCsv}><Download size={16} /> Xuất báo cáo (CSV)</button>}
      />

      <div className="admin-stats">
        <div className="card"><p className="admin-stat__label">Doanh thu hôm nay</p><p className="admin-stat__value">{formatPrice(stats.todayRevenue)}</p></div>
        <div className="card"><p className="admin-stat__label">Đơn hàng hôm nay</p><p className="admin-stat__value">{stats.todayOrders}</p></div>
        <div className="card"><p className="admin-stat__label">Tổng sản phẩm</p><p className="admin-stat__value">{stats.totalProducts}</p></div>
        <div className="card"><p className="admin-stat__label">Tổng khách hàng</p><p className="admin-stat__value">{stats.totalCustomers}</p></div>
      </div>

      <section className="card">
        <div className="card__header">
          <div>
            <h2 className="card__title">Doanh thu theo ngày</h2>
            <p className="text-muted text-xs">Chỉ tính đơn đã hoàn thành · Tổng {formatPrice(totalRevenue)}</p>
          </div>
          <form className="admin-filters" onSubmit={(event) => { event.preventDefault(); loadRevenue(range); }}>
            <label className="field">
              <span className="label">Từ ngày</span>
              <input type="date" className="input input--sm" value={range.start} max={range.end} onChange={(e) => setRange({ ...range, start: e.target.value })} />
            </label>
            <label className="field">
              <span className="label">Đến ngày</span>
              <input type="date" className="input input--sm" value={range.end} min={range.start} onChange={(e) => setRange({ ...range, end: e.target.value })} />
            </label>
            <button type="submit" className="btn btn--secondary">Xem</button>
          </form>
        </div>
        {revenue.length === 0 ? (
          <p className="loading-text">Chưa có doanh thu trong khoảng thời gian này.</p>
        ) : (
          <>
            <div className="admin-chart">
              <Bar data={chartData} options={chartOptions} aria-label="Biểu đồ doanh thu theo ngày" role="img" />
            </div>
            <details className="admin-details">
              <summary>Xem dạng bảng</summary>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Ngày</th><th className="is-numeric">Số đơn</th><th className="is-numeric">Doanh thu</th></tr></thead>
                  <tbody>
                    {revenue.map((row) => (
                      <tr key={row.date}><td>{formatDate(row.date)}</td><td className="is-numeric">{row.orders}</td><td className="is-numeric">{formatPrice(row.revenue)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}
      </section>

      <section className="card card--flush">
        <div className="card__header"><h2 className="card__title">Sản phẩm bán chạy</h2></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Sản phẩm</th><th className="is-numeric">Đã bán</th><th className="is-numeric">Doanh thu</th></tr></thead>
            <tbody>
              {stats.topProducts.length === 0 && <tr><td colSpan={3} className="table__empty">Chưa có đơn hàng hoàn thành.</td></tr>}
              {stats.topProducts.map((product) => (
                <tr key={product.id}>
                  <td><span className="font-medium">{product.name}</span> <span className="text-muted">· {product.artist}</span></td>
                  <td className="is-numeric">{product.sales}</td>
                  <td className="is-numeric">{formatPrice(product.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
