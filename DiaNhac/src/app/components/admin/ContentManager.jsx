import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api, NETWORK_ERROR } from '../../utils/api';
import { formatDate } from '../../utils/format';
import { useBlogMeta } from '../../data/articles';
import { Badge, Modal } from '../ui';
import { PageHeader } from './PageHeader';

// Chuyên mục, độ khó lấy từ server (GET /blogs/meta) để form luôn khớp quy tắc kiểm tra ở server.
const EMPTY_FORM = {
  title: '', type: 'blog', status: 'nhap', category: '', difficulty: '',
  summary: '', duration: '', audience: '', tools: '', steps: '', content: '',
  image: '/images/products/catalog/a-love-supreme.jpg',
};

const stepsToText = (steps) => {
  if (Array.isArray(steps)) return steps.join('\n');
  if (!steps) return '';
  try {
    const parsed = JSON.parse(steps);
    return Array.isArray(parsed) ? parsed.join('\n') : String(steps);
  } catch {
    return String(steps);
  }
};

function ContentFormModal({ item, onClose, onSaved }) {
  const toast = useToast();
  const meta = useBlogMeta();
  const categoriesOf = (type) => meta?.categories[type] || [];
  const difficulties = meta?.difficulties || [];
  const [form, setForm] = useState(item ? {
    title: item.title || '',
    type: item.type || 'blog',
    status: item.status || 'nhap',
    category: item.category || '',
    difficulty: item.difficulty || '',
    summary: item.summary || '',
    duration: item.duration || '',
    audience: item.audience || '',
    tools: item.tools || '',
    steps: stepsToText(item.steps),
    content: item.content || '',
    image: item.image || '',
  } : EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const isGuide = form.type === 'huongdan';
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const changeType = (event) => {
    const type = event.target.value;
    setForm((current) => ({
      ...current,
      type,
      category: '',
      difficulty: '',
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      // Chưa chọn thì dùng mục đầu tiên đang hiển thị trong ô chọn.
      const payload = {
        ...form,
        category: form.category || categoriesOf(form.type)[0] || '',
        difficulty: isGuide ? (form.difficulty || difficulties[0] || '') : '',
        steps: isGuide ? form.steps : '',
      };
      const data = item ? await api.put(`/blogs/${item.id}`, payload) : await api.post('/blogs', payload);
      if (data.success) {
        toast.success(item ? 'Đã cập nhật bài viết' : 'Đã tạo bài viết');
        onSaved();
      } else {
        toast.error(data.message || 'Không thể lưu bài viết');
      }
    } catch {
      toast.error(NETWORK_ERROR);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      wide
      title={item ? `Sửa bài viết #${item.id}` : 'Bài viết mới'}
      onClose={onClose}
      footer={(
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>Hủy</button>
          <button type="submit" form="content-form" className="btn btn--primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu bài viết'}</button>
        </>
      )}
    >
      <form id="content-form" className="form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="label">Tiêu đề</span>
          <input className="input" required value={form.title} onChange={update('title')} />
        </label>
        <div className="field-row">
          <label className="field">
            <span className="label">Loại nội dung</span>
            <select className="select" value={form.type} onChange={changeType}>
              <option value="blog">Blog / kiến thức</option>
              <option value="huongdan">Hướng dẫn / quy trình</option>
            </select>
          </label>
          <label className="field">
            <span className="label">Trạng thái</span>
            <select className="select" value={form.status} onChange={update('status')}>
              <option value="daxuatban">Xuất bản</option>
              <option value="nhap">Bản nháp</option>
            </select>
          </label>
        </div>
        <div className="field-row">
          <label className="field">
            <span className="label">Chuyên mục</span>
            <select className="select" value={form.category || categoriesOf(form.type)[0] || ''} onChange={update('category')}>
              {categoriesOf(form.type).map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          {isGuide ? (
            <label className="field">
              <span className="label">Độ khó</span>
              <select className="select" value={form.difficulty || difficulties[0] || ''} onChange={update('difficulty')}>
                {difficulties.map((difficulty) => <option key={difficulty} value={difficulty}>{difficulty}</option>)}
              </select>
            </label>
          ) : (
            <label className="field">
              <span className="label">Thời gian đọc</span>
              <input className="input" value={form.duration} onChange={update('duration')} placeholder="Ví dụ: 5 phút" />
            </label>
          )}
        </div>
        <label className="field">
          <span className="label">Tóm tắt hiển thị ở thẻ bài</span>
          <input className="input" value={form.summary} onChange={update('summary')} placeholder="Một câu nói rõ bài này giúp người đọc làm gì" />
        </label>
        {isGuide && (
          <>
            <div className="field-row">
              <label className="field">
                <span className="label">Thời lượng thực hiện</span>
                <input className="input" value={form.duration} onChange={update('duration')} placeholder="Ví dụ: 10 phút" />
              </label>
              <label className="field">
                <span className="label">Đối tượng</span>
                <input className="input" value={form.audience} onChange={update('audience')} placeholder="Ví dụ: Người mới bắt đầu" />
              </label>
            </div>
            <label className="field">
              <span className="label">Dụng cụ cần có</span>
              <input className="input" value={form.tools} onChange={update('tools')} placeholder="Ví dụ: Chổi carbon, cân stylus" />
            </label>
            <label className="field">
              <span className="label">Các bước thực hiện (mỗi bước một dòng)</span>
              <textarea className="textarea" rows={5} value={form.steps} onChange={update('steps')} />
            </label>
          </>
        )}
        <label className="field">
          <span className="label">Nội dung</span>
          <textarea className="textarea" rows={10} required value={form.content} onChange={update('content')} />
        </label>
        <label className="field">
          <span className="label">Đường dẫn ảnh bìa</span>
          <input className="input" value={form.image} onChange={update('image')} />
        </label>
      </form>
    </Modal>
  );
}

export function ContentManager() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editing, setEditing] = useState(null); // null: đóng, {}: bài mới, object: sửa

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ status: statusFilter, limit: '100' });
      if (typeFilter !== 'all') params.set('type', typeFilter);
      const data = await api.get(`/blogs/manage?${params}`);
      if (data.success) setItems(data.data || []);
      else toast.error(data.message || 'Không thể tải bài viết');
    } catch {
      toast.error(NETWORK_ERROR);
    }
  }, [typeFilter, statusFilter, toast]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (item) => {
    if (!window.confirm(`Xóa bài "${item.title}"? Thao tác không thể hoàn tác.`)) return;
    try {
      const data = await api.del(`/blogs/${item.id}`);
      if (data.success) {
        toast.success('Đã xóa bài viết');
        load();
      } else {
        toast.error(data.message || 'Không thể xóa bài viết');
      }
    } catch {
      toast.error(NETWORK_ERROR);
    }
  };

  return (
    <>
      <PageHeader
        title="Blog & hướng dẫn"
        subtitle="Blog để chia sẻ kiến thức; hướng dẫn để dẫn người đọc qua một quy trình cụ thể."
        actions={<button type="button" className="btn btn--primary" onClick={() => setEditing({})}><Plus size={16} /> Bài viết mới</button>}
      />

      <section className="card card--flush">
        <div className="admin-toolbar">
          <select className="select select--sm" style={{ width: 'auto' }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Loại nội dung">
            <option value="all">Tất cả loại</option>
            <option value="blog">Blog</option>
            <option value="huongdan">Hướng dẫn</option>
          </select>
          <select className="select select--sm" style={{ width: 'auto' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Trạng thái">
            <option value="all">Tất cả trạng thái</option>
            <option value="daxuatban">Đã xuất bản</option>
            <option value="nhap">Bản nháp</option>
          </select>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Tiêu đề</th><th>Loại</th><th>Chuyên mục</th><th>Trạng thái</th><th>Ngày tạo</th><th /></tr></thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={6} className="table__empty">Chưa có bài viết phù hợp.</td></tr>}
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="font-medium" style={{ minWidth: '16rem' }}>{item.title}</td>
                  <td>{item.type === 'huongdan' ? 'Hướng dẫn' : 'Blog'}</td>
                  <td className="text-muted">{item.category || '—'}</td>
                  <td><Badge tone={item.status === 'daxuatban' ? 'success' : 'neutral'}>{item.status === 'daxuatban' ? 'Đã xuất bản' : 'Bản nháp'}</Badge></td>
                  <td className="nowrap text-muted">{formatDate(item.created_at)}</td>
                  <td>
                    <div className="table-actions">
                      {item.status === 'daxuatban' && (
                        <a href={`#/${item.type === 'huongdan' ? 'guide' : 'blog'}/${item.id}`} target="_blank" rel="noreferrer" className="icon-button icon-button--sm" aria-label="Xem trên cửa hàng"><ExternalLink size={16} /></a>
                      )}
                      <button type="button" className="icon-button icon-button--sm" onClick={() => setEditing(item)} aria-label="Sửa"><Pencil size={16} /></button>
                      <button type="button" className="icon-button icon-button--sm icon-button--critical" onClick={() => handleDelete(item)} aria-label="Xóa"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editing && (
        <ContentFormModal
          item={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </>
  );
}
