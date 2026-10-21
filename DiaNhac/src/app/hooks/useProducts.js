import { useEffect, useState } from 'react';
import { api } from '../utils/api';

// Tải danh sách sản phẩm. Thử lại vài lần vì khi chạy Docker, API có thể khởi động chậm hơn web.
export function useProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      let lastError = 'Không thể tải sản phẩm';
      for (let attempt = 0; attempt < 5 && !cancelled; attempt += 1) {
        try {
          const data = await api.get('/products');
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            if (!cancelled) {
              setProducts(data.data);
              setError('');
            }
            return;
          }
          lastError = data.message || 'Chưa có dữ liệu sản phẩm';
        } catch (err) {
          lastError = err.message || lastError;
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      if (!cancelled) setError(lastError);
    };

    load().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return { products, loading, error };
}

export const SORT_OPTIONS = [
  { value: 'name', label: 'Tên, A–Z' },
  { value: 'price-low', label: 'Giá, thấp đến cao' },
  { value: 'price-high', label: 'Giá, cao đến thấp' },
  { value: 'year', label: 'Năm phát hành, mới nhất' },
];

export function sortProducts(products, sortBy) {
  return [...products].sort((a, b) => {
    switch (sortBy) {
      case 'price-low': return Number(a.price) - Number(b.price);
      case 'price-high': return Number(b.price) - Number(a.price);
      case 'year': return (Number(b.year) || 0) - (Number(a.year) || 0);
      default: return String(a.title).localeCompare(String(b.title), 'vi');
    }
  });
}
