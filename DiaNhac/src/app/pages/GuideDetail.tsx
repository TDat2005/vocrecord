import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { ArrowLeft, Clock, Info, Target, Wrench } from 'lucide-react';
import { API_BASE } from '../config/api';
import { type Article, getArticleCategory, getArticleSteps } from '../data/articles';
import { SafeImage } from '../components/SafeImage';

export function GuideDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [guide, setGuide] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setGuide(null);
    setError('');

    fetch(`${API_BASE}/blogs/${id}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success || !result.data || result.data.type !== 'huongdan') {
          throw new Error('Không tìm thấy hướng dẫn');
        }
        return result.data;
      })
      .then((data) => {
        if (!cancelled) setGuide(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Không thể tải hướng dẫn');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [id]);

  const getDifficultyClass = (difficulty: Article['difficulty']) => {
    const map: Record<string, string> = { 'Dễ': 'badge--easy', 'Trung bình': 'badge--medium', 'Nâng cao': 'badge--hard' };
    return map[difficulty || 'Dễ'] || 'badge--medium';
  };

  if (loading) {
    return <div className="page page--gray page-centered" style={{ fontWeight: 700, fontSize: '1.25rem', textTransform: 'uppercase' }}>Đang tải hướng dẫn...</div>;
  }

  if (!guide || error) {
    return (
      <div className="page page--white page-centered">
        <div className="neo-box" style={{ textAlign: 'center', maxWidth: '28rem', padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', textTransform: 'uppercase' }}>{error || 'Không tìm thấy hướng dẫn'}</h2>
          <Link to="/guides" className="neo-btn neo-btn--primary">Quay lại Cẩm Nang</Link>
        </div>
      </div>
    );
  }

  const difficulty = guide.difficulty || 'Dễ';

  return (
    <div className="page page--gray" style={{ paddingBottom: '4rem' }}>
      <div className="container" style={{ padding: '2rem 1rem', maxWidth: '56rem' }}>
        <button onClick={() => navigate(-1)} className="neo-btn neo-btn--secondary neo-btn--sm" style={{ marginBottom: '1.5rem', width: 'max-content' }}>
          <ArrowLeft style={{ width: 20, height: 20 }} /> QUAY LẠI
        </button>

        <article className="neo-box" style={{ padding: 0 }}>
          <div className="article-detail-hero article-detail-hero--standard" style={{ borderBottom: '2px solid #000' }}>
            <SafeImage src={guide.image} alt={guide.title} style={{ width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'multiply' }} />
            <div className={`article-detail-badge ${getDifficultyClass(difficulty)}`} style={{ position: 'absolute', top: '1rem', right: '1rem' }}>ĐỘ KHÓ: {difficulty}</div>
            <div className="article-detail-badge badge--dark" style={{ position: 'absolute', top: '1rem', left: '1rem' }}>{getArticleCategory(guide, 'huongdan')}</div>
          </div>

          <div style={{ padding: '1.5rem' }}>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 700, marginBottom: '2rem', textTransform: 'uppercase', lineHeight: 1.2, fontFamily: 'var(--font-heading)' }}>{guide.title}</h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {guide.duration && <div className="neo-box" style={{ padding: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}><Clock style={{ width: 20, height: 20 }} /><strong>Thời lượng:</strong> {guide.duration}</div>}
              {guide.audience && <div className="neo-box" style={{ padding: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}><Target style={{ width: 20, height: 20 }} /><strong>Đối tượng:</strong> {guide.audience}</div>}
              {guide.tools && <div className="neo-box" style={{ padding: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}><Wrench style={{ width: 20, height: 20 }} /><strong>Dụng cụ:</strong> {guide.tools}</div>}
            </div>

            <div className="prose">
              {guide.summary && <p style={{ fontSize: '1.25rem', fontWeight: 700, background: 'var(--gray-100)', padding: '1.5rem', border: '2px solid #000', display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <Info style={{ width: 32, height: 32, flexShrink: 0, marginTop: '0.25rem' }} />
                {guide.summary}
              </p>}
              {getArticleSteps(guide).length > 0 && <div style={{ border: '2px solid #000', padding: '1.25rem', marginBottom: '1.5rem', background: '#fff' }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Các bước thực hiện</h2>
                <ol style={{ paddingLeft: '1.5rem', margin: 0 }}>{getArticleSteps(guide).map((step, index) => <li key={`${step}-${index}`} style={{ marginBottom: '0.5rem' }}>{step}</li>)}</ol>
              </div>}
              <div style={{ whiteSpace: 'pre-wrap' }}>{guide.content}</div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
