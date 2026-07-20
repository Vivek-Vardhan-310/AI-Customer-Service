import { useState } from 'react';
import Icon from '../components/ui/Icon';
import { updateProfile } from '../lib/supabase';

export default function SettingsProfilePage({ onClose, profile, refreshProfile, onChangePassword, showToast }) {
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [saving, setSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordMode, setPasswordMode] = useState('current');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

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

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      showToast?.('Please fill in the password fields', 'error');
      return;
    }
    if (newPassword.length < 8) {
      showToast?.('Password must be at least 8 characters', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast?.('Passwords do not match', 'error');
      return;
    }
    if (passwordMode === 'current' && !currentPassword) {
      showToast?.('Please enter your current password', 'error');
      return;
    }

    setPasswordLoading(true);
    try {
      const result = await onChangePassword({
        email: profile?.email,
        currentPassword,
        newPassword,
        otp,
        mode: passwordMode,
      });
      if (result?.success) {
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setOtp('');
      }
    } finally {
      setPasswordLoading(false);
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
            <button className="btn-secondary" style={{ marginLeft: 12 }} onClick={() => setShowPasswordModal(true)}>Change Password</button>
          </div>
        )}
      </div>

      {showPasswordModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 1000 }}>
          <div className="login-card" style={{ width: '100%', maxWidth: 460, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Update password</h3>
              <button type="button" className="btn-secondary" onClick={() => { setShowPasswordModal(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setOtp(''); }}>Close</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button type="button" className={passwordMode === 'current' ? 'btn-primary' : 'btn-secondary'} onClick={() => setPasswordMode('current')}>Current password</button>
              <button type="button" className={passwordMode === 'otp' ? 'btn-primary' : 'btn-secondary'} onClick={() => setPasswordMode('otp')}>Email OTP</button>
            </div>
            <form onSubmit={handlePasswordSubmit} className="login-form">
              {passwordMode === 'current' ? (
                <div className="form-group">
                  <label className="form-label">Current password</label>
                  <input type="password" className="form-input" placeholder="Enter your current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} disabled={passwordLoading} />
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">OTP code</label>
                  <input type="text" className="form-input" placeholder="Code from your email" value={otp} onChange={(e) => setOtp(e.target.value)} disabled={passwordLoading} />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">New password</label>
                <input type="password" className="form-input" placeholder="At least 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={passwordLoading} />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm password</label>
                <input type="password" className="form-input" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={passwordLoading} />
              </div>
              <button type="submit" className="btn-primary full-width" disabled={passwordLoading}>{passwordLoading ? 'Updating...' : 'Update password'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
