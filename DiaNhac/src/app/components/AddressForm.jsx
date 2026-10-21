import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { PHONE_PATTERN, PHONE_REGEX } from '../utils/format';
import { useToast } from '../context/ToastContext';
import { Modal } from './ui';

const EMPTY_FORM = {
  recipientName: '',
  recipientPhone: '',
  address: '',
  provinceId: '',
  provinceName: '',
  wardId: '',
  wardName: '',
  isDefault: false,
};

// Hộp thoại thêm địa chỉ giao hàng (dùng ở Thanh toán và Sổ địa chỉ).
// Danh sách tỉnh/phường lấy từ GHN qua server; nếu GHN chưa cấu hình thì cho nhập tay.
export function AddressFormModal({ title = 'Thêm địa chỉ giao hàng', submitLabel = 'Lưu địa chỉ', showDefault = false, submitting = false, onSubmit, onClose }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);

  useEffect(() => {
    api.get('/shipping/ghn/provinces')
      .then((data) => setProvinces(data.success ? data.data || [] : []))
      .catch(() => setProvinces([]));
  }, []);

  useEffect(() => {
    if (!form.provinceId) {
      setWards([]);
      return;
    }
    api.get(`/shipping/ghn/wards?province_id=${encodeURIComponent(form.provinceId)}`)
      .then((data) => setWards(data.success ? data.data || [] : []))
      .catch(() => setWards([]));
  }, [form.provinceId]);

  const update = (changes) => setForm((current) => ({ ...current, ...changes }));

  const handleSubmit = (event) => {
    event.preventDefault();
    const values = {
      ...form,
      recipientName: form.recipientName.trim(),
      recipientPhone: form.recipientPhone.trim(),
      address: form.address.trim(),
    };
    if (!PHONE_REGEX.test(values.recipientPhone)) {
      toast.error('Số điện thoại không hợp lệ (10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09).');
      return;
    }
    if (values.address.length < 10) {
      toast.error('Vui lòng nhập địa chỉ cụ thể hơn (tối thiểu 10 ký tự).');
      return;
    }
    onSubmit(values);
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={(
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>Hủy</button>
          <button type="submit" form="address-form" className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Đang lưu...' : submitLabel}
          </button>
        </>
      )}
    >
      <form id="address-form" onSubmit={handleSubmit} className="form">
        <div className="field-row">
          <label className="field">
            <span className="label">Tên người nhận</span>
            <input className="input" required minLength={2} value={form.recipientName} onChange={(e) => update({ recipientName: e.target.value })} placeholder="Nguyễn Văn A" />
          </label>
          <label className="field">
            <span className="label">Số điện thoại</span>
            <input
              className="input"
              type="tel"
              required
              pattern={PHONE_PATTERN}
              title="Số điện thoại Việt Nam gồm 10 chữ số, bắt đầu bằng 03, 05, 07, 08 hoặc 09"
              value={form.recipientPhone}
              onChange={(e) => update({ recipientPhone: e.target.value })}
              placeholder="0912345678"
            />
          </label>
        </div>
        <label className="field">
          <span className="label">Địa chỉ (số nhà, tên đường)</span>
          <input className="input" required minLength={10} value={form.address} onChange={(e) => update({ address: e.target.value })} placeholder="Số 54 Triều Khúc" />
        </label>
        <div className="field-row">
          <label className="field">
            <span className="label">Tỉnh / thành phố</span>
            {provinces.length > 0 ? (
              <select
                className="select"
                required
                value={form.provinceId}
                onChange={(e) => {
                  const option = provinces.find((province) => String(province._id) === e.target.value);
                  update({ provinceId: e.target.value, provinceName: option?.name || '', wardId: '', wardName: '' });
                }}
              >
                <option value="">Chọn tỉnh / thành</option>
                {provinces.map((province) => <option key={province._id} value={province._id}>{province.name}</option>)}
              </select>
            ) : (
              <input className="input" required value={form.provinceName} onChange={(e) => update({ provinceName: e.target.value })} placeholder="Hà Nội" />
            )}
          </label>
          <label className="field">
            <span className="label">Phường / xã</span>
            {wards.length > 0 ? (
              <select
                className="select"
                required
                value={form.wardId}
                onChange={(e) => {
                  const option = wards.find((ward) => String(ward._id) === e.target.value);
                  update({ wardId: e.target.value, wardName: option?.name || '' });
                }}
              >
                <option value="">Chọn phường / xã</option>
                {wards.map((ward) => <option key={ward._id} value={ward._id}>{ward.name}</option>)}
              </select>
            ) : (
              <input className="input" required value={form.wardName} onChange={(e) => update({ wardName: e.target.value })} placeholder="Phường Thanh Xuân Nam" disabled={provinces.length > 0 && !form.provinceId} />
            )}
          </label>
        </div>
        {showDefault && (
          <label className="checkbox-label">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => update({ isDefault: e.target.checked })} />
            Đặt làm địa chỉ mặc định
          </label>
        )}
      </form>
    </Modal>
  );
}
