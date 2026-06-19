﻿﻿import { useState, useRef, useEffect, useCallback, Fragment } from 'react';
import { createClient } from '@supabase/supabase-js'
import './App.css';
import './animations.css';
import { useInView, useRafCount } from './hooks/animations';
import VoiceChat from './components/VoiceChat';
import { MOCK_PRODUCTS } from './data/products';
import { MOCK_TICKETS } from './data/tickets';
import { FAQ_CATEGORIES, FAQ_ARTICLES } from './data/faq';
import { ISSUE_CATEGORIES } from './data/issues';
import Icon from './components/ui/Icon';






const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.MODE === 'development'
  ? 'http://localhost:8000'
  : 'https://ai-customer-service-alpha.vercel.app');
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  console.warn('Supabase not configured ΓÇö running in demo mode.');
}
export { supabase };


function Toast({ message, visible, type = 'success' }) {
  return (
    <div className={`toast ${visible ? 'show' : ''} toast-${type}`}>
      <Icon name={type === 'error' ? 'alert-triangle' : type === 'warning' ? 'alert-triangle' : 'check-circle'} size={18} color={type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#22c55e'} />
      <span>{message}</span>
    </div>
  );
}


function LoginPage({ onLogin, onSwitchToSignup, loading, showToast }) {
  const [tab, setTab] = useState('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { const msg = 'Please fill in all fields'; setError(msg); showToast?.(msg, 'error'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { const msg = 'Please enter a valid email'; setError(msg); showToast?.(msg, 'error'); return; }
    await onLogin({ email, role: tab, password });
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <img src="https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=1200" alt="Workspace" className="login-bg-image" />
        <div className="login-overlay">
          <div className="login-brand">
            <div className="login-logo">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="10" fill="#F9C54D"/><path d="M12 28V12h4v12h8v4H12z" fill="#131414"/></svg>
            </div>
            <h1 className="login-title">LaptopCare<span className="accent-dot">.</span></h1>
            <p className="login-subtitle">Customer Support Portal</p>
            <p className="login-description">Get instant help with your laptop products. Track warranties, raise complaints, and connect with AI-powered support ΓÇö all in one place.</p>
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
          <div className="login-tabs">
            <button className={`login-tab ${tab === 'customer' ? 'active' : ''}`} onClick={() => setTab('customer')} disabled={loading}>Customer</button>
            <button className={`login-tab ${tab === 'admin' ? 'active' : ''}`} onClick={() => setTab('admin')} disabled={loading}>Admin</button>
          </div>
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input type="email" className="form-input" placeholder="name@company.com" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} disabled={loading} />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="password-input-wrapper">
                <input type={showPassword ? 'text' : 'password'} className="form-input" placeholder="ΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇó" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} disabled={loading} />
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


function SignupPage({ onSignup, onSwitchToLogin, loading, showToast }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) { showToast?.('Please fill all fields', 'error'); return; }
    if (password.length < 8) { showToast?.('Password must be 8+ characters', 'error'); return; }
    if (password !== confirmPassword) { showToast?.('Passwords do not match', 'error'); return; }
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
          <div className="login-card" style={{textAlign:'center'}}>
            <div className="success-icon-wrap"><Icon name="check-circle" size={48} color="#22c55e" /></div>
            <h2 className="login-card-title">Account Created!</h2>
            <p className="login-card-subtitle">You can now sign in.</p>
            <button className="btn-primary full-width" onClick={onSwitchToLogin} style={{marginTop:24}}>Return to Sign In</button>
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
            <div className="login-logo"><svg width="40" height="40" viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="10" fill="#F9C54D"/><path d="M12 28V12h4v12h8v4H12z" fill="#131414"/></svg></div>
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
            <div className="form-group"><label className="form-label">Confirm Password</label><input type="password" className="form-input" placeholder="ΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇó" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={loading} /></div>
            {error && <div className="form-error">{error}</div>}
            <button type="submit" className="btn-primary full-width login-btn" disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</button>
          </form>
          <p className="login-footer-text">Already have an account? <a href="#" className="create-account-link" onClick={(e) => { e.preventDefault(); onSwitchToLogin(); }}>Sign in</a></p>
        </div>
      </div>
    </div>
  );
}


