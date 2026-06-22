import { useState } from 'react';
import Icon from '../components/ui/Icon';

export default function SignupPage({ onSignup, onSwitchToLogin, loading, showToast }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) {
      showToast?.('Please fill all fields', 'error');
      return;
    }
    if (password.length < 8) {
      showToast?.('Password must be 8+ characters', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showToast?.('Passwords do not match', 'error');
      return;
    }
    const ok = await onSignup({ email, password });
    if (ok) setSuccess(true);
  };

  if (success) {
    return (
      <div className="login-page">
        <div className="login-left">
          <img src="https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=1200" alt="Workspace" className="login-bg-image" />
          <div className="login-overlay"><div className="login-brand"><h1 className="login-title">LaptopCare<span className="accent-dot">.</span></h1></div></div>
        </div>
        <div className="login-right">
          <div className="login-card" style={{ textAlign: 'center' }}>
            <div className="success-icon-wrap"><Icon name="check-circle" size={48} color="#22c55e" /></div>
            <h2 className="login-card-title">Account Created!</h2>
            <p className="login-card-subtitle">You can now sign in.</p>
            <button className="btn-primary full-width" onClick={onSwitchToLogin} style={{ marginTop: 24 }}>Return to Sign In</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-left">
        <img src="https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=1200" alt="Workspace" className="login-bg-image" />
        <div className="login-overlay">
          <div className="login-brand">
            <div className="login-logo"><svg width="40" height="40" viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="10" fill="#F9C54D" /><path d="M12 28V12h4v12h8v4H12z" fill="#131414" /></svg></div>
            <h1 className="login-title">LaptopCare<span className="accent-dot">.</span></h1>
            <p className="login-subtitle">Customer Support Portal</p>
          </div>
        </div>
      </div>
      <div className="login-right">
        <div className="login-card">
          <h2 className="login-card-title">Create Account</h2>
          <p className="login-card-subtitle">Join LaptopCare Support</p>
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} /></div>
            <div className="form-group"><label className="form-label">Password</label><input type="password" className="form-input" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} /></div>
            <div className="form-group"><label className="form-label">Confirm Password</label><input type="password" className="form-input" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={loading} /></div>
            {error && <div className="form-error">{error}</div>}
            <button type="submit" className="btn-primary full-width login-btn" disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</button>
          </form>
          <p className="login-footer-text">Already have an account? <a href="#" className="create-account-link" onClick={(e) => { e.preventDefault(); onSwitchToLogin(); }}>Sign in</a></p>
        </div>
      </div>
    </div>
  );
}
