import { Link } from 'react-router';
import { Heart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { NETWORK_ERROR } from '../utils/api';
import { formatPrice } from '../utils/format';
import { SafeImage } from './SafeImage';
import { Badge } from './ui';

// Thẻ sản phẩm dùng chung cho trang chủ, cửa hàng, danh mục và sản phẩm liên quan.
export function ProductCard({ product, quickAdd = false, badge }) {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const toast = useToast();
  const soldOut = Number(product.stock) <= 0;
  const saved = isInWishlist(product.id);
  const url = `/product/${product.id}`;
  // Đĩa cũ: hiện mức tình trạng đĩa ("Đĩa VG+ · Bìa VG" -> "Đĩa cũ VG+").
  const usedGrade = product.item_type === 'cu' ? (/Đĩa\s+(\S+)/.exec(product.condition || '') || [])[1] : null;
  const usedBadge = product.item_type === 'cu' ? `Đĩa cũ${usedGrade ? ` ${usedGrade}` : ''}` : null;

  const handleWishlist = async () => {
    try {
      const result = await toggleWishlist(product);
      if (result.success) toast.success(result.message || 'Đã thêm vào danh sách yêu thích');
      else toast.error(result.message);
    } catch {
      toast.error(NETWORK_ERROR);
    }
  };

  const handleQuickAdd = () => {
    addToCart(product);
    toast.success(`Đã thêm "${product.title}" vào giỏ hàng`);
  };

  return (
    <div className="product-card">
      <Link to={url} className="product-card__media">
        <SafeImage src={product.image} alt={product.title} />
        {soldOut ? (
          <span className="product-card__badge"><Badge tone="dark">Hết hàng</Badge></span>
        ) : usedBadge ? (
          <span className="product-card__badge"><Badge tone="warning">{usedBadge}</Badge></span>
        ) : badge ? (
          <span className="product-card__badge"><Badge>{badge}</Badge></span>
        ) : null}
      </Link>
      <button
        type="button"
        onClick={handleWishlist}
        className={`product-card__wishlist ${saved ? 'product-card__wishlist--active' : ''}`}
        aria-label={saved ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
        aria-pressed={saved}
      >
        <Heart size={18} fill={saved ? 'currentColor' : 'none'} />
      </button>
      <div className="product-card__info">
        <Link to={url} className="product-card__title line-clamp-2">{product.title}</Link>
        {product.artist && <p className="product-card__artist line-clamp-1">{product.artist}</p>}
        <p className="product-card__price">{formatPrice(product.price)}</p>
      </div>
      {quickAdd && (
        <button type="button" className="btn btn--secondary btn--sm btn--full" onClick={handleQuickAdd} disabled={soldOut}>
          {soldOut ? 'Hết hàng' : 'Thêm vào giỏ'}
        </button>
      )}
    </div>
  );
}
