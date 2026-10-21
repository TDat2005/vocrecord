import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { AuthLayout } from '../components/AuthLayout';
import { useToast } from '../context/ToastContext';
import { api, NETWORK_ERROR } from '../utils/api';
import { isStaff, saveSession } from '../utils/auth';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  // Trang yêu cầu đăng nhập (thanh toán, đơn hàng...) truyền returnUrl để quay lại sau khi đăng nhập.
  const returnUrl = location.state?.returnUrl;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const data = await api.post('/auth/login', { username: username.trim(), password });
      if (!data.success) {
        toast.error(data.message || 'Đăng nhập thất bại');
        return;
      }
      saveSession(data.token, data.user);
      navigate(returnUrl || (isStaff(data.user) ? '/admin' : '/'), { replace: true });
    } catch {
      toast.error(NETWORK_ERROR);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Đăng nhập"
      subtitle="Đăng nhập để theo dõi đơn hàng và thanh toán nhanh hơn."
      footer={<>Chưa có tài khoản? <Link to="/register" className="link">Tạo tài khoản</Link></>}
    >
      <form onSubmit={handleSubmit} className="form">
        <label className="field">
          <span className="label">Email hoặc tên đăng nhập</span>
          <input className="input" type="text" required autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>
        <label className="field">
          <span className="inline inline--between">
            <span className="label">Mật khẩu</span>
            <Link to="/forgot-password" className="link text-sm">Quên mật khẩu?</Link>
          </span>
          <input className="input" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button type="submit" disabled={loading} className="btn btn--primary btn--lg btn--full">
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>
    </AuthLayout>
  );
}
