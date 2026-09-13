import { useState, useEffect } from 'react';
import { Tag, Plus, Edit2, Trash2 } from 'lucide-react';
import { API_BASE } from '../config/api';
import '../../styles/pages/admin.css';


export function AdminDiscounts() {
    const [discounts, setDiscounts] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ MaGG: '', Code: '', LoaiGiamGia: 'percent', GiaTri: '', DonHangToiThieu: '', SoLuong: '', NgayHetHan: '' });

    useEffect(() => { fetchDiscounts(); }, []);

    const fetchDiscounts = () => {
        fetch(`${API_BASE}/discounts`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` } }).then(res => res.json()).then(data => { if (data.success) setDiscounts(data.data); });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const action = formData.MaGG ? 'update' : 'create';
        const method = formData.MaGG ? 'PUT' : 'POST';
        fetch(`${API_BASE}/discounts${action === 'create' ? '' : `/${formData.MaGG}`}`, { method, headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,  'Content-Type': 'application/json'  }, body: JSON.stringify(formData) })
        .then(res => res.json()).then(data => { if (data.success) { alert(data.message); setShowModal(false); fetchDiscounts(); } else { alert(data.message); } });
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Bạn có chắc muốn xoá mã giảm giá này?")) {
            fetch(`${API_BASE}/discounts/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` } }).then(res => res.json()).then(data => { alert(data.message); if (data.success) fetchDiscounts(); });
        }
    };

    const handleEdit = (d: any) => {
        setFormData({ MaGG: d.MaGG, Code: d.Code, LoaiGiamGia: d.LoaiGiamGia, GiaTri: d.GiaTri, DonHangToiThieu: d.DonHangToiThieu, SoLuong: d.SoLuong, NgayHetHan: d.NgayHetHan ? d.NgayHetHan.split(' ')[0] : '' });
        setShowModal(true);
    };

    const handleAdd = () => {
        setFormData({ MaGG: '', Code: '', LoaiGiamGia: 'percent', GiaTri: '', DonHangToiThieu: '', SoLuong: '', NgayHetHan: '' });
        setShowModal(true);
    };

    return (
        <div>
            <div className="flex-between" style={{ marginBottom: '1.5rem', borderBottom: '2px solid #000', paddingBottom: '1rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 900, textTransform: 'uppercase' }}>Mã Giảm Giá</h1>
                <button onClick={handleAdd} className="neo-btn neo-btn--primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus style={{ width: 20, height: 20 }} /> THÊM MÃ MỚI
                </button>
            </div>

            <div className="admin-table-box" style={{ padding: 0 }}>
                <div style={{ overflowX: 'auto' }}>
                    <table className="admin-table">
                        <thead>
                            <tr style={{ background: 'var(--gray-100)', color: '#000', fontSize: '0.875rem' }}>
                                <th>Code</th><th>Loại</th><th>Giá Trị</th><th>ĐH Tối Thiểu</th><th>SL / Đã Dùng</th><th>Hạn Dùng</th><th style={{ textAlign: 'center' }}>Hành Động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {discounts.map(d => (
                                <tr key={d.MaGG} style={{ borderBottom: '2px dashed var(--gray-200)', textTransform: 'uppercase', fontSize: '0.875rem' }}>
                                    <td style={{ color: '#db2777', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Tag style={{ width: 16, height: 16 }} /> {d.Code}</td>
                                    <td>{d.LoaiGiamGia === 'percent' ? '%' : 'VNĐ'}</td>
                                    <td>{d.GiaTri}</td>
                                    <td>{d.DonHangToiThieu}</td>
                                    <td>{d.SoLuong} / <span style={{ color: 'var(--color-danger)' }}>{d.DaDung}</span></td>
                                    <td>{d.NgayHetHan ? d.NgayHetHan.split(' ')[0] : 'Không hạn'}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                            <button onClick={() => handleEdit(d)} className="emp-action-btn emp-action-edit" title="Sửa"><Edit2 style={{ width: 16, height: 16 }} /></button>
                                            <button onClick={() => handleDelete(d.MaGG)} className="emp-action-btn" style={{ color: 'var(--color-danger)', border: '2px solid #000' }} title="Xóa"><Trash2 style={{ width: 16, height: 16 }} /></button>
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
                    <div className="neo-modal">
                        <h2 className="neo-modal-title">{formData.MaGG ? 'Sửa Mã' : 'Thêm Mã Mới'}</h2>
                        <form onSubmit={handleSubmit} className="auth-form" style={{ textTransform: 'uppercase', fontSize: '0.875rem' }}>
                            <div className="form-group"><label className="neo-label">Mã Code (CODE)</label><input required type="text" value={formData.Code} onChange={e => setFormData({...formData, Code: e.target.value.toUpperCase()})} className="neo-input" placeholder="VD: TET2025" /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="neo-label">Loại</label>
                                    <select value={formData.LoaiGiamGia} onChange={e => setFormData({...formData, LoaiGiamGia: e.target.value})} className="neo-input">
                                        <option value="percent">% (Phần trăm)</option><option value="fixed">Tiền Mặt (VNĐ)</option>
                                    </select>
                                </div>
                                <div className="form-group"><label className="neo-label">Giá trị</label><input required type="number" value={formData.GiaTri} onChange={e => setFormData({...formData, GiaTri: e.target.value})} className="neo-input" placeholder="VD: 10" /></div>
                            </div>
                            <div className="form-group"><label className="neo-label">Đơn tối thiểu (VNĐ)</label><input required type="number" value={formData.DonHangToiThieu} onChange={e => setFormData({...formData, DonHangToiThieu: e.target.value})} className="neo-input" placeholder="VD: 500000" /></div>
                            <div className="form-group"><label className="neo-label">Số lượng giới hạn</label><input required type="number" value={formData.SoLuong} onChange={e => setFormData({...formData, SoLuong: e.target.value})} className="neo-input" placeholder="VD: 100" /></div>
                            <div className="form-group"><label className="neo-label">Ngày hết hạn</label><input type="date" value={formData.NgayHetHan} onChange={e => setFormData({...formData, NgayHetHan: e.target.value})} className="neo-input" /></div>
                            <div className="neo-modal-actions">
                                <button type="submit" className="neo-btn neo-btn--primary" style={{ flex: 1 }}>LƯU TRỮ</button>
                                <button type="button" onClick={() => setShowModal(false)} className="neo-btn neo-btn--secondary" style={{ flex: 1 }}>HỦY BỎ</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
