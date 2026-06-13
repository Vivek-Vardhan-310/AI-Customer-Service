import { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';

/* ─── Mock Data ──────────────────────────────────────────── */
const MOCK_TICKETS = [
  { id: 'TKT-10247', product: 'ThinkPad X1 Carbon', category: 'Hardware', status: 'Open', priority: 'High', date: '2026-06-10', description: 'Keyboard backlight flickering intermittently during use. Issue started after the latest BIOS update.', timeline: ['Open'] },
  { id: 'TKT-10243', product: 'ThinkPad X1 Carbon', category: 'Software', status: 'In Progress', priority: 'Medium', date: '2026-06-08', description: 'Lenovo Vantage app crashes on startup. Tried reinstalling but issue persists.', timeline: ['Open', 'Assigned', 'In Progress'] },
  { id: 'TKT-10238', product: 'ThinkPad X1 Carbon', category: 'Display', status: 'Resolved', priority: 'Low', date: '2026-06-03', description: 'Minor screen bleed on lower-left corner. Noticeable only on dark backgrounds.', timeline: ['Open', 'Assigned', 'In Progress', 'Resolved'] },
  { id: 'TKT-10231', product: 'ThinkPad X1 Carbon', category: 'Battery', status: 'Closed', priority: 'High', date: '2026-05-28', description: 'Battery draining faster than expected. Only getting 4 hours on a full charge.', timeline: ['Open', 'Assigned', 'In Progress', 'Resolved', 'Closed'] },
  { id: 'TKT-10225', product: 'ThinkPad X1 Carbon', category: 'Network', status: 'Escalated', priority: 'High', date: '2026-05-22', description: 'Wi-Fi 6E adapter dropping connection every 15-20 minutes. Driver reinstall did not fix.', timeline: ['Open', 'Assigned', 'Escalated'] },
  { id: 'TKT-10220', product: 'ThinkPad X1 Carbon', category: 'Hardware', status: 'Open', priority: 'Medium', date: '2026-06-11', description: 'TrackPoint cap feels loose and drifts slightly to the right when not touched.', timeline: ['Open'] },
];

const TIMELINE_STEPS = ['Open', 'Assigned', 'In Progress', 'Resolved', 'Closed'];

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { id: 'products', label: 'My Products', icon: 'box' },
  { id: 'warranty', label: 'Warranty & AMC', icon: 'shield' },
  { id: 'complaint', label: 'Raise Complaint', icon: 'alert-circle' },
  { id: 'tickets', label: 'My Tickets', icon: 'ticket' },
  { id: 'chat', label: 'AI Support', icon: 'message-circle' },
  { id: 'feedback', label: 'Feedback', icon: 'star' },
];

const ISSUE_CATEGORIES = ['Hardware', 'Software', 'Display', 'Battery', 'Network', 'Audio', 'Keyboard', 'Other'];

/* ─── SVG Icon Component ──────────────────────────────────── */
function Icon({ name, size = 20, color = 'currentColor' }) {
  const icons = {
    'grid': <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    'box': <><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
    'shield': <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
    'alert-circle': <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
    'ticket': <><path d="M2 9a3 3 0 013-3h14a3 3 0 013 3"/><path d="M2 9v6a3 3 0 003 3h14a3 3 0 003-3V9"/><path d="M13 6V4a2 2 0 10-4 0v2"/><line x1="8" y1="11" x2="8" y2="13"/><line x1="16" y1="11" x2="16" y2="13"/></>,
    'message-circle': <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>,
    'star': <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
    'bell': <><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>,
    'chevron-down': <polyline points="6 9 12 15 18 9"/>,
    'search': <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    'send': <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>,
    'mic': <><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></>,
    'paperclip': <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>,
    'check': <polyline points="20 6 9 17 4 12"/>,
    'check-circle': <><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>,
    'x': <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    'log-out': <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    'user': <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    'settings': <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></>,
    'trending-up': <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
    'trending-down': <><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></>,
    'clock': <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    'award': <><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></>,
    'activity': <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>,
    'eye': <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    'upload': <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name] || null}
    </svg>
  );
}

