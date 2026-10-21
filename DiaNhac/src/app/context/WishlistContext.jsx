import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../utils/api';
import { useCurrentUser } from '../utils/auth';

const WishlistContext = createContext(null);

// Danh sách yêu thích lấy trực tiếp từ server theo tài khoản đang đăng nhập,
// để Cửa hàng, Chi tiết sản phẩm và Tài khoản luôn hiển thị cùng một dữ liệu.
export function WishlistProvider({ children }) {
  const user = useCurrentUser();
  const customerId = user?.customer_id || null;
  const [wishlist, setWishlist] = useState([]);

  const reload = useCallback(async () => {
    if (!customerId) {
      setWishlist([]);
      return;
    }
    try {
      const data = await api.get('/wishlist');
      if (data.success) setWishlist(data.data || []);
    } catch {
      // Giữ danh sách cũ nếu mất kết nối.
    }
  }, [customerId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const isInWishlist = useCallback(
    (id) => wishlist.some((item) => Number(item.id) === Number(id)),
    [wishlist],
  );

  // Trả về { success, message } để trang gọi hiển thị thông báo.
  const toggleWishlist = useCallback(async (product) => {
    if (!customerId) {
      return { success: false, message: 'Vui lòng đăng nhập bằng tài khoản khách hàng để lưu sản phẩm yêu thích.' };
    }
    if (isInWishlist(product.id)) {
      const data = await api.del('/wishlist', { product_id: product.id });
      if (data.success) setWishlist((current) => current.filter((item) => Number(item.id) !== Number(product.id)));
      return { ...data, message: data.success ? 'Đã bỏ khỏi danh sách yêu thích' : data.message };
    }
    const data = await api.post('/wishlist', { product_id: product.id });
    if (data.success) {
      const { id, title, artist, price, image, stock } = product;
      setWishlist((current) => [...current, { id, title, artist, price, image, stock }]);
    }
    return data;
  }, [customerId, isInWishlist]);

  const value = useMemo(
    () => ({ wishlist, isInWishlist, toggleWishlist, reload }),
    [wishlist, isInWishlist, toggleWishlist, reload],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used within WishlistProvider');
  return context;
}
