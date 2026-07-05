import { useState, useEffect } from 'react';
import Icon from '../components/ui/Icon';
import VoiceChat from '../components/VoiceChat';
import { fetchProfile, fetchProducts } from '../lib/supabase';

export default function VoiceSupportScreen({ onClose, onEndSession }) {
  const token = localStorage.getItem('supabase_token');
  const [userContext, setUserContext] = useState(null);

  // Fetch user context on mount
  useEffect(() => {
    const loadContext = async () => {
      try {
        const [profile, products] = await Promise.all([fetchProfile(), fetchProducts()]);
        setUserContext({
          name: profile?.full_name || null,
          email: profile?.email || null,
          phone: profile?.phone || null,
          products: (products || []).map(p => ({
            name: p.name,
            model: p.model,
            serial: p.serial,
            warranty: p.warranty,
            warrantyDays: p.warrantyDays,
            amc: p.amc,
            amcDays: p.amcDays,
          })),
        });
      } catch (e) {
        console.error('Failed to load user context for voice:', e);
      }
    };
    loadContext();
  }, []);

  return (
    <div className="voice-screen">
      <div className="voice-screen-header">
        <button className="btn-icon" onClick={onClose}><Icon name="arrow-left" size={22} /></button>
        <button className="btn-icon" onClick={onClose}><Icon name="x" size={22} /></button>
      </div>
      <h2 className="voice-title">Voice Assistant</h2>
      <div className="voice-mic-area">
        <VoiceChat token={token} onSessionComplete={onEndSession} userContext={userContext} />
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
