import { api } from '../utils/api';

// Tìm sản phẩm bằng ảnh bìa: ưu tiên chạy CLIP trong trình duyệt rồi chỉ gửi vector (512 số) lên server;
// trình duyệt không chạy được (máy yếu, chặn WebAssembly, không tải được mô hình) thì gửi ảnh đã thu nhỏ để server tự tính.

let worker = null;
let nextId = 0;
const pending = new Map();

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./clip.worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      const job = pending.get(data.id);
      if (!job) return;
      if (data.type === 'progress' || data.type === 'status') {
        job.onProgress?.(data);
        return;
      }
      pending.delete(data.id);
      if (data.type === 'result') job.resolve(data.vector);
      else job.reject(new Error(data.message));
    };
    worker.onerror = (event) => {
      for (const job of pending.values()) job.reject(new Error(event.message || 'Worker lỗi'));
      pending.clear();
      worker = null;
    };
  }
  return worker;
}

// Mạng chập chờn có thể làm việc tải mô hình treo: 45 giây không có tiến triển thì bỏ, chuyển sang server.
const STALL_MS = 45000;

function embedInBrowser(blob, onProgress) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    let timer;
    const stall = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        pending.delete(id);
        worker?.terminate();
        worker = null;
        reject(new Error('Tải mô hình quá lâu'));
      }, STALL_MS);
    };
    const done = (fn) => (value) => {
      clearTimeout(timer);
      fn(value);
    };
    pending.set(id, {
      resolve: done(resolve),
      reject: done(reject),
      onProgress: (event) => {
        stall();
        onProgress?.(event);
      },
    });
    stall();
    getWorker().postMessage({ id, blob });
  });
}

// Thu nhỏ ảnh chụp từ điện thoại (thường vài MB) về cạnh dài 512px: CLIP chỉ cần 224px.
export async function shrinkImage(file, maxSize = 512) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Không đọc được ảnh'))), 'image/jpeg', 0.9);
  });
}

const toDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

// onProgress({ stage: 'download'|'embedding'|'server', loaded?, total? })
export async function searchByImage(file, { onProgress } = {}) {
  const blob = await shrinkImage(file);
  let vector = null;
  let browserError = null;
  if (typeof Worker !== 'undefined' && typeof WebAssembly !== 'undefined') {
    try {
      vector = await embedInBrowser(blob, (event) => {
        if (event.type === 'progress') onProgress?.({ stage: 'download', loaded: event.loaded, total: event.total });
        else onProgress?.({ stage: 'embedding' });
      });
    } catch (error) {
      browserError = error.message;
    }
  }
  if (vector) {
    const data = await api.post('/search/image', { vector });
    return { ...data, ranIn: 'browser' };
  }
  onProgress?.({ stage: 'server' });
  const data = await api.post('/search/image', { image: await toDataUrl(blob) });
  return { ...data, ranIn: 'server', browserError };
}
