import Icon from '../components/ui/Icon';

export default function SettingsProfilePage({ onClose }) {
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
        <div style={{ marginTop: 16 }}>
          <button className="btn-primary">Edit Profile</button>
          <button className="btn-secondary" style={{ marginLeft: 12 }}>Change Password</button>
        </div>
      </div>
    </div>
  );
}
