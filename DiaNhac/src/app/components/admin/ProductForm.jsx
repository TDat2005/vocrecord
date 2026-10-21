import { useState } from 'react';
import { SafeImage } from '../SafeImage';
import { MUSIC_GENRES, PRODUCT_CATEGORIES } from '../../utils/catalog';
import { PRODUCT_STATUS_OPTIONS } from '../../utils/status';

export const EMPTY_PRODUCT = {
  title: '',
  artist: '',
  genre: PRODUCT_CATEGORIES[0],
  music_genre: '',
  price: '',
  stock: '',
  year: new Date().getFullYear(),
  status: 'conhang',
  format: '',
  condition: '',
  package_info: '',
  tracklist: '',
  description: '',
  image: '/images/products/vinyl-01.webp',
};

// Form thêm / sửa sản phẩm. Có ô Mô tả: trước đây form sửa thiếu ô này nên mỗi lần lưu
// server ghi đè mô tả thành rỗng.
export function ProductForm({ initialValues = EMPTY_PRODUCT, submitLabel, submitting, onSubmit, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY_PRODUCT, ...initialValues });
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      ...form,
      price: Number(form.price) || 0,
      stock: Number.parseInt(form.stock, 10) || 0,
      year: Number.parseInt(form.year, 10) || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="admin-form-layout">
      <div className="stack">
        <section className="card form">
          <label className="field">
            <span className="label">Tên sản phẩm</span>
            <input className="input" required value={form.title} onChange={update('title')} />
          </label>
          <label className="field">
            <span className="label">Mô tả</span>
            <textarea className="textarea" rows={5} value={form.description || ''} onChange={update('description')} />
          </label>
          <div className="field-row">
            <label className="field">
              <span className="label">Nghệ sĩ / thương hiệu</span>
              <input className="input" required value={form.artist || ''} onChange={update('artist')} />
            </label>
            <label className="field">
              <span className="label">Năm phát hành / sản xuất</span>
              <input className="input" type="number" min={1900} max={2100} value={form.year || ''} onChange={update('year')} />
            </label>
          </div>
        </section>

        <section className="card form">
          <h2 className="card__title">Giá & tồn kho</h2>
          <div className="field-row">
            <label className="field">
              <span className="label">Giá bán (VNĐ)</span>
              <input className="input" type="number" min={0} step={1000} required value={form.price} onChange={update('price')} />
            </label>
            <label className="field">
              <span className="label">Số lượng tồn</span>
              <input className="input" type="number" min={0} required value={form.stock} onChange={update('stock')} />
            </label>
          </div>
        </section>

        <section className="card form">
          <h2 className="card__title">Thông tin đĩa</h2>
          <div className="field-row">
            <label className="field">
              <span className="label">Định dạng / phiên bản</span>
              <input className="input" value={form.format || ''} onChange={update('format')} placeholder='Ví dụ: Vinyl 12" 2LP' />
            </label>
            <label className="field">
              <span className="label">Tình trạng bìa / đĩa</span>
              <input className="input" value={form.condition || ''} onChange={update('condition')} placeholder="Ví dụ: Brand New (SS)" />
            </label>
          </div>
          <label className="field">
            <span className="label">Quy cách</span>
            <input className="input" value={form.package_info || ''} onChange={update('package_info')} placeholder="Ví dụ: 1 x Album" />
          </label>
          <label className="field">
            <span className="label">Tracklist (mỗi bài một dòng)</span>
            <textarea className="textarea" rows={5} value={form.tracklist || ''} onChange={update('tracklist')} placeholder="Chỉ nhập khi đã đối soát đúng phiên bản sản phẩm." />
          </label>
        </section>
      </div>

      <div className="stack">
        <section className="card form">
          <h2 className="card__title">Phân loại</h2>
          <label className="field">
            <span className="label">Trạng thái bán</span>
            <select className="select" value={form.status || 'conhang'} onChange={update('status')}>
              {PRODUCT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="label">Nhóm sản phẩm</span>
            <select className="select" required value={form.genre} onChange={update('genre')}>
              {PRODUCT_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="label">Thể loại nhạc</span>
            <select className="select" value={form.music_genre || ''} onChange={update('music_genre')}>
              <option value="">Không áp dụng</option>
              {MUSIC_GENRES.map((genre) => <option key={genre} value={genre}>{genre}</option>)}
            </select>
          </label>
        </section>

        <section className="card form">
          <h2 className="card__title">Hình ảnh</h2>
          <div className="image-preview">
            <SafeImage src={form.image} alt="Xem trước" />
          </div>
          <label className="field">
            <span className="label">Đường dẫn ảnh</span>
            <input className="input" required value={form.image || ''} onChange={update('image')} />
          </label>
        </section>

        <div className="admin-form-actions">
          {onCancel && <button type="button" className="btn btn--secondary" onClick={onCancel}>Hủy</button>}
          <button type="submit" className="btn btn--primary" disabled={submitting}>{submitting ? 'Đang lưu...' : submitLabel}</button>
        </div>
      </div>
    </form>
  );
}
