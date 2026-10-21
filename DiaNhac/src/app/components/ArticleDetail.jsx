import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Clock, Target, Wrench } from 'lucide-react';
import { SafeImage } from './SafeImage';
import { Badge, EmptyState } from './ui';
import { api } from '../utils/api';
import { formatLongDate } from '../utils/format';
import { DIFFICULTY_TONES, getArticleCategory, getArticleSteps } from '../data/articles';
import '../../styles/pages/blog.css';

// Trang đọc bài viết / hướng dẫn: cột chữ hẹp ở giữa cho dễ đọc.
export function ArticleDetail({ type, backTo, backLabel }) {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(`/blogs/${id}`)
      .then((data) => {
        if (!cancelled) setArticle(data.success && data.data?.type === type ? data.data : null);
      })
      .catch(() => { if (!cancelled) setArticle(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, type]);

  if (loading) return <p className="loading-text">Đang tải bài viết...</p>;

  if (!article) {
    return (
      <div className="page">
        <EmptyState title="Không tìm thấy bài viết" action={<Link to={backTo} className="btn btn--primary">{backLabel}</Link>} />
      </div>
    );
  }

  const isGuide = type === 'huongdan';
  const steps = isGuide ? getArticleSteps(article) : [];
  const difficulty = article.difficulty || 'Dễ';

  return (
    <article className="page">
      <div className="container article">
        <Link to={backTo} className="back-link"><ArrowLeft size={16} /> {backLabel}</Link>

        <header className="article__header">
          <div className="inline">
            <span className="article-card__category">{getArticleCategory(article, type)}</span>
            {isGuide && <Badge tone={DIFFICULTY_TONES[difficulty]}>Độ khó: {difficulty}</Badge>}
          </div>
          <h1 className="article__title">{article.title}</h1>
          <p className="text-muted">{formatLongDate(article.created_at)} · {article.author}</p>
        </header>

        <div className="article__image">
          <SafeImage src={article.image} alt={article.title} loading="eager" />
        </div>

        {isGuide && (article.duration || article.audience || article.tools) && (
          <div className="article__facts">
            {article.duration && <div><Clock size={18} /><span><strong>Thời lượng</strong>{article.duration}</span></div>}
            {article.audience && <div><Target size={18} /><span><strong>Đối tượng</strong>{article.audience}</span></div>}
            {article.tools && <div><Wrench size={18} /><span><strong>Dụng cụ</strong>{article.tools}</span></div>}
          </div>
        )}

        <div className="prose">
          {article.summary && <p className="article__summary">{article.summary}</p>}
          {steps.length > 0 && (
            <div className="article__steps">
              <h2>Các bước thực hiện</h2>
              <ol>{steps.map((step, index) => <li key={`${step}-${index}`}>{step}</li>)}</ol>
            </div>
          )}
          <div className="pre-wrap">{article.content}</div>
        </div>
      </div>
    </article>
  );
}
