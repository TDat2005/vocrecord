import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ChevronRight, Heart, MessageCircle, Youtube } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { ProductCard } from '../components/ProductCard';
import { SafeImage } from '../components/SafeImage';
import { Badge, EmptyState, QuantitySelector } from '../components/ui';
import { api, NETWORK_ERROR } from '../utils/api';
import { getToken } from '../utils/auth';
import { formatDate, formatPrice } from '../utils/format';
import '../../styles/pages/product-detail.css';

const PURCHASE_NOTES = [
  <>Vui lòng thanh toán 100% đơn hàng có <strong>sản phẩm pre-order</strong>.</>,
  <>Giá sản phẩm <strong>pre-order</strong> cập nhật hàng tuần, Vọc Records sẽ liên hệ nếu có chênh lệch.</>,
  <>Vận chuyển: sản phẩm <strong>còn hàng 1–5 ngày</strong>, sản phẩm <strong>pre-order 2–5 tuần</strong>.</>,
  <>Sản phẩm giá <strong>0đ</strong> vui lòng <strong>liên hệ</strong> để đặt hàng.</>,
  <><strong>Không hủy / hoàn tiền</strong> sản phẩm pre-order.</>,
  <>Khách hàng có thể <strong>hủy đơn</strong> nếu cửa hàng chưa gửi cho đơn vị vận chuyển.</>,
];

