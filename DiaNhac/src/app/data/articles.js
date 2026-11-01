import { useCachedGet } from '../hooks/useCachedGet';

// Bài viết (blog) và hướng dẫn dùng chung bảng BaiViet; type = 'blog' | 'huongdan'.

// Chuyên mục và độ khó do server quy định (GET /api/blogs/meta), không viết lại danh sách ở đây.
export const useBlogMeta = () => useCachedGet('/blogs/meta');

// Bài cũ (trước migration 05) chưa có chuyên mục.
export function getArticleCategory(article) {
  return article.category || 'Khác';
}

export function getArticleExcerpt(content = '', summary = '') {
  const source = String(summary || content || '');
  const plainText = source.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return plainText.length > 180 ? `${plainText.slice(0, 177)}...` : plainText;
}

export function getArticleSteps(article) {
  if (Array.isArray(article.steps)) return article.steps.filter(Boolean);
  const raw = String(article.steps || '').trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map((step) => String(step).trim()).filter(Boolean);
  } catch {
    // Dữ liệu cũ có thể lưu mỗi bước một dòng.
  }
  return raw.split(/\r?\n/).map((step) => step.trim()).filter(Boolean);
}

export const DIFFICULTY_TONES = { 'Dễ': 'success', 'Trung bình': 'attention', 'Nâng cao': 'critical' };
