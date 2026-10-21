// Danh mục sản phẩm (trùng tên bảng DanhMuc) và thể loại nhạc dùng cho bộ lọc & form quản trị.
export const PRODUCT_CATEGORIES = ['Đĩa Than (Vinyl)', 'Cassette', 'Máy Quay Đĩa (Turntable)', 'Phụ Kiện'];

export const MUSIC_GENRES = [
  'ROCK', 'CLASSIC ROCK', 'PROGRESSIVE ROCK', 'SOFT ROCK', 'ALTERNATIVE ROCK', 'GRUNGE',
  'ALTERNATIVE', 'ELECTRONIC', 'TRIP HOP', 'ALTERNATIVE HIP HOP', 'AMBIENT', 'POP', 'PSYCHEDELIC POP', 'SYNTH-POP',
  'R&B', 'SOUL', 'JAZZ', 'SMOOTH JAZZ', 'VOCAL JAZZ', 'JAPANESE JAZZ', 'BLUES', 'FUNK / SOUL', 'DISCO',
  'HIP HOP', 'REGGAE', 'LATIN', 'BOSSA NOVA', 'FOLK', 'INDIE FOLK', 'COUNTRY', 'WORLD', 'CLASSICAL',
  'STAGE & SCREEN', 'CITY POP', 'VIỆT NAM', 'CHRISTMAS',
];

// Phí vận chuyển đồng giá, phải khớp với shippingFee trong server/src/routes/order.routes.js.
export const SHIPPING_FEE = 30000;
