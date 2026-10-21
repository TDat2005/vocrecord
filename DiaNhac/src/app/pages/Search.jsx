import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Camera, Search as SearchIcon, Sparkles, X } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { EmptyState } from '../components/ui';
import { searchByImage } from '../ai/imageSearch';
import { api, NETWORK_ERROR } from '../utils/api';
import '../../styles/pages/search.css';

const MODES = [
  { id: 'hybrid', label: 'Kết hợp' },
  { id: 'semantic', label: 'Theo nghĩa' },
  { id: 'keyword', label: 'Từ khóa' },
];

const EXAMPLES = [
  'nhạc buồn nghe lúc mưa, dưới 800k',
  'jazz thư giãn quán cà phê',
  'đĩa than vui tươi để nhảy',
  'mâm đĩa cho người mới tầm 5 triệu',
  'cassette dưới 450k',
];

const toMb = (bytes) => (bytes / 1024 / 1024).toFixed(0);
const percent = (value) => `${Math.round(value * 100)}%`;

// Một dòng giải thích vì sao sản phẩm xuất hiện: khớp từ nào, gần nghĩa bao nhiêu.
function MatchReason({ match }) {
  if (!match) return null;
  const parts = [];
  if (match.keyword && match.keyword.terms.length) parts.push(`Khớp: ${match.keyword.terms.slice(0, 4).join(', ')}`);
  if (match.semantic) parts.push(`Gần nghĩa ${percent(match.semantic.similarity)}`);
  if (match.similarity !== undefined && !match.keyword && !match.semantic) parts.push(`Giống ảnh ${percent(match.similarity)}`);
  return parts.length ? <p className="search-result__why">{parts.join(' · ')}</p> : null;
}

function imageStatusText(progress) {
  if (!progress) return 'Đang chuẩn bị...';
  if (progress.stage === 'download') {
    return progress.total
      ? `Đang tải mô hình nhận diện ảnh (chỉ lần đầu): ${toMb(progress.loaded)}/${toMb(progress.total)} MB`
      : 'Đang tải mô hình nhận diện ảnh...';
  }
  if (progress.stage === 'embedding') return 'Đang phân tích ảnh ngay trong trình duyệt của bạn...';
  return 'Đang gửi ảnh lên server để phân tích...';
}

