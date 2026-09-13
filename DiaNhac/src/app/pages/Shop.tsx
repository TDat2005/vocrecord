import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Filter, ShoppingCart, Heart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { API_BASE } from '../config/api';
import { SafeImage } from '../components/SafeImage';
import '../../styles/pages/shop.css';


const productCategories = ["Tất cả", "Đĩa Than (Vinyl)", "Cassette", "Máy Quay Đĩa (Turntable)", "Phụ Kiện"];
const musicGenres = [
  "Tất cả", "ROCK", "CLASSIC ROCK", "PROGRESSIVE ROCK", "SOFT ROCK", "ALTERNATIVE ROCK", "GRUNGE",
  "ALTERNATIVE", "ELECTRONIC", "TRIP HOP", "ALTERNATIVE HIP HOP", "AMBIENT", "POP", "PSYCHEDELIC POP", "SYNTH-POP",
  "R&B", "SOUL", "JAZZ", "SMOOTH JAZZ", "VOCAL JAZZ", "JAPANESE JAZZ", "BLUES", "FUNK / SOUL", "DISCO",
  "HIP HOP", "REGGAE", "LATIN", "BOSSA NOVA", "FOLK", "INDIE FOLK", "COUNTRY", "WORLD", "CLASSICAL",
  "STAGE & SCREEN", "CITY POP", "VIỆT NAM", "CHRISTMAS"
];

const getGenreLabel = (genre = '') => {
  const normalized = String(genre).toLowerCase();
  if (normalized.includes('cassette')) return 'CASSETTE';
  if (normalized.includes('turntable')) return 'TURNTABLE';
  if (normalized.includes('vinyl') || normalized.includes('than')) return 'VINYL';
  if (normalized.includes('phụ') || normalized.includes('phu') || normalized.includes('kiện') || normalized.includes('kien')) return 'PHỤ KIỆN';
  return genre;
};

