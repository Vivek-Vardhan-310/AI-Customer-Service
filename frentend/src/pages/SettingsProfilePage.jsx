import { useState } from 'react';
import Icon from '../components/ui/Icon';
import { updateProfile } from '../lib/supabase';

export default function SettingsProfilePage({ onClose, profile, refreshProfile, showToast }) {
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateProfile({ full_name: fullName, phone });
      if (result) {
        showToast?.('Profile updated!', 'success');
        refreshProfile?.();
        setEditing(false);
      } else {
        showToast?.('Failed to update profile', 'error');
      }
    } catch (err) {
      console.error('Profile update error:', err);
      showToast?.('Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

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
            <h2>{profile?.full_name || 'User'}</h2>
            <p className="text-muted">{profile?.email || 'No email'}</p>
            {profile?.phone && <p className="text-muted">{profile.phone}</p>}
          </div>
        </div>

        {editing ? (
          <div style={{ marginTop: 16 }}>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Full Name</label>
              <input type="text" className="form-input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Phone</label>
              <input type="tel" className="form-input" placeholder="+91 XXXXX XXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              <button className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 16 }}>
            <button className="btn-primary" onClick={() => setEditing(true)}>Edit Profile</button>
            <button className="btn-secondary" style={{ marginLeft: 12 }}>Change Password</button>
          </div>
        )}
      </div>
    </div>
  );
}
