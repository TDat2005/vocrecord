import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../utils/api';

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'name', label: 'Tên, A–Z' },
  { value: 'price-low', label: 'Giá, thấp đến cao' },
  { value: 'price-high', label: 'Giá, cao đến thấp' },
  { value: 'year', label: 'Năm phát hành, mới nhất' },
];

// filters: category, genre, item_type, search, sort, in_stock, exclude (xem GET /api/products ở server).
async function fetchPage(filters, page, limit) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const data = await api.get(`/products?${params}`);
  if (!data.success) throw new Error(data.message || 'Không thể tải sản phẩm');
  const items = data.data || [];
  return { items, total: Number(data.total ?? items.length) };
}

/**
 * Danh sách sản phẩm lọc và phân trang ở server (trước đây tải 100 sản phẩm rồi lọc trên trình duyệt,
 * sản phẩm thứ 101 trở đi không bao giờ hiện ra). loadMore() tải thêm trang tiếp theo.
 * Trang đầu thử lại vài lần vì khi chạy Docker, API có thể khởi động chậm hơn web.
 */
export function useProducts(filters = {}, { pageSize = 24 } = {}) {
  const key = JSON.stringify(filters);
  const keyRef = useRef(key);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    keyRef.current = key;
    let cancelled = false;
    setLoading(true);
    setError('');
    setPage(1);

    (async () => {
      let lastError = 'Không thể tải sản phẩm';
      for (let attempt = 0; attempt < 5 && !cancelled; attempt += 1) {
        try {
          const result = await fetchPage(JSON.parse(key), 1, pageSize);
          if (!cancelled) {
            setProducts(result.items);
            setTotal(result.total);
            setLoading(false);
          }
          return;
        } catch (err) {
          lastError = err.message || lastError;
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      if (!cancelled) {
        setProducts([]);
        setTotal(0);
        setError(lastError);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [key, pageSize]);

  const loadMore = useCallback(async () => {
    const requestKey = key;
    setLoadingMore(true);
    try {
      const result = await fetchPage(JSON.parse(requestKey), page + 1, pageSize);
      if (keyRef.current !== requestKey) return; // bộ lọc đã đổi trong lúc tải
      setProducts((current) => [...current, ...result.items.filter((item) => !current.some((p) => p.id === item.id))]);
      setTotal(result.total);
      setPage(page + 1);
    } catch (err) {
      setError(err.message || 'Không thể tải thêm sản phẩm');
    } finally {
      setLoadingMore(false);
    }
  }, [key, page, pageSize]);

  return { products, total, loading, loadingMore, error, loadMore };
}
