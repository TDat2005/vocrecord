import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import { API_BASE } from '../config/api';
import { type Article, getArticleCategory } from '../data/articles';
import { SafeImage } from '../components/SafeImage';

export function BlogDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPost(null);
    setError('');

    fetch(`${API_BASE}/blogs/${id}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success || !result.data || result.data.type !== 'blog') {
          throw new Error('Không tìm thấy bài viết');
        }
        return result.data;
      })
      .then((data) => {
        if (!cancelled) setPost(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Không thể tải bài viết');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return <div className="page page--gray page-centered" style={{ fontWeight: 700, fontSize: '1.25rem', textTransform: 'uppercase' }}>Đang tải bài viết...</div>;
  }

  if (!post || error) {
    return (
      <div className="page page--white page-centered">
        <div className="neo-box" style={{ textAlign: 'center', maxWidth: '28rem', padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', textTransform: 'uppercase' }}>{error || 'Không tìm thấy bài viết'}</h2>
          <Link to="/blog" className="neo-btn neo-btn--primary">Quay lại Blog</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page page--gray" style={{ paddingBottom: '4rem' }}>
      <div className="container" style={{ padding: '2rem 1rem', maxWidth: '56rem' }}>
        <button onClick={() => navigate(-1)} className="neo-btn neo-btn--secondary neo-btn--sm" style={{ marginBottom: '1.5rem', width: 'max-content' }}>
          <ArrowLeft style={{ width: 20, height: 20 }} /> QUAY LẠI
        </button>

        <article className="neo-box" style={{ padding: 0 }}>
          <div className="article-detail-hero article-detail-hero--standard" style={{ borderBottom: '2px solid #000' }}>
            <SafeImage src={post.image} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'multiply' }} />
            <div className="article-detail-badge badge--medium" style={{ background: 'var(--color-warning)', position: 'absolute', top: '1rem', left: '1rem' }}>{getArticleCategory(post, 'blog')}</div>
          </div>

          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '2px solid #000' }}>
              <div className="article-card-meta-item"><Calendar style={{ width: 20, height: 20 }} />{formatDate(post.created_at)}</div>
              <div className="article-card-meta-item" style={{ borderLeft: '2px solid #000', paddingLeft: '1rem' }}><User style={{ width: 20, height: 20 }} />Tác giả: {post.author}</div>
            </div>

            <h1 style={{ fontSize: '2.25rem', fontWeight: 700, marginBottom: '2rem', textTransform: 'uppercase', lineHeight: 1.2, fontFamily: 'var(--font-heading)' }}>{post.title}</h1>

            <div className="prose">
              {post.summary && <p style={{ fontSize: '1.25rem', fontWeight: 700, background: '#fef9c3', padding: '1rem', borderLeft: '4px solid #000', marginBottom: '1.5rem' }}>{post.summary}</p>}
              <div style={{ whiteSpace: 'pre-wrap' }}>{post.content}</div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
