import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Mail, ArrowLeft, Shield } from 'lucide-react';
import { API_BASE } from '../config/api';
import { ScrollToTop } from '../components/ScrollToTop';


type Step = 'info' | 'otp';

export function Register() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>('info');
  const [formData, setFormData] = useState({ fullName: '', phone: '', email: '', password: '', confirmPassword: '' });
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => { if (prev <= 1) { clearInterval(timer); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleChange = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) { alert('Mật khẩu xác nhận không khớp!'); return; }
    if (formData.password.length < 6) { alert('Mật khẩu phải có ít nhất 6 ký tự!'); return; }
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/send-register-otp`, { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,  'Content-Type': 'application/json'  }, body: JSON.stringify({ email: formData.email }) });
      const data = await response.json(); setIsLoading(false);
      if (data.success) { setCurrentStep('otp'); setCountdown(60); } else { alert(data.message || 'Không thể gửi OTP!'); }
    } catch (error) { setIsLoading(false); alert('Lỗi kết nối máy chủ!'); console.error(error); }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault(); setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/verify-register-otp`, { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,  'Content-Type': 'application/json'  }, body: JSON.stringify({ email: formData.email, otp, password: formData.password, fullname: formData.fullName, phone: formData.phone }) });
      const data = await response.json(); setIsLoading(false);
      if (data.success) { alert("ĐĂNG KÝ THÀNH CÔNG!"); navigate('/login'); } else { alert(data.message || 'Xác thực OTP thất bại!'); }
    } catch (error) { setIsLoading(false); alert('Lỗi kết nối máy chủ!'); console.error(error); }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return; setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/send-register-otp`, { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,  'Content-Type': 'application/json'  }, body: JSON.stringify({ email: formData.email }) });
      const data = await response.json(); setIsLoading(false);
      if (data.success) { setCountdown(60); alert('Đã gửi lại mã OTP!'); } else { alert(data.message); }
    } catch { setIsLoading(false); alert('Lỗi kết nối!'); }
  };

  return (
    <div className="auth-page page--pink">
      <ScrollToTop />
      <div className="auth-container auth-container--wide">
        <div className="auth-logo">
          <Link to="/" className="auth-logo-link">
            <h1 className="auth-logo-title" style={{ fontFamily: 'var(--font-heading)' }}>VỌC RECORDS</h1>
          </Link>
          <p className="auth-logo-subtitle">ĐĂNG KÝ THÀNH VIÊN MỚI</p>
        </div>

        {/* Progress Steps */}
        <div className="progress-steps">
          <div className={`progress-step ${currentStep === 'info' ? 'progress-step--active' : 'progress-step--done'}`}>
            {currentStep !== 'info' ? '✓' : '1'} Thông tin
          </div>
          <div className="progress-line"></div>
          <div className={`progress-step ${currentStep === 'otp' ? 'progress-step--active' : 'progress-step--inactive'}`}>
            2 Xác thực OTP
          </div>
        </div>

        <div className="auth-card">
          {currentStep === 'info' && (
            <>
              <h2 className="auth-card-title" style={{ fontFamily: 'var(--font-heading)', borderBottom: '2px solid #000', paddingBottom: '1rem' }}>Điền Thông Tin</h2>
              <form onSubmit={handleSendOTP} className="auth-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="fullName" className="neo-label">Họ Tên *</label>
                    <input id="fullName" type="text" required value={formData.fullName} onChange={(e) => handleChange('fullName', e.target.value)} className="neo-input neo-input--pink-focus" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone" className="neo-label">SĐT *</label>
                    <input id="phone" type="tel" required value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} className="neo-input neo-input--pink-focus" />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="email" className="neo-label"><Mail style={{ width: 16, height: 16, display: 'inline', marginRight: '0.25rem' }} />Địa Chỉ Email * <span style={{ fontSize: '0.75rem', textTransform: 'none', color: 'var(--gray-500)' }}>(OTP sẽ được gửi về email này)</span></label>
                  <input id="email" type="email" required value={formData.email} onChange={(e) => handleChange('email', e.target.value)} className="neo-input neo-input--pink-focus" placeholder="example@gmail.com" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="password" className="neo-label">Mật khẩu *</label>
                    <input id="password" type="password" required minLength={6} value={formData.password} onChange={(e) => handleChange('password', e.target.value)} className="neo-input neo-input--pink-focus" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="confirmPassword" className="neo-label">Nhập Lại M.Khẩu *</label>
                    <input id="confirmPassword" type="password" required minLength={6} value={formData.confirmPassword} onChange={(e) => handleChange('confirmPassword', e.target.value)} className="neo-input neo-input--pink-focus" />
                  </div>
                </div>
                <p className="otp-note otp-note--gray">LƯU Ý: SAU KHI NHẤN TIẾP TỤC, MÃ OTP SẼ ĐƯỢC GỬI VỀ EMAIL CỦA BẠN ĐỂ XÁC THỰC.</p>
                <button type="submit" disabled={isLoading} className="neo-btn neo-btn--primary neo-btn--full">
                  {isLoading ? 'ĐANG GỬI MÃ OTP...' : 'TIẾP TỤC → NHẬN MÃ OTP'}
                </button>
              </form>
            </>
          )}

          {currentStep === 'otp' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <Shield style={{ width: 64, height: 64, margin: '0 auto 1rem' }} />
                <h2 className="auth-card-title" style={{ fontFamily: 'var(--font-heading)' }}>Xác Thực Email</h2>
                <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                  Mã OTP đã được gửi đến <span style={{ color: '#db2777', fontSize: '1rem' }}>{formData.email}</span>
                </p>
              </div>
              <form onSubmit={handleVerifyOTP} className="auth-form">
                <div className="form-group">
                  <label htmlFor="otp" className="neo-label" style={{ textAlign: 'center' }}>Nhập mã OTP (6 số)</label>
                  <input id="otp" type="text" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="● ● ● ● ● ●" required maxLength={6} className="otp-input neo-input--pink-focus" autoFocus />
                </div>
                <div style={{ textAlign: 'center', fontSize: '0.875rem', fontWeight: 700 }}>
                  {countdown > 0 ? (
                    <p style={{ color: 'var(--gray-600)', textTransform: 'uppercase' }}>Gửi lại mã sau <span style={{ color: '#db2777', fontSize: '1.125rem' }}>{countdown}s</span></p>
                  ) : (
                    <button type="button" onClick={handleResendOTP} disabled={isLoading} style={{ color: '#db2777', fontWeight: 700, textTransform: 'uppercase', textDecoration: 'underline', background: 'none', border: 'none' }}>Gửi lại mã OTP</button>
                  )}
                </div>
                <p className="otp-note otp-note--red">⏱ Mã OTP có hiệu lực trong 5 phút. Kiểm tra cả mục Spam/Junk.</p>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="button" onClick={() => { setCurrentStep('info'); setOtp(''); }} className="neo-btn neo-btn--secondary" style={{ flex: 1 }}>
                    <ArrowLeft style={{ width: 20, height: 20 }} /> Quay lại
                  </button>
                  <button type="submit" disabled={isLoading || otp.length !== 6} className="neo-btn neo-btn--primary" style={{ flex: 1 }}>
                    {isLoading ? 'ĐANG XÁC THỰC...' : 'XÁC NHẬN ĐĂNG KÝ'}
                  </button>
                </div>
              </form>
            </>
          )}

          <div className="auth-divider">
            <p className="auth-divider-text">Đã là thành viên?</p>
            <Link to="/login" className="neo-btn neo-btn--yellow neo-btn--full">QUAY VỀ ĐĂNG NHẬP</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
