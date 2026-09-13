import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Calendar, User } from 'lucide-react';
import { API_BASE } from '../config/api';
import { BLOG_CATEGORIES, type Article, getArticleCategory, getArticleExcerpt } from '../data/articles';
import { SafeImage } from '../components/SafeImage';

export function Blog() {
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [posts, setPosts] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/blogs?type=blog&status=daxuatban&limit=50`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'Không thể tải bài viết');
        return result.data || [];
      })
      .then((data) => {
        if (!cancelled) setPosts(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Không thể tải bài viết');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const categories = useMemo(() => {
    const categoriesFromData = posts.map((post) => getArticleCategory(post, 'blog'));
    return Array.from(new Set([...BLOG_CATEGORIES, ...categoriesFromData]));
  }, [posts]);

  const filteredPosts = posts.filter((post) => {
    return selectedCategory === 'Tất cả' || getArticleCategory(post, 'blog') === selectedCategory;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="page page--gray" style={{ padding: '2rem 0' }}>
      <div className="container">
        <div className="page-header">
          <h1 className="page-title" style={{ fontFamily: 'var(--font-heading)' }}>BLOG VỌC RECORDS</h1>
          <p className="page-subtitle">Kiến thức, review và câu chuyện giúp bạn nghe, chọn và sưu tầm nhạc analog có chủ đích.</p>
        </div>

        <div className="category-filters">
          {categories.map((category) => (
            <button key={category} onClick={() => setSelectedCategory(category)} className={`category-filter-btn ${selectedCategory === category ? 'category-filter-btn--active' : ''}`}>
              {category}
            </button>
          ))}
        </div>

        <div className="grid-3-col">
          {loading && <div className="empty-state"><p className="page-subtitle">ĐANG TẢI BÀI VIẾT...</p></div>}
          {!loading && error && <div className="empty-state"><p className="page-subtitle">{error}</p></div>}
          {!loading && !error && filteredPosts.map((post) => (
            <Link key={post.id} to={`/blog/${post.id}`} className="article-card">
              <div className="article-card-image">
                <SafeImage src={post.image} alt={post.title} />
                <div className="article-card-category">{getArticleCategory(post, 'blog')}</div>
              </div>
              <div className="article-card-body">
                <h2 className="article-card-title line-clamp-2">{post.title}</h2>
                <p className="article-card-desc line-clamp-3">{getArticleExcerpt(post.content, post.summary || '')}</p>
                <div className="article-card-meta">
                  <div className="article-card-meta-item"><Calendar style={{ width: 16, height: 16 }} />{formatDate(post.created_at)}</div>
                  <div className="article-card-meta-item"><User style={{ width: 16, height: 16 }} />{post.author}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {!loading && !error && filteredPosts.length === 0 && (
          <div className="empty-state" style={{ marginTop: '2rem' }}>
            <p className="page-subtitle">KHÔNG CÓ BÀI VIẾT NÀO TRONG MỤC NÀY.</p>
          </div>
        )}
      </div>
    </div>
  );
}
