import Icon from './ui/Icon';

export default function SupportHubModal({ onClose, onChat, onVoice }) {
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
