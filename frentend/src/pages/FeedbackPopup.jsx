import { useState } from 'react';
import Icon from '../components/ui/Icon';
import { submitFeedback } from '../lib/supabase';

export default function FeedbackPopup({ onClose, showToast }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!rating) {
      showToast?.('Please select a rating', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await submitFeedback({ rating, comment: comment || null });
      showToast?.('Thank you for your feedback!', 'success');
      onClose();
    } catch (err) {
      console.error('Feedback error:', err);
      showToast?.('Thank you for your feedback!', 'success');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><Icon name="x" size={18} /></button>
        <div className="feedback-icon"><Icon name="check-circle" size={32} color="#22c55e" /></div>
        <div className="feedback-title">Thank you!</div>
        <div className="feedback-subtitle">How would you rate your experience?</div>
        <div className="stars-row">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              className={`star-btn ${star <= (hover || rating) ? 'filled' : ''}`}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill={star <= (hover || rating) ? '#F9C54D' : 'none'} stroke={star <= (hover || rating) ? '#F9C54D' : '#ccc'} strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
          ))}
        </div>
        <textarea
          className="form-input textarea"
          placeholder="Any additional comments? (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          style={{ marginBottom: 16, fontSize: 14 }}
        />
        <p className="feedback-note">Your feedback helps us improve</p>
        <button className="btn-primary full-width" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </div>
    </div>
  );
}
