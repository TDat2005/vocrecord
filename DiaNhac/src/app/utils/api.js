import { API_BASE } from '../config/api';
import { clearSession, getToken } from './auth';

// Gọi API JSON dùng chung: tự gắn token và Content-Type, luôn trả về object { success, ... }.
// Chỉ lỗi mạng mới ném Error để nơi gọi hiển thị "không kết nối được máy chủ".
export async function apiRequest(path, { method = 'GET', body } = {}) {
  const token = getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let data;
  try {
    data = await response.json();
  } catch {
    data = { success: false, message: `Máy chủ trả về lỗi ${response.status}` };
  }

  // Token hết hạn hoặc không hợp lệ: đăng xuất để giao diện không hiển thị trạng thái sai.
  if (response.status === 401 && token) clearSession();
  if (!response.ok && data.success === undefined) data.success = false;
  return data;
}

export const api = {
  get: (path) => apiRequest(path),
  post: (path, body = {}) => apiRequest(path, { method: 'POST', body }),
  put: (path, body = {}) => apiRequest(path, { method: 'PUT', body }),
  del: (path, body) => apiRequest(path, { method: 'DELETE', body }),
};

export const NETWORK_ERROR = 'Không thể kết nối tới máy chủ. Vui lòng thử lại.';
