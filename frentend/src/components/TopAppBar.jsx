import { useState, useRef, useEffect } from 'react';
import Icon from './ui/Icon';

export default function TopAppBar({ onMenuClick, onLogout, onOpenProfile, onOpenSettings }) {
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
          <div className="topbar-brand-icon"><svg width="20" height="20" viewBox="0 0 40 40" fill="none"><path d="M12 28V12h4v12h8v4H12z" fill="#131414" /></svg></div>
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
              <div className="notif-item"><div className="notif-dot amber"></div><div><p className="notif-text">AMC renewal reminder — 54 days left</p><span className="notif-time">1 day ago</span></div></div>
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
