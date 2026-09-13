import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Filter } from 'lucide-react';
import { API_BASE } from '../config/api';
import { SafeImage } from '../components/SafeImage';
import '../../styles/pages/category.css';

export function Cassettes() {
  const [sortBy, setSortBy] = useState('name');
  const [showFilters, setShowFilters] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const categoryName = 'Cassette';

  useEffect(() => {
    fetch(`${API_BASE}/products`)
      .then(res => res.json())
      .then(data => { if(data.success && data.data) { setRecords(data.data.filter((r:any) => r.genre === categoryName)); } })
      .catch(err => console.error(err));
  }, []);

  const filteredRecords = [...records].sort((a, b) => {
    switch (sortBy) { case 'price-low': return a.price - b.price; case 'price-high': return b.price - a.price; case 'year': return b.year - a.year; default: return a.title.localeCompare(b.title); }
  });

  const formatPrice = (price: number) => Number(price).toLocaleString('vi-VN') + 'đ';

  return (
    <div className="page page--gray">
      <div className="category-hero" style={{ background: '#f97316', color: '#fff' }}>
        <div className="container">
          <h1 className="category-hero-title" style={{ fontFamily: 'var(--font-heading)' }}>BĂNG CASSETTE</h1>
          <p className="category-hero-desc">Cảm giác lo-fi ấm áp không thể lẫn lộn của băng từ, một trải nghiệm thuần analog.</p>
        </div>
      </div>
      <div className="container" style={{ padding: '2rem 1rem' }}>
        <div className="catalog-layout">
          <aside className="catalog-sidebar">
            <div className="catalog-sidebar-box">
              <button onClick={() => setShowFilters(!showFilters)} className="catalog-filter-toggle">
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Filter style={{ width: 20, height: 20 }} /> BỘ LỌC</span>
                <span>{showFilters ? '-' : '+'}</span>
              </button>
              <div className={`catalog-filter-content ${showFilters ? 'catalog-filter-content--open' : ''}`}>
                <div>
                  <h3 className="catalog-filter-title">SẮP XẾP THEO</h3>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="catalog-select">
                    <option value="name">Tên (A-Z)</option><option value="price-low">Giá (Thấp đến Cao)</option><option value="price-high">Giá (Cao đến Thấp)</option><option value="year">Năm (Mới nhất)</option>
                  </select>
                </div>
              </div>
            </div>
          </aside>
          <main className="catalog-main">
            <div className="flex-between" style={{ marginBottom: '1.5rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem' }}>
              <p className="catalog-result-count">HIỂN THỊ <span className="catalog-count-badge">{filteredRecords.length}</span> SẢN PHẨM</p>
            </div>
            {filteredRecords.length === 0 ? (
              <div className="empty-state"><p className="page-subtitle">Chưa có sản phẩm Băng Cassette nào.</p></div>
            ) : (
              <div className="grid-3-col">
                {filteredRecords.map((record) => (
                  <Link key={record.id} to={`/product/${record.id}`} className="product-card">
                    <div className="product-card-image"><SafeImage src={record.image} alt={record.title} /><div className="product-card-badge">{record.genre}</div></div>
                    <div className="product-card-body">
                      <h3 className="product-card-name line-clamp-1">{record.title}</h3>
                      <p className="product-card-artist line-clamp-1">{record.artist}</p>
                      <div className="product-card-footer"><div>
                        <div className="flex-between" style={{ marginBottom: '0.5rem' }}><span className="product-card-price">{formatPrice(record.price)}</span><span className="product-card-year">{record.year}</span></div>
                        <div className="product-card-stock">{record.stock > 0 ? <span className="stock-badge stock-badge--in">Còn hàng</span> : <span className="stock-badge stock-badge--out">Hết hàng</span>}</div>
                      </div></div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
