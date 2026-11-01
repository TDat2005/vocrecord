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

function ProductSection({ title, products, loading, error, badge, subtle, to = '/shop' }) {
  return (
    <section className={`section ${subtle ? 'section--subtle' : ''}`}>
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">{title}</h2>
          <Link to={to} className="link-underline text-sm">Xem tất cả</Link>
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
  // Sản phẩm mới nhất (mã lớn nhất) và đĩa cũ đã thẩm định. Trước đây nhãn bị ngược:
  // "Sản phẩm nổi bật" là 4 sản phẩm mới nhất, còn "Hàng mới về" lại là 4 sản phẩm cũ hơn.
  const latest = useProducts({ sort: 'newest' }, { pageSize: 4 });
  const used = useProducts({ item_type: 'cu', sort: 'newest' }, { pageSize: 4 });

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
          <Link to="/shop?loai=cu" className="hero-card">
            <SafeImage src="/images/products/vinyl-04.webp" alt="" loading="eager" className="hero-card__image" />
            <div className="hero-card__content">
              <h2 className="hero-card__title">Đĩa cũ đã thẩm định</h2>
              <p className="hero-card__desc">Mỗi bản được kiểm tra, vệ sinh và chấm tình trạng theo thang Goldmine trước khi bán.</p>
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

      <ProductSection title="Hàng mới về" products={latest.products} loading={latest.loading} error={latest.error} badge="Mới" />

      {/* Ảnh kèm nội dung khuyến mãi */}
      <section className="section">
        <div className="container">
          <div className="promo">
            <SafeImage src="/images/products/music-02.webp" alt="Bộ sưu tập âm nhạc analog" className="promo__image" />
            <div className="promo__content">
              <p className="promo__eyebrow">Bán &amp; ký gửi</p>
              <h2 className="promo__title">Có đĩa cũ không còn nghe?</h2>
              <p className="text-muted">Chụp ảnh đĩa để AI ước tính giá, rồi bán đứt cho cửa hàng hoặc ký gửi để bán với giá cao hơn.</p>
              <Link to="/sell" className="btn btn--primary">Bán đĩa cũ</Link>
            </div>
          </div>
        </div>
      </section>

      {(used.loading || used.products.length > 0) && (
        <ProductSection title="Đĩa cũ đã thẩm định" products={used.products} loading={used.loading} error={used.error} subtle to="/shop?loai=cu" />
      )}
    </div>
  );
}
