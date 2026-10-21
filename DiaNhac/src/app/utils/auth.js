import { useEffect, useState } from 'react';

// Phiên đăng nhập lưu ở localStorage: 'token' (JWT) và 'user' (thông tin hiển thị).
// Mọi thay đổi phiên phát sự kiện AUTH_EVENT để header, giỏ yêu thích... cập nhật ngay.
export const AUTH_EVENT = 'voc:auth-change';

export function getToken() {
  return localStorage.getItem('token') || '';
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

export function isStaff(user) {
  return Boolean(user && ['admin', 'nhanvien'].includes(user.role));
}

export function saveSession(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function useCurrentUser() {
  const [user, setUser] = useState(getUser);

  useEffect(() => {
    const sync = () => setUser(getUser());
    window.addEventListener(AUTH_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(AUTH_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return user;
}
