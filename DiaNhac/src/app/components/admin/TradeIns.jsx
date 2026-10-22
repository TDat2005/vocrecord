import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Calculator, RefreshCw, Sparkles } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api, NETWORK_ERROR } from '../../utils/api';
import { formatDate, formatDateTime, formatPrice } from '../../utils/format';
import {
  PAYOUT_METHODS, TRADEIN_MODES, TRADEIN_STATUS_OPTIONS, getConsignmentStatus, getTradeInStatus,
} from '../../utils/status';
import { gradeText, percent, quote, usePolicy } from '../../utils/tradein';
import { Modal, StatusBadge } from '../ui';
import { SafeImage } from '../SafeImage';
import { PageHeader } from './PageHeader';
import '../../../styles/pages/tradein.css';

const STATUS_FILTERS = [{ value: '', label: 'Tất cả' }, ...TRADEIN_STATUS_OPTIONS.filter((option) => ['moi', 'chonhandia', 'dangthamdinh', 'chokhachxacnhan', 'hoanthanh'].includes(option.value))];

// Giá trị cho <input type="datetime-local"> theo giờ địa phương.
const toLocalInput = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

function Report({ report }) {
  if (!report) return null;
  const pending = (report.requests.moi || 0) + (report.requests.dangthamdinh || 0);
  const ai = report.ai_accuracy;
  return (
    <div className="admin-stats">
      <div className="card"><p className="admin-stat__label">Yêu cầu cần xử lý</p><p className="admin-stat__value">{pending}</p></div>
      <div className="card"><p className="admin-stat__label">Đĩa đã thu mua · chi</p><p className="admin-stat__value">{report.buyout.items} · {formatPrice(report.buyout.paid_out)}</p></div>
      <div className="card"><p className="admin-stat__label">Doanh thu đĩa cũ</p><p className="admin-stat__value">{formatPrice(report.used_sales.revenue)}</p><p className="text-xs text-muted">{report.used_sales.items} đĩa · lãi gộp bán đứt {formatPrice(report.buyout_profit.gross_profit)}</p></div>
      <div className="card"><p className="admin-stat__label">Hoa hồng ký gửi</p><p className="admin-stat__value">{formatPrice(report.consignment.commission)}</p><p className="text-xs text-muted">{report.consignment.selling} đang bán · {report.consignment.sold} đã bán</p></div>
      <div className="card"><p className="admin-stat__label">Chờ chi trả</p><p className="admin-stat__value">{formatPrice(report.buyout.unpaid + report.consignment.owed)}</p><p className="text-xs text-muted">Bán đứt {formatPrice(report.buyout.unpaid)} · ký gửi {formatPrice(report.consignment.owed)}</p></div>
      <div className="card"><p className="admin-stat__label">Tín dụng đang lưu hành</p><p className="admin-stat__value">{formatPrice(report.credit.outstanding)}</p><p className="text-xs text-muted">Đã phát {formatPrice(report.credit.issued)} · đã dùng {formatPrice(report.credit.spent)}</p></div>
      <div className="card">
        <p className="admin-stat__label">AI chấm khớp nhân viên</p>
        <p className="admin-stat__value">{ai.compared ? percent(ai.exact / ai.compared) : '—'}</p>
        <p className="text-xs text-muted">{ai.compared ? `Lệch tối đa 1 mức: ${percent(ai.within_one / ai.compared)} · ${ai.compared} đĩa` : 'Chưa có đĩa để so sánh'}</p>
      </div>
    </div>
  );
}