/* ─── Login Page ──────────────────────────────────────────── */
function LoginPage({ onLogin }) {
  const [tab, setTab] = useState('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    onLogin({ email, role: tab });
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <img src="https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=1200" alt="Professional workspace" className="login-bg-image" />
        <div className="login-overlay">
          <div className="login-brand">
            <div className="login-logo">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect width="40" height="40" rx="10" fill="#2563EB"/>
                <path d="M12 28V12h4v12h8v4H12z" fill="white"/>
              </svg>
            </div>
            <h1 className="login-title">Lenovo Support<span className="accent-dot">.</span></h1>
            <p className="login-subtitle">Enterprise Customer Support Portal</p>
            <p className="login-description">Get instant help with your ThinkPad products. Track warranties, raise complaints, and connect with AI-powered support — all in one place.</p>
            <div className="login-features">
              <div className="login-feature"><Icon name="check-circle" size={16} color="#2563EB" /><span>24/7 AI Support</span></div>
              <div className="login-feature"><Icon name="check-circle" size={16} color="#2563EB" /><span>Real-time Ticket Tracking</span></div>
              <div className="login-feature"><Icon name="check-circle" size={16} color="#2563EB" /><span>Warranty Management</span></div>
            </div>
          </div>
        </div>
      </div>
      <div className="login-right">
        <div className="login-card">
          <h2 className="login-card-title">Welcome back</h2>
          <p className="login-card-subtitle">Sign in to your support account</p>
          <div className="login-tabs">
            <button className={`login-tab ${tab === 'customer' ? 'active' : ''}`} onClick={() => setTab('customer')}>Customer Login</button>
            <button className={`login-tab ${tab === 'admin' ? 'active' : ''}`} onClick={() => setTab('admin')}>Admin Login</button>
          </div>
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input type="email" className="form-input" placeholder="name@company.com" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" className="form-input" placeholder="••••••••" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} />
            </div>
            <div className="form-row">
              <label className="checkbox-label">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                <span className="checkbox-custom"></span>
                <span>Remember me</span>
              </label>
              <a href="#" className="forgot-link" onClick={(e) => e.preventDefault()}>Forgot password?</a>
            </div>
            {error && <div className="form-error">{error}</div>}
            <button type="submit" className="btn-primary login-btn">Sign In</button>
          </form>
          <p className="login-footer-text">New here? <a href="#" className="create-account-link" onClick={(e) => e.preventDefault()}>Create account</a></p>
        </div>
      </div>
    </div>
  );
}