function TopAppBar({ onMenuClick, onLogout, onOpenProfile, onOpenSettings }) {
  const [showNotif, setShowNotif] = useState(false);
  const [bellRing, setBellRing] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="btn-icon" onClick={onMenuClick}><Icon name="menu" size={22} /></button>
        <div className="topbar-brand">
          <div className="topbar-brand-icon"><svg width="20" height="20" viewBox="0 0 40 40" fill="none"><path d="M12 28V12h4v12h8v4H12z" fill="#131414"/></svg></div>
          <div>
            <span className="topbar-brand-name">LaptopCare</span>
            <span className="topbar-brand-sub"> Support</span>
          </div>
        </div>
      </div>
      <div className="topbar-right">
        <div className="dropdown-wrap" ref={notifRef}>
          <button className={`topbar-notif-btn ${bellRing ? 'bell-ring' : ''}`} onClick={() => {
            const next = !showNotif;
            setShowNotif(next);
            if (next) { setBellRing(true); setTimeout(() => setBellRing(false), 900); }
          }}>
            <Icon name="bell" size={20} />
            <span className="topbar-notif-badge">3</span>
          </button>
          {showNotif && (
            <div className="dropdown-menu notif-dropdown">
              <div className="dropdown-header">Notifications</div>
              <div className="notif-item"><div className="notif-dot blue"></div><div><p className="notif-text">Ticket CS-8992 has been updated</p><span className="notif-time">2 hours ago</span></div></div>
              <div className="notif-item"><div className="notif-dot green"></div><div><p className="notif-text">Warranty claim approved</p><span className="notif-time">5 hours ago</span></div></div>
              <div className="notif-item"><div className="notif-dot amber"></div><div><p className="notif-text">AMC renewal reminder ΓÇö 54 days left</p><span className="notif-time">1 day ago</span></div></div>
            </div>
          )}
        </div>
        <div className="dropdown-wrap" ref={profileRef}>
          <button className="topbar-avatar" onClick={() => setShowProfile(!showProfile)}>
            <div className="topbar-avatar-circle">A</div>
            <span className="topbar-avatar-name">Alex</span>
            <Icon name="chevron-down" size={14} />
          </button>
          {showProfile && (
            <div className="dropdown-menu">
              <div className="dropdown-item" onClick={() => { onOpenProfile?.(); setShowProfile(false); }}><Icon name="user" size={16} /><span>My Profile</span></div>
              <div className="dropdown-item" onClick={() => { onOpenSettings?.(); setShowProfile(false); }}><Icon name="settings" size={16} /><span>Settings</span></div>
              <div className="dropdown-divider"></div>
              <div className="dropdown-item danger" onClick={() => { setShowProfile(false); onLogout?.(); }}><Icon name="log-out" size={16} /><span>Sign out</span></div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}


function FloatingDock({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'products', label: 'Products', icon: 'laptop' },
    { id: 'tickets', label: 'Tickets', icon: 'ticket' },
    { id: 'faqs', label: 'FAQs', icon: 'help-circle' },
  ];
  const containerRef = useRef(null);
  const [indicator, setIndicator] = useState({ x: 0, width: 0 });

  useEffect(() => {
    const update = () => {
      const container = containerRef.current;
      if (!container) return;
      const nodes = container.querySelectorAll('.dock-tab');
      const activeIndex = tabs.findIndex(t => t.id === activeTab);
      const node = nodes[activeIndex];
      if (node) {
        const rect = node.getBoundingClientRect();
        const parentRect = container.getBoundingClientRect();
        const x = rect.left - parentRect.left + (rect.width - rect.width) * 0; // left offset
        setIndicator({ x, width: rect.width });
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [activeTab]);

  return (
    <nav className="floating-dock" ref={containerRef}>
      <div className="active-indicator" style={{ transform: `translateX(${indicator.x}px)`, width: indicator.width ? `${indicator.width}px` : undefined }} />
      {tabs.map(tab => (
        <button key={tab.id} className={`dock-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => onTabChange(tab.id)}>
          <span className="dock-tab-icon"><Icon name={tab.icon} size={20} /></span>
          <span className="dock-tab-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}


function SupportFAB({ onClick }) {
  return (
    <button className="support-fab" onClick={onClick} title="Need help?">
      <span className="fab-pulse"></span>
      <Icon name="headphones" size={24} />
    </button>
  );
}

function SupportHubModal({ onClose, onChat, onVoice }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="support-hub-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><Icon name="x" size={18} /></button>
        <h2 className="modal-title">Need Assistance?</h2>
        <p className="modal-subtitle">Choose how you'd like to connect</p>
        <div className="support-option" onClick={onVoice}>
          <div className="support-option-icon"><Icon name="mic" size={22} color="#131414" /></div>
          <div className="support-option-text">
            <h4>Speak with AI</h4>
            <p>Talk to our AI voice assistant for instant help</p>
          </div>
          <span className="support-option-arrow"><Icon name="chevron-right" size={18} /></span>
        </div>
        <div className="support-option" onClick={onChat}>
          <div className="support-option-icon"><Icon name="message-circle" size={22} color="#131414" /></div>
          <div className="support-option-text">
            <h4>Chat with AI</h4>
            <p>Chat with our AI assistant for step-by-step support</p>
          </div>
          <span className="support-option-arrow"><Icon name="chevron-right" size={18} /></span>
        </div>
        <p className="modal-footer-note">24/7 Automated Support</p>
      </div>
    </div>
  );
}


function HamburgerDrawer({ onClose, onOpenLanguage, onOpenAboutAI, onOpenTelecom, onOpenTOS, onOpenPrivacy }) {
  const items = [
    { img: '/images/lang.svg', title: 'Language / αñ╣αñ┐αñéαñªαÑÇ', desc: '', onClick: () => { onClose(); onOpenLanguage?.(); } },
    { img: '/images/ai.svg', title: 'About Our AI', desc: 'Our technology & how it works', onClick: () => { onClose(); onOpenAboutAI?.(); } },
    { img: '/images/telecom.svg', title: 'Telecom Solutions (B2B)', desc: 'Explore our enterprise solutions', onClick: () => { onClose(); onOpenTelecom?.(); } },
    { img: '/images/terms.svg', title: 'Terms of Service', desc: 'Read our terms', onClick: () => { onClose(); onOpenTOS?.(); } },
    { img: '/images/privacy.svg', title: 'Privacy Policy', desc: 'Your data privacy matters', onClick: () => { onClose(); onOpenPrivacy?.(); } },
  ];

  return (
    <>
      <div className="drawer-overlay" onClick={onClose}></div>
      <div className="drawer">
        <div className="drawer-header">
          <button className="btn-icon" onClick={onClose}><Icon name="x" size={22} /></button>
        </div>
        <div className="drawer-body">
          {items.map((item, i) => (
            <div key={i} className="drawer-item" onClick={item.onClick}>
              <img src={item.img} alt={item.title} className="drawer-item-thumb" />
              <div className="drawer-item-text">
                <span>{item.title}</span>
                {item.desc && <small>{item.desc}</small>}
              </div>
              <Icon name="chevron-right" size={16} color="#8a8a8a" />
            </div>
          ))}
        </div>
        <div className="drawer-footer">┬⌐ 2026 LaptopCare Support</div>
      </div>
    </>
  );
}


function HomePage({ onNavigate }) {
  return (
    <div>
      <div className="home-hero">
        <video className="home-bg-video" autoPlay muted loop playsInline poster="/images/lang.svg" aria-hidden>
          <source src="/videos/home-bg.mp4" type="video/mp4" />
          {/* Fallback text */}
        </video>
        <div className="home-hero-overlay" aria-hidden></div>
        <div className="home-hero-content">
          <div className="home-greeting">
            <h1>Hi, Alex</h1>
            <p>How can we help you today?</p>
          </div>
          <h2 className="home-section-title">Popular Actions</h2>
          <div className="home-actions-grid">
  {[
    {
      icon: 'shield',
      title: 'Check Warranty',
      desc: 'Check your warranty status',
      tab: 'products'
    },
    {
      icon: 'ticket',
      title: 'Track Complaint',
      desc: 'Track your existing ticket',
      tab: 'tickets'
    },
    {
      icon: 'plus-circle',
      title: 'Create Ticket',
      desc: 'Raise a new support request',
      tab: 'create-ticket'
    },
    {
      icon: 'phone',
      title: 'AI Call Support',
      desc: '24/7 Telephony customer support',
      tab: 'telephony'
    }
  ].map((action, i) => (
    <div
      key={i}
      className={`home-action-card animate-in stagger-${i + 1}`}
      onClick={() => action.tab && onNavigate(action.tab)}
    >
      <div className="home-action-icon">
        <Icon name={action.icon} size={24} />
      </div>

      <div className="home-action-title">
        {action.title}
      </div>

      <div className="home-action-desc">
        {action.desc}
      </div>
    </div>
  ))}
</div>
        </div>
      </div>
    </div>
  );
}


function MyProductsPage({ onSelectProduct }) {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>My Products</h1>
          <p>Track your registered devices</p>
        </div>
        <button className="btn-primary"><Icon name="plus" size={18} /><span>Add Product</span></button>
      </div>
      <div className="products-search">
        <span className="search-icon"><Icon name="search" size={18} /></span>
        <input type="text" placeholder="Search your devices" />
      </div>
      {MOCK_PRODUCTS.map(product => (
        <div key={product.id} className="product-card" onClick={() => onSelectProduct(product)}>
          <img src={product.image} alt={product.name} className="product-card-img" />
          <div className="product-card-info">
            <div className="product-card-name">{product.name}</div>
            <div className="product-card-serial">Serial No: {product.serial}</div>
            <div className="product-card-badges">
              <span className={`badge ${product.warranty === 'Active' ? 'badge-green' : 'badge-amber'}`}>{product.warranty}</span>
              {product.amc !== 'Inactive' && <span className={`badge ${product.amc === 'Active' ? 'badge-green' : 'badge-amber'}`}>AMC {product.amc}</span>}
            </div>
          </div>
          <Icon name="chevron-right" size={20} color="#8a8a8a" />
        </div>
      ))}
    </div>
  );
}


function ProductDetailView({ product, onBack, onWarrantyClaim, onRenewAMC }) {
  const warrantyPercent = Math.round((1 - product.warrantyDays / product.warrantyTotal) * 100);
  const amcPercent = product.amcDays > 0 ? Math.round((1 - product.amcDays / product.amcTotal) * 100) : 0;

  const [progressRef, progressInView] = useInView({ threshold: 0.12 });
  const warrantyCount = useRafCount(progressInView ? product.warrantyDays : 0, 1200);
  const amcCount = useRafCount(progressInView ? product.amcDays : 0, 1200);
  const imageRef = useRef(null);

  useEffect(() => {
    let raf = null;
    const onScroll = () => {
      if (!imageRef.current) return;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY || window.pageYOffset;
        const translate = Math.max(-20, Math.min(20, y * 0.15));
        imageRef.current.style.transform = `translateY(${translate}px)`;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  return (
    <div>
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}><Icon name="arrow-left" size={20} /></button>
        <h1>Product Details</h1>
      </div>
      <div className="product-detail-hero">
        <img ref={imageRef} src={product.image} alt={product.name} className="product-detail-image" />
        <div className="product-detail-info">
          <div className="product-detail-name">{product.name}</div>
          <div className="product-detail-serial">Serial No: {product.serial}</div>
          <span className={`badge ${product.status === 'Active' ? 'badge-green' : 'badge-amber'}`}>{product.status}</span>
          <div className="product-status-cards" style={{marginTop: 16}}>
            <div className="product-status-card">
              <div className="status-label">Warranty</div>
              <span className={`badge ${product.warranty === 'Active' ? 'badge-green' : 'badge-amber'}`}>{product.warranty}</span>
              <div className="status-days">{warrantyCount} days remaining</div>
              <div className="progress-wrap" ref={progressRef}>
                <div className="progress-bar"><div className={`progress-fill ${product.warrantyDays > 60 ? 'green' : 'amber'}`} style={{transform: progressInView ? `scaleX(${Math.max(0, Math.min(1, warrantyPercent / 100))})` : 'scaleX(0)'}}></div></div>
              </div>
            </div>
            <div className="product-status-card">
              <div className="status-label">AMC</div>
              <span className={`badge ${product.amc === 'Active' ? 'badge-green' : product.amc === 'Inactive' ? 'badge-gray' : 'badge-amber'}`}>{product.amc}</span>
              <div className="status-days">{amcCount > 0 ? `${amcCount} days remaining` : 'Not active'}</div>
              {product.amcDays > 0 && (
                <div className="progress-wrap">
                  <div className="progress-bar"><div className={`progress-fill ${product.amcDays > 60 ? 'green' : 'amber'}`} style={{transform: progressInView ? `scaleX(${Math.max(0, Math.min(1, amcPercent / 100))})` : 'scaleX(0)'}}></div></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <h3 className="quick-actions-title">Quick Actions</h3>
      <div className="quick-actions-list">
        <div className="quick-action-item" onClick={onWarrantyClaim}><Icon name="upload" size={18} /><span>Raise Warranty Claim</span><span className="quick-action-arrow"><Icon name="chevron-right" size={16} /></span></div>
        <div className="quick-action-item"><Icon name="activity" size={18} /><span>Raise AMC Service Request</span><span className="quick-action-arrow"><Icon name="chevron-right" size={16} /></span></div>
        <div className="quick-action-item" onClick={onRenewAMC}><Icon name="shield" size={18} /><span>Renew AMC</span><span className="quick-action-arrow"><Icon name="chevron-right" size={16} /></span></div>
        <div className="quick-action-item"><Icon name="alert-triangle" size={18} /><span>Raise General Complaint</span><span className="quick-action-arrow"><Icon name="chevron-right" size={16} /></span></div>
        <div className="quick-action-item"><Icon name="message-circle" size={18} /><span>AI Troubleshoot</span><span className="quick-action-arrow"><Icon name="chevron-right" size={16} /></span></div>
      </div>
    </div>
  );
}


function WarrantyClaimWizard({ product, onBack, onComplete, showToast }) {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [contactMethod, setContactMethod] = useState('email');
  const [files, setFiles] = useState([]);
  const fileRef = useRef(null);

  const stepLabels = ['Issue Details', 'Upload', 'Review'];

  const handleSubmit = () => {
    const ticketId = `CS-${9100 + Math.floor(Math.random() * 900)}`;
    showToast?.('Warranty claim submitted! Ticket: ' + ticketId, 'success');
    onComplete(ticketId);
  };

  return (
    <div>
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}><Icon name="arrow-left" size={20} /></button>
        <h1>Raise Warranty Claim</h1>
      </div>
      <div className="wizard-header">
        {stepLabels.map((label, i) => (
          <Fragment key={i}>
            <div className={`wizard-step ${step === i + 1 ? 'active' : ''} ${step > i + 1 ? 'completed' : ''}`}>
              <div className="wizard-step-number">{step > i + 1 ? <Icon name="check" size={14} color="white" /> : i + 1}</div>
              <span className="wizard-step-label">{label}</span>
            </div>
            {i < stepLabels.length - 1 && <div className={`wizard-step-line ${step > i + 1 ? 'completed' : step === i + 2 ? 'active' : ''}`}></div>}
          </Fragment>
        ))}
      </div>

      <div className="wizard-body">
        {step === 1 && (
          <>
            <div className="form-group" style={{marginBottom: 20}}>
              <label className="form-label">Issue Category</label>
              <div className="category-grid">
                {ISSUE_CATEGORIES.map(cat => (
                  <div key={cat.id} className={`category-card ${category === cat.id ? 'selected' : ''}`} onClick={() => setCategory(cat.id)}>
                    <div className="category-card-icon"><Icon name={cat.icon} size={22} /></div>
                    <span className="category-card-label">{cat.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="form-group" style={{marginBottom: 20}}>
              <label className="form-label">Describe the Issue</label>
              <textarea className="form-input textarea" placeholder="Explain the issue in detail..." value={description} onChange={(e) => setDescription(e.target.value)} rows={4}></textarea>
            </div>
            <div className="form-group">
              <label className="form-label">Preferred Contact Method</label>
              <div className="contact-methods">
                {['Email', 'Phone', 'WhatsApp'].map(m => (
                  <div key={m} className={`contact-method ${contactMethod === m.toLowerCase() ? 'selected' : ''}`} onClick={() => setContactMethod(m.toLowerCase())}>
                    <Icon name={m === 'Email' ? 'mail' : m === 'Phone' ? 'phone' : 'message-circle'} size={20} />
                    <span className="contact-method-label">{m}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        {step === 2 && (
          <div style={{textAlign: 'center', padding: '40px 0'}}>
            <div style={{width: 80, height: 80, margin: '0 auto 16px', borderRadius: 16, background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <Icon name="upload" size={32} color="#131414" />
            </div>
            <h3 style={{marginBottom: 8}}>Upload Attachments</h3>
            <p style={{color: 'var(--text-secondary)', marginBottom: 20, fontSize: 14}}>Upload photos, screenshots, or logs related to your issue</p>
            <input type="file" ref={fileRef} style={{display: 'none'}} multiple onChange={(e) => setFiles([...files, ...Array.from(e.target.files)])} />
            <button className="btn-secondary" onClick={() => fileRef.current?.click()}><Icon name="paperclip" size={16} /><span>Choose Files</span></button>
            {files.length > 0 && <p style={{marginTop: 12, fontSize: 13, color: 'var(--text-muted)'}}>{files.length} file(s) selected</p>}
          </div>
        )}
        {step === 3 && (
          <div>
            <h3 style={{marginBottom: 20}}>Review Your Claim</h3>
            <div style={{display: 'grid', gap: 16}}>
              <div><span style={{fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase'}}>Product</span><p style={{fontWeight: 500}}>{product.name} ┬╖ {product.serial}</p></div>
              <div><span style={{fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase'}}>Category</span><p style={{fontWeight: 500}}>{category || 'Not selected'}</p></div>
              <div><span style={{fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase'}}>Description</span><p style={{fontWeight: 500}}>{description || 'No description provided'}</p></div>
              <div><span style={{fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase'}}>Contact</span><p style={{fontWeight: 500, textTransform: 'capitalize'}}>{contactMethod}</p></div>
              <div><span style={{fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase'}}>Attachments</span><p style={{fontWeight: 500}}>{files.length} file(s)</p></div>
            </div>
          </div>
        )}
      </div>
      <div className="wizard-footer">
        <button className="btn-secondary" onClick={() => step > 1 ? setStep(step - 1) : onBack()}>{step === 1 ? 'Cancel' : 'Back'}</button>
        <button className="btn-primary" onClick={() => step < 3 ? setStep(step + 1) : handleSubmit()}>
          {step < 3 ? <>Continue to {stepLabels[step]} <Icon name="chevron-right" size={16} /></> : 'Submit Claim'}
        </button>
      </div>
    </div>
  );
}

/* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
   RENEW AMC WIZARD
   ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */

function RenewAMCWizard({ product, onBack, showToast }) {
  const [step, setStep] = useState(1);
  const [plan, setPlan] = useState('premium');

  const plans = [
    { id: 'basic', name: 'Basic AMC', price: 'Γé╣999 / year' },
    { id: 'premium', name: 'Premium AMC', price: 'Γé╣1,999 / year', highlighted: true },
    { id: 'enterprise', name: 'Enterprise AMC', price: 'Γé╣2,999 / year' },
  ];

  const benefits = ['Free Service Visits', 'Priority Support', 'Genuine Parts', 'Annual Maintenance'];
  const stepLabels = ['Plan & Details', 'Payment', 'Confirm'];

  return (
    <div>
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}><Icon name="arrow-left" size={20} /></button>
        <h1>Renew AMC</h1>
      </div>
      <div className="wizard-header">
        {stepLabels.map((label, i) => (
          <Fragment key={i}>
            <div className={`wizard-step ${step === i + 1 ? 'active' : ''} ${step > i + 1 ? 'completed' : ''}`}>
              <div className="wizard-step-number">{step > i + 1 ? <Icon name="check" size={14} color="white" /> : i + 1}</div>
              <span className="wizard-step-label">{label}</span>
            </div>
            {i < stepLabels.length - 1 && <div className={`wizard-step-line ${step > i + 1 ? 'completed' : step === i + 2 ? 'active' : ''}`}></div>}
          </Fragment>
        ))}
      </div>
      <div className="wizard-body">
        {step === 1 && (
          <>
            <h3 style={{marginBottom: 16}}>Select AMC Plan</h3>
            <div className="amc-plans">
              {plans.map(p => (
                <div key={p.id} className={`amc-plan-card ${plan === p.id ? 'selected' : ''} ${p.highlighted && plan !== p.id ? 'highlighted' : ''}`} onClick={() => setPlan(p.id)}>
                  <div className="amc-plan-info">
                    <div className="amc-plan-name">{p.name}</div>
                    <div className="amc-plan-price">{p.price}</div>
                  </div>
                  <div className="amc-plan-radio"></div>
                </div>
              ))}
            </div>
            <div className="amc-benefits">
              <h4>Benefits Included</h4>
              {benefits.map((b, i) => (
                <div key={i} className="amc-benefit-item">
                  <Icon name="check-circle" size={16} color="#22c55e" />
                  <span>{b}</span>
                </div>
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <div style={{textAlign: 'center', padding: '40px 0'}}>
            <div style={{width: 80, height: 80, margin: '0 auto 16px', borderRadius: 16, background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <Icon name="lock" size={32} color="#131414" />
            </div>
            <h3 style={{marginBottom: 8}}>Payment</h3>
            <p style={{color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20}}>Payment integration coming soon. Click continue to confirm.</p>
            <div style={{padding: 16, background: 'var(--bg-primary)', borderRadius: 12, display: 'inline-block'}}>
              <span style={{fontWeight: 600}}>Selected: </span>
              <span>{plans.find(p => p.id === plan)?.name} ΓÇö {plans.find(p => p.id === plan)?.price}</span>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="resolved-card">
            <div className="resolved-icon"><Icon name="check-circle" size={40} color="#22c55e" /></div>
            <div className="resolved-title">AMC Renewed!</div>
            <div className="resolved-subtitle">Your {plans.find(p => p.id === plan)?.name} has been renewed for {product.name}.</div>
            <button className="btn-primary full-width" onClick={onBack}>Back to Products</button>
          </div>
        )}
      </div>
      {step < 3 && (
        <div className="wizard-footer">
          <button className="btn-secondary" onClick={() => step > 1 ? setStep(step - 1) : onBack()}>{step === 1 ? 'Cancel' : 'Back'}</button>
          <button className="btn-primary" onClick={() => setStep(step + 1)}>Continue <Icon name="chevron-right" size={16} /></button>
        </div>
      )}
    </div>
  );
}

/* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
   TICKETS PAGE
   ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */

function TicketsPage({ onSelectTicket }) {
  const [filter, setFilter] = useState('All');
  const filters = [
    { label: 'All', count: MOCK_TICKETS.length },
    { label: 'In Progress', count: MOCK_TICKETS.filter(t => t.status === 'In Progress').length },
    { label: 'Open', count: MOCK_TICKETS.filter(t => t.status === 'Open').length },
    { label: 'Resolved', count: MOCK_TICKETS.filter(t => t.status === 'Resolved').length },
    { label: 'Closed', count: MOCK_TICKETS.filter(t => t.status === 'Closed').length },
  ];
  const filtered = filter === 'All' ? MOCK_TICKETS : MOCK_TICKETS.filter(t => t.status === filter);
  const listRef = useRef(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const items = Array.from(el.querySelectorAll('.ticket-card'));
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          items.forEach((it, i) => {
            if (it.classList.contains('in')) return;
            setTimeout(() => it.classList.add('in'), i * 50);
          });
          obs.disconnect();
        }
      });
    }, { threshold: 0.06 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [filter]);

  return (
    <div>
      <div className="tickets-header">
        <h1>My Tickets</h1>
      </div>
      <p className="tickets-subtitle">Track your support requests</p>
      <div className="products-search" style={{marginBottom: 20}}>
        <span className="search-icon"><Icon name="search" size={18} /></span>
        <input type="text" placeholder="Search by Ticket ID" />
      </div>
      <div className="filter-tabs">
        {filters.map(f => (
          <button key={f.label} className={`filter-tab ${filter === f.label ? 'active' : ''}`} onClick={() => setFilter(f.label)}>
            {f.label}<span className="filter-count">{f.count}</span>
          </button>
        ))}
      </div>
      <div ref={listRef}>
      {filtered.map(ticket => (
        <div key={ticket.id} className="ticket-card" onClick={() => onSelectTicket(ticket)}>
          <div className={`ticket-status-dot ${ticket.status.toLowerCase().replace(' ', '-')}`}></div>
          <div className="ticket-card-body">
            <div className="ticket-card-top">
              <span className={`badge ${ticket.status === 'Open' ? 'badge-amber' : ticket.status === 'In Progress' ? 'badge-blue' : ticket.status === 'Resolved' ? 'badge-green' : 'badge-gray'}`}>{ticket.status}</span>
              <span className="ticket-card-id">{ticket.id}</span>
              <span className="ticket-card-date">{ticket.created}</span>
            </div>
            <div className="ticket-card-title">{ticket.title}</div>
            <div className="ticket-card-meta">Last updated: {ticket.updated} ┬╖ Priority: {ticket.priority}</div>
          </div>
          <div className="ticket-card-actions">
            <button className="btn-sm" onClick={(e) => { e.stopPropagation(); onSelectTicket(ticket); }}><Icon name="message-circle" size={14} /></button>
          </div>
        </div>
      ))}
      </div>
      {filtered.length === 0 && <div className="empty-state"><p>No tickets found for this filter.</p></div>}

      <div style={{marginTop: 32, padding: '24px 0', borderTop: '1px solid var(--border)'}}>
        <h3 style={{textAlign: 'center', marginBottom: 16, color: 'var(--text-secondary)', fontSize: 14}}>Track Your Ticket in 4 Simple Steps</h3>
        <div className="status-stepper">
          {['Created', 'Assigned', 'In Progress', 'Resolved'].map((s, i) => (
            <Fragment key={s}>
              <div className="stepper-step">
                <div className="stepper-icon"><Icon name={i === 0 ? 'star' : i === 1 ? 'user' : i === 2 ? 'activity' : 'check-circle'} size={20} /></div>
                <span className="stepper-label">{s}</span>
              </div>
              {i < 3 && <div className="stepper-line"></div>}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
   TICKET DETAIL VIEW
   ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */

function TicketDetailView({ ticket, onBack, onChat, showToast }) {
  const [activeDetailTab, setActiveDetailTab] = useState('details');
  const tabs = ['Details', 'Timeline', 'Updates', 'Attachments'];
  const timelineRef = useRef(null);

  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;
    const items = Array.from(el.querySelectorAll('.timeline-item'));
    const line = el.querySelector('.timeline-line');
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (line) line.classList.add('in');
        items.forEach((it, i) => setTimeout(() => it.classList.add('in'), i * 50));
        obs.disconnect();
      }
    }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [ticket]);

  return (
    <div>
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}><Icon name="arrow-left" size={20} /></button>
        <h1>Ticket Details</h1>
        <div style={{marginLeft: 'auto'}}><button className="btn-icon"><Icon name="more-vertical" size={20} /></button></div>
      </div>

      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24}}>
        <div>
          <span className={`badge ${ticket.status === 'In Progress' ? 'badge-blue' : ticket.status === 'Open' ? 'badge-amber' : ticket.status === 'Resolved' ? 'badge-green' : 'badge-gray'}`} style={{marginBottom: 8, display: 'inline-block'}}>{ticket.status}</span>
          <h2 className="ticket-detail-title">{ticket.title}</h2>
          <p className="ticket-detail-meta">Created: {ticket.created} ┬╖ Last Updated: {ticket.updated}</p>
          <p className="ticket-detail-meta">Priority: {ticket.priority} ┬╖ #{ticket.id}</p>
        </div>
      </div>

      <div className="ticket-detail-tabs">
        {tabs.map(tab => (
          <button key={tab} className={`ticket-detail-tab ${activeDetailTab === tab.toLowerCase() ? 'active' : ''}`} onClick={() => setActiveDetailTab(tab.toLowerCase())}>{tab}</button>
        ))}
      </div>

      <div className="ticket-detail-section">
        {activeDetailTab === 'details' && (
          <>
            <div className="raise-ticket-product" style={{marginBottom: 24}}>
              <img src={MOCK_PRODUCTS.find(p => p.name === ticket.product)?.image || 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=200'} alt={ticket.product} style={{width: 56, height: 56, borderRadius: 12, objectFit: 'cover'}} />
              <div className="raise-ticket-product-info">
                <h3>{ticket.product}</h3>
                <p>Serial No: {MOCK_PRODUCTS.find(p => p.name === ticket.product)?.serial || 'N/A'}</p>
              </div>
            </div>
            <div className="ticket-detail-row">
              <div className="ticket-detail-field"><div className="field-label">Category</div><div className="field-value">{ticket.category}</div></div>
              <div className="ticket-detail-field"><div className="field-label">Priority</div><div className="field-value">{ticket.priority}</div></div>
            </div>
            <div className="ticket-detail-field" style={{marginBottom: 20}}>
              <div className="field-label">Description</div>
              <div className="field-value">{ticket.description}</div>
            </div>

            <h4 style={{fontSize: 14, fontWeight: 700, marginBottom: 12}}>Tracking Timeline</h4>
            <div className="ticket-timeline" ref={timelineRef}>
              <div className="timeline-line"></div>
              {ticket.timeline.map((item, i) => (
                <div key={i} className={`timeline-item ${item.done ? 'active' : ''} ${item.done && !ticket.timeline[i+1]?.done ? 'current' : ''}`}>
                  <div className="timeline-node">{item.done && <Icon name="check" size={14} color={item.done && !ticket.timeline[i+1]?.done ? '#131414' : 'white'} />}</div>
                  <div className="timeline-content">
                    <div className="timeline-title">{item.step}</div>
                    <div className="timeline-date">{item.date || 'Pending'}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeDetailTab === 'timeline' && (
          <div className="ticket-timeline">
            {ticket.timeline.map((item, i) => (
              <div key={i} className={`timeline-item ${item.done ? 'active' : ''} ${item.done && !ticket.timeline[i+1]?.done ? 'current' : ''}`}>
                <div className="timeline-node">{item.done && <Icon name="check" size={14} color={item.done && !ticket.timeline[i+1]?.done ? '#131414' : 'white'} />}</div>
                <div className="timeline-content">
                  <div className="timeline-title">{item.step}</div>
                  <div className="timeline-date">{item.date || 'Pending'}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeDetailTab === 'updates' && (
          <div>
            <h4 style={{marginBottom: 16}}>Admin Updates</h4>
            {ticket.updates.length > 0 ? ticket.updates.map((u, i) => (
              <div key={i} style={{padding: 16, background: 'var(--bg-primary)', borderRadius: 12, marginBottom: 12}}>
                <div style={{fontSize: 12, color: 'var(--text-muted)', marginBottom: 4}}>{u.date}</div>
                <p style={{fontSize: 14, marginBottom: 6}}>{u.text}</p>
                <span style={{fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)'}}>{u.author}</span>
              </div>
            )) : <p style={{color: 'var(--text-muted)', textAlign: 'center', padding: 32}}>No updates yet.</p>}
          </div>
        )}

        {activeDetailTab === 'attachments' && (
          <div style={{textAlign: 'center', padding: 40, color: 'var(--text-muted)'}}>
            <Icon name="paperclip" size={32} color="#8a8a8a" />
            <p style={{marginTop: 12}}>No attachments for this ticket.</p>
          </div>
        )}
      </div>

      <div className="ticket-detail-actions">
        <button className="btn-secondary flex-1" onClick={onChat}><Icon name="message-circle" size={16} /><span>Chat</span></button>
        <button className="btn-secondary flex-1"><Icon name="alert-triangle" size={16} /><span>Escalate</span></button>
        <button className="btn-primary btn-danger flex-1"><Icon name="x" size={16} /><span>Cancel Ticket</span></button>
      </div>
    </div>
  );
}

/* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
   FAQS PAGE
   ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */

function FAQsPage({ onSelectCategory, onChat, showToast }) {
  return (
    <div>
      <div className="faqs-hero">
        <div className="faqs-avatar">
          <svg width="40" height="40" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" fill="#F9C54D"/><circle cx="18" cy="20" r="3" fill="#131414"/><circle cx="30" cy="20" r="3" fill="#131414"/><path d="M16 30c0-4 4-6 8-6s8 2 8 6" stroke="#131414" strokeWidth="2.5" strokeLinecap="round"/></svg>
          <div className="faqs-avatar-wave"><span></span><span></span><span></span><span></span><span></span></div>
        </div>
        <h1>How can we help?</h1>
        <p>Browse FAQs or chat with our AI assistant for quick solutions.</p>
      </div>
      <div className="faqs-search">
        <span className="search-icon"><Icon name="search" size={18} /></span>
        <input type="text" placeholder="Search FAQs..." />
      </div>
      <div className="faqs-category-grid">
        {FAQ_CATEGORIES.map((cat, i) => (
          <div key={cat.slug} className={`faq-category-card animate-in stagger-${i + 1}`} onClick={() => onSelectCategory(cat)}>
            <div className="faq-category-icon"><Icon name={cat.icon} size={20} /></div>
            <span className="faq-category-name">{cat.name}</span>
          </div>
        ))}
      </div>
      <div className="faqs-help-banner">
        <div className="help-text">
          <h3>Still need help?</h3>
          <p>Chat with our AI assistant for personalized support.</p>
        </div>
        <button className="btn-primary" onClick={onChat}><Icon name="message-circle" size={16} /><span>Chat With AI</span></button>
      </div>
    </div>
  );
}

/* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
   FAQ CATEGORY VIEW
   ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */

function FAQCategoryView({ category, onBack, onChat, showToast }) {
  const [openId, setOpenId] = useState(null);
  const articles = FAQ_ARTICLES[category.slug] || [];

  return (
    <div>
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}><Icon name="arrow-left" size={20} /></button>
        <h1>{category.name}</h1>
      </div>
      <div style={{textAlign: 'center', marginBottom: 32}}>
        <div style={{width: 56, height: 56, margin: '0 auto 12px', borderRadius: 14, background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <Icon name={category.icon} size={24} />
        </div>
        <p style={{fontSize: 14, color: 'var(--text-secondary)'}}>Find solutions to common {category.name.toLowerCase()} related issues.</p>
      </div>
      <div className="faq-list">
        {articles.map(article => (
          <div key={article.id} className={`faq-item ${openId === article.id ? 'open' : ''}`}>
            <button className="faq-question" onClick={() => setOpenId(openId === article.id ? null : article.id)}>
              {article.q}
              <span className="faq-arrow"><Icon name="chevron-down" size={18} /></span>
            </button>
            {openId === article.id && (
              <div className="faq-answer">
                {article.a.split('\n').map((line, i) => {
                  if (line.startsWith('ΓÇó')) return <div key={i} style={{display: 'flex', gap: 8, marginBottom: 6, paddingLeft: 8}}><span>ΓÇó</span><span>{line.substring(2)}</span></div>;
                  return <p key={i} style={{marginBottom: 6}}>{line}</p>;
                })}
                <div className="faq-feedback">
                  <span>Was this helpful?</span>
                  <button className="faq-feedback-btn yes" onClick={() => showToast?.('Thanks ΓÇö glad this helped!', 'success')}><Icon name="thumbs-up" size={14} /> Yes</button>
                  <button className="faq-feedback-btn no" onClick={onChat}><Icon name="thumbs-down" size={14} /> No</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {articles.length === 0 && <div className="empty-state"><p>No articles found for this category yet.</p></div>}
      </div>
      <div className="faqs-help-banner" style={{marginTop: 32}}>
        <div className="help-text">
          <h3>Can't find what you're looking for?</h3>
          <p>Ask our AI assistant and get instant help.</p>
        </div>
        <button className="btn-primary btn-danger" onClick={onChat}><Icon name="message-circle" size={16} /><span>Ask AI Assistant</span></button>
      </div>
    </div>
  );
}

/* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
   CHAT SUPPORT SCREEN
   ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */

function ChatSupportScreen({ onClose, onEndSession }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi I'm your LaptopCare AI Assistant.\nHow can I help you today?", time: '9:41 AM' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);
  const quickReplies = ['Check Warranty Status', 'Track My Ticket', 'Network / Wi-Fi Issues', 'Laptop Performance Issues', 'Drivers & Downloads'];

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    setMessages(prev => [...prev, { role: 'user', content: text, time }]);
    setInput('');
    setLoading(true);
    try {
      const token = localStorage.getItem('supabase_token');
      const res = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || JSON.stringify(data), time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry to hear that. Let's troubleshoot this step by step.\n\nFirst, can you confirm your laptop model?", time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-screen">
      <div className="chat-topbar">
        <div className="chat-topbar-left">
          <button className="btn-icon" onClick={onClose}><Icon name="arrow-left" size={20} /></button>
          <div className="chat-bot-avatar"><svg width="24" height="24" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" fill="#F9C54D"/><circle cx="18" cy="20" r="3" fill="#131414"/><circle cx="30" cy="20" r="3" fill="#131414"/></svg></div>
          <div className="chat-bot-info">
            <span className="chat-bot-name">Chat with AI</span>
            <span className="chat-bot-status">Online</span>
          </div>
        </div>
        <button className="btn-icon" onClick={() => { onEndSession?.(); onClose(); }}><Icon name="x" size={20} /></button>
      </div>
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.role}`}>
            {msg.role === 'assistant' && <div className="bubble-avatar"><svg width="20" height="20" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" fill="#F9C54D"/><circle cx="18" cy="20" r="2" fill="#131414"/><circle cx="30" cy="20" r="2" fill="#131414"/></svg></div>}
            <div className={`bubble-content ${msg.role}`}>
              {msg.content.split('\n').map((line, j) => <div key={j}>{line}</div>)}
              <span className="bubble-time">{msg.time}</span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-bubble assistant">
            <div className="bubble-avatar"><svg width="20" height="20" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" fill="#F9C54D"/></svg></div>
            <div className="bubble-content assistant typing"><span className="typing-dot"></span><span className="typing-dot"></span><span className="typing-dot"></span></div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <div className="chat-quick-replies">
        {quickReplies.map(qr => (
          <button key={qr} className="quick-chip" onClick={() => sendMessage(qr)}>{qr}</button>
        ))}
      </div>
      <form className="chat-input-bar" onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}>
        <button type="button" className="btn-icon"><Icon name="paperclip" size={18} /></button>
        <input type="text" className="chat-input" placeholder="Type your message..." value={input} onChange={(e) => setInput(e.target.value)} />
        <button type="submit" className="chat-send-btn" disabled={!input.trim()}><Icon name="send" size={18} /></button>
      </form>
    </div>
  );
}

/* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
   VOICE SUPPORT SCREEN
   ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */

function VoiceSupportScreen({ onClose, onEndSession }) {
  const token = localStorage.getItem('supabase_token');

  return (
    <div className="voice-screen">
      <div className="voice-screen-header">
        <button className="btn-icon" onClick={onClose}><Icon name="arrow-left" size={22} /></button>
        <button className="btn-icon" onClick={onClose}><Icon name="x" size={22} /></button>
      </div>
      <h2 className="voice-title">Speak with AI</h2>
      <div className="voice-mic-area">
        <div className="voice-mic-circle">
          <Icon name="mic" size={40} color="#131414" />
        </div>
        <div className="voice-status">Voice assistant</div>
        <div className="voice-subtitle">How can I help you with your laptop issue today?</div>
        <VoiceChat token={token} onSessionComplete={onEndSession} />
      </div>
      <div className="voice-features">
        <div className="voice-feature">
          <div className="voice-feature-icon"><Icon name="zap" size={20} /></div>
          <div className="voice-feature-title">Instant Answers</div>
          <div className="voice-feature-desc">Get quick solutions</div>
        </div>
        <div className="voice-feature">
          <div className="voice-feature-icon"><Icon name="activity" size={20} /></div>
          <div className="voice-feature-title">Smart Routing</div>
          <div className="voice-feature-desc">We'll connect you to an expert if needed</div>
        </div>
        <div className="voice-feature">
          <div className="voice-feature-icon"><Icon name="shield" size={20} /></div>
          <div className="voice-feature-title">Secure</div>
          <div className="voice-feature-desc">Your data is safe with us</div>
        </div>
      </div>
      <button className="voice-end-btn" onClick={() => { onEndSession?.(); onClose(); }}>
        <Icon name="phone" size={18} color="white" />
        End Voice Session
      </button>
    </div>
  );
}

/* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
   POST-SUPPORT HUB
   ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */

function PostSupportHub({ onClose, onRaiseComplaint, onFeedback, onRegisterProduct }) {
  return (
    <div className="post-support">
      <div className="post-support-card">
        <div className="post-support-icon"><Icon name="check-circle" size={36} color="#22c55e" /></div>
        <div className="post-support-title">Session Complete</div>
        <div className="post-support-subtitle">What can I do for you right now?</div>
        <div className="post-support-actions">
          <button className="btn-primary full-width" onClick={onRaiseComplaint}><Icon name="ticket" size={18} /> Raise a Complaint</button>
          <button className="btn-secondary full-width" onClick={onFeedback}><Icon name="star" size={18} /> Provide Feedback</button>
          <button className="btn-secondary full-width" onClick={onRegisterProduct}><Icon name="laptop" size={18} /> Register a Product</button>
          <button className="btn-outline-accent full-width" onClick={onClose}><Icon name="home" size={18} /> Back to Home</button>
        </div>
      </div>
    </div>
  );
}

/* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
   FEEDBACK POPUP
   ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */

function FeedbackPopup({ onClose, showToast }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);

  const handleSubmit = () => {
    if (!rating) { showToast?.('Please select a rating', 'error'); return; }
    showToast?.('Thank you for your feedback!', 'success');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><Icon name="x" size={18} /></button>
        <div className="feedback-icon"><Icon name="check-circle" size={32} color="#22c55e" /></div>
        <div className="feedback-title">Thank you!</div>
        <div className="feedback-subtitle">How would you rate your experience?</div>
        <div className="stars-row">
          {[1, 2, 3, 4, 5].map(star => (
            <button key={star} className={`star-btn ${star <= (hover || rating) ? 'filled' : ''}`}
              onClick={() => setRating(star)} onMouseEnter={() => setHover(star)} onMouseLeave={() => setHover(0)}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill={star <= (hover || rating) ? '#F9C54D' : 'none'} stroke={star <= (hover || rating) ? '#F9C54D' : '#ccc'} strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </button>
          ))}
        </div>
        <p className="feedback-note">Your feedback helps us improve</p>
        <button className="btn-primary full-width" onClick={handleSubmit}>Submit Feedback</button>
      </div>
    </div>
  );
}

function InfoModal({ title, imageSrc, children, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="info-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><Icon name="x" size={18} /></button>
        <div className="info-modal-top">
          {imageSrc && <img src={imageSrc} alt={title} className="info-modal-img" />}
          <div>
            <h3 style={{margin:0}}>{title}</h3>
          </div>
        </div>
        <div className="info-modal-body">{children}</div>
      </div>
    </div>
  );
}

/* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
   MAIN APP
   ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */

function App() {
  // Auth state
  // Auto-login locally for developer preview (keeps behavior unchanged in prod)
  const [loggedIn, setLoggedIn] = useState(() => {
    try {
      return window && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    } catch (e) {
      return false;
    }
  });
  const [currentPage, setCurrentPage] = useState('login');
  const [loading, setLoading] = useState(false);

  // Navigation
  const [activeTab, setActiveTab] = useState('home');
  const [currentView, setCurrentView] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedFAQCategory, setSelectedFAQCategory] = useState(null);

  // Overlays
  const [showSupportHub, setShowSupportHub] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [showPostSupport, setShowPostSupport] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showProfilePage, setShowProfilePage] = useState(false);
  const [showSettingsPage, setShowSettingsPage] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showTelecomModal, setShowTelecomModal] = useState(false);
  const [showTOSModal, setShowTOSModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Toast
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const toastTimeoutRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ visible: true, message, type });
    toastTimeoutRef.current = setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 4200);
  }, []);

  useEffect(() => () => { if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current); }, []);

  // Tab change resets view
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentView(null);
    setSelectedProduct(null);
    setSelectedTicket(null);
    setSelectedFAQCategory(null);
  };

  // Supabase session check
  useEffect(() => {
    if (!supabase) return;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session) { localStorage.setItem('supabase_token', data.session.access_token); setLoggedIn(true); }
      } catch (e) { console.error('Session check error:', e); }
    })();
  }, []);

  const handleLogin = async ({ email, password }) => {
    if (!supabase) { showToast('Supabase not configured ΓÇö demo mode active', 'warning'); setLoggedIn(true); return true; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { showToast(error.message || 'Login failed', 'error'); return false; }
      if (data?.session?.access_token) { localStorage.setItem('supabase_token', data.session.access_token); setLoggedIn(true); showToast('Welcome back!', 'success'); return true; }
      showToast('No session received', 'error'); return false;
    } catch { showToast('An error occurred', 'error'); return false; }
    finally { setLoading(false); }
  };

  const handleSignup = async ({ email, password }) => {
    if (!supabase) { showToast('Supabase not configured', 'warning'); return false; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) { showToast(error.message || 'Signup failed', 'error'); return false; }
      if (data?.user) { showToast('Account created!', 'success'); return true; }
      return false;
    } catch { showToast('An error occurred', 'error'); return false; }
    finally { setLoading(false); }
  };

  const handleLogout = async () => {
    try { if (supabase) await supabase.auth.signOut(); } catch (e) { console.error(e); }
    localStorage.removeItem('supabase_token');
    setLoggedIn(false);
    setCurrentPage('login');
    setActiveTab('home');
    setCurrentView(null);
  };

  const openProfilePage = () => {
    setShowProfilePage(true);
    setShowSettingsPage(false);
    setActiveTab('home');
    setCurrentView(null);
  };

  const openSettingsPage = () => {
    setShowSettingsPage(true);
    setShowProfilePage(false);
    setActiveTab('home');
    setCurrentView(null);
  };

  const handleEndSession = () => {
    setShowChat(false);
    setShowVoice(false);
    setShowPostSupport(true);
  };

  // Not logged in
  if (!loggedIn) {
    return (
      <>
        {currentPage === 'login'
          ? <LoginPage onLogin={handleLogin} onSwitchToSignup={() => setCurrentPage('signup')} loading={loading} showToast={showToast} />
          : <SignupPage onSignup={handleSignup} onSwitchToLogin={() => setCurrentPage('login')} loading={loading} showToast={showToast} />
        }
        <Toast visible={toast.visible} message={toast.message} type={toast.type} />
      </>
    );
  }

  // Render current view content
  const renderContent = () => {
    if (showProfilePage) return <SettingsProfilePage onClose={() => setShowProfilePage(false)} />;
    if (showSettingsPage) return <SettingsPage onClose={() => setShowSettingsPage(false)} />;
    if (activeTab === 'home' && !currentView) {
      return <HomePage onNavigate={handleTabChange} />;
    }
    if (activeTab === 'products') {
      if (currentView === 'warranty-claim' && selectedProduct) {
        return <WarrantyClaimWizard product={selectedProduct} onBack={() => setCurrentView('detail')} onComplete={(id) => { setCurrentView(null); setActiveTab('tickets'); showToast('Ticket ' + id + ' created!', 'success'); }} showToast={showToast} />;
      }
      if (currentView === 'renew-amc' && selectedProduct) {
        return <RenewAMCWizard product={selectedProduct} onBack={() => setCurrentView('detail')} showToast={showToast} />;
      }
      if (currentView === 'detail' && selectedProduct) {
        return <ProductDetailView product={selectedProduct} onBack={() => { setCurrentView(null); setSelectedProduct(null); }} onWarrantyClaim={() => setCurrentView('warranty-claim')} onRenewAMC={() => setCurrentView('renew-amc')} />;
      }
      return <MyProductsPage onSelectProduct={(p) => { setSelectedProduct(p); setCurrentView('detail'); }} />;
    }
    if (activeTab === 'tickets') {
      if (currentView === 'detail' && selectedTicket) {
        return <TicketDetailView ticket={selectedTicket} onBack={() => { setCurrentView(null); setSelectedTicket(null); }} onChat={() => setShowChat(true)} showToast={showToast} />;
      }
      return <TicketsPage onSelectTicket={(t) => { setSelectedTicket(t); setCurrentView('detail'); }} />;
    }
    if (activeTab === 'faqs') {
      if (currentView === 'category' && selectedFAQCategory) {
        return <FAQCategoryView category={selectedFAQCategory} onBack={() => { setCurrentView(null); setSelectedFAQCategory(null); }} onChat={() => setShowChat(true)} showToast={showToast} />;
      }
      return <FAQsPage onSelectCategory={(cat) => { setSelectedFAQCategory(cat); setCurrentView('category'); }} onChat={() => setShowChat(true)} showToast={showToast} />;
    }
    return null;
  };

  const pageKey = `${activeTab}-${currentView || 'root'}-${selectedProduct?.id || selectedTicket?.id || selectedFAQCategory?.slug || ''}`;

  return (
    <div className="app-layout">
      <TopAppBar onMenuClick={() => setShowDrawer(true)} onLogout={handleLogout} onOpenProfile={openProfilePage} onOpenSettings={openSettingsPage} />
      <main className="main-content">
        <div key={pageKey} className="page-wrap fade-up">
          {renderContent()}
        </div>
      </main>
      <FloatingDock activeTab={activeTab} onTabChange={handleTabChange} />
      <SupportFAB onClick={() => setShowSupportHub(true)} />

      {/* Modals & Overlays */}
      {showSupportHub && <SupportHubModal onClose={() => setShowSupportHub(false)} onChat={() => { setShowSupportHub(false); setShowChat(true); }} onVoice={() => { setShowSupportHub(false); setShowVoice(true); }} />}
      {showChat && <ChatSupportScreen onClose={() => setShowChat(false)} onEndSession={handleEndSession} />}
      {showVoice && <VoiceSupportScreen onClose={() => setShowVoice(false)} onEndSession={handleEndSession} />}
      {showPostSupport && <PostSupportHub onClose={() => { setShowPostSupport(false); setActiveTab('home'); setCurrentView(null); }} onRaiseComplaint={() => { setShowPostSupport(false); setActiveTab('tickets'); }} onFeedback={() => { setShowPostSupport(false); setShowFeedback(true); }} onRegisterProduct={() => { setShowPostSupport(false); setActiveTab('products'); }} />}
      {showFeedback && <FeedbackPopup onClose={() => setShowFeedback(false)} showToast={showToast} />}
      {showDrawer && <HamburgerDrawer
        onClose={() => setShowDrawer(false)}
        onOpenLanguage={() => { setShowDrawer(false); setShowLanguageModal(true); }}
        onOpenAboutAI={() => { setShowDrawer(false); setShowAboutModal(true); }}
        onOpenTelecom={() => { setShowDrawer(false); setShowTelecomModal(true); }}
        onOpenTOS={() => { setShowDrawer(false); setShowTOSModal(true); }}
        onOpenPrivacy={() => { setShowDrawer(false); setShowPrivacyModal(true); }}
      />}
      {showLanguageModal && (
        <InfoModal title="Language / αñ╣αñ┐αñéαñªαÑÇ" imageSrc="/images/lang.svg" onClose={() => setShowLanguageModal(false)}>
          <div style={{display:'flex', gap:12, flexDirection:'column'}}>
            <button className="btn-primary" onClick={() => { setShowLanguageModal(false); showToast?.('Language set to English', 'success'); }}>English</button>
            <button className="btn-secondary" onClick={() => { setShowLanguageModal(false); showToast?.('Language set to Hindi', 'success'); }}>αñ╣αñ┐αñéαñªαÑÇ</button>
          </div>
        </InfoModal>
      )}
      {showAboutModal && (
        <InfoModal title="About Our AI" imageSrc="/images/ai.svg" onClose={() => setShowAboutModal(false)}>
          <p style={{color:'var(--text-secondary)'}}>Our AI assistant provides guided troubleshooting, ticket routing, and contextual help using secure, vendor-approved models. It can suggest diagnostics, collect logs, and help escalate to human engineers when needed.</p>
        </InfoModal>
      )}
      {showTelecomModal && (
        <InfoModal title="Telecom Solutions (B2B)" imageSrc="/images/telecom.svg" onClose={() => setShowTelecomModal(false)}>
          <ul style={{marginTop:8}}>
            <li>Enterprise device management</li>
            <li>Bulk warranty & AMC plans</li>
            <li>Priority SLAs and on-site support</li>
          </ul>
        </InfoModal>
      )}
      {showTOSModal && (
        <InfoModal title="Terms of Service" imageSrc="/images/terms.svg" onClose={() => setShowTOSModal(false)}>
          <p style={{color:'var(--text-secondary)'}}>These terms govern the use of LaptopCare services. For full details, please review the complete Terms of Service on our website.</p>
        </InfoModal>
      )}
      {showPrivacyModal && (
        <InfoModal title="Privacy Policy" imageSrc="/images/privacy.svg" onClose={() => setShowPrivacyModal(false)}>
          <p style={{color:'var(--text-secondary)'}}>We protect your personal data and process it according to applicable laws. Contact support for data export or deletion requests.</p>
        </InfoModal>
      )}
      <Toast visible={toast.visible} message={toast.message} type={toast.type} />
    </div>
  );
}

