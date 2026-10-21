import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';

const ToastContext = createContext(null);

// Thông báo nhỏ ở cuối màn hình (giống Toast của Shopify Admin), thay cho alert().
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback((message, { error = false, duration = 3500 } = {}) => {
    if (!message) return;
    const id = nextId.current++;
    setToasts((current) => [...current.slice(-2), { id, message, error }]);
    window.setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  const api = useMemo(() => ({
    show,
    success: (message) => show(message, { duration: String(message || '').length > 80 ? 7000 : 3500 }),
    error: (message) => show(message, { error: true, duration: 5000 }),
  }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.error ? 'toast--error' : ''}`}>
            <span>{toast.message}</span>
            <button type="button" onClick={() => dismiss(toast.id)} aria-label="Đóng thông báo">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
