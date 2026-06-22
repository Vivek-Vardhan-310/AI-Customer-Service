import { useState, Fragment } from 'react';
import Icon from '../components/ui/Icon';

export default function RenewAMCWizard({ product, onBack, showToast }) {
  const [step, setStep] = useState(1);
  const [plan, setPlan] = useState('premium');

  const plans = [
    { id: 'basic', name: 'Basic AMC', price: '₹999 / year' },
    { id: 'premium', name: 'Premium AMC', price: '₹1,999 / year', highlighted: true },
    { id: 'enterprise', name: 'Enterprise AMC', price: '₹2,999 / year' },
  ];

  const benefits = ['Free Service Visits', 'Priority Support', 'Genuine Parts', 'Annual Maintenance'];
  const stepLabels = ['Plan & Details', 'Payment', 'Confirm'];

  return (
    <div>
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}><Icon name="arrow-left" size={20} /></button>
        <h1>Renew AMC</h1>
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
            <h3 style={{ marginBottom: 16 }}>Select AMC Plan</h3>
            <div className="amc-plans">
              {plans.map(p => (
                <div key={p.id} className={`amc-plan-card ${plan === p.id ? 'selected' : ''} ${p.highlighted && plan !== p.id ? 'highlighted' : ''}`} onClick={() => setPlan(p.id)}>
                  <div className="amc-plan-info">
                    <div className="amc-plan-name">{p.name}</div>
                    <div className="amc-plan-price">{p.price}</div>
                  </div>
                  <div className="amc-plan-radio"></div>
                </div>
              ))}
            </div>
            <div className="amc-benefits">
              <h4>Benefits Included</h4>
              {benefits.map((b, i) => (
                <div key={i} className="amc-benefit-item">
                  <Icon name="check-circle" size={16} color="#22c55e" />
                  <span>{b}</span>
                </div>
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ width: 80, height: 80, margin: '0 auto 16px', borderRadius: 16, background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="lock" size={32} color="#131414" />
            </div>
            <h3 style={{ marginBottom: 8 }}>Payment</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>Payment integration coming soon. Click continue to confirm.</p>
            <div style={{ padding: 16, background: 'var(--bg-primary)', borderRadius: 12, display: 'inline-block' }}>
              <span style={{ fontWeight: 600 }}>Selected: </span>
              <span>{plans.find(p => p.id === plan)?.name} — {plans.find(p => p.id === plan)?.price}</span>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="resolved-card">
            <div className="resolved-icon"><Icon name="check-circle" size={40} color="#22c55e" /></div>
            <div className="resolved-title">AMC Renewed!</div>
            <div className="resolved-subtitle">Your {plans.find(p => p.id === plan)?.name} has been renewed for {product.name}.</div>
            <button className="btn-primary full-width" onClick={onBack}>Back to Products</button>
          </div>
        )}
      </div>
      {step < 3 && (
        <div className="wizard-footer">
          <button className="btn-secondary" onClick={() => step > 1 ? setStep(step - 1) : onBack()}>{step === 1 ? 'Cancel' : 'Back'}</button>
          <button className="btn-primary" onClick={() => setStep(step + 1)}>Continue <Icon name="chevron-right" size={16} /></button>
        </div>
      )}
    </div>
  );
}
