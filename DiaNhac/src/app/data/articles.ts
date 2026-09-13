export type ArticleType = 'blog' | 'huongdan';

export interface Article {
  id: number;
  title: string;
  content: string;
  type: ArticleType;
  image: string;
  created_at: string;
  updated_at?: string;
  status: string;
  author: string;
  category?: string | null;
  difficulty?: 'Dễ' | 'Trung bình' | 'Nâng cao' | null;
  summary?: string | null;
  duration?: string | null;
  audience?: string | null;
  tools?: string | null;
  steps?: string[] | string | null;
}

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

export function getArticleCategory(article: Article, type: ArticleType) {
  return article.category || (type === 'huongdan' ? 'Hướng dẫn cơ bản' : 'Kiến thức Vinyl');
}

export function getArticleExcerpt(content = '', summary = '') {
  const source = String(summary || content || '');
  const plainText = source.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return plainText.length > 180 ? `${plainText.slice(0, 177)}...` : plainText;
}

export function getArticleSteps(article: Article) {
  if (Array.isArray(article.steps)) return article.steps.filter(Boolean);
  const raw = String(article.steps || '').trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map((step) => String(step).trim()).filter(Boolean);
  } catch {
    // Legacy rows may still contain one step per line.
  }
  return raw.split(/\r?\n/).map((step) => step.trim()).filter(Boolean);
}