// Form thẩm định một đĩa (khi yêu cầu đang ở bước thẩm định).
function AppraisalRow({ item, policy, value, onChange }) {
  const set = (field) => (event) => onChange({ ...value, [field]: event.target.value });
  const suggested = quote(policy, item.base_price, value.media_grade, value.sleeve_grade);
  const applyQuote = () => suggested && onChange({ ...value, buy_price: suggested.buyPrice, list_price: suggested.listPrice });
  const ai = item.ai || {};

  return (
    <article className="tradein-appraisal">
      <div className="tradein-item__photos">
        {item.photos.map((url, index) => (
          <a key={url} href={url} target="_blank" rel="noopener noreferrer" className={index === 0 ? 'tradein-item__photo tradein-item__photo--main' : 'tradein-item__photo'}>
            <SafeImage src={url} alt={`Ảnh ${index + 1}`} />
          </a>
        ))}
      </div>
      <div className="stack stack--sm">
        <div className="tradein-ai">
          <p className="tradein-ai__title"><Sparkles size={14} /> Gợi ý của AI{item.ai_model ? ` (${item.ai_model})` : ''}</p>
          {item.ai_status === 'xong' ? (
            <>
              <p className="text-sm">
                Đĩa <strong>{gradeText(policy, item.ai_media_grade)}</strong> · Bìa <strong>{gradeText(policy, item.ai_sleeve_grade)}</strong>
                {item.ai_confidence !== null && ` · tin cậy ${percent(item.ai_confidence)}`}
                {!ai.media_visible && ' · chưa thấy mặt đĩa'}
              </p>
              {ai.identified?.title && <p className="text-sm">Nhận ra: {ai.identified.title}{ai.identified.artist ? ` – ${ai.identified.artist}` : ''}{ai.identified.year ? ` (${ai.identified.year})` : ''}</p>}
              {ai.summary && <p className="text-sm text-muted">{ai.summary}</p>}
              {ai.defects.length > 0 && <ul className="tradein-ai__defects">{ai.defects.map((d) => <li key={d}>{d}</li>)}</ul>}
            </>
          ) : <p className="text-sm text-muted">{item.ai_status === 'loi' ? `AI lỗi: ${ai.error || 'không rõ'}` : 'Chưa bật AI thẩm định'}</p>}
          <p className="text-xs text-muted">
            Khách tự đánh giá: {item.self_grade || 'không rõ'} · Giá tham chiếu {formatPrice(item.base_price)}
            {item.match_title ? ` (bản mới “${item.match_title}”${item.match_similarity ? `, ảnh giống ${percent(item.match_similarity)}` : ''})` : ' (mặc định, không có bản mới)'}
          </p>
        </div>

        <div className="field-row">
          <label className="field"><span className="label">Tên album</span><input className="input input--sm" value={value.title} onChange={set('title')} /></label>
          <label className="field"><span className="label">Nghệ sĩ</span><input className="input input--sm" value={value.artist} onChange={set('artist')} /></label>
        </div>
        <div className="field-row">
          <label className="field">
            <span className="label">Tình trạng đĩa</span>
            <select className="select select--sm" value={value.media_grade} onChange={set('media_grade')}>
              <option value="">Chọn</option>
              {policy?.grades.map((g) => <option key={g.code} value={g.code}>{g.code} · {g.label}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="label">Tình trạng bìa</span>
            <select className="select select--sm" value={value.sleeve_grade} onChange={set('sleeve_grade')}>
              <option value="">Chọn</option>
              {policy?.grades.map((g) => <option key={g.code} value={g.code}>{g.code} · {g.label}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="label">Kết quả</span>
            <select className="select select--sm" value={value.result} onChange={set('result')}>
              <option value="cho">Chưa quyết</option>
              <option value="nhan">Nhận đĩa</option>
              <option value="loai">Không nhận</option>
            </select>
          </label>
        </div>
        <div className="field-row">
          <label className="field"><span className="label">Giá thu mua (bán đứt)</span><input type="number" min={0} step={10000} className="input input--sm" value={value.buy_price} onChange={set('buy_price')} /></label>
          <label className="field"><span className="label">Giá niêm yết (bán lại / ký gửi)</span><input type="number" min={0} step={10000} className="input input--sm" value={value.list_price} onChange={set('list_price')} /></label>
        </div>
        {suggested && (
          <button type="button" className="btn btn--plain text-sm tradein-apply" onClick={applyQuote}>
            <Calculator size={14} /> Tính theo bảng giá: thu mua {formatPrice(suggested.buyPrice)} · niêm yết {formatPrice(suggested.listPrice)}
          </button>
        )}
        <label className="field">
          <span className="label">Ghi chú thẩm định (khách xem được, hiện trên trang sản phẩm)</span>
          <textarea className="textarea" rows={2} value={value.staff_note} onChange={set('staff_note')} placeholder="VD: đã vệ sinh, phát thử không nhảy kim; bìa có chữ ký tên chủ cũ" />
        </label>
      </div>
    </article>
  );
}

function RequestDetail({ id, policy, onClose, onChanged }) {
  const toast = useToast();
  const [request, setRequest] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [appointment, setAppointment] = useState(() => toLocalInput(new Date(Date.now() + 86400000)));
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.get(`/tradein/${id}`).then((data) => {
      if (!data.success) return toast.error(data.message || 'Không tải được yêu cầu');
      setRequest(data.data);
      setDrafts(Object.fromEntries(data.data.items.map((item) => [item.id, {
        title: item.title || '', artist: item.artist || '', media_grade: item.media_grade || '', sleeve_grade: item.sleeve_grade || '',
        buy_price: item.buy_price ?? '', list_price: item.list_price ?? '', result: item.result || 'cho', staff_note: item.staff_note || '',
      }])));
    }).catch(() => toast.error(NETWORK_ERROR));
  }, [id, toast]);

  useEffect(() => { load(); }, [load]);

  const run = async (call, successMessage) => {
    setBusy(true);
    try {
      const data = await call();
      if (data.success) {
        toast.success(data.message || successMessage);
        setMessage('');
        load();
        onChanged();
        return true;
      }
      toast.error(data.message || 'Không thực hiện được');
    } catch {
      toast.error(NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
    return false;
  };

  const itemsPayload = () => Object.entries(drafts).map(([itemId, value]) => ({ id: Number(itemId), ...value }));
  const saveItems = () => run(() => api.put(`/tradein/${id}/items`, { items: itemsPayload() }), 'Đã lưu');
  const sendOffer = async () => {
    const saved = await run(() => api.put(`/tradein/${id}/items`, { items: itemsPayload() }), 'Đã lưu');
    if (saved) await run(() => api.put(`/tradein/${id}/offer`, { message }), 'Đã gửi báo giá');
  };
  const reject = () => {
    if (!message.trim()) return toast.error('Nhập lý do từ chối vào ô lời nhắn');
    return run(() => api.put(`/tradein/${id}/reject`, { message }), 'Đã từ chối');
  };

  if (!request) return <Modal title={`Yêu cầu thu mua #${id}`} onClose={onClose} wide><p className="loading-text">Đang tải...</p></Modal>;
  const open = ['moi', 'chonhandia', 'dangthamdinh', 'chokhachxacnhan'].includes(request.status);

  return (
    <Modal title={`Yêu cầu thu mua #${id}`} onClose={onClose} wide>
      <div className="stack">
        <div className="inline inline--between">
          <StatusBadge status={getTradeInStatus(request.status)} />
          <span className="text-sm text-muted">Gửi {formatDateTime(request.created_at)} · cập nhật {formatDateTime(request.updated_at)}</span>
        </div>
        <dl className="description-list">
          <dt>Khách hàng</dt><dd>{request.customer_name} · {request.customer_phone || 'chưa có SĐT'} · {request.customer_email}</dd>
          <dt>Cách giao đĩa</dt><dd>{request.delivery === 'guiship' ? 'Gửi qua đơn vị vận chuyển' : 'Mang tới cửa hàng'}</dd>
          {request.customer_note && <><dt>Ghi chú của khách</dt><dd className="pre-wrap">{request.customer_note}</dd></>}
          {request.appointment && <><dt>Lịch hẹn</dt><dd>{formatDateTime(request.appointment)}</dd></>}
          {request.shop_message && <><dt>Lời nhắn đã gửi</dt><dd className="pre-wrap">{request.shop_message}</dd></>}
          {request.status === 'hoanthanh' && (
            <><dt>Kết quả</dt><dd>{TRADEIN_MODES[request.mode]} · {PAYOUT_METHODS[request.payout_method]}{request.payout_info ? ` (${request.payout_info})` : ''}{request.payout_total !== null ? ` · ${formatPrice(request.payout_total)}` : ''}</dd></>
          )}
        </dl>

        {request.status === 'dangthamdinh' ? (
          request.items.map((item) => (
            <section key={item.id} className="card">
              <AppraisalRow item={item} policy={policy} value={drafts[item.id]} onChange={(value) => setDrafts((current) => ({ ...current, [item.id]: value }))} />
            </section>
          ))
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Đĩa</th><th>AI chấm</th><th>Chốt</th><th className="is-numeric">Thu mua</th><th className="is-numeric">Niêm yết</th><th>Kết quả</th></tr></thead>
              <tbody>
                {request.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="inline">
                        {item.photos[0] && <a href={item.photos[0]} target="_blank" rel="noopener noreferrer"><SafeImage src={item.photos[0]} alt="" className="tradein-thumb" /></a>}
                        <div><div className="font-medium">{item.title}</div><div className="text-xs text-muted">{item.artist}</div></div>
                      </div>
                    </td>
                    <td className="nowrap text-sm">{item.ai_status === 'xong' ? `${item.ai_media_grade} / ${item.ai_sleeve_grade}` : '—'}</td>
                    <td className="nowrap text-sm">{item.media_grade ? `${item.media_grade} / ${item.sleeve_grade}` : '—'}</td>
                    <td className="is-numeric">{formatPrice(item.buy_price ?? item.suggested_buy_price)}</td>
                    <td className="is-numeric">{formatPrice(item.list_price ?? item.suggested_list_price)}</td>
                    <td className="text-sm">
                      {item.product_id ? <Link to={`/product/${item.product_id}`} className="link">SP #{item.product_id}</Link> : item.result === 'nhan' ? 'Nhận' : item.result === 'loai' ? 'Không nhận' : 'Chưa quyết'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {open && request.status !== 'chokhachxacnhan' && (
          <label className="field">
            <span className="label">Lời nhắn cho khách (lịch hẹn, báo giá hoặc lý do từ chối)</span>
            <textarea className="textarea" rows={2} value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} />
          </label>
        )}

        <div className="button-group">
          {['moi', 'chonhandia'].includes(request.status) && (
            <>
              <input type="datetime-local" className="input input--sm tradein-datetime" value={appointment} onChange={(event) => setAppointment(event.target.value)} aria-label="Ngày giờ hẹn" />
              <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => run(() => api.put(`/tradein/${id}/schedule`, { appointment: new Date(appointment).toISOString(), message }), 'Đã hẹn lịch')}>
                {request.status === 'moi' ? 'Hẹn nhận đĩa' : 'Đổi lịch hẹn'}
              </button>
              <button type="button" className="btn btn--primary" disabled={busy} onClick={() => run(() => api.put(`/tradein/${id}/receive`, {}), 'Đã nhận đĩa')}>Đã nhận đĩa, bắt đầu thẩm định</button>
            </>
          )}
          {request.status === 'dangthamdinh' && (
            <>
              <button type="button" className="btn btn--secondary" disabled={busy} onClick={saveItems}>Lưu thẩm định</button>
              <button type="button" className="btn btn--primary" disabled={busy} onClick={sendOffer}>Gửi báo giá cho khách</button>
            </>
          )}
          {request.status === 'chokhachxacnhan' && <p className="text-sm text-muted">Đã gửi báo giá {formatPrice(request.offer_buy_total)} (bán đứt) / {formatPrice(request.offer_list_total)} (ký gửi), đang chờ khách chọn.</p>}
          {request.status === 'hoanthanh' && request.mode === 'bandut' && !request.paid && (
            <button type="button" className="btn btn--primary" disabled={busy} onClick={() => run(() => api.put(`/tradein/${id}/paid`, {}), 'Đã ghi nhận chi trả')}>
              Đã chi trả {formatPrice(request.payout_total)} cho khách
            </button>
          )}
          {open && <button type="button" className="btn btn--plain btn--plain-critical" disabled={busy} onClick={reject}>Từ chối yêu cầu</button>}
        </div>
      </div>
    </Modal>
  );
}

function Consignments({ onChanged }) {
  const toast = useToast();
  const [contracts, setContracts] = useState([]);

  const load = useCallback(() => {
    api.get('/tradein/consignments/manage').then((data) => { if (data.success) setContracts(data.data || []); }).catch(() => toast.error(NETWORK_ERROR));
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const act = async (contract, action, confirmText) => {
    if (!window.confirm(confirmText)) return;
    try {
      const data = await api.put(`/tradein/consignments/${contract.id}/${action}`, {});
      if (data.success) { toast.success(data.message); load(); onChanged(); } else toast.error(data.message);
    } catch { toast.error(NETWORK_ERROR); }
  };

  return (
    <section className="card card--flush">
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Đĩa ký gửi</th><th>Người gửi</th><th className="is-numeric">Niêm yết</th><th>Trạng thái</th><th className="is-numeric">Bán được / trả người gửi</th><th /></tr></thead>
          <tbody>
            {contracts.length === 0 && <tr><td colSpan={6} className="table__empty">Chưa có hợp đồng ký gửi.</td></tr>}
            {contracts.map((contract) => (
              <tr key={contract.id}>
                <td>
                  <div className="inline">
                    <SafeImage src={contract.image} alt="" className="tradein-thumb" />
                    <div>
                      <Link to={`/product/${contract.product_id}`} className="font-medium">{contract.title}</Link>
                      <div className="text-xs text-muted">HĐ #{contract.id} · {contract.condition} · hạn {formatDate(contract.expires_at)}</div>
                    </div>
                  </div>
                </td>
                <td><div>{contract.customer_name}</div><div className="text-xs text-muted">{PAYOUT_METHODS[contract.payout_method]}{contract.payout_info ? ` · ${contract.payout_info}` : ''}</div></td>
                <td className="is-numeric">{formatPrice(contract.list_price)}</td>
                <td><StatusBadge status={getConsignmentStatus(contract.status)} />{contract.expired && <div className="text-xs text-critical">Quá hạn</div>}</td>
                <td className="is-numeric">{contract.sale_price !== null ? `${formatPrice(contract.sale_price)} / ${formatPrice(contract.payout)}` : '—'}</td>
                <td className="nowrap">
                  {contract.status === 'daban' && <button type="button" className="btn btn--secondary btn--sm" onClick={() => act(contract, 'paid', `Xác nhận đã trả ${formatPrice(contract.payout)} cho ${contract.customer_name}?`)}>Đã chi trả</button>}
                  {contract.status === 'dangban' && <button type="button" className="btn btn--plain text-sm" onClick={() => act(contract, 'return', `Gỡ "${contract.title}" khỏi cửa hàng và trả lại đĩa cho khách?`)}>Trả lại đĩa</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function TradeIns() {
  const toast = useToast();
  const policy = usePolicy();
  const [view, setView] = useState('requests');
  const [status, setStatus] = useState('');
  const [requests, setRequests] = useState([]);
  const [report, setReport] = useState(null);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(() => {
    api.get(`/tradein/manage${status ? `?status=${status}` : ''}`).then((data) => { if (data.success) setRequests(data.data || []); }).catch(() => toast.error(NETWORK_ERROR));
    api.get('/tradein/report').then((data) => { if (data.success) setReport(data.data); }).catch(() => {});
  }, [status, toast]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <PageHeader
        title="Thu mua & ký gửi"
        subtitle="Khách gửi ảnh, AI chấm sơ bộ. Hẹn nhận đĩa, kiểm tra lại tình trạng theo thang Goldmine rồi gửi báo giá. Đĩa được nhận tự lên kệ “Đĩa cũ”."
        actions={<button type="button" className="btn btn--secondary" onClick={load}><RefreshCw size={16} /> Làm mới</button>}
      />
      <Report report={report} />

      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={view === 'requests'} className={`tab ${view === 'requests' ? 'tab--active' : ''}`} onClick={() => setView('requests')}>Yêu cầu thu mua</button>
        <button type="button" role="tab" aria-selected={view === 'consignments'} className={`tab ${view === 'consignments' ? 'tab--active' : ''}`} onClick={() => setView('consignments')}>Hợp đồng ký gửi</button>
      </div>

      {view === 'requests' ? (
        <>
          <div className="chip-group">
            {STATUS_FILTERS.map((option) => (
              <button key={option.value} type="button" className={`chip ${status === option.value ? 'chip--active' : ''}`} onClick={() => setStatus(option.value)}>{option.label}</button>
            ))}
          </div>
          <section className="card card--flush">
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Yêu cầu</th><th>Khách hàng</th><th>Số đĩa</th><th>Cách giao</th><th className="is-numeric">Báo giá</th><th>Trạng thái</th></tr></thead>
                <tbody>
                  {requests.length === 0 && <tr><td colSpan={6} className="table__empty">Chưa có yêu cầu nào.</td></tr>}
                  {requests.map((request) => (
                    <tr key={request.id} className="table__row--clickable" onClick={() => setOpenId(request.id)}>
                      <td><div className="font-medium">TM-{request.id}</div><div className="text-xs text-muted">{formatDateTime(request.created_at)}</div></td>
                      <td><div>{request.customer_name}</div><div className="text-xs text-muted">{request.customer_phone || request.customer_email}</div></td>
                      <td>{request.item_count}</td>
                      <td className="text-sm">{request.delivery === 'guiship' ? 'Gửi vận chuyển' : 'Mang tới'}{request.appointment && request.status === 'chonhandia' ? ` · hẹn ${formatDateTime(request.appointment)}` : ''}</td>
                      <td className="is-numeric">{request.offer_buy_total ? formatPrice(request.offer_buy_total) : '—'}</td>
                      <td><StatusBadge status={getTradeInStatus(request.status)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : <Consignments onChanged={load} />}

      {openId && <RequestDetail id={openId} policy={policy} onClose={() => setOpenId(null)} onChanged={load} />}
    </>
  );
}