export function Search() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const mode = MODES.some((m) => m.id === params.get('mode')) ? params.get('mode') : 'hybrid';
  const [input, setInput] = useState(q);
  const [result, setResult] = useState({ loading: false, error: '', data: null });
  const [image, setImage] = useState(null); // { preview, loading, progress, data, error, ranIn }
  const fileRef = useRef(null);

  useEffect(() => setInput(q), [q]);

  useEffect(() => {
    if (!q) {
      setResult({ loading: false, error: '', data: null });
      return undefined;
    }
    let cancelled = false;
    setResult((current) => ({ ...current, loading: true, error: '' }));
    api.get(`/search?q=${encodeURIComponent(q)}&mode=${mode}&limit=24`)
      .then((data) => {
        if (cancelled) return;
        setResult(data.success
          ? { loading: false, error: '', data: data.data }
          : { loading: false, error: data.message || 'Không tìm được', data: null });
      })
      .catch(() => !cancelled && setResult({ loading: false, error: NETWORK_ERROR, data: null }));
    return () => { cancelled = true; };
  }, [q, mode]);

  // Thu hồi URL ảnh xem trước khi đổi ảnh hoặc rời trang.
  useEffect(() => () => image?.preview && URL.revokeObjectURL(image.preview), [image?.preview]);

  const submit = (text, nextMode = mode) => {
    const keyword = text.trim();
    if (!keyword) return;
    setImage(null);
    setParams(nextMode === 'hybrid' ? { q: keyword } : { q: keyword, mode: nextMode });
  };

  const handleImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImage({ error: 'Vui lòng chọn một tệp ảnh.' });
      return;
    }
    const preview = URL.createObjectURL(file);
    setImage({ preview, loading: true, progress: null });
    try {
      const data = await searchByImage(file, {
        onProgress: (progress) => setImage((current) => (current?.preview === preview ? { ...current, progress } : current)),
      });
      setImage((current) => (current?.preview !== preview ? current : data.success
        ? { preview, loading: false, data: data.data, ranIn: data.ranIn }
        : { preview, loading: false, error: data.message || 'Không tìm được sản phẩm từ ảnh' }));
    } catch {
      setImage((current) => (current?.preview === preview ? { preview, loading: false, error: NETWORK_ERROR } : current));
    }
  };

  const data = result.data;
  const bestImageMatch = image?.data?.results?.[0];

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Tìm kiếm thông minh</h1>
          <p className="page-subtitle">Gõ như khi hỏi người bán: tâm trạng, dịp nghe, ngân sách. Hoặc chụp ảnh bìa đĩa để tìm.</p>
        </div>

        <form className="smart-search" role="search" onSubmit={(event) => { event.preventDefault(); submit(input); }}>
          <div className="smart-search__box">
            <SearchIcon size={20} className="smart-search__icon" />
            <input
              type="search"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="VD: nhạc buồn nghe lúc mưa, dưới 800k"
              aria-label="Nội dung tìm kiếm"
              maxLength={300}
            />
            <button type="submit" className="btn btn--primary">Tìm</button>
          </div>
          <button type="button" className="btn btn--secondary smart-search__camera" onClick={() => fileRef.current?.click()}>
            <Camera size={18} /> Tìm bằng ảnh bìa
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={handleImage} />
        </form>

        {!q && !image && (
          <div className="chip-group smart-search__examples">
            {EXAMPLES.map((example) => (
              <button key={example} type="button" className="chip" onClick={() => submit(example)}>{example}</button>
            ))}
          </div>
        )}

        {image && (
          <section className="image-search card">
            <div className="image-search__header">
              {image.preview && <img src={image.preview} alt="Ảnh bạn tải lên" className="image-search__preview" />}
              <div className="image-search__summary">
                <h2 className="image-search__title">Tìm bằng ảnh</h2>
                {image.loading && <p className="text-muted text-sm">{imageStatusText(image.progress)}</p>}
                {image.error && <p className="text-critical text-sm">{image.error}</p>}
                {image.data && (
                  <p className="text-muted text-sm">
                    {bestImageMatch && bestImageMatch.match.similarity >= 0.8
                      ? <>Khớp nhất: <strong>{bestImageMatch.title}</strong> ({percent(bestImageMatch.match.similarity)}). </>
                      : 'Không có bìa nào trùng hẳn, đây là các sản phẩm có bìa giống nhất. '}
                    <span className="badge badge--info">
                      <Sparkles size={12} /> {image.ranIn === 'browser' ? 'Mô hình CLIP chạy trong trình duyệt' : 'Mô hình CLIP chạy trên server'}
                    </span>
                  </p>
                )}
              </div>
              <button type="button" className="icon-button" onClick={() => setImage(null)} aria-label="Đóng tìm bằng ảnh">
                <X size={18} />
              </button>
            </div>
            {image.data && image.data.results.length > 0 && (
              <div className="product-grid product-grid--4">
                {image.data.results.map((product) => (
                  <div key={product.id} className="search-result">
                    <ProductCard product={product} quickAdd />
                    <MatchReason match={product.match} />
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {q && (
          <section className="smart-results">
            <div className="smart-results__toolbar">
              <div className="tabs" role="tablist">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    role="tab"
                    aria-selected={mode === m.id}
                    className={`tab ${mode === m.id ? 'tab--active' : ''}`}
                    onClick={() => submit(q, m.id)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              {data && (
                <div className="smart-results__understood">
                  <span className="text-muted text-sm">Đã hiểu:</span>
                  {data.understood.text && <span className="badge badge--neutral">“{data.understood.text}”</span>}
                  {data.understood.chips.map((chip) => <span key={chip.label} className="badge badge--info">{chip.label}</span>)}
                </div>
              )}
            </div>

            {data && data.semantic.error && mode !== 'keyword' && (
              <p className="smart-results__note">Tìm theo nghĩa đang tạm thời không khả dụng, kết quả dưới đây chỉ dựa trên từ khóa.</p>
            )}

            {result.loading && !data ? (
              <p className="loading-text">Đang tìm...</p>
            ) : result.error ? (
              <p className="loading-text">{result.error}</p>
            ) : data && data.results.length === 0 ? (
              <EmptyState title="Chưa tìm thấy sản phẩm phù hợp">
                Thử nới ngân sách, bỏ bớt điều kiện hoặc mô tả theo cách khác.
              </EmptyState>
            ) : data ? (
              <div className={`product-grid product-grid--4 ${result.loading ? 'is-loading' : ''}`}>
                {data.results.map((product) => (
                  <div key={product.id} className="search-result">
                    <ProductCard product={product} quickAdd />
                    <MatchReason match={product.match} />
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        )}
      </div>
    </div>
  );
}