export default App;

/* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
   SETTINGS / PROFILE PAGES
   ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */

function SettingsPage({ onClose }) {
  const [language, setLanguage] = useState('English');
  const [notifications, setNotifications] = useState(true);
  const [voiceSupport, setVoiceSupport] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(true);

  return (
    <div>
      <div className="detail-header">
        <button className="back-btn" onClick={onClose}><Icon name="arrow-left" size={20} /></button>
        <h1>Settings</h1>
      </div>

      <div className="settings-grid">
        <div className="settings-card">
          <h3>Account Preferences</h3>
          <div className="form-group">
            <label className="form-label">Language</label>
            <select className="form-input" value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option>English</option>
              <option>Hindi</option>
              <option>Spanish</option>
            </select>
          </div>
          <div className="form-group">
            <label className="checkbox-label"><input type="checkbox" checked={notifications} onChange={(e) => setNotifications(e.target.checked)} /><span className="checkbox-custom"></span><span>Notifications</span></label>
          </div>
          <div className="form-group">
            <label className="checkbox-label"><input type="checkbox" checked={voiceSupport} onChange={(e) => setVoiceSupport(e.target.checked)} /><span className="checkbox-custom"></span><span>Voice Support</span></label>
          </div>
          <div className="form-group">
            <label className="checkbox-label"><input type="checkbox" checked={emailUpdates} onChange={(e) => setEmailUpdates(e.target.checked)} /><span className="checkbox-custom"></span><span>Email Updates</span></label>
          </div>
        </div>

        <div className="settings-card">
          <h3>Security</h3>
          <div className="form-group">
            <label className="form-label">Change Password</label>
            <button className="btn-secondary">Change Password</button>
          </div>
          <div className="form-group">
            <label className="form-label">Two-factor Authentication</label>
            <button className="btn-secondary">Manage 2FA</button>
          </div>
        </div>

        <div className="settings-card">
          <h3>Support</h3>
          <div className="form-group">
            <button className="btn-primary">Contact Support</button>
          </div>
          <div className="form-group">
            <button className="btn-outline-accent">Export Account Data</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsProfilePage({ onClose }) {
  return (
    <div>
      <div className="detail-header">
        <button className="back-btn" onClick={onClose}><Icon name="arrow-left" size={20} /></button>
        <h1>My Profile</h1>
      </div>
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar"><Icon name="user" size={48} /></div>
          <div>
            <h2>Alex Johnson</h2>
            <p className="text-muted">alex@email.com</p>
          </div>
        </div>
        <div style={{marginTop:16}}>
          <button className="btn-primary">Edit Profile</button>
          <button className="btn-secondary" style={{marginLeft:12}}>Change Password</button>
        </div>
      </div>
    </div>
  );
}
