import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Clock } from 'lucide-react';
import { SafeImage } from './SafeImage';
import { Badge, EmptyState } from './ui';
import { api } from '../utils/api';
import { formatLongDate } from '../utils/format';
import { DIFFICULTY_TONES, getArticleCategory, getArticleExcerpt } from '../data/articles';
import '../../styles/pages/blog.css';

// Danh sách bài viết cho trang Blog và Hướng dẫn (giống trang blog của Dawn).
export function ArticleList({ type, title, description, baseCategories, detailPath }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('Tất cả');

  useEffect(() => {
    let cancelled = false;
    api.get(`/blogs?type=${type}&status=daxuatban&limit=50`)
      .then((data) => {
        if (cancelled) return;
        if (data.success) setArticles(data.data || []);
        else setError(data.message || 'Không thể tải bài viết');
      })
      .catch(() => { if (!cancelled) setError('Không thể tải bài viết'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [type]);

  const categories = useMemo(
    () => Array.from(new Set([...baseCategories, ...articles.map((article) => getArticleCategory(article, type))])),
    [articles, baseCategories, type],
  );
  const visible = articles.filter((article) => category === 'Tất cả' || getArticleCategory(article, type) === category);

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{description}</p>
        </div>

        <div className="chip-group article-filters">
          {categories.map((item) => (
            <button key={item} type="button" onClick={() => setCategory(item)} className={`chip ${category === item ? 'chip--active' : ''}`}>
              {item}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="loading-text">Đang tải bài viết...</p>
        ) : error ? (
          <p className="loading-text">{error}</p>
        ) : visible.length === 0 ? (
          <EmptyState title="Chưa có bài viết nào trong mục này" />
        ) : (
          <div className="article-grid">
            {visible.map((article) => (
              <Link key={article.id} to={`${detailPath}/${article.id}`} className="article-card">
                <div className="article-card__image">
                  <SafeImage src={article.image} alt={article.title} />
                </div>
                <div className="article-card__body">
                  <div className="inline">
                    <span className="article-card__category">{getArticleCategory(article, type)}</span>
                    {type === 'huongdan' && (
                      <Badge tone={DIFFICULTY_TONES[article.difficulty || 'Dễ']}>{article.difficulty || 'Dễ'}</Badge>
                    )}
                  </div>
                  <h2 className="article-card__title line-clamp-2">{article.title}</h2>
                  <p className="article-card__excerpt line-clamp-3">{getArticleExcerpt(article.content, article.summary || '')}</p>
                  <p className="article-card__meta">
                    {type === 'huongdan' && article.duration
                      ? <><Clock size={14} /> {article.duration}</>
                      : <>{formatLongDate(article.created_at)} · {article.author}</>}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
