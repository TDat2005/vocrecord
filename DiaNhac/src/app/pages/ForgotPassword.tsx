import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Mail, Lock, Shield, ArrowLeft } from 'lucide-react';
import { API_BASE } from '../config/api';
import { ScrollToTop } from '../components/ScrollToTop';


type Step = 'find-account' | 'verify-otp' | 'new-password';

export function ForgotPassword() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>('find-account');
  const [accountInput, setAccountInput] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => { setCountdown((prev) => { if (prev <= 1) { clearInterval(timer); return 0; } return prev - 1; }); }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleFindAccount = async (e: React.FormEvent) => {
    e.preventDefault(); setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/send-forgot-otp`, { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,  'Content-Type': 'application/json'  }, body: JSON.stringify({ email: accountInput }) });
      const data = await response.json(); setIsLoading(false);
      if (data.success) { setCurrentStep('verify-otp'); setCountdown(60); } else { alert(data.message || 'Có lỗi xảy ra!'); }
    } catch { setIsLoading(false); alert('Lỗi kết nối máy chủ!'); }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault(); setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/verify-forgot-otp`, { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,  'Content-Type': 'application/json'  }, body: JSON.stringify({ email: accountInput, otp }) });
      const data = await response.json(); setIsLoading(false);
      if (data.success) { setCurrentStep('new-password'); } else { alert(data.message || 'Mã OTP không đúng!'); }
    } catch { setIsLoading(false); alert('Lỗi kết nối máy chủ!'); }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { alert('Mật khẩu xác nhận không khớp!'); return; }
    if (newPassword.length < 6) { alert('Mật khẩu phải có ít nhất 6 ký tự!'); return; }
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/reset-password`, { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,  'Content-Type': 'application/json'  }, body: JSON.stringify({ email: accountInput, otp, new_password: newPassword }) });
      const data = await response.json(); setIsLoading(false);
      if (data.success) { alert('ĐỔI MẬT KHẨU THÀNH CÔNG!'); navigate('/login'); } else { alert(data.message || 'Có lỗi xảy ra!'); }
    } catch { setIsLoading(false); alert('Lỗi kết nối máy chủ!'); }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    try {
      const response = await fetch(`${API_BASE}/auth/send-forgot-otp`, { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,  'Content-Type': 'application/json'  }, body: JSON.stringify({ email: accountInput }) });
      const data = await response.json();
      if (data.success) { setCountdown(60); alert('Đã gửi lại mã OTP!'); }
    } catch { alert('Lỗi kết nối!'); }
  };

  return (
    <div className="auth-page page--orange">
      <ScrollToTop />
      <div className="auth-container">
        <div className="auth-logo">
          <Link to="/" className="auth-logo-link">
            <h1 className="auth-logo-title" style={{ fontFamily: 'var(--font-heading)' }}>VỌC RECORDS</h1>
          </Link>
          <p className="auth-logo-subtitle">KHÔI PHỤC MẬT KHẨU</p>
        </div>

        {/* Progress Steps */}
        <div className="progress-steps">
          <div className={`progress-step ${currentStep === 'find-account' ? 'progress-step--active' : 'progress-step--done'}`}>
            {currentStep !== 'find-account' ? '✓' : '1'} Email
          </div>
          <div className="progress-line"></div>
          <div className={`progress-step ${currentStep === 'verify-otp' ? 'progress-step--active' : currentStep === 'new-password' ? 'progress-step--done' : 'progress-step--inactive'}`}>
            {currentStep === 'new-password' ? '✓' : '2'} OTP
          </div>
          <div className="progress-line"></div>
          <div className={`progress-step ${currentStep === 'new-password' ? 'progress-step--active' : 'progress-step--inactive'}`}>
            3 Mật khẩu
          </div>
        </div>

        <div className="auth-card">
          {currentStep === 'find-account' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <Mail style={{ width: 64, height: 64, margin: '0 auto 1rem' }} />
                <h2 className="auth-card-title" style={{ fontFamily: 'var(--font-heading)' }}>Tìm Tài Khoản</h2>
                <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--gray-600)' }}>NHẬP EMAIL ĐĂNG KÝ ĐỂ NHẬN MÃ XÁC THỰC OTP</p>
              </div>
              <form onSubmit={handleFindAccount} className="auth-form">
                <div className="form-group">
                  <label htmlFor="account" className="neo-label">Địa chỉ Email *</label>
                  <input id="account" type="email" value={accountInput} onChange={(e) => setAccountInput(e.target.value)} placeholder="email@example.com" required className="neo-input neo-input--orange-focus" />
                </div>
                <button type="submit" disabled={isLoading} className="neo-btn neo-btn--primary neo-btn--full">
                  {isLoading ? 'ĐANG GỬI...' : 'GỬI MÃ XÁC THỰC OTP'}
                </button>
              </form>
            </>
          )}

          {currentStep === 'verify-otp' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <Shield style={{ width: 64, height: 64, margin: '0 auto 1rem' }} />
                <h2 className="auth-card-title" style={{ fontFamily: 'var(--font-heading)' }}>Nhập Mã OTP</h2>
                <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--gray-600)' }}>MÃ XÁC THỰC ĐÃ GỬI ĐẾN <span style={{ color: '#ea580c', fontSize: '1rem' }}>{accountInput}</span></p>
              </div>
              <form onSubmit={handleVerifyOTP} className="auth-form">
                <div className="form-group">
                  <label htmlFor="otp" className="neo-label" style={{ textAlign: 'center' }}>Nhập mã OTP (6 số)</label>
                  <input id="otp" type="text" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="● ● ● ● ● ●" required maxLength={6} className="otp-input neo-input--orange-focus" autoFocus />
                </div>
                <div style={{ textAlign: 'center', fontSize: '0.875rem', fontWeight: 700 }}>
                  {countdown > 0 ? (
                    <p style={{ color: 'var(--gray-600)', textTransform: 'uppercase' }}>Gửi lại mã sau <span style={{ color: '#ea580c', fontSize: '1.125rem' }}>{countdown}s</span></p>
                  ) : (
                    <button type="button" onClick={handleResendOTP} style={{ color: '#ea580c', fontWeight: 700, textTransform: 'uppercase', textDecoration: 'underline', background: 'none', border: 'none' }}>Gửi lại mã OTP</button>
                  )}
                </div>
                <p className="otp-note otp-note--red">⏱ Mã OTP có hiệu lực trong 5 phút. Kiểm tra cả mục Spam/Junk.</p>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="button" onClick={() => setCurrentStep('find-account')} className="neo-btn neo-btn--secondary" style={{ flex: 1 }}>
                    <ArrowLeft style={{ width: 20, height: 20 }} /> Quay lại
                  </button>
                  <button type="submit" disabled={isLoading || otp.length !== 6} className="neo-btn neo-btn--primary" style={{ flex: 1 }}>
                    {isLoading ? 'ĐANG XÁC THỰC...' : 'XÁC NHẬN'}
                  </button>
                </div>
              </form>
            </>
          )}

          {currentStep === 'new-password' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <Lock style={{ width: 64, height: 64, margin: '0 auto 1rem' }} />
                <h2 className="auth-card-title" style={{ fontFamily: 'var(--font-heading)' }}>Mật Khẩu Mới</h2>
                <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--gray-600)' }}>TẠO MẬT KHẨU MỚI CHO TÀI KHOẢN CỦA BẠN</p>
              </div>
              <form onSubmit={handleResetPassword} className="auth-form">
                <div className="form-group">
                  <label htmlFor="newPassword" className="neo-label">Mật khẩu mới *</label>
                  <input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Tối thiểu 6 ký tự" required minLength={6} className="neo-input neo-input--orange-focus" />
                </div>
                <div className="form-group">
                  <label htmlFor="confirmPassword" className="neo-label">Xác nhận mật khẩu *</label>
                  <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Nhập lại mật khẩu mới" required minLength={6} className="neo-input neo-input--orange-focus" />
                </div>
                <button type="submit" disabled={isLoading} className="neo-btn neo-btn--primary neo-btn--full">
                  {isLoading ? 'ĐANG CẬP NHẬT...' : 'ĐỔI MẬT KHẨU'}
                </button>
              </form>
            </>
          )}

          <div className="auth-divider">
            <Link to="/login" className="neo-btn neo-btn--yellow neo-btn--full">← QUAY VỀ ĐĂNG NHẬP</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
