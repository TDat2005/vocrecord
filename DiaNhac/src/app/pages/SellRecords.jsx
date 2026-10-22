import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Camera, Disc3, Handshake, ImagePlus, Sparkles, Store, Trash2, Wallet, X } from 'lucide-react';
import { Steps } from '../components/AuthLayout';
import { TradeInItem } from '../components/tradein/TradeInItem';
import { EmptyState } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { api, NETWORK_ERROR } from '../utils/api';
import { useCurrentUser } from '../utils/auth';
import { formatPrice } from '../utils/format';
import { photoToDataUrl, percent, usePolicy } from '../utils/tradein';
import '../../styles/pages/tradein.css';

const EMPTY_FORM = { title: '', artist: '', format: 'vinyl', self_grade: '' };

function PolicyIntro({ policy }) {
  return (
    <div className="tradein-options">
      <section className="card tradein-option">
        <Wallet size={22} />
        <h2 className="card__title">Bán đứt</h2>
        <p className="text-sm text-muted">
          Cửa hàng mua lại đĩa, trả ngay sau khi bạn đồng ý báo giá. Nhận vào ví tín dụng Vọc Records
          {policy ? ` được cộng thêm ${percent(policy.creditBonus)}` : ''}, dùng để mua đĩa khác.
        </p>
      </section>
      <section className="card tradein-option">
        <Handshake size={22} />
        <h2 className="card__title">Ký gửi</h2>
        <p className="text-sm text-muted">
          Cửa hàng bán hộ với giá cao hơn{policy ? ` trong ${policy.consignmentDays} ngày` : ''}. Bán được, bạn nhận
          {policy ? ` ${percent(1 - policy.commissionRate)} giá bán` : ' phần lớn giá bán'}; chưa bán thì rút lại đĩa bất cứ lúc nào.
        </p>
      </section>
    </div>
  );
}

