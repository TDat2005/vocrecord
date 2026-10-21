import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../utils/api';

const CartContext = createContext(null);
const CART_KEY = 'voc_cart';

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

// Chuẩn hóa dữ liệu sản phẩm: giá từ MySQL là chuỗi DECIMAL nên phải ép sang số.
function toCartItem(product, quantity) {
  const stock = Math.max(Number(product.stock) || 0, 0);
  return {
    id: Number(product.id),
    title: product.title,
    artist: product.artist,
    price: Number(product.price) || 0,
    image: product.image,
    stock,
    quantity: Math.min(Math.max(quantity, 1), stock),
  };
}

export function CartProvider({ children }) {
  // Giỏ hàng lưu ở localStorage để không mất khi tải lại trang.
  const [items, setItems] = useState(loadCart);
  const [appliedDiscount, setAppliedDiscount] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {
      // Trình duyệt chặn lưu trữ: giỏ hàng vẫn dùng được trong phiên hiện tại.
    }
  }, [items]);

  const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
  const count = items.reduce((total, item) => total + item.quantity, 0);

  // Số tiền giảm phụ thuộc tạm tính (giảm %, đơn tối thiểu), nên khi giỏ thay đổi phải hỏi lại server.
  // Nếu không, số tiền hiển thị sẽ lệch với số server tính lúc tạo đơn.
  useEffect(() => {
    if (!appliedDiscount || appliedDiscount.subtotal === subtotal) return undefined;
    if (subtotal <= 0) {
      setAppliedDiscount(null);
      return undefined;
    }
    let cancelled = false;
    api.post('/discounts/check', { code: appliedDiscount.code, cartTotal: subtotal })
      .then((data) => {
        if (cancelled) return;
        setAppliedDiscount(data.success
          ? { code: data.data.code, amount: Number(data.data.discountAmount) || 0, subtotal }
          : null);
      })
      .catch(() => {
        if (!cancelled) setAppliedDiscount(null);
      });
    return () => { cancelled = true; };
  }, [subtotal, appliedDiscount]);

  const addToCart = useCallback((product, quantity = 1) => {
    if ((Number(product.stock) || 0) <= 0) return;
    setItems((current) => {
      const existing = current.find((item) => item.id === Number(product.id));
      if (!existing) return [...current, toCartItem(product, quantity)];
      return current.map((item) => (item.id === existing.id
        ? toCartItem(product, existing.quantity + quantity)
        : item));
    });
  }, []);

  const removeFromCart = useCallback((id) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const updateQuantity = useCallback((id, quantity) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setItems((current) => current.map((item) => (
      item.id === id ? { ...item, quantity: Math.min(quantity, item.stock) } : item
    )));
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setItems([]);
    setAppliedDiscount(null);
  }, []);

  const applyDiscount = useCallback(async (code) => {
    const data = await api.post('/discounts/check', { code, cartTotal: subtotal });
    if (data.success) {
      setAppliedDiscount({ code: data.data.code, amount: Number(data.data.discountAmount) || 0, subtotal });
    }
    return data;
  }, [subtotal]);

  const removeDiscount = useCallback(() => setAppliedDiscount(null), []);

  // Giỏ lưu lâu ngày có thể lệch giá/tồn kho: tải lại thông tin từng sản phẩm trước khi thanh toán.
  const refreshCart = useCallback(async () => {
    const snapshot = loadCart();
    if (snapshot.length === 0) return;
    const latest = await Promise.all(snapshot.map((item) => (
      api.get(`/products/${item.id}`).then((data) => (data.success ? data.data : null)).catch(() => undefined)
    )));
    setItems((current) => current.flatMap((item) => {
      const index = snapshot.findIndex((saved) => saved.id === item.id);
      const product = index >= 0 ? latest[index] : undefined;
      if (product === undefined) return [item];
      if (!product || product.status === 'ngungkinhdoanh' || Number(product.stock) <= 0) return [];
      return [toCartItem(product, item.quantity)];
    }));
  }, []);

  const value = useMemo(() => ({
    items,
    subtotal,
    count,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    refreshCart,
    appliedDiscount,
    applyDiscount,
    removeDiscount,
  }), [items, subtotal, count, addToCart, removeFromCart, updateQuantity, clearCart, refreshCart, appliedDiscount, applyDiscount, removeDiscount]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}
