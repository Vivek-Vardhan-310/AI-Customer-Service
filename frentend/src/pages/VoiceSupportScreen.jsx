import { useState, useEffect } from 'react';
import Icon from '../components/ui/Icon';
import VoiceChat from '../components/VoiceChat';
import { fetchProfile, fetchProducts, fetchTickets } from '../lib/supabase';

export default function VoiceSupportScreen({ onClose, onEndSession }) {
  const token = localStorage.getItem('supabase_token');
  const [userContext, setUserContext] = useState(null);
  const [isContextReady, setIsContextReady] = useState(false);

  // Fetch user context on mount
  useEffect(() => {
    const loadContext = async () => {
      try {
        const [profile, products, tickets] = await Promise.all([fetchProfile(), fetchProducts(), fetchTickets()]);
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
          tickets: (tickets || []).map(t => ({
            id: t.id,
            product: t.product,
            category: t.category,
            status: t.status,
            priority: t.priority || 'Medium',
            description: t.description || t.title,
            date: t.created || t.created_at
          })),
        });
      } catch (e) {
        console.error('Failed to load user context for voice:', e);
      } finally {
        setIsContextReady(true);
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
        {isContextReady ? (
          <VoiceChat token={token} onSessionComplete={onEndSession} userContext={userContext} isReady={isContextReady} />
        ) : (
          <div className="voice-loading">Loading your profile…</div>
        )}
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
