import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { BookOpen, Clock, Wrench } from 'lucide-react';
import { API_BASE } from '../config/api';
import { GUIDE_CATEGORIES, type Article, getArticleCategory, getArticleExcerpt } from '../data/articles';
import { SafeImage } from '../components/SafeImage';

export function Guides() {
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [guides, setGuides] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/blogs?type=huongdan&status=daxuatban&limit=50`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'Không thể tải hướng dẫn');
        return result.data || [];
      })
      .then((data) => {
        if (!cancelled) setGuides(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Không thể tải hướng dẫn');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const guideCategories = useMemo(() => {
    const categoriesFromData = guides.map((guide) => getArticleCategory(guide, 'huongdan'));
    return Array.from(new Set([...GUIDE_CATEGORIES, ...categoriesFromData]));
  }, [guides]);

  const filteredGuides = guides.filter((guide) => {
    return selectedCategory === 'Tất cả' || getArticleCategory(guide, 'huongdan') === selectedCategory;
  });

  const getDifficultyClass = (difficulty: Article['difficulty']) => {
    const map: Record<string, string> = { 'Dễ': 'badge--easy', 'Trung bình': 'badge--medium', 'Nâng cao': 'badge--hard' };
    return map[difficulty] || 'badge--medium';
  };

  return (
    <div className="page page--gray" style={{ padding: '2rem 0' }}>
      <div className="container">
        <div className="page-header">
          <h1 className="page-title" style={{ fontFamily: 'var(--font-heading)' }}>HƯỚNG DẪN</h1>
          <p className="page-subtitle">Quy trình từng bước để chọn, lắp đặt, vệ sinh và sử dụng bộ dàn vinyl an toàn.</p>
        </div>

        <div className="category-filters">
          {guideCategories.map((category) => (
            <button key={category} onClick={() => setSelectedCategory(category)} className={`category-filter-btn ${selectedCategory === category ? 'category-filter-btn--active' : ''}`}>
              {category}
            </button>
          ))}
        </div>

        <div className="grid-3-col">
          {loading && <div className="empty-state"><p className="page-subtitle">ĐANG TẢI HƯỚNG DẪN...</p></div>}
          {!loading && error && <div className="empty-state"><p className="page-subtitle">{error}</p></div>}
          {!loading && !error && filteredGuides.map((guide) => (
            <Link key={guide.id} to={`/guide/${guide.id}`} className="article-card">
              <div className="article-card-image">
                <SafeImage src={guide.image} alt={guide.title} />
                <div className={`article-detail-badge ${getDifficultyClass(guide.difficulty)}`} style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}>
                  {guide.difficulty || 'Dễ'}
                </div>
                <div className="article-detail-badge badge--dark" style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}>
                  {getArticleCategory(guide, 'huongdan')}
                </div>
              </div>
              <div className="article-card-body">
                <h2 className="article-card-title line-clamp-2">{guide.title}</h2>
                <p className="article-card-desc line-clamp-3">{getArticleExcerpt(guide.content, guide.summary || '')}</p>
                <div className="article-card-meta">
                  <div className="article-card-meta-item"><BookOpen style={{ width: 20, height: 20 }} />Xem quy trình</div>
                  {guide.duration && <div className="article-card-meta-item"><Clock style={{ width: 16, height: 16 }} />{guide.duration}</div>}
                </div>
                {guide.tools && <div className="article-card-meta-item" style={{ marginTop: '0.75rem', fontSize: '0.75rem' }}><Wrench style={{ width: 16, height: 16 }} />{guide.tools}</div>}
              </div>
            </Link>
          ))}
        </div>

        {!loading && !error && filteredGuides.length === 0 && (
          <div className="empty-state" style={{ marginTop: '2rem' }}>
            <p className="page-subtitle">KHÔNG TÌM THẤY HƯỚNG DẪN NÀO.</p>
          </div>
        )}
      </div>
    </div>
  );
}
