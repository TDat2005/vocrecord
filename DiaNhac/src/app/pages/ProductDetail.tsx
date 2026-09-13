import { useParams, Link, useNavigate } from 'react-router';
import { ArrowLeft, ShoppingCart, Check, Plus, Minus, Heart, Youtube, MessageCircle, Send } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useState, useEffect } from 'react';
import { API_BASE } from '../config/api';
import { SafeImage } from '../components/SafeImage';
import '../../styles/pages/product-detail.css';


export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  const [record, setRecord] = useState<any>(null);
  const [relatedRecords, setRelatedRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    fetch(`${API_BASE}/products/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setRecord(data.data);
          fetch(`${API_BASE}/products?category=${data.data.genre}`)
            .then(r => r.json())
            .then(d => {
              if (d.success && d.data) {
                setRelatedRecords(d.data.filter((i: any) => i.id != id).slice(0, 4));
              }
            });
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetch(`${API_BASE}/comments/product/${id}`)
      .then(res => res.json()).then(data => { if (data.success) setComments(data.data || []); }).catch(() => setComments([]));
  }, [id]);

  const formatPrice = (price: number) => {
    return Number(price).toLocaleString('vi-VN') + 'đ';
  };

  const tracklist = String(record?.tracklist || '')
    .split(/\r?\n/)
    .map((track: string) => track.trim())
    .filter(Boolean);

  if (loading) {
    return <div className="page page--gray page-centered" style={{ fontWeight: 700, fontSize: '1.25rem', textTransform: 'uppercase' }}>Đang tải...</div>;
  }

  if (!record) {
    return (
      <div className="page page--gray page-centered">
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', textTransform: 'uppercase' }}>Không tìm thấy sản phẩm</h2>
          <Link to="/shop" className="neo-btn neo-btn--primary">Quay lại cửa hàng</Link>
        </div>
      </div>
    );
  }

  const productCategory = String(record.category || record.genre || '');
  const isMusicRecord = productCategory.includes('Vinyl') || productCategory.includes('Cassette');
  const conditionLabel = isMusicRecord ? 'Tình trạng bìa / đĩa' : 'Tình trạng sản phẩm';
  const productionYearLabel = isMusicRecord ? 'Năm phát hành' : 'Năm sản xuất';

  const handleAddToCart = () => {
    if (record) {
      addToCart({ id: record.id, title: record.title, artist: record.artist, price: record.price, image: record.image, stock: record.stock }, quantity);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    }
  };

  const handleBuyNow = () => {
    if (record) {
      addToCart({ id: record.id, title: record.title, artist: record.artist, price: record.price, image: record.image, stock: record.stock }, quantity);
      navigate('/checkout');
    }
  };

  const handleWishlistToggle = () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) { alert('Vui lòng đăng nhập để sử dụng tính năng yêu thích!'); return; }
    const user = JSON.parse(userStr);
    const customerId = user.customer_id;
    if (!customerId) return;

    if (isInWishlist(record.id)) {
      fetch(`${API_BASE}/wishlist`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customerId, product_id: record.id })
      }).then(res => res.json()).then(data => { if (data.success) removeFromWishlist(record.id); });
    } else {
      fetch(`${API_BASE}/wishlist`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customerId, product_id: record.id })
      }).then(res => res.json()).then(data => {
        if (data.success) {
          addToWishlist({ id: record.id, title: record.title, artist: record.artist, price: record.price, image: record.image, genre: record.genre, year: record.year });
        } else { alert(data.message); }
      });
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) { alert('Vui lòng đăng nhập để hỏi hoặc phản hồi về sản phẩm.'); navigate('/login'); return; }
    if (!commentText.trim()) return;
    setCommentLoading(true);
    try {
      const response = await fetch(`${API_BASE}/comments/product/${record.id}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText.trim() })
      });
      const data = await response.json();
      if (!data.success) return alert(data.message || 'Không thể gửi câu hỏi');
      setCommentText('');
      alert('Đã gửi. Cửa hàng sẽ duyệt và phản hồi sớm.');
    } catch { alert('Không thể kết nối tới máy chủ'); }
    finally { setCommentLoading(false); }
  };

  const incrementQuantity = () => { if (quantity < record.stock) setQuantity(quantity + 1); };
  const decrementQuantity = () => { if (quantity > 1) setQuantity(quantity - 1); };
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1 && value <= record.stock) setQuantity(value);
  };

  return (
    <div className="pd-page">
      <div className="container" style={{ padding: '2rem 1rem' }}>
        {/* Back Button */}
        <button onClick={() => navigate(-1)} className="pd-back-btn">
          <ArrowLeft style={{ width: 20, height: 20 }} /> QUAY LẠI
        </button>

        {/* Product Details */}
        <div className="pd-grid">
          {/* Left Column */}
          <div className="flex-col flex-gap-8">
            <div className="pd-image-box">
              <div className="pd-image-frame">
                <SafeImage src={record.image} alt={record.title} loading="eager" />
              </div>
            </div>

            <div className="pd-notice">
              <h3 className="pd-notice-title">
                <ShoppingCart style={{ width: 24, height: 24 }} /> LƯU Ý KHI MUA HÀNG
              </h3>
              <ul className="pd-notice-list">
                <li>Vui lòng thanh toán 100% đơn hàng có <strong>sản phẩm PRE-ORDER</strong>.</li>
                <li>Giá sản phẩm <strong>PRE-ORDER</strong> cập nhật hàng tuần, Vọc Records sẽ liên hệ nếu có chênh lệch.</li>
                <li>Vận chuyển: Sản phẩm <strong>CÒN HÀNG 1-5 ngày</strong>, sản phẩm <strong>PRE-ORDER 2-5 tuần</strong>.</li>
                <li>Sản phẩm giá <strong>0 đ</strong> vui lòng <strong style={{ textDecoration: 'underline' }}>LIÊN HỆ</strong> để đặt hàng.</li>
                <li><strong>KHÔNG HUỶ/ HOÀN TIỀN</strong> sản phẩm PRE-ORDER.</li>
                <li>Khách hàng có thể <strong>HỦY ĐƠN HÀNG</strong> nếu cửa hàng chưa gửi cho đơn vị vận chuyển.</li>
              </ul>
            </div>
          </div>

          {/* Right Column */}
          <div>
            <div style={{ marginBottom: '0.5rem' }}>
              <span className="pd-genre-badge">{record.genre}</span>
            </div>
            <h1 className="pd-title" style={{ fontFamily: 'var(--font-heading)' }}>{record.title}</h1>
            <p className="pd-artist">{record.artist}</p>

            <div style={{ marginBottom: '1.5rem' }}>
              <span className="pd-year-badge">NĂM PHÁT HÀNH: {record.year || 'N/A'}</span>
            </div>

            <div className="pd-price">{formatPrice(record.price)}</div>

            <div className="pd-stock">
              {record.stock > 0 ? (
                <div className="pd-stock-in">
                  <Check style={{ width: 20, height: 20 }} />
                  <span>CÒN HÀNG ({record.stock} SP)</span>
                </div>
              ) : (
                <span className="pd-stock-out">HẾT HÀNG</span>
              )}
            </div>

            <div className="pd-description">
              <h3>MÔ TẢ SẢN PHẨM</h3>
              <p>{record.description}</p>
            </div>

            {/* Quantity */}
            {record.stock > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 className="pd-qty-label">SỐ LƯỢNG</h3>
                <div className="qty-selector">
                  <button onClick={decrementQuantity} disabled={quantity <= 1} className="qty-btn" style={{ width: '3rem', height: '3rem' }}>
                    <Minus style={{ width: 16, height: 16 }} />
                  </button>
                  <input type="number" value={quantity} onChange={handleQuantityChange} min="1" max={record.stock} className="qty-input" />
                  <button onClick={incrementQuantity} disabled={quantity >= record.stock} className="qty-btn" style={{ width: '3rem', height: '3rem' }}>
                    <Plus style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              </div>
            )}

            <div className="pd-actions">
              <div className="pd-actions-row">
                <button onClick={handleBuyNow} disabled={record.stock == 0} className="pd-btn-buy">
                  <ShoppingCart style={{ width: 24, height: 24 }} /> ĐẶT HÀNG NGAY
                </button>
                <Link to="/cart" className="pd-btn-goto-cart">TỚI GIỎ HÀNG</Link>
              </div>

              <div className="pd-actions-row">
                <div style={{ flex: 1, display: 'flex', gap: '1rem' }}>
                  <button onClick={handleAddToCart} disabled={record.stock == 0 || added} className="pd-btn-add">
                    {added ? <Check style={{ width: 20, height: 20 }} /> : <ShoppingCart style={{ width: 20, height: 20 }} />}
                    <span className="pd-btn-text">{added ? 'ĐÃ THÊM' : 'THÊM VÀO GIỎ'}</span>
                  </button>
                  <button onClick={handleWishlistToggle} className={`pd-btn-wishlist ${isInWishlist(record.id) ? 'pd-btn-wishlist--active' : ''}`}>
                    <Heart style={{ width: 20, height: 20 }} fill={isInWishlist(record.id) ? '#fff' : 'none'} />
                    <span className="pd-btn-text">{isInWishlist(record.id) ? 'ĐÃ LƯU' : 'YÊU THÍCH'}</span>
                  </button>
                </div>
                <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(record.artist + ' ' + record.title + ' full album')}`} target="_blank" rel="noopener noreferrer" className="pd-btn-youtube">
                  <Youtube style={{ width: 24, height: 24 }} />
                  <span className="pd-btn-text">NGHE THỬ</span>
                </a>
              </div>
            </div>

            {/* Info Table */}
            <div className="pd-info-table">
              <h3 style={{ fontFamily: 'var(--font-heading)' }}>THÔNG TIN SẢN PHẨM</h3>
              <table>
                <tbody>
                  <tr><td>Nhóm sản phẩm</td><td>{productCategory || 'Đang cập nhật'}</td></tr>
                  <tr><td>Thể loại nhạc</td><td>{record.music_genre || 'Không áp dụng'}</td></tr>
                  <tr><td>Định dạng</td><td>{record.format || 'Đang cập nhật'}</td></tr>
                  <tr><td>{conditionLabel}</td><td style={{ fontWeight: 700 }}>{record.condition || 'Đang cập nhật'}</td></tr>
                  <tr><td>Quy cách</td><td>{record.package_info || 'Đang cập nhật'}</td></tr>
                  <tr><td>{productionYearLabel}</td><td>{record.year || 'Đang cập nhật'}</td></tr>
                  <tr><td>Tồn kho</td><td>{record.stock > 0 ? `${record.stock} sản phẩm` : 'Hết hàng'}</td></tr>
                </tbody>
              </table>
            </div>

            {/* Tracklist */}
            <div className="pd-tracklist">
              <h3 style={{ fontFamily: 'var(--font-heading)' }}>TRACKLIST</h3>
              {tracklist.length > 0 ? <ol>{tracklist.map((track: string, index: number) => <li key={`${track}-${index}`}>{track}</li>)}</ol> : <p>Tracklist chính thức của đúng phiên bản này đang được cập nhật.</p>}
            </div>
          </div>
        </div>

        <section className="neo-box neo-box--shadow" style={{ marginTop: '2rem' }}>
          <h2 className="neo-box-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MessageCircle style={{ width: 24, height: 24 }} /> HỎI ĐÁP VỀ SẢN PHẨM</h2>
          <p style={{ color: 'var(--gray-600)', marginBottom: '1rem' }}>Hỏi về tình trạng, phiên bản, cách bảo quản hoặc gửi phản hồi. Admin sẽ trả lời ngay trong luồng này.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
            {comments.length === 0 && <div style={{ padding: '1rem', border: '2px dashed #000', color: 'var(--gray-600)' }}>Chưa có câu hỏi nào. Hãy là người đầu tiên hỏi về sản phẩm.</div>}
            {comments.map((comment) => <div key={comment.id} style={{ border: '2px solid #000', padding: '0.9rem', marginLeft: comment.parent_id ? '2rem' : 0, background: comment.is_staff ? '#fef9c3' : '#fff' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}><span>{comment.author}{comment.is_staff ? ' · VỌC RECORDS' : ''}</span><span>{new Date(comment.created_at).toLocaleDateString('vi-VN')}</span></div><p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{comment.content}</p></div>)}
          </div>
          <form onSubmit={handleCommentSubmit} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
            <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} rows={3} maxLength={2000} className="neo-textarea" placeholder="Bạn muốn biết thêm điều gì về sản phẩm?" style={{ flex: 1 }} />
            <button type="submit" disabled={commentLoading || !commentText.trim()} className="neo-btn neo-btn--primary"><Send style={{ width: 18, height: 18 }} /> {commentLoading ? 'ĐANG GỬI' : 'GỬI HỎI'}</button>
          </form>
        </section>

        {/* Related Products */}
        {relatedRecords.length > 0 && (
          <section className="pd-related">
            <h2 style={{ fontFamily: 'var(--font-heading)' }}>Sản phẩm cùng thể loại ({record.genre})</h2>
            <div className="grid-4-col">
              {relatedRecords.map((r) => (
                <Link key={r.id} to={`/product/${r.id}`} className="product-card">
                  <div className="product-card-image">
                    <SafeImage src={r.image} alt={r.title} />
                  </div>
                  <div className="product-card-body">
                    <h3 className="product-card-name line-clamp-1">{r.title}</h3>
                    <p className="product-card-artist line-clamp-1">{r.artist}</p>
                    <div className="product-card-footer">
                      <span className="product-card-price">{formatPrice(r.price)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Mobile Sticky Action Bar */}
      <div className="mobile-sticky-bar">
        <div>
          <span className="mobile-sticky-price-label">Tổng cộng</span>
          <span className="mobile-sticky-price">{formatPrice(record.price * quantity)}</span>
        </div>
        <button onClick={handleBuyNow} disabled={record.stock == 0} className="neo-btn neo-btn--primary active-neo shadow-neo-sm" style={{ flex: 1, fontSize: '0.875rem' }}>
          ĐẶT HÀNG NGAY
        </button>
      </div>
    </div>
  );
}
