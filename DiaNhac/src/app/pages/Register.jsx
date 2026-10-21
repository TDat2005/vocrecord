import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AuthLayout, Steps } from '../components/AuthLayout';
import { useToast } from '../context/ToastContext';
import { useCountdown } from '../hooks/useCountdown';
import { api, NETWORK_ERROR } from '../utils/api';
import { PHONE_PATTERN } from '../utils/format';

export function Register() {
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', password: '', confirmPassword: '' });
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useCountdown();

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const sendOtp = async () => {
    setLoading(true);
    try {
      const data = await api.post('/auth/send-register-otp', { email: form.email.trim() });
      if (data.success) {
        setStep(1);
        setCountdown(60);
        toast.success(`Đã gửi mã OTP tới ${form.email.trim()}`);
      } else {
        toast.error(data.message || 'Không thể gửi OTP');
      }
    } catch {
      toast.error(NETWORK_ERROR);
    } finally {
      setLoading(false);
    }
  };

  const handleInfoSubmit = (event) => {
    event.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp.');
      return;
    }
    sendOtp();
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const data = await api.post('/auth/verify-register-otp', {
        email: form.email.trim(),
        otp,
        password: form.password,
        fullname: form.fullName.trim(),
        phone: form.phone.trim(),
      });
      if (data.success) {
        toast.success('Đăng ký thành công! Mời bạn đăng nhập.');
        navigate('/login');
      } else {
        toast.error(data.message || 'Xác thực OTP thất bại');
      }
    } catch {
      toast.error(NETWORK_ERROR);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Tạo tài khoản"
      subtitle={step === 0 ? 'Mã OTP sẽ được gửi về email để xác thực.' : `Nhập mã gồm 6 số đã gửi tới ${form.email}.`}
      footer={<>Đã có tài khoản? <Link to="/login" className="link">Đăng nhập</Link></>}
    >
      <Steps steps={['Thông tin', 'Xác thực email']} current={step} />

      {step === 0 ? (
        <form onSubmit={handleInfoSubmit} className="form">
          <label className="field">
            <span className="label">Họ và tên</span>
            <input className="input" required autoComplete="name" value={form.fullName} onChange={update('fullName')} />
          </label>
          <label className="field">
            <span className="label">Số điện thoại</span>
            <input className="input" type="tel" required pattern={PHONE_PATTERN} title="Số điện thoại Việt Nam gồm 10 chữ số" autoComplete="tel" value={form.phone} onChange={update('phone')} />
          </label>
          <label className="field">
            <span className="label">Email</span>
            <input className="input" type="email" required autoComplete="email" value={form.email} onChange={update('email')} placeholder="example@gmail.com" />
          </label>
          <div className="field-row">
            <label className="field">
              <span className="label">Mật khẩu</span>
              <input className="input" type="password" required minLength={6} autoComplete="new-password" value={form.password} onChange={update('password')} />
            </label>
            <label className="field">
              <span className="label">Nhập lại mật khẩu</span>
              <input className="input" type="password" required minLength={6} autoComplete="new-password" value={form.confirmPassword} onChange={update('confirmPassword')} />
            </label>
          </div>
          <button type="submit" disabled={loading} className="btn btn--primary btn--lg btn--full">
            {loading ? 'Đang gửi mã...' : 'Tiếp tục'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="form">
          <label className="field">
            <span className="label">Mã OTP</span>
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
            {loading ? 'Đang xác thực...' : 'Xác nhận đăng ký'}
          </button>
          <div className="inline inline--between text-sm">
            <button type="button" className="btn btn--plain" onClick={() => { setStep(0); setOtp(''); }}>Sửa thông tin</button>
            {countdown > 0
              ? <span className="text-muted">Gửi lại mã sau {countdown}s</span>
              : <button type="button" className="btn btn--plain" onClick={sendOtp} disabled={loading}>Gửi lại mã</button>}
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
