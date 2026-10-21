import { useCallback, useEffect, useState } from 'react';
import { Lock, Pencil, Plus, Unlock } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api, NETWORK_ERROR } from '../../utils/api';
import { useCurrentUser } from '../../utils/auth';
import { Badge, Modal } from '../ui';
import { PageHeader } from './PageHeader';

const EMPTY_FORM = { id: 0, account_id: 0, username: '', password: '', name: '', position: '', role: 'nhanvien' };
const ROLE_LABELS = { admin: 'Quản trị viên', nhanvien: 'Nhân viên bán hàng' };

function EmployeeFormModal({ initial, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const isNew = !form.id;
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      // Sửa: PUT /employees/:MaNV (body kèm account_id). Trước đây gọi nhầm POST /employees/:account_id nên không lưu được.
      const data = isNew ? await api.post('/employees', form) : await api.put(`/employees/${form.id}`, form);
      if (data.success) {
        toast.success(data.message || 'Đã lưu nhân viên');
        onSaved();
      } else {
        toast.error(data.message || 'Không thể lưu nhân viên');
      }
    } catch {
      toast.error(NETWORK_ERROR);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isNew ? 'Thêm nhân viên' : `Sửa nhân viên ${initial.name}`}
      onClose={onClose}
      footer={(
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>Hủy</button>
          <button type="submit" form="employee-form" className="btn btn--primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
        </>
      )}
    >
      <form id="employee-form" className="form" onSubmit={handleSubmit}>
        <div className="field-row">
          <label className="field">
            <span className="label">Tên đăng nhập</span>
            <input className="input" required disabled={!isNew} value={form.username} onChange={update('username')} autoComplete="off" />
          </label>
          <label className="field">
            <span className="label">Mật khẩu</span>
            <input className="input" type="password" required={isNew} minLength={6} value={form.password} onChange={update('password')} autoComplete="new-password" />
            {!isNew && <span className="help-text">Bỏ trống nếu không đổi.</span>}
          </label>
        </div>
        <label className="field">
          <span className="label">Họ và tên</span>
          <input className="input" required value={form.name} onChange={update('name')} />
        </label>
        <label className="field">
          <span className="label">Chức vụ</span>
          <input className="input" value={form.position} onChange={update('position')} placeholder="Kế toán, bán hàng..." />
        </label>
        <label className="field">
          <span className="label">Vai trò</span>
          <select className="select" value={form.role} onChange={update('role')}>
            <option value="nhanvien">{ROLE_LABELS.nhanvien}</option>
            <option value="admin">{ROLE_LABELS.admin}</option>
          </select>
        </label>
      </form>
    </Modal>
  );
}

export function Employees() {
  const toast = useToast();
  const currentUser = useCurrentUser();
  const [employees, setEmployees] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => {
    api.get('/employees').then((data) => { if (data.success) setEmployees(data.data || []); }).catch(() => toast.error(NETWORK_ERROR));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const toggleStatus = async (employee) => {
    const locking = Number(employee.status) === 1;
    if (!window.confirm(`${locking ? 'Khóa' : 'Mở khóa'} tài khoản ${employee.username}?`)) return;
    try {
      const data = await api.put(`/employees/${employee.account_id}/toggle`, { account_id: employee.account_id, status: locking ? 0 : 1 });
      if (data.success) {
        toast.success(data.message);
        load();
      } else {
        toast.error(data.message || 'Không thể cập nhật');
      }
    } catch {
      toast.error(NETWORK_ERROR);
    }
  };

  return (
    <>
      <PageHeader
        title="Nhân sự & phân quyền"
        actions={<button type="button" className="btn btn--primary" onClick={() => setEditing(EMPTY_FORM)}><Plus size={16} /> Thêm nhân viên</button>}
      />
      <section className="card card--flush">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Nhân viên</th><th>Tài khoản</th><th>Vai trò</th><th>Trạng thái</th><th /></tr></thead>
            <tbody>
              {employees.length === 0 && <tr><td colSpan={5} className="table__empty">Chưa có nhân viên.</td></tr>}
              {employees.map((employee) => {
                const active = Number(employee.status) === 1;
                const isSelf = Number(employee.account_id) === Number(currentUser?.id);
                return (
                  <tr key={employee.id}>
                    <td>
                      <div className="font-medium">{employee.name}</div>
                      <div className="text-xs text-muted">{employee.position || 'Chưa cập nhật chức vụ'}</div>
                    </td>
                    <td>{employee.username}</td>
                    <td>{ROLE_LABELS[employee.role] || employee.role}</td>
                    <td><Badge tone={active ? 'success' : 'critical'}>{active ? 'Hoạt động' : 'Đã khóa'}</Badge></td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="icon-button icon-button--sm"
                          onClick={() => setEditing({ id: employee.id, account_id: employee.account_id, username: employee.username, password: '', name: employee.name, position: employee.position || '', role: employee.role })}
                          aria-label={`Sửa ${employee.name}`}
                        >
                          <Pencil size={16} />
                        </button>
                        {!isSelf && (
                          <button
                            type="button"
                            className={`icon-button icon-button--sm ${active ? 'icon-button--critical' : ''}`}
                            onClick={() => toggleStatus(employee)}
                            aria-label={active ? `Khóa ${employee.username}` : `Mở khóa ${employee.username}`}
                          >
                            {active ? <Lock size={16} /> : <Unlock size={16} />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {editing && <EmployeeFormModal initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </>
  );
}
