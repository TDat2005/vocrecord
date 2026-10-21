import { Fragment } from 'react';
import { Link } from 'react-router';
import { ScrollToTop } from './ScrollToTop';
import '../../styles/pages/account.css';

// Khung chung cho Đăng nhập / Đăng ký / Quên mật khẩu.
export function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-page">
      <ScrollToTop />
      <Link to="/" className="auth-brand">
        <img src="/images/voc_logo_new.png" alt="" />
        Vọc Records
      </Link>
      <div className="card auth-card">
        <h1 className="auth-card__title">{title}</h1>
        {subtitle && <p className="auth-card__subtitle">{subtitle}</p>}
        {children}
        {footer && <div className="auth-footer">{footer}</div>}
      </div>
    </div>
  );
}

// Thanh bước: steps = ['Thông tin', 'Xác thực OTP'], current = chỉ số bước hiện tại.
export function Steps({ steps, current }) {
  return (
    <div className="steps">
      {steps.map((label, index) => {
        const state = index < current ? 'done' : index === current ? 'active' : '';
        return (
          <Fragment key={label}>
            {index > 0 && <span className="steps__line" />}
            <span className={`steps__item ${state ? `steps__item--${state}` : ''}`}>
              <span className="steps__dot">{index < current ? '✓' : index + 1}</span>
              {label}
            </span>
          </Fragment>
        );
      })}
    </div>
  );
}
