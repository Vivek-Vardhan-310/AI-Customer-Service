import { useState } from 'react';
import Icon from '../components/ui/Icon';

export default function LoginPage({ onLogin, onSwitchToSignup, loading, showToast }) {
  const role = 'customer';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');

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
              <a href="#" className="forgot-link" onClick={(e) => e.preventDefault()}>Forgot password?</a>
            </div>
            {error && <div className="form-error">{error}</div>}
            <button type="submit" className="btn-primary login-btn full-width" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
          </form>
          <p className="login-footer-text">New here? <a href="#" className="create-account-link" onClick={(e) => { e.preventDefault(); onSwitchToSignup(); }}>Create account</a></p>
        </div>
      </div>
    </div>
  );
}
