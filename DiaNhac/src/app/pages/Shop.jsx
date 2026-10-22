import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { SlidersHorizontal, X } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { EmptyState } from '../components/ui';
import { SORT_OPTIONS, sortProducts, useProducts } from '../hooks/useProducts';
import { MUSIC_GENRES, PRODUCT_CATEGORIES } from '../utils/catalog';
import '../../styles/pages/shop.css';

const ALL = 'Tất cả';
const ITEM_TYPES = { 'Hàng mới': 'moi', 'Đĩa cũ': 'cu' };

function FilterGroup({ title, name, options, value, onChange }) {
  return (
    <fieldset className="facet">
      <legend className="facet__title">{title}</legend>
      <div className="facet__list thin-scrollbar">
        {options.map((option) => (
          <label key={option} className="facet__option">
            <input type="radio" name={name} checked={value === option} onChange={() => onChange(option)} />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Shop() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const { products, loading, error } = useProducts();
  const [category, setCategory] = useState(ALL);
  const [genre, setGenre] = useState(ALL);
  const [itemType, setItemType] = useState(searchParams.get('loai') === 'cu' ? 'Đĩa cũ' : ALL);
  const [sortBy, setSortBy] = useState('name');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    const keyword = searchQuery.toLowerCase();
    const matches = products.filter((product) => {
      const productCategory = product.category || product.genre || '';
      const musicGenre = String(product.music_genre || '').toUpperCase();
      const matchesCategory = category === ALL || productCategory === category;
      const matchesGenre = genre === ALL || musicGenre === genre;
      const matchesType = itemType === ALL || (product.item_type || 'moi') === ITEM_TYPES[itemType];
      const matchesSearch = !keyword
        || String(product.title).toLowerCase().includes(keyword)
        || String(product.artist || '').toLowerCase().includes(keyword);
      return matchesCategory && matchesGenre && matchesType && matchesSearch;
    });
    return sortProducts(matches, sortBy);
  }, [products, category, genre, itemType, searchQuery, sortBy]);

  const hasFilters = category !== ALL || genre !== ALL || itemType !== ALL;
  const resetFilters = () => {
    setCategory(ALL);
    setGenre(ALL);
    setItemType(ALL);
  };

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">{searchQuery ? `Kết quả cho “${searchQuery}”` : 'Cửa hàng'}</h1>
          <p className="page-subtitle">
            {searchQuery
              ? <>Tìm thấy {filtered.length} sản phẩm · <Link to="/shop" className="link-underline">Xóa tìm kiếm</Link></>
              : 'Khám phá toàn bộ đĩa than, cassette, mâm đĩa và phụ kiện.'}
          </p>
        </div>

        <div className="collection">
          {showFilters && <div className="collection__backdrop" onClick={() => setShowFilters(false)} />}
          <aside className={`collection__filters ${showFilters ? 'collection__filters--open' : ''}`}>
            <div className="collection__filters-header">
              <h2>Bộ lọc</h2>
              <button type="button" className="icon-button" onClick={() => setShowFilters(false)} aria-label="Đóng bộ lọc">
                <X size={20} />
              </button>
            </div>
            <FilterGroup title="Danh mục" name="category" options={[ALL, ...PRODUCT_CATEGORIES]} value={category} onChange={setCategory} />
            <FilterGroup title="Thể loại nhạc" name="genre" options={[ALL, ...MUSIC_GENRES]} value={genre} onChange={setGenre} />
            <FilterGroup title="Tình trạng" name="item-type" options={[ALL, ...Object.keys(ITEM_TYPES)]} value={itemType} onChange={setItemType} />
            {hasFilters && (
              <button type="button" className="btn btn--plain" onClick={resetFilters}>Xóa bộ lọc</button>
            )}
          </aside>

          <div className="collection__main">
            <div className="collection__toolbar">
              <button type="button" className="btn btn--secondary btn--sm collection__filter-toggle" onClick={() => setShowFilters(true)}>
                <SlidersHorizontal size={16} /> Bộ lọc
              </button>
              <span className="text-muted text-sm">{filtered.length} sản phẩm</span>
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
            ) : filtered.length === 0 ? (
              <EmptyState title="Không tìm thấy sản phẩm phù hợp" action={hasFilters && (
                <button type="button" className="btn btn--secondary" onClick={resetFilters}>Xóa bộ lọc</button>
              )}>
                Thử đổi từ khóa hoặc bộ lọc khác.
              </EmptyState>
            ) : (
              <div className="product-grid">
                {filtered.map((product) => <ProductCard key={product.id} product={product} quickAdd />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
