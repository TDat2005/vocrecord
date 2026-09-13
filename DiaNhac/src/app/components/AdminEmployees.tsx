import { useState, useEffect } from 'react';
import { Users, Lock, Unlock, FileEdit } from 'lucide-react';
import { API_BASE } from '../config/api';
import '../../styles/pages/admin.css';


export function AdminEmployees() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ id: 0, account_id: 0, username: '', password: '', name: '', position: '', role: 'nhanvien', status: 1 });

  const fetchEmployees = () => {
    fetch(`${API_BASE}/employees`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` } }).then(res => res.json()).then(data => { if (data.success) setEmployees(data.data); }).catch(console.error);
  };

  useEffect(() => { fetchEmployees(); }, []);

  const handleToggleStatus = (account_id: number, currentStatus: number) => {
    if (!window.confirm(`Bạn có chắc muốn ${currentStatus === 1 ? 'KHOÁ' : 'MỞ KHOÁ'} tài khoản này?`)) return;
    fetch(`${API_BASE}/employees/${account_id}/toggle`, { method: 'PUT', headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,  'Content-Type': 'application/json'  }, body: JSON.stringify({ account_id, status: currentStatus === 1 ? 0 : 1 }) })
    .then(res => res.json()).then(data => { alert(data.message); if(data.success) fetchEmployees(); });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const action = formData.id === 0 ? 'create' : 'update';
    fetch(`${API_BASE}/employees${action === 'create' ? '' : `/${formData.account_id}`}`, { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,  'Content-Type': 'application/json'  }, body: JSON.stringify(formData) })
    .then(res => res.json()).then(data => { if (data.success) { alert(data.message); setShowModal(false); fetchEmployees(); } else { alert(data.message); } });
  };

  const openEditModal = (emp: any) => {
    setFormData({ id: emp.id, account_id: emp.account_id, username: emp.username, password: '', name: emp.name, position: emp.position || '', role: emp.role, status: emp.status });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setFormData({ id: 0, account_id: 0, username: '', password: '', name: '', position: '', role: 'nhanvien', status: 1 });
    setShowModal(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="admin-section-header">
        <h2><Users style={{ width: 32, height: 32 }} /> Nhân Sự & Quyền</h2>
        <button onClick={openCreateModal} className="neo-btn neo-btn--primary">+ Thêm Nhân Viên</button>
      </div>

      <div className="admin-emp-table">
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Tài Khoản</th>
                <th>Nhân Viên</th>
                <th>Vai Trò</th>
                <th>Trạng Thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td style={{ textTransform: 'uppercase' }}>{emp.username}</td>
                  <td>
                    <div>{emp.name}</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 400, color: 'var(--gray-600)' }}>{emp.position || 'Chưa cập nhật'}</div>
                  </td>
                  <td style={{ textTransform: 'uppercase', color: '#7c3aed' }}>{emp.role}</td>
                  <td>
                    {emp.status == 1
                      ? <span className="emp-status-active">HOẠT ĐỘNG</span>
                      : <span className="emp-status-locked">BỊ KHOÁ</span>
                    }
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => openEditModal(emp)} className="emp-action-btn emp-action-edit" title="Sửa thông tin">
                        <FileEdit style={{ width: 20, height: 20 }} />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(emp.account_id, emp.status)}
                        className={`emp-action-btn ${emp.status == 1 ? 'emp-action-lock' : 'emp-action-unlock'}`}
                        title={emp.status == 1 ? 'Khoá tài khoản' : 'Mở khoá'}
                      >
                        {emp.status == 1 ? <Lock style={{ width: 20, height: 20 }} /> : <Unlock style={{ width: 20, height: 20 }} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="neo-modal-overlay">
          <div className="neo-modal" style={{ maxWidth: '32rem' }}>
            <h3 className="neo-modal-title" style={{ borderBottom: '4px solid #000', paddingBottom: '0.5rem' }}>
              {formData.id === 0 ? 'Thêm Nhân Viên' : 'Sửa Thông Tin'}
            </h3>
            <form onSubmit={handleSave} className="auth-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="neo-label">Username</label>
                  <input type="text" disabled={formData.id !== 0} value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} required className="neo-input" />
                </div>
                <div className="form-group">
                  <label className="neo-label">Password {formData.id !== 0 && '(Bỏ trống nếu không đổi)'}</label>
                  <input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required={formData.id === 0} className="neo-input" />
                </div>
              </div>
              <div className="form-group">
                <label className="neo-label">Họ & Tên</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required className="neo-input" />
              </div>
              <div className="form-group">
                <label className="neo-label">Chức Vụ</label>
                <input type="text" value={formData.position} onChange={(e) => setFormData({...formData, position: e.target.value})} placeholder="Kế toán, Bán hàng..." className="neo-input" />
              </div>
              <div className="form-group">
                <label className="neo-label">Gán Quyền</label>
                <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="neo-input">
                  <option value="nhanvien">Nhân Viên Bán Hàng</option>
                  <option value="admin">Quản Trị Viên (Admin)</option>
                </select>
              </div>
              <div className="neo-modal-actions" style={{ borderTop: '2px dashed #000', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <button type="submit" className="neo-btn neo-btn--yellow shadow-neo-sm" style={{ flex: 1 }}>Lưu Lại</button>
                <button type="button" onClick={() => setShowModal(false)} className="neo-btn neo-btn--secondary" style={{ flex: 1 }}>Huỷ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