export function Shop() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [selectedMusicGenre, setSelectedMusicGenre] = useState('Tất cả');
  const [sortBy, setSortBy] = useState('name');
  const [showFilters, setShowFilters] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  const handleQuickAddCart = (e: React.MouseEvent, record: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (record.stock <= 0) return;
    addToCart({ id: record.id, title: record.title, artist: record.artist, price: record.price, image: record.image, stock: record.stock });
  };

  const handleQuickWishlist = (e: React.MouseEvent, record: any) => {
    e.preventDefault();
    e.stopPropagation();
    const userStr = localStorage.getItem('user');
    if (!userStr) { alert('Vui lòng đăng nhập để sử dụng tính năng yêu thích!'); return; }
    const user = JSON.parse(userStr);
    const customerId = user.customer_id;
    if (!customerId) return;

    if (isInWishlist(record.id)) {
      fetch(`${API_BASE}/wishlist`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customerId, product_id: record.id })
      }).then(r => r.json()).then(d => { if (d.success) removeFromWishlist(record.id); });
    } else {
      fetch(`${API_BASE}/wishlist`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customerId, product_id: record.id })
      }).then(r => r.json()).then(d => {
        if (d.success) addToWishlist({ id: record.id, title: record.title, artist: record.artist, price: record.price, image: record.image, genre: record.genre, year: record.year });
        else alert(d.message);
      });
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadProducts = async () => {
      let lastError = 'Không thể tải sản phẩm';
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          const response = await fetch(`${API_BASE}/products`);
          const data = await response.json();
          if (response.ok && data.success && Array.isArray(data.data) && data.data.length > 0) {
            if (!cancelled) {
              setRecords(data.data);
              setLoadError('');
            }
            return;
          }
          lastError = data.message || 'Chưa có dữ liệu sản phẩm';
        } catch (err) {
          lastError = err instanceof Error ? err.message : lastError;
        }
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      if (!cancelled) setLoadError(lastError);
    };

    loadProducts().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const filteredRecords = records
    .filter((record) => {
      const category = record.category || record.genre || '';
      const musicGenre = String(record.music_genre || '').toUpperCase();
      const matchesCategory = selectedCategory === 'Tất cả' || category === selectedCategory;
      const matchesMusicGenre = selectedMusicGenre === 'Tất cả' || musicGenre === selectedMusicGenre;
      const matchesSearch = searchQuery === '' || 
        record.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (record.artist && record.artist.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesMusicGenre && matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-low': return a.price - b.price;
        case 'price-high': return b.price - a.price;
        case 'year': return b.year - a.year;
        case 'name': default: return a.title.localeCompare(b.title);
      }
    });

  useEffect(() => {
    if (searchQuery) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [searchQuery]);

  const formatPrice = (price: number) => {
    return Number(price).toLocaleString('vi-VN') + 'đ';
  };

  return (
    <div className="page page--gray shop-page">
      <div className="container" style={{ padding: '2rem 1rem' }}>
        {/* Header */}
        <div className="page-header page-header--thick">
          <h1 className="page-title" style={{ fontFamily: 'var(--font-heading)' }}>CỬA HÀNG</h1>
          {searchQuery && (
            <p className="page-subtitle">
              Kết quả tìm kiếm cho: "{searchQuery}" ({filteredRecords.length} sản phẩm)
            </p>
          )}
          {!searchQuery && (
            <p className="page-subtitle">
              Khám phá bộ sưu tập đầy đủ với {records.length} sản phẩm
            </p>
          )}
        </div>

        <div className="catalog-layout">
          {/* Filters Sidebar */}
          <aside className="catalog-sidebar">
            <div className="catalog-sidebar-box">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="catalog-filter-toggle"
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Filter style={{ width: 20, height: 20 }} /> BỘ LỌC</span>
                <span>{showFilters ? '-' : '+'}</span>
              </button>

              <div className={`catalog-filter-content ${showFilters ? 'catalog-filter-content--open' : ''}`}>
                {/* Product category filter */}
                <div className="catalog-filter-group">
                  <h3 className="catalog-filter-title">DANH MỤC SẢN PHẨM</h3>
                  <div className="catalog-filter-list custom-scrollbar">
                    {productCategories.map((category) => (
                      <label key={category} className="catalog-filter-label">
                        <input
                          type="radio"
                          name="category"
                          checked={selectedCategory === category}
                          onChange={() => setSelectedCategory(category)}
                          className="catalog-filter-radio"
                        />
                        <span className="catalog-filter-text">{category}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Music genre filter */}
                <div className="catalog-filter-group">
                  <h3 className="catalog-filter-title">THỂ LOẠI NHẠC</h3>
                  <div className="catalog-filter-list custom-scrollbar">
                    {musicGenres.map((genre) => (
                      <label key={genre} className="catalog-filter-label">
                        <input
                          type="radio"
                          name="music-genre"
                          checked={selectedMusicGenre === genre}
                          onChange={() => setSelectedMusicGenre(genre)}
                          className="catalog-filter-radio"
                        />
                        <span className="catalog-filter-text">{genre}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Sort By */}
                <div>
                  <h3 className="catalog-filter-title">SẮP XẾP THEO</h3>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="catalog-select"
                  >
                    <option value="name">Tên (A-Z)</option>
                    <option value="price-low">Giá (Thấp đến Cao)</option>
                    <option value="price-high">Giá (Cao đến Thấp)</option>
                    <option value="year">Năm (Mới nhất)</option>
                  </select>
                </div>
              </div>
            </div>
          </aside>

          {/* Products Grid */}
          <div className="catalog-main">
            {loading ? (
              <div className="empty-state"><p className="page-subtitle">ĐANG TẢI SẢN PHẨM...</p></div>
            ) : loadError ? (
              <div className="empty-state"><p className="page-subtitle">{loadError}</p></div>
            ) : filteredRecords.length === 0 ? (
              <div className="empty-state">
                <p className="page-subtitle">Không tìm thấy sản phẩm phù hợp.</p>
              </div>
            ) : (
              <div className="grid-3-col">
                {filteredRecords.map((record) => (
                  <Link
                    key={record.id}
                    to={`/product/${record.id}`}
                    className="product-card"
                  >
                    <div className="product-card-image">
                      <SafeImage src={record.image} alt={record.title} />
                      <div className="product-card-badge">
                        {getGenreLabel(record.genre)}
                      </div>
                      {/* Quick Action Buttons */}
                      <div className="quick-actions">
                        <button
                          onClick={(e) => handleQuickWishlist(e, record)}
                          className={`quick-action-btn ${isInWishlist(record.id) ? 'quick-action-btn--active' : ''}`}
                          title="Yêu thích"
                        >
                          <Heart style={{ width: 20, height: 20 }} fill={isInWishlist(record.id) ? 'currentColor' : 'none'} />
                        </button>
                        {record.stock > 0 && (
                          <button
                            onClick={(e) => handleQuickAddCart(e, record)}
                            className="quick-action-btn quick-action-btn--cart"
                            title="Thêm vào giỏ hàng"
                          >
                            <ShoppingCart style={{ width: 20, height: 20 }} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="product-card-body">
                      <h3 className="product-card-name line-clamp-1">{record.title}</h3>
                      <p className="product-card-artist line-clamp-1">{record.artist}</p>
                      <div className="product-card-footer" style={{ marginTop: 'auto' }}>
                        <div>
                          <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                            <span className="product-card-price">{formatPrice(record.price)}</span>
                            <span className="product-card-year">{record.year}</span>
                          </div>
                          <div className="product-card-stock">
                            {record.stock > 0 ? (
                              <span className="stock-badge stock-badge--in">Còn hàng</span>
                            ) : (
                              <span className="stock-badge stock-badge--out">Hết hàng</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
