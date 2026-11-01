// Danh mục sản phẩm (trùng tên bảng DanhMuc) và thể loại nhạc dùng cho bộ lọc & form quản trị.
export const PRODUCT_CATEGORIES = ['Đĩa Than (Vinyl)', 'Cassette', 'Máy Quay Đĩa (Turntable)', 'Phụ Kiện'];

export const MUSIC_GENRES = [
  'ROCK', 'CLASSIC ROCK', 'PROGRESSIVE ROCK', 'SOFT ROCK', 'ALTERNATIVE ROCK', 'GRUNGE',
  'ALTERNATIVE', 'ELECTRONIC', 'TRIP HOP', 'ALTERNATIVE HIP HOP', 'AMBIENT', 'POP', 'PSYCHEDELIC POP', 'SYNTH-POP',
  'R&B', 'SOUL', 'JAZZ', 'SMOOTH JAZZ', 'VOCAL JAZZ', 'JAPANESE JAZZ', 'BLUES', 'FUNK / SOUL', 'DISCO',
  'HIP HOP', 'REGGAE', 'LATIN', 'BOSSA NOVA', 'FOLK', 'INDIE FOLK', 'COUNTRY', 'WORLD', 'CLASSICAL',
  'STAGE & SCREEN', 'CITY POP', 'VIỆT NAM', 'CHRISTMAS',
];

// Server nhận tối đa 99 sản phẩm mỗi loại trong một đơn (server/src/routes/order.routes.js).
// Phí vận chuyển không viết ở đây: đọc từ server qua useShopConfig() (hooks/useCachedGet.js).
export const MAX_ORDER_QUANTITY = 99;

// Câu thông báo sau khi thêm vào giỏ, theo số lượng thực sự thêm được (CartContext.addToCart trả về).
// Trả về { ok, message }: ok = false khi không thêm được cái nào.
export function addToCartMessage(product, requested, added) {
  if (!added) return { ok: false, message: `Giỏ hàng đã có số lượng tối đa của "${product.title}"` };
  if (added < requested) return { ok: true, message: `Chỉ thêm được ${added} × "${product.title}" (đã đạt số lượng tối đa)` };
  return { ok: true, message: `Đã thêm ${added > 1 ? `${added} × ` : ''}"${product.title}" vào giỏ hàng` };
}
