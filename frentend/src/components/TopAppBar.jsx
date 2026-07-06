import { useState, useRef, useEffect } from 'react';
import Icon from './ui/Icon';

export default function TopAppBar({ onMenuClick, onLogout, onOpenProfile, profile }) {
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
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
          <div className="topbar-brand-icon"><svg width="20" height="20" viewBox="0 0 40 40" fill="none"><path d="M12 28V12h4v12h8v4H12z" fill="#131414" /></svg></div>
          <div>
            <span className="topbar-brand-name">LaptopCare</span>
            <span className="topbar-brand-sub"> Support</span>
          </div>
        </div>
      </div>
      <div className="topbar-right">
        <div className="dropdown-wrap" ref={profileRef}>
          <button className="topbar-avatar" onClick={() => setShowProfile(!showProfile)}>
            <div className="topbar-avatar-circle">
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <span className="topbar-avatar-name">{profile?.full_name || 'User'}</span>
            <Icon name="chevron-down" size={14} />
          </button>
          {showProfile && (
            <div className="dropdown-menu">
              <div className="dropdown-item" onClick={() => { onOpenProfile?.(); setShowProfile(false); }}><Icon name="user" size={16} /><span>My Profile</span></div>
              <div className="dropdown-divider"></div>
              <div className="dropdown-item danger" onClick={() => { setShowProfile(false); onLogout?.(); }}><Icon name="log-out" size={16} /><span>Sign out</span></div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
