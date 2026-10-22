import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api, NETWORK_ERROR } from '../../utils/api';
import { formatDate, formatPrice, toDateInputValue } from '../../utils/format';
import { Badge, Modal } from '../ui';
import { PageHeader } from './PageHeader';

const EMPTY_FORM = { MaGG: '', Code: '', LoaiGiamGia: 'percent', GiaTri: '', DonHangToiThieu: '', SoLuong: '', GioiHanMoiKhach: 1, NgayHetHan: '' };

function discountState(discount) {
  if (discount.NgayHetHan && new Date(discount.NgayHetHan).getTime() < Date.now()) return { label: 'Hết hạn', tone: 'neutral' };
  if (Number(discount.SoLuong) > 0 && Number(discount.DaDung) >= Number(discount.SoLuong)) return { label: 'Hết lượt', tone: 'neutral' };
  return { label: 'Đang hoạt động', tone: 'success' };
}

function DiscountFormModal({ initial, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const body = { ...form, NgayHetHan: form.NgayHetHan || null };
      const data = form.MaGG ? await api.put(`/discounts/${form.MaGG}`, body) : await api.post('/discounts', body);
      if (data.success) {
        toast.success(data.message || 'Đã lưu mã giảm giá');
        onSaved();
      } else {
        toast.error(data.message || 'Không thể lưu mã giảm giá');
      }
    } catch {
      toast.error(NETWORK_ERROR);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={form.MaGG ? `Sửa mã ${initial.Code}` : 'Tạo mã giảm giá'}
      onClose={onClose}
      footer={(
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>Hủy</button>
          <button type="submit" form="discount-form" className="btn btn--primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
        </>
      )}
    >
      <form id="discount-form" className="form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="label">Mã giảm giá</span>
          <input className="input" required value={form.Code} onChange={(e) => setForm({ ...form, Code: e.target.value.toUpperCase() })} placeholder="Ví dụ: TET2026" />
        </label>
        <div className="field-row">
          <label className="field">
            <span className="label">Loại giảm</span>
            <select className="select" value={form.LoaiGiamGia} onChange={update('LoaiGiamGia')}>
              <option value="percent">Phần trăm (%)</option>
              <option value="fixed">Số tiền cố định (VNĐ)</option>
            </select>
          </label>
          <label className="field">
            <span className="label">Giá trị</span>
            <input
              className="input"
              type="number"
              required
              min={1}
              max={form.LoaiGiamGia === 'percent' ? 100 : undefined}
              value={form.GiaTri}
              onChange={update('GiaTri')}
              placeholder={form.LoaiGiamGia === 'percent' ? '10' : '50000'}
            />
          </label>
        </div>
        <div className="field-row">
          <label className="field">
            <span className="label">Đơn tối thiểu (VNĐ)</span>
            <input className="input" type="number" min={0} required value={form.DonHangToiThieu} onChange={update('DonHangToiThieu')} placeholder="500000" />
          </label>
          <label className="field">
            <span className="label">Số lượt sử dụng</span>
            <input className="input" type="number" min={0} required value={form.SoLuong} onChange={update('SoLuong')} placeholder="100" />
            <span className="help-text">Nhập 0 nếu không giới hạn.</span>
          </label>
          <label className="field">
            <span className="label">Mỗi khách dùng tối đa</span>
            <input className="input" type="number" min={0} required value={form.GioiHanMoiKhach} onChange={update('GioiHanMoiKhach')} placeholder="1" />
            <span className="help-text">Tính trên đơn không bị hủy. 0 = không giới hạn.</span>
          </label>
        </div>
        <label className="field">
          <span className="label">Ngày hết hạn</span>
          <input className="input" type="date" value={form.NgayHetHan} onChange={update('NgayHetHan')} />
          <span className="help-text">Bỏ trống nếu không giới hạn thời gian.</span>
        </label>
      </form>
    </Modal>
  );
}

export function Discounts() {
  const toast = useToast();
  const [discounts, setDiscounts] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => {
    api.get('/discounts').then((data) => { if (data.success) setDiscounts(data.data || []); }).catch(() => toast.error(NETWORK_ERROR));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (discount) => {
    if (!window.confirm(`Xóa mã giảm giá ${discount.Code}?`)) return;
    try {
      const data = await api.del(`/discounts/${discount.MaGG}`);
      if (data.success) {
        toast.success('Đã xóa mã giảm giá');
        load();
      } else {
        toast.error(data.message || 'Không thể xóa');
      }
    } catch {
      toast.error(NETWORK_ERROR);
    }
  };

  const openEdit = (discount) => setEditing({
    MaGG: discount.MaGG,
    Code: discount.Code,
    LoaiGiamGia: discount.LoaiGiamGia,
    GiaTri: Number(discount.GiaTri),
    DonHangToiThieu: Number(discount.DonHangToiThieu),
    SoLuong: discount.SoLuong,
    GioiHanMoiKhach: discount.GioiHanMoiKhach ?? 1,
    // MySQL trả DATETIME dạng ISO ("2026-12-31T00:00:00.000Z"), input date cần "YYYY-MM-DD".
    NgayHetHan: toDateInputValue(discount.NgayHetHan),
  });

  return (
    <>
      <PageHeader
        title="Mã giảm giá"
        actions={<button type="button" className="btn btn--primary" onClick={() => setEditing(EMPTY_FORM)}><Plus size={16} /> Tạo mã giảm giá</button>}
      />
      <section className="card card--flush">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Mã</th><th>Giá trị</th><th className="is-numeric">Đơn tối thiểu</th><th className="is-numeric">Đã dùng</th><th>Hạn dùng</th><th>Trạng thái</th><th /></tr></thead>
            <tbody>
              {discounts.length === 0 && <tr><td colSpan={7} className="table__empty">Chưa có mã giảm giá.</td></tr>}
              {discounts.map((discount) => {
                const state = discountState(discount);
                return (
                  <tr key={discount.MaGG}>
                    <td className="font-semibold">{discount.Code}</td>
                    <td>{discount.LoaiGiamGia === 'percent' ? `${Number(discount.GiaTri)}%` : formatPrice(discount.GiaTri)}</td>
                    <td className="is-numeric">{formatPrice(discount.DonHangToiThieu)}</td>
                    <td className="is-numeric">{discount.DaDung} / {Number(discount.SoLuong) > 0 ? discount.SoLuong : '∞'}<div className="text-xs text-muted">mỗi khách {Number(discount.GioiHanMoiKhach ?? 1) > 0 ? discount.GioiHanMoiKhach ?? 1 : '∞'}</div></td>
                    <td className="nowrap">{discount.NgayHetHan ? formatDate(discount.NgayHetHan) : 'Không giới hạn'}</td>
                    <td><Badge tone={state.tone}>{state.label}</Badge></td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="icon-button icon-button--sm" onClick={() => openEdit(discount)} aria-label={`Sửa ${discount.Code}`}><Pencil size={16} /></button>
                        <button type="button" className="icon-button icon-button--sm icon-button--critical" onClick={() => handleDelete(discount)} aria-label={`Xóa ${discount.Code}`}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {editing && (
        <DiscountFormModal initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
    </>
  );
}