function ProductQuestions({ productId }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.get(`/comments/product/${productId}`)
      .then((data) => setComments(data.success ? data.data || [] : []))
      .catch(() => setComments([]));
  }, [productId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!getToken()) {
      toast.error('Vui lòng đăng nhập để đặt câu hỏi về sản phẩm.');
      navigate('/login', { state: { returnUrl: `/product/${productId}` } });
      return;
    }
    if (!text.trim()) return;
    setSending(true);
    try {
      const data = await api.post(`/comments/product/${productId}`, { content: text.trim() });
      if (!data.success) {
        toast.error(data.message || 'Không thể gửi câu hỏi');
        return;
      }
      setText('');
      toast.success('Đã gửi câu hỏi. Cửa hàng sẽ duyệt và phản hồi sớm.');
    } catch {
      toast.error(NETWORK_ERROR);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="section product-qa">
      <h2 className="section-title"><MessageCircle size={22} /> Hỏi đáp về sản phẩm</h2>
      <p className="text-muted">Hỏi về tình trạng, phiên bản, cách bảo quản hoặc gửi phản hồi. Cửa hàng sẽ trả lời ngay trong mục này.</p>

      <div className="product-qa__list">
        {comments.length === 0 && <p className="product-qa__empty">Chưa có câu hỏi nào. Hãy là người đầu tiên hỏi về sản phẩm.</p>}
        {comments.map((comment) => (
          <div key={comment.id} className={`product-qa__item ${comment.parent_id ? 'product-qa__item--reply' : ''}`}>
            <div className="product-qa__meta">
              <strong>{comment.author}</strong>
              {Boolean(comment.is_staff) && <Badge tone="info">Vọc Records</Badge>}
              <span>{formatDate(comment.created_at)}</span>
            </div>
            <p className="pre-wrap">{comment.content}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="product-qa__form">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={3}
          maxLength={2000}
          className="textarea"
          placeholder="Bạn muốn biết thêm điều gì về sản phẩm?"
          aria-label="Câu hỏi"
        />
        <button type="submit" disabled={sending || !text.trim()} className="btn btn--primary">
          {sending ? 'Đang gửi...' : 'Gửi câu hỏi'}
        </button>
      </form>
    </section>
  );
}

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [record, setRecord] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setQuantity(1);
    setRelated([]);

    api.get(`/products/${id}`)
      .then((data) => {
        if (cancelled) return;
        const product = data.success ? data.data : null;
        setRecord(product);
        if (!product) return;
        api.get(`/products?category=${encodeURIComponent(product.genre || '')}`).then((list) => {
          if (!cancelled && list.success) {
            setRelated((list.data || []).filter((item) => String(item.id) !== String(id)).slice(0, 4));
          }
        }).catch(() => {});
      })
      .catch(() => {
        if (!cancelled) setRecord(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <p className="loading-text">Đang tải sản phẩm...</p>;

  if (!record) {
    return (
      <div className="page">
        <EmptyState title="Không tìm thấy sản phẩm" action={<Link to="/shop" className="btn btn--primary">Quay lại cửa hàng</Link>} />
      </div>
    );
  }

  const stock = Number(record.stock) || 0;
  const discontinued = record.status === 'ngungkinhdoanh';
  const inStock = stock > 0 && !discontinued;
  const saved = isInWishlist(record.id);
  const category = String(record.category || record.genre || '');
  const isMusicRecord = category.includes('Vinyl') || category.includes('Cassette');
  const tracklist = String(record.tracklist || '').split(/\r?\n/).map((track) => track.trim()).filter(Boolean);
  const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${record.artist || ''} ${record.title} full album`)}`;

  const handleAddToCart = () => {
    addToCart(record, quantity);
    toast.success(`Đã thêm ${quantity} × "${record.title}" vào giỏ hàng`);
  };

  const handleBuyNow = () => {
    addToCart(record, quantity);
    navigate('/checkout');
  };

  const handleWishlist = async () => {
    try {
      const result = await toggleWishlist(record);
      if (result.success) toast.success(result.message || 'Đã thêm vào danh sách yêu thích');
      else toast.error(result.message);
    } catch {
      toast.error(NETWORK_ERROR);
    }
  };

  return (
    <div className="page">
      <div className="container">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Trang chủ</Link>
          <ChevronRight size={14} />
          <Link to="/shop">Cửa hàng</Link>
          <ChevronRight size={14} />
          <span className="line-clamp-1">{record.title}</span>
        </nav>

        <div className="product">
          <div className="product__media">
            <SafeImage src={record.image} alt={record.title} loading="eager" />
          </div>

          <div className="product__info">
            <p className="product__caption">{[category, record.music_genre].filter(Boolean).join(' · ')}</p>
            <h1 className="product__title">{record.title}</h1>
            {record.artist && <p className="product__artist">{record.artist}</p>}
            <p className="product__price">{formatPrice(record.price)}</p>
            <div>
              {inStock
                ? <Badge tone="success">Còn hàng · {stock} sản phẩm</Badge>
                : <Badge tone="dark">{discontinued ? 'Ngừng kinh doanh' : 'Hết hàng'}</Badge>}
            </div>

            {inStock && (
              <div className="field">
                <span className="label">Số lượng</span>
                <QuantitySelector value={quantity} max={stock} onChange={setQuantity} />
              </div>
            )}

            <div className="product__buttons">
              <button type="button" onClick={handleAddToCart} disabled={!inStock} className="btn btn--secondary btn--lg btn--full">
                {inStock ? 'Thêm vào giỏ' : 'Hết hàng'}
              </button>
              <button type="button" onClick={handleBuyNow} disabled={!inStock} className="btn btn--primary btn--lg btn--full">
                Mua ngay
              </button>
            </div>

            <div className="product__links">
              <button type="button" onClick={handleWishlist} className={`product__link ${saved ? 'product__link--active' : ''}`}>
                <Heart size={18} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Đã lưu yêu thích' : 'Thêm vào yêu thích'}
              </button>
              <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="product__link">
                <Youtube size={18} /> Nghe thử trên YouTube
              </a>
            </div>

            {record.description && <p className="product__description pre-wrap">{record.description}</p>}

            <div className="accordion">
              <details open>
                <summary>Thông tin sản phẩm</summary>
                <dl className="description-list">
                  <dt>Nhóm sản phẩm</dt><dd>{category || 'Đang cập nhật'}</dd>
                  <dt>Thể loại nhạc</dt><dd>{record.music_genre || 'Không áp dụng'}</dd>
                  <dt>Định dạng</dt><dd>{record.format || 'Đang cập nhật'}</dd>
                  <dt>{isMusicRecord ? 'Tình trạng bìa / đĩa' : 'Tình trạng sản phẩm'}</dt><dd>{record.condition || 'Đang cập nhật'}</dd>
                  <dt>Quy cách</dt><dd>{record.package_info || 'Đang cập nhật'}</dd>
                  <dt>{isMusicRecord ? 'Năm phát hành' : 'Năm sản xuất'}</dt><dd>{record.year || 'Đang cập nhật'}</dd>
                </dl>
              </details>
              {isMusicRecord && (
                <details>
                  <summary>Tracklist</summary>
                  {tracklist.length > 0
                    ? <ol className="product__tracklist">{tracklist.map((track, index) => <li key={`${track}-${index}`}>{track}</li>)}</ol>
                    : <p className="text-muted">Tracklist chính thức của đúng phiên bản này đang được cập nhật.</p>}
                </details>
              )}
              <details>
                <summary>Lưu ý khi mua hàng</summary>
                <ul className="product__notes">
                  {PURCHASE_NOTES.map((note, index) => <li key={index}>{note}</li>)}
                </ul>
              </details>
            </div>
          </div>
        </div>

        <ProductQuestions productId={record.id} />

        {related.length > 0 && (
          <section className="section">
            <div className="section-header">
              <h2 className="section-title">Có thể bạn cũng thích</h2>
            </div>
            <div className="product-grid product-grid--4">
              {related.map((item) => <ProductCard key={item.id} product={item} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
