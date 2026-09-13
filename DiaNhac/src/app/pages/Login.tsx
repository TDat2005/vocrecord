import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { API_BASE } from '../config/api';
import { ScrollToTop } from '../components/ScrollToTop';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,  'Content-Type': 'application/json'  },
        body: JSON.stringify({ username: email, password })
      });
      const data = await response.json();
      setIsLoading(false);

      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/');
      } else {
        alert(data.message || 'Đăng nhập thất bại!');
      }
    } catch {
      setIsLoading(false);
      alert('Lỗi kết nối máy chủ!');
    }
  };

  return (
    <div className="auth-page page--yellow">
      <ScrollToTop />
      <div className="auth-container">
        {/* Logo */}
        <div className="auth-logo">
          <Link to="/" className="auth-logo-link">
            <h1 className="auth-logo-title" style={{ fontFamily: 'var(--font-heading)' }}>VỌC RECORDS</h1>
          </Link>
          <p className="auth-logo-subtitle">ĐĂNG NHẬP VÀO TÀI KHOẢN</p>
        </div>

        <div className="auth-card">
          <h2 className="auth-card-title" style={{ fontFamily: 'var(--font-heading)', borderBottom: '2px solid #000', paddingBottom: '1rem' }}>
            Xin Chào!
          </h2>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email" className="neo-label">Tên Đăng Nhập / Email *</label>
              <input
                id="email" type="text"
                onChange={(e) => setEmail(e.target.value)}
                className="neo-input neo-input--yellow-focus"
                placeholder="Tài khoản hoặc email..."
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="neo-label">Mật Khẩu *</label>
              <input
                id="password" type="password" required value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="neo-input neo-input--yellow-focus"
              />
            </div>

            <div style={{ textAlign: 'right' }}>
              <Link to="/forgot-password" style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.875rem', textDecoration: 'underline' }}>
                Quên mật khẩu?
              </Link>
            </div>

            <button type="submit" disabled={isLoading} className="neo-btn neo-btn--primary neo-btn--full">
              {isLoading ? 'ĐANG ĐĂNG NHẬP...' : 'ĐĂNG NHẬP'}
            </button>
          </form>

          <div className="auth-divider">
            <p className="auth-divider-text">Chưa có tài khoản?</p>
            <Link to="/register" className="neo-btn neo-btn--yellow neo-btn--full">
              ĐĂNG KÝ NGAY
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
