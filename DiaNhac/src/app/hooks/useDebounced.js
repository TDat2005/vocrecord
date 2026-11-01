import { useEffect, useState } from 'react';

// Giá trị chỉ cập nhật sau khi người dùng ngừng gõ `delay` ms (dùng cho ô tìm kiếm gọi API).
export function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
