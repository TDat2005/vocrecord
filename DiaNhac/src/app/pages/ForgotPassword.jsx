import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AuthLayout, Steps } from '../components/AuthLayout';
import { useToast } from '../context/ToastContext';
import { useCountdown } from '../hooks/useCountdown';
import { api, NETWORK_ERROR } from '../utils/api';

const SUBTITLES = [
  'Nhập email đã đăng ký để nhận mã xác thực.',
  'Nhập mã gồm 6 số vừa được gửi tới email của bạn.',
  'Tạo mật khẩu mới cho tài khoản.',
];

export function ForgotPassword() {
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useCountdown();

  // Gọi API, hiện lỗi nếu thất bại, trả về dữ liệu khi thành công.
  const request = async (path, body) => {
    setLoading(true);
    try {
      const data = await api.post(path, body);
      if (!data.success) toast.error(data.message || 'Có lỗi xảy ra');
      return data.success ? data : null;
    } catch {
      toast.error(NETWORK_ERROR);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async () => {
    const data = await request('/auth/send-forgot-otp', { email: email.trim() });
    if (data) {
      setStep(1);
      setCountdown(60);
      toast.success(data.message);
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    if (await request('/auth/verify-forgot-otp', { email: email.trim(), otp })) setStep(2);
  };

  const handleReset = async (event) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (await request('/auth/reset-password', { email: email.trim(), otp, new_password: newPassword })) {
      toast.success('Đổi mật khẩu thành công! Mời bạn đăng nhập.');
      navigate('/login');
    }
  };

  return (
    <AuthLayout
      title="Khôi phục mật khẩu"
      subtitle={SUBTITLES[step]}
      footer={<Link to="/login" className="link">Quay về đăng nhập</Link>}
    >
      <Steps steps={['Email', 'Mã OTP', 'Mật khẩu mới']} current={step} />

      {step === 0 && (
        <form onSubmit={(event) => { event.preventDefault(); sendOtp(); }} className="form">
          <label className="field">
            <span className="label">Email</span>
            <input className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
          </label>
          <button type="submit" disabled={loading} className="btn btn--primary btn--lg btn--full">
            {loading ? 'Đang gửi...' : 'Gửi mã xác thực'}
          </button>
        </form>
      )}

      {step === 1 && (
        <form onSubmit={handleVerify} className="form">
          <label className="field">
            <span className="label">Mã OTP gửi tới {email}</span>
            <input
              className="input otp-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
              autoFocus
            />
            <span className="help-text">Mã có hiệu lực trong 5 phút. Hãy kiểm tra cả thư mục Spam.</span>
          </label>
          <button type="submit" disabled={loading || otp.length !== 6} className="btn btn--primary btn--lg btn--full">
            {loading ? 'Đang xác thực...' : 'Xác nhận'}
          </button>
          <div className="inline inline--between text-sm">
            <button type="button" className="btn btn--plain" onClick={() => setStep(0)}>Đổi email</button>
            {countdown > 0
              ? <span className="text-muted">Gửi lại mã sau {countdown}s</span>
              : <button type="button" className="btn btn--plain" onClick={sendOtp} disabled={loading}>Gửi lại mã</button>}
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleReset} className="form">
          <label className="field">
            <span className="label">Mật khẩu mới</span>
            <input className="input" type="password" required minLength={6} autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <span className="help-text">Tối thiểu 6 ký tự.</span>
          </label>
          <label className="field">
            <span className="label">Nhập lại mật khẩu mới</span>
            <input className="input" type="password" required minLength={6} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </label>
          <button type="submit" disabled={loading} className="btn btn--primary btn--lg btn--full">
            {loading ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
