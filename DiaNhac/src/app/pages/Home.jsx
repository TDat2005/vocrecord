import { Link } from 'react-router';
import { Disc3, Headphones, Music } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { SafeImage } from '../components/SafeImage';
import { useProducts } from '../hooks/useProducts';
import '../../styles/pages/home.css';

const FEATURES = [
  { icon: Disc3, title: 'Chất lượng cao cấp', desc: 'Tuyển chọn tỉ mỉ các đĩa than trong tình trạng hoàn hảo.' },
  { icon: Headphones, title: 'Tuyển chọn chuyên gia', desc: 'Bởi những người am hiểu nghệ thuật đĩa than.' },
  { icon: Music, title: 'Đa dạng thể loại', desc: 'Từ jazz, rock đến soul và electronic — chúng tôi có tất cả.' },
];

function ProductSection({ title, products, loading, error, badge, subtle }) {
  return (
    <section className={`section ${subtle ? 'section--subtle' : ''}`}>
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">{title}</h2>
          <Link to="/shop" className="link-underline text-sm">Xem tất cả</Link>
        </div>
        {loading && <p className="loading-text">Đang tải sản phẩm...</p>}
        {!loading && error && <p className="loading-text">{error}</p>}
        {!loading && !error && (
          <div className="product-grid product-grid--4">
            {products.map((product) => <ProductCard key={product.id} product={product} badge={badge} />)}
          </div>
        )}
      </div>
    </section>
  );
}

export function Home() {
  const { products, loading, error } = useProducts();

  return (
    <div className="home-page">
      {/* Ảnh bìa dạng collage */}
      <section className="hero">
        <div className="container hero__grid">
          <Link to="/shop" className="hero-card hero-card--large">
            <SafeImage src="/images/products/vinyl-01.webp" alt="" loading="eager" className="hero-card__image" />
            <div className="hero-card__content">
              <h1 className="hero-card__title">Đĩa mới</h1>
              <p className="hero-card__desc">Trải nghiệm âm nhạc cực đỉnh với chất lượng hoàn thiện tuyệt đối.</p>
              <span className="btn btn--light">Săn ngay</span>
            </div>
          </Link>
          <Link to="/shop" className="hero-card">
            <SafeImage src="/images/products/vinyl-04.webp" alt="" loading="eager" className="hero-card__image" />
            <div className="hero-card__content">
              <h2 className="hero-card__title">Đĩa vintage</h2>
              <p className="hero-card__desc">Hơn 5000+ đĩa qua sử dụng được kiểm tra và lọc kĩ lưỡng.</p>
              <span className="btn btn--light">Khám phá</span>
            </div>
          </Link>
        </div>
      </section>

      {/* Ưu điểm */}
      <section className="section">
        <div className="container features">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="feature">
              <span className="feature__icon"><Icon size={24} strokeWidth={1.75} /></span>
              <h3 className="feature__title">{title}</h3>
              <p className="feature__desc">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <ProductSection title="Sản phẩm nổi bật" products={products.slice(0, 4)} loading={loading} error={error} />

      {/* Ảnh kèm nội dung khuyến mãi */}
      <section className="section">
        <div className="container">
          <div className="promo">
            <SafeImage src="/images/products/music-02.webp" alt="Bộ sưu tập âm nhạc analog" className="promo__image" />
            <div className="promo__content">
              <p className="promo__eyebrow">Ưu đãi</p>
              <h2 className="promo__title">Big sale mùa hè</h2>
              <p className="text-muted">Giảm đến 30% cho tất cả đĩa than Pop &amp; Rock.</p>
              <Link to="/shop" className="btn btn--primary">Mua ngay kẻo lỡ</Link>
            </div>
          </div>
        </div>
      </section>

      <ProductSection title="Hàng mới về" products={products.slice(4, 8)} loading={loading} error={error} badge="Mới" subtle />
    </div>
  );
}
