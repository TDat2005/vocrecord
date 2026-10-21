// Bài viết (blog) và hướng dẫn dùng chung bảng BaiViet; type = 'blog' | 'huongdan'.

export const BLOG_CATEGORIES = [
  'Tất cả',
  'Kiến thức Vinyl',
  'Review Album',
  'Nghệ sĩ & Câu chuyện',
  'Văn hóa Analog',
];

export const GUIDE_CATEGORIES = [
  'Tất cả',
  'Hướng dẫn cơ bản',
  'Bảo trì thiết bị',
  'Kỹ thuật nâng cao',
];

export function getArticleCategory(article, type) {
  return article.category || (type === 'huongdan' ? 'Hướng dẫn cơ bản' : 'Kiến thức Vinyl');
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
