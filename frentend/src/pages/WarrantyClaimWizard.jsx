import { useState, useRef, Fragment } from 'react';
import Icon from '../components/ui/Icon';
import { ISSUE_CATEGORIES } from '../data/issues';

export default function WarrantyClaimWizard({ product, onBack, onComplete, showToast }) {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [contactMethod, setContactMethod] = useState('email');
  const [files, setFiles] = useState([]);
  const fileRef = useRef(null);

  const stepLabels = ['Issue Details', 'Upload', 'Review'];

  const handleSubmit = () => {
    const ticketId = `CS-${9100 + Math.floor(Math.random() * 900)}`;
    showToast?.('Warranty claim submitted! Ticket: ' + ticketId, 'success');
    onComplete(ticketId);
  };

  return (
    <div>
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}><Icon name="arrow-left" size={20} /></button>
        <h1>Raise Warranty Claim</h1>
      </div>
      <div className="wizard-header">
        {stepLabels.map((label, i) => (
          <Fragment key={i}>
            <div className={`wizard-step ${step === i + 1 ? 'active' : ''} ${step > i + 1 ? 'completed' : ''}`}>
              <div className="wizard-step-number">{step > i + 1 ? <Icon name="check" size={14} color="white" /> : i + 1}</div>
              <span className="wizard-step-label">{label}</span>
            </div>
            {i < stepLabels.length - 1 && <div className={`wizard-step-line ${step > i + 1 ? 'completed' : step === i + 2 ? 'active' : ''}`}></div>}
          </Fragment>
        ))}
      </div>

      <div className="wizard-body">
        {step === 1 && (
          <>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Issue Category</label>
              <div className="category-grid">
                {ISSUE_CATEGORIES.map(cat => (
                  <div key={cat.id} className={`category-card ${category === cat.id ? 'selected' : ''}`} onClick={() => setCategory(cat.id)}>
                    <div className="category-card-icon"><Icon name={cat.icon} size={22} /></div>
                    <span className="category-card-label">{cat.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Describe the Issue</label>
              <textarea className="form-input textarea" placeholder="Explain the issue in detail..." value={description} onChange={(e) => setDescription(e.target.value)} rows={4}></textarea>
            </div>
            <div className="form-group">
              <label className="form-label">Preferred Contact Method</label>
              <div className="contact-methods">
                {['Email', 'Phone', 'WhatsApp'].map(m => (
                  <div key={m} className={`contact-method ${contactMethod === m.toLowerCase() ? 'selected' : ''}`} onClick={() => setContactMethod(m.toLowerCase())}>
                    <Icon name={m === 'Email' ? 'mail' : m === 'Phone' ? 'phone' : 'message-circle'} size={20} />
                    <span className="contact-method-label">{m}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        {step === 2 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ width: 80, height: 80, margin: '0 auto 16px', borderRadius: 16, background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="upload" size={32} color="#131414" />
            </div>
            <h3 style={{ marginBottom: 8 }}>Upload Attachments</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 14 }}>Upload photos, screenshots, or logs related to your issue</p>
            <input type="file" ref={fileRef} style={{ display: 'none' }} multiple onChange={(e) => setFiles([...files, ...Array.from(e.target.files)])} />
            <button className="btn-secondary" onClick={() => fileRef.current?.click()}><Icon name="paperclip" size={16} /><span>Choose Files</span></button>
            {files.length > 0 && <p style={{ marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>{files.length} file(s) selected</p>}
          </div>
        )}
        {step === 3 && (
          <div>
            <h3 style={{ marginBottom: 20 }}>Review Your Claim</h3>
            <div style={{ display: 'grid', gap: 16 }}>
              <div><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Product</span><p style={{ fontWeight: 500 }}>{product.name} · {product.serial}</p></div>
              <div><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Category</span><p style={{ fontWeight: 500 }}>{category || 'Not selected'}</p></div>
              <div><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Description</span><p style={{ fontWeight: 500 }}>{description || 'No description provided'}</p></div>
              <div><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Contact</span><p style={{ fontWeight: 500, textTransform: 'capitalize' }}>{contactMethod}</p></div>
              <div><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Attachments</span><p style={{ fontWeight: 500 }}>{files.length} file(s)</p></div>
            </div>
          </div>
        )}
      </div>
      <div className="wizard-footer">
        <button className="btn-secondary" onClick={() => step > 1 ? setStep(step - 1) : onBack()}>{step === 1 ? 'Cancel' : 'Back'}</button>
        <button className="btn-primary" onClick={() => step < 3 ? setStep(step + 1) : handleSubmit()}>
          {step < 3 ? <>Continue to {stepLabels[step]} <Icon name="chevron-right" size={16} /></> : 'Submit Claim'}
        </button>
      </div>
    </div>
  );
}
