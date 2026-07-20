import { useState } from 'react';
import Icon from '../components/ui/Icon';

export default function LoginPage({ onLogin, onForgotPassword, onSwitchToSignup, loading, showToast }) {
  const role = 'customer';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      const msg = 'Please fill in all fields';
      setError(msg);
      showToast?.(msg, 'error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const msg = 'Please enter a valid email';
      setError(msg);
      showToast?.(msg, 'error');
      return;
    }
    await onLogin({ email, role, password });
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      showToast?.('Please enter your email address', 'error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast?.('Please enter a valid email', 'error');
      return;
    }
    if (newPassword && newPassword.length < 8) {
      showToast?.('Password must be at least 8 characters', 'error');
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      showToast?.('Passwords do not match', 'error');
      return;
    }

    setForgotLoading(true);
    try {
      const result = await onForgotPassword({ email, otp, newPassword });
      if (result?.success && result?.nextStep === 'otp') {
        setOtp('');
      } else if (result?.success) {
        setShowForgot(false);
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <img src="https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=1200" alt="Workspace" className="login-bg-image" />
        <div className="login-overlay">
          <div className="login-brand">
            <div className="login-logo">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="10" fill="#F9C54D" /><path d="M12 28V12h4v12h8v4H12z" fill="#131414" /></svg>
            </div>
            <h1 className="login-title">LaptopCare<span className="accent-dot">.</span></h1>
            <p className="login-subtitle">Customer Support Portal</p>
            <p className="login-description">Get instant help with your laptop products. Track warranties, raise complaints, and connect with AI-powered support — all in one place.</p>
            <div className="login-features">
              <div className="login-feature"><Icon name="check-circle" size={16} color="#F9C54D" /><span>24/7 AI Support</span></div>
              <div className="login-feature"><Icon name="check-circle" size={16} color="#F9C54D" /><span>Real-time Ticket Tracking</span></div>
              <div className="login-feature"><Icon name="check-circle" size={16} color="#F9C54D" /><span>Warranty Management</span></div>
            </div>
          </div>
        </div>
      </div>
      <div className="login-right">
        <div className="login-card">
          <h2 className="login-card-title">Welcome back</h2>
          <p className="login-card-subtitle">Sign in to your support account</p>
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input type="email" className="form-input" placeholder="name@company.com" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} disabled={loading} />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="password-input-wrapper">
                <input type={showPassword ? 'text' : 'password'} className="form-input" placeholder="••••••••" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} disabled={loading} />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}><Icon name="eye" size={16} color="#8a8a8a" /></button>
              </div>
            </div>
            <div className="form-row">
              <label className="checkbox-label"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /><span className="checkbox-custom"></span><span>Remember me</span></label>
              <a href="#" className="forgot-link" onClick={(e) => { e.preventDefault(); setShowForgot(true); setError(''); }}>Forgot password?</a>
            </div>
            {error && <div className="form-error">{error}</div>}
            <button type="submit" className="btn-primary login-btn full-width" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
          </form>
          <p className="login-footer-text">New here? <a href="#" className="create-account-link" onClick={(e) => { e.preventDefault(); onSwitchToSignup(); }}>Create account</a></p>
        </div>
      </div>

      {showForgot && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 1000 }}>
          <div className="login-card" style={{ width: '100%', maxWidth: 420, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Reset password</h3>
              <button type="button" className="btn-secondary" onClick={() => { setShowForgot(false); setOtp(''); setNewPassword(''); setConfirmPassword(''); }}>Close</button>
            </div>
            <p className="login-card-subtitle" style={{ marginBottom: 16 }}>Enter your email, then either use the code sent to your inbox or enter a new password after verification.</p>
            <form onSubmit={handleForgotPasswordSubmit} className="login-form">
              <div className="form-group">
                <label className="form-label">Email address</label>
                <input type="email" className="form-input" placeholder="name@company.com" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} disabled={loading || forgotLoading} />
              </div>
              <div className="form-group">
                <label className="form-label">OTP code</label>
                <input type="text" className="form-input" placeholder="Enter code from email" value={otp} onChange={(e) => setOtp(e.target.value)} disabled={loading || forgotLoading} />
              </div>
              <div className="form-group">
                <label className="form-label">New password</label>
                <input type="password" className="form-input" placeholder="At least 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={loading || forgotLoading} />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm password</label>
                <input type="password" className="form-input" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={loading || forgotLoading} />
              </div>
              <button type="submit" className="btn-primary full-width" disabled={loading || forgotLoading}>{forgotLoading ? 'Processing...' : otp ? 'Set new password' : 'Send code'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
