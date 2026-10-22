import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Disc3, Wallet } from 'lucide-react';
import { Steps } from '../AuthLayout';
import { EmptyState, Modal, StatusBadge } from '../ui';
import { SafeImage } from '../SafeImage';
import { TradeInItem } from './TradeInItem';
import { useToast } from '../../context/ToastContext';
import { api, NETWORK_ERROR } from '../../utils/api';
import { formatDate, formatDateTime, formatPrice } from '../../utils/format';
import {
  PAYOUT_METHODS, TRADEIN_MODES, TRADEIN_STEPS, TRADEIN_STEP_INDEX, WALLET_ENTRY_TYPES,
  getConsignmentStatus, getTradeInStatus,
} from '../../utils/status';
import { percent, usePolicy } from '../../utils/tradein';
import '../../../styles/pages/tradein.css';

// Khách chấp nhận báo giá: chọn bán đứt hay ký gửi và cách nhận tiền.
function RespondForm({ request, policy, onDone }) {
  const toast = useToast();
  const [mode, setMode] = useState('bandut');
  const [payout, setPayout] = useState('tindung');
  const [payoutInfo, setPayoutInfo] = useState('');
  const [sending, setSending] = useState(false);
  const bonus = policy ? policy.creditBonus : 0;
  const buyTotal = request.offer_buy_total || 0;
  const buyWithBonus = Math.round(buyTotal * (1 + bonus) / 10000) * 10000;
  const listTotal = request.offer_list_total || 0;
  const consignPayout = policy ? Math.round(listTotal * (1 - policy.commissionRate)) : listTotal;

  const respond = async (accept) => {
    if (!accept && !window.confirm('Không bán đĩa theo báo giá này? Cửa hàng sẽ liên hệ trả lại đĩa.')) return;
    setSending(true);
    try {
      const data = await api.post(`/tradein/${request.id}/respond`, { accept, mode, payout_method: payout, payout_info: payoutInfo });
      if (data.success) {
        toast.success(data.message);
        onDone();
      } else {
        toast.error(data.message || 'Không gửi được phản hồi');
      }
    } catch {
      toast.error(NETWORK_ERROR);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="card card--subtle stack">
      <h3 className="card__title">Bạn muốn bán thế nào?</h3>
      <div className="choice-list">
        <label className={`choice ${mode === 'bandut' ? 'choice--selected' : ''}`}>
          <input type="radio" name="mode" checked={mode === 'bandut'} onChange={() => setMode('bandut')} />
          <div className="choice__body">
            <p className="choice__title">Bán đứt · {formatPrice(buyTotal)}</p>
            <p className="choice__desc">Nhận tiền ngay. Chọn nhận vào ví được {formatPrice(buyWithBonus)} (+{percent(bonus)}).</p>
          </div>
        </label>
        <label className={`choice ${mode === 'kygui' ? 'choice--selected' : ''}`}>
          <input type="radio" name="mode" checked={mode === 'kygui'} onChange={() => setMode('kygui')} />
          <div className="choice__body">
            <p className="choice__title">Ký gửi · niêm yết {formatPrice(listTotal)}</p>
            <p className="choice__desc">
              Bán được bạn nhận khoảng {formatPrice(consignPayout)}{policy ? ` (cửa hàng giữ ${percent(policy.commissionRate)} hoa hồng, hợp đồng ${policy.consignmentDays} ngày)` : ''}.
            </p>
          </div>
        </label>
      </div>
      <label className="field">
        <span className="label">Nhận tiền qua</span>
        <select className="select" value={payout} onChange={(event) => setPayout(event.target.value)}>
          {Object.entries(PAYOUT_METHODS).map(([value, label]) => <option key={value} value={value}>{label}{value === 'tindung' && mode === 'bandut' ? ` (+${percent(bonus)})` : ''}</option>)}
        </select>
      </label>
      {payout === 'chuyenkhoan' && (
        <label className="field">
          <span className="label">Ngân hàng, số tài khoản, chủ tài khoản</span>
          <input className="input" value={payoutInfo} onChange={(event) => setPayoutInfo(event.target.value)} maxLength={255} placeholder="VD: Vietcombank 0123456789 Nguyễn Văn A" />
        </label>
      )}
      <div className="button-group">
        <button type="button" className="btn btn--primary" disabled={sending} onClick={() => respond(true)}>Đồng ý {mode === 'bandut' ? 'bán' : 'ký gửi'}</button>
        <button type="button" className="btn btn--plain btn--plain-critical" disabled={sending} onClick={() => respond(false)}>Không bán, nhận lại đĩa</button>
      </div>
    </section>
  );
}

function RequestDetail({ id, policy, onClose, onChanged }) {
  const toast = useToast();
  const [request, setRequest] = useState(null);

  const load = useCallback(() => {
    api.get(`/tradein/${id}`).then((data) => {
      if (data.success) setRequest(data.data);
      else toast.error(data.message || 'Không tải được yêu cầu');
    }).catch(() => toast.error(NETWORK_ERROR));
  }, [id, toast]);

  useEffect(() => { load(); }, [load]);

  const cancel = async () => {
    if (!window.confirm('Hủy yêu cầu thu mua này?')) return;
    try {
      const data = await api.post(`/tradein/${id}/cancel`, {});
      if (data.success) { toast.success(data.message); load(); onChanged(); } else toast.error(data.message);
    } catch { toast.error(NETWORK_ERROR); }
  };

  const status = request ? getTradeInStatus(request.status) : null;
  const step = request ? TRADEIN_STEP_INDEX[request.status] : undefined;

  return (
    <Modal title={`Yêu cầu thu mua #${id}`} onClose={onClose} wide>
      {!request ? <p className="loading-text">Đang tải...</p> : (
        <div className="stack">
          <div className="inline inline--between">
            <StatusBadge status={status} />
            <span className="text-sm text-muted">Gửi lúc {formatDateTime(request.created_at)}</span>
          </div>
          {step !== undefined && <div className="tradein-steps"><Steps steps={TRADEIN_STEPS} current={step} /></div>}

          {request.status === 'chonhandia' && request.appointment && (
            <div className="banner banner--info">
              <div>
                <p className="banner__title">Lịch hẹn nhận đĩa: {formatDateTime(request.appointment)}</p>
                {request.shop_message && <p>{request.shop_message}</p>}
              </div>
            </div>
          )}
          {request.status !== 'chonhandia' && request.shop_message && (
            <div className={`banner ${request.status === 'tuchoi' ? 'banner--critical' : 'banner--info'}`}>
              <div><p className="banner__title">Lời nhắn của cửa hàng</p><p>{request.shop_message}</p></div>
            </div>
          )}
          {request.status === 'hoanthanh' && (
            <div className="banner banner--success">
              <div>
                <p className="banner__title">{TRADEIN_MODES[request.mode]} · {PAYOUT_METHODS[request.payout_method]}</p>
                {request.mode === 'bandut'
                  ? <p>Số tiền nhận: {formatPrice(request.payout_total)} · {request.paid ? 'đã chi trả' : 'cửa hàng đang chi trả'}</p>
                  : <p>Đĩa đã lên kệ. Theo dõi ở mục “Đĩa đang ký gửi” bên dưới.</p>}
              </div>
            </div>
          )}

          {request.items.map((item) => (
            <div key={item.id} className="card">
              <TradeInItem item={item} policy={policy} showOffer={['chokhachxacnhan', 'hoanthanh', 'khachtuchoi'].includes(request.status)} />
              {item.product_id && <Link to={`/product/${item.product_id}`} className="link text-sm">Xem đĩa trên cửa hàng</Link>}
            </div>
          ))}

          {request.status === 'chokhachxacnhan' && <RespondForm request={request} policy={policy} onDone={() => { load(); onChanged(); }} />}
          {['moi', 'chonhandia'].includes(request.status) && (
            <button type="button" className="btn btn--plain btn--plain-critical text-sm" onClick={cancel}>Hủy yêu cầu</button>
          )}
        </div>
      )}
    </Modal>
  );
}

export function MyTradeIns() {
  const toast = useToast();
  const policy = usePolicy();
  const [searchParams, setSearchParams] = useSearchParams();
  const [requests, setRequests] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [wallet, setWallet] = useState({ balance: 0, history: [] });
  const [showHistory, setShowHistory] = useState(false);
  const openId = searchParams.get('request');

  const load = useCallback(() => {
    api.get('/tradein/mine').then((data) => { if (data.success) setRequests(data.data || []); }).catch(() => toast.error(NETWORK_ERROR));
    api.get('/tradein/consignments/mine').then((data) => { if (data.success) setContracts(data.data || []); }).catch(() => {});
    api.get('/tradein/wallet').then((data) => { if (data.success) setWallet(data.data); }).catch(() => {});
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openRequest = (id) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set('request', id); else next.delete('request');
    setSearchParams(next, { replace: true });
  };

  const withdraw = async (contract) => {
    if (!window.confirm(`Rút "${contract.title}" khỏi cửa hàng? Đĩa sẽ ngừng bán và bạn hẹn lấy lại.`)) return;
    try {
      const data = await api.post(`/tradein/consignments/${contract.id}/withdraw`, {});
      if (data.success) { toast.success(data.message); load(); } else toast.error(data.message);
    } catch { toast.error(NETWORK_ERROR); }
  };

  return (
    <div className="stack">
      <section className="card tradein-wallet">
        <div className="inline inline--between">
          <div className="inline">
            <Wallet size={22} />
            <div>
              <p className="text-sm text-muted">Ví tín dụng Vọc Records</p>
              <p className="tradein-wallet__balance">{formatPrice(wallet.balance)}</p>
            </div>
          </div>
          <div className="button-group">
            {wallet.history.length > 0 && <button type="button" className="btn btn--plain text-sm" onClick={() => setShowHistory((value) => !value)}>{showHistory ? 'Ẩn lịch sử' : 'Lịch sử ví'}</button>}
            <Link to="/sell" className="btn btn--secondary btn--sm"><Disc3 size={16} /> Bán thêm đĩa</Link>
          </div>
        </div>
        <p className="text-xs text-muted">Dùng số dư khi thanh toán đơn hàng (chọn “Dùng ví tín dụng” ở bước thanh toán).</p>
        {showHistory && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Thời gian</th><th>Nội dung</th><th className="is-numeric">Số tiền</th><th className="is-numeric">Số dư</th></tr></thead>
              <tbody>
                {wallet.history.map((entry) => (
                  <tr key={entry.id}>
                    <td className="nowrap text-sm">{formatDateTime(entry.created_at)}</td>
                    <td><div>{WALLET_ENTRY_TYPES[entry.type] || entry.type}</div><div className="text-xs text-muted">{entry.note}</div></td>
                    <td className={`is-numeric ${entry.amount < 0 ? 'text-critical' : ''}`}>{entry.amount > 0 ? '+' : ''}{formatPrice(entry.amount)}</td>
                    <td className="is-numeric">{formatPrice(entry.balance_after)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="stack">
        <h2 className="section-title">Yêu cầu thu mua</h2>
        {requests.length === 0 ? (
          <div className="card">
            <EmptyState icon={Disc3} title="Bạn chưa gửi đĩa nào cho cửa hàng" action={<Link to="/sell" className="btn btn--primary">Bán hoặc ký gửi đĩa cũ</Link>}>
              Chụp ảnh đĩa, AI ước tính giá ngay.
            </EmptyState>
          </div>
        ) : (
          <ul className="stack">
            {requests.map((request) => (
              <li key={request.id} className="card order-card">
                <div className="order-card__header">
                  <div>
                    <button type="button" className="btn btn--plain order-card__title" onClick={() => openRequest(request.id)}>Yêu cầu #{request.id} · {request.item_count} đĩa</button>
                    <p className="text-sm text-muted">{formatDateTime(request.created_at)}</p>
                  </div>
                  <StatusBadge status={getTradeInStatus(request.status)} />
                </div>
                <div className="order-card__body">
                  <span className="text-sm text-muted">
                    {request.status === 'chokhachxacnhan' ? 'Cửa hàng đã báo giá, mời bạn xác nhận' : request.mode ? `${TRADEIN_MODES[request.mode]} · ${PAYOUT_METHODS[request.payout_method]}` : request.delivery === 'guiship' ? 'Gửi qua vận chuyển' : 'Mang tới cửa hàng'}
                  </span>
                  {request.payout_total !== null && <span className="font-semibold">{formatPrice(request.payout_total)}</span>}
                </div>
                <div className="button-group">
                  <button type="button" className={`btn btn--sm ${request.status === 'chokhachxacnhan' ? 'btn--primary' : 'btn--secondary'}`} onClick={() => openRequest(request.id)}>
                    {request.status === 'chokhachxacnhan' ? 'Xem báo giá' : 'Xem chi tiết'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {contracts.length > 0 && (
        <section className="stack">
          <h2 className="section-title">Đĩa đang ký gửi</h2>
          <div className="card card--flush">
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Đĩa</th><th className="is-numeric">Giá niêm yết</th><th>Trạng thái</th><th className="is-numeric">Bạn nhận</th><th /></tr></thead>
                <tbody>
                  {contracts.map((contract) => (
                    <tr key={contract.id}>
                      <td>
                        <div className="inline">
                          <SafeImage src={contract.image} alt="" className="tradein-thumb" />
                          <div>
                            <Link to={`/product/${contract.product_id}`} className="font-medium">{contract.title}</Link>
                            <div className="text-xs text-muted">{contract.condition} · hạn {formatDate(contract.expires_at)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="is-numeric">{formatPrice(contract.list_price)}</td>
                      <td><StatusBadge status={getConsignmentStatus(contract.status)} />{contract.expired && <div className="text-xs text-critical">Đã quá hạn ký gửi</div>}</td>
                      <td className="is-numeric">{contract.payout !== null ? formatPrice(contract.payout) : <span className="text-muted text-sm">~{formatPrice(contract.list_price * (1 - contract.commission_rate))}</span>}</td>
                      <td>{contract.status === 'dangban' && <button type="button" className="btn btn--plain text-sm" onClick={() => withdraw(contract)}>Rút đĩa</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {openId && <RequestDetail id={openId} policy={policy} onClose={() => openRequest(null)} onChanged={load} />}
    </div>
  );
}