/* ─── Sidebar ──────────────────────────────────────────── */
function Sidebar({ activeSection, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="10" fill="#2563EB"/>
          <path d="M12 28V12h4v12h8v4H12z" fill="white"/>
        </svg>
        <span className="sidebar-brand-text">Lenovo Support</span>
      </div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`sidebar-link ${activeSection === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <Icon name={item.icon} size={18} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user-info">
          <div className="sidebar-avatar">B</div>
          <div>
            <div className="sidebar-user-name">Bintu</div>
            <div className="sidebar-user-role">Customer</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ─── Header ──────────────────────────────────────────── */
function Header({ activeSection, onLogout }) {
  const [showProfile, setShowProfile] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const sectionLabel = NAV_ITEMS.find(n => n.id === activeSection)?.label || 'Dashboard';

  return (
    <header className="header">
      <div className="header-left">
        <span className="breadcrumb-root">Home</span>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{sectionLabel}</span>
      </div>
      <div className="header-right">
        <div className="header-search">
          <Icon name="search" size={16} color="#94a3b8" />
          <input type="text" placeholder="Search..." className="header-search-input" />
        </div>
        <div className="notif-wrapper" ref={notifRef}>
          <button className="icon-btn" onClick={() => setShowNotif(!showNotif)}>
            <Icon name="bell" size={20} />
            <span className="notif-badge">3</span>
          </button>
          {showNotif && (
            <div className="dropdown-menu notif-dropdown">
              <div className="dropdown-header">Notifications</div>
              <div className="notif-item"><div className="notif-dot blue"></div><div><p className="notif-text">Ticket TKT-10247 has been updated</p><span className="notif-time">2 hours ago</span></div></div>
              <div className="notif-item"><div className="notif-dot green"></div><div><p className="notif-text">Warranty claim approved</p><span className="notif-time">5 hours ago</span></div></div>
              <div className="notif-item"><div className="notif-dot amber"></div><div><p className="notif-text">AMC renewal reminder - 54 days left</p><span className="notif-time">1 day ago</span></div></div>
            </div>
          )}
        </div>
        <div className="profile-wrapper" ref={profileRef}>
          <button className="avatar-btn" onClick={() => setShowProfile(!showProfile)}>
            <div className="header-avatar">B</div>
            <span className="header-user-name">Bintu</span>
            <Icon name="chevron-down" size={14} />
          </button>
          {showProfile && (
            <div className="dropdown-menu profile-dropdown">
              <div className="dropdown-item"><Icon name="user" size={16} /><span>My Profile</span></div>
              <div className="dropdown-item"><Icon name="settings" size={16} /><span>Settings</span></div>
              <div className="dropdown-divider"></div>
              <div className="dropdown-item danger" onClick={onLogout}><Icon name="log-out" size={16} /><span>Sign out</span></div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ─── Dashboard Hero ──────────────────────────────────── */
function DashboardHero() {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 200); return () => clearTimeout(t); }, []);

  const stats = [
    { icon: 'ticket', value: 24, label: 'Total Tickets', trend: '+3 this week', trendDir: 'up', color: '#2563EB' },
    { icon: 'alert-circle', value: 5, label: 'Open', trend: '+2 new', trendDir: 'up', color: '#f59e0b' },
    { icon: 'check-circle', value: 16, label: 'Resolved', trend: '87% rate', trendDir: 'up', color: '#10b981' },
    { icon: 'shield', value: 210, label: 'Warranty Days Left', trend: 'Active', trendDir: 'up', color: '#8b5cf6' },
  ];

  return (
    <section id="dashboard" className="section">
      <div className="hero-banner">
        <img src="https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=1400" alt="Lenovo workspace" className="hero-image" />
        <div className="hero-overlay">
          <div className="hero-content">
            <h1 className="hero-title">Welcome back, Bintu</h1>
            <p className="hero-subtitle">Lenovo ThinkPad X1 Carbon · Active Warranty</p>
          </div>
        </div>
      </div>
      <div className="stats-grid">
        {stats.map((stat, i) => (
          <div key={i} className={`stat-card ${animated ? 'animate-in' : ''}`} style={{ animationDelay: `${i * 100}ms` }}>
            <div className="stat-icon-wrap" style={{ backgroundColor: stat.color + '15', color: stat.color }}>
              <Icon name={stat.icon} size={22} color={stat.color} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
            <div className={`stat-trend ${stat.trendDir}`}>
              <Icon name={`trending-${stat.trendDir}`} size={14} />
              <span>{stat.trend}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── My Products ──────────────────────────────────── */
function MyProducts() {
  return (
    <section id="products" className="section">
      <div className="section-header">
        <h2 className="section-title">My Products</h2>
        <p className="section-subtitle">Registered devices and their warranty information</p>
      </div>
      <div className="product-card">
        <div className="product-image-wrap">
          <img src="https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600" alt="Lenovo ThinkPad X1 Carbon" className="product-image" />
        </div>
        <div className="product-details">
          <div className="product-header-row">
            <h3 className="product-name">Lenovo ThinkPad X1 Carbon</h3>
            <span className="badge badge-green">Active</span>
          </div>
          <div className="product-specs">
            <div className="spec"><span className="spec-label">Model</span><span className="spec-value">X1 Carbon Gen 11</span></div>
            <div className="spec"><span className="spec-label">Serial Number</span><span className="spec-value">PF-4R2K7X</span></div>
            <div className="spec"><span className="spec-label">Purchase Date</span><span className="spec-value">Nov 15, 2025</span></div>
            <div className="spec"><span className="spec-label">Category</span><span className="spec-value">Ultrabook / Business Laptop</span></div>
          </div>
          <div className="product-actions">
            <button className="btn-secondary"><Icon name="eye" size={16} /><span>View Details</span></button>
            <button className="btn-secondary"><Icon name="alert-circle" size={16} /><span>Raise Complaint</span></button>
            <button className="btn-secondary"><Icon name="shield" size={16} /><span>Check Warranty</span></button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Warranty & AMC ──────────────────────────────────── */
function WarrantyAMC() {
  const [warrantyAnimated, setWarrantyAnimated] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setWarrantyAnimated(true); },
      { threshold: 0.3 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="warranty" className="section" ref={sectionRef}>
      <div className="section-header">
        <h2 className="section-title">Warranty & AMC</h2>
        <p className="section-subtitle">Coverage status for your registered products</p>
      </div>
      <div className="warranty-grid">
        <div className="warranty-card">
          <div className="warranty-card-header">
            <div className="warranty-icon-wrap green">
              <Icon name="shield" size={24} color="#10b981" />
            </div>
            <div>
              <h3 className="warranty-title">Standard Warranty</h3>
              <span className="badge badge-green">Active</span>
            </div>
          </div>
          <div className="warranty-meta">
            <span>210 days remaining</span>
            <span>Expires Jan 12, 2027</span>
          </div>
          <div className="progress-bar-wrap">
            <div className="progress-bar">
              <div className="progress-fill green" style={{ width: warrantyAnimated ? '58%' : '0%' }}></div>
            </div>
            <span className="progress-label">58% elapsed</span>
          </div>
          <button className="btn-secondary full-width"><Icon name="upload" size={16} /><span>Raise Claim</span></button>
        </div>
        <div className="warranty-card">
          <div className="warranty-card-header">
            <div className="warranty-icon-wrap amber">
              <Icon name="award" size={24} color="#f59e0b" />
            </div>
            <div>
              <h3 className="warranty-title">Annual Maintenance Contract</h3>
              <span className="badge badge-amber">Expiring Soon</span>
            </div>
          </div>
          <div className="warranty-meta">
            <span>54 days remaining</span>
            <span>Expires Aug 5, 2026</span>
          </div>
          <div className="progress-bar-wrap">
            <div className="progress-bar">
              <div className="progress-fill amber" style={{ width: warrantyAnimated ? '85%' : '0%' }}></div>
            </div>
            <span className="progress-label">85% elapsed</span>
          </div>
          <div className="warranty-actions-row">
            <button className="btn-secondary flex-1"><Icon name="upload" size={16} /><span>Raise Claim</span></button>
            <button className="btn-primary flex-1"><span>Renew AMC</span></button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Raise Complaint ──────────────────────────────────── */
function RaiseComplaint() {
  const [form, setForm] = useState({ product: '', category: '', priority: 'Medium', description: '' });
  const [recording, setRecording] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState('');
  const [errors, setErrors] = useState({});
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef(null);

  const validate = () => {
    const e = {};
    if (!form.product) e.product = 'Required';
    if (!form.category) e.category = 'Required';
    if (!form.description) e.description = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const id = `TKT-${10250 + Math.floor(Math.random() * 100)}`;
    setTicketId(id);
    setSubmitted(true);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
    }
  };

  if (submitted) {
    return (
      <section id="complaint" className="section">
        <div className="success-card">
          <div className="success-icon-wrap">
            <Icon name="check-circle" size={48} color="#10b981" />
          </div>
          <h3 className="success-title">Complaint Submitted Successfully!</h3>
          <p className="success-subtitle">Your ticket <strong>{ticketId}</strong> has been created. Our team will review it shortly.</p>
          <button className="btn-secondary" onClick={() => { setSubmitted(false); setForm({ product: '', category: '', priority: 'Medium', description: '' }); setFileName(''); }}>
            Submit Another Complaint
          </button>
        </div>
      </section>
    );
  }

  return (
    <section id="complaint" className="section">
      <div className="section-header">
        <h2 className="section-title">Raise a Complaint</h2>
        <p className="section-subtitle">Submit a new support request for your product</p>
      </div>
      <form className="complaint-form" onSubmit={handleSubmit}>
        <div className="complaint-grid">
          <div className="complaint-left">
            <div className="form-group">
              <label className="form-label">Select Product</label>
              <select className={`form-input ${errors.product ? 'input-error' : ''}`} value={form.product} onChange={(e) => { setForm({...form, product: e.target.value}); setErrors({...errors, product: ''}); }}>
                <option value="">Choose a product...</option>
                <option value="ThinkPad X1 Carbon">ThinkPad X1 Carbon Gen 11</option>
              </select>
              {errors.product && <span className="error-text">{errors.product}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Issue Category</label>
              <select className={`form-input ${errors.category ? 'input-error' : ''}`} value={form.category} onChange={(e) => { setForm({...form, category: e.target.value}); setErrors({...errors, category: ''}); }}>
                <option value="">Select category...</option>
                {ISSUE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && <span className="error-text">{errors.category}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <div className="priority-chips">
                {['Low', 'Medium', 'High'].map(p => (
                  <button key={p} type="button" className={`priority-chip ${form.priority === p ? 'active' : ''} ${p.toLowerCase()}`} onClick={() => setForm({...form, priority: p})}>{p}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="complaint-right">
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className={`form-input textarea ${errors.description ? 'input-error' : ''}`} placeholder="Describe your issue in detail..." rows={5} value={form.description} onChange={(e) => { setForm({...form, description: e.target.value}); setErrors({...errors, description: ''}); }}></textarea>
              {errors.description && <span className="error-text">{errors.description}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Attachments</label>
              <div className="attachment-row">
                <button type="button" className={`icon-btn voice-btn ${recording ? 'recording' : ''}`} onClick={() => setRecording(!recording)} title="Voice input">
                  <Icon name="mic" size={18} color={recording ? '#fff' : undefined} />
                </button>
                <button type="button" className="file-upload-btn" onClick={() => fileInputRef.current?.click()}>
                  <Icon name="paperclip" size={16} />
                  <span>{fileName || 'Attach file'}</span>
                </button>
                <input ref={fileInputRef} type="file" className="hidden-input" onChange={handleFileChange} />
              </div>
            </div>
          </div>
        </div>
        <button type="submit" className="btn-primary full-width submit-btn">Submit Complaint</button>
      </form>
    </section>
  );
}

/* ─── My Tickets ──────────────────────────────────── */
function MyTickets() {
  const [filter, setFilter] = useState('All');
  const [expandedId, setExpandedId] = useState(null);
  const filters = ['All', 'Open', 'In Progress', 'Resolved', 'Closed', 'Escalated'];

  const filtered = filter === 'All' ? MOCK_TICKETS : MOCK_TICKETS.filter(t => t.status === filter);

  const statusClass = (s) => {
    const map = { 'Open': 'blue', 'In Progress': 'amber', 'Resolved': 'green', 'Closed': 'gray', 'Escalated': 'red' };
    return map[s] || 'gray';
  };

  const priorityClass = (p) => {
    const map = { 'Low': 'green', 'Medium': 'amber', 'High': 'red' };
    return map[p] || 'gray';
  };

  return (
    <section id="tickets" className="section">
      <div className="section-header">
        <h2 className="section-title">My Tickets</h2>
        <p className="section-subtitle">Track and manage your support requests</p>
      </div>
      <div className="filter-pills">
        {filters.map(f => (
          <button key={f} className={`filter-pill ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>
      <div className="tickets-table-wrap">
        <table className="tickets-table">
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>Product</th>
              <th>Category</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(ticket => (
              <>
                <tr key={ticket.id} className={`ticket-row ${expandedId === ticket.id ? 'expanded' : ''}`} onClick={() => setExpandedId(expandedId === ticket.id ? null : ticket.id)}>
                  <td className="ticket-id-cell">{ticket.id}</td>
                  <td>{ticket.product}</td>
                  <td>{ticket.category}</td>
                  <td><span className={`badge badge-${statusClass(ticket.status)}`}>{ticket.status}</span></td>
                  <td><span className={`priority-indicator ${priorityClass(ticket.priority)}`}>{ticket.priority}</span></td>
                  <td className="date-cell">{ticket.date}</td>
                  <td><button className="btn-sm" onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === ticket.id ? null : ticket.id); }}>View</button></td>
                </tr>
                {expandedId === ticket.id && (
                  <tr key={`${ticket.id}-detail`} className="ticket-detail-row">
                    <td colSpan="7">
                      <div className="ticket-detail">
                        <p className="ticket-description">{ticket.description}</p>
                        <div className="timeline-stepper">
                          {TIMELINE_STEPS.map((step, i) => {
                            const isActive = ticket.timeline.includes(step);
                            const isCurrent = ticket.timeline[ticket.timeline.length - 1] === step;
                            return (
                              <div key={step} className={`timeline-step ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''}`}>
                                <div className="timeline-dot">
                                  {isActive && <Icon name="check" size={12} color="#fff" />}
                                </div>
                                {i < TIMELINE_STEPS.length - 1 && <div className={`timeline-line ${isActive && ticket.timeline.includes(TIMELINE_STEPS[i+1]) ? 'active' : ''}`}></div>}
                                <span className="timeline-label">{step}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="empty-state"><p>No tickets found for this filter.</p></div>}
      </div>
    </section>
  );
}

/* ─── Simple Markdown Renderer ────────────────────────── */
function renderMarkdown(text) {
  if (!text) return text;
  const lines = text.split('\n');
  const elements = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Process inline formatting
    const processInline = (str) => {
      const parts = [];
      let remaining = str;
      let k = 0;
      while (remaining.length > 0) {
        const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
        const italicMatch = remaining.match(/\*(.+?)\*/);
        const match = boldMatch && (!italicMatch || boldMatch.index <= italicMatch.index) ? boldMatch : italicMatch;
        if (match) {
          if (match.index > 0) {
            parts.push(<span key={k++}>{remaining.substring(0, match.index)}</span>);
          }
          if (match[0].startsWith('**')) {
            parts.push(<strong key={k++}>{match[1]}</strong>);
          } else {
            parts.push(<em key={k++}>{match[1]}</em>);
          }
          remaining = remaining.substring(match.index + match[0].length);
        } else {
          parts.push(<span key={k++}>{remaining}</span>);
          break;
        }
      }
      return parts;
    };

    if (line.startsWith('• ') || line.startsWith('- ')) {
      elements.push(<div key={key++} style={{ paddingLeft: '12px', display: 'flex', gap: '6px', marginTop: '2px' }}><span style={{ flexShrink: 0 }}>•</span><span>{processInline(line.substring(2))}</span></div>);
    } else if (/^\d+\.\s/.test(line)) {
      const numEnd = line.indexOf('. ');
      elements.push(<div key={key++} style={{ paddingLeft: '12px', display: 'flex', gap: '6px', marginTop: '2px' }}><span style={{ flexShrink: 0 }}>{line.substring(0, numEnd + 1)}</span><span>{processInline(line.substring(numEnd + 2))}</span></div>);
    } else if (line.trim() === '') {
      elements.push(<div key={key++} style={{ height: '8px' }} />);
    } else {
      elements.push(<div key={key++}>{processInline(line)}</div>);
    }
  }
  return elements;
}

/* ─── AI Support Chat ──────────────────────────────────── */
function AIChat() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I'm your Lenovo ThinkPad support assistant. How can I help you today? You can ask me about warranty status, raise a complaint, track tickets, or get help with any ThinkPad issues." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);
  const quickReplies = ['Check warranty', 'Raise complaint', 'Track ticket', 'AMC renewal'];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Mock AI responses for common queries
    const mockResponses = {
      'check warranty': "Your ThinkPad X1 Carbon (Serial: PF-4R2K7X) has an **active warranty** with **210 days remaining**. The warranty expires on January 12, 2027. Your coverage includes:\n\n• Hardware repair & replacement\n• On-site service (next business day)\n• Battery coverage\n\nWould you like to raise a warranty claim or check AMC status?",
      'raise complaint': "I can help you raise a complaint! Here's what I need:\n\n1. **Product**: ThinkPad X1 Carbon Gen 11\n2. **Issue Category**: (Hardware, Software, Display, Battery, etc.)\n3. **Priority**: Low / Medium / High\n4. **Description**: Please describe your issue\n\nOr you can use the **Raise Complaint** form in the sidebar for a more detailed submission.",
      'track ticket': "Here are your recent tickets:\n\n• **TKT-10247** - Keyboard backlight flickering — *Open*\n• **TKT-10243** - Vantage app crashes — *In Progress*\n• **TKT-10238** - Screen bleed issue — *Resolved*\n\nWould you like details on any specific ticket?",
      'amc renewal': "Your Annual Maintenance Contract (AMC) is **expiring soon** with only **54 days remaining** (expires August 5, 2026).\n\n**Renewal Options:**\n• Basic AMC: $149/year — Parts & labor coverage\n• Premium AMC: $249/year — Includes accidental damage protection\n• Enterprise AMC: $399/year — 4-hour response time + dedicated technician\n\nWould you like to proceed with renewal?",
    };

    const lowerText = text.toLowerCase();
    let response = null;
    for (const [key, value] of Object.entries(mockResponses)) {
      if (lowerText.includes(key)) {
        response = value;
        break;
      }
    }

    if (!response) {
      response = `I understand you're asking about "${text}". Let me help you with that.\n\nFor your ThinkPad X1 Carbon, I can assist with:\n• **Warranty** inquiries and claims\n• **Technical issues** and troubleshooting\n• **AMC** management and renewal\n• **Ticket** tracking and updates\n\nCould you provide more details about what you need help with?`;
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500));
    setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    setLoading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <section id="chat" className="section">
      <div className="section-header">
        <h2 className="section-title">AI Support Chat</h2>
        <p className="section-subtitle">Get instant help from our AI-powered assistant</p>
      </div>
      <div className="chat-container">
        <div className="chat-header">
          <div className="chat-bot-info">
            <div className="chat-bot-avatar">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect width="24" height="24" rx="6" fill="#2563EB"/>
                <path d="M7 12h10M12 7v10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <span className="chat-bot-name">AI Support</span>
              <span className="chat-bot-powered">Powered by Gemini</span>
            </div>
          </div>
          <div className="online-indicator">
            <span className="online-dot"></span>
            <span>Online</span>
          </div>
        </div>
        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-bubble ${msg.role}`}>
              {msg.role === 'assistant' && (
                <div className="bubble-avatar">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <rect width="24" height="24" rx="6" fill="#2563EB"/>
                    <path d="M7 12h10M12 7v10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
              )}
              <div className={`bubble-content ${msg.role}`}>
                {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="chat-bubble assistant">
              <div className="bubble-avatar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect width="24" height="24" rx="6" fill="#2563EB"/>
                  <path d="M7 12h10M12 7v10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="bubble-content assistant typing">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <div className="quick-replies">
          {quickReplies.map(qr => (
            <button key={qr} className="quick-reply-chip" onClick={() => sendMessage(qr)}>{qr}</button>
          ))}
        </div>
        <form className="chat-input-bar" onSubmit={handleSubmit}>
          <input type="text" className="chat-input" placeholder="Type your message..." value={input} onChange={(e) => setInput(e.target.value)} />
          <button type="button" className="icon-btn chat-mic-btn"><Icon name="mic" size={18} /></button>
          <button type="submit" className="chat-send-btn" disabled={!input.trim()}>
            <Icon name="send" size={18} color="#fff" />
          </button>
        </form>
      </div>
    </section>
  );
}

/* ─── Feedback ──────────────────────────────────── */
function Feedback() {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTicket, setSelectedTicket] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <section id="feedback" className="section">
        <div className="success-card feedback-success">
          <div className="success-icon-wrap animated-check">
            <Icon name="check-circle" size={56} color="#10b981" />
          </div>
          <h3 className="success-title">Thank you for your feedback!</h3>
          <p className="success-subtitle">Your response helps us improve our support quality.</p>
          <button className="btn-secondary" onClick={() => { setSubmitted(false); setRating(0); setComment(''); setSelectedTicket(''); }}>Submit More Feedback</button>
        </div>
      </section>
    );
  }

  return (
    <section id="feedback" className="section">
      <div className="section-header">
        <h2 className="section-title">Feedback</h2>
        <p className="section-subtitle">Help us improve by sharing your experience</p>
      </div>
      <div className="feedback-card">
        <div className="form-group">
          <label className="form-label">Select Ticket</label>
          <select className="form-input" value={selectedTicket} onChange={(e) => setSelectedTicket(e.target.value)}>
            <option value="">Choose a ticket...</option>
            {MOCK_TICKETS.map(t => <option key={t.id} value={t.id}>{t.id} - {t.category}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Rating</label>
          <div className="stars-row">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                className={`star-btn ${star <= (hover || rating) ? 'filled' : ''}`}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill={star <= (hover || rating) ? '#f59e0b' : 'none'} stroke={star <= (hover || rating) ? '#f59e0b' : '#94a3b8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </button>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Comments</label>
          <textarea className="form-input textarea" placeholder="Share your experience..." rows={4} value={comment} onChange={(e) => setComment(e.target.value)}></textarea>
        </div>
        <button className="btn-primary full-width" onClick={() => setSubmitted(true)}>Submit Feedback</button>
      </div>
    </section>
  );
}

/* ─── Toast Notification ──────────────────────────────── */
function Toast({ message, visible }) {
  return (
    <div className={`toast ${visible ? 'show' : ''}`}>
      <Icon name="check-circle" size={18} color="#10b981" />
      <span>{message}</span>
    </div>
  );
}

/* ─── Main App ──────────────────────────────────── */
function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const mainRef = useRef(null);

  const handleNavigate = useCallback((sectionId) => {
    setActiveSection(sectionId);
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    const sections = NAV_ITEMS.map(n => document.getElementById(n.id)).filter(Boolean);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-80px 0px -50% 0px', threshold: 0.1 }
    );
    sections.forEach(s => observer.observe(s));
    return () => observer.disconnect();
  }, [loggedIn]);

  if (!loggedIn) {
    return <LoginPage onLogin={() => setLoggedIn(true)} />;
  }

  return (
    <div className="app-layout">
      <Sidebar activeSection={activeSection} onNavigate={handleNavigate} />
      <div className="main-area">
        <Header activeSection={activeSection} onLogout={() => setLoggedIn(false)} />
        <main className="content" ref={mainRef}>
          <DashboardHero />
          <MyProducts />
          <WarrantyAMC />
          <RaiseComplaint />
          <MyTickets />
          <AIChat />
          <Feedback />
          <footer className="app-footer">
            <p>© 2026 Lenovo Support Portal. All rights reserved.</p>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default App;
