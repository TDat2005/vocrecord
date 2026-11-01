import { useState } from 'react';
import { ProductCard } from './ProductCard';
import { EmptyState, LoadMore } from './ui';
import { SORT_OPTIONS, useProducts } from '../hooks/useProducts';
import '../../styles/pages/shop.css';

// Trang danh mục (Mâm đĩa, Cassette, Phụ kiện): chỉ khác tên danh mục và lời giới thiệu.
export function CategoryPage({ category, title, description, emptyText }) {
  const [sortBy, setSortBy] = useState('name');
  const { products, total, loading, loadingMore, error, loadMore } = useProducts({ category, sort: sortBy });

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{description}</p>
        </div>

        <div className="collection__toolbar">
          <span className="text-muted text-sm">{total} sản phẩm</span>
          <label className="collection__sort">
            <span className="text-muted text-sm">Sắp xếp</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="select select--sm">
              {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>

        {loading ? (
          <p className="loading-text">Đang tải sản phẩm...</p>
        ) : error ? (
          <p className="loading-text">{error}</p>
        ) : products.length === 0 ? (
          <EmptyState title={emptyText} />
        ) : (
          <>
            <div className="product-grid product-grid--4">
              {products.map((product) => <ProductCard key={product.id} product={product} quickAdd />)}
            </div>
            <LoadMore shown={products.length} total={total} loading={loadingMore} onClick={loadMore} />
          </>
        )}
      </div>
    </div>
  );
}
