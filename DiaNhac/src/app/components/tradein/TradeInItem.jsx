import { Sparkles } from 'lucide-react';
import { formatPrice } from '../../utils/format';
import { gradeText, percent } from '../../utils/tradein';
import { Badge } from '../ui';
import { SafeImage } from '../SafeImage';

// Một đĩa trong yêu cầu thu mua: ảnh, kết quả AI thẩm định sơ bộ, giá ước tính và (nếu có) báo giá chốt của cửa hàng.
export function TradeInItem({ item, policy, showOffer = false, actions }) {
  const ai = item.ai || {};
  const identified = ai.identified && ai.identified.title ? `${ai.identified.title}${ai.identified.artist ? ` – ${ai.identified.artist}` : ''}` : null;
  const offerReady = showOffer && item.result !== 'cho';

  return (
    <article className="tradein-item">
      <div className="tradein-item__photos">
        {item.photos.map((url, index) => (
          <a key={url} href={url} target="_blank" rel="noopener noreferrer" className={index === 0 ? 'tradein-item__photo tradein-item__photo--main' : 'tradein-item__photo'}>
            <SafeImage src={url} alt={`Ảnh ${index + 1} của ${item.title}`} />
          </a>
        ))}
      </div>

      <div className="tradein-item__body">
        <div className="inline inline--between">
          <div>
            <h3 className="tradein-item__title">{item.title}</h3>
            <p className="text-sm text-muted">
              {[item.artist, item.format === 'cassette' ? 'Cassette' : 'Đĩa than', item.year].filter(Boolean).join(' · ')}
              {item.self_grade && ` · Bạn tự đánh giá ${item.self_grade}`}
            </p>
          </div>
          {actions}
        </div>

        {item.ai_status === 'xong' ? (
          <div className="tradein-ai">
            <p className="tradein-ai__title"><Sparkles size={14} /> AI thẩm định sơ bộ</p>
            {!ai.is_record && <p className="text-critical text-sm">Ảnh không giống đĩa than hay băng cassette, bạn kiểm tra lại giúp nhé.</p>}
            <div className="inline">
              <Badge tone="info">Đĩa {gradeText(policy, item.ai_media_grade)}</Badge>
              <Badge tone="info">Bìa {gradeText(policy, item.ai_sleeve_grade)}</Badge>
              {item.ai_confidence !== null && <span className="text-xs text-muted">Độ tin cậy {percent(item.ai_confidence)}</span>}
            </div>
            {identified && <p className="text-sm">Nhận ra: <strong>{identified}</strong></p>}
            {ai.summary && <p className="text-sm">{ai.summary}</p>}
            {ai.defects.length > 0 && (
              <ul className="tradein-ai__defects">
                {ai.defects.map((defect) => <li key={defect}>{defect}</li>)}
              </ul>
            )}
            {!ai.media_visible && <p className="text-xs text-muted">Chưa thấy rõ mặt đĩa nên điểm đĩa chỉ là ước đoán. Thêm ảnh mặt đĩa để chấm chính xác hơn.</p>}
          </div>
        ) : (
          <p className="text-sm text-muted">
            {item.ai_status === 'loi' ? 'AI tạm thời không thẩm định được, giá dưới đây ước tính theo tình trạng bạn tự đánh giá.' : 'Giá dưới đây ước tính theo tình trạng bạn tự đánh giá.'}
          </p>
        )}

        <p className="text-xs text-muted">
          {item.match_title
            ? <>Đối chiếu với bản mới “{item.match_title}” đang bán giá {formatPrice(item.base_price)}.</>
            : <>Không có bản mới trong cửa hàng, dùng giá tham chiếu {formatPrice(item.base_price)}.</>}
        </p>

        <div className="tradein-prices">
          <div>
            <span className="tradein-prices__label">Ước tính bán đứt</span>
            <span className="tradein-prices__value">{formatPrice(item.suggested_buy_price)}</span>
          </div>
          <div>
            <span className="tradein-prices__label">Ước tính giá ký gửi</span>
            <span className="tradein-prices__value">{formatPrice(item.suggested_list_price)}</span>
          </div>
          {offerReady && item.result === 'nhan' && (
            <div className="tradein-prices__offer">
              <span className="tradein-prices__label">Báo giá của cửa hàng</span>
              <span className="tradein-prices__value">
                {formatPrice(item.buy_price)} <span className="text-xs text-muted">hoặc ký gửi {formatPrice(item.list_price)}</span>
              </span>
              <span className="text-xs text-muted">Tình trạng chốt: đĩa {item.media_grade} · bìa {item.sleeve_grade}</span>
            </div>
          )}
        </div>
        {offerReady && item.result === 'loai' && <p className="text-sm text-critical">Cửa hàng không nhận đĩa này{item.staff_note ? `: ${item.staff_note}` : '.'}</p>}
        {offerReady && item.result === 'nhan' && item.staff_note && <p className="text-sm text-muted">Ghi chú thẩm định: {item.staff_note}</p>}
      </div>
    </article>
  );
}