function GradingGuide({ policy }) {
  if (!policy) return null;
  return (
    <section className="card" id="grading">
      <div className="card__header">
        <div>
          <h2 className="card__title">Thang chấm tình trạng Goldmine</h2>
          <p className="text-sm text-muted">Chấm riêng đĩa và bìa. Giá đĩa cũ = giá bản mới × hệ số (đĩa {percent(policy.mediaWeight)}, bìa {percent(policy.sleeveWeight)}).</p>
        </div>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Mức</th><th>Mô tả</th><th className="is-numeric">Giá trị còn lại</th></tr></thead>
          <tbody>
            {policy.grades.map((grade) => (
              <tr key={grade.code}>
                <td className="nowrap"><strong>{grade.code}</strong> <span className="text-muted">{grade.label}</span></td>
                <td>{grade.description}</td>
                <td className="is-numeric">{percent(grade.factor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// Thêm một đĩa: nhập tên, chụp ảnh rồi để AI ước tính ngay.
function AddRecordForm({ policy, onAdded }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [photos, setPhotos] = useState([]); // [{ preview, dataUrl }]
  const [submitting, setSubmitting] = useState(false);
  const maxPhotos = policy?.maxPhotosPerItem || 4;

  useEffect(() => () => photos.forEach((photo) => URL.revokeObjectURL(photo.preview)), [photos]);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const addPhotos = async (event) => {
    const files = [...(event.target.files || [])].filter((file) => file.type.startsWith('image/'));
    event.target.value = '';
    const room = maxPhotos - photos.length;
    if (files.length > room) toast.error(`Mỗi đĩa tối đa ${maxPhotos} ảnh`);
    try {
      const added = await Promise.all(files.slice(0, room).map(async (file) => ({ preview: URL.createObjectURL(file), dataUrl: await photoToDataUrl(file) })));
      setPhotos((current) => [...current, ...added]);
    } catch {
      toast.error('Không đọc được ảnh, bạn thử ảnh khác nhé');
    }
  };

  const removePhoto = (index) => setPhotos((current) => current.filter((_, i) => i !== index));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) return toast.error('Vui lòng nhập tên album');
    if (photos.length === 0) return toast.error('Vui lòng thêm ít nhất 1 ảnh (mặt trước bìa)');
    setSubmitting(true);
    try {
      const data = await api.post('/tradein/items', { ...form, photos: photos.map((photo) => photo.dataUrl) });
      if (!data.success) {
        toast.error(data.message || 'Không thẩm định được đĩa này');
        return;
      }
      onAdded(data.data);
      setForm(EMPTY_FORM);
      setPhotos([]);
      toast.success(`AI đã thẩm định "${data.data.title}"`);
    } catch {
      toast.error(NETWORK_ERROR);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="card stack" onSubmit={submit}>
      <div className="card__header">
        <div>
          <h2 className="card__title"><Disc3 size={18} /> Thêm đĩa bạn muốn bán</h2>
          <p className="text-sm text-muted">Ảnh 1 là mặt trước bìa. Thêm ảnh mặt đĩa dưới ánh đèn để AI thấy vết xước.</p>
        </div>
      </div>
      <div className="field-row">
        <label className="field">
          <span className="label">Tên album *</span>
          <input className="input" value={form.title} onChange={update('title')} maxLength={255} placeholder="VD: Abbey Road" />
        </label>
        <label className="field">
          <span className="label">Nghệ sĩ</span>
          <input className="input" value={form.artist} onChange={update('artist')} maxLength={255} placeholder="VD: The Beatles" />
        </label>
      </div>
      <div className="field-row">
        <label className="field">
          <span className="label">Định dạng</span>
          <select className="select" value={form.format} onChange={update('format')}>
            <option value="vinyl">Đĩa than (vinyl)</option>
            <option value="cassette">Băng cassette</option>
          </select>
        </label>
        <label className="field">
          <span className="label">Bạn tự đánh giá (không bắt buộc)</span>
          <select className="select" value={form.self_grade} onChange={update('self_grade')}>
            <option value="">Không rõ</option>
            {policy?.grades.map((grade) => <option key={grade.code} value={grade.code}>{grade.code} · {grade.label}</option>)}
          </select>
        </label>
      </div>

      <div className="field">
        <span className="label">Ảnh chụp ({photos.length}/{maxPhotos})</span>
        <div className="tradein-uploads">
          {photos.map((photo, index) => (
            <div key={photo.preview} className="tradein-upload">
              <img src={photo.preview} alt={`Ảnh ${index + 1}`} />
              {index === 0 && <span className="tradein-upload__tag">Bìa trước</span>}
              <button type="button" className="icon-button icon-button--sm tradein-upload__remove" onClick={() => removePhoto(index)} aria-label={`Bỏ ảnh ${index + 1}`}>
                <X size={14} />
              </button>
            </div>
          ))}
          {photos.length < maxPhotos && (
            <button type="button" className="tradein-upload tradein-upload--add" onClick={() => fileRef.current?.click()}>
              {photos.length === 0 ? <Camera size={22} /> : <ImagePlus size={22} />}
              <span className="text-xs">{photos.length === 0 ? 'Chụp bìa trước' : 'Thêm ảnh'}</span>
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={addPhotos} />
      </div>

      <button type="submit" className="btn btn--primary" disabled={submitting}>
        <Sparkles size={16} /> {submitting ? 'AI đang xem ảnh và chấm tình trạng...' : 'Thẩm định nhanh bằng AI'}
      </button>
    </form>
  );
}

export function SellRecords() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const toast = useToast();
  const policy = usePolicy();
  const [items, setItems] = useState([]);
  const [delivery, setDelivery] = useState('mangden');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const customerId = user?.customer_id;

  useEffect(() => {
    if (!customerId) return;
    api.get('/tradein/items/drafts').then((data) => { if (data.success) setItems(data.data || []); }).catch(() => {});
  }, [customerId]);

  const removeItem = async (item) => {
    try {
      const data = await api.del(`/tradein/items/${item.id}`);
      if (data.success) setItems((current) => current.filter((entry) => entry.id !== item.id));
      else toast.error(data.message || 'Không bỏ được đĩa');
    } catch {
      toast.error(NETWORK_ERROR);
    }
  };

  const sendRequest = async () => {
    setSending(true);
    try {
      const data = await api.post('/tradein', { item_ids: items.map((item) => item.id), delivery, note });
      if (!data.success) {
        toast.error(data.message || 'Không gửi được yêu cầu');
        return;
      }
      toast.success('Đã gửi yêu cầu. Cửa hàng sẽ hẹn lịch nhận đĩa với bạn.');
      navigate(`/account?tab=tradein&request=${data.id}`);
    } catch {
      toast.error(NETWORK_ERROR);
    } finally {
      setSending(false);
    }
  };

  const totalBuy = items.reduce((sum, item) => sum + Number(item.suggested_buy_price || 0), 0);
  const totalList = items.reduce((sum, item) => sum + Number(item.suggested_list_price || 0), 0);

  return (
    <div className="page page--subtle">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Bán & ký gửi đĩa cũ</h1>
          <p className="page-subtitle">Chụp ảnh đĩa, AI ước tính giá trong vài giây. Nhân viên Vọc Records kiểm tra lại khi nhận đĩa rồi mới chốt giá.</p>
        </div>

        <div className="tradein-steps card">
          <Steps steps={['Chụp ảnh, AI ước tính', 'Mang hoặc gửi đĩa', 'Thẩm định & báo giá', 'Nhận tiền hoặc ký gửi']} current={user ? 0 : -1} />
        </div>

        <PolicyIntro policy={policy} />

        {!user ? (
          <div className="card">
            <EmptyState icon={Store} title="Đăng nhập để bán đĩa cho Vọc Records" action={<Link to="/login" state={{ returnUrl: '/sell' }} className="btn btn--primary">Đăng nhập</Link>}>
              Cửa hàng cần biết bạn là ai để hẹn nhận đĩa và trả tiền.
            </EmptyState>
          </div>
        ) : !customerId ? (
          <div className="card"><EmptyState title="Tài khoản nhân viên không bán đĩa được">Xử lý yêu cầu thu mua tại trang quản trị.</EmptyState></div>
        ) : (
          <div className="tradein-layout">
            <div className="stack">
              <AddRecordForm policy={policy} onAdded={(item) => setItems((current) => [...current, item])} />
              {items.map((item) => (
                <section key={item.id} className="card">
                  <TradeInItem
                    item={item}
                    policy={policy}
                    actions={(
                      <button type="button" className="icon-button icon-button--sm" onClick={() => removeItem(item)} aria-label={`Bỏ ${item.title}`}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  />
                </section>
              ))}
            </div>

            <aside className="card tradein-summary">
              <h2 className="card__title">Yêu cầu của bạn</h2>
              {items.length === 0 ? (
                <p className="text-sm text-muted">Chưa có đĩa nào. Thêm đĩa bên trái để xem ước tính.</p>
              ) : (
                <>
                  <div className="summary-row"><span className="text-muted">Số đĩa</span><span>{items.length}</span></div>
                  <div className="summary-row"><span className="text-muted">Ước tính bán đứt</span><span>{formatPrice(totalBuy)}</span></div>
                  {policy && <div className="summary-row"><span className="text-muted">Nếu nhận vào ví (+{percent(policy.creditBonus)})</span><span>{formatPrice(Math.round(totalBuy * (1 + policy.creditBonus) / 10000) * 10000)}</span></div>}
                  <div className="summary-row"><span className="text-muted">Ước tính giá ký gửi</span><span>{formatPrice(totalList)}</span></div>
                </>
              )}
              <div className="choice-list">
                <label className={`choice ${delivery === 'mangden' ? 'choice--selected' : ''}`}>
                  <input type="radio" name="delivery" checked={delivery === 'mangden'} onChange={() => setDelivery('mangden')} />
                  <div className="choice__body">
                    <p className="choice__title">Mang đĩa tới cửa hàng</p>
                    <p className="choice__desc">54 Triều Khúc, Thanh Xuân, Hà Nội. Cửa hàng hẹn giờ với bạn.</p>
                  </div>
                </label>
                <label className={`choice ${delivery === 'guiship' ? 'choice--selected' : ''}`}>
                  <input type="radio" name="delivery" checked={delivery === 'guiship'} onChange={() => setDelivery('guiship')} />
                  <div className="choice__body">
                    <p className="choice__title">Gửi qua đơn vị vận chuyển</p>
                    <p className="choice__desc">Đóng gói kỹ, cửa hàng hướng dẫn gửi sau khi duyệt.</p>
                  </div>
                </label>
              </div>
              <label className="field">
                <span className="label">Ghi chú cho cửa hàng</span>
                <textarea className="textarea" rows={2} value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} placeholder="VD: đĩa có kèm poster, bìa trong còn nguyên" />
              </label>
              <button type="button" className="btn btn--primary btn--full" disabled={items.length === 0 || sending} onClick={sendRequest}>
                {sending ? 'Đang gửi...' : `Gửi yêu cầu (${items.length} đĩa)`}
              </button>
              <p className="text-xs text-muted">Giá AI chỉ để tham khảo. Giá chốt do nhân viên đưa ra sau khi kiểm tra đĩa, bạn đồng ý mới bán.</p>
            </aside>
          </div>
        )}

        <GradingGuide policy={policy} />
      </div>
    </div>
  );
}
