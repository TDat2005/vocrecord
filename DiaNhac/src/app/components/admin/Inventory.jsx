import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api, NETWORK_ERROR } from '../../utils/api';
import { formatPrice } from '../../utils/format';
import { PRODUCT_STATUS_OPTIONS } from '../../utils/status';
import { SafeImage } from '../SafeImage';
import { Badge, Modal } from '../ui';
import { PageHeader } from './PageHeader';
import { ProductForm } from './ProductForm';

const STATUS_LABELS = Object.fromEntries(PRODUCT_STATUS_OPTIONS.map((option) => [option.value, option.label]));

// Phiếu nhập kho nhiều dòng (thay cho hộp thoại prompt() nhập "mã:số lượng").
function ImportStockModal({ products, onClose, onImported }) {
  const toast = useToast();
  const [rows, setRows] = useState([{ id: '', qty: 1, price: 0 }]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const updateRow = (index, changes) => setRows((current) => current.map((row, i) => (i === index ? { ...row, ...changes } : row)));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const items = rows.map((row) => ({ id: Number(row.id), qty: Number(row.qty), price: Number(row.price) || 0 }));
      const data = await api.post('/admin/import-stock', { items, note });
      if (data.success) {
        toast.success(data.message || 'Nhập kho thành công');
        onImported();
      } else {
        toast.error(data.message || 'Không thể nhập kho');
      }
    } catch {
      toast.error(NETWORK_ERROR);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Tạo phiếu nhập kho"
      wide
      onClose={onClose}
      footer={(
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>Hủy</button>
          <button type="submit" form="import-form" className="btn btn--primary" disabled={submitting}>{submitting ? 'Đang lưu...' : 'Lưu phiếu nhập'}</button>
        </>
      )}
    >
      <form id="import-form" className="form" onSubmit={handleSubmit}>
        {rows.map((row, index) => (
          <div key={index} className="import-row">
            <label className="field">
              <span className="label">Sản phẩm</span>
              <select className="select" required value={row.id} onChange={(e) => updateRow(index, { id: e.target.value })}>
                <option value="">Chọn sản phẩm</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>SP-{product.id} · {product.name} (tồn {product.stock})</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="label">Số lượng</span>
              <input className="input" type="number" min={1} required value={row.qty} onChange={(e) => updateRow(index, { qty: e.target.value })} />
            </label>
            <label className="field">
              <span className="label">Giá nhập</span>
              <input className="input" type="number" min={0} step={1000} value={row.price} onChange={(e) => updateRow(index, { price: e.target.value })} />
            </label>
            <button
              type="button"
              className="icon-button icon-button--critical"
              onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
              disabled={rows.length === 1}
              aria-label="Xóa dòng"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <div>
          <button type="button" className="btn btn--plain" onClick={() => setRows((current) => [...current, { id: '', qty: 1, price: 0 }])}>
            + Thêm dòng
          </button>
        </div>
        <label className="field">
          <span className="label">Ghi chú phiếu nhập</span>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ví dụ: Nhập hàng từ nhà phân phối A" />
        </label>
      </form>
    </Modal>
  );
}

export function Inventory() {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const load = useCallback(() => {
    api.get('/admin/inventory').then((data) => { if (data.success) setProducts(data.data || []); }).catch(() => toast.error(NETWORK_ERROR));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const startEdit = async (id) => {
    try {
      const data = await api.get(`/products/${id}`);
      if (data.success) setEditing(data.data);
      else toast.error(data.message || 'Không tải được sản phẩm');
    } catch {
      toast.error(NETWORK_ERROR);
    }
  };

  const handleSave = async (values) => {
    setSaving(true);
    try {
      const data = await api.put(`/products/${editing.id}`, values);
      if (data.success) {
        toast.success('Đã cập nhật sản phẩm');
        setEditing(null);
        load();
      } else {
        toast.error(data.message || 'Không thể cập nhật');
      }
    } catch {
      toast.error(NETWORK_ERROR);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Ngừng kinh doanh "${product.name}"? Sản phẩm sẽ ẩn khỏi cửa hàng nhưng vẫn giữ lịch sử đơn hàng.`)) return;
    try {
      const data = await api.del(`/products/${product.id}`);
      if (data.success) {
        toast.success(data.message || 'Đã ngừng kinh doanh sản phẩm');
        load();
      } else {
        toast.error(data.message || 'Không thể xóa sản phẩm');
      }
    } catch {
      toast.error(NETWORK_ERROR);
    }
  };

  if (editing) {
    return (
      <>
        <PageHeader title={`Sửa sản phẩm SP-${editing.id}`} subtitle={editing.title} />
        <ProductForm initialValues={editing} submitLabel="Lưu thay đổi" submitting={saving} onSubmit={handleSave} onCancel={() => setEditing(null)} />
      </>
    );
  }

  const keyword = query.trim().toLowerCase();
  const visible = products.filter((product) => !keyword
    || String(product.name).toLowerCase().includes(keyword)
    || String(product.id).includes(keyword));

  return (
    <>
      <PageHeader
        title="Kho hàng"
        subtitle={`${products.length} sản phẩm`}
        actions={<button type="button" className="btn btn--primary" onClick={() => setShowImport(true)}><Plus size={16} /> Nhập kho</button>}
      />

      <section className="card card--flush">
        <div className="admin-toolbar">
          <label className="admin-search">
            <Search size={16} />
            <input className="input input--sm" type="search" placeholder="Tìm theo tên hoặc mã sản phẩm" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Sản phẩm</th><th>Phân loại</th><th>Trạng thái</th><th className="is-numeric">Tồn kho</th><th className="is-numeric">Giá bán</th><th /></tr>
            </thead>
            <tbody>
              {visible.length === 0 && <tr><td colSpan={6} className="table__empty">Không tìm thấy sản phẩm.</td></tr>}
              {visible.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="table-product">
                      <SafeImage src={product.image} alt="" />
                      <span>
                        <span className="font-medium line-clamp-1">{product.name}</span>
                        <span className="text-xs text-muted">SP-{product.id}</span>
                      </span>
                    </div>
                  </td>
                  <td className="text-muted">{product.genre || '—'}</td>
                  <td>
                    <Badge tone={product.status === 'ngungkinhdoanh' ? 'neutral' : product.status === 'hethang' ? 'critical' : product.status === 'saphethang' ? 'warning' : 'success'}>
                      {STATUS_LABELS[product.status] || product.status}
                    </Badge>
                  </td>
                  <td className="is-numeric">
                    {Number(product.stock) > 0 ? product.stock : <span className="text-critical">Hết hàng</span>}
                  </td>
                  <td className="is-numeric">{formatPrice(product.price)}</td>
                  <td>
                    <div className="table-actions">
                      <button type="button" className="icon-button icon-button--sm" onClick={() => startEdit(product.id)} aria-label={`Sửa ${product.name}`}><Pencil size={16} /></button>
                      {product.status !== 'ngungkinhdoanh' && (
                        <button type="button" className="icon-button icon-button--sm icon-button--critical" onClick={() => handleDelete(product)} aria-label={`Ngừng kinh doanh ${product.name}`}><Trash2 size={16} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showImport && (
        <ImportStockModal
          products={products.filter((product) => product.status !== 'ngungkinhdoanh')}
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); load(); }}
        />
      )}
    </>
  );
}
