import { useState } from 'react';
import Icon from '../components/ui/Icon';

export default function SettingsPage({ onClose }) {
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
      </div>
    </div>
  );
}
