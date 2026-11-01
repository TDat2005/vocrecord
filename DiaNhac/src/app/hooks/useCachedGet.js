import { useEffect, useState } from 'react';
import { api } from '../utils/api';

// Dữ liệu ít thay đổi lấy từ server một lần cho cả phiên (cấu hình cửa hàng, chính sách thu mua, chuyên mục blog...).
// Nhiều component cùng gọi chỉ tạo một request. Lỗi mạng thì lần sau thử lại.
const cache = new Map(); // path -> Promise<data | null>

function load(path) {
  if (!cache.has(path)) {
    cache.set(path, api.get(path)
      .then((data) => (data.success ? data.data : null))
      .catch(() => null)
      .then((value) => {
        if (!value) cache.delete(path);
        return value;
      }));
  }
  return cache.get(path);
}

export function useCachedGet(path) {
  const [value, setValue] = useState(null);
  useEffect(() => {
    let cancelled = false;
    load(path).then((data) => { if (!cancelled) setValue(data); });
    return () => { cancelled = true; };
  }, [path]);
  return value;
}

// Cấu hình cửa hàng từ server (GET /api/config): phí vận chuyển...
export const useShopConfig = () => useCachedGet('/config');
