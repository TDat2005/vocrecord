import { useEffect } from 'react';
import { useLocation } from 'react-router';

// Cuộn lên đầu trang mỗi khi đổi đường dẫn (HashRouter không tự làm việc này).
export function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, search]);

  return null;
}
