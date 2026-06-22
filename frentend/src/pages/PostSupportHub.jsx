import Icon from '../components/ui/Icon';

export default function PostSupportHub({ onClose, onRaiseComplaint, onFeedback, onRegisterProduct }) {
  return (
    <div className="post-support">
      <div className="post-support-card">
        <div className="post-support-icon"><Icon name="check-circle" size={36} color="#22c55e" /></div>
        <div className="post-support-title">Session Complete</div>
        <div className="post-support-subtitle">What can I do for you right now?</div>
        <div className="post-support-actions">
          <button className="btn-primary full-width" onClick={onRaiseComplaint}><Icon name="ticket" size={18} /> Raise a Complaint</button>
          <button className="btn-secondary full-width" onClick={onFeedback}><Icon name="star" size={18} /> Provide Feedback</button>
          <button className="btn-secondary full-width" onClick={onRegisterProduct}><Icon name="laptop" size={18} /> Register a Product</button>
          <button className="btn-outline-accent full-width" onClick={onClose}><Icon name="home" size={18} /> Back to Home</button>
        </div>
      </div>
    </div>
  );
}
