import { Link } from 'react-router';
import { Music, Disc3, Headphones, TrendingUp, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { API_BASE } from '../config/api';
import { SafeImage } from '../components/SafeImage';
import '../../styles/pages/home.css';


export function Home() {
  const [featuredRecords, setFeaturedRecords] = useState<any[]>([]);
  const [newReleases, setNewReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

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
              setFeaturedRecords(data.data.slice(0, 4));
              setNewReleases(data.data.slice(4, 8));
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

  return (
    <div className="home-page">
      {/* Hero Bento Grid */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-grid">
            <div className="hero-card hero-card--new">
                <div className="hero-card-bg" style={{ backgroundImage: 'url(/images/products/vinyl-01.webp)' }}></div>
                <div className="hero-card-content">
                  <h1 className="hero-card-title" style={{ fontFamily: 'var(--font-heading)' }}>ĐĨA MỚI</h1>
                  <p className="hero-card-desc">Trải nghiệm âm nhạc cực đỉnh với chất lượng hoàn thiện tuyệt đối.</p>
                  <Link to="/shop" className="hero-card-btn hero-card-btn--dark">
                      Săn Ngay <ArrowRight style={{ width: 24, height: 24 }} />
                  </Link>
                </div>
            </div>
            <div className="hero-card hero-card--vintage">
                <div className="hero-card-bg" style={{ backgroundImage: 'url(/images/products/vinyl-04.webp)' }}></div>
                <div className="hero-card-content">
                  <h1 className="hero-card-title" style={{ fontFamily: 'var(--font-heading)', color: '#000' }}>ĐĨA VINTAGE</h1>
                  <p className="hero-card-desc" style={{ color: '#000' }}>Hơn 5000+ đĩa qua sử dụng được kiểm tra và lọc kĩ lưỡng.</p>
                  <Link to="/shop" className="hero-card-btn hero-card-btn--light">
                      Khám Phá <ArrowRight style={{ width: 24, height: 24 }} />
                  </Link>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* Promo Banner */}
      <section className="promo-section">
        <div className="promo-wrapper">
            <SafeImage src="/images/products/music-02.webp" alt="Bộ sưu tập âm nhạc analog" className="promo-image" />
            <div className="promo-overlay">
                <div className="promo-card">
                    <h2 className="promo-title">BIG SALE MÙA HÈ ☀️</h2>
                    <p className="promo-desc">Giảm đến 30% cho tất cả đĩa than Pop & Rock</p>
                    <Link to="/shop" className="promo-btn">
                        Mua ngay kẻo lỡ
                    </Link>
                </div>
            </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <div className="container">
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon feature-icon--yellow">
                <Disc3 style={{ width: 32, height: 32, color: '#000' }} />
              </div>
              <h3 className="feature-title">Chất Lượng Cao Cấp</h3>
              <p className="feature-desc">Tuyển chọn tỉ mỉ các đĩa than trong tình trạng hoàn hảo.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon feature-icon--pink">
                <Headphones style={{ width: 32, height: 32, color: '#000' }} />
              </div>
              <h3 className="feature-title">Tuyển Chọn Chuyên Gia</h3>
              <p className="feature-desc">Bởi những người am hiểu nghệ thuật đĩa than.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon feature-icon--blue">
                <Music style={{ width: 32, height: 32, color: '#000' }} />
              </div>
              <h3 className="feature-title">Đa Dạng Thể Loại</h3>
              <p className="feature-desc">Từ jazz, rock đến soul và electronic - chúng tôi có tất cả.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Records */}
      <section className="products-section products-section--white">
        <div className="container">
          <div className="products-header">
            <h2 className="products-title" style={{ fontFamily: 'var(--font-heading)' }}>Featured Records</h2>
            <Link to="/shop" className="products-view-all">
              XEM TẤT CẢ →
            </Link>
          </div>

          <div className="products-grid">
            {loading && <p className="page-subtitle">ĐANG TẢI SẢN PHẨM...</p>}
            {!loading && loadError && <p className="page-subtitle">{loadError}</p>}
            {!loading && !loadError && featuredRecords.map((record) => (
              <Link
                key={record.id}
                to={`/product/${record.id}`}
                className="product-card"
              >
                <div className="product-card-image">
                  <SafeImage src={record.image} alt={record.title} />
                  <div className="product-card-badge">
                      {record.genre}
                  </div>
                </div>
                <div className="product-card-body">
                  <h3 className="product-card-name line-clamp-1">{record.title}</h3>
                  <p className="product-card-artist line-clamp-1">{record.artist}</p>
                  <div className="product-card-footer">
                    <span className="product-card-price">{Number(record.price).toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* New Releases */}
      <section className="products-section products-section--gray">
        <div className="container">
          <div className="products-header">
            <div className="products-header-left">
                <div className="products-header-icon"><TrendingUp style={{ width: 32, height: 32, color: '#fff' }} /></div>
                <h2 className="products-title" style={{ fontFamily: 'var(--font-heading)' }}>New Arrivals</h2>
            </div>
          </div>

          <div className="products-grid">
            {loading && <p className="page-subtitle">ĐANG TẢI SẢN PHẨM...</p>}
            {!loading && !loadError && newReleases.map((record) => (
               <Link
                key={record.id}
                to={`/product/${record.id}`}
                className="product-card"
              >
                <div className="product-card-image">
                  <SafeImage src={record.image} alt={record.title} />
                  <div className="product-card-badge product-card-badge--new">
                      NEW
                  </div>
                </div>
                <div className="product-card-body">
                  <h3 className="product-card-name line-clamp-1">{record.title}</h3>
                  <p className="product-card-artist line-clamp-1">{record.artist}</p>
                  <div className="product-card-footer">
                    <span className="product-card-price">{Number(record.price).toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
